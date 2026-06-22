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
Sua missão: a partir do intake do empresário, da CLASSIFICAÇÃO DE ARQUÉTIPO já feita, e dos arquétipos/comps/biblioteca/perfis de comprador fornecidos, devolver um JSON estrito com:
1) scores nas 12 dimensões (0..100) com 1 evidência cada — OBRIGATÓRIO 12 itens;
2) ebitda_contabil e ebitda_normalizado em reais (use o ebitda declarado quando não houver melhor sinal — NUNCA devolva 0 se o usuário informou faturamento>0; estime margem típica do arquétipo se faltar), com addbacks DETALHADOS (remuneracao_dono, despesas_pessoais, nao_recorrentes, aluguel_imovel_proprio, outros);
3) iniciativas — OBRIGATÓRIO MÍNIMO 8, MÁXIMO 12, distribuídas em sprints 1..4 (pelo menos 1 por sprint), cada uma com delta_ipe (>0) e delta_valor (em R$, >0) — ANCORE em PLAYBOOK quando possível;
4) buyer_map — OBRIGATÓRIO MÍNIMO 3, MÁXIMO 5 entradas ANCORADAS nos perfis fornecidos (use perfil_id), com sinergias (3-5 strings), racional_premio (1-2 frases), exemplos_targets (3-5 nomes plausíveis); premio_estimado_pct dentro da faixa típica;
5) dcf_premissas: { wacc, cagr_5y, perpetuidade_g, taxa_imposto } — realistas para PME BR (WACC 15-25%, g 3-5%);
6) veredito_liquidez: vendavel_hoje (IPE>=75), vendavel_6_12m (60-75), vendavel_12_24m (45-60), inviavel_sem_reestruturacao (<45 ou killers) — OBRIGATÓRIO;
7) summary em 2-3 frases pro dono — OBRIGATÓRIO;
8) premissas_valuation: lista de 3-6 strings explicando as premissas usadas.

