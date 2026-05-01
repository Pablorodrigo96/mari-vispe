// generate-whatsapp-draft — Etapa 1 do redesign WhatsApp.
// Wrapper tipado sobre Lovable AI Gateway (Gemini 2.5-flash) que retorna
// um rascunho contextual + label de ação sugerida, dado um draft_type.
//
// Body: {
//   draft_type: 'first_contact'|'followup'|'valuation_send'|'meeting_request'|'match_announcement'|'generic',
//   contact_id?: string,        // equity_brain.contacts.id
//   mandate_id?: string,
//   buyer_id?: string,
//   match_id?: string,
//   contact_name?: string,      // override (opcional)
//   extra_context?: string,     // override livre
// }
//
// Returns: { draft_text, suggested_action_label, model, draft_type }

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

type DraftType =
  | "first_contact"
  | "followup"
  | "valuation_send"
  | "meeting_request"
  | "match_announcement"
  | "generic";

const INTENT_GUIDE: Record<DraftType, { label: string; instruction: string }> = {
  first_contact: {
    label: "Mandar primeiro contato",
    instruction:
      "PRIMEIRO contato. Se apresente como advisor da PME.B3/Vispe, motivo do contato (mandato/oportunidade), pedir 5min para alinhar. Sem soar invasivo.",
  },
  followup: {
    label: "Mandar follow-up",
    instruction:
      "FOLLOW-UP de uma conversa anterior. Tom natural, sem cobrar. Lembrar do tema sem repetir o mesmo pitch. Pedir um próximo passo objetivo.",
  },
  valuation_send: {
    label: "Enviar valuation",
    instruction:
      "Aviso de envio do valuation atualizado. Mensagem curta dizendo que está enviando o material e que fica à disposição para revisar pessoalmente.",
  },
  meeting_request: {
    label: "Pedir reunião",
    instruction:
      "Pedir uma reunião de 20-30min. Sugerir 2 janelas (esta semana / próxima). Tom firme mas educado.",
  },
  match_announcement: {
    label: "Anunciar match",
    instruction:
      "Anunciar que apareceu um match qualificado para o mandato. Sem revelar identidade do contraparte. Pedir confirmação se pode avançar com o teaser.",
  },
  generic: {
    label: "Falar no WhatsApp",
    instruction: "Mensagem curta, cordial, perguntando se pode atualizar sobre as últimas novidades.",
  },
};

async function buildContext(
  supa: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
): Promise<string[]> {
  const ctx: string[] = [];
  const contact_id = body.contact_id as string | undefined;
  const mandate_id = body.mandate_id as string | undefined;
  const buyer_id = body.buyer_id as string | undefined;
  let contact_name = (body.contact_name as string | undefined) ?? null;

  if (contact_id) {
    const { data: c } = await supa.schema("equity_brain").from("contacts")
      .select("nome, cargo, telefone_e164").eq("id", contact_id).maybeSingle();
    if (c) {
      contact_name = contact_name ?? c.nome ?? null;
      if (c.cargo) ctx.push(`Cargo do contato: ${c.cargo}`);
    }
  }

  if (mandate_id) {
    const { data: m } = await supa.schema("equity_brain").from("mandates")
      .select("company_cnpj, contato_nome, pipeline_stage, valor_pedido, setor, uf, last_outreach_at, codename")
      .eq("id", mandate_id).maybeSingle();
    if (m) {
      ctx.push(`Deal/Mandato: ${m.codename ?? m.company_cnpj} · setor ${m.setor ?? "?"} · ${m.uf ?? "?"} · stage ${m.pipeline_stage ?? "?"}`);
      if (m.valor_pedido) ctx.push(`Valor do mandato: R$ ${Number(m.valor_pedido).toLocaleString("pt-BR")}`);
      if (m.contato_nome && !contact_name) contact_name = m.contato_nome;
      if (m.last_outreach_at) ctx.push(`Último outreach: ${String(m.last_outreach_at).slice(0, 10)}`);
    }
  }

  if (buyer_id) {
    const { data: b } = await supa.schema("equity_brain").from("buyers")
      .select("nome, vertical_principal, ticket_min, ticket_max")
      .eq("id", buyer_id).maybeSingle();
    if (b) {
      ctx.push(`Buyer: ${b.nome} · vertical ${b.vertical_principal ?? "?"}`);
      if (b.ticket_min || b.ticket_max) {
        ctx.push(`Ticket: ${b.ticket_min ?? "?"} – ${b.ticket_max ?? "?"}`);
      }
    }
  }

  if (contact_name) ctx.unshift(`Falando com: ${contact_name}`);
  if (body.extra_context) ctx.push(`Contexto extra: ${body.extra_context}`);
  return ctx;
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const draft_type: DraftType = (body.draft_type as DraftType) ?? "generic";
  const guide = INTENT_GUIDE[draft_type] ?? INTENT_GUIDE.generic;

  const ctx = await buildContext(supa, body);

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Você redige mensagens de WhatsApp para um advisor de M&A brasileiro. Tom: humano, direto, profissional, no máximo 3 frases curtas (~280 caracteres total), sem assinatura, sem emojis exagerados (máx 1), em PT-BR. Nunca use marcadores nem formatação. Apenas o texto puro.",
        },
        {
          role: "user",
          content: `Contexto:\n${ctx.join("\n") || "(sem contexto extra)"}\n\nObjetivo: ${guide.instruction}\n\nEscreva apenas a mensagem, sem aspas, sem prefixos.`,
        },
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
      draft_type,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(withObservability(handler, { name: "generate-whatsapp-draft" }));
