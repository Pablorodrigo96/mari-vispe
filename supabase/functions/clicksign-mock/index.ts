// Clicksign MOCK — Bloco 1.4
// Simula request de assinatura e webhook de callback.
// Trocar por integração real (CLICKSIGN_API_KEY) na Fase 2.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supaUrl, serviceKey);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const action = body?.action;

  // --- 1) request-signature ---
  if (action === "request-signature") {
    const documentId = body?.document_id as string | undefined;
    if (!documentId) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestId = `mock_${crypto.randomUUID()}`;
    const signingUrl = `https://mock.clicksign.local/sign/${requestId}`;

    const { error } = await admin
      .from("deal_documents")
      .update({
        status: "pending_signature",
        signature_provider: "clicksign_mock",
        signature_request_id: requestId,
        signing_url: signingUrl,
      })
      .eq("id", documentId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        signature_request_id: requestId,
        signing_url: signingUrl,
        provider: "clicksign_mock",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- 2) simulate-sign (dev helper; webhook real seria POST de Clicksign) ---
  if (action === "simulate-sign") {
    const documentId = body?.document_id as string | undefined;
    const signedBy = (body?.signed_by as string | undefined) ?? "mock_signer";
    if (!documentId) {
      return new Response(JSON.stringify({ error: "document_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await admin
      .from("deal_documents")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        signed_by: signedBy,
      })
      .eq("id", documentId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, status: "signed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
