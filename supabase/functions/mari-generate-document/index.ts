// mari-generate-document
// Gera um documento legal (NDA/NBO/SPA/TS) a partir de um template doc_templates
// + custom_fields preenchidos pelo usuário, usando Anthropic Claude (fallback Gemini).
// Persiste em deal_documents com versionamento.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAnthropic, hydrateTemplate } from "../_shared/anthropicGateway.ts";
import { runSelfCritique } from "../_shared/selfCritiquePass.ts";

interface ReqBody {
  deal_id?: string;
  deal_pair_id?: string;
  template_code: string;
  custom_fields: Record<string, any>;
  parent_version_id?: string;
  visible_to_buyer?: boolean;
  use_self_critique?: boolean; // Optional: validate document after generation
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Auth: must be admin/advisor/legal
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });
    const { data: rolesData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (rolesData ?? []).map((r: any) => r.role);
    const allowed = ["admin", "advisor", "legal"].some((r) => roles.includes(r));
    if (!allowed) return json({ error: "forbidden" }, 403);

    const body = (await req.json()) as ReqBody;
    if (!body.template_code || !body.custom_fields || (!body.deal_id && !body.deal_pair_id)) {
      return json({ error: "missing_fields" }, 400);
    }

    // Load template
    const { data: tpl, error: tplErr } = await admin
      .from("doc_templates")
      .select("*")
      .eq("code", body.template_code)
      .eq("is_active", true)
      .maybeSingle();
    if (tplErr || !tpl) return json({ error: "template_not_found" }, 404);

    // Validate required fields
    const requiredKeys = (tpl.customizable_fields as any[])
      .filter((f) => f.required)
      .map((f) => f.key);
    const missing = requiredKeys.filter(
      (k) => body.custom_fields[k] === undefined || body.custom_fields[k] === "",
    );
    if (missing.length) {
      return json({ error: "missing_required_fields", fields: missing }, 400);
    }

    // Load context: deal_id can refer to either public.deals (legacy/unified view)
    // OR to an eb_companies mandate id (Kanban / DealPair flows pass mandate id here).
    let contextCodename = "N/A";
    if (body.deal_id) {
      // 1) Try public.deals (may not exist in this project — guard the error)
      let foundCodename: string | null = null;
      try {
        const { data: deal, error: dealErr } = await admin
          .from("deals" as any)
          .select("id, codename")
          .eq("id", body.deal_id)
          .maybeSingle();
        if (!dealErr && deal) foundCodename = (deal as any).codename ?? null;
      } catch (_e) {
        // table doesn't exist — silently fall through to mandate lookup
      }

      // 2) Fallback: treat deal_id as an eb_mandates id, then resolve codename via eb_companies (by CNPJ)
      if (foundCodename === null) {
        const { data: mandate } = await admin
          .from("eb_mandates")
          .select("id, company_cnpj")
          .eq("id", body.deal_id)
          .maybeSingle();
        if (!mandate) return json({ error: "deal_not_found" }, 404);
        const { data: company } = await admin
          .from("eb_companies")
          .select("codename")
          .eq("cnpj", (mandate as any).company_cnpj)
          .maybeSingle();
        foundCodename = (company as any)?.codename ?? null;
      }
      contextCodename = foundCodename ?? `DEAL-${body.deal_id.slice(0, 8)}`;
    } else if (body.deal_pair_id) {
      const { data: pair } = await admin
        .from("deal_pairs")
        .select("id, sell_mandate_id")
        .eq("id", body.deal_pair_id)
        .maybeSingle();
      if (!pair) return json({ error: "pair_not_found" }, 404);
      // Try resolve codename via sell mandate / company
      const { data: m } = await admin
        .from("eb_companies")
        .select("codename")
        .eq("id", pair.sell_mandate_id)
        .maybeSingle();
      contextCodename = m?.codename ?? `PAR-${body.deal_pair_id.slice(0, 8)}`;
    }

    // Hydrate template body deterministically
    const hydrated = hydrateTemplate(tpl.template_body ?? "", body.custom_fields);

    // Build prompt
    const systemPrompt = [
      tpl.ai_instructions ?? "",
      "",
      "REGRAS INVIOLÁVEIS:",
      "- Use português jurídico formal brasileiro.",
      "- Mantenha TODAS as cláusulas marcadas como [CLÁUSULA FIXA — TEXTO OFICIAL VISPE] EXATAMENTE como estão (não invente substituição).",
      "- Substitua placeholders [NÃO INFORMADO] por '[A PREENCHER]' destacando que falta informação.",
      "- Não invente cláusulas novas. Apenas refine a redação do template fornecido.",
      "- Retorne APENAS o documento em Markdown, sem explicações antes ou depois.",
    ].join("\n");

    const parts = Array.isArray(tpl.parts) ? (tpl.parts as any[]) : [];
    let finalText = "";
    let provider = "";
    let model = "";
    let fallbackUsed = false;
    let totalIn = 0;
    let totalOut = 0;
    let totalLatency = 0;
    let critiqueResult: any = null;

    if (parts.length > 0) {
      // ===== Modular generation (SPA): run each section in parallel with retry =====
      const results = await Promise.allSettled(
        parts.map((p) => generateSectionWithRetry(
          p,
          tpl,
          systemPrompt,
          body.custom_fields,
          contextCodename,
          userId,
        )),
      );

      // Collect successful results
      const successfulResults = [];
      const failedParts = [];
      for (let i = 0; i < results.length; i++) {
        if (results[i].status === "fulfilled") {
          successfulResults.push(results[i].value);
        } else {
          failedParts.push({
            title: parts[i].title,
            error: (results[i] as PromiseRejectedResult).reason?.message ?? "Unknown error",
          });
        }
      }

      // If all parts failed, throw error
      if (successfulResults.length === 0) {
        return json({
          error: "all_parts_failed",
          detail: "Falha ao gerar todas as seções do documento",
          failed_parts: failedParts,
        }, 500);
      }

      // Log warning if some parts failed
      if (failedParts.length > 0) {
        console.warn(`[mari-generate-document] ${failedParts.length}/${parts.length} sections failed`, failedParts);
      }

      provider = successfulResults[0]?.provider ?? "";
      model = successfulResults[0]?.model ?? "";
      fallbackUsed = successfulResults.some((r) => r.fallback_used);
      totalIn = successfulResults.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
      totalOut = successfulResults.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
      totalLatency = Math.max(...successfulResults.map((r) => r.latency_ms ?? 0));

      finalText = [
        `# ${tpl.label}`,
        "",
        hydrated.replace(/^# .*$/m, "").trim(),
        "",
        ...successfulResults.map((r) => r.text.trim()),
        ...(failedParts.length > 0 ? [
          "\n\n---\n\n⚠️ **Seções que falharam na geração (regenrar manualmente):**",
          ...failedParts.map((p) => `- ${p.title}: ${p.error}`),
        ] : []),
      ].join("\n\n");
    } else {
      // ===== Monolithic generation (NDA/NBO/TS) =====
      const userPrompt = [
        `Refine o documento abaixo mantendo sua estrutura, cláusulas fixas e dados das partes intactos.`,
        `Categoria: ${tpl.category} | Template: ${tpl.code} | Label: ${tpl.label}`,
        ``,
        `DADOS CONTEXTUAIS DO DEAL:`,
        `- Codinome interno: ${contextCodename}`,
        ``,
        `DOCUMENTO PRÉ-HIDRATADO:`,
        ``,
        hydrated,
      ].join("\n");

      // Few-shot HAD×ETECC apenas para NBO v2 (eleva qualidade ao padrão Vispe)
      const msgs: { role: "user" | "assistant"; content: string }[] = [];
      if (body.template_code === "legal_nbo_v1") {
        msgs.push(
          { role: "user", content: FEW_SHOT_USER_EXAMPLE },
          { role: "assistant", content: FEW_SHOT_ASSISTANT_EXAMPLE },
        );
      }
      msgs.push({ role: "user", content: userPrompt });

      const ai = await callAnthropic({
        model: tpl.preferred_model ?? "claude-sonnet-4-6",
        system: systemPrompt,
        messages: msgs,
        max_tokens: 8000,
        temperature: 0.15,
        function_name: "mari-generate-document",
        feature: `legal_doc_${tpl.category}`,
        user_id: userId,
        metadata: { deal_id: body.deal_id, deal_pair_id: body.deal_pair_id, template_code: body.template_code },
      });
      finalText = ai.text;
      provider = ai.provider;
      model = ai.model;
      fallbackUsed = ai.fallback_used;
      totalIn = ai.input_tokens ?? 0;
      totalOut = ai.output_tokens ?? 0;
      totalLatency = ai.latency_ms ?? 0;
    }

    // Optional: Run self-critique pass
    if (body.use_self_critique && finalText) {
      console.log("[mari-generate-document] Running self-critique pass...");
      critiqueResult = await runSelfCritique(finalText, tpl.label, userId);
    }

    // Determine version_number
    let version = 1;
    if (body.parent_version_id) {
      const { data: parent } = await admin
        .from("deal_documents")
        .select("version_number")
        .eq("id", body.parent_version_id)
        .maybeSingle();
      version = (parent?.version_number ?? 0) + 1;
    } else {
      let lq = admin
        .from("deal_documents")
        .select("version_number")
        .eq("template_code", body.template_code)
        .order("version_number", { ascending: false })
        .limit(1);
      lq = body.deal_pair_id
        ? lq.eq("deal_pair_id", body.deal_pair_id)
        : lq.eq("deal_id", body.deal_id!);
      const { data: latest } = await lq.maybeSingle();
      version = (latest?.version_number ?? 0) + 1;
    }

    // Insert deal_documents row
    const { data: doc, error: insErr } = await admin
      .from("deal_documents")
      .insert({
        deal_id: body.deal_id ?? null,
        deal_pair_id: body.deal_pair_id ?? null,
        template_code: tpl.code,
        label: `${tpl.label} v${version}`,
        category: tpl.category,
        generated_body: finalText,
        custom_fields_snapshot: body.custom_fields,
        version_number: version,
        parent_version_id: body.parent_version_id ?? null,
        requires_partner_approval: true,
        homologation_status: "none",
        ai_provider: provider,
        ai_model: model,
        ai_fallback_used: fallbackUsed,
        status: "draft",
        visible_to_buyer: !!body.visible_to_buyer,
        uploaded_by: userId,
        metadata: {
          generation_latency_ms: totalLatency,
          input_tokens: totalIn,
          output_tokens: totalOut,
          parts_count: parts.length,
        },
      })
      .select()
      .single();

    if (insErr) {
      console.error("[mari-generate-document] insert failed:", insErr);
      return json({ error: "persist_failed", detail: insErr.message }, 500);
    }

    // Audit
    await admin.from("audit_events").insert({
      event_type: "legal_document_generated",
      entity_type: "legal_document",
      entity_id: doc.id,
      actor_user_id: userId,
      payload: {
        deal_id: body.deal_id,
        deal_pair_id: body.deal_pair_id,
        template_code: body.template_code,
        version,
        provider,
        model,
        fallback: fallbackUsed,
        parts_count: parts.length,
      },
    });

    return json({
      ok: true,
      document: doc,
      ai: {
        provider,
        model,
        fallback_used: fallbackUsed,
        latency_ms: totalLatency,
        parts_count: parts.length,
      },
      critique: critiqueResult,
    });
  } catch (e: any) {
    console.error("[mari-generate-document] error:", e);
    return json({ error: "internal_error", detail: e?.message }, 500);
  }
});

