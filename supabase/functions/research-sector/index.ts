// research-sector v2 — Pesquisa setorial editorial (5 lentes profundas)
// Cache 7d por setor em equity_brain.sector_research. schema_version=2.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAuth, authErrorResponse } from "../_shared/authGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAYLOAD_SCHEMA_VERSION = 2;

const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// =====================================================
// SYSTEM PROMPT v2 — exige profundidade editorial
// =====================================================
const SYSTEM_PROMPT = `PAPEL: Você é um analista sênior de M&A e pesquisa de mercado setorial brasileiro, escrevendo um relatório executivo para um boutique de M&A (PME.B3 / Mari). Estilo Brazil Journal + Pipeline + TELETIME.

INPUT: Nome de um setor da economia brasileira.

PROCESSO:

ETAPA 1 — Mapeamento de fontes (silencioso). Identifique regulador (Anatel, ANS, Aneel, Bacen, Abrasce, Abras), empresas listadas em B3, veículos especializados (TeleSíntese, Valor, Brazil Journal, Pipeline, NeoFeed, TELETIME, TI Inside) e métrica regulatória padrão de "tamanho".

ETAPA 2 — Pesquisa em 5 LENTES, com PROFUNDIDADE OBRIGATÓRIA:

LENTE 1 — TAMANHO (mínimo 12 players, ideal 15):
- Métrica regulatória de tamanho (acessos, AUM, vidas, lojas, GMV, MW, leitos).
- Top 12-15 players ordenados por essa métrica.
- Para cada: nome, valor numérico, share %, variação YoY %, variação absoluta em label ("+106 mil em 2025"), subtítulo curto descritivo ("Líder de mercado", "Maior crescimento orgânico", "Operação V.tal").

LENTE 2 — EFICIÊNCIA (exatamente 4 cards):
- Selecione 4 players com a métrica que MELHOR expõe eficiência do setor (lucro/colaborador, ROE, margem EBITDA, sinistralidade, vendas/m², custo por GW).
- Para cada card: nome do player, valor com unidade ("~R$ 205 mil"), DENOMINADOR explicando a conta ("Lucro 2025: R$ 6,17 bi · HC ~30 mil"), tom (positivo|alerta|neutro), cor (1-4).

LENTE 3 — VELOCIDADE (mínimo 8 players, ideal 10):
- Decomponha crescimento em orgânico / inorgânico (M&A) / tecnologia.
- Para cada: nome, crescimento % YoY, net adds anuais (label "+719 mil/ano"), net adds diários (label "+1.970/dia"), classificação dominante ("organico"|"inorganico"|"tecnologia"|"hibrido"), composição em % (orgânico/inorgânico/tecnologia somando ~100), fonte.

LENTE 4 — HEAD-TO-HEAD (1 dueto):
- Escolha 2 players com TESES OPOSTAS no setor (consolidador agressivo vs orgânico premium, capital intensivo vs disciplinado).
- Tese de cada player em 1 frase.
- 4 métricas comparativas. Cada métrica = { label, valor_a: { num, sub }, valor_b: { num, sub } } onde "num" é o número grande e "sub" é o contexto curto ("EBITDA: R$ 743,7 mi", "+17,5% YoY").

LENTE 5 — M&A (mínimo 6, ideal 8-10 deals dos últimos 24 meses):
- Para cada: comprador, alvo, valor em R$ milhões (number, ou 0 se n/d), múltiplo (string ou "n/d"), data ("out/2025", "2024"), destaque (boolean), contexto ("~345 mil clientes · entrada em GO, DF, MT"), status ("concluido"|"anunciado"|"pendente_cade"), fonte.
- Lista de consolidadores ativos (3-6 nomes).
- Perfil dos alvos típicos (1-2 frases).

CONCLUSÃO SETORIAL:
- vencedores, consolidadores, alvos (cada um 1-2 frases analíticas).
- tres_blocos: { executam: "...", consolidam: "...", atrasados: "..." } (1 frase cada).
- paragrafos: array de 3 parágrafos editoriais (cada um 80-150 palavras) com inline **bold** em palavras-chave. Estilo: tese clara, dado, implicação.
- punch_line: frase impactante final.

PROFUNDIDADE EDITORIAL OBRIGATÓRIA EM CADA PAINEL:
- "comentario": 80-130 palavras com 2-4 frases analíticas + 3-5 bullets curtos em string (separados por " · ") + uma "punch_line" final destacada.
- Use **bold** inline em palavras-chave (não em frases inteiras).
- NUNCA telegráfico. Não use "etc.". Não use "diversos".

REGRAS DE QUALIDADE:
- NUNCA invente números. Se não tem fonte, marque "estimativa" no fonte e explique base.
- M&A com valor não divulgado = valor_brl_milhoes: 0 e multiplo: "n/d".
- Citar fonte+data por número quando possível.
- Se um campo ficar abaixo do mínimo declarado, registre em "limitacoes" qual lente ficou incompleta e por quê.

SAÍDA: APENAS o JSON abaixo. Sem markdown wrapper. Sem prosa fora do JSON.

SCHEMA:
{
  "setor": "string",
  "periodo_referencia": "string ex 4T25 / 2025",
  "data_geracao": "YYYY-MM-DD",
  "fontes_primarias": ["url ou nome+data"],
  "painel_1_ranking": {
    "metrica": "string",
    "fonte": "string",
    "players": [
      {"nome":"string","subtitulo":"string","valor":number,"unidade":"string","share_pct":number,"variacao_yoy_pct":number,"variacao_absoluta_label":"string","cor_bucket":"top|positivo|negativo|neutro"}
    ],
    "comentario": "string com **bold** e · bullets",
    "punch_line": "string"
  },
  "painel_2_eficiencia": {
    "metrica_principal": "string",
    "cards": [
      {"label":"string (nome do player)","valor":"string","denominador":"string","fonte":"string","tom":"positivo|alerta|neutro","cor":1}
    ],
    "comentario": "string com **bold**",
    "punch_line": "string"
  },
  "painel_3_velocidade": {
    "players": [
      {"nome":"string","subtitulo":"string","crescimento_pct":number,"net_adds_ano_label":"string","net_adds_dia_label":"string","classificacao":"organico|inorganico|tecnologia|hibrido","organico_pct":number,"inorganico_pct":number,"tecnologia_pct":number,"fonte":"string"}
    ],
    "comentario": "string",
    "punch_line": "string"
  },
  "painel_4_head_to_head": {
    "player_a": {"nome":"string","tese":"string"},
    "player_b": {"nome":"string","tese":"string"},
    "metricas": [
      {"label":"string","valor_a":{"num":"string","sub":"string"},"valor_b":{"num":"string","sub":"string"}}
    ],
    "comentario": "string",
    "punch_line": "string"
  },
  "painel_5_mna": {
    "deals": [
      {"comprador":"string","alvo":"string","valor_brl_milhoes":number,"multiplo":"string","data":"string","destaque":boolean,"contexto":"string","status":"concluido|anunciado|pendente_cade","fonte":"string"}
    ],
    "consolidadores_ativos": ["string"],
    "perfil_alvos": "string",
    "comentario": "string",
    "punch_line": "string"
  },
  "conclusao_setorial": {
    "vencedores": "string",
    "consolidadores": "string",
    "alvos": "string",
    "tres_blocos": {"executam":"string","consolidam":"string","atrasados":"string"},
    "paragrafos": ["string","string","string"],
    "punch_line": "string"
  },
  "limitacoes": ["string"]
}`;

