// mari-summarize-deal — Gera resumo 3 linhas + sugestão de mensagem WhatsApp
// para um mandato específico, usando Lovable AI Gateway (gemini-2.5-flash).
//
// Body: { mandate_id: string, force?: boolean }
// Resposta: { summary_text, suggested_action_text, suggested_message_draft, contact_id?, cached: boolean }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const MODEL = "google/gemini-2.5-flash";
const CACHE_TTL_HOURS = 2;

async function callAI(systemPrompt: string, userPrompt: string): Promise<{
  summary_text: string;
  suggested_action_text: string;
  suggested_message_draft: string;
  tokens_in?: number;
  tokens_out?: number;
}> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "salvar_resumo",
            description: "Salva o resumo do deal e a sugestão de próxima ação.",
            parameters: {
              type: "object",
              properties: {
                summary_text: {
                  type: "string",
                  description: "Resumo em EXATAMENTE 3 linhas (separadas por \\n). Linha 1: estado do deal. Linha 2: última interação relevante. Linha 3: bloqueio ou próximo passo.",
                },
                suggested_action_text: {
                  type: "string",
                  description: "Próxima ação concreta em 1 frase (ex: 'Cobrar retorno do CEO sobre proposta enviada em 15/04').",
                },
                suggested_message_draft: {
                  type: "string",
                  description: "Texto pronto para enviar por WhatsApp ao contato principal — natural, em PT-BR, max 240 chars, sem assinatura.",
                },
              },
              required: ["summary_text", "suggested_action_text", "suggested_message_draft"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "salvar_resumo" } },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI Gateway ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const tc = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc?.function?.arguments) throw new Error("AI sem tool_call válido");
  const args = JSON.parse(tc.function.arguments);
  return {
    ...args,
    tokens_in: data.usage?.prompt_tokens,
    tokens_out: data.usage?.completion_tokens,
  };
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const mandateId = body.mandate_id as string | undefined;
  const force = !!body.force;

  if (!mandateId) {
    return new Response(JSON.stringify({ error: "mandate_id obrigatório" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1. Cache check
  if (!force) {
    const { data: cached } = await supa
      .schema("equity_brain")
      .from("mandate_summaries")
      .select("*")
      .eq("mandate_id", mandateId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cached) {
      return new Response(JSON.stringify({ ...cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // 2. Fetch context
  const { data: mandate, error: mErr } = await supa
    .schema("equity_brain")
    .from("mandates")
    .select("id, company_cnpj, status, pipeline_stage, temperature, valor_pedido, valor_operacao, contato_nome, contato_telefone, observacoes, last_activity_at, last_outreach_at, comprador_nome, deal_kind, setor, uf")
    .eq("id", mandateId)
    .maybeSingle();
  if (mErr || !mandate) {
    return new Response(JSON.stringify({ error: "mandato não encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Company
  let companyName = mandate.company_cnpj;
  if (mandate.company_cnpj) {
    const { data: co } = await supa
      .schema("equity_brain")
      .from("companies")
      .select("razao_social, nome_fantasia, codename, faturamento_estimado, setor_ma")
      .eq("cnpj", mandate.company_cnpj)
      .maybeSingle();
    if (co) companyName = co.nome_fantasia || co.razao_social || co.codename || mandate.company_cnpj;
  }

  // Activities (últimas 10)
  const { data: activities = [] } = await supa
    .schema("equity_brain")
    .from("crm_activities")
    .select("kind, direction, body, created_at")
    .eq("entity_type", "mandate")
    .eq("entity_id", mandateId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Top match (se houver)
  let topMatch: any = null;
  if (mandate.company_cnpj) {
    const { data: matches } = await supa
      .schema("equity_brain")
      .from("matches")
      .select("buyer_id, match_score, ai_pitch, p_close_12m")
      .eq("cnpj", mandate.company_cnpj)
      .eq("is_current", true)
      .order("match_score", { ascending: false })
      .limit(1);
    if (matches?.[0]) topMatch = matches[0];
  }

  // 3. Build prompt
  const ctxLines = [
    `Empresa: ${companyName} (CNPJ ${mandate.company_cnpj})`,
    `Setor: ${mandate.setor ?? "?"} · UF: ${mandate.uf ?? "?"}`,
    `Estágio pipeline: ${mandate.pipeline_stage ?? mandate.status ?? "?"}`,
    `Temperatura: ${mandate.temperature ?? "?"}`,
    `Valor pedido: ${mandate.valor_pedido ? `R$ ${Number(mandate.valor_pedido).toLocaleString("pt-BR")}` : "?"}`,
    `Contato: ${mandate.contato_nome ?? "?"}`,
    `Última atividade: ${mandate.last_activity_at ?? "nunca"}`,
    `Último outreach: ${mandate.last_outreach_at ?? "nunca"}`,
    mandate.comprador_nome ? `Comprador-alvo: ${mandate.comprador_nome}` : null,
    mandate.observacoes ? `Notas: ${mandate.observacoes.slice(0, 400)}` : null,
    topMatch ? `Top match score: ${topMatch.match_score} · p_close_12m: ${topMatch.p_close_12m ?? "?"} · pitch: ${(topMatch.ai_pitch ?? "").slice(0, 200)}` : null,
  ].filter(Boolean).join("\n");

  const actLines = activities.length
    ? activities.map((a: any) => `- [${a.created_at?.slice(0, 10)}] ${a.kind} ${a.direction ?? ""}: ${(a.body ?? "").slice(0, 160)}`).join("\n")
    : "Nenhuma atividade registrada.";

  const userPrompt = `Você é a Mari, copilota de um advisor de M&A da Vispe Capital.\n\nDeal:\n${ctxLines}\n\nÚltimas atividades:\n${actLines}\n\nGere o resumo do deal (3 linhas) + próxima ação + rascunho de WhatsApp.`;

  const systemPrompt = "Você é direta, prática e pensa como um advisor sênior de M&A no Brasil. Resumos em PT-BR, sem jargão desnecessário. O rascunho de WhatsApp deve soar humano, não robótico, e nunca prometer coisas. Se não houver dado suficiente, diga 'sem dados recentes' em vez de inventar.";

  const ai = await callAI(systemPrompt, userPrompt);

  // 4. Persist
  const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const { data: saved, error: saveErr } = await supa
    .schema("equity_brain")
    .from("mandate_summaries")
    .upsert({
      mandate_id: mandateId,
      summary_text: ai.summary_text,
      suggested_action_text: ai.suggested_action_text,
      suggested_action_intent: "whatsapp_outreach",
      suggested_message_draft: ai.suggested_message_draft,
      model: MODEL,
      tokens_in: ai.tokens_in ?? null,
      tokens_out: ai.tokens_out ?? null,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt,
    }, { onConflict: "mandate_id" })
    .select()
    .single();

  if (saveErr) throw new Error(`save error: ${saveErr.message}`);

  return new Response(JSON.stringify({ ...saved, cached: false }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(withObservability(handler, { name: "mari-summarize-deal" }));
