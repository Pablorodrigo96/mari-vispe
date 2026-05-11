// research-sector — Pesquisa setorial profissional via Perplexity (5 lentes)
// Cache 7d por setor em equity_brain.sector_research
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// =====================================================
// System prompt do framework (5 lentes)
// =====================================================
const SYSTEM_PROMPT = `PAPEL: Você é um analista sênior de pesquisa de mercado setorial brasileiro.

INPUT: O usuário fornece o nome de um setor da economia brasileira.

PROCESSO OBRIGATÓRIO:

ETAPA 1 — Mapeamento de fontes (antes de pesquisar)
Identifique mentalmente:
- Qual é o regulador ou associação setorial (ex.: Anatel, ANS, Aneel, Bacen, Abrasce, Abras)?
- Quais empresas listadas em B3 reportam dados desse setor?
- Quais veículos especializados cobrem (TeleSíntese, Valor, Brazil Journal, Pipeline)?
- Qual é a métrica regulatória padrão de "tamanho" (acessos, AUM, lojas, MW, vidas, GMV, leitos)?

ETAPA 2 — Pesquisa estruturada por 5 LENTES

LENTE 1 — TAMANHO: Quem são os 4-6 maiores players? Qual a métrica regulatória de tamanho? Quem cresceu/caiu nos últimos 12 meses? Top 4 + variação YoY.

LENTE 2 — EFICIÊNCIA: Quem opera melhor? Métricas como lucro/colaborador, ROE, margem EBITDA, vendas/m², sinistralidade. 4 indicadores comparativos entre players.

LENTE 3 — VELOCIDADE: Quem cresce mais rápido e COMO? Decompor crescimento em orgânico vs inorgânico (M&A) vs tecnologia. Listar 3-5 players com taxa de crescimento e composição.

LENTE 4 — HEAD-TO-HEAD: Apresentar 2 players com teses opostas no setor (ex.: consolidador agressivo vs orgânico premium). Comparar em 4 métricas que mostrem como NÃO existe fórmula única vencedora.

LENTE 5 — M&A: Como o setor se consolida? Listar 4-8 transações relevantes dos últimos 24 meses com: comprador, alvo, valor (R$ ou "n/d"), múltiplo (se divulgado). Identificar consolidadores ativos e perfil dos alvos.

ETAPA 3 — Regras de qualidade
- NUNCA use memória para fatos do presente. Sempre pesquise.
- Cite fonte + data de cada número (ex.: "Anatel 09/2025", "Telefônica 4T24")
- Se não houver fonte primária, marque "estimativa" e explique base
- Em M&A, valor não divulgado = "n/d" — nunca chute
- Se não conseguiu fechar uma lente, declare no campo "limitacoes" do JSON

ETAPA 4 — Saída: APENAS o JSON estruturado abaixo. Sem prosa fora do JSON. Sem markdown.

SCHEMA JSON OBRIGATÓRIO:
{
  "setor": "string (nome completo)",
  "periodo_referencia": "string ex: 4T25 / 2025",
  "data_geracao": "YYYY-MM-DD",
  "fontes_primarias": ["url ou nome+data", ...],
  "painel_1_ranking": {
    "metrica": "string (ex: Acessos de banda larga fixa)",
    "fonte": "string",
    "players": [
      {"nome": "string", "valor": number, "unidade": "string", "share_pct": number, "variacao_yoy_pct": number}
    ],
    "comentario": "string (2-3 frases analíticas)"
  },
  "painel_2_eficiencia": {
    "cards": [
      {"label": "string", "valor": "string", "player": "string", "fonte": "string", "tom": "positivo|alerta|neutro"}
    ],
    "comentario": "string"
  },
  "painel_3_velocidade": {
    "players": [
      {"nome": "string", "crescimento_pct": number, "organico_pct": number, "inorganico_pct": number, "tecnologia_pct": number, "fonte": "string"}
    ],
    "comentario": "string"
  },
  "painel_4_head_to_head": {
    "player_a": {"nome": "string", "tese": "string"},
    "player_b": {"nome": "string", "tese": "string"},
    "metricas_comparativas": [
      {"label": "string", "valor_a": "string", "valor_b": "string"}
    ],
    "comentario": "string"
  },
  "painel_5_mna": {
    "deals": [
      {"comprador": "string", "alvo": "string", "valor_brl_milhoes": number, "multiplo": "string", "data": "string", "destaque": boolean, "fonte": "string"}
    ],
    "consolidadores_ativos": ["string"],
    "perfil_alvos": "string",
    "comentario": "string"
  },
  "conclusao_setorial": {
    "vencedores": "string (1-2 frases)",
    "consolidadores": "string",
    "alvos": "string",
    "punch_line": "string (frase impactante)"
  },
  "limitacoes": ["string"]
}`;

// =====================================================
// Validação básica do payload
// =====================================================
function validatePayload(p: any): { ok: boolean; status: "success" | "partial"; missing: string[] } {
  const missing: string[] = [];
  const required = [
    "setor",
    "painel_1_ranking",
    "painel_2_eficiencia",
    "painel_3_velocidade",
    "painel_4_head_to_head",
    "painel_5_mna",
    "conclusao_setorial",
  ];
  for (const k of required) if (!p?.[k]) missing.push(k);
  if (missing.length === 0) return { ok: true, status: "success", missing: [] };
  if (missing.length <= 2 && p?.setor) return { ok: true, status: "partial", missing };
  return { ok: false, status: "partial", missing };
}