// =====================================================
// Enriquecimento Gemini quando Perplexity vier raso
// =====================================================
const ENRICHMENT_SYSTEM = `Você é um editor de relatório M&A. Receberá um JSON parcial + fontes pesquisadas. Sua tarefa é EXPANDIR a profundidade EDITORIAL (não inventar números novos). Foque em:
1) Expandir "comentario" de cada painel para 80-130 palavras com bullets " · " e **bold** inline.
2) Preencher "punch_line" de cada painel se faltar.
3) Expandir "conclusao_setorial.paragrafos" para 3 parágrafos editoriais de 80-150 palavras.
4) Não altere números, nomes de players, valores de deals — apenas expanda texto narrativo.
Retorne SOMENTE o JSON completo modificado, mesmo schema.`;

async function enrichWithGemini(payload: any, fontes: string[]): Promise<any> {
  if (!LOVABLE_API_KEY) return payload;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: ENRICHMENT_SYSTEM },
          {
            role: "user",
            content: `Fontes pesquisadas:\n${fontes.slice(0, 20).join("\n")}\n\nJSON parcial:\n${JSON.stringify(payload)}`,
          },
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      console.warn("[enrich] gateway", res.status, await res.text().catch(() => ""));
      return payload;
    }
    const j = await res.json();
    const txt: string = j?.choices?.[0]?.message?.content ?? "";
    return extractJson(txt);
  } catch (e) {
    console.warn("[enrich] falhou", e);
    return payload;
  }
}

// =====================================================
function countItems(p: any) {
  return {
    ranking: p?.painel_1_ranking?.players?.length ?? 0,
    eficiencia: p?.painel_2_eficiencia?.cards?.length ?? 0,
    velocidade: p?.painel_3_velocidade?.players?.length ?? 0,
    h2h: p?.painel_4_head_to_head?.metricas?.length ?? 0,
    mna: p?.painel_5_mna?.deals?.length ?? 0,
    paragrafos: p?.conclusao_setorial?.paragrafos?.length ?? 0,
  };
}

function needsEnrichment(p: any): boolean {
  const c = countItems(p);
  return (
    c.ranking < 8 ||
    c.mna < 5 ||
    c.paragrafos < 3 ||
    !p?.painel_1_ranking?.comentario ||
    (p?.painel_1_ranking?.comentario?.length ?? 0) < 200
  );
}

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
  try {
    return JSON.parse(text);
  } catch {
    // Remove markdown fences se houver
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("JSON inválido na resposta da IA");
  }
}

