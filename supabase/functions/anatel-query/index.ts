// anatel-query — Read-only gateway para a base Supabase ANATEL (ANATEL_DB_URL).
// Auth: admin OR advisor.
// Actions: schema | sample | by_cnpj | by_uf | by_municipio | stats | raw_select
//
// Todas as queries são parametrizadas. Identificadores (tabela/colunas) são validados
// contra information_schema antes de qualquer interpolação.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) return { ok: true, isService: true };

  const sbUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData } = await sbUser.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };

  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "advisor");
  if (!allowed) return { ok: false, status: 403, error: "Forbidden: admin or advisor only" };
  return { ok: true, userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anatelUrl = Deno.env.get("ANATEL_DB_URL");

    if (!anatelUrl) {
      return new Response(JSON.stringify({ error: "ANATEL_DB_URL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = await checkAuth(req, supabaseUrl, serviceKey);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const params = body.params ?? {};

    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(anatelUrl);
    await client.connect();

    try {
      switch (action) {
        // ----- 1) Descoberta de schema -----
        case "schema": {
          const schemaName = String(params.schema ?? "public");
          if (!IDENT_RE.test(schemaName)) throw new Error("invalid schema");
          const tables = await client.queryObject({
            text: `
              SELECT table_name, table_type
              FROM information_schema.tables
              WHERE table_schema = $1
              ORDER BY table_name
            `,
            args: [schemaName],
          });
          const cols = await client.queryObject({
            text: `
              SELECT table_name, column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_schema = $1
              ORDER BY table_name, ordinal_position
            `,
            args: [schemaName],
          });
          return ok({ schema: schemaName, tables: tables.rows, columns: cols.rows });
        }

        // ----- 2) Sample N linhas (descoberta) -----
        case "sample": {
          const table = String(params.table ?? "");
          const limit = Math.min(Number(params.limit ?? 5), 50);
          if (!IDENT_RE.test(table)) throw new Error("invalid table name");
          const safe = await ensureTableExists(client, table);
          if (!safe) throw new Error(`table not found: ${table}`);
          const r = await client.queryObject({
            text: `SELECT * FROM "${table}" LIMIT ${limit}`,
          });
          return ok({ table, rows: r.rows });
        }

        // ----- 3) Por CNPJ (com auto-detect de coluna cnpj) -----
        case "by_cnpj": {
          const table = String(params.table ?? "");
          const cnpj = String(params.cnpj ?? "").replace(/\D/g, "");
          if (cnpj.length !== 14) throw new Error("CNPJ inválido");
          if (!IDENT_RE.test(table)) throw new Error("invalid table name");
          const cnpjCol = await detectCnpjColumn(client, table, params.cnpj_column);
          if (!cnpjCol) throw new Error(`no CNPJ column found in ${table}`);
          const limit = Math.min(Number(params.limit ?? 100), 500);
          // Tenta com 14 dígitos puros e variantes mascaradas
          const variants = [
            cnpj,
            `${cnpj.slice(0,2)}.${cnpj.slice(2,5)}.${cnpj.slice(5,8)}/${cnpj.slice(8,12)}-${cnpj.slice(12)}`,
          ];
          const r = await client.queryObject({
            text: `SELECT * FROM "${table}" WHERE regexp_replace("${cnpjCol}"::text, '\\D', '', 'g') = $1 LIMIT ${limit}`,
            args: [cnpj],
          });
          return ok({ table, cnpj_column: cnpjCol, cnpj, variants, rows: r.rows });
        }

        // ----- 4) Por UF -----
        case "by_uf": {
          const table = String(params.table ?? "");
          const uf = String(params.uf ?? "").toUpperCase();
          const ufCol = String(params.uf_column ?? "uf");
          const limit = Math.min(Number(params.limit ?? 100), 1000);
          if (!IDENT_RE.test(table) || !IDENT_RE.test(ufCol)) throw new Error("invalid identifiers");
          if (!/^[A-Z]{2}$/.test(uf)) throw new Error("UF inválida");
          const r = await client.queryObject({
            text: `SELECT * FROM "${table}" WHERE upper("${ufCol}") = $1 LIMIT ${limit}`,
            args: [uf],
          });
          return ok({ table, uf, rows: r.rows });
        }

        // ----- 5) Por Município -----
        case "by_municipio": {
          const table = String(params.table ?? "");
          const municipio = String(params.municipio ?? "").trim();
          const muniCol = String(params.municipio_column ?? "municipio");
          const limit = Math.min(Number(params.limit ?? 100), 1000);
          if (!IDENT_RE.test(table) || !IDENT_RE.test(muniCol)) throw new Error("invalid identifiers");
          const r = await client.queryObject({
            text: `SELECT * FROM "${table}" WHERE unaccent(lower("${muniCol}"::text)) = unaccent(lower($1)) LIMIT ${limit}`,
            args: [municipio],
          });
          return ok({ table, municipio, rows: r.rows });
        }

        // ----- 6) Stats agregados -----
        case "stats": {
          const table = String(params.table ?? "");
          const kind = String(params.kind ?? "total");
          const limit = Math.min(Number(params.limit ?? 50), 500);
          if (!IDENT_RE.test(table)) throw new Error("invalid table name");

          if (kind === "total") {
            const total = await client.queryObject({ text: `SELECT count(*)::bigint AS total FROM "${table}"` });
            return ok({ table, total: Number((total.rows[0] as any).total) });
          }

          if (kind === "share_by_municipio") {
            const uf = params.uf ? String(params.uf).toUpperCase() : null;
            const cidade = params.cidade ? String(params.cidade).trim() : null;
            if (uf && !/^[A-Z]{2}$/.test(uf)) throw new Error("UF inválida");
            const where: string[] = ["cidade IS NOT NULL"];
            const args: any[] = [];
            if (uf) { args.push(uf); where.push(`upper(estado) = $${args.length}`); }
            if (cidade) { args.push(cidade); where.push(`lower(cidade) = lower($${args.length})`); }
            const r = await client.queryObject({
              text: `
                WITH base AS (
                  SELECT cidade, estado, empresa, cnpj,
                         SUM(NULLIF(regexp_replace(acessos,'[^0-9-]','','g'),'')::bigint) AS acessos
                  FROM "${table}"
                  WHERE ${where.join(" AND ")}
                  GROUP BY cidade, estado, empresa, cnpj
                ),
                ranked AS (
                  SELECT cidade, estado, empresa, cnpj, acessos,
                         SUM(acessos) OVER (PARTITION BY cidade, estado) AS total_municipio,
                         COUNT(*) OVER (PARTITION BY cidade, estado) AS n_provedores,
                         ROW_NUMBER() OVER (PARTITION BY cidade, estado ORDER BY acessos DESC) AS rk
                  FROM base
                )
                SELECT cidade, estado,
                       total_municipio::bigint AS acessos,
                       n_provedores::int AS n_provedores,
                       empresa AS lider,
                       cnpj AS lider_cnpj,
                       round((acessos::numeric / NULLIF(total_municipio,0)::numeric) * 100, 2) AS share_lider
                FROM ranked
                WHERE rk = 1
                ORDER BY total_municipio DESC
                LIMIT ${limit}
              `,
              args,
            });
            return ok({ table, kind, rows: r.rows });
          }

          if (kind === "share_by_company") {
            const uf = params.uf ? String(params.uf).toUpperCase() : null;
            const cidade = params.cidade ? String(params.cidade).trim() : null;
            if (uf && !/^[A-Z]{2}$/.test(uf)) throw new Error("UF inválida");
            const where: string[] = ["empresa IS NOT NULL"];
            const args: any[] = [];
            if (uf) { args.push(uf); where.push(`upper(estado) = $${args.length}`); }
            if (cidade) { args.push(cidade); where.push(`lower(cidade) = lower($${args.length})`); }
            const r = await client.queryObject({
              text: `
                WITH base AS (
                  SELECT empresa, cnpj,
                         SUM(NULLIF(regexp_replace(acessos,'[^0-9-]','','g'),'')::bigint) AS acessos
                  FROM "${table}"
                  WHERE ${where.join(" AND ")}
                  GROUP BY empresa, cnpj
                ),
                ranked AS (
                  SELECT empresa, cnpj, acessos,
                         SUM(acessos) OVER () AS total_geo,
                         COUNT(*) OVER () AS n_empresas,
                         ROW_NUMBER() OVER (ORDER BY acessos DESC NULLS LAST) AS rk
                  FROM base
                )
                SELECT empresa, cnpj,
                       acessos::bigint AS acessos,
                       total_geo::bigint AS total_geo,
                       n_empresas::int AS n_empresas,
                       rk::int AS rank,
                       round((acessos::numeric / NULLIF(total_geo,0)::numeric) * 100, 2) AS share_pct
                FROM ranked
                ORDER BY acessos DESC NULLS LAST
                LIMIT ${limit}
              `,
              args,
            });
            return ok({ table, kind, rows: r.rows });
          }

          if (kind === "company_profile") {
            const cnpj = String(params.cnpj ?? "").replace(/\D/g, "");
            if (cnpj.length !== 14) throw new Error("CNPJ inválido");
            const r = await client.queryObject({
              text: `
                WITH base AS (
                  SELECT cidade, estado, tecnologia, meio_acesso, faixa_velocidade,
                         SUM(NULLIF(regexp_replace(acessos,'[^0-9-]','','g'),'')::bigint) AS acessos
                  FROM "${table}"
                  WHERE regexp_replace(cnpj::text,'\\D','','g') = $1
                  GROUP BY cidade, estado, tecnologia, meio_acesso, faixa_velocidade
                )
                SELECT
                  COALESCE((SELECT SUM(acessos) FROM base),0)::bigint AS total_acessos,
                  COALESCE((SELECT COUNT(*) FROM (SELECT DISTINCT cidade, estado FROM base) c),0)::int AS n_cidades,
                  COALESCE((SELECT COUNT(DISTINCT estado) FROM base),0)::int AS n_ufs,
                  COALESCE((SELECT json_agg(t) FROM (
                    SELECT COALESCE(NULLIF(trim(tecnologia),''),'—') AS name,
                           SUM(acessos)::bigint AS acessos
                    FROM base GROUP BY 1 ORDER BY 2 DESC NULLS LAST) t), '[]'::json) AS tecnologias,
                  COALESCE((SELECT json_agg(t) FROM (
                    SELECT COALESCE(NULLIF(trim(meio_acesso),''),'—') AS name,
                           SUM(acessos)::bigint AS acessos
                    FROM base GROUP BY 1 ORDER BY 2 DESC NULLS LAST) t), '[]'::json) AS meios_acesso,
                  COALESCE((SELECT json_agg(t) FROM (
                    SELECT COALESCE(NULLIF(trim(faixa_velocidade),''),'—') AS name,
                           SUM(acessos)::bigint AS acessos
                    FROM base GROUP BY 1 ORDER BY 2 DESC NULLS LAST) t), '[]'::json) AS faixas
              `,
              args: [cnpj],
            });
            return ok({ table, kind, profile: r.rows[0] ?? null });
          }

          if (kind === "company_footprint") {
            const cnpj = String(params.cnpj ?? "").replace(/\D/g, "");
            if (cnpj.length !== 14) throw new Error("CNPJ inválido");
            const r = await client.queryObject({
              text: `
                WITH base AS (
                  SELECT cidade, estado, empresa, cnpj,
                         MIN(codigo_ibge_cidade) AS codigo_ibge_cidade,
                         SUM(NULLIF(regexp_replace(acessos,'[^0-9-]','','g'),'')::bigint) AS acessos
                  FROM "${table}"
                  WHERE cidade IS NOT NULL
                  GROUP BY cidade, estado, empresa, cnpj
                ),
                ranked AS (
                  SELECT cidade, estado, empresa, cnpj, codigo_ibge_cidade, acessos,
                         SUM(acessos) OVER (PARTITION BY cidade, estado) AS total_municipio,
                         COUNT(*) OVER (PARTITION BY cidade, estado) AS n_provedores,
                         ROW_NUMBER() OVER (PARTITION BY cidade, estado ORDER BY acessos DESC) AS rank_municipio
                  FROM base
                )
                SELECT cidade, estado, codigo_ibge_cidade,
                       acessos::bigint AS acessos_empresa,
                       total_municipio::bigint AS total_municipio,
                       n_provedores::int AS n_provedores,
                       rank_municipio::int AS rank_municipio,
                       round((acessos::numeric / NULLIF(total_municipio,0)::numeric) * 100, 2) AS share_pct
                FROM ranked
                WHERE regexp_replace(cnpj::text,'\\D','','g') = $1
                ORDER BY acessos DESC
                LIMIT ${limit}
              `,
              args: [cnpj],
            });
            return ok({ table, kind, rows: r.rows });
          }

          throw new Error(`unknown stats kind: ${kind}`);
        }

        case "search_companies": {
          const table = String(params.table ?? "");
          const q = String(params.q ?? "").trim();
          if (!IDENT_RE.test(table)) throw new Error("invalid table name");
          if (q.length < 2) return ok({ rows: [] });
          const limit = Math.min(Number(params.limit ?? 20), 50);
          const isDigits = /^\d+$/.test(q.replace(/\D/g, "")) && q.replace(/\D/g, "").length >= 4;
          const digits = q.replace(/\D/g, "");
          const r = await client.queryObject({
            text: `
              SELECT empresa, cnpj,
                     SUM(NULLIF(regexp_replace(acessos,'[^0-9-]','','g'),'')::bigint) AS acessos
              FROM "${table}"
              WHERE empresa ILIKE $1
                 ${isDigits ? `OR regexp_replace(cnpj::text,'\\D','','g') LIKE $2` : ""}
              GROUP BY empresa, cnpj
              ORDER BY acessos DESC NULLS LAST
              LIMIT ${limit}
            `,
            args: isDigits ? [`%${q}%`, `${digits}%`] : [`%${q}%`],
          });
          return ok({ rows: r.rows });
        }

        case "companies_in_cities": {
          const table = String(params.table ?? "");
          if (!IDENT_RE.test(table)) throw new Error("invalid table name");
          const ibgesRaw = Array.isArray(params.ibge_codes) ? params.ibge_codes : [];
          const ibges = ibgesRaw
            .map((x: any) => String(x).replace(/\D/g, ""))
            .filter((x: string) => x.length >= 6 && x.length <= 7)
            .slice(0, 3000);
          const ufFilter = params.uf ? String(params.uf).toUpperCase().slice(0, 2) : null;
          if (!ibges.length) return ok({ rows: [] });
          const r = await client.queryObject({
            text: `
              WITH base AS (
                SELECT empresa, cnpj, cidade, estado, codigo_ibge_cidade,
                       SUM(NULLIF(regexp_replace(acessos,'[^0-9-]','','g'),'')::bigint) AS acessos
                FROM "${table}"
                WHERE codigo_ibge_cidade::text = ANY($1::text[])
                  ${ufFilter ? "AND upper(estado) = $2" : ""}
                GROUP BY empresa, cnpj, cidade, estado, codigo_ibge_cidade
              )
              SELECT cidade, estado, codigo_ibge_cidade,
                     SUM(acessos)::bigint AS acessos_total,
                     COUNT(DISTINCT cnpj)::int AS n_provedores,
                     (ARRAY_AGG(empresa ORDER BY acessos DESC NULLS LAST))[1] AS top_empresa,
                     (ARRAY_AGG(cnpj ORDER BY acessos DESC NULLS LAST))[1] AS top_cnpj,
                     COALESCE(json_agg(json_build_object(
                       'empresa', empresa, 'cnpj', cnpj, 'acessos', acessos
                     ) ORDER BY acessos DESC NULLS LAST) FILTER (WHERE empresa IS NOT NULL), '[]'::json) AS providers
              FROM base
              GROUP BY cidade, estado, codigo_ibge_cidade
              ORDER BY acessos_total DESC NULLS LAST
              LIMIT 5000
            `,
            args: ufFilter ? [ibges, ufFilter] : [ibges],
          });
          return ok({ table, rows: r.rows });
        }

        default:
          throw new Error(`unknown action: ${action}`);
      }
    } finally {
      await client.end();
    }
  } catch (e: any) {
    console.error("anatel-query error:", e);
    return new Response(
      JSON.stringify({
        error: e?.message ?? "Unknown error",
        diag: { code: e?.code, host: hostFromUrl(Deno.env.get("ANATEL_DB_URL") ?? "") },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function ok(payload: any) {
  const body = JSON.stringify(
    { ok: true, ...payload },
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
  );
  return new Response(body, {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hostFromUrl(u: string) {
  try { return new URL(u).host; } catch { return null; }
}

async function ensureTableExists(client: any, table: string): Promise<boolean> {
  const r = await client.queryObject({
    text: `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
    args: [table],
  });
  return r.rows.length > 0;
}

async function detectCnpjColumn(client: any, table: string, hint?: string): Promise<string | null> {
  if (hint && IDENT_RE.test(String(hint))) return String(hint);
  const r = await client.queryObject({
    text: `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
        AND (column_name ILIKE '%cnpj%' OR column_name ILIKE '%cpf_cnpj%')
      ORDER BY (column_name='cnpj') DESC, char_length(column_name) ASC
      LIMIT 1
    `,
    args: [table],
  });
  return r.rows[0] ? (r.rows[0] as any).column_name : null;
}
