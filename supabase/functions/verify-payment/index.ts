import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICES = {
  multiples: 9900,
  dcf: 49000,
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
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

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");
    logStep("Session ID received", { session_id });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { 
      status: session.payment_status, 
      mode: session.mode,
      metadata: session.metadata 
    });

    // Verify session belongs to user
    if (session.metadata?.user_id !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    // Check payment status
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const type = session.metadata?.type as "multiples" | "dcf" | "master";

    // Handle one-time payment
    if (session.mode === "payment" && (type === "multiples" || type === "dcf")) {
      // Check if purchase already recorded
      const { data: existingPurchase } = await supabaseClient
        .from("valuation_purchases")
        .select("id")
        .eq("stripe_payment_id", session.id)
        .maybeSingle();

      if (!existingPurchase) {
        // Record the purchase
        const { error: insertError } = await supabaseClient
          .from("valuation_purchases")
          .insert({
            user_id: user.id,
            type: type,
            price_cents: PRICES[type],
            stripe_payment_id: session.id,
            status: "paid",
          });

        if (insertError) {
          logStep("Error inserting purchase", { error: insertError.message });
          throw new Error("Failed to record purchase");
        }
        logStep("Purchase recorded", { type, price: PRICES[type] });
      } else {
        logStep("Purchase already recorded");
      }
    }

    // Handle subscription
    if (session.mode === "subscription" && type === "master") {
      // Subscription will be synced via check-subscription
      logStep("Master subscription payment verified");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      type,
      mode: session.mode,
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
