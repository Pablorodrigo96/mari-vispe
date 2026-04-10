import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[USE-VALUATION-CREDIT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { type } = await req.json();
    if (type !== "multiples" && type !== "dcf") {
      throw new Error("Invalid type. Must be 'multiples' or 'dcf'.");
    }
    logStep("Credit type", { type });

    // Check if user is admin (unlimited access)
    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminCheck) {
      logStep("Admin bypass — no credit consumed");
      return new Response(JSON.stringify({ success: true, source: "admin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (subError) {
      logStep("Error fetching subscription", { error: subError.message });
      throw new Error("Failed to fetch subscription");
    }

    // Try plan credits first
    if (subscription) {
      const usedField = type === "multiples" ? "multiples_used" : "dcf_used";
      const limitField = type === "multiples" ? "multiples_limit" : "dcf_limit";
      const used = subscription[usedField] || 0;
      const limit = subscription[limitField] || 0;

      if (used < limit) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({ [usedField]: used + 1 })
          .eq("id", subscription.id);

        if (updateError) {
          logStep("Error updating subscription", { error: updateError.message });
          throw new Error("Failed to consume plan credit");
        }

        logStep("Plan credit consumed", { type, used: used + 1, limit });
        return new Response(JSON.stringify({ success: true, source: "plan" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Try purchase credits
    const { data: purchase, error: purchaseError } = await supabase
      .from("valuation_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", type)
      .eq("status", "paid")
      .is("used_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (purchaseError) {
      logStep("Error fetching purchase", { error: purchaseError.message });
      throw new Error("Failed to fetch purchases");
    }

    if (purchase) {
      const { error: markError } = await supabase
        .from("valuation_purchases")
        .update({ used_at: new Date().toISOString() })
        .eq("id", purchase.id);

      if (markError) {
        logStep("Error marking purchase", { error: markError.message });
        throw new Error("Failed to consume purchase credit");
      }

      logStep("Purchase credit consumed", { type, purchaseId: purchase.id });
      return new Response(JSON.stringify({ success: true, source: "purchase" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No credits available
    logStep("No credits available");
    return new Response(JSON.stringify({ success: false, error: "No credits available" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 403,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
