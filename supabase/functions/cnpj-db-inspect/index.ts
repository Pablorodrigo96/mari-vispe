const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Comprehensive audit of the external CNPJ database (admin-only).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // ── Auth gate (admin-only)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const sbUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(sbUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const sbAdmin = createClient(sbUrl, serviceKey);
  const { data: roleRow } = await sbAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", claimsData.claims.sub as string)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const dbUrl = Deno.env.get('EXTERNAL_DB_URL');
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: 'EXTERNAL_DB_URL not set' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const includeSamples = url.searchParams.get('samples') !== '0';
  const sampleCnpj = url.searchParams.get('cnpj'); // optional 14-digit cnpj for a join probe

  const client = new Client(dbUrl);
  const result: any = {
    connected: false,
    schemas: [],
    tables: [],         // [{schema, name, approx_rows, columns: [{name, type, nullable}]}]
    samples: {},        // { table_name: [rows...] }
    join_probe: null,   // result of joining empresas/estabelecimentos/socios/simples for one cnpj
    errors: [],
  };

  const safeQuery = async <T = any>(sql: string, args: any[] = []): Promise<T[]> => {
    try {
      const r = await client.queryObject<T>(sql, args);
      return r.rows;
    } catch (e) {
      result.errors.push({ sql: sql.slice(0, 120), error: String(e) });
      return [];
    }
  };

  try {
    await client.connect();
    result.connected = true;

    // 1) Schemas (skip system)
    const schemas = await safeQuery<{ schema_name: string }>(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast')
        AND schema_name NOT LIKE 'pg_%'
      ORDER BY schema_name
    `);
    result.schemas = schemas.map(s => s.schema_name);

    // 2) Tables + approximate row counts (pg_class.reltuples)
    const tables = await safeQuery<{ schema: string; name: string; approx_rows: number; kind: string }>(`
      SELECT n.nspname AS schema,
             c.relname AS name,
             c.reltuples::bigint AS approx_rows,
             c.relkind AS kind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r','p','v','m','f')
      ORDER BY c.relname
    `);

    // 3) Columns per table (single query, group in JS)
    const cols = await safeQuery<{ table_name: string; column_name: string; data_type: string; is_nullable: string; ordinal_position: number }>(`
      SELECT table_name, column_name, data_type, is_nullable, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    const colsByTable: Record<string, any[]> = {};
    for (const c of cols) {
      (colsByTable[c.table_name] ||= []).push({
        name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES', pos: c.ordinal_position,
      });
    }

    result.tables = tables.map(t => ({
      schema: t.schema,
      name: t.name,
      kind: t.kind,
      approx_rows: Number(t.approx_rows ?? 0),
      columns: colsByTable[t.name] || [],
    }));

    // 4) Samples for known/likely tables
    if (includeSamples) {
      const candidates = [
        'empresas', 'estabelecimentos', 'estabelecimento', 'socios', 'socio',
        'simples', 'cnaes', 'cnae', 'municipios', 'municipio',
        'naturezas', 'natureza_juridica', 'qualificacoes', 'qualificacao_socio',
        'paises', 'pais', 'motivos', 'motivo',
      ];
      const existing = new Set(result.tables.map((t: any) => t.name));
      for (const tname of candidates) {
        if (!existing.has(tname)) continue;
        const rows = await safeQuery(`SELECT * FROM public."${tname}" LIMIT 3`);
        result.samples[tname] = rows;
      }
    }

    // 5) Join probe: try a full profile for one CNPJ if provided
    if (sampleCnpj && /^\d{14}$/.test(sampleCnpj)) {
      const basico = sampleCnpj.slice(0, 8);
      const ordem = sampleCnpj.slice(8, 12);
      const dv = sampleCnpj.slice(12, 14);
      const probe: any = { cnpj: sampleCnpj, basico };

      probe.empresa = await safeQuery(`SELECT * FROM public.empresas WHERE cnpj_basico = $1 LIMIT 1`, [basico]);
      probe.estabelecimento = await safeQuery(
        `SELECT * FROM public.estabelecimentos
         WHERE cnpj_basico = $1 AND cnpj_ordem = $2 AND cnpj_dv = $3 LIMIT 1`,
        [basico, ordem, dv]
      );
      probe.socios = await safeQuery(`SELECT * FROM public.socios WHERE cnpj_basico = $1 LIMIT 10`, [basico]);
      probe.simples = await safeQuery(`SELECT * FROM public.simples WHERE cnpj_basico = $1 LIMIT 1`, [basico]);
      result.join_probe = probe;
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), partial: result }, null, 2), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    try { await client.end(); } catch {}
  }
});
