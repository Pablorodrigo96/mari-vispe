// Equity Brain — mari-generate-buyer-thesis-cron (Fase 2 / B.1)
// Wrapper que seleciona N matches sem thesis_text com filtro reforçado
// (match_score>=60, setor_fit>=0.7) e dispara `mari-generate-buyer-thesis`
// sequencial com delay 2s. Guard: aborta se taxa de erro > 30% nos 10 primeiros.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function isAdminOrService(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (token === SERVICE_KEY) return true;
  const sUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims } = await sUser.auth.getClaims(token);
  if (claims?.claims?.role === "service_role") return true;
  const userId = claims?.claims?.sub;
  if (!userId) return false;
  const sa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data } = await sa.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!(await isAdminOrService(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 200);
  const dryRun = !!body.dry_run;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Filtro reforçado decidido pelo Pablo
  const { data: rows, error } = await supabase
    .schema("equity_brain" as any)
    .from("matches")
    .select("id, match_score, setor_fit, sav_score")
    .eq("is_current", true)
    .eq("abstain", false)
    .is("thesis_text", null)
    .gte("match_score", 60)
    .gte("setor_fit", 0.7)
    .order("match_score", { ascending: false })
    .order("tese_fit", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (dryRun) {
    return new Response(JSON.stringify({ would_process: rows?.length ?? 0, sample: rows?.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startedAt = Date.now();
  let success = 0, errors = 0, aborted = false;
  const errorLog: { match_id: string; error: string }[] = [];

  const matches = rows ?? [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i] as any;
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/mari-generate-buyer-thesis`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ match_id: m.id }),
      });
      if (!r.ok) {
        const t = await r.text();
        errors++;
        errorLog.push({ match_id: m.id, error: `HTTP ${r.status}: ${t.slice(0, 120)}` });
      } else {
        success++;
      }
    } catch (e) {
      errors++;
      errorLog.push({ match_id: m.id, error: e instanceof Error ? e.message : "unknown" });
    }

    // Guard: depois das 10 primeiras, aborta se erro > 30%
    if (i === 9 && errors / 10 > 0.3) {
      aborted = true;
      break;
    }
    await sleep(2000);
  }

  // Custo aproximado do batch via api_usage_logs
  const { data: cost } = await supabase
    .from("api_usage_logs")
    .select("cost_brl, input_tokens, output_tokens")
    .eq("function_name", "mari-generate-buyer-thesis")
    .gte("created_at", new Date(startedAt).toISOString());

  const total_cost_brl = (cost ?? []).reduce((s: number, r: any) => s + Number(r.cost_brl ?? 0), 0);
  const total_in = (cost ?? []).reduce((s: number, r: any) => s + Number(r.input_tokens ?? 0), 0);
  const total_out = (cost ?? []).reduce((s: number, r: any) => s + Number(r.output_tokens ?? 0), 0);

  return new Response(JSON.stringify({
    processed: success + errors,
    success, errors, aborted,
    duration_seconds: Math.round((Date.now() - startedAt) / 1000),
    cost_brl: Number(total_cost_brl.toFixed(4)),
    input_tokens: total_in,
    output_tokens: total_out,
    error_sample: errorLog.slice(0, 5),
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
