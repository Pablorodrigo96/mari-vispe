import { callAnthropic } from "./anthropicGateway.ts";

export interface SelfCritiqueResult {
  issues_found: number;
  gaps_detected: { apreencher: number; naoInformado: number };
  inconsistencies: string[];
  recommendations: string[];
  is_ready_for_review: boolean;
  /** 0-100 score from deterministic regex checks */
  score: number;
  /** Hard-blocking errors (sacred phrases missing, structural issues) */
  errors: string[];
  /** Template code being critiqued (allows specialized checks) */
  template_code?: string;
}

/**
 * Deterministic regex/contains checks for NBO Vispe v2.
 * Returns score 0-100 and a list of hard errors.
 */
function deterministicNboChecks(body: string): { score: number; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = body || "";
  let passed = 0;
  let total = 0;

  const check = (cond: boolean, msg: string, hard = true) => {
    total++;
    if (cond) {
      passed++;
    } else {
      (hard ? errors : warnings).push(msg);
    }
  };

  // 1. Cabeçalho oficial
  check(/^#\s*PROPOSTA NÃO VINCULANTE\s*\(NBO/im.test(text), "Cabeçalho oficial ausente (# PROPOSTA NÃO VINCULANTE (NBO ...))");

  // 2-3. Frases sagradas do preâmbulo
  check(/A presente Proposta Não Vinculante/i.test(text), 'Frase sagrada de abertura ausente ("A presente Proposta Não Vinculante...")');
  check(/Vispe Assessoria em M&A Ltda/i.test(text), "Identificação da Vispe como interveniente ausente");
  check(/31\.526\.112\/0001-04/.test(text), "CNPJ da Vispe (31.526.112/0001-04) ausente");
  check(/Gravataí\/?\s*RS/i.test(text), "Sede da Vispe (Gravataí/RS) ausente");

  // 4. Seções obrigatórias (5 H2)
  check(/##\s*Objeto/i.test(text), "Seção '## Objeto' ausente");
  check(/##\s*Preço/i.test(text), "Seção '## Preço' ausente");
  check(/##\s*(Condições|Due Diligence)/i.test(text), "Seção 'Condições Suspensivas / Due Diligence' ausente");
  check(/##\s*Exclusividade/i.test(text), "Seção '## Exclusividade' ausente");
  check(/##\s*(Caráter\s+Não\s+Vinculante|Foro)/i.test(text), "Seção de Caráter Não Vinculante / Foro ausente");

  // 5. Cláusula de exclusividade sagrada
  check(/negociar\s+exclusivamente/i.test(text), 'Cláusula sagrada de exclusividade ausente ("negociar exclusivamente...")');

  // 6. Cláusula de não-concorrência (sagrada Vispe)
  check(/não[- ]concorrência/i.test(text), "Cláusula de não-concorrência ausente (sagrada Vispe)", false);

  // 7. Caráter não vinculante explícito
  check(/n[ãa]o\s+vinculante/i.test(text), "Declaração de caráter não vinculante ausente");

  // 8. Foro mencionado
  check(/foro\s+da\s+Comarca/i.test(text), "Cláusula de foro ausente");

  // 9. Formato BRL ao menos uma vez
  check(/R\$\s*[\d.]+,\d{2}/.test(text), "Nenhum valor formatado em BRL (R$ X.XXX,XX) encontrado");

  // 10. Por extenso (parênteses com palavras-número)
  check(/\(.*\b(mil|milhão|milhões|reais|cento|dois|três|quatro|cinco|seis|sete|oito|nove|dez|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)\b.*\)/i.test(text), "Valores por extenso (entre parênteses) ausentes", false);

  // 11. Encerramento com data
  check(/\d{1,2}\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4}/i.test(text), "Data por extenso de encerramento ausente");

  // 12. Assinaturas (rubricas)
  check(/_{5,}/.test(text), "Linhas de assinatura/rubrica ausentes");

  // 13. Testemunhas
  check(/Testemunhas?\s*:/i.test(text), "Bloco de testemunhas ausente");

  // 14. Sem placeholders críticos não-essenciais
  const apreencher = (text.match(/\[A\s+PREENCHER\]/gi) ?? []).length;
  const naoInformado = (text.match(/\[N[ÃA]O\s+INFORMADO\]/gi) ?? []).length;
  check(naoInformado === 0, `Existem ${naoInformado} placeholder(s) [NÃO INFORMADO] — converter para [A PREENCHER] ou preencher`);
  check(apreencher <= 8, `Excesso de [A PREENCHER]: ${apreencher} (limite 8)`, false);

  // 15. Não usar latinismos comuns
  check(!/\b(ipsis\s+litteris|data\s+venia|in\s+verbis)\b/i.test(text), "Latinismos detectados — tom Vispe pede linguagem direta", false);

  // 16. Pelo menos 800 chars (não pode ser stub)
  check(text.length >= 800, `Documento muito curto (${text.length} chars) — esperado >= 800`);

  const score = Math.round((passed / total) * 100);
  return { score, errors, warnings };
}

export async function runSelfCritique(
  documentBody: string,
  templateLabel: string,
  userId: string,
  templateCode?: string,
): Promise<SelfCritiqueResult> {
  // Deterministic checks (only for NBO v1/v2 for now)
  let deterministic = { score: 100, errors: [] as string[], warnings: [] as string[] };
  if (templateCode === "legal_nbo_v1") {
    deterministic = deterministicNboChecks(documentBody);
  }

  const critiquePrompt = `Você é um revisor jurídico Vispe. Analise o NBO abaixo:

1. Campos não preenchidos ([A PREENCHER], [NÃO INFORMADO])
2. Inconsistências internas (datas, nomes, valores, % vs R$)
3. Cláusulas faltantes ou incompletas vs padrão Vispe
4. Tom/linguagem fora do padrão

Responda APENAS JSON:
{
  "gaps": { "apreencher": <n>, "naoInformado": <n> },
  "inconsistencies": [<problemas>],
  "recommendations": [<sugestões>],
  "is_ready": <true|false>
}

Documento:
${documentBody}`;

  try {
    const result = await callAnthropic({
      model: "claude-sonnet-4-5",
      messages: [{ role: "user", content: critiquePrompt }],
      max_tokens: 2000,
      temperature: 0.1,
      function_name: "self-critique-pass",
      feature: `legal_doc_critique_${templateLabel}`,
      user_id: userId,
      use_cache: false,
    });

    const parsed = parseJSON(result.text);
    const aiReady = parsed.is_ready ?? false;
    const isReady = deterministic.errors.length === 0 && aiReady;

    return {
      issues_found: (parsed.gaps?.apreencher ?? 0) + (parsed.gaps?.naoInformado ?? 0) + deterministic.errors.length,
      gaps_detected: {
        apreencher: parsed.gaps?.apreencher ?? 0,
        naoInformado: parsed.gaps?.naoInformado ?? 0,
      },
      inconsistencies: [...deterministic.errors, ...(parsed.inconsistencies ?? [])],
      recommendations: [...deterministic.warnings, ...(parsed.recommendations ?? [])],
      is_ready_for_review: isReady,
      score: deterministic.score,
      errors: deterministic.errors,
      template_code: templateCode,
    };
  } catch (error) {
    console.error("[selfCritiquePass] AI error, returning deterministic only:", error);
    return {
      issues_found: deterministic.errors.length,
      gaps_detected: { apreencher: 0, naoInformado: 0 },
      inconsistencies: deterministic.errors,
      recommendations: deterministic.warnings,
      is_ready_for_review: deterministic.errors.length === 0,
      score: deterministic.score,
      errors: deterministic.errors,
      template_code: templateCode,
    };
  }
}

function parseJSON(text: string): any {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {};
  } catch {
    console.warn("[parseJSON] failed to parse:", text.slice(0, 100));
    return {};
  }
}