async function generateSectionWithRetry(
  part: any,
  tpl: any,
  systemPrompt: string,
  customFields: Record<string, any>,
  contextCodename: string,
  userId: string,
  attempt = 1,
  maxAttempts = 3,
): Promise<any> {
  try {
    const sectionInstructions = hydrateTemplate(part.instructions ?? "", customFields);
    const userPrompt = [
      `Você gerará APENAS a seção "${part.title}" do documento ${tpl.label}.`,
      `Categoria: ${tpl.category} | Template: ${tpl.code}`,
      ``,
      `DADOS CONTEXTUAIS DO DEAL:`,
      `- Codinome interno: ${contextCodename}`,
      ``,
      `INSTRUÇÕES DA SEÇÃO:`,
      sectionInstructions,
      ``,
      `Retorne em Markdown apenas o conteúdo desta seção (cabeçalho ## ${part.title} + cláusulas). Sem preâmbulo ou conclusão.`,
    ].join("\n");

    return await callAnthropic({
      model: tpl.preferred_model ?? "claude-opus-4-7",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 4000,
      temperature: 0.15,
      function_name: "mari-generate-document",
      feature: `legal_doc_${tpl.category}_${part.id}`,
      user_id: userId,
      metadata: { deal_id: customFields.deal_id, part_id: part.id, attempt },
    });
  } catch (error: any) {
    if (attempt < maxAttempts) {
      // Exponential backoff: 100ms, 200ms, 400ms
      const delayMs = Math.pow(2, attempt - 1) * 100;
      console.warn(
        `[mari-generate-document] Section "${part.title}" attempt ${attempt} failed, retrying in ${delayMs}ms: ${error?.message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return generateSectionWithRetry(part, tpl, systemPrompt, customFields, contextCodename, userId, attempt + 1, maxAttempts);
    }
    throw error;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================================
// FEW-SHOT EXAMPLE — NBO Vispe (caso real HAD × ETECC, anonimizado/simplificado)
// Usado APENAS quando template_code === 'legal_nbo_v1'.
// Ensina o modelo a: (1) usar frases sagradas Vispe, (2) 5 seções limpas sem
// numeração travada, (3) auto-calcular valores, (4) usar [A PREENCHER] só onde
// faz sentido, (5) tom Vispe.
// ============================================================================

const FEW_SHOT_USER_EXAMPLE = `Refine o documento abaixo mantendo sua estrutura, cláusulas fixas e dados das partes intactos.
Categoria: legal | Template: legal_nbo_v1 | Label: Proposta Não Vinculante (NBO)

DADOS CONTEXTUAIS DO DEAL:
- Codinome interno: MARI-HAD-0042

DOCUMENTO PRÉ-HIDRATADO:

DADOS DA OPERAÇÃO (entrada do wizard):
- Comprador (proponente): HAD Participações Ltda — CNPJ 12.345.678/0001-99, sede em Porto Alegre/RS, representada por João Silva (CPF 111.222.333-44)
- Alvo (vendedor): ETECC Engenharia S.A. — CNPJ 98.765.432/0001-11, sede em Caxias do Sul/RS, representada por Maria Souza (CPF 555.666.777-88)
- Objeto: 100% das quotas da ETECC
- Valor por unidade: R$ 19.882,50
- Quantidade de unidades: 100
- % à vista: 40
- Nº parcelas: 24
- Exclusividade (dias): 30
- Foro: Caxias do Sul/RS
- Data: 30 de março de 2026`;

const FEW_SHOT_ASSISTANT_EXAMPLE = `# PROPOSTA NÃO VINCULANTE (NBO — Non-Binding Offer)

A presente Proposta Não Vinculante ("Proposta" ou "NBO") é apresentada pela **HAD Participações Ltda**, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 12.345.678/0001-99, com sede em Porto Alegre/RS, neste ato representada por seu administrador **João Silva**, CPF 111.222.333-44 ("Proponente" ou "Compradora"), à **ETECC Engenharia S.A.**, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 98.765.432/0001-11, com sede em Caxias do Sul/RS, neste ato representada por sua administradora **Maria Souza**, CPF 555.666.777-88 ("Alvo" ou "Vendedora"), tendo como interveniente facilitadora a **Vispe Assessoria em M&A Ltda**, CNPJ 31.526.112/0001-04, com sede em Gravataí/RS ("Vispe"), nos seguintes termos.

## Objeto e Estrutura da Operação

A Proponente manifesta seu interesse, de forma não vinculante, em adquirir a totalidade (100%) das quotas representativas do capital social da Alvo, livres e desembaraçadas de quaisquer ônus, gravames ou direitos de terceiros ("Operação"), nos termos e condições aqui descritos e sujeita às condições suspensivas usuais a operações desta natureza.

## Preço e Forma de Pagamento

O preço total ofertado pela Operação é de **R$ 1.988.250,00 (um milhão, novecentos e oitenta e oito mil, duzentos e cinquenta reais)**, equivalente a R$ 19.882,50 por unidade, considerando 100 unidades, a ser pago da seguinte forma:

(i) **R$ 795.300,00 (setecentos e noventa e cinco mil e trezentos reais)**, equivalente a 40% (quarenta por cento) do preço total, a título de pagamento à vista, na data de fechamento da Operação ("Data de Fechamento");

(ii) o saldo remanescente, equivalente a **R$ 1.192.950,00 (um milhão, cento e noventa e dois mil, novecentos e cinquenta reais)**, em **24 (vinte e quatro) parcelas mensais, iguais e sucessivas de R$ 49.706,25 (quarenta e nove mil, setecentos e seis reais e vinte e cinco centavos)**, vencendo-se a primeira 30 (trinta) dias após a Data de Fechamento.

As parcelas serão corrigidas monetariamente pelo IPCA/IBGE acumulado no período, sem incidência de juros remuneratórios.

## Condições Suspensivas e Due Diligence

A formalização da Operação fica condicionada à conclusão satisfatória, a exclusivo critério da Proponente, de auditoria legal, contábil, fiscal, trabalhista e ambiental ("Due Diligence") sobre a Alvo, bem como à celebração de Contrato de Compra e Venda de Quotas ("SPA") refletindo as condições aqui dispostas e as declarações e garantias usuais a operações desta natureza, incluindo cláusula de não-concorrência da Vendedora pelo prazo de 5 (cinco) anos no território nacional.

## Exclusividade e Confidencialidade

Aceita esta Proposta, a Alvo compromete-se a **negociar exclusivamente com a Proponente pelo prazo de 30 (trinta) dias corridos**, contados da assinatura desta NBO ("Período de Exclusividade"), abstendo-se de manter conversas, negociações, fornecer informações ou aceitar propostas de quaisquer terceiros relativas à venda, total ou parcial, da Alvo ou de seus ativos. As Partes reconhecem que todas as informações trocadas no contexto desta Operação são confidenciais e regem-se pelo Acordo de Confidencialidade previamente firmado.

## Caráter Não Vinculante, Foro e Encerramento

Esta NBO tem caráter exclusivamente **não vinculante**, ressalvadas as obrigações de exclusividade, confidencialidade e foro, que vinculam as Partes desde a sua assinatura. Eventuais despesas com a Operação serão arcadas por cada Parte individualmente até a celebração do SPA. Fica eleito o foro da Comarca de **Caxias do Sul/RS** para dirimir quaisquer controvérsias decorrentes desta Proposta, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justas e contratadas, as Partes assinam a presente em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo.

Caxias do Sul/RS, 30 de março de 2026.

_____________________________________
**HAD Participações Ltda**
João Silva — CPF 111.222.333-44

_____________________________________
**ETECC Engenharia S.A.**
Maria Souza — CPF 555.666.777-88

_____________________________________
**Vispe Assessoria em M&A Ltda**
(interveniente facilitadora)

Testemunhas:
1. _________________________ Nome: [A PREENCHER] CPF: [A PREENCHER]
2. _________________________ Nome: [A PREENCHER] CPF: [A PREENCHER]`;

