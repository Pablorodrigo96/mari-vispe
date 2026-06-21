// Equity Planner — orquestrador único de cálculo
// Recebe intake (wizard ou colagem de reunião) + companyData
// Devolve: arquétipo, scores nas 12 dimensões, IPE, valuation, value bridge,
// iniciativas priorizadas e buyer map. Persiste tudo em uma transação lógica.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAnthropic } from "../_shared/anthropicGateway.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DIMENSOES = [
  "independencia_dono","qualidade_receita","margem","higiene_financeira",
  "concentracao","motor_comercial","gestao","processos","contingencias",
  "narrativa","atratividade","societario",
];

const DIM_LABELS: Record<string,string> = {
  independencia_dono: "Independência do dono",
  qualidade_receita: "Qualidade da receita",
  margem: "Saúde e tendência de margem",
  higiene_financeira: "Higiene financeira e transparência",
  concentracao: "Concentração (cliente/fornecedor)",
  motor_comercial: "Motor comercial",
  gestao: "Profundidade de gestão",
  processos: "Processos e sistemas",
  contingencias: "Contingências (jur/trib/trab)",
  narrativa: "Narrativa de crescimento e TAM",
  atratividade: "Atratividade estratégica",
  societario: "Estrutura societária",
};

const SYSTEM = `Você é o orquestrador de um motor de Equity Planner para PMEs brasileiras.
Sua missão: a partir do intake do empresário (texto livre + respostas estruturadas), de uma CLASSIFICAÇÃO DE ARQUÉTIPO já feita por um classificador especialista, e dos arquétipos/comps/biblioteca fornecidos, devolver um JSON estrito com:
1) scores nas 12 dimensões (0..100) com 1 evidência cada;
2) ebitda_normalizado em reais (estime addbacks declarados; se faltar dado, use a melhor estimativa marcada como premissa);
3) iniciativas (8 a 12) priorizadas em sprints (1..4) cobrindo 12 meses, cada uma com delta_ipe e delta_valor em reais — ANCORE em itens do PLAYBOOK quando possível, e marque library_id; iniciativas custom só com justificativa;
4) buyer_map (3 entradas, uma por arquétipo de comprador) com tese e premio_estimado_pct (0..30);
5) veredito_liquidez calibrado: vendavel_hoje (IPE>=75 sem killers), vendavel_6_12m (IPE 60-75), vendavel_12_24m (IPE 45-60), inviavel_sem_reestruturacao (IPE<45 ou killers críticos);
6) summary em 2-3 frases pro dono.

REGRAS DURAS:
- O ARQUÉTIPO já foi decidido pelo classificador. Não troque.
- Se a classificação inclui migracao_arquetipo_sugerida, GARANTA uma iniciativa tipo "migracao_arquetipo" no SPRINT 1 com delta_valor significativo (use delta_multiplo_esperado × ebitda).
- Ordem de execução respeita "DE-RISKING ANTES DE CRESCIMENTO": dimensões independencia_dono, higiene_financeira, contingencias vêm nos sprints 1-2; narrativa/atratividade/motor_comercial nos sprints 3-4.
- Todo número ancora em algo do intake; quando faltar, marque "premissa" na evidência.
- Linguagem pt-BR, tom de sócio de M&A direto. NÃO invente CNPJ, nomes de empresas reais ou múltiplos fora da faixa.
- Devolva APENAS o JSON, sem markdown.`;

