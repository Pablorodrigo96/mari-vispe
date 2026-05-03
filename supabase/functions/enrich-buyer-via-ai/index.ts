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

    const prompt = `Você é analista sênior de M&A no Brasil. Pesquise mentalmente conhecimento público recente (últimos 24 meses) sobre este investidor/comprador:

Nome: ${buyer.nome}
${buyer.website ? `Website: ${buyer.website}` : ""}
${buyer.linkedin_url ? `LinkedIn: ${buyer.linkedin_url}` : ""}
PE Sponsor: ${buyer.pe_sponsor_name ?? "n/a"}
Vertical principal: ${buyer.vertical_principal ?? "n/a"}

Retorne APENAS JSON válido (sem markdown), no formato:
{
  "tese_atualizada": "string ou null",
  "deals_recentes": [{"target":"...","data":"YYYY-MM","valor_brl_mm":null,"setor":"..."}],
  "ultima_captacao": {"valor_brl_mm":null,"data":"YYYY-MM","fonte":"..."},
  "equipe_chave": ["..."],
  "setores_foco": ["..."],
  "regioes_foco": ["..."],
  "fontes_sugeridas": ["url1","url2"]
}

Se não tiver informação confiável de algum campo, use null ou array vazio.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
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
