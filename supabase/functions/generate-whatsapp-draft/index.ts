// generate-whatsapp-draft — FASE 1 do redesign WhatsApp (com contexto real).
//
// Diferença chave vs versão anterior:
//   - Lê HISTÓRICO real (mandatos ativos, últimas 5 atividades, último draft enviado)
//     antes de pedir o rascunho ao Gemini.
//   - DECIDE INTERNAMENTE o intent: se houver mandato vigente/em_negociacao,
//     vira 'followup' (NUNCA "primeiro contato"). Senão, 'initial'.
//   - O caller pode opcionalmente forçar um intent específico via `force_intent`
//     ('valuation_send' | 'meeting_request' | 'match_announcement').
//   - Compat: se vier `draft_type` antigo com um desses 3 valores, é respeitado.
//   - System prompt em modo followup é explícito: "VOCÊ JÁ TEM RELAÇÃO ATIVA.
//     NÃO se apresente. NÃO diga 'identificamos uma oportunidade'."
//
// Body: {
//   contact_id?: string, mandate_id?: string, buyer_id?: string, match_id?: string,
//   contact_name?: string, extra_context?: string,
//   force_intent?: 'valuation_send'|'meeting_request'|'match_announcement',
//   draft_type?: string  // legacy, aceito apenas para os 3 intents acima
// }
//
// Returns: { draft_text, suggested_action_label, model, draft_type, mode, resolved_mandate_id }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MODEL = "google/gemini-2.5-flash";

type Intent =
  | "initial"
  | "followup"
  | "valuation_send"
  | "meeting_request"
  | "match_announcement";

const INTENT_GUIDE: Record<Intent, { label: string; instruction: string }> = {
  initial: {
    label: "Mandar primeiro contato",
    instruction:
      "PRIMEIRO contato real. Apresente-se rapidamente como advisor da PME.B3/Vispe Capital, mencione setor/empresa do contato como gancho, peça 5min para alinhar. Sem soar invasivo.",
  },
  followup: {
    label: "Continuar conversa",
    instruction:
      "VOCÊ JÁ FALA COM ESSA PESSOA. NÃO se apresente. NÃO explique quem é a Vispe. NÃO use frases como 'identificamos uma oportunidade' nem 'tenho um buyer' nem 'estamos buscando empresas com seu perfil'. Continue de onde parou: faça referência ESPECÍFICA ao último ponto da relação (status do mandato, o que foi pedido, valuation enviado, due diligence em andamento, etc.). Tom natural, próximo, curto. Peça um próximo passo objetivo.",
  },
  valuation_send: {
    label: "Enviar valuation",
    instruction:
      "Aviso curto de que está enviando o valuation atualizado e fica à disposição para revisar pessoalmente. Você JÁ tem relação, não se apresente.",
  },
  meeting_request: {
    label: "Pedir reunião",
    instruction:
      "Pedir uma reunião de 20-30min. Sugerir 2 janelas (esta semana / próxima). Você JÁ tem relação, não se apresente.",
  },
  match_announcement: {
    label: "Anunciar match",
    instruction:
      "Anunciar que apareceu um match qualificado para o mandato dele (sem revelar identidade do contraparte). Pedir confirmação se pode avançar com o teaser. Você JÁ tem relação ativa.",
  },
};

const ACTIVE_MANDATE_STATUSES = ["vigente", "em_negociacao"];

function fmtDate(v: unknown): string | null {
  if (!v) return null;
  try { return new Date(String(v)).toISOString().slice(0, 10); }
  catch { return String(v).slice(0, 10); }
}

