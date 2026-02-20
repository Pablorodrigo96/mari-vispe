import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { RF_MUNICIPIOS } from "./rf-municipios.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// CNAE prefix → Vispe category
const CNAE_TO_VISPE: Record<string, string> = {
  "01": "commerce", "02": "commerce", "03": "commerce",
  "05": "industry", "06": "industry", "07": "industry", "08": "industry", "09": "industry",
  "10": "industry", "11": "industry", "12": "industry", "13": "industry", "14": "industry",
  "15": "industry", "16": "industry", "17": "industry", "18": "industry", "19": "industry",
  "20": "industry", "21": "health", "22": "industry", "23": "industry", "24": "industry",
  "25": "industry", "26": "tech", "27": "industry", "28": "industry", "29": "industry",
  "30": "industry", "31": "industry", "32": "industry", "33": "industry",
  "35": "industry", "36": "services", "37": "services", "38": "services", "39": "services",
  "41": "services", "42": "services", "43": "services",
  "45": "commerce", "46": "commerce", "47": "commerce",
  "49": "logistics", "50": "logistics", "51": "logistics", "52": "logistics", "53": "logistics",
  "55": "food", "56": "food",
  "58": "tech", "59": "tech",
  "60": "telecom", "61": "telecom",
  "62": "tech", "63": "tech",
  "64": "services", "65": "services", "66": "services", "68": "services", "69": "services", "70": "services",
  "71": "tech", "72": "tech", "73": "tech", "74": "tech",
  "75": "health",
  "77": "commerce", "78": "services", "79": "commerce",
  "80": "services", "81": "services", "82": "services",
  "84": "services",
  "85": "education",
  "86": "health", "87": "health", "88": "health",
  "90": "services", "91": "services", "92": "services", "93": "services",
  "94": "services", "95": "tech", "96": "services", "97": "services", "99": "services",
};

function mapCnaeToVispe(cnae: string | null): string {
  if (!cnae) return "services";
  const prefix = String(cnae).substring(0, 2);
  return CNAE_TO_VISPE[prefix] || "services";
}

