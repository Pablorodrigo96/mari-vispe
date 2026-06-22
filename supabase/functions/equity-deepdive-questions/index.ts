// Gera 6-10 perguntas profundas para uma iniciativa específica do Equity Planner.
// POST { initiative_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAnthropic } from "../_shared/anthropicGateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `Você é o Diagnóstico Profundo do Equity Planner Mari.
Dada UMA iniciativa específica do plano de uma PME, gere de 6 a 10 perguntas curtas, concretas e ACIONÁVEIS que destravem informação real do dono sobre essa alavanca.

Regras:
- Perguntas em português do Brasil, tom direto e profissional, sem jargão.
- Cada pergunta deve buscar UM dado específico (número, prática, processo, decisão, exemplo).
- Foque no que falta para essa empresa virar uma "fábrica de equity" naquela dimensão.
- NUNCA pergunte algo já respondido pelo contexto fornecido.
- Devolva APENAS JSON estrito sem markdown.`;

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
    const { initiative_id } = await req.json();
    if (!initiative_id) return new Response(JSON.stringify({ error: "initiative_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: init, error: initErr } = await supabase
      .from("equity_initiatives")
      .select("*, equity_assessments!inner(id, user_id, company_id, arquetipo_id, summary, raw_intake)")
      .eq("id", initiative_id)
      .single();
    if (initErr || !init) throw new Error("initiative not found");

    const assess: any = (init as any).equity_assessments;
    const { data: company } = await supabase.from("equity_companies").select("nome_empresa, setor, porte, faturamento_anual").eq("id", assess.company_id).maybeSingle();
    const { data: dim } = await supabase.from("equity_dimension_scores").select("*").eq("assessment_id", assess.id).eq("dimensao", (init as any).dimensao_alvo).maybeSingle();

    const prompt = `EMPRESA: ${JSON.stringify(company || {})}
ARQUÉTIPO: ${assess.arquetipo_id || "—"}
RESUMO DO DIAGNÓSTICO: ${assess.summary || "—"}

INICIATIVA:
Título: ${(init as any).titulo}
Descrição: ${(init as any).descricao || "—"}
Dimensão-alvo: ${(init as any).dimensao_alvo}
Δ IPE estimado: ${(init as any).delta_ipe}
Δ Valor estimado: ${(init as any).delta_valor}
Esforço: ${(init as any).esforco} · Prazo: ${(init as any).prazo_meses}m · Sprint: ${(init as any).sprint}

DIAGNÓSTICO ATUAL DA DIMENSÃO:
Score: ${dim?.score ?? "—"}/100
Evidências: ${JSON.stringify(dim?.evidencias || [])}

Devolva JSON:
{
  "diagnostico": ["3 a 5 bullets explicando por que essa iniciativa é crítica para esta empresa específica"],
  "perguntas": [
    { "id": "p1", "pergunta": "texto", "contexto": "por que pergunto isso (1 frase)", "tipo": "texto|numero" }
  ]
}`;

    const ai = await callAnthropic({
      model: "claude-haiku-4-5",
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.4,
      function_name: "equity-deepdive-questions",
      feature: "equity_planner",
      user_id: assess.user_id,
    });

    let parsed: any;
    try { parsed = extractJson(ai.text); }
    catch {
      parsed = {
        diagnostico: ["Diagnóstico automático indisponível — responda as perguntas para gerar o prompt de aceleração."],
        perguntas: [
          { id: "p1", pergunta: `Qual é a situação atual em "${(init as any).titulo}"?`, contexto: "Baseline", tipo: "texto" },
          { id: "p2", pergunta: "Qual o principal obstáculo hoje?", contexto: "Identifica bloqueios", tipo: "texto" },
          { id: "p3", pergunta: "Quem é o responsável por essa frente na empresa?", contexto: "Accountability", tipo: "texto" },
          { id: "p4", pergunta: "Que dado/indicador você acompanha (se algum)?", contexto: "Métrica de saída", tipo: "texto" },
          { id: "p5", pergunta: "Em quanto tempo realista isso pode ser resolvido?", contexto: "Prazo prático", tipo: "texto" },
          { id: "p6", pergunta: "Quanto custaria executar (estimativa)?", contexto: "Investimento", tipo: "numero" },
        ],
        _fallback: true,
      };
    }

    // upsert deepdive
    const { data: existing } = await supabase.from("equity_initiative_deepdive").select("id, answers, status").eq("initiative_id", initiative_id).maybeSingle();
    if (existing) {
      await supabase.from("equity_initiative_deepdive").update({ questions: parsed.perguntas || [], status: (existing as any).status === "concluida" ? "concluida" : "em_andamento" }).eq("id", (existing as any).id);
    } else {
      await supabase.from("equity_initiative_deepdive").insert({
        initiative_id,
        assessment_id: assess.id,
        questions: parsed.perguntas || [],
        answers: {},
        status: "em_andamento",
      });
    }

    return new Response(JSON.stringify({ ok: true, diagnostico: parsed.diagnostico || [], perguntas: parsed.perguntas || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