async function callPerplexity(setorNome: string, deep = false): Promise<{
  payload: any;
  fontes: string[];
  tokens: number;
  duration_ms: number;
  model_used: string;
}> {
  if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY não configurado");

  const model = deep ? "sonar-deep-research" : "sonar-pro";
  const t0 = Date.now();
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Pesquise o setor: ${setorNome}. Foco TOTAL no mercado brasileiro. Profundidade EDITORIAL obrigatória. Retorne SOMENTE o JSON do schema definido.`,
        },
      ],
      max_tokens: 16000,
      temperature: 0.2,
      search_recency_filter: "year",
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
  const citations: string[] = data?.citations ?? data?.search_results?.map((s: any) => s.url) ?? [];
  const tokens =
    (data?.usage?.completion_tokens ?? 0) + (data?.usage?.prompt_tokens ?? 0);

  const payload = extractJson(content);
  if (citations.length && (!payload.fontes_primarias || payload.fontes_primarias.length === 0)) {
    payload.fontes_primarias = citations;
  }

  return {
    payload,
    fontes: payload.fontes_primarias ?? citations,
    tokens,
    duration_ms: Date.now() - t0,
    model_used: model,
  };
}

// Custo sonar-pro ~$1/M input+output, sonar-deep ~$8/M
function estimateCostUsd(tokens: number, model: string): number {
  const rate = model === "sonar-deep-research" ? 8 : 1.5;
  return Number(((tokens / 1_000_000) * rate).toFixed(4));
}

async function logUsage(args: {
  feature: string;
  tokens: number;
  cost_usd: number;
  status: string;
  duration_ms: number;
  model: string;
  error?: string;
}) {
  try {
    await supabase.from("api_usage_logs").insert({
      provider: "perplexity",
      category: "llm",
      feature: args.feature,
      model: args.model,
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

  const auth = await requireAuth(req, { requireAnyRole: ["admin", "advisor"] });
  if (!auth.ok) return authErrorResponse(auth, corsHeaders);



  try {
    const body = await req.json().catch(() => ({}));
    const setor_slug: string | undefined = body?.setor_slug;
    const force_refresh: boolean = !!body?.force_refresh;
    const deep: boolean = !!body?.deep;
    const setor_nome_override: string | undefined = body?.setor_nome;

    if (!setor_slug || typeof setor_slug !== "string") {
      return new Response(JSON.stringify({ error: "setor_slug obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Cache (só válido se schema_version >= atual)
    if (!force_refresh) {
      const { data: cached } = await supabase
        .schema("equity_brain")
        .from("sector_research")
        .select("*")
        .eq("setor_slug", setor_slug)
        .gte("expires_at", new Date().toISOString())
        .gte("schema_version", PAYLOAD_SCHEMA_VERSION)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({ cached: true, ...cached }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2) Nome do setor
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

    // 3) Pesquisa Perplexity
    let result;
    try {
      result = await callPerplexity(setor_nome, deep);
    } catch (e: any) {
      if (e?.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        result = await callPerplexity(setor_nome, deep);
      } else if (e?.status === 402) {
        await logUsage({
          feature: "research-sector",
          tokens: 0,
          cost_usd: 0,
          status: "failed",
          duration_ms: 0,
          model: "sonar-pro",
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

    let { payload, fontes, tokens, duration_ms, model_used } = result;

    // 4) Enriquecimento Gemini se vier raso
    let enriched_by = "";
    if (needsEnrichment(payload)) {
      const beforeCounts = JSON.stringify(countItems(payload));
      const enriched = await enrichWithGemini(payload, fontes);
      // só substituir se enrichment retornou estrutura válida com os mesmos painéis
      if (enriched?.painel_1_ranking) {
        payload = enriched;
        enriched_by = `gemini-2.5-pro (counts antes: ${beforeCounts})`;
      }
    }

    const cost_usd = estimateCostUsd(tokens, model_used);
    if (cost_usd > 5) console.warn(`research-sector custo elevado: $${cost_usd} (${tokens} tokens)`);

    const validation = validatePayload(payload);
    const status = validation.status;
    const counts = countItems(payload);
    const qualityNote = `counts: ${JSON.stringify(counts)}${enriched_by ? ` | enriched_by: ${enriched_by}` : ""}`;

    // 5) Upsert
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
      geracao_erro: [
        validation.missing.length ? `missing: ${validation.missing.join(", ")}` : null,
        qualityNote,
      ].filter(Boolean).join(" | "),
      geracao_duration_ms: duration_ms,
      refresh_count: (existing?.refresh_count ?? 0) + 1,
      schema_version: PAYLOAD_SCHEMA_VERSION,
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
      model: model_used,
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
      model: "sonar-pro",
      error: String(e?.message ?? e),
    });
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
