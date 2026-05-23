// mari-generate-document
// Gera um documento legal (NDA/NBO/SPA/TS) a partir de um template doc_templates
// + custom_fields preenchidos pelo usuário, usando Anthropic Claude (fallback Gemini).
// Persiste em deal_documents com versionamento.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAnthropic, hydrateTemplate } from "../_shared/anthropicGateway.ts";

interface ReqBody {
  deal_id?: string;
  deal_pair_id?: string;
  template_code: string;
  custom_fields: Record<string, any>;
  parent_version_id?: string;
  visible_to_buyer?: boolean;
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

    // Load context: either deal or pair
    let contextCodename = "N/A";
    if (body.deal_id) {
      const { data: deal } = await admin
        .from("deals")
        .select("id, codename")
        .eq("id", body.deal_id)
        .maybeSingle();
      if (!deal) return json({ error: "deal_not_found" }, 404);
      contextCodename = deal.codename ?? "N/A";
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
      const ai = await callAnthropic({
        model: tpl.preferred_model ?? "claude-sonnet-4-6",
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
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
