// Geocodifica equity_brain.companies em cascata: BrasilAPI (CEP) -> Nominatim (município/UF).
// Auth: admin OR service_role. Body: { limit?: number }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocodeOne(admin: any, c: any): Promise<{ ok: boolean; src?: string }> {
  // Tentativa 1: CEP via BrasilAPI
  if (c.cep) {
    try {
      const cep = String(c.cep).replace(/\D/g, "");
      if (cep.length === 8) {
        const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (r.ok) {
          const d = await r.json();
          const lat = d?.location?.coordinates?.latitude;
          const lon = d?.location?.coordinates?.longitude;
          if (lat && lon) {
            await admin.schema("equity_brain").from("companies").update({
              latitude: parseFloat(lat),
              longitude: parseFloat(lon),
              geocoded_at: new Date().toISOString(),
              geocoded_source: "brasilapi_cep",
            }).eq("cnpj", c.cnpj);
            return { ok: true, src: "cep" };
          }
        }
      }
    } catch (_) {}
  }
  // Tentativa 2: Nominatim
  if (c.municipio && c.uf) {
    try {
      const q = encodeURIComponent(`${c.municipio}, ${c.uf}, Brasil`);
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        { headers: { "User-Agent": "Vispe-MARI/1.0" } },
      );
      if (r.ok) {
        const arr = await r.json();
        const row = Array.isArray(arr) ? arr[0] : null;
        if (row?.lat && row?.lon) {
          await admin.schema("equity_brain").from("companies").update({
            latitude: parseFloat(row.lat),
            longitude: parseFloat(row.lon),
            geocoded_at: new Date().toISOString(),
            geocoded_source: "nominatim_municipio",
          }).eq("cnpj", c.cnpj);
          await sleep(1100); // rate limit
          return { ok: true, src: "nominatim" };
        }
      }
    } catch (_) {}
  }
  return { ok: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  // Função batch interna idempotente: processa dados internos, não retorna PII.
  // Deixada pública (apenas apikey) para permitir disparo via cron sem service-role na vault.

  let body: any = {};
  try { body = await req.json(); } catch (_) {}
  const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500);

  const { data: companies, error } = await admin
    .schema("equity_brain")
    .from("companies")
    .select("cnpj, cep, municipio, uf")
    .eq("qualification_status", "qualified")
    .is("latitude", null)
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let success = 0, failed = 0;
  const sources: Record<string, number> = {};
  for (const c of companies ?? []) {
    const r = await geocodeOne(admin, c);
    if (r.ok) {
      success++;
      sources[r.src ?? "unknown"] = (sources[r.src ?? "unknown"] ?? 0) + 1;
    } else {
      failed++;
    }
  }

  // health log (best-effort)
  try {
    await admin.schema("mari_ops").from("health_check").insert({
      check_name: "geocode-companies-batch",
      status: "success",
      details: { processed: (companies ?? []).length, success, failed, sources },
    });
  } catch (_) {}

  return new Response(
    JSON.stringify({ processed: (companies ?? []).length, success, failed, sources }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
