// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cleanCnpj(v: string | null | undefined) {
  return (v || "").replace(/\D/g, "");
}

function parseBRL(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/[^0-9]/g, ""));
  return isFinite(n) && n > 0 ? n : null;
}

async function fetchBrasilApi(cnpj: string): Promise<any | null> {
  if (cnpj.length !== 14) return null;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function perplexitySearch(query: string): Promise<{ content: string; citations: string[] } | null> {
  if (!PERPLEXITY_API_KEY) return null;
  try {
    const r = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "Você é um pesquisador de M&A brasileiro. Responda em português, objetivo, com fontes confiáveis." },
          { role: "user", content: query },
        ],
        max_tokens: 800,
        temperature: 0.2,
        search_recency_filter: "year",
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return {
      content: j?.choices?.[0]?.message?.content || "",
      citations: j?.citations || [],
    };
  } catch (e) {
    console.warn("perplexity error", e);
    return null;
  }
}

async function lovableSynthesize(systemPrompt: string, userPrompt: string): Promise<any | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
    if (!r.ok) {
      console.warn("lovable synth status", r.status, await r.text());
      return null;
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (e) {
    console.warn("lovable synth error", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userSb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userSb.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const razao_social: string = body?.razao_social || "";
    const cnpjRaw: string = body?.cnpj || "";
    const assessment_id: string | null = body?.assessment_id || null;
    const faturamento_declarado: string | null = body?.faturamento_declarado || null;
    const cnpj = cleanCnpj(cnpjRaw);

    if (!razao_social && !cnpj) {
      return new Response(JSON.stringify({ error: "missing_company" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache lookup
    if (cnpj) {
      const { data: cached } = await sb
        .from("equity_market_scans")
        .select("*")
        .eq("user_id", user.id)
        .eq("cnpj", cnpj)
        .eq("status", "done")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached?.completed_at && Date.now() - new Date(cached.completed_at).getTime() < CACHE_TTL_MS) {
        // Update assessment link if needed
        if (assessment_id && cached.assessment_id !== assessment_id) {
          await sb.from("equity_market_scans").update({ assessment_id }).eq("id", cached.id);
        }
        return new Response(JSON.stringify({ scan: cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert running row
    const { data: row, error: insErr } = await sb
      .from("equity_market_scans")
      .insert({
        user_id: user.id, assessment_id, cnpj: cnpj || null, razao_social,
        status: "running", started_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (insErr) throw insErr;

    // ===== Collect signals =====
    const brasil = cnpj ? await fetchBrasilApi(cnpj) : null;

    const capitalSocial: number | null = brasil?.capital_social ? Number(brasil.capital_social) : null;
    const socios: any[] = brasil?.qsa || [];
    const hasSocioPJ = socios.some((s) => /(LTDA|S\.A|S\/A|HOLDING|PARTICIP|INC|EIRELI)/i.test(s?.nome_socio || ""));
    const cnaePrincipal: string = brasil?.cnae_fiscal_descricao || "";
    const sitioOficial: string | null = brasil?.website || brasil?.site || null;
    const nomeFantasia: string = brasil?.nome_fantasia || razao_social;

    // Perplexity in parallel
    const queryBase = `${razao_social || nomeFantasia}${cnpj ? ` (CNPJ ${cnpjRaw})` : ""}`;
    const [midia, reputacao, holding] = await Promise.all([
      perplexitySearch(`Quais são as menções na mídia, notícias e prêmios da empresa brasileira "${queryBase}" nos últimos 24 meses? Liste no máximo 5 menções com veículo, data e trecho.`),
      perplexitySearch(`Qual é a nota no Google Reviews/Reclame Aqui/Trustpilot da empresa "${queryBase}"? Inclua quantidade aproximada de avaliações e principais reclamações.`),
      perplexitySearch(`A empresa "${queryBase}" está sob uma holding patrimonial ou faz parte de um grupo controlador? Existem indícios públicos?`),
    ]);

    // ===== Synthesize with Gemini =====
    const fatNum = parseBRL(faturamento_declarado);
    const capGapPct = capitalSocial && fatNum ? Math.max(0, Math.round((1 - capitalSocial / fatNum) * 100)) : null;

    const synthInput = {
      empresa: { razao_social, nome_fantasia: nomeFantasia, cnpj: cnpjRaw, uf: brasil?.uf, cnae: cnaePrincipal },
      site_oficial: sitioOficial,
      capital_social: capitalSocial,
      faturamento_declarado: fatNum,
      capital_gap_pct: capGapPct,
      socios_count: socios.length,
      tem_socio_pj: hasSocioPJ,
      pesquisa_midia: midia?.content || null,
      midia_citations: midia?.citations || [],
      pesquisa_reputacao: reputacao?.content || null,
      reputacao_citations: reputacao?.citations || [],
      pesquisa_holding: holding?.content || null,
    };

    const synthSystem = `Você é um analista sênior de M&A no Brasil. Sintetize os dados públicos coletados sobre uma empresa em um JSON estruturado para um painel executivo "Mapeamento de Mercado".

Regras OBRIGATÓRIAS:
- Responda APENAS JSON válido (sem markdown, sem prefixo).
- Português brasileiro, tom executivo direto, sem clichês.
- "hero_insight" = UMA frase impactante (máx 18 palavras) que captura o achado-chave para o dono da empresa pensando em vender em 1-3 anos.
- Status dos sinais: "forte" | "medio" | "fragil" | "ausente".
- Em "media_clips", inclua até 3 trechos REAIS extraídos da pesquisa (se não houver, retorne array vazio).
- "fiscal_insight.has_opportunity" = true se capital social <30% do faturamento OU sem holding aparente.
- Economia estimada da holding: ~6% do faturamento anual (eficiência fiscal típica PJ→holding). Capital social baixo: ~15% do gap como oportunidade tributária.
- Nada de "talvez", "pode ser". Frases curtas e afirmativas.

Schema do JSON:
{
  "hero_insight": string,
  "big_numbers": {
    "google_rating": { "value": number|null, "label": string, "sub": string },
    "midia_12m": { "value": number, "label": string, "sub": string },
    "capital_gap": { "value": number|null, "label": string, "sub": string }
  },
  "signals": {
    "site": { "status": string, "nota": string },
    "holding": { "status": string, "nota": string },
    "equity_story": { "status": string, "nota": string },
    "reputacao": { "status": string, "nota": string }
  },
  "fiscal_insight": { "has_opportunity": boolean, "economia_estimada_brl": number|null, "racional": string },
  "media_clips": [{ "veiculo": string, "data": string, "trecho": string, "url": string }],
  "next_step": { "titulo": string, "racional": string }
}`;

    const payload = await lovableSynthesize(synthSystem, JSON.stringify(synthInput));

    if (!payload) {
      await sb.from("equity_market_scans").update({
        status: "error", error_msg: "synthesis_failed", completed_at: new Date().toISOString(),
      }).eq("id", row.id);
      return new Response(JSON.stringify({ error: "synthesis_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Attach raw for debug
    const finalPayload = { ...payload, _meta: { site_oficial: sitioOficial, capital_social: capitalSocial, capital_gap_pct: capGapPct } };

    const { data: updated } = await sb.from("equity_market_scans").update({
      status: "done", payload: finalPayload, completed_at: new Date().toISOString(),
    }).eq("id", row.id).select("*").single();

    return new Response(JSON.stringify({ scan: updated, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("equity-market-scan error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
