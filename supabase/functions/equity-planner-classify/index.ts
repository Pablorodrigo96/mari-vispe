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
Sua tarefa: dado o intake (texto livre e/ou auto-avaliação) de uma PME, identificar o ARQUÉTIPO DE MODELO DE NEGÓCIO atual e, OBRIGATORIAMENTE para arquétipos de baixa liquidez (servico_profissional, projeto_obra), apontar a MIGRAÇÃO DE MODELO mais valiosa.

Setor é metadado — o que importa é o modelo econômico:
- servico_profissional: people-based, hora-homem, projeto sob demanda, dependência do dono típica (consultoria, advocacia, agência, contabilidade) — BAIXA LIQUIDEZ
- projeto_obra: receita lumpy por contrato/obra, capital de giro pesado (construtora, integrador em modelo projeto, engenharia) — BAIXA LIQUIDEZ
- recorrente: MRR/ARR, contratos mensais, churn como métrica-chave (SaaS, MSP, manutenção contratada, mensalidade) — ALTA LIQUIDEZ

REGRAS DURAS:
- Se arquetipo_id ∈ {servico_profissional, projeto_obra}, "migracao_sugerida" é OBRIGATÓRIO (não pode ser null) — escolha a melhor rota das ROTAS DE MIGRAÇÃO disponíveis.
- "vendabilidade_atual" é SEMPRE obrigatório, com nota 0-100 honesta (consultoria pura ~30-40, projeto obra ~35-45, recorrente saudável 65+) e 3-5 obstáculos concretos.
- Devolva APENAS JSON estrito sem markdown.`;

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
  "vendabilidade_atual": {
    "nota_0_100": 0,
    "motivo_baixa_liquidez": "1-2 frases sobre por que essa empresa é (ou não) líquida hoje no mercado de M&A",
    "principais_obstaculos": ["3 a 5 obstáculos concretos que travam a venda dessa empresa específica"]
  },
  "migracao_sugerida": {
    "rota_id": "uuid da rota acima (OBRIGATÓRIO p/ servico_profissional/projeto_obra)",
    "para_arquetipo_id": "id do arquétipo destino",
    "racional": "por que essa migração é a maior alavanca de valor desta empresa em específico",
    "viabilidade": "alta|media|baixa",
    "bloqueadores": ["3 bloqueadores concretos para essa migração nesta empresa"]
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

    // Robust JSON extraction — Gemini fallback sometimes wraps with markdown
    // or returns trailing prose. Extract the first balanced { ... } block.
    let parsed: any;
    try {
      const raw = (ai.text || "").trim();
      // strip ```json fences if present
      const stripped = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      let jsonStr = stripped;
      const firstBrace = stripped.indexOf("{");
      if (firstBrace >= 0) {
        let depth = 0;
        let inStr = false;
        let esc = false;
        let end = -1;
        for (let i = firstBrace; i < stripped.length; i++) {
          const ch = stripped[i];
          if (inStr) {
            if (esc) { esc = false; continue; }
            if (ch === "\\") { esc = true; continue; }
            if (ch === '"') inStr = false;
            continue;
          }
          if (ch === '"') { inStr = true; continue; }
          if (ch === "{") depth++;
          else if (ch === "}") {
            depth--;
            if (depth === 0) { end = i; break; }
          }
        }
        if (end > firstBrace) jsonStr = stripped.slice(firstBrace, end + 1);
      }
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        // Repair: trailing commas, smart quotes, control chars
        const repaired = jsonStr
          .replace(/,\s*([}\]])/g, "$1")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\x00-\x1F]+/g, " ");
        parsed = JSON.parse(repaired);
      }
    } catch (e) {
      // Fallback soft: classificação default p/ não travar o wizard.
      // NÃO retorna aqui — segue para o bloco de enforcement abaixo
      // para popular vendabilidade_atual e migracao_sugerida via defaults.
      console.warn("[equity-planner-classify] invalid_json:", (e as Error).message, "head:", (ai.text || "").slice(0, 200));
      parsed = {
        arquetipo_id: "servico_profissional",
        confianca: 0.4,
        racional: "Classificação automática indisponível — usando default conservador. O compute refinará no próximo passo.",
        migracao_sugerida: null,
        _fallback: true,
      };
    }

    // ENFORCEMENT: garante vendabilidade_atual e migracao_sugerida p/ arquétipos ilíquidos
    const ILIQUIDOS = new Set(["servico_profissional", "projeto_obra"]);
    const VENDABILIDADE_DEFAULT: Record<string, any> = {
      servico_profissional: {
        nota_0_100: 35,
        motivo_baixa_liquidez: "Empresa de serviço profissional sem recorrência: receita depende de horas-homem e da figura do dono, o que afasta o investidor estratégico.",
        principais_obstaculos: [
          "Dono é o principal entregador e vendedor",
          "Receita projeto-a-projeto sem previsibilidade",
          "Metodologia não documentada/transferível",
          "Time difícil de reter sem o dono",
          "Margem espremida por hora-homem"
        ]
      },
      projeto_obra: {
        nota_0_100: 40,
        motivo_baixa_liquidez: "Receita lumpy por contrato/obra, capital de giro pesado e dependência de relacionamentos do dono — comprador estratégico pondera caixa, não múltiplo cheio.",
        principais_obstaculos: [
          "Backlog volátil e não-recorrente",
          "Capital de giro alto e variável",
          "Concentração em poucos clientes/contratos",
          "Sem linha de serviços contratados pós-obra",
          "Margens sensíveis a custos de insumos"
        ]
      },
      recorrente: {
        nota_0_100: 65,
        motivo_baixa_liquidez: "Modelo recorrente já é atrativo no M&A — o gap está em escala, churn e governança para arrancar prêmio máximo.",
        principais_obstaculos: [
          "Churn ainda não controlado",
          "Governança/financeiro abaixo de DD",
          "Concentração de receita em poucos clientes"
        ]
      }
    };
    if (!parsed.vendabilidade_atual || typeof parsed.vendabilidade_atual !== "object") {
      parsed.vendabilidade_atual = VENDABILIDADE_DEFAULT[parsed.arquetipo_id] || VENDABILIDADE_DEFAULT.servico_profissional;
    }
    if (ILIQUIDOS.has(parsed.arquetipo_id) && (!parsed.migracao_sugerida || !parsed.migracao_sugerida.para_arquetipo_id)) {
      // pega 1a rota disponível para esse arquétipo de origem (prioriza para recorrente)
      const rotas = (migrations || []).filter((m: any) => m.de_arquetipo_id === parsed.arquetipo_id);
      const rota = rotas.find((r: any) => r.para_arquetipo_id === "recorrente") || rotas[0];
      if (rota) {
        parsed.migracao_sugerida = {
          rota_id: rota.id,
          para_arquetipo_id: rota.para_arquetipo_id,
          racional: rota.descricao_rota,
          viabilidade: "media",
          bloqueadores: rota.bloqueadores || [],
        };
      }
    }
    if (parsed.migracao_sugerida && !parsed.migracao_sugerida.bloqueadores?.length) {
      const rota = (migrations || []).find((m: any) => m.id === parsed.migracao_sugerida.rota_id);
      parsed.migracao_sugerida.bloqueadores = rota?.bloqueadores || [];
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
