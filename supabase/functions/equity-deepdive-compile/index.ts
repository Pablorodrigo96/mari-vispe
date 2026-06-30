// Compila respostas do deep-dive em um PROMPT focado em virar "fábrica de equity".
// POST { initiative_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callLovableAI } from "../_shared/apiTrack.ts";
import { requireInitiativeOwner } from "../_shared/equityAuth.ts";


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `Você é o Compilador de Prompts da Mari — Equity Planner.
A partir das respostas do dono sobre UMA iniciativa específica, você produz um PROMPT DE ACELERAÇÃO altamente curado.
Esse prompt será reutilizado depois para gerar um plano tático anual (E1A) — então precisa estar denso, factual e acionável.

O prompt compilado deve ter as seções:
1. CONTEXTO ESPECÍFICO (empresa, dimensão, baseline atual com números)
2. RESPOSTAS-CHAVE DO DONO (lista das respostas, sem perguntas, organizada)
3. GAP ENTRE ESTADO ATUAL E "FÁBRICA DE EQUITY" (3-5 lacunas concretas)
4. ALAVANCAS DE EQUITY (3-6 movimentos específicos que destravam múltiplo / valor)
5. KPIs DE SAÍDA (métricas binárias que provam que a alavanca foi executada)
6. DEPENDÊNCIAS / RISCOS

Tom: PT-BR, profissional, sem floreio, denso. Devolva texto puro (markdown OK), sem JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { initiative_id } = await req.json();
    if (!initiative_id) return new Response(JSON.stringify({ error: "initiative_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: dd } = await supabase.from("equity_initiative_deepdive").select("*").eq("initiative_id", initiative_id).maybeSingle();
    if (!dd) throw new Error("deepdive not found — gere as perguntas primeiro");

    const { data: init } = await supabase.from("equity_initiatives").select("*, equity_assessments!inner(id, user_id, company_id, arquetipo_id, summary)").eq("id", initiative_id).single();
    const assess: any = (init as any).equity_assessments;
    const { data: company } = await supabase.from("equity_companies").select("nome_empresa, setor, porte, faturamento_anual").eq("id", assess.company_id).maybeSingle();

    const questions: any[] = (dd as any).questions || [];
    const answers: Record<string, string> = (dd as any).answers || {};
    const qaList = questions.map((q: any) => ({ pergunta: q.pergunta, resposta: answers[q.id] || "(não respondida)", contexto: q.contexto }));

    const prompt = `EMPRESA: ${JSON.stringify(company || {})}
ARQUÉTIPO: ${assess.arquetipo_id || "—"}

INICIATIVA:
${(init as any).titulo} — ${(init as any).descricao || ""}
Dimensão: ${(init as any).dimensao_alvo} · Δ IPE ${(init as any).delta_ipe} · Δ Valor ${(init as any).delta_valor} · ${(init as any).esforco} · ${(init as any).prazo_meses}m

RESPOSTAS DO DONO:
${qaList.map((qa, i) => `${i + 1}. ${qa.pergunta}\n   R: ${qa.resposta}`).join("\n\n")}

Gere o PROMPT DE ACELERAÇÃO conforme as 6 seções do system.`;

    const resp = await callLovableAI(
      {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      },
      { function_name: "equity-deepdive-compile", feature: "equity_planner", user_id: assess.user_id },
    );
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`ai_http_${resp.status}: ${t.slice(0, 200)}`);
    }
    const data = await resp.json();
    const compiled = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (!compiled) throw new Error("empty_ai_response");

    await supabase.from("equity_initiative_deepdive").update({
      compiled_prompt: compiled,
      status: "concluida",
      completed_at: new Date().toISOString(),
    }).eq("id", (dd as any).id);

    return new Response(JSON.stringify({ ok: true, compiled_prompt: compiled }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
