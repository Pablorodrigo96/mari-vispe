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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check external credentials
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_KEY");

    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({
          error: "Credenciais do banco externo não configuradas.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { cnpj, cnae_principal, estado, cidade, capital_social, filters } = await req.json();

    if (!cnae_principal) {
      return new Response(
        JSON.stringify({ error: "CNAE principal é obrigatório para o matching." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Build query - primary: same CNAE
    let query = externalSupabase
      .from("empresas")
      .select("cnpj, razao_social, nome_fantasia, cnae_principal, cidade, estado, porte, capital_social")
      .eq("cnae_principal", cnae_principal)
      .limit(50);

    // Exclude the searching company itself
    if (cnpj) {
      query = query.neq("cnpj", cnpj.replace(/[.\-\/]/g, ""));
    }

    // Apply filters
    if (filters?.estado) {
      query = query.eq("estado", filters.estado);
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
      let score = 50; // Base score for same CNAE

      // Same state bonus
      if (estado && m.estado === estado) score += 25;

      // Same city bonus
      if (cidade && m.cidade === cidade) score += 15;

      // Similar capital social bonus
      if (capital_social && m.capital_social) {
        const ratio = Math.min(capital_social, m.capital_social) / Math.max(capital_social, m.capital_social);
        if (ratio > 0.5) score += 10;
      }

      return { ...m, score };
    });

    // Sort by score descending, limit to 20
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
