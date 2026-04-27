// Equity Brain — drain-events-bulk (Fase 7)
// One-shot: chama process-event em loop até esvaziar a fila ou bater limite de tempo/iterações.
// Auth: admin only.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ITERATIONS = 30;
const MAX_DURATION_MS = 50_000;

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized" };
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const isServiceRole = claimsData?.claims?.role === "service_role";
  const userId = claimsData?.claims?.sub ?? null;
  if (isServiceRole) return { ok: true };
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only" };
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const t0 = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = await checkAuth(req, supabaseUrl, serviceKey);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const totals = { iterations: 0, processed: 0, success: 0, errors: 0, dropped: 0, skipped: 0 };
  let lastResp: any = null;

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (Date.now() - t0 > MAX_DURATION_MS) {
        console.log(`[drain] time budget exhausted at iter=${i}`);
        break;
      }
      const r = await fetch(`${supabaseUrl}/functions/v1/process-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({}),
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({
          error: `process-event ${r.status}: ${t.slice(0, 300)}`,
          totals,
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const json = await r.json();
      lastResp = json;
      totals.iterations++;
      totals.processed += json?.processed ?? 0;
      totals.success += json?.success ?? 0;
      totals.errors += json?.errors ?? 0;
      totals.dropped += json?.dropped ?? 0;
      totals.skipped += json?.skipped ?? 0;
      // Se nada foi puxado, fila vazia → encerra
      if (!json?.processed || json.processed === 0) break;
    }

    return new Response(JSON.stringify({
      ok: true,
      totals,
      duration_ms: Date.now() - t0,
      last_batch: lastResp,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("drain-events-bulk error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      totals,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
