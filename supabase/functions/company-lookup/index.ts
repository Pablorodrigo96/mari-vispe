import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { query } = await req.json();

    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Informe pelo menos 3 caracteres para buscar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchTerm = query.trim();

    // Search active listings by title, category, or city
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, category, city, state, annual_revenue, annual_profit, asking_price, images, description")
      .eq("status", "active")
      .or(`title.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
      .limit(5);

    if (error) throw error;

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum negócio encontrado com esse termo." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listing = data[0];

    // Count opportunities: listings with same category
    let opportunityCount = 0;
    if (listing.category) {
      const { count } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("category", listing.category)
        .neq("id", listing.id);
      opportunityCount = count || 0;
    }

    const displayOpportunities = Math.max(opportunityCount, 1);

    return new Response(
      JSON.stringify({
        listing: listing,
        suggestions: data.slice(0, 5),
        opportunities: displayOpportunities,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("company-lookup error:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao consultar base de dados." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
