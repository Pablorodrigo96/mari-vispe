// Equity Brain — drain-events-bulk (Fase 7, fire-and-forget)
// Inicia um job em background que chama process-event repetidamente até esvaziar a fila.
// Retorna 202 imediatamente com job_id; frontend faz polling em equity_brain.drain_jobs via RPC.
// Auth: admin only.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ITERATIONS = 30;
const MAX_DURATION_MS = 110_000; // segurança extra abaixo do CPU/wall budget
const ITER_DELAY_MS = 250;

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized", userId: null as string | null };
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) return { ok: true, userId: null };
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const isServiceRole = claimsData?.claims?.role === "service_role";
  const userId = claimsData?.claims?.sub ?? null;
  if (isServiceRole) return { ok: true, userId: null };
  if (!userId) return { ok: false, status: 401, error: "Unauthorized", userId: null };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only", userId: null };
  return { ok: true, userId };
}

async function runDrain(
  jobId: string,
  supabaseUrl: string,
  serviceKey: string,
) {
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const t0 = Date.now();
  const totals = { iterations: 0, processed: 0, success: 0, errors: 0, dropped: 0, skipped: 0 };

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      if (Date.now() - t0 > MAX_DURATION_MS) {
        console.log(`[drain ${jobId}] time budget reached at iter=${i}`);
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
        const txt = await r.text();
        await supabase.schema("equity_brain" as any).from("drain_jobs").update({
          status: "failed",
          finished_at: new Date().toISOString(),
          totals,
          error_message: `process-event ${r.status}: ${txt.slice(0, 300)}`,
        }).eq("id", jobId);
        return;
      }
      const json = await r.json();
      totals.iterations++;
      totals.processed += json?.processed ?? 0;
      totals.success += json?.success ?? 0;
      totals.errors += json?.errors ?? 0;
      totals.dropped += json?.dropped ?? 0;
      totals.skipped += json?.skipped ?? 0;

      // Persiste progresso a cada iteração
      await supabase.schema("equity_brain" as any).from("drain_jobs").update({ totals }).eq("id", jobId);

      if (!json?.processed || json.processed === 0) break;
      // Pequeno delay para evitar rate limit do gateway
      await new Promise((r) => setTimeout(r, ITER_DELAY_MS));
    }

    await supabase.schema("equity_brain" as any).from("drain_jobs").update({
      status: "completed",
      finished_at: new Date().toISOString(),
      totals,
    }).eq("id", jobId);
    console.log(`[drain ${jobId}] done`, totals);
  } catch (e) {
    console.error(`[drain ${jobId}] crashed:`, e);
    await supabase.schema("equity_brain" as any).from("drain_jobs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      totals,
      error_message: e instanceof Error ? e.message : "Unknown error",
    }).eq("id", jobId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = await checkAuth(req, supabaseUrl, serviceKey);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: job, error: insErr } = await supabase
      .schema("equity_brain" as any)
      .from("drain_jobs")
      .insert({ status: "running", triggered_by: auth.userId })
      .select("id")
      .single();
    if (insErr || !job) {
      return new Response(JSON.stringify({ error: `Could not create job: ${insErr?.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire-and-forget: o gateway recebe 202 imediatamente, drain roda em background.
    // @ts-ignore - EdgeRuntime é global no Supabase Edge Runtime
    EdgeRuntime.waitUntil(runDrain(job.id, supabaseUrl, serviceKey));

    return new Response(JSON.stringify({ ok: true, job_id: job.id }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("drain-events-bulk error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
