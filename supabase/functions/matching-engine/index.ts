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
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login para acessar." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { listingId, category, state, city, annual_revenue, filters } = await req.json();

    if (!category) {
      return new Response(
        JSON.stringify({ error: "Categoria é obrigatória para o matching." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to read all active listings
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = serviceSupabase
      .from("listings")
      .select("id, title, category, city, state, annual_revenue, annual_profit, asking_price, images, description")
      .eq("status", "active")
      .eq("category", category)
      .limit(50);

    // Exclude the source listing
    if (listingId) {
      query = query.neq("id", listingId);
    }

    // Apply filters
    if (filters?.estado) {
      query = query.eq("state", filters.estado);
    }

    const { data: matches, error } = await query;
    if (error) throw error;

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Score and rank matches
    const scored = matches.map((m: any) => {
      let score = 50; // Base score for same category

      // Same state bonus
      if (state && m.state === state) score += 25;

      // Same city bonus
      if (city && m.city === city) score += 15;

      // Similar revenue bonus
      if (annual_revenue && m.annual_revenue) {
        const ratio = Math.min(annual_revenue, m.annual_revenue) / Math.max(annual_revenue, m.annual_revenue);
        if (ratio > 0.5) score += 10;
      }

      return { ...m, score };
    });

    scored.sort((a: any, b: any) => b.score - a.score);
    const topMatches = scored.slice(0, 20);

    return new Response(
      JSON.stringify({
        matches: topMatches,
        total: matches.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("matching-engine error:", err);
    return new Response(
      JSON.stringify({ error: "Erro ao processar matching." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