function buildPrompt(args: {
  companyData: any;
  intakeText: string;
  classification: any;
  archetypes: any[];
  comps: any[];
  library: any[];
  migrations: any[];
}) {
  return `INTAKE_TEXTO_LIVRE:
"""
${args.intakeText}
"""

EMPRESA (declarada):
${JSON.stringify(args.companyData, null, 2)}

CLASSIFICACAO_ARQUETIPO (já decidida — use como verdade):
${JSON.stringify(args.classification || {}, null, 2)}

ARQUETIPOS_DISPONIVEIS:
${JSON.stringify(args.archetypes.map(a => ({
  id: a.id, nome: a.nome, descricao: a.descricao,
  exemplos: a.exemplos_setor, faixa_multiplo: [a.faixa_multiplo_min, a.faixa_multiplo_max],
  pesos: a.pesos_dimensoes, killers: a.killers,
})), null, 2)}

COMPS_BENCHMARKS:
${JSON.stringify(args.comps, null, 2)}

PLAYBOOK_INICIATIVAS (use library_id quando ancorar):
${JSON.stringify(args.library.map(i => ({
  library_id: i.id, arquetipo: i.arquetipo_id, dim: i.dimensao, titulo: i.titulo,
  descricao: i.descricao, delta_ipe: i.delta_ipe_padrao, esforco: i.esforco,
  prazo: i.prazo_meses, tipo: i.tipo,
})), null, 2)}

ROTAS_MIGRACAO_DISPONIVEIS:
${JSON.stringify(args.migrations, null, 2)}

Devolva um JSON com a forma:
{
  "dimensoes": [
    { "dimensao": "independencia_dono", "score": 0, "evidencia": "string", "premissa": false }
  ],
  "ebitda_normalizado": 0,
  "addbacks": { "remuneracao_dono": 0, "despesas_pessoais": 0, "nao_recorrentes": 0 },
  "premissas_valuation": ["string"],
  "veredito_liquidez": "vendavel_hoje|vendavel_6_12m|vendavel_12_24m|inviavel_sem_reestruturacao",
  "summary": "2-3 frases para o dono",
  "iniciativas": [
    {
      "library_id": null,
      "titulo":"string","descricao":"string","dimensao_alvo":"independencia_dono",
      "delta_ipe": 0, "delta_valor": 0, "esforco":"baixo|medio|alto",
      "prazo_meses": 3, "sprint": 1, "tipo":"execucao|derisk|migracao_arquetipo",
      "custom_justificativa": null
    }
  ],
  "buyer_map": [
    {"arquetipo_comprador":"estrategico|financeiro|individual","tese_aquisicao":"string","premio_estimado_pct": 0, "nome_alvo":"perfil generico"}
  ]
}`;
}

function sigmoid(x: number) { return 1 / (1 + Math.exp(-x)); }

