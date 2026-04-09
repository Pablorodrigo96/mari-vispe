import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { request_id, lead_data } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get webhook URL from integrations_config
    const { data: config } = await supabase
      .from("integrations_config")
      .select("value")
      .eq("key", "webhook_low_score")
      .eq("active", true)
      .single();

    if (!config?.value) {
      return new Response(
        JSON.stringify({ success: false, reason: "No active webhook configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fire webhook
    const webhookResponse = await fetch(config.value, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "low_score_lead",
        request_id,
        ...lead_data,
        timestamp: new Date().toISOString(),
      }),
    });

    const success = webhookResponse.ok;

    // Log in timeline
    if (request_id) {
      await supabase.from("capital_timeline").insert({
        request_id,
        event_type: "webhook_fired",
        description: success
          ? "Lead enviado para sequência de nutrição"
          : `Falha no webhook: ${webhookResponse.status}`,
      });
    }

    return new Response(
      JSON.stringify({ success, status: webhookResponse.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fire-webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
