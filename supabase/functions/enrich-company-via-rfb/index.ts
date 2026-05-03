// enrich-company-via-rfb — Dado um CNPJ, faz lookup na RFB (via national-search type=cnpj)
// e preenche campos faltantes em equity_brain.companies.
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
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = await checkAuth(req, supabaseUrl, serviceKey);
    if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { cnpj } = await req.json();
    const clean = String(cnpj ?? "").replace(/\D/g, "");
    if (clean.length !== 14) return new Response(JSON.stringify({ error: "CNPJ inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Chama national-search type=cnpj usando service role
    const lookup = await fetch(`${supabaseUrl}/functions/v1/national-search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cnpj", cnpj: clean }),
    });
    if (!lookup.ok) {
      return new Response(JSON.stringify({ error: `national-search failed: ${lookup.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const payload = await lookup.json();
    const c = payload?.company ?? null;
    if (!c) return new Response(JSON.stringify({ error: "CNPJ não encontrado na RFB" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const updates: any = {
      cnpj: clean,
      razao_social: c.razao_social ?? undefined,
      nome_fantasia: c.nome_fantasia ?? undefined,
      cnae_principal: c.cnae_principal_codigo ?? c.cnae ?? undefined,
      cnae_secundarios: Array.isArray(c.cnae_secundarios) ? c.cnae_secundarios : undefined,
      natureza_juridica: c.natureza_juridica_descricao ?? c.natureza_juridica_codigo ?? undefined,
      uf: c.uf ?? c.state ?? undefined,
      municipio: c.city ?? undefined,
      bairro: c.neighborhood ?? c.bairro ?? undefined,
      cep: c.cep ?? undefined,
      data_abertura: c.data_abertura ?? undefined,
      capital_social: c.capital_social ?? undefined,
      porte: c.porte ?? undefined,
      situacao_cadastral: c.situacao ?? undefined,
      raw_data: c,
      last_enriched_at: new Date().toISOString(),
    };
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { error } = await sb.schema("equity_brain" as any).from("companies").upsert(updates, { onConflict: "cnpj" });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, cnpj: clean, fields_updated: Object.keys(updates).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("enrich-company-via-rfb error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