REGRAS DURAS:
- Não troque o arquétipo do classificador.
- Se houver migracao_sugerida, GARANTA iniciativa tipo "migracao_arquetipo" no SPRINT 1 com delta_valor = delta_multiplo_esperado × ebitda.
- "DE-RISKING ANTES DE CRESCIMENTO": independencia_dono/higiene_financeira/contingencias nos sprints 1-2.
- Buyer map: cada item espelha um perfil_id de PERFIS_COMPRADOR_DISPONIVEIS (adapte sinergias/exemplos quando faltar contexto).
- Não invente CNPJ ou múltiplos fora da faixa.
- Devolva APENAS o JSON, sem markdown, sem prosa antes ou depois.
- NUNCA devolva arrays vazios para iniciativas ou buyer_map. Se faltar dado, use defaults conservadores do PLAYBOOK e marque premissa=true nas dimensões correspondentes.`;

function buildPrompt(args: {
  companyData: any;
  intakeText: string;
  classification: any;
  archetypes: any[];
  comps: any[];
  library: any[];
  migrations: any[];
  buyerArchetypes: any[];
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

PERFIS_COMPRADOR_DISPONIVEIS (ancore buyer_map em perfil_id):
${JSON.stringify(args.buyerArchetypes.map(b => ({
  perfil_id: b.id, arquetipo: b.arquetipo_comprador, nome: b.nome_perfil,
  setor: b.setor_alvo, tese: b.tese_padrao,
  premio_pct: [b.premio_tipico_min, b.premio_tipico_max],
  sinergias: b.sinergias_padrao, exemplos: b.exemplos_targets,
})), null, 2)}

Devolva um JSON com a forma:
{
  "dimensoes": [{ "dimensao": "independencia_dono", "score": 0, "evidencia": "string", "premissa": false }],
  "ebitda_contabil": 0,
  "ebitda_normalizado": 0,
  "addbacks": { "remuneracao_dono": 0, "despesas_pessoais": 0, "nao_recorrentes": 0, "aluguel_imovel_proprio": 0, "outros": 0 },
  "dcf_premissas": { "wacc": 0.20, "cagr_5y": 0.12, "perpetuidade_g": 0.04, "taxa_imposto": 0.27 },
  "premissas_valuation": ["string"],
  "veredito_liquidez": "vendavel_hoje|vendavel_6_12m|vendavel_12_24m|inviavel_sem_reestruturacao",
  "summary": "2-3 frases para o dono",
  "iniciativas": [
    { "library_id": null, "titulo":"string","descricao":"string","dimensao_alvo":"independencia_dono",
      "delta_ipe": 0, "delta_valor": 0, "esforco":"baixo|medio|alto",
      "prazo_meses": 3, "sprint": 1, "tipo":"execucao|derisk|migracao_arquetipo", "custom_justificativa": null }
  ],
  "buyer_map": [
    { "perfil_id": "uuid_do_perfil",
      "arquetipo_comprador":"estrategico|financeiro|individual",
      "tese_aquisicao":"string", "racional_premio":"string",
      "premio_estimado_pct": 0, "nome_alvo":"perfil ou descricao",
      "setor_alvo":"string", "sinergias":["s1","s2"], "exemplos_targets":["nome1","nome2"] }
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
      // Sem classificação prévia: usa default rápido (NÃO chama classify inline p/ não estourar 150s)
      classification = { arquetipo_id: (assess as any).arquetipo_sugerido || "servico_profissional", confianca: 0.4, _fallback: true };
    }
    const arqId = classification.arquetipo_id || (assess as any).arquetipo_sugerido || "servico_profissional";

    // 2) Carregar arquétipos + comps + library + migrations + buyer archetypes + documentos extraídos
    const [{ data: archetypes }, { data: comps }, { data: library }, { data: migrations }, { data: buyerArchs }, { data: docs }] = await Promise.all([
      supabase.from("equity_archetypes").select("*").order("ordem"),
      supabase.from("equity_comps_benchmarks").select("*"),
      supabase.from("equity_initiative_library").select("*").eq("arquetipo_id", arqId),
      supabase.from("equity_archetype_migrations").select("*").eq("de_arquetipo_id", arqId),
      supabase.from("equity_buyer_archetypes").select("*").eq("seller_arquetipo_id", arqId),
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
      migrations: migrations || [], buyerArchetypes: buyerArchs || [],
    });

    // Extrator JSON robusto
    function extractJson(raw: string): any {
      let s = (raw || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const first = s.indexOf("{");
      if (first === -1) throw new Error("no_json_object");
      let depth = 0, end = -1, inStr = false, esc = false;
      for (let i = first; i < s.length; i++) {
        const ch = s[i];
        if (inStr) {
          if (esc) esc = false;
          else if (ch === "\\") esc = true;
          else if (ch === '"') inStr = false;
        } else {
          if (ch === '"') inStr = true;
          else if (ch === "{") depth++;
          else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
        }
      }
      let candidate = end > first ? s.slice(first, end + 1) : s.slice(first);
      try { return JSON.parse(candidate); } catch {}
      const repaired = candidate
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/:\s*NaN\b/g, ": null")
        .replace(/:\s*Infinity\b/g, ": null")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]+/g, " ");
      return JSON.parse(repaired);
    }

    function validateParsed(p: any): { ok: boolean; reason?: string } {
      if (!p || typeof p !== "object") return { ok: false, reason: "not_object" };
      const dims = Array.isArray(p.dimensoes) ? p.dimensoes : [];
      const inits = Array.isArray(p.iniciativas) ? p.iniciativas : [];
      const buyers = Array.isArray(p.buyer_map) ? p.buyer_map : [];
      if (dims.length < 8) return { ok: false, reason: `dimensoes_curtas:${dims.length}` };
      if (inits.length < 4) return { ok: false, reason: `iniciativas_curtas:${inits.length}` };
      if (buyers.length < 2) return { ok: false, reason: `buyers_curtos:${buyers.length}` };
      return { ok: true };
    }

    function defaultParsed(reason: string) {
      const faturamento = Number(companyData?.faturamento) || 0;
      const ebitdaDeclarado = Number(companyData?.ebitda) || 0;
      const ebitdaBase = Math.max(ebitdaDeclarado, faturamento > 0 ? Math.round(faturamento * 0.15) : 120000);
      const dimBase: Record<string, number> = {
        independencia_dono: 48, qualidade_receita: 58, margem: 56, higiene_financeira: 50,
        concentracao: 52, motor_comercial: 54, gestao: 50, processos: 49, contingencias: 55,
        narrativa: 57, atratividade: 60, societario: 53,
      };
      const dimensoes = DIMENSOES.map((d) => ({
        dimensao: d,
        score: dimBase[d] ?? 52,
        evidencia: `Diagnóstico estimado por heurística Mari porque a resposta da IA veio inválida (${reason}).`,
        premissa: true,
      }));
      const lib = Array.isArray(library) ? library : [];
      const fallbackTitles = [
        ["Reduzir dependência do dono", "Documentar decisões-chave, delegar rotinas críticas e criar rituais de gestão semanal.", "independencia_dono", "derisk", 1],
        ["Organizar demonstrações financeiras", "Padronizar DRE gerencial, conciliação mensal e pacote financeiro auditável.", "higiene_financeira", "derisk", 1],
        ["Mapear contingências prioritárias", "Levantar riscos trabalhistas, tributários e contratuais com plano de mitigação.", "contingencias", "derisk", 1],
        ["Formalizar motor comercial", "Criar funil, metas por etapa, cadência de prospecção e taxa de conversão por canal.", "motor_comercial", "execucao", 2],
        ["Melhorar qualidade da receita", "Aumentar contratos recorrentes, retenção e previsibilidade do faturamento.", "qualidade_receita", "execucao", 2],
        ["Elevar margem operacional", "Reprecificar ofertas, revisar custos diretos e eliminar serviços de baixa contribuição.", "margem", "execucao", 3],
        ["Implantar processos replicáveis", "Transformar conhecimento tácito em playbooks operacionais e indicadores por área.", "processos", "execucao", 3],
        ["Construir narrativa de equity story", "Consolidar tese de crescimento, mercado endereçável e diferenciais defensáveis.", "narrativa", "execucao", 4],
      ];
      const iniciativas = fallbackTitles.map(([titulo, descricao, dim, tipo, sprint], idx) => {
        const anchor = lib.find((i: any) => i.dimensao === dim) || lib[idx];
        return {
          library_id: anchor?.id || null,
          titulo: anchor?.titulo || titulo,
          descricao: anchor?.descricao || descricao,
          dimensao_alvo: dim,
          delta_ipe: Math.max(4, Number(anchor?.delta_ipe_padrao) || (idx < 3 ? 7 : 5)),
          delta_valor: Math.round(ebitdaBase * (idx < 3 ? 0.35 : 0.25)),
          esforco: anchor?.esforco || (idx < 3 ? "medio" : "alto"),
          prazo_meses: Number(anchor?.prazo_meses) || (idx < 3 ? 3 : 6),
          sprint,
          tipo,
          custom_justificativa: "Fallback determinístico usado para manter o relatório acionável.",
        };
      });
      const buyerDefaults = (Array.isArray(buyerArchs) && buyerArchs.length ? buyerArchs.slice(0, 5) : [
        { id: null, arquetipo_comprador: "estrategico", nome_perfil: "Comprador estratégico setorial", setor_alvo: companyData?.setor || "setor relacionado", tese_padrao: "Consolidação regional e captura de sinergias comerciais.", premio_tipico_min: 8, premio_tipico_max: 18, sinergias_padrao: ["base de clientes", "cross-sell", "ganho de escala"], exemplos_targets: ["Grupo estratégico regional", "concorrente consolidado", "operador adjacente"] },
        { id: null, arquetipo_comprador: "financeiro", nome_perfil: "Investidor financeiro de PME", setor_alvo: "PMEs rentáveis", tese_padrao: "Compra com profissionalização, governança e expansão orgânica.", premio_tipico_min: 5, premio_tipico_max: 12, sinergias_padrao: ["governança", "margem", "processos"], exemplos_targets: ["search fund", "family office", "holding de investimentos"] },
        { id: null, arquetipo_comprador: "individual", nome_perfil: "Executivo comprador", setor_alvo: "negócios operáveis", tese_padrao: "Aquisição por operador com experiência no setor.", premio_tipico_min: 0, premio_tipico_max: 8, sinergias_padrao: ["sucessão", "operação direta", "relacionamento local"], exemplos_targets: ["executivo do setor", "empreendedor serial", "operador regional"] },
      ]).slice(0, 5);
      const buyer_map = buyerDefaults.map((b: any) => ({
        perfil_id: b.id || null,
        arquetipo_comprador: b.arquetipo_comprador || "estrategico",
        tese_aquisicao: b.tese_padrao || "Aquisição com tese de sinergia e profissionalização.",
        racional_premio: "Prêmio estimado condicionado à redução de riscos e melhoria da previsibilidade financeira.",
        premio_estimado_pct: Math.round(((Number(b.premio_tipico_min) || 5) + (Number(b.premio_tipico_max) || 15)) / 2),
        nome_alvo: b.nome_perfil || "Comprador estratégico",
        setor_alvo: b.setor_alvo || companyData?.setor || "setor relacionado",
        sinergias: b.sinergias_padrao || ["escala", "cross-sell", "profissionalização"],
        exemplos_targets: b.exemplos_targets || ["comprador estratégico", "holding setorial", "investidor financeiro"],
      }));
      return {
        dimensoes,
        ebitda_contabil: ebitdaDeclarado || Math.round(ebitdaBase * 0.85),
        ebitda_normalizado: ebitdaBase,
        addbacks: { remuneracao_dono: Math.round(ebitdaBase * 0.10), despesas_pessoais: 0, nao_recorrentes: 0, aluguel_imovel_proprio: 0, outros: 0 },
        dcf_premissas: { wacc: 0.20, cagr_5y: 0.10, perpetuidade_g: 0.04, taxa_imposto: 0.27 },
        premissas_valuation: ["Resposta da IA indisponível; relatório gerado por heurística conservadora Mari.", "EBITDA estimado por dado declarado ou 15% do faturamento quando ausente.", "Prêmios de compradores usam perfis cadastrados e faixas médias."],
        veredito_liquidez: "vendavel_12_24m",
        summary: "O diagnóstico foi gerado com premissas conservadoras porque a IA devolveu JSON inválido. Ainda assim, o plano prioriza redução de risco, melhoria de previsibilidade e preparação para compradores estratégicos.",
        iniciativas,
        buyer_map,
        _fallback: true,
        _fallback_reason: reason,
      };
    }

    async function callAndParse(temperature: number, maxTokens: number) {
      const ai = await callAnthropic({
        model: "claude-sonnet-4-6",
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
        function_name: "equity-planner-compute",
        feature: "equity_planner",
        user_id: assess.user_id,
      });
      const parsed = extractJson(ai.text || "");
      return { parsed, ai };
    }

    let parsed: any = null;
    let aiMeta: any = null;
    let lastErr: string = "";
    // ÚNICA tentativa para caber no timeout de 150s (Anthropic em fallback p/ Gemini é lento).
    try {
      const r = await callAndParse(0.2, 4500);
      const v = validateParsed(r.parsed);
      if (v.ok) { parsed = r.parsed; aiMeta = r.ai; }
      else { lastErr = `validation:${v.reason}`; parsed = r.parsed; aiMeta = r.ai; }
    } catch (e) {
      lastErr = (e as Error).message || "parse_error";
      console.warn(`[equity-planner-compute] attempt failed: ${lastErr}`);
    }

    if (!parsed) {
      console.warn(`[equity-planner-compute] using deterministic fallback: ${lastErr}`);
      parsed = defaultParsed(lastErr || "parse_error");
      aiMeta = { provider: "deterministic_fallback" };
    } else {
      const validation = validateParsed(parsed);
      if (!validation.ok) {
        console.warn(`[equity-planner-compute] enriching incomplete AI payload: ${validation.reason}`);
        const fallback = defaultParsed(validation.reason || "incomplete_payload");
        parsed = {
          ...fallback,
          ...parsed,
          dimensoes: Array.isArray(parsed.dimensoes) && parsed.dimensoes.length >= 8 ? parsed.dimensoes : fallback.dimensoes,
          iniciativas: Array.isArray(parsed.iniciativas) && parsed.iniciativas.length >= 4 ? parsed.iniciativas : fallback.iniciativas,
          buyer_map: Array.isArray(parsed.buyer_map) && parsed.buyer_map.length >= 2 ? parsed.buyer_map : fallback.buyer_map,
          ebitda_normalizado: Number(parsed.ebitda_normalizado) || fallback.ebitda_normalizado,
          ebitda_contabil: Number(parsed.ebitda_contabil) || fallback.ebitda_contabil,
          addbacks: parsed.addbacks || fallback.addbacks,
          dcf_premissas: parsed.dcf_premissas || fallback.dcf_premissas,
          premissas_valuation: Array.isArray(parsed.premissas_valuation) && parsed.premissas_valuation.length ? parsed.premissas_valuation : fallback.premissas_valuation,
          summary: parsed.summary || fallback.summary,
        };
      }
    }

    const ai = aiMeta;

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
    // EBITDA: prioriza o que a IA normalizou; fallback para declarado pelo usuário; último recurso: 15% do faturamento (margem média PME)
    const ebitdaDeclarado = Number(companyData?.ebitda) || 0;
    const fatDeclarado = Number(companyData?.faturamento) || 0;
    const ebitdaAi = Number(parsed.ebitda_normalizado) || 0;
    const ebitda = Math.max(0, ebitdaAi || ebitdaDeclarado || (fatDeclarado > 0 ? Math.round(fatDeclarado * 0.15) : 0));
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

    // 5.5) DCF simplificado (5 anos + perpetuidade Gordon) e SDE para micros
    const dcfP = parsed.dcf_premissas || {};
    const wacc = Math.max(0.08, Math.min(0.35, Number(dcfP.wacc) || 0.20));
    const cagr = Math.max(0, Math.min(0.40, Number(dcfP.cagr_5y) || 0.10));
    const gP = Math.max(0, Math.min(0.06, Number(dcfP.perpetuidade_g) || 0.04));
    const taxa = Math.max(0, Math.min(0.40, Number(dcfP.taxa_imposto) || 0.27));
    let valorDcf = 0;
    if (ebitda > 0 && wacc > gP) {
      const fcf0 = ebitda * (1 - taxa);
      for (let y = 1; y <= 5; y++) {
        const fcfY = fcf0 * Math.pow(1 + cagr, y);
        valorDcf += fcfY / Math.pow(1 + wacc, y);
      }
      const fcf6 = fcf0 * Math.pow(1 + cagr, 5) * (1 + gP);
      const terminal = fcf6 / (wacc - gP);
      valorDcf += terminal / Math.pow(1 + wacc, 5);
      valorDcf = Math.round(valorDcf);
    }

    // SDE (Seller's Discretionary Earnings) — só faz sentido pra micro/pequena
    const addbacks = parsed.addbacks || {};
    const remDono = Number(addbacks.remuneracao_dono || 0);
    const sde = ebitda + remDono;
    const sdeMultiplo = porte === "micro" ? 2.0 : porte === "pequena" ? 2.5 : 0;
    const valorSde = sdeMultiplo > 0 ? Math.round(sde * sdeMultiplo) : 0;

    // Triangulação: múltiplos é o âncora; DCF/SDE são sanity-check
    let valorTriangulado = valorAtual;
    if (valorDcf > 0 && valorSde > 0) {
      valorTriangulado = Math.round(valorAtual * 0.55 + valorDcf * 0.30 + valorSde * 0.15);
    } else if (valorDcf > 0) {
      valorTriangulado = Math.round(valorAtual * 0.70 + valorDcf * 0.30);
    } else if (valorSde > 0) {
      valorTriangulado = Math.round(valorAtual * 0.80 + valorSde * 0.20);
    }

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
      metodo: "triangulado",
      ebitda_contabil: Number(parsed.ebitda_contabil ?? Math.max(0, ebitda - Object.values(addbacks).reduce((s: number, n: any) => s + (Number(n) || 0), 0))),
      ebitda_normalizado: ebitda,
      addbacks,
      multiplo_aplicado: multiploAtual,
      faixa_min: comp.multiplo_min,
      faixa_max: comp.multiplo_max,
      valor_atual: valorAtual,
      valor_alvo: valorAlvo,
      valor_dcf: valorDcf,
      valor_sde: valorSde,
      valor_triangulado: valorTriangulado,
      dcf_premissas: { wacc, cagr_5y: cagr, perpetuidade_g: gP, taxa_imposto: taxa },
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

    // initiatives — força migração de arquétipo + reestruturação de modelo p/ arquétipos ilíquidos
    const ILIQUIDOS = new Set(["servico_profissional", "projeto_obra"]);
    const migrSug = classification?.migracao_sugerida;
    let allInits: any[] = (parsed.iniciativas || []).slice();
    const hasMigracao = allInits.some((i: any) => i.tipo === "migracao_arquetipo");
    if (migrSug?.para_arquetipo_id && !hasMigracao) {
      const rota = (migrations || []).find((m: any) => m.para_arquetipo_id === migrSug.para_arquetipo_id);
      const deltaMult = Number(rota?.delta_multiplo_esperado || 2.5);
      allInits.unshift({
        library_id: null,
        titulo: rota?.titulo || `Migrar modelo para ${migrSug.para_arquetipo_id}`,
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

    // Para arquétipos ilíquidos, GARANTE 2 iniciativas de reestruturação de modelo no Sprint 1
    if (ILIQUIDOS.has(arqId)) {
      const hasRecorrencia = allInits.some((i: any) =>
        /recorr|retainer|contrato\s+mensal|MRR|ARR|assinatura/i.test(`${i.titulo} ${i.descricao || ""}`)
      );
      const hasIndepDono = allInits.some((i: any) =>
        i.dimensao_alvo === "independencia_dono" ||
        /dono|second\b|segundo\s+nível|playbook|delegar|sucessão/i.test(`${i.titulo} ${i.descricao || ""}`)
      );
      if (!hasRecorrencia) {
        allInits.unshift({
          library_id: null,
          titulo: arqId === "servico_profissional"
            ? "Criar oferta retainer mensal sobre a base atual"
            : "Lançar linha de serviços contratados pós-projeto (manutenção/SLA)",
          descricao: arqId === "servico_profissional"
            ? "Empacotar 30-40% do escopo atual em contrato mensal recorrente (retainer) para clientes-chave — vira MRR previsível."
            : "Toda obra entregue passa a abrir contrato anual de manutenção/operação com SLA — receita lumpy ganha cauda recorrente.",
          dimensao_alvo: "qualidade_receita",
          delta_ipe: 10,
          delta_valor: Math.round(0.8 * Math.max(0, ebitda)),
          esforco: "medio",
          prazo_meses: 4,
          sprint: 1,
          tipo: "reestruturacao_modelo",
        });
      }
      if (!hasIndepDono) {
        allInits.unshift({
          library_id: null,
          titulo: "Tirar o dono do funil: estruturar #2 comercial e operacional",
          descricao: "Mapear o que só o dono faz hoje (vendas, entrega-chave, decisões), formar segundo nível com playbook e CRM, e fazer o dono sair de 1-2 frentes em 90 dias.",
          dimensao_alvo: "independencia_dono",
          delta_ipe: 12,
          delta_valor: Math.round(0.6 * Math.max(0, ebitda)),
          esforco: "medio",
          prazo_meses: 6,
          sprint: 1,
          tipo: "reestruturacao_modelo",
        });
      }
    }

    // Priorização: migração/reestruturação no topo, depois derisk, depois execução por (delta_valor / esforco*prazo)
    const ESFORCO_W: Record<string, number> = { baixo: 1, medio: 2, alto: 3 };
    const DERISK_DIMS = new Set(["independencia_dono","higiene_financeira","contingencias"]);
    const MODELO_TIPOS = new Set(["migracao_arquetipo", "reestruturacao_modelo"]);
    allInits.sort((a: any, b: any) => {
      const am = MODELO_TIPOS.has(a.tipo) ? 0 : 1;
      const bm = MODELO_TIPOS.has(b.tipo) ? 0 : 1;
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
      tipo: ["execucao","derisk","migracao_arquetipo","reestruturacao_modelo"].includes(i.tipo)
        ? i.tipo
        : (DERISK_DIMS.has(i.dimensao_alvo) ? "derisk" : "execucao"),
      prioridade: idx + 1,
    }));
    if (inits.length) await supabase.from("equity_initiatives").insert(inits);

    // buyer map enriquecido — herda sinergias/exemplos do perfil ancorado quando IA não preencher
    const buyerArchById = new Map((buyerArchs || []).map((b: any) => [b.id, b]));
    const buyers = (parsed.buyer_map || []).slice(0, 5).map((b: any, idx: number) => {
      const perfil = b.perfil_id ? buyerArchById.get(b.perfil_id) : null;
      const sin = Array.isArray(b.sinergias) && b.sinergias.length ? b.sinergias : (perfil?.sinergias_padrao || []);
      const ex = Array.isArray(b.exemplos_targets) && b.exemplos_targets.length ? b.exemplos_targets : (perfil?.exemplos_targets || []);
      return {
        assessment_id: assessmentId,
        arquetipo_comprador: ["estrategico","financeiro","individual"].includes(b.arquetipo_comprador) ? b.arquetipo_comprador : (perfil?.arquetipo_comprador || "estrategico"),
        nome_alvo: b.nome_alvo || perfil?.nome_perfil || null,
        setor_alvo: b.setor_alvo || perfil?.setor_alvo || null,
        tese_aquisicao: b.tese_aquisicao || perfil?.tese_padrao || null,
        racional_premio: b.racional_premio || null,
        sinergias: sin,
        exemplos_targets: ex,
        premio_estimado_pct: Math.max(0, Math.min(50, Number(b.premio_estimado_pct) || 0)),
        premio_estimado_valor: Math.round(valorAlvoBase * Math.max(0, Number(b.premio_estimado_pct) || 0) / 100),
        prioridade: idx + 1,
      };
    });
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

    // progress log snapshot (enriquecido — Onda 4 loop)
    const dimSnapshot: Record<string, number> = {};
    dimRows.forEach((d: any) => { dimSnapshot[d.dimensao] = d.score; });
    const topDestruidoresSnap = dimRows
      .filter((d: any) => d.destruidor_top)
      .sort((a: any, b: any) => a.score - b.score)
      .map((d: any) => ({ dimensao: d.dimensao, score: d.score, peso: d.peso }));
    await supabase.from("equity_progress_log").insert({
      company_id: assess.company_id,
      assessment_id: assessmentId,
      ipe: ipeFinal,
      valor: valorAtual,
      valor_alvo: valorAlvo,
      arquetipo_id: arqId,
      veredito_liquidez: veredito,
      dim_snapshot: dimSnapshot,
      top_destruidores: topDestruidoresSnap,
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
      fallback: !!parsed._fallback,
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
