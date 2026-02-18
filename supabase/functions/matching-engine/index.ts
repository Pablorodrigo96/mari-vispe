import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Horizontal: related categories (same industry neighborhood)
const RELATED_CATEGORIES: Record<string, string[]> = {
  food: ["commerce", "services"],
  health: ["services", "education"],
  tech: ["services", "telecom"],
  commerce: ["food", "logistics", "services"],
  industry: ["logistics", "commerce"],
  education: ["tech", "services"],
  logistics: ["industry", "commerce"],
  services: ["tech", "health", "education", "food"],
  telecom: ["tech"],
};

// Vertical: value chains (upstream -> downstream)
const VERTICAL_CHAINS: string[][] = [
  ["industry", "food", "commerce"],       // Food chain
  ["tech", "telecom", "services"],        // Tech chain
  ["health", "education", "services"],    // Health chain
  ["logistics", "industry", "commerce"],  // Logistics chain
];

function getHorizontalCategories(category: string): string[] {
  const related = RELATED_CATEGORIES[category] || [];
  return [category, ...related];
}

function getVerticalCategories(category: string): { category: string; distance: number }[] {
  const results: { category: string; distance: number }[] = [];
  const seen = new Set<string>();

  for (const chain of VERTICAL_CHAINS) {
    const idx = chain.indexOf(category);
    if (idx === -1) continue;

    for (let i = 0; i < chain.length; i++) {
      if (i === idx) continue;
      const dist = Math.abs(i - idx);
      const cat = chain[i];
      if (!seen.has(cat)) {
        seen.add(cat);
        results.push({ category: cat, distance: dist });
      }
    }
  }

  return results;
}

function scoreMatch(
  source: { state?: string; city?: string; annual_revenue?: number; asking_price?: number; annual_profit?: number },
  match: any,
  matchType: string,
  sourceCategory: string
) {
  let score = 0;
  let type: "horizontal" | "vertical" = "horizontal";

  if (matchType === "horizontal" || matchType === "all") {
    if (match.category === sourceCategory) {
      score = 50;
    } else if ((RELATED_CATEGORIES[sourceCategory] || []).includes(match.category)) {
      score = 30;
    }
  }

  if (matchType === "vertical" || matchType === "all") {
    const verticals = getVerticalCategories(sourceCategory);
    const vert = verticals.find((v) => v.category === match.category);
    if (vert) {
      const vertScore = vert.distance === 1 ? 35 : 20;
      if (vertScore > score) {
        score = vertScore;
        type = "vertical";
      }
    }
  }

  // Same state
  if (source.state && match.state === source.state) score += 25;
  // Same city
  if (source.city && match.city === source.city) score += 15;

  // Similar revenue
  if (source.annual_revenue && match.annual_revenue) {
    const ratio = Math.min(source.annual_revenue, match.annual_revenue) / Math.max(source.annual_revenue, match.annual_revenue);
    if (ratio > 0.5) score += 10;
  }

  // Similar asking price
  if (source.asking_price && match.asking_price) {
    const ratio = Math.min(source.asking_price, match.asking_price) / Math.max(source.asking_price, match.asking_price);
    if (ratio > 0.3) score += 8;
  }

  // Similar profit margin
  if (source.annual_profit && source.annual_revenue && match.annual_profit && match.annual_revenue) {
    const srcMargin = source.annual_profit / source.annual_revenue;
    const mMargin = match.annual_profit / match.annual_revenue;
    if (Math.abs(srcMargin - mMargin) < 0.15) score += 7;
  }

  return { score, type };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { listingId, category, state, city, annual_revenue, asking_price, annual_profit, filters, matchType = "horizontal" } = await req.json();

    if (!category) {
      return new Response(
        JSON.stringify({ error: "Categoria é obrigatória para o matching." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which categories to query
    let targetCategories: string[] = [];

    if (matchType === "horizontal") {
      targetCategories = getHorizontalCategories(category);
    } else if (matchType === "vertical") {
      const verticals = getVerticalCategories(category);
      targetCategories = verticals.map((v) => v.category);
    } else {
      // all
      const horiz = getHorizontalCategories(category);
      const verticals = getVerticalCategories(category);
      const vertCats = verticals.map((v) => v.category);
      targetCategories = [...new Set([...horiz, ...vertCats])];
    }

    if (targetCategories.length === 0) {
      return new Response(
        JSON.stringify({ matches: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = serviceSupabase
      .from("listings")
      .select("id, title, category, city, state, annual_revenue, annual_profit, asking_price, images, description")
      .eq("status", "active")
      .in("category", targetCategories)
      .limit(50);

    if (listingId) {
      query = query.neq("id", listingId);
    }

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

    const source = { state, city, annual_revenue, asking_price, annual_profit };

    const scored = matches.map((m: any) => {
      const { score, type } = scoreMatch(source, m, matchType, category);
      return { ...m, score, matchType: type };
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
