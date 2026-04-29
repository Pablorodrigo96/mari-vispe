const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

// One-time inspection function. Reads connection from EXTERNAL_DB_URL secret.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const dbUrl = Deno.env.get('EXTERNAL_DB_URL');
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: 'EXTERNAL_DB_URL not set' }), {
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

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    try { await client.end(); } catch {}
  }
});
