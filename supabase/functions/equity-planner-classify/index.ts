// Equity Planner — Classificador de Arquétipo
// Roda Claude Haiku sobre intake/meeting paste e retorna o arquétipo mais provável
// com confiança, justificativa e sinais detectados. Também sugere migração de arquétipo
// se houver uma rota de maior valor.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAnthropic } from "../_shared/anthropicGateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `Você é o Classificador de Arquétipo do Equity Planner.
Sua única tarefa: dado o intake (texto livre e/ou auto-avaliação) de uma PME, identificar o ARQUÉTIPO DE MODELO DE NEGÓCIO atual da empresa entre os disponíveis e, se existir, apontar uma MIGRAÇÃO DE ARQUÉTIPO que seria a maior alavanca de valor.

Setor é metadado — o que importa é o modelo econômico:
- servico_profissional: people-based, hora-homem, projeto sob demanda, dependência do dono típica (consultoria, advocacia, agência, contabilidade)
- projeto_obra: receita lumpy por contrato/obra, capital de giro pesado (construtora, integrador em modelo projeto, engenharia)
- recorrente: MRR/ARR, contratos mensais, churn como métrica-chave (SaaS, MSP, manutenção contratada, mensalidade)

Devolva APENAS JSON estrito sem markdown.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { assessmentId, intakeText, companyData } = await req.json();
    if (!assessmentId) {
      return new Response(JSON.stringify({ error: "assessmentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: assess } = await supabase
      .from("equity_assessments")
      .select("id, user_id")
      .eq("id", assessmentId)
      .single();
    if (!assess) throw new Error("assessment not found");

    const [{ data: archetypes }, { data: migrations }] = await Promise.all([
      supabase.from("equity_archetypes").select("id, nome, descricao, exemplos_setor, faixa_multiplo_min, faixa_multiplo_max, killers"),
      supabase.from("equity_archetype_migrations").select("*"),
    ]);

    const prompt = `INTAKE:
"""
${intakeText || ""}
"""

DADOS DECLARADOS:
${JSON.stringify(companyData || {}, null, 2)}

ARQUÉTIPOS DISPONÍVEIS:
${JSON.stringify(archetypes, null, 2)}

ROTAS DE MIGRAÇÃO CONHECIDAS:
${JSON.stringify(migrations, null, 2)}

Devolva JSON:
{
  "arquetipo_id": "servico_profissional|projeto_obra|recorrente",
  "confianca": 0.0,
  "justificativa": "1-2 frases explicando por quê",
  "sinais_detectados": ["string","string"],
  "migracao_sugerida": {
    "rota_id": null | "uuid da rota acima",
    "para_arquetipo_id": null | "id",
    "racional": "se aplicável, por que essa migração é a maior alavanca de valor desta empresa em específico",
    "viabilidade": "alta|media|baixa"
  } | null
}`;

    const ai = await callAnthropic({
      model: "claude-haiku-4-5",
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.2,
      function_name: "equity-planner-classify",
      feature: "equity_planner",
      user_id: assess.user_id,
    });

    let parsed: any;
    try {
      const txt = ai.text.trim();
      const jsonStr = txt.startsWith("{") ? txt : txt.replace(/^```json\s*|\s*```$/g, "");
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error("classifier_invalid_json: " + (e as Error).message);
    }

    // persist
    await supabase.from("equity_assessments").update({
      archetype_classification: parsed,
      arquetipo_sugerido: parsed.arquetipo_id,
      confianca_arquetipo: Number(parsed.confianca) || null,
      migracao_arquetipo_sugerida: parsed.migracao_sugerida || null,
    }).eq("id", assessmentId);

    return new Response(JSON.stringify({ ok: true, classification: parsed, provider: ai.provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[equity-planner-classify]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
