import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { entity_type, entity_id, kind, content, meta } = body ?? {};

    if (!entity_type || !entity_id || !kind) {
      return new Response(
        JSON.stringify({ error: "entity_type, entity_id and kind required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin
      .schema("equity_brain")
      .from("crm_activities")
      .insert({
        entity_type,
        entity_id,
        kind,
        content: content ?? null,
        meta: meta ?? {},
        actor_id: userData.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Mirror as deal_event for adaptive learning when applicable
    const learnableKinds = new Set([
      "interest_marked",
      "teaser_sent",
      "match_dismissed",
      "whatsapp_sent",
      "status_changed",
    ]);
    if (entity_type === "buyer" && learnableKinds.has(kind)) {
      await admin
        .schema("equity_brain")
        .from("deal_events")
        .insert({
          buyer_id: entity_id,
          event_type: kind,
          payload: meta ?? {},
        })
        .then(() => {})
        .catch(() => {});
    }

    return new Response(JSON.stringify({ activity: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
