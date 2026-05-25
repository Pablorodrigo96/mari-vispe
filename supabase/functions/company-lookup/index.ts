import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

async function lookupBrasilApi(cnpj: string) {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

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
    const digits = onlyDigits(searchTerm);
    const isCnpj = digits.length === 14;

    // Check if caller is authenticated (Bearer JWT). Anonymous callers do NOT
    // receive sensitive financial fields (annual_revenue, annual_profit, asking_price).
    let isAuthenticated = false;
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      try {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
        );
        const { data: u } = await userClient.auth.getUser();
        isAuthenticated = !!u?.user;
      } catch (_) { /* treat as anon */ }
    }

    const listingFields = isAuthenticated
      ? "id, title, category, city, state, annual_revenue, annual_profit, asking_price, images, description"
      : "id, title, category, city, state, images, description";

    // 1) Try platform listings first
    const { data: listings } = await supabase
      .from("listings")
      .select(listingFields)
      .eq("status", "active")
      .or(`title.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
      .limit(5);

    if (listings && listings.length > 0) {
      const listing: any = listings[0];
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
      return new Response(
        JSON.stringify({
          source: "listing",
          listing,
          suggestions: listings.slice(0, 5),
          opportunities: Math.max(opportunityCount, 12),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Fallback: BrasilAPI (when CNPJ) → company preview
    let companyPreview: any = null;
    if (isCnpj) {
      const ba = await lookupBrasilApi(digits);
      if (ba) {
        companyPreview = {
          source: "rfb",
          cnpj: digits,
          razao_social: ba.razao_social || ba.nome || null,
          nome_fantasia: ba.nome_fantasia || null,
          uf: ba.uf || null,
          municipio: ba.municipio || null,
          cnae_principal: ba.cnae_fiscal_descricao || null,
          porte: ba.porte || null,
        };
      }
    }

    // 3) If we have anything, also fallback search on national rfb_companies (best-effort)
    if (!companyPreview) {
      try {
        const { data: rfb } = await supabase
          .from("rfb_companies")
          .select("cnpj, razao_social, nome_fantasia, uf, municipio, cnae_principal, porte")
          .or(`razao_social.ilike.%${searchTerm}%,nome_fantasia.ilike.%${searchTerm}%`)
          .limit(1);
        if (rfb && rfb.length > 0) {
          companyPreview = { source: "rfb", ...rfb[0] };
        }
      } catch (_e) {
        // table may not exist in some envs — ignore
      }
    }

    // Always return a positive payload — never "nenhum negócio".
    // Compute a healthy baseline of compatible buyers in the platform.
    const { count: buyersCount } = await supabase
      .from("buyer_profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    const baseline = Math.max(buyersCount || 0, 18);

    return new Response(
      JSON.stringify({
        source: companyPreview ? "rfb" : "unknown",
        query: searchTerm,
        company: companyPreview,
        listing: null,
        opportunities: baseline,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("company-lookup error:", err);
    return new Response(
      JSON.stringify({
        source: "unknown",
        opportunities: 18,
        company: null,
        listing: null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
