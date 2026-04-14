import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's JWT to get user id
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { valuationId, lossMetrics, leadScore, leadScoreReason } = body;

    if (!valuationId || !lossMetrics) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate lead score
    if (leadScore && !["hot", "warm", "cold"].includes(leadScore)) {
      return new Response(JSON.stringify({ error: "Invalid leadScore" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read and update
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify ownership
    const { data: valuation, error: fetchError } = await adminClient
      .from("valuation_history")
      .select("id, user_id, result")
      .eq("id", valuationId)
      .single();

    if (fetchError || !valuation) {
      return new Response(JSON.stringify({ error: "Valuation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (valuation.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Merge lossMetrics into existing result JSONB
    const existingResult = (valuation.result as Record<string, unknown>) || {};
    const updatedResult = {
      ...existingResult,
      lossMetrics,
      leadScore: leadScore || null,
      leadScoreReason: leadScoreReason || null,
    };

    const { error: updateError } = await adminClient
      .from("valuation_history")
      .update({ result: updatedResult })
      .eq("id", valuationId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
