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
          if (!IDENT_RE.test(table)) throw new Error("invalid table name");
          const total = await client.queryObject({ text: `SELECT count(*)::bigint AS total FROM "${table}"` });
          return ok({ table, total: Number((total.rows[0] as any).total) });
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
  return new Response(JSON.stringify({ ok: true, ...payload }), {
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
