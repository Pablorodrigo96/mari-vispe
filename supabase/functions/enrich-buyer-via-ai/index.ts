import { trackedAIFetch } from "../_shared/apiTrack.ts";
// Enriquece um buyer via Lovable AI (Gemini 2.5 Flash). Retorna sugestões para revisão humana.
// Auth: advisor OR admin. Body: { buyer_id }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const has = (r: string) => (roles ?? []).some((x: any) => x.role === r);
    if (!has("admin") && !has("advisor")) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { buyer_id } = await req.json();
    if (!buyer_id) {
      return new Response(JSON.stringify({ error: "buyer_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: buyer, error: bErr } = await admin
      .schema("equity_brain").from("buyers").select("*").eq("id", buyer_id).single();
    if (bErr || !buyer) {
      return new Response(JSON.stringify({ error: "buyer_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é analista sênior de M&A no Brasil. Pesquise no seu conhecimento público recente (últimos 24 meses) sobre este investidor/comprador. Use site oficial, LinkedIn, Crunchbase, releases e mídia BR (Valor, Pipeline, Brazil Journal, Reuters, NeoFeed).

Nome: ${buyer.nome}
${buyer.cnpj ? `CNPJ: ${buyer.cnpj}` : ""}
${buyer.website ? `Website: ${buyer.website}` : ""}
${buyer.linkedin_url ? `LinkedIn: ${buyer.linkedin_url}` : ""}
PE Sponsor: ${buyer.pe_sponsor_name ?? "n/a"}
Vertical principal: ${buyer.vertical_principal ?? "n/a"}

REGRA CRÍTICA: NÃO INVENTE. Se não tiver informação confiável, use null ou array vazio. É melhor null do que dado errado.

Retorne APENAS JSON válido (sem markdown), no formato:
{
  "cnpj": "00.000.000/0001-00 ou null",
  "website": "https://... ou null",
  "linkedin_url": "https://linkedin.com/company/... ou null",
  "email_contato_principal": "email genérico de contato (ri@, contato@) ou null",
  "telefone_contato": "telefone com DDD ou null",
  "pe_sponsor_name": "nome do sponsor (se PE-backed) ou null",
  "vertical_principal": "telecom, saas, saúde, educação... ou null",
  "metricas": {
    "deals_realizados": "número total histórico de aquisições (int) ou null",
    "deals_last_12m": "número de aquisições nos últimos 12 meses (int) ou null",
    "avg_multiple_paid_recent": "múltiplo médio EV/EBITDA recente (ex: 8.5) ou null",
    "recent_capital_raise_brl": "valor da última captação em REAIS (não milhões, ex: 500000000) ou null"
  },
  "tese_atualizada": "string descrevendo tese de investimento atual ou null",
  "deals_recentes": [{"target":"...","data":"YYYY-MM","valor_brl_mm":null,"setor":"..."}],
  "ultima_captacao": {"valor_brl_mm":null,"data":"YYYY-MM","fonte":"..."},
  "equipe_chave": ["Nome (cargo)"],
  "setores_foco": ["..."],
  "regioes_foco": ["..."],
  "fontes_sugeridas": ["url1","url2"]
}`;

    const resp = await trackedAIFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    }, { function_name: "enrich-buyer-via-ai" });
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim().replace(/```json|```/g, "");
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch (_) {
      return new Response(JSON.stringify({ error: "parse_failed", raw }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      await admin.schema("mari_ops").from("health_check").insert({
        check_name: "enrich-buyer-via-ai",
        status: "success",
        details: { buyer_id },
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ suggested: parsed, citations: parsed.fontes_sugeridas ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
