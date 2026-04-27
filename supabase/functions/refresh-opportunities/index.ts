// Equity Brain — refresh-opportunities
// Reconstrói a warm layer `opportunities_ready` a partir de `matches_enriched`.
// Auth: admin OR service_role.
// Preserva `status` e `assigned_bdr` em registros existentes.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// Helpers
// ============================================================
function colorFor(score: number): string {
  if (score >= 80) return "gold";
  if (score >= 60) return "blue";
  if (score >= 40) return "cyan";
  return "gray";
}

function sizeFor(score: number): number {
  return Math.round(8 + (Math.max(0, Math.min(100, score)) / 100) * 32);
}

function fillTemplate(tpl: string, ctx: Record<string, any>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(ctx[k] ?? `{${k}}`));
}

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized" };
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  const isServiceRole = claimsData?.claims?.role === "service_role";
  if (isServiceRole) return { ok: true };
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only" };
  return { ok: true };
}

// ============================================================
// Handler
// ============================================================
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

    const auth = await checkAuth(req, supabaseUrl, serviceKey);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const setor_ma: string | undefined = body.setor_ma;
    const uf: string | undefined = body.uf ? String(body.uf).toUpperCase() : undefined;
    const top_n: number = Math.min(Number(body.top_n ?? 50000), 100000);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Carrega catálogo de teses (template para default_pitch)
    const { data: theses, error: tErr } = await supabase
      .schema("equity_brain" as any)
      .from("investment_theses")
      .select("thesis_key, display_name, default_pitch_template");
    if (tErr) {
      return new Response(JSON.stringify({ error: `theses: ${tErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const thesesIdx = new Map((theses ?? []).map((t: any) => [t.thesis_key, t]));

    // 2) Pagina matches_enriched ordenado por match_score DESC até atingir top_n cnpjs distintos
    //    PostgREST limita a 1000 por request → uso .range() para iterar.
    const PAGE = 1000;
    const HARD_CAP_ROWS = 200000;
    const byCnpj = new Map<string, any[]>();
    let offset = 0;

    while (offset < HARD_CAP_ROWS && byCnpj.size < top_n) {
      let q = supabase
        .schema("equity_brain" as any)
        .from("matches_enriched")
        .select("*")
        .order("match_score", { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (setor_ma) q = q.eq("setor_ma", setor_ma);
      if (uf) q = q.eq("uf", uf);

      const { data: page, error: pErr } = await q;
      if (pErr) {
        return new Response(JSON.stringify({ error: `matches page (offset=${offset}): ${pErr.message}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!page || page.length === 0) break;

      for (const m of page) {
        const arr = byCnpj.get(m.cnpj);
        if (arr) {
          if (arr.length < 8) arr.push(m); // só guardo até 8 por cnpj (suficiente p/ top 3)
        } else if (byCnpj.size < top_n) {
          byCnpj.set(m.cnpj, [m]);
        }
      }

      if (page.length < PAGE) break;
      offset += PAGE;
    }

    if (byCnpj.size === 0) {
      return new Response(JSON.stringify({ refreshed: 0, distinct_cnpjs: 0, sample: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Constrói rows (deduplicado por cnpj — Map já garante)
    const rows: any[] = [];
    for (const [cnpj, ms] of byCnpj) {
      ms.sort((a: any, b: any) => Number(b.match_score) - Number(a.match_score));
      const top = ms[0];
      const top3 = ms.slice(0, 3).map((m: any) => ({
        buyer_id: m.buyer_id,
        buyer_nome: m.buyer_nome,
        buyer_tipo: m.buyer_tipo,
        match_score: Number(m.match_score),
        thesis_key: m.thesis_key,
        thesis_name: m.thesis_name,
      }));

      const tese = thesesIdx.get(top.thesis_key);
      const idadeAnos = top.data_abertura
        ? Math.round((Date.now() - new Date(top.data_abertura).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : "?";
      const ctx: Record<string, any> = {
        idade_empresa: idadeAnos,
        regiao: top.uf,
        municipio: top.municipio,
        setor: top.setor_ma,
        qtd_compradores: ms.length,
        comprador: top.buyer_nome,
      };
      const default_pitch = tese?.default_pitch_template
        ? fillTemplate(tese.default_pitch_template, ctx)
        : `Empresa do setor ${top.setor_ma ?? "?"} em ${top.municipio ?? top.uf ?? "?"}, ${ms.length} comprador(es) compatível(eis).`;

      const maScore = Number(top.ma_score) || 0;
      rows.push({
        cnpj,
        razao_social: top.razao_social,
        nome_fantasia: top.nome_fantasia,
        uf: top.uf,
        municipio: top.municipio,
        setor_ma: top.setor_ma,
        subsetor_ma: top.subsetor_ma,
        ma_score: top.ma_score,
        vispe_score: top.vispe_score,
        sucessao_score: top.sucessao_score,
        best_thesis_key: top.thesis_key,
        best_thesis_name: top.thesis_name,
        top_buyers: top3,
        buyers_count: ms.length,
        default_pitch,
        bubble_size: sizeFor(maScore),
        bubble_color: colorFor(maScore),
        source_match_count: ms.length,
        refreshed_at: new Date().toISOString(),
        // NOTA: status e assigned_bdr deliberadamente OMITIDOS para preservar pipeline em registros existentes.
        // Em INSERTs novos, o DEFAULT da coluna ('novo' / NULL) é aplicado.
      });
    }

    // 4) UPSERT em chunks de 1000
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 1000) {
      const chunk = rows.slice(i, i + 1000);
      const { error: upErr } = await supabase
        .schema("equity_brain" as any)
        .from("opportunities_ready")
        .upsert(chunk, { onConflict: "cnpj" });
      if (upErr) {
        return new Response(JSON.stringify({
          error: `upsert: ${upErr.message}`,
          partial: upserted,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      upserted += chunk.length;
    }

    const sample = rows.slice(0, 3).map((r) => ({
      cnpj: r.cnpj,
      razao_social: r.razao_social,
      ma_score: r.ma_score,
      best_thesis_name: r.best_thesis_name,
      buyers_count: r.buyers_count,
      bubble_color: r.bubble_color,
    }));

    return new Response(JSON.stringify({
      refreshed: upserted,
      distinct_cnpjs: byCnpj.size,
      rows_scanned: offset + (byCnpj.size === 0 ? 0 : Math.min(PAGE, byCnpj.size)),
      sample,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("refresh-opportunities error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
