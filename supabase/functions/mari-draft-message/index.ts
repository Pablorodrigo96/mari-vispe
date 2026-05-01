// mari-draft-message — Gera rascunho de mensagem WhatsApp contextual
// para um buyer/contato/deal. Mais leve que summarize-deal, sem cache.
//
// Body: { mandate_id?: string, buyer_id?: string, contact_name?: string, intent?: 'cold_outreach' | 'follow_up' | 'reminder' | 'thanks' }

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

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));
  const { mandate_id, buyer_id, contact_name, intent = "follow_up" } = body;

  // Build minimal context
  const ctx: string[] = [];
  if (mandate_id) {
    const { data: m } = await supa.schema("equity_brain").from("mandates")
      .select("company_cnpj, contato_nome, pipeline_stage, valor_pedido, setor, uf, last_outreach_at")
      .eq("id", mandate_id).maybeSingle();
    if (m) {
      ctx.push(`Deal: ${m.company_cnpj} · ${m.setor ?? "?"} · ${m.pipeline_stage ?? "?"}`);
      if (m.valor_pedido) ctx.push(`Valor: R$ ${Number(m.valor_pedido).toLocaleString("pt-BR")}`);
      if (m.contato_nome && !contact_name) ctx.push(`Contato: ${m.contato_nome}`);
      if (m.last_outreach_at) ctx.push(`Último outreach: ${m.last_outreach_at.slice(0, 10)}`);
    }
  }
  if (buyer_id) {
    const { data: b } = await supa.schema("equity_brain").from("buyers")
      .select("nome, vertical_principal, ticket_min, ticket_max").eq("id", buyer_id).maybeSingle();
    if (b) ctx.push(`Buyer: ${b.nome} · ${b.vertical_principal ?? "?"}`);
  }
  if (contact_name) ctx.push(`Falando com: ${contact_name}`);

  const intentMap: Record<string, string> = {
    cold_outreach: "primeira abordagem (cold outreach), seja respeitoso e direto sobre o motivo do contato",
    follow_up: "follow-up de conversa anterior, soar natural sem cobrar",
    reminder: "lembrete educado de pendência",
    thanks: "agradecimento curto após reunião/etapa",
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: "Você redige mensagens de WhatsApp para um advisor de M&A brasileiro. Tom: humano, direto, profissional, no máximo 240 caracteres, sem assinatura, sem emojis exagerados (máx 1), em PT-BR." },
        { role: "user", content: `Contexto:\n${ctx.join("\n") || "(sem contexto extra)"}\n\nObjetivo: ${intentMap[intent] ?? intent}\n\nEscreva apenas a mensagem, sem aspas.` },
      ],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI Gateway ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const message = data.choices?.[0]?.message?.content?.trim() ?? "";

  return new Response(JSON.stringify({ message, model: MODEL }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(withObservability(handler, { name: "mari-draft-message" }));
