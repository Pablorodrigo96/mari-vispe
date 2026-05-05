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
  if (p === "03") return "Pequena Empresa (EPP)";
  if (p === "05") return "Demais";
  return "Pequena";
}

// Situação cadastral (RFB)
const SITUACAO_MAP: Record<string, string> = {
  "01": "Nula", "02": "Ativa", "03": "Suspensa",
  "04": "Inapta", "08": "Baixada",
};

// Naturezas jurídicas mais comuns (top ~30 — cobrem >95% das empresas privadas)
const NATUREZA_MAP: Record<string, string> = {
  "2062": "Sociedade Empresária Limitada (LTDA)",
  "2305": "Sociedade Anônima Aberta (SA)",
  "2240": "Sociedade Simples Limitada",
  "2143": "Empresário (Individual)",
  "2135": "Empresa Individual de Responsabilidade Limitada (EIRELI)",
  "2127": "Sociedade em Conta de Participação",
  "2046": "Sociedade Anônima Fechada",
  "2305": "Sociedade Anônima Aberta",
  "2330": "Empresa Individual de Resp. Ltda. (Natureza Empresária)",
  "2348": "Microempreendedor Individual (MEI)",
  "2305": "Sociedade Anônima Aberta",
  "2070": "Sociedade Empresária em Comandita Simples",
  "2089": "Sociedade Empresária em Comandita por Ações",
  "2100": "Sociedade Mercantil de Capital e Indústria",
  "2240": "Sociedade Simples Limitada",
  "2259": "Sociedade Simples Pura",
  "2267": "Sociedade Simples em Nome Coletivo",
  "2275": "Sociedade Simples em Comandita Simples",
  "2283": "Empresa Binacional",
  "2291": "Consórcio de Sociedades",
  "2313": "Empresa Domiciliada no Exterior",
  "2321": "Clube/Fundo de Investimento",
  "2046": "Sociedade Anônima Fechada",
  "1015": "Órgão Público do Poder Executivo Federal",
  "1023": "Órgão Público do Poder Executivo Estadual",
  "1031": "Órgão Público do Poder Executivo Municipal",
  "1244": "Empresa Pública",
  "1252": "Sociedade de Economia Mista",
  "2038": "Sociedade de Economia Mista",
  "1333": "Fundo Público",
  "3034": "Serviço Notarial e Registral",
  "3069": "Fundação Privada",
  "3204": "Associação Privada",
};

function decodeSituacao(s: string | null): string {
  if (!s) return "";
  return SITUACAO_MAP[s.trim()] || s;
}

function decodeNatureza(code: string | null): string {
  if (!code) return "";
  return NATUREZA_MAP[code.trim()] || `Código ${code}`;
}

// "20210302" → "2021-03-02"
function parseRfDate(d: string | null): string | null {
  if (!d) return null;
  const s = String(d).trim();
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
}

function yearsSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

function formatPhone(raw: string | null): string {
  if (!raw) return "";
  const s = raw.replace(/\D/g, "");
  if (!s) return "";
  // Receita stores telefone_formatado already nice; but raw fallback:
  if (s.length === 10) return `(${s.slice(0,2)}) ${s.slice(2,6)}-${s.slice(6)}`;
  if (s.length === 11) return `(${s.slice(0,2)}) ${s.slice(2,7)}-${s.slice(7)}`;
  return raw;
}