function curva(ipe: number, piso: number) {
  if (ipe < piso) {
    // zona invendável: posiciona no fundo da faixa
    return Math.max(0, (ipe / piso) * 0.15);
  }
  // sigmoide centrada em 70
  return Math.min(1, sigmoid((ipe - 70) / 10) * 0.95 + 0.05);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { assessmentId, intakeText, companyData } = body || {};
    if (!assessmentId) {
      return new Response(JSON.stringify({ error: "assessmentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Confirmar assessment + carregar dono + classificação
    const { data: assess, error: aErr } = await supabase
      .from("equity_assessments")
      .select("id, user_id, company_id, archetype_classification, arquetipo_sugerido, migracao_arquetipo_sugerida")
      .eq("id", assessmentId)
      .single();
    if (aErr || !assess) throw new Error("assessment not found");

    // 1.5) Se ainda não foi classificado, chamar classifier inline
    let classification = (assess as any).archetype_classification;
    if (!classification) {
      const classifyRes = await fetch(`${SUPABASE_URL}/functions/v1/equity-planner-classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ assessmentId, intakeText, companyData }),
      });
      const cj = await classifyRes.json();
      classification = cj.classification || { arquetipo_id: "servico_profissional", confianca: 0.4 };
    }
    const arqId = classification.arquetipo_id || (assess as any).arquetipo_sugerido || "servico_profissional";

    // 2) Carregar arquétipos + comps + library + migrations + documentos extraídos
    const [{ data: archetypes }, { data: comps }, { data: library }, { data: migrations }, { data: docs }] = await Promise.all([
      supabase.from("equity_archetypes").select("*").order("ordem"),
      supabase.from("equity_comps_benchmarks").select("*"),
      supabase.from("equity_initiative_library").select("*").eq("arquetipo_id", arqId),
      supabase.from("equity_archetype_migrations").select("*").eq("de_arquetipo_id", arqId),
      supabase.from("equity_company_documents")
        .select("file_name, doc_type, extraction_summary, extracted_json")
        .eq("assessment_id", assessmentId)
        .eq("extraction_status", "done"),
    ]);

    // Enriquecer intakeText com resumos de documentos extraídos (verdade documental)
    const docContext = (docs || []).length
      ? "\n\n=== DOCUMENTOS EXTRAÍDOS PELA IA (sobrepõem declarações verbais) ===\n" +
        (docs || []).map((d: any) =>
          `[${d.doc_type || "doc"}] ${d.file_name}: ${d.extraction_summary || ""}\nFatos: ${JSON.stringify(d.extracted_json?.financeiro || {})}; Governança: ${JSON.stringify(d.extracted_json?.governanca || {})}; Sinais: ${(d.extracted_json?.sinais_qualitativos || []).join(" · ")}`
        ).join("\n\n")
      : "";

    // 3) Chamar Claude
    const prompt = buildPrompt({
      companyData, intakeText: (intakeText || "") + docContext,
      classification,
      archetypes: archetypes || [], comps: comps || [], library: library || [],
      migrations: migrations || [],
    });

    const ai = await callAnthropic({
      model: "claude-sonnet-4-6",
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4500,
      temperature: 0.3,
      function_name: "equity-planner-compute",
      feature: "equity_planner",
      user_id: assess.user_id,
    });

    // Extrair JSON
    let parsed: any;
    try {
      const txt = ai.text.trim();
      const jsonStr = txt.startsWith("{") ? txt : txt.replace(/^```json\s*|\s*```$/g, "");
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error("ai_invalid_json: " + (e as Error).message);
    }

    // 4) Calcular IPE composto (arqId já vem da classificação)
    const arq = (archetypes || []).find((a: any) => a.id === arqId) || (archetypes || [])[0];
    const pesos: Record<string, number> = arq?.pesos_dimensoes || {};
    let ipe = 0; let pesoTotal = 0;
    const dimRows: any[] = [];
    for (const d of DIMENSOES) {
      const found = (parsed.dimensoes || []).find((x: any) => x.dimensao === d);
      const score = Math.max(0, Math.min(100, Number(found?.score ?? 50)));
      const peso = Number(pesos[d] ?? (1 / DIMENSOES.length));
      ipe += score * peso; pesoTotal += peso;
      dimRows.push({
        assessment_id: assessmentId,
        dimensao: d,
        score: Math.round(score),
        peso,
        evidencias: found?.evidencia ? [{ texto: found.evidencia, premissa: !!found.premissa }] : [],
      });
    }
    const ipeFinal = pesoTotal > 0 ? Math.round(ipe / pesoTotal) : 0;

    // Marcar top 5 destruidores (menor score × maior peso)
    const ranked = [...dimRows].sort((a, b) =>
      ((100 - a.score) * a.peso) > ((100 - b.score) * b.peso) ? -1 : 1
    );
    for (let i = 0; i < Math.min(5, ranked.length); i++) ranked[i].destruidor_top = true;

    // 5) Valuation por múltiplos
    const porte = (companyData?.porte as string) || "pequena";
    const comp = (comps || []).find((c: any) => c.arquetipo_id === arqId && c.porte === porte)
              || { multiplo_min: arq.faixa_multiplo_min, multiplo_max: arq.faixa_multiplo_max };
    const ebitda = Math.max(0, Number(parsed.ebitda_normalizado ?? 0));
    const piso = arq?.piso_liquidez ?? 45;
    const pos = curva(ipeFinal, piso);
    const multiploAtual = Number((comp.multiplo_min + (comp.multiplo_max - comp.multiplo_min) * pos).toFixed(2));
    const valorAtual = Math.round(ebitda * multiploAtual);

    // Valor alvo: assume IPE alvo = 85 + prêmio estratégico médio dos buyer_map
    const ipeAlvo = 85;
    const posAlvo = curva(ipeAlvo, piso);
    const multiploAlvo = Number((comp.multiplo_min + (comp.multiplo_max - comp.multiplo_min) * posAlvo).toFixed(2));
    const premioMedio = (parsed.buyer_map || []).reduce((s: number, b: any) => s + (Number(b.premio_estimado_pct) || 0), 0)
      / Math.max(1, (parsed.buyer_map || []).length);
    // Estimativa de Δ lucro: soma dos delta_valor de iniciativas com dimensao margem/qualidade_receita
    const deltaLucroIniciativas = (parsed.iniciativas || [])
      .filter((i: any) => ["margem","qualidade_receita"].includes(i.dimensao_alvo))
      .reduce((s: number, i: any) => s + (Number(i.delta_valor) || 0), 0);
    const ebitdaAlvo = ebitda + deltaLucroIniciativas / Math.max(1, multiploAlvo);
    const valorAlvoBase = Math.round(ebitdaAlvo * multiploAlvo);
    const valorAlvo = Math.round(valorAlvoBase * (1 + premioMedio / 100));

    const deltaMultiplo = Math.round((multiploAlvo - multiploAtual) * ebitda);
    const deltaLucro = Math.round(deltaLucroIniciativas);
    const deltaCrescimento = Math.max(0, Math.round((valorAlvoBase - valorAtual) * 0.15));
    const premioEstrategico = Math.max(0, valorAlvo - valorAlvoBase);

    // 6) Persistir tudo
    // limpar prévios
    await supabase.from("equity_dimension_scores").delete().eq("assessment_id", assessmentId);
    await supabase.from("equity_initiatives").delete().eq("assessment_id", assessmentId);
    await supabase.from("equity_buyer_map").delete().eq("assessment_id", assessmentId);
    const { data: prevVals } = await supabase.from("equity_valuations").select("id").eq("assessment_id", assessmentId);
    if (prevVals?.length) {
      const ids = prevVals.map((v: any) => v.id);
      await supabase.from("equity_value_bridge_items").delete().in("valuation_id", ids);
      await supabase.from("equity_valuations").delete().eq("assessment_id", assessmentId);
    }

    // dimensions
    await supabase.from("equity_dimension_scores").insert(dimRows);

    // valuation
    const { data: valIns, error: vErr } = await supabase.from("equity_valuations").insert({
      assessment_id: assessmentId,
      metodo: "multiplos",
      ebitda_normalizado: ebitda,
      addbacks: parsed.addbacks || {},
      multiplo_aplicado: multiploAtual,
      faixa_min: comp.multiplo_min,
      faixa_max: comp.multiplo_max,
      valor_atual: valorAtual,
      valor_alvo: valorAlvo,
      premissas: { premissas: parsed.premissas_valuation || [], ipe_alvo: ipeAlvo, multiplo_alvo: multiploAlvo, porte },
    }).select("id").single();
    if (vErr) throw vErr;

    // bridge
    await supabase.from("equity_value_bridge_items").insert([
      { valuation_id: valIns.id, parcela: "valor_hoje", descricao: `EBITDA normalizado × ${multiploAtual}x`, delta_valor: valorAtual, ordem: 0 },
      { valuation_id: valIns.id, parcela: "delta_lucro", descricao: "Ganhos de margem e receita das iniciativas", delta_valor: deltaLucro, ordem: 1 },
      { valuation_id: valIns.id, parcela: "delta_multiplo", descricao: `IPE ${ipeFinal} → ${ipeAlvo} eleva o múltiplo`, delta_valor: deltaMultiplo, ordem: 2 },
      { valuation_id: valIns.id, parcela: "delta_crescimento", descricao: "Prêmio por trajetória de crescimento crível", delta_valor: deltaCrescimento, ordem: 3 },
      { valuation_id: valIns.id, parcela: "premio_estrategico", descricao: `Sinergia média de ${premioMedio.toFixed(0)}% capturada do comprador-alvo`, delta_valor: premioEstrategico, ordem: 4 },
      { valuation_id: valIns.id, parcela: "valor_alvo", descricao: "Valor potencial pós-execução do plano", delta_valor: valorAlvo, ordem: 5 },
    ]);

    // initiatives — força migração de arquétipo no topo se sugerida pelo classificador
    const migrSug = classification?.migracao_sugerida;
    let allInits: any[] = (parsed.iniciativas || []).slice();
    const hasMigracao = allInits.some((i: any) => i.tipo === "migracao_arquetipo");
    if (migrSug?.para_arquetipo_id && !hasMigracao) {
      const rota = (migrations || []).find((m: any) => m.para_arquetipo_id === migrSug.para_arquetipo_id);
      const deltaMult = Number(rota?.delta_multiplo_esperado || 2.5);
      allInits.unshift({
        library_id: null,
        titulo: rota?.titulo || `Migrar para ${migrSug.para_arquetipo_id}`,
        descricao: rota?.descricao_rota || migrSug.racional,
        dimensao_alvo: "qualidade_receita",
        delta_ipe: 15,
        delta_valor: Math.round(deltaMult * Math.max(0, ebitda)),
        esforco: "alto",
        prazo_meses: 9,
        sprint: 1,
        tipo: "migracao_arquetipo",
      });
    }

    // Priorização: derisk (independencia/higiene/contingencias) primeiro,
    // migração obrigatória no topo, depois execução por (delta_valor / esforco*prazo)
    const ESFORCO_W: Record<string, number> = { baixo: 1, medio: 2, alto: 3 };
    const DERISK_DIMS = new Set(["independencia_dono","higiene_financeira","contingencias"]);
    allInits.sort((a: any, b: any) => {
      const am = a.tipo === "migracao_arquetipo" ? 0 : 1;
      const bm = b.tipo === "migracao_arquetipo" ? 0 : 1;
      if (am !== bm) return am - bm;
      const ad = DERISK_DIMS.has(a.dimensao_alvo) ? 0 : 1;
      const bd = DERISK_DIMS.has(b.dimensao_alvo) ? 0 : 1;
      if (ad !== bd) return ad - bd;
      const ap = (Number(a.delta_valor) || 0) / ((ESFORCO_W[a.esforco] || 2) * Math.max(1, Number(a.prazo_meses) || 3));
      const bp = (Number(b.delta_valor) || 0) / ((ESFORCO_W[b.esforco] || 2) * Math.max(1, Number(b.prazo_meses) || 3));
      return bp - ap;
    });

    const inits = allInits.map((i: any, idx: number) => ({
      assessment_id: assessmentId,
      dimensao_alvo: DIMENSOES.includes(i.dimensao_alvo) ? i.dimensao_alvo : "independencia_dono",
      titulo: String(i.titulo || "Iniciativa"),
      descricao: i.descricao || null,
      delta_ipe: Math.max(0, Number(i.delta_ipe) || 0),
      delta_valor: Math.max(0, Number(i.delta_valor) || 0),
      esforco: ["baixo","medio","alto"].includes(i.esforco) ? i.esforco : "medio",
      prazo_meses: Math.max(1, Number(i.prazo_meses) || 3),
      sprint: Math.max(1, Math.min(4, Number(i.sprint) || (idx < 3 ? 1 : idx < 6 ? 2 : idx < 9 ? 3 : 4))),
      status: "planejada",
      tipo: ["execucao","derisk","migracao_arquetipo"].includes(i.tipo)
        ? i.tipo
        : (DERISK_DIMS.has(i.dimensao_alvo) ? "derisk" : "execucao"),
      prioridade: idx + 1,
    }));
    if (inits.length) await supabase.from("equity_initiatives").insert(inits);

    // buyer map
    const buyers = (parsed.buyer_map || []).slice(0, 5).map((b: any, idx: number) => ({
      assessment_id: assessmentId,
      arquetipo_comprador: ["estrategico","financeiro","individual"].includes(b.arquetipo_comprador) ? b.arquetipo_comprador : "estrategico",
      nome_alvo: b.nome_alvo || null,
      tese_aquisicao: b.tese_aquisicao || null,
      premio_estimado_pct: Math.max(0, Math.min(50, Number(b.premio_estimado_pct) || 0)),
      premio_estimado_valor: Math.round(valorAlvoBase * Math.max(0, Number(b.premio_estimado_pct) || 0) / 100),
      prioridade: idx + 1,
    }));
    if (buyers.length) await supabase.from("equity_buyer_map").insert(buyers);

    // veredito calibrado
    const vereditoCalc = ipeFinal >= 75 ? "vendavel_hoje"
                       : ipeFinal >= 60 ? "vendavel_6_12m"
                       : ipeFinal >= 45 ? "vendavel_12_24m"
                       : "inviavel_sem_reestruturacao";
    const veredito = parsed.veredito_liquidez || vereditoCalc;

    // update assessment + company arquetipo
    await supabase.from("equity_assessments").update({
      arquetipo_id: arqId,
      arquetipo_sugerido: arqId,
      confianca_arquetipo: Number(classification?.confianca) || null,
      ipe_composto: ipeFinal,
      veredito_liquidez: veredito,
      summary: parsed.summary || null,
      status: "computed",
    }).eq("id", assessmentId);

    await supabase.from("equity_companies").update({
      arquetipo_id: arqId,
    }).eq("id", assess.company_id);

    // progress log snapshot
    await supabase.from("equity_progress_log").insert({
      company_id: assess.company_id,
      assessment_id: assessmentId,
      ipe: ipeFinal,
      valor: valorAtual,
      evento: "compute",
    });

    return new Response(JSON.stringify({
      ok: true,
      assessment_id: assessmentId,
      ipe: ipeFinal,
      arquetipo_id: arqId,
      valor_atual: valorAtual,
      valor_alvo: valorAlvo,
      provider: ai.provider,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message || "unknown_error";
    console.error("[equity-planner-compute]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
