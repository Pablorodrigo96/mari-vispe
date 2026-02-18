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
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_KEY");

    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({
          error: "Credenciais do banco externo não configuradas. Adicione EXTERNAL_SUPABASE_URL e EXTERNAL_SUPABASE_KEY nos segredos.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, type } = await req.json();

    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Informe pelo menos 3 caracteres para buscar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    // Detect if query is CNPJ (only digits, 14 chars) or razao social
    const cleanQuery = query.replace(/[.\-\/]/g, "");
    const isCnpj = /^\d{14}$/.test(cleanQuery);

    let companyData = null;

    if (isCnpj) {
      const { data, error } = await externalSupabase
        .from("empresas")
        .select("cnpj, razao_social, nome_fantasia, cnae_principal, cidade, estado, porte, capital_social")
        .eq("cnpj", cleanQuery)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      companyData = data;
    } else {
      const { data, error } = await externalSupabase
        .from("empresas")
        .select("cnpj, razao_social, nome_fantasia, cnae_principal, cidade, estado, porte, capital_social")
        .ilike("razao_social", `%${query.trim()}%`)
        .limit(5);

      if (error) throw error;
      companyData = data && data.length > 0 ? data[0] : null;

      // Return multiple results if searching by name
      if (data && data.length > 1) {
        // Count opportunities for the first result
        let opportunityCount = 0;
        if (data[0]?.cnae_principal && data[0]?.estado) {
          const { count } = await externalSupabase
            .from("empresas")
            .select("id", { count: "exact", head: true })
            .eq("cnae_principal", data[0].cnae_principal)
            .eq("estado", data[0].estado);
          opportunityCount = count || 0;
        }

        return new Response(
          JSON.stringify({
            company: data[0],
            suggestions: data.slice(0, 5),
            opportunities: Math.max(Math.round((opportunityCount || 5) / 10) * 10, 10),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!companyData) {
      return new Response(
        JSON.stringify({ error: "Empresa não encontrada na base de dados." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count opportunities: companies with same CNAE in same state
    let opportunityCount = 0;
    if (companyData.cnae_principal && companyData.estado) {
      const { count } = await externalSupabase
        .from("empresas")
        .select("id", { count: "exact", head: true })
        .eq("cnae_principal", companyData.cnae_principal)
        .eq("estado", companyData.estado);
      opportunityCount = count || 0;
    }

    // Round to nearest 10 for a cleaner number, minimum 10
    const displayOpportunities = Math.max(Math.round((opportunityCount || 5) / 10) * 10, 10);

    return new Response(
      JSON.stringify({
        company: companyData,
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
