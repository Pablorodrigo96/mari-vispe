// Constrói o Plano Tático Anual (E1A — Equity em 1 Ano) consolidando todos os
// prompts compilados das iniciativas. POST { assessment_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAnthropic } from "../_shared/anthropicGateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `Você é o Arquiteto do Plano Tático Anual (E1A — Equity em 1 Ano) da Mari.
Sua missão: dado o diagnóstico de uma PME e os prompts de aceleração compilados das iniciativas, projetar um plano tático MÊS A MÊS (12 meses) que transforme a empresa numa VERDADEIRA FÁBRICA DE EQUITY — vendável com liquidez e prêmio no mercado.

Regras:
- 12 meses (Mês 1 a Mês 12), na ordem cronológica certa (quick-wins → estrutura → reposicionamento → due-diligence-ready).
- Cada mês: tema central + 2 a 4 ações concretas, responsável sugerido, KPI binário de saída, riscos.
- Cada ação deve ser executável por um sócio/dono de PME (não consultoria abstrata).
- Conecte iniciativas: se "reduzir dependência do dono" depende de "estruturar #2", coloque na ordem.
- North star: target de IPE final + delta de valor projetado.
- Devolva APENAS JSON estrito, sem markdown.`;

function extractJson(raw: string): any {
  const s = (raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const first = s.indexOf("{");
  if (first < 0) throw new Error("no_json");
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = first; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (esc) { esc = false; continue; } if (ch === "\\") { esc = true; continue; } if (ch === '"') inStr = false; continue; }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") depth++; else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  const slice = end > first ? s.slice(first, end + 1) : s;
  try { return JSON.parse(slice); }
  catch {
    const repaired = slice.replace(/,\s*([}\]])/g, "$1").replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/[\x00-\x1F]+/g, " ");
    return JSON.parse(repaired);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { assessment_id } = await req.json();
    if (!assessment_id) return new Response(JSON.stringify({ error: "assessment_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: assess } = await supabase.from("equity_assessments").select("*").eq("id", assessment_id).single();
    if (!assess) throw new Error("assessment not found");

    const [{ data: company }, { data: inits }, { data: val }, { data: buyers }, { data: dd }] = await Promise.all([
      supabase.from("equity_companies").select("nome_empresa, setor, porte, faturamento_anual").eq("id", (assess as any).company_id).maybeSingle(),
      supabase.from("equity_initiatives").select("*").eq("assessment_id", assessment_id).order("sprint").order("prioridade"),
      supabase.from("equity_valuations").select("*").eq("assessment_id", assessment_id).maybeSingle(),
      supabase.from("equity_buyer_map").select("*").eq("assessment_id", assessment_id).eq("selecionado", true),
      supabase.from("equity_initiative_deepdive").select("initiative_id, compiled_prompt, status").eq("assessment_id", assessment_id),
    ]);

    const compiledPrompts = ((dd as any) || []).filter((d: any) => d.compiled_prompt).map((d: any) => {
      const i = (inits as any[]).find((x) => x.id === d.initiative_id);
      return { titulo: i?.titulo, sprint: i?.sprint, dimensao: i?.dimensao_alvo, prompt: d.compiled_prompt };
    });

    const prompt = `EMPRESA: ${JSON.stringify(company || {})}
DIAGNÓSTICO:
- IPE atual: ${(assess as any).ipe_composto}/100
- Arquétipo: ${(assess as any).arquetipo_id}
- Veredito: ${(assess as any).veredito_liquidez}
- Resumo: ${(assess as any).summary || "—"}

VALUATION:
- Valor atual: ${val?.valor_atual} · Valor alvo: ${val?.valor_alvo}
- Múltiplo aplicado: ${val?.multiplo_aplicado}x (faixa ${val?.faixa_min}x-${val?.faixa_max}x)
- EBITDA normalizado: ${val?.ebitda_normalizado}

COMPRADOR-ALVO (se houver): ${JSON.stringify(buyers || [])}

INICIATIVAS DO PLANO:
${(inits || []).map((i: any) => `- [${i.sprint}] ${i.titulo} (${i.dimensao_alvo}, Δ${i.delta_ipe} IPE, ${i.esforco}, ${i.prazo_meses}m)`).join("\n")}

PROMPTS DE ACELERAÇÃO (respostas profundas do dono):
${compiledPrompts.map((c: any, idx: number) => `=== ${idx + 1}. ${c.titulo} (sprint ${c.sprint}) ===\n${c.prompt}`).join("\n\n")}

Devolva JSON:
{
  "north_star": {
    "ipe_alvo_12m": 0,
    "valor_alvo_12m": 0,
    "delta_valor_pct": 0,
    "tese_central": "uma frase forte que sintetiza o ano"
  },
  "resumo_executivo": "3 a 5 frases dizendo qual é o caminho de 12 meses",
  "meses": [
    {
      "mes": 1,
      "tema": "string curta (ex: Quick-wins financeiros)",
      "acoes": [
        {
          "titulo": "string",
          "descricao": "string",
          "responsavel": "Dono | CFO | COO | RH | Comercial | Externo",
          "kpi_saida": "métrica binária de pronto/não-pronto",
          "iniciativa_origem": "título da iniciativa que originou",
          "dependencias": ["string"],
          "riscos": ["string"]
        }
      ]
    }
  ]
}

Exatamente 12 meses. Cada mês com 2-4 ações.`;

    const ai = await callAnthropic({
      model: "claude-sonnet-4-6",
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000,
      temperature: 0.35,
      function_name: "equity-annual-plan-build",
      feature: "equity_planner",
      user_id: (assess as any).user_id,
      timeout_ms: 140000,
    });

    let parsed: any;
    try { parsed = extractJson(ai.text); } catch (e) {
      console.error("[annual-plan-build] invalid JSON:", (ai.text || "").slice(0, 400));
      throw new Error("ai_invalid_json");
    }

    const { data: saved, error: saveErr } = await supabase.from("equity_annual_plan").upsert({
      assessment_id,
      company_id: (assess as any).company_id,
      plan_data: parsed,
      source_prompts: compiledPrompts,
      model_used: `${ai.provider}:${ai.model}`,
      generated_at: new Date().toISOString(),
    }, { onConflict: "assessment_id" }).select().single();

    if (saveErr) throw saveErr;

    return new Response(JSON.stringify({ ok: true, plan: saved }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
