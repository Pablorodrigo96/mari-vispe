import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs from Stripe
const PRICE_IDS = {
  multiples: "price_1Ss7q7EhuySaiYhflZLxeMHQ",
  dcf: "price_1Ss7qSEhuySaiYhf8pwdEjHV",
  master: "price_1Ss7r9EhuySaiYhfj2KQx23b",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Get request body
    const { type } = await req.json();
    if (!type || !["multiples", "dcf", "master"].includes(type)) {
      throw new Error("Invalid type. Must be 'multiples', 'dcf', or 'master'");
    }
    logStep("Request type", { type });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      // Create new customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = newCustomer.id;
      logStep("Created new Stripe customer", { customerId });

      // Save customer ID to profile
      await supabaseClient
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // Determine mode and price
    const isSubscription = type === "master";
    const priceId = PRICE_IDS[type as keyof typeof PRICE_IDS];
    
    const origin = req.headers.get("origin") || "https://lovable.dev";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=${type}`,
      cancel_url: `${origin}/valuation`,
      metadata: {
        user_id: user.id,
        type: type,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
