// whatsapp-webhook
// Endpoint genérico Meta WhatsApp Cloud — modo MOCK (Fase 2).
// GET: validação de webhook (hub.challenge).
// POST: registra payload em mari_ops e atualiza contadores. Captura/parse de
// mensagens reais entra na Fase 3.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(withObservability(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const svc = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const reqUrl = new URL(req.url);
  const advisor_id = reqUrl.searchParams.get("advisor_id");

  /* -------- GET: webhook verification -------- */
  if (req.method === "GET") {
    const mode = reqUrl.searchParams.get("hub.mode");
    const token = reqUrl.searchParams.get("hub.verify_token");
    const challenge = reqUrl.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !token || !advisor_id) {
      return new Response("bad request", { status: 400 });
    }

    const { data: cfg } = await svc
      .from("advisor_whatsapp_config")
      .select("verify_token")
      .eq("advisor_id", advisor_id)
      .maybeSingle();

    if (!cfg || cfg.verify_token !== token) {
      return new Response("forbidden", { status: 403 });
    }
    return new Response(challenge ?? "", { status: 200 });
  }

  /* -------- POST: incoming message -------- */
  if (req.method === "POST") {
    let payload: unknown = null;
    try {
      payload = await req.json();
    } catch {
      payload = null;
    }

    if (advisor_id) {
      // Atualiza contador. Idempotente o suficiente pra Fase 2.
      const { data: cfg } = await svc
        .from("advisor_whatsapp_config")
        .select("id, total_messages_captured")
        .eq("advisor_id", advisor_id)
        .maybeSingle();

      if (cfg) {
        await svc.from("advisor_whatsapp_config").update({
          last_message_received_at: new Date().toISOString(),
          total_messages_captured: (cfg.total_messages_captured ?? 0) + 1,
        }).eq("id", cfg.id);
      }
    }

    // Log payload preview pra debug
    console.log(
      "[whatsapp-webhook] inbound advisor=%s payload=%s",
      advisor_id,
      JSON.stringify(payload).slice(0, 500),
    );

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("method not allowed", { status: 405 });
}, { name: "whatsapp-webhook" }));