const CACHE_TTL_DAYS = 30;

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

      // --- Cache check (30 days) ---
      const supabaseAdminCache = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } }
      );

      const { data: cached } = await supabaseAdminCache
        .from("cnpj_cache")
        .select("data, cached_at")
        .eq("cnpj", cleanCnpj)
        .maybeSingle();

      if (cached) {
        const ageDays = (Date.now() - new Date(cached.cached_at).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays < CACHE_TTL_DAYS) {
          return new Response(JSON.stringify({ company: cached.data, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const EXTERNAL_DB_URL = Deno.env.get("EXTERNAL_DB_URL");
      if (!EXTERNAL_DB_URL) throw new Error("EXTERNAL_DB_URL not configured");

      const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
      const client = new Client(EXTERNAL_DB_URL);
      await client.connect();

      const cnpjBasico = cleanCnpj.substring(0, 8);
      const cnpjOrdem = cleanCnpj.substring(8, 12);
      const cnpjDv = cleanCnpj.substring(12, 14);

      // Query base tables for full raw data (view doesn't expose all fields)
      const result = await client.queryObject({
        text: `
          SELECT
            e.cnpj_basico, e.cnpj_ordem, e.cnpj_dv,
            e.identificador_matriz_filial, e.nome_fantasia,
            e.situacao_cadastral, e.data_situacao_cadastral, e.data_inicio_atividade,
            e.cnae_fiscal_principal, e.cnae_fiscal_secundaria,
            e.tipo_logradouro, e.logradouro, e.numero, e.complemento,
            e.bairro, e.cep, e.uf, e.municipio,
            e.ddd_1, e.telefone_1, e.ddd_2, e.telefone_2,
            e.correio_eletronico,
            em.razao_social, em.capital_social, em.porte_empresa,
            em.natureza_juridica, em.ente_federativo,
            cn.descricao AS cnae_descricao
          FROM estabelecimentos e
          INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
          LEFT JOIN cnaes cn ON cn.codigo = e.cnae_fiscal_principal
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

      const dataAbertura = parseRfDate(row.data_inicio_atividade);
      const dataSituacao = parseRfDate(row.data_situacao_cadastral);

      // Build address
      const addressParts = [
        row.tipo_logradouro, row.logradouro,
      ].filter(Boolean).join(" ");
      const fullStreet = addressParts || "";

      // Phone (DDD + número)
      const tel1 = row.ddd_1 && row.telefone_1 ? `${row.ddd_1}${row.telefone_1}` : "";
      const tel2 = row.ddd_2 && row.telefone_2 ? `${row.ddd_2}${row.telefone_2}` : "";
      const phone = formatPhone(tel1) || formatPhone(tel2);

      // CNAEs secundários (string separada por vírgula no formato "1234567,2345678")
      const cnaeSecundarios = row.cnae_fiscal_secundaria
        ? String(row.cnae_fiscal_secundaria).split(",").map((c: string) => c.trim()).filter(Boolean)
        : [];

      const company = {
        // Identification
        cnpj: cleanCnpj,
        razao_social: row.razao_social || "",
        nome_fantasia: row.nome_fantasia || "",
        is_matriz: row.identificador_matriz_filial === "1",

        // Status
        situacao_codigo: row.situacao_cadastral || "",
        situacao: decodeSituacao(row.situacao_cadastral),
        situacao_data: dataSituacao,

        // Dates
        data_abertura: dataAbertura,
        idade_anos: yearsSince(dataAbertura),
        foundation_year: dataAbertura ? parseInt(dataAbertura.slice(0, 4)) : null,

        // Legal
        natureza_juridica_codigo: row.natureza_juridica || "",
        natureza_juridica_descricao: decodeNatureza(row.natureza_juridica),
        porte_codigo: row.porte_empresa || "",
        porte: mapPorteToSize(row.porte_empresa),
        capital_social: parseFloat(row.capital_social) || null,
        ente_federativo: row.ente_federativo || null,

        // Activity
        cnae: row.cnae_fiscal_principal || "",
        cnae_principal_codigo: row.cnae_fiscal_principal || "",
        cnae_principal_descricao: row.cnae_descricao || "",
        cnae_secundarios: cnaeSecundarios,
        category: mapCnaeToVispe(row.cnae_fiscal_principal),

        // Address
        tipo_logradouro: row.tipo_logradouro || "",
        logradouro: row.logradouro || "",
        street: fullStreet,
        numero: row.numero || "",
        complemento: row.complemento || "",
        neighborhood: row.bairro || "",
        bairro: row.bairro || "",
        cep: row.cep || "",
        city: cityName,
        municipio_codigo: municipioCod,
        state: row.uf || "",
        uf: row.uf || "",
        endereco_completo: [
          fullStreet, row.numero, row.complemento, row.bairro,
          cityName, row.uf, row.cep ? `CEP ${row.cep}` : null,
        ].filter(Boolean).join(", "),

        // Contact
        phone,
        telefone: phone,
        email: row.correio_eletronico || "",
      };

      // --- BrasilAPI fallback enrichment (QSA + Simples/MEI) ---
      // Only enriches if the local DB doesn't have these (currently never has).
      let enrichedCompany: any = company;
      try {
        const { data: cfg } = await supabaseAdminCache
          .from("integrations_config")
          .select("value, active")
          .eq("key", "brasilapi_fallback_enabled")
          .maybeSingle();

        const fallbackEnabled = cfg?.active && cfg?.value === "true";

        if (fallbackEnabled) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          try {
            const baResp = await fetch(
              `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
              { signal: controller.signal, headers: { "Accept": "application/json" } }
            );
            clearTimeout(timeoutId);

            if (baResp.ok) {
              const ba = await baResp.json();
              const socios = Array.isArray(ba.qsa)
                ? ba.qsa.map((s: any) => ({
                    nome: s.nome_socio || "",
                    qualificacao: s.qualificacao_socio || "",
                    data_entrada: s.data_entrada_sociedade || "",
                    cpf_cnpj: s.cnpj_cpf_do_socio || undefined,
                    faixa_etaria: s.faixa_etaria || undefined,
                  }))
                : [];

              enrichedCompany = {
                ...company,
                socios,
                regime_tributario: {
                  simples: !!ba.opcao_pelo_simples,
                  data_opcao_simples: ba.data_opcao_pelo_simples || undefined,
                  mei: !!ba.opcao_pelo_mei,
                  data_opcao_mei: ba.data_opcao_pelo_mei || undefined,
                },
                data_source_qsa: socios.length > 0 ? "brasilapi" : "unavailable",
                data_source_simples: "brasilapi",
              };
            } else {
              enrichedCompany = {
                ...company,
                data_source_qsa: "unavailable",
                data_source_simples: "unavailable",
              };
            }
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            console.warn("BrasilAPI fallback failed:", fetchErr instanceof Error ? fetchErr.message : fetchErr);
            enrichedCompany = {
              ...company,
              data_source_qsa: "unavailable",
              data_source_simples: "unavailable",
            };
          }
        }
      } catch (cfgErr) {
        console.warn("BrasilAPI config check failed:", cfgErr);
      }

      // Save to cache (best-effort, ignore errors)
      supabaseAdminCache
        .from("cnpj_cache")
        .upsert({ cnpj: cleanCnpj, data: enrichedCompany, cached_at: new Date().toISOString() })
        .then(() => {})
        .catch((err) => console.error("cnpj_cache upsert failed:", err));

      return new Response(JSON.stringify({ company: enrichedCompany, cached: false }), {
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
    if (!EXTERNAL_DB_URL) {
      return new Response(
        JSON.stringify({ companies: [], total: 0, degraded: true, reason: "rfb_db_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Diagnostic: log parsed connection (no full password) to detect issues
    let parsedPwPrefix = "";
    let parsedPwSuffix = "";
    try {
      const u = new URL(EXTERNAL_DB_URL);
      const decoded = decodeURIComponent(u.password || "");
      parsedPwPrefix = decoded.slice(0, 2);
      parsedPwSuffix = decoded.slice(-2);
      console.log("national-search: RFB conn target", {
        protocol: u.protocol,
        user: u.username,
        host: u.hostname,
        port: u.port,
        db: u.pathname,
        passwordLen: decoded.length,
        passwordPrefix: parsedPwPrefix,
        passwordSuffix: parsedPwSuffix,
        passwordHasSpecial: /[@#:/?&%+ ]/.test(decoded),
        sslmode: u.searchParams.get("sslmode"),
      });
    } catch (parseErr) {
      console.error("national-search: EXTERNAL_DB_URL not a valid URL:", parseErr);
    }

    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    let client: any;
    try {
      client = new Client(EXTERNAL_DB_URL);
      await client.connect();
    } catch (connErr) {
      console.error("national-search: failed to connect to RFB DB:", connErr);
      // Retry with explicit config object (bypasses URL parser when password has special chars)
      try {
        const u = new URL(EXTERNAL_DB_URL);
        client = new Client({
          user: decodeURIComponent(u.username),
          password: decodeURIComponent(u.password),
          hostname: u.hostname,
          port: parseInt(u.port || "5432"),
          database: u.pathname.replace(/^\//, "") || "postgres",
          tls: { enabled: true, enforce: false },
        });
        await client.connect();
        console.log("national-search: connected via explicit config fallback");
      } catch (retryErr) {
        console.error("national-search: fallback connect also failed:", retryErr);
        return new Response(
          JSON.stringify({ companies: [], total: 0, degraded: true, reason: "rfb_db_unavailable" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
