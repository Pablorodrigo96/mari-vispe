// Equity Planner — Gerador de Carta-Convite ao Comprador-Alvo
// Usa o contexto do assessment + buyer escolhido para gerar uma carta de aproximação
// (NDA-friendly, blind) que o advisor/cliente pode copiar e enviar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAnthropic } from "../_shared/anthropicGateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `Você é redator sênior de cartas-convite blind (teaser approach letter) usadas por advisors M&A brasileiros para abrir conversa com compradores estratégicos/financeiros.

Regras inegociáveis:
- Mantenha a empresa-alvo ANÔNIMA. Use codinome ou "uma empresa que atendemos". Nunca cite razão social.
- Tom: institucional, direto, em português brasileiro, máx. 220 palavras.
- Estrutura: (1) abertura curta · (2) por que o comprador é fit (1-2 frases ancoradas em sinergias reais) · (3) números-âncora cegos (faixa de receita, EBITDA normalizado em faixa, múltiplo da faixa do setor) · (4) próximo passo (call de 30min sob NDA).
- Foque no racional de prêmio e em 1-2 sinergias mais relevantes para o perfil do comprador.
- Nunca invente: se um dado não foi informado, omita.
- Devolva APENAS texto plano em markdown leve (negrito, parágrafos), pronto para colar em e-mail/WhatsApp.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { assessmentId, buyerId } = await req.json();
    if (!assessmentId || !buyerId) {
      return new Response(JSON.stringify({ error: "assessmentId and buyerId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const [{ data: assess }, { data: buyer }] = await Promise.all([
      supabase.from("equity_assessments")
        .select("id, user_id, arquetipo_id, ipe_composto, summary, raw_intake")
        .eq("id", assessmentId).single(),
      supabase.from("equity_buyer_map").select("*").eq("id", buyerId).single(),
    ]);
    if (!assess) throw new Error("assessment not found");
    if (!buyer) throw new Error("buyer not found");

    const { data: val } = await supabase.from("equity_valuations")
      .select("ebitda_normalizado, multiplo_aplicado, faixa_min, faixa_max, valor_atual")
      .eq("assessment_id", assessmentId).maybeSingle();

    const intake: any = (assess as any).raw_intake || {};
    const setor = intake.setor || intake.sector || "—";
    const uf = intake.uf || intake.state || "BR";

    const prompt = `EMPRESA-ALVO (cegada):
- Arquétipo: ${(assess as any).arquetipo_id}
- Setor declarado: ${setor} · UF: ${uf}
- Receita anual aprox.: ${intake.receita_anual || intake.faturamento_anual || "—"}
- EBITDA normalizado (faixa): ${val?.ebitda_normalizado || "—"}
- Múltiplo de setor (faixa): ${val?.faixa_min}x — ${val?.faixa_max}x (hoje em ${val?.multiplo_aplicado}x)
- IPE atual: ${(assess as any).ipe_composto}/100
- Resumo executivo: ${(assess as any).summary || "—"}

COMPRADOR-ALVO:
- Arquétipo: ${(buyer as any).arquetipo_comprador}
- Nome/Perfil: ${(buyer as any).nome_alvo || "perfil genérico"}
- Setor-alvo: ${(buyer as any).setor_alvo || "—"}
- Tese: ${(buyer as any).tese_aquisicao || "—"}
- Sinergias-chave: ${((buyer as any).sinergias || []).join(" · ")}
- Racional do prêmio: ${(buyer as any).racional_premio || "—"}
- Prêmio estimado: ${(buyer as any).premio_estimado_pct}% sobre o múltiplo base

Gere a carta-convite blind agora. Assine como "Equipe Mari M&A" no fechamento.`;

    const ai = await callAnthropic({
      model: "claude-haiku-4-5",
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 700,
      temperature: 0.5,
      function_name: "equity-planner-buyer-letter",
      feature: "equity_planner",
      user_id: (assess as any).user_id,
    });

    const carta = ai.text.trim();

    await supabase.from("equity_buyer_map")
      .update({ carta_convite: carta })
      .eq("id", buyerId);

    return new Response(JSON.stringify({ ok: true, carta, provider: ai.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[equity-planner-buyer-letter]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
