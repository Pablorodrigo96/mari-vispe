// MARI Ops — mari-smoke-tests
// Roda checagens E2E rápidas a cada 6h e grava em mari_ops.smoke_tests.
// Foco: validar que as funções/rotas críticas estão acessíveis e respondem em <X segundos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type SmokeResult = {
  test_name: string;
  status: "pass" | "fail";
  duration_ms: number;
  details: Record<string, unknown>;
  error_text: string | null;
};

async function record(r: SmokeResult) {
  try {
    await admin.rpc("mari_ops_record_smoke", {
      p_test_name: r.test_name,
      p_status: r.status,
      p_duration_ms: r.duration_ms,
      p_actual: r.details as any,
      p_message: r.error_text,
    });
  } catch (e) {
    console.error("[smoke] failed to record", r.test_name, e);
  }
}

async function timed<T>(name: string, fn: () => Promise<T>): Promise<SmokeResult> {
  const start = performance.now();
  try {
    const out = await fn();
    return {
      test_name: name,
      status: "pass",
      duration_ms: Math.round(performance.now() - start),
      details: typeof out === "object" && out !== null ? (out as Record<string, unknown>) : { ok: true },
      error_text: null,
    };
  } catch (err: any) {
    const msg = err instanceof Error
      ? err.message
      : (err?.message || err?.hint || err?.code || JSON.stringify(err));
    console.error(`[smoke] ${name} FAIL:`, msg, err);
    return {
      test_name: name,
      status: "fail",
      duration_ms: Math.round(performance.now() - start),
      details: {},
      error_text: msg,
    };
  }
}

// --- Tests ---

async function test_db_listings_count(): Promise<Record<string, unknown>> {
  const { count, error } = await admin.from("listings").select("*", { count: "exact", head: true });
  if (error) throw error;
  if ((count ?? 0) < 1) throw new Error("listings vazio");
  return { count };
}

async function test_eb_mandates_count(): Promise<Record<string, unknown>> {
  const { count, error } = await admin.schema("equity_brain").from("mandates").select("*", { count: "exact", head: true });
  if (error) throw error;
  return { count };
}

async function test_health_check_writable(): Promise<Record<string, unknown>> {
  const { error } = await admin.rpc("mari_ops_record_health", {
    p_function_name: "mari-smoke-tests",
    p_status: "ok",
    p_duration_ms: 0,
    p_source: "smoke_test_self_check",
  });
  if (error) throw error;
  return { ok: true };
}

async function test_calculate_scores_endpoint(): Promise<Record<string, unknown>> {
  // ping HEAD/POST com payload mínimo só pra verificar que está acessível (mesmo se retornar 401 está vivo)
  const url = `${SUPABASE_URL}/functions/v1/calculate-scores`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
    body: JSON.stringify({ smoke: true }),
  });
  // 2xx ou 4xx = vivo; 5xx = problema
  if (r.status >= 500) throw new Error(`HTTP ${r.status}`);
  return { http_status: r.status };
}

async function test_match_company_v2_endpoint(): Promise<Record<string, unknown>> {
  const url = `${SUPABASE_URL}/functions/v1/match-company-v2`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
    body: JSON.stringify({ smoke: true }),
  });
  if (r.status >= 500) throw new Error(`HTTP ${r.status}`);
  return { http_status: r.status };
}

async function test_recent_health_volume(): Promise<Record<string, unknown>> {
  const { data, error } = await admin.rpc("mari_ops_health_volume_recent", { p_minutes: 30 });
  if (error) throw error;
  return { runs_last_30min: data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const tests = [
    timed("db.listings.count", test_db_listings_count),
    timed("db.eb.mandates.count", test_eb_mandates_count),
    timed("ops.health_check.writable", test_health_check_writable),
    timed("fn.calculate-scores.alive", test_calculate_scores_endpoint),
    timed("fn.match-company-v2.alive", test_match_company_v2_endpoint),
    timed("ops.health_check.volume_30min", test_recent_health_volume),
  ];
  const results = await Promise.all(tests);
  await Promise.all(results.map(record));

  const summary = {
    total: results.length,
    pass: results.filter(r => r.status === "pass").length,
    fail: results.filter(r => r.status === "fail").length,
    results,
  };

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: summary.fail > 0 ? 207 : 200,
  });
});