function extractJson(text: string): any {
  // Tenta parse direto; senão, extrai bloco entre primeiro { e último }
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("JSON inválido na resposta da IA");
  }
}

async function callPerplexity(setorNome: string): Promise<{
  payload: any;
  rawText: string;
  fontes: string[];
  tokens: number;
  duration_ms: number;
}> {
  if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY não configurado");

  const t0 = Date.now();
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Pesquise o setor: ${setorNome}. Foco no mercado brasileiro. Retorne SOMENTE o JSON.` },
      ],
      max_tokens: 8000,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err: any = new Error(`Perplexity ${res.status}: ${body.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const citations: string[] = data?.citations ?? [];
  const tokens =
    (data?.usage?.completion_tokens ?? 0) + (data?.usage?.prompt_tokens ?? 0);

  const payload = extractJson(content);
  if (citations.length && (!payload.fontes_primarias || payload.fontes_primarias.length === 0)) {
    payload.fontes_primarias = citations;
  }

  return {
    payload,
    rawText: content,
    fontes: payload.fontes_primarias ?? citations,
    tokens,
    duration_ms: Date.now() - t0,
  };
}

// Custo estimado sonar-pro: ~$1/1M input, $1/1M output (aproximado)
function estimateCostUsd(tokens: number): number {
  return Number(((tokens / 1_000_000) * 1.5).toFixed(4));
}

async function logUsage(args: {
  feature: string;
  tokens: number;
  cost_usd: number;
  status: string;
  duration_ms: number;
  error?: string;
}) {
  try {
    await supabase.from("api_usage_logs").insert({
      provider: "perplexity",
      category: "llm",
      feature: args.feature,
      model: "sonar-pro",
      total_tokens: args.tokens,
      cost_usd: args.cost_usd,
      cost_brl: Number((args.cost_usd * 5.2).toFixed(4)),
      status: args.status,
      latency_ms: args.duration_ms,
      error_message: args.error ?? null,
    });
  } catch (e) {
    console.error("usage log failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const setor_slug: string | undefined = body?.setor_slug;
    const force_refresh: boolean = !!body?.force_refresh;
    const setor_nome_override: string | undefined = body?.setor_nome;

    if (!setor_slug || typeof setor_slug !== "string") {
      return new Response(JSON.stringify({ error: "setor_slug obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Cache
    if (!force_refresh) {
      const { data: cached } = await supabase
        .schema("equity_brain")
        .from("sector_research")
        .select("*")
        .eq("setor_slug", setor_slug)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({ cached: true, ...cached }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2) Resolver nome do setor
    let setor_nome = setor_nome_override;
    if (!setor_nome) {
      const { data: m } = await supabase
        .schema("equity_brain")
        .from("cnae_to_sector_mapping")
        .select("setor_nome")
        .eq("setor_slug", setor_slug)
        .limit(1)
        .maybeSingle();
      setor_nome = m?.setor_nome ?? setor_slug.replace(/-/g, " ");
    }

    // 3) Pesquisa Perplexity (com 1 retry em 429)
    let result;
    try {
      result = await callPerplexity(setor_nome);
    } catch (e: any) {
      if (e?.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        result = await callPerplexity(setor_nome);
      } else if (e?.status === 402) {
        await logUsage({
          feature: "research-sector",
          tokens: 0,
          cost_usd: 0,
          status: "failed",
          duration_ms: 0,
          error: "credits_exhausted",
        });
        return new Response(
          JSON.stringify({ error: "credits_exhausted", message: "Créditos Perplexity esgotados" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } else {
        throw e;
      }
    }

    const { payload, fontes, tokens, duration_ms } = result;
    const cost_usd = estimateCostUsd(tokens);
    if (cost_usd > 5) console.warn(`research-sector custo elevado: $${cost_usd} (${tokens} tokens)`);

    const validation = validatePayload(payload);
    const status = validation.status;

    // 4) Upsert
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: existing } = await supabase
      .schema("equity_brain")
      .from("sector_research")
      .select("id, refresh_count")
      .eq("setor_slug", setor_slug)
      .maybeSingle();

    const row = {
      setor_slug,
      setor_nome_completo: payload.setor ?? setor_nome,
      periodo_referencia: payload.periodo_referencia ?? null,
      data_geracao: now.toISOString().slice(0, 10),
      expires_at: expires.toISOString(),
      payload_json: payload,
      fontes_primarias: fontes,
      custo_geracao_usd: cost_usd,
      tokens_usados: tokens,
      geracao_status: status,
      geracao_erro: validation.missing.length
        ? `missing: ${validation.missing.join(", ")}`
        : null,
      geracao_duration_ms: duration_ms,
      refresh_count: (existing?.refresh_count ?? 0) + 1,
    };

    if (existing) {
      await supabase
        .schema("equity_brain")
        .from("sector_research")
        .update(row)
        .eq("id", existing.id);
    } else {
      await supabase.schema("equity_brain").from("sector_research").insert(row);
    }

    await logUsage({
      feature: "research-sector",
      tokens,
      cost_usd,
      status,
      duration_ms,
    });

    return new Response(
      JSON.stringify({ cached: false, ...row }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("research-sector error", e);
    await logUsage({
      feature: "research-sector",
      tokens: 0,
      cost_usd: 0,
      status: "failed",
      duration_ms: 0,
      error: String(e?.message ?? e),
    });
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
