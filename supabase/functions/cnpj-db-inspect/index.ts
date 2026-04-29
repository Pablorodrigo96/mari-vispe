const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// TEMPORARY: hardcoded for one-time inspection. Will be removed after validation.
const HARDCODED_DB_URL = "postgresql://postgres.oyarjshdqeaatlmlzvbx:F5tvldvKaA3G7RDO@aws-1-us-east-1.pooler.supabase.com:5432/postgres";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const dbUrl = HARDCODED_DB_URL || Deno.env.get('EXTERNAL_DB_URL');
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: 'no db url' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const client = new Client(dbUrl);
  const result: any = { connected: false, tables: [], candidates: {} };

  try {
    await client.connect();
    result.connected = true;

    const tablesRes = await client.queryObject<{ table_name: string }>(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name LIMIT 200
    `);
    result.tables = tablesRes.rows.map(r => r.table_name);

    const candidates = result.tables.filter((t: string) =>
      /cnpj|estabelec|empres|socio|receita|cnae|simples/i.test(t)
    );

    for (const tbl of candidates.slice(0, 8)) {
      try {
        const colsRes = await client.queryObject<{ column_name: string; data_type: string }>(
          `SELECT column_name, data_type FROM information_schema.columns
           WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
          [tbl]
        );
        const countRes = await client.queryObject<{ c: bigint }>(
          `SELECT COUNT(*)::bigint AS c FROM public."${tbl}"`
        );
        result.candidates[tbl] = {
          columns: colsRes.rows,
          row_count: countRes.rows[0]?.c?.toString() ?? '0',
        };
      } catch (e) {
        result.candidates[tbl] = { error: String(e) };
      }
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), partial: result }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    try { await client.end(); } catch {}
  }
});
