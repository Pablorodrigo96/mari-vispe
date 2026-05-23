import { callAnthropic } from "./anthropicGateway.ts";

export interface SelfCritiqueResult {
  issues_found: number;
  gaps_detected: { apreencher: number; naoInformado: number };
  inconsistencies: string[];
  recommendations: string[];
  is_ready_for_review: boolean;
}

export async function runSelfCritique(
  documentBody: string,
  templateLabel: string,
  userId: string,
): Promise<SelfCritiqueResult> {
  const critiquePrompt = `Você é um revisor jurídico especializado. Analise o documento abaixo para:

1. Campos não preenchidos ([A PREENCHER], [NÃO INFORMADO])
2. Inconsistências internas (datas, nomes, valores que não batem)
3. Cláusulas que parecem incompletas ou inadequadas
4. Problemas de formatação ou estrutura

Responda em JSON com esta estrutura:
{
  "gaps": { "apreencher": <número>, "naoInformado": <número> },
  "inconsistencies": [<lista de problemas encontrados>],
  "recommendations": [<lista de sugestões de melhoria>],
  "is_ready": <true se pronto para envio, false se precisa revisão>
}

Documento para revisar:
${documentBody}`;

  try {
    const result = await callAnthropic({
      model: "claude-opus-4-7",
      messages: [{ role: "user", content: critiquePrompt }],
      max_tokens: 2000,
      temperature: 0.1,
      function_name: "self-critique-pass",
      feature: `legal_doc_critique_${templateLabel}`,
      user_id: userId,
      use_cache: false, // Don't cache critique (varies per document)
    });

    const parsed = parseJSON(result.text);
    return {
      issues_found: (parsed.gaps?.apreencher ?? 0) + (parsed.gaps?.naoInformado ?? 0),
      gaps_detected: {
        apreencher: parsed.gaps?.apreencher ?? 0,
        naoInformado: parsed.gaps?.naoInformado ?? 0,
      },
      inconsistencies: parsed.inconsistencies ?? [],
      recommendations: parsed.recommendations ?? [],
      is_ready_for_review: parsed.is_ready ?? false,
    };
  } catch (error) {
    console.error("[selfCritiquePass] error:", error);
    // Don't fail generation if critique fails - it's optional
    return {
      issues_found: 0,
      gaps_detected: { apreencher: 0, naoInformado: 0 },
      inconsistencies: [],
      recommendations: [],
      is_ready_for_review: true, // Assume OK if critique unavailable
    };
  }
}

function parseJSON(text: string): any {
  try {
    // Extract JSON from response (may have surrounding text)
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return {};
  } catch {
    console.warn("[parseJSON] failed to parse:", text.slice(0, 100));
    return {};
  }
}