function mapPorteToSize(porte: string | null): string {
  if (!porte) return "Pequena";
  const p = porte.trim();
  if (p === "00") return "Não informado";
  if (p === "01") return "Micro Empresa";
  if (p === "03") return "Pequena Empresa";
  if (p === "05") return "Demais";
  return "Pequena";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth validation ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // --- Parse request ---
    const body = await req.json();
    const { type, query, cnpj, state, category, limit = 30 } = body;

    // --- CNPJ lookup: allowed for all authenticated users ---
    if (type === "cnpj") {
      if (!cnpj) {
        return new Response(JSON.stringify({ error: "cnpj required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cleanCnpj = cnpj.replace(/\D/g, "");
      if (cleanCnpj.length < 14) {
        return new Response(JSON.stringify({ company: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const EXTERNAL_DB_URL = Deno.env.get("EXTERNAL_DB_URL");
      if (!EXTERNAL_DB_URL) throw new Error("EXTERNAL_DB_URL not configured");

      const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
      const client = new Client(EXTERNAL_DB_URL);
      await client.connect();

      const cnpjBasico = cleanCnpj.substring(0, 8);
      const cnpjOrdem = cleanCnpj.substring(8, 12);
      const cnpjDv = cleanCnpj.substring(12, 14);

      const result = await client.queryObject({
        text: `
          SELECT e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj_completo,
            e.nome_fantasia, e.cnae_fiscal_principal, e.uf, e.municipio, e.situacao_cadastral,
            em.razao_social, em.capital_social, em.porte_empresa
          FROM estabelecimentos e
          INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
          WHERE e.cnpj_basico = $1 AND e.cnpj_ordem = $2 AND e.cnpj_dv = $3
          LIMIT 1
        `,
        args: [cnpjBasico, cnpjOrdem, cnpjDv],
      });

      await client.end();

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ company: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const row = result.rows[0] as any;
      const municipioCod = String(row.municipio || "");
      const cityName = RF_MUNICIPIOS[municipioCod] || municipioCod;

      return new Response(JSON.stringify({
        company: {
          razao_social: row.razao_social || "",
          nome_fantasia: row.nome_fantasia || "",
          cnae: row.cnae_fiscal_principal || "",
          category: mapCnaeToVispe(row.cnae_fiscal_principal),
          city: cityName,
          state: row.uf || "",
          porte: mapPorteToSize(row.porte_empresa),
          capital_social: parseFloat(row.capital_social) || null,
          situacao_cadastral: row.situacao_cadastral,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Search/sector: requires paid plan or admin ---
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Check if admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!roleData;

    if (!isAdmin) {
      const { data: subData } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      const hasPaidPlan = subData && subData.plan !== "free";

      if (!hasPaidPlan) {
        return new Response(JSON.stringify({ error: "Plano pago necessário", code: "PAID_PLAN_REQUIRED" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- National search ---
    const EXTERNAL_DB_URL = Deno.env.get("EXTERNAL_DB_URL");
    if (!EXTERNAL_DB_URL) throw new Error("EXTERNAL_DB_URL not configured");

    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(EXTERNAL_DB_URL);
    await client.connect();

    const conditions: string[] = ["e.situacao_cadastral = '02'"]; // ATIVA
    const params: string[] = [];

    if (state) {
      params.push(state.toUpperCase());
      conditions.push(`e.uf = $${params.length}`);
    }

    if (type === "search" && query) {
      params.push(`%${query.toUpperCase()}%`);
      conditions.push(`(em.razao_social ILIKE $${params.length} OR e.nome_fantasia ILIKE $${params.length})`);
    }

    if (type === "sector" && category) {
      // Map Vispe category back to CNAE prefixes
      const matchingPrefixes = Object.entries(CNAE_TO_VISPE)
        .filter(([, cat]) => cat === category)
        .map(([prefix]) => prefix);

      if (matchingPrefixes.length > 0) {
        const cnaeLikes = matchingPrefixes.map((p) => `e.cnae_fiscal_principal LIKE '${p}%'`).join(" OR ");
        conditions.push(`(${cnaeLikes})`);
      }
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const effectiveLimit = Math.min(limit, 50);

    const result = await client.queryObject({
      text: `
        SELECT DISTINCT ON (e.cnpj_basico)
          e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj_completo,
          e.nome_fantasia, e.cnae_fiscal_principal, e.uf, e.municipio,
          em.razao_social, em.capital_social, em.porte_empresa
        FROM estabelecimentos e
        INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
        ${whereClause}
        ORDER BY e.cnpj_basico, em.capital_social DESC NULLS LAST
        LIMIT ${effectiveLimit * 8}
      `,
      args: params,
    });

    await client.end();

    const companies = (result.rows as any[]).slice(0, effectiveLimit).map((row) => {
      const cnpjFull = String(row.cnpj_completo || "").replace(/\D/g, "");
      const capitalSocial = parseFloat(row.capital_social) || null;
      const municipioCod = String(row.municipio || "");
      const cityName = RF_MUNICIPIOS[municipioCod] || municipioCod;

      return {
        cnpj: cnpjFull,
        razao_social: row.razao_social || "Empresa sem nome",
        nome_fantasia: row.nome_fantasia || "",
        cnae: row.cnae_fiscal_principal || "",
        category: mapCnaeToVispe(row.cnae_fiscal_principal),
        city: cityName,
        state: row.uf || "",
        porte: mapPorteToSize(row.porte_empresa),
        capital_social: capitalSocial,
        location: `${cityName}${row.uf ? `, ${row.uf}` : ""}`,
      };
    });

    return new Response(
      JSON.stringify({ companies, total: companies.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("national-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
