// crossref-rfb-anatel — Cruza dados RFB (EXTERNAL_DB_URL) com ANATEL (ANATEL_DB_URL) por CNPJ.
// Retorna payload unificado e cacheia em equity_brain.companies.raw_data.anatel.
// Auth: admin OR advisor.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized" };
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) return { ok: true, isService: true };
  const sbUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData } = await sbUser.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "advisor");
  if (!allowed) return { ok: false, status: 403, error: "Forbidden: admin or advisor only" };
  return { ok: true, userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rfbUrl = Deno.env.get("EXTERNAL_DB_URL");
    const anatelUrl = Deno.env.get("ANATEL_DB_URL");

    const auth = await checkAuth(req, supabaseUrl, serviceKey);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cnpj, anatel_table, anatel_cnpj_column } = await req.json();
    const clean = String(cnpj ?? "").replace(/\D/g, "");
    if (clean.length !== 14) {
      return new Response(JSON.stringify({ error: "CNPJ inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result: any = { cnpj: clean, rfb: null, anatel: null };

    // ---- RFB ----
    if (rfbUrl) {
      try {
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        const c = new Client(rfbUrl);
        await c.connect();
        try {
          const r = await c.queryObject({
            text: `
              SELECT em.razao_social, em.capital_social, em.porte_empresa, em.natureza_juridica,
                     e.nome_fantasia, e.cnae_fiscal_principal, e.uf, e.municipio, e.bairro, e.cep,
                     e.situacao_cadastral, e.data_inicio_atividade
              FROM estabelecimentos e
              INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
              WHERE e.cnpj_basico = $1 AND e.cnpj_ordem = $2 AND e.cnpj_dv = $3
              LIMIT 1
            `,
            args: [clean.slice(0, 8), clean.slice(8, 12), clean.slice(12, 14)],
          });
          result.rfb = r.rows[0] ?? null;
        } finally { await c.end(); }
      } catch (e: any) {
        result.rfb_error = e?.message ?? String(e);
      }
    }

    // ---- ANATEL ----
    if (anatelUrl && anatel_table) {
      try {
        const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
        const c = new Client(anatelUrl);
        await c.connect();
        try {
          const cnpjCol = String(anatel_cnpj_column ?? "cnpj").replace(/[^a-zA-Z0-9_]/g, "");
          const tbl = String(anatel_table).replace(/[^a-zA-Z0-9_]/g, "");
          const r = await c.queryObject({
            text: `SELECT * FROM "${tbl}" WHERE regexp_replace("${cnpjCol}"::text, '\\D', '', 'g') = $1 LIMIT 200`,
            args: [clean],
          });
          result.anatel = {
            table: tbl,
            cnpj_column: cnpjCol,
            rows: r.rows,
            row_count: r.rows.length,
          };
        } finally { await c.end(); }
      } catch (e: any) {
        result.anatel_error = e?.message ?? String(e);
      }
    }

    // ---- Cache no equity_brain.companies (best-effort) ----
    if (result.anatel?.row_count > 0) {
      try {
        const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
        const { data: existing } = await sb
          .schema("equity_brain" as any)
          .from("companies")
          .select("cnpj, raw_data")
          .eq("cnpj", clean)
          .maybeSingle();
        if (existing) {
          const merged = { ...(existing.raw_data ?? {}), anatel: result.anatel, anatel_synced_at: new Date().toISOString() };
          await sb.schema("equity_brain" as any).from("companies").update({ raw_data: merged }).eq("cnpj", clean);
        }
      } catch (e) { console.warn("cache update failed:", e); }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("crossref-rfb-anatel error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
