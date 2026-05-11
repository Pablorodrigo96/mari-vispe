// jarvis-cold-sample — sampla ~2k CNPJs ativos da base externa (RFB)
// para servir como "nuvem de fundo" no globo Jarvis 3D.
// Read-only. Não importa nada. Cache em memória 1h.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ColdPoint {
  cnpj: string;
  razao_social: string | null;
  uf: string | null;
  municipio: string | null;
  cnae_descricao: string | null;
}

// Cache de processo (1h)
let CACHE: { at: number; data: ColdPoint[] } | null = null;
const TTL_MS = 60 * 60 * 1000;

function buildExternalUrl(): string | null {
  let url = Deno.env.get("EXTERNAL_DB_URL");
  if (url) return url;
  const pwd = Deno.env.get("EXTERNAL_DB_PASSWORD");
  if (!pwd) return null;
  const host = Deno.env.get("EXTERNAL_DB_HOST") || "aws-0-sa-east-1.pooler.supabase.com";
  const port = Deno.env.get("EXTERNAL_DB_PORT") || "6543";
  const user = Deno.env.get("EXTERNAL_DB_USER") || "postgres.oyarjshdqeaatlmlzvbx";
  const db = Deno.env.get("EXTERNAL_DB_NAME") || "postgres";
  return `postgresql://${user}:${encodeURIComponent(pwd)}@${host}:${port}/${db}?sslmode=require`;
}

async function fetchSample(limit: number): Promise<ColdPoint[]> {
  const url = buildExternalUrl();
  if (!url) {
    console.warn("[jarvis-cold-sample] EXTERNAL_DB not configured");
    return [];
  }
  const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
  const client = new Client(url);
  await client.connect();
  try {
    // TABLESAMPLE 1% + LIMIT — rápido em ~50M rows e devolve volume suficiente.
    const q = `
      SELECT
        (e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv) AS cnpj,
        em.razao_social,
        e.uf,
        e.municipio::text AS municipio,
        e.cnae_fiscal_principal::text AS cnae_descricao
      FROM estabelecimentos e TABLESAMPLE SYSTEM (1)
      INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
      WHERE e.uf IS NOT NULL
      LIMIT $1
    `;
    const res = await client.queryObject<ColdPoint>(q, [limit]);
    return res.rows ?? [];
  } finally {
    try { await client.end(); } catch {}
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const u = new URL(req.url);
    const limit = Math.min(3000, Math.max(100, Number(u.searchParams.get("limit") ?? 2000)));

    const now = Date.now();
    if (CACHE && now - CACHE.at < TTL_MS && CACHE.data.length >= limit) {
      return new Response(
        JSON.stringify({ points: CACHE.data.slice(0, limit), cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await fetchSample(limit);
    CACHE = { at: now, data };

    return new Response(
      JSON.stringify({ points: data, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[jarvis-cold-sample] error:", err);
    return new Response(
      JSON.stringify({ points: [], error: String(err?.message ?? err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