function fmtBRL(n: number | null | undefined): string | null {
  if (n == null) return null;
  return `R$ ${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

function daysSince(v: unknown): number | null {
  if (!v) return null;
  const t = new Date(String(v)).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

interface BuiltContext {
  prompt_lines: string[];
  has_active_mandate: boolean;
  contact_name: string | null;
  resolved_mandate_id: string | null;
}

async function buildContext(
  supa: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<BuiltContext> {
  const lines: string[] = [];
  const contact_id = (body.contact_id as string | undefined) ?? null;
  let mandate_id = (body.mandate_id as string | undefined) ?? null;
  const buyer_id = (body.buyer_id as string | undefined) ?? null;
  let contact_name = (body.contact_name as string | undefined) ?? null;
  let contact_company_cnpj: string | null = null;
  let has_active_mandate = false;

  // 1) Contact + empresa-mãe
  if (contact_id) {
    const { data: c } = await supa.schema("equity_brain").from("contacts")
      .select("nome, cargo, telefone_e164, entity_type, entity_id")
      .eq("id", contact_id).maybeSingle();
    if (c) {
      contact_name = contact_name ?? (c.nome as string | null) ?? null;
      if (c.cargo) lines.push(`Cargo: ${c.cargo}`);
      if (c.entity_type === "company" && c.entity_id) {
        const { data: comp } = await supa.schema("equity_brain").from("companies")
          .select("cnpj, razao_social, nome_fantasia, cnae_descricao, uf, municipio")
          .eq("id" as any, c.entity_id as string)
          .maybeSingle();
        // companies tem cnpj como PK, não id — fallback:
        let companyRow: any = comp;
        if (!companyRow) {
          const r2 = await supa.schema("equity_brain").from("companies")
            .select("cnpj, razao_social, nome_fantasia, cnae_descricao, uf, municipio")
            .eq("cnpj", c.entity_id as string)
            .maybeSingle();
          companyRow = r2.data;
        }
        if (companyRow) {
          contact_company_cnpj = (companyRow.cnpj as string | null) ?? null;
          const nome = (companyRow.nome_fantasia as string | null) ?? (companyRow.razao_social as string | null);
          if (nome) lines.push(`Empresa: ${nome}`);
          if (companyRow.cnae_descricao) lines.push(`Setor (CNAE): ${companyRow.cnae_descricao}`);
          if (companyRow.uf || companyRow.municipio) {
            lines.push(`Local: ${[companyRow.municipio, companyRow.uf].filter(Boolean).join("/")}`);
          }
        }
      }
    }
  }

  // 2) Mandato (explícito ou inferido por CNPJ)
  let mandate: any = null;
  if (mandate_id) {
    const { data } = await supa.schema("equity_brain").from("mandates")
      .select("id, codename, company_cnpj, contato_nome, status, pipeline_stage, deal_type, valor_pedido, valor_operacao, setor, uf, last_outreach_at, last_contact_at, data_assinatura, data_inicio, created_at")
      .eq("id", mandate_id).maybeSingle();
    mandate = data;
  } else if (contact_company_cnpj) {
    const { data } = await supa.schema("equity_brain").from("mandates")
      .select("id, codename, company_cnpj, contato_nome, status, pipeline_stage, deal_type, valor_pedido, valor_operacao, setor, uf, last_outreach_at, last_contact_at, data_assinatura, data_inicio, created_at")
      .eq("company_cnpj", contact_company_cnpj)
      .in("status", ACTIVE_MANDATE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    mandate = data;
    if (mandate?.id) mandate_id = mandate.id as string;
  }

  if (mandate) {
    has_active_mandate = ACTIVE_MANDATE_STATUSES.includes(String(mandate.status));
    lines.push(
      `Mandato: ${mandate.codename ?? mandate.company_cnpj} · status ${mandate.status ?? "?"} · stage ${mandate.pipeline_stage ?? "?"} · tipo ${mandate.deal_type ?? "?"}`,
    );
    const valor = mandate.valor_pedido ?? mandate.valor_operacao;
    if (valor) lines.push(`Valor do mandato: ${fmtBRL(Number(valor))}`);
    if (mandate.setor) lines.push(`Setor do mandato: ${mandate.setor}`);
    const dInicio = fmtDate(mandate.data_assinatura ?? mandate.data_inicio ?? mandate.created_at);
    const dias = daysSince(mandate.data_assinatura ?? mandate.data_inicio ?? mandate.created_at);
    if (dInicio) lines.push(`Mandato iniciado em ${dInicio}${dias != null ? ` (há ${dias} dias)` : ""}`);
    if (mandate.contato_nome && !contact_name) contact_name = mandate.contato_nome as string;
    const lastOut = fmtDate(mandate.last_outreach_at ?? mandate.last_contact_at);
    if (lastOut) lines.push(`Último outreach registrado: ${lastOut}`);
  }

  // 3) Últimas atividades do CRM
  const acts: any[] = [];
  if (mandate?.id) {
    const { data } = await supa.schema("equity_brain").from("crm_activities")
      .select("kind, direction, body, created_at")
      .eq("entity_type", "mandate")
      .eq("entity_id", mandate.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) acts.push(...data);
  }
  if (acts.length === 0 && contact_id) {
    const { data } = await supa.schema("equity_brain").from("crm_activities")
      .select("kind, direction, body, created_at")
      .eq("contact_id", contact_id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) acts.push(...data);
  }
  if (acts.length > 0) {
    lines.push("Últimas atividades (mais recentes primeiro):");
    for (const a of acts) {
      const dt = fmtDate(a.created_at) ?? "?";
      const dir = a.direction ? `[${a.direction}]` : "";
      const txt = (a.body ?? "").toString().replace(/\s+/g, " ").trim().slice(0, 200);
      lines.push(`  • ${dt} ${a.kind}${dir} — ${txt || "(sem texto)"}`);
    }
  }

  // 4) Última mensagem WhatsApp efetivamente enviada
  if (contact_id || mandate_id) {
    let q: any = supa.schema("public").from("whatsapp_action_log" as any)
      .select("draft_text_sent, draft_text_generated, marked_action, marked_at, opened_at, draft_type")
      .order("created_at", { ascending: false })
      .limit(1);
    if (mandate_id) q = q.eq("mandate_id", mandate_id);
    else if (contact_id) q = q.eq("contact_id", contact_id);
    const { data: lastSent } = await q;
    const last = Array.isArray(lastSent) ? lastSent[0] : null;
    if (last) {
      const txt = (last.draft_text_sent ?? last.draft_text_generated ?? "")
        .toString().replace(/\s+/g, " ").trim().slice(0, 240);
      const when = fmtDate(last.marked_at ?? last.opened_at);
      if (txt) {
        lines.push(`Última mensagem nossa via WhatsApp${when ? ` (${when})` : ""}: "${txt}"`);
      }
    }
  }

  // 5) Buyer (quando aplicável)
  if (buyer_id) {
    const { data: b } = await supa.schema("equity_brain").from("buyers")
      .select("nome, vertical_principal, ticket_min, ticket_max")
      .eq("id", buyer_id).maybeSingle();
    if (b) {
      lines.push(`Buyer: ${b.nome} · vertical ${b.vertical_principal ?? "?"}`);
      if (b.ticket_min || b.ticket_max) lines.push(`Ticket: ${b.ticket_min ?? "?"} – ${b.ticket_max ?? "?"}`);
    }
  }

  if (contact_name) lines.unshift(`Falando com: ${contact_name}`);
  if (body.extra_context) lines.push(`Contexto extra: ${body.extra_context}`);

  return {
    prompt_lines: lines,
    has_active_mandate,
    contact_name,
    resolved_mandate_id: mandate_id,
  };
}

function decideIntent(body: Record<string, unknown>, ctx: BuiltContext): Intent {
  const force = body.force_intent as Intent | undefined;
  if (force && INTENT_GUIDE[force]) return force;
  // compat com payload legado: respeita só os 3 intents específicos
  const legacy = body.draft_type as string | undefined;
  if (legacy === "valuation_send" || legacy === "meeting_request" || legacy === "match_announcement") {
    return legacy as Intent;
  }
  return ctx.has_active_mandate ? "followup" : "initial";
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const ctx = await buildContext(supa, body);
  const intent = decideIntent(body, ctx);
  const guide = INTENT_GUIDE[intent];
  const ctxStr = ctx.prompt_lines.join("\n") || "(sem contexto disponível)";

  const systemPrompt = intent === "initial"
    ? "Você é um advisor de M&A brasileiro escrevendo no WhatsApp para um empresário. Tom: humano, direto, profissional, no MÁXIMO 3 frases curtas (~280 caracteres total). Sem assinatura, sem marcadores, no máximo 1 emoji. PT-BR. Apenas o texto puro."
    : "Você é um advisor de M&A brasileiro escrevendo no WhatsApp. VOCÊ JÁ TEM RELAÇÃO ATIVA com essa pessoa — NÃO se apresente, NÃO explique quem é a Vispe, NÃO use frases como 'identificamos uma oportunidade', 'tenho um comprador interessado' ou 'estamos buscando empresas com seu perfil'. Continue de onde parou, fazendo referência específica a algo concreto do histórico (status do mandato, último ponto, documento). MÁXIMO 3 frases curtas (~280 caracteres). Sem assinatura, sem marcadores, no máximo 1 emoji. PT-BR. Apenas o texto puro.";

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `CONTEXTO REAL DO RELACIONAMENTO:\n${ctxStr}\n\nOBJETIVO DESTA MENSAGEM: ${guide.instruction}\n\nEscreva apenas a mensagem, sem aspas, sem prefixos, sem comentários.` },
      ],
    }),
  });

  if (resp.status === 429) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (resp.status === 402) {
    return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), {
      status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI Gateway ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const draft_text = (data.choices?.[0]?.message?.content ?? "").trim();

  return new Response(
    JSON.stringify({
      draft_text,
      suggested_action_label: guide.label,
      model: MODEL,
      draft_type: intent,
      mode: ctx.has_active_mandate ? "followup" : "initial",
      resolved_mandate_id: ctx.resolved_mandate_id,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(withObservability(handler, { name: "generate-whatsapp-draft" }));
