import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product IDs for tier identification
const PRODUCT_IDS = {
  master: "prod_TpnSqxLXzIjX2z",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let subscriptionId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product as string;
      logStep("Active subscription found", { subscriptionId, productId, endDate: subscriptionEnd });

      // Sync subscription to database
      const isMaster = productId === PRODUCT_IDS.master;
      
      // Check if subscription exists in DB
      const { data: existingSub } = await supabaseClient
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingSub) {
        // Update existing subscription
        await supabaseClient
          .from("subscriptions")
          .update({
            plan: isMaster ? "master" : "free",
            stripe_subscription_id: subscriptionId,
            multiples_limit: isMaster ? 5 : 1,
            dcf_limit: isMaster ? 3 : 0,
            expires_at: subscriptionEnd,
          })
          .eq("id", existingSub.id);
        logStep("Updated existing subscription in DB");
      } else {
        // Create new subscription record
        await supabaseClient
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan: isMaster ? "master" : "free",
            status: "active",
            stripe_subscription_id: subscriptionId,
            multiples_limit: isMaster ? 5 : 1,
            multiples_used: 0,
            dcf_limit: isMaster ? 3 : 0,
            dcf_used: 0,
            expires_at: subscriptionEnd,
          });
        logStep("Created new subscription in DB");
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
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
