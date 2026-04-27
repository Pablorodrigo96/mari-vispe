// Equity Brain — setup-equity-brain-crons
// Edge function admin-only que ativa/desativa os 3 jobs do pg_cron do Equity Brain
// usando a SUPABASE_SERVICE_ROLE_KEY do ambiente edge (sem expor segredo em migration).
//
// POST /setup-equity-brain-crons
//   { action: 'enable' | 'disable' | 'status' }
//
// Auth: admin only.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Os 3 jobs documentados em docs/EQUITY_BRAIN_CRON.md
function buildJobs(supabaseUrl: string, serviceKey: string) {
  return [
    {
      name: "equity-brain-recompute-scores-daily",
      schedule: "0 5 * * *", // 05:00 UTC = 02:00 BRT
      fn: "calculate-scores",
      body: { limit: 5000 },
    },
    {
      name: "refresh-opportunities-daily",
      schedule: "0 6 * * *", // 06:00 UTC = 03:00 BRT
      fn: "refresh-opportunities",
      body: { top_n: 5000 },
    },
    {
      name: "process-events-every-minute",
      schedule: "* * * * *",
      fn: "process-event",
      body: {},
    },
    // ───── Equity Brain v2 — Fase 5 (operacionalização do motor adaptativo) ─────
    {
      name: "eb-v2-recompute-incremental-6h",
      schedule: "15 */6 * * *", // a cada 6h, deslocado em 15min do calculate-scores
      fn: "match-company-v2",
      body: { limit_companies: 200, persist: true },
    },
    {
      name: "eb-v2-update-thetas-daily",
      schedule: "0 6 * * *", // 06:00 UTC = 03:00 BRT (após recompute scores)
      fn: "update-buyer-revealed-thetas",
      body: { since_days: 1, dry_run: false },
    },
    {
      name: "eb-v2-mandate-decay-weekly",
      schedule: "0 7 * * 0", // domingo 07:00 UTC = 04:00 BRT
      fn: "compute-mandate-active-proba",
      body: { limit: 5000, dry_run: false },
    },
  ].map((j) => ({
    ...j,
    sql: `
      SELECT net.http_post(
        url     := '${supabaseUrl}/functions/v1/${j.fn}',
        headers := '${JSON.stringify({
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        }).replace(/'/g, "''")}'::jsonb,
        body    := '${JSON.stringify(j.body).replace(/'/g, "''")}'::jsonb
      );
    `.trim(),
  }));
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: admin only (rejeita service_role chamadas externas para evitar uso indevido)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData } = await supabaseUser.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    const userId = claimsData?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action: "enable" | "disable" | "status" = body.action ?? "status";

    const jobs = buildJobs(supabaseUrl, serviceKey);
    const results: Record<string, unknown> = {};

    if (action === "status") {
      const { data: rows, error } = await supabase.rpc("execute_sql_admin" as any, {
        query: `SELECT jobname, schedule, active FROM cron.job WHERE jobname = ANY('{${jobs.map((j) => j.name).join(",")}}'::text[]);`,
      });
      // Fallback se RPC não existir: tenta via raw query
      if (error) {
        // Lê via cron.job direto (precisa de privilégio): usa service role já tem
        const direct = await fetch(
          `${supabaseUrl}/rest/v1/rpc/cron_job_status`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
        ).catch(() => null);
        results.note = "Use action: 'enable' or 'disable'. Status query unavailable in this environment.";
      } else {
        results.jobs = rows;
      }
      return new Response(JSON.stringify({ action, ...results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ENABLE / DISABLE: usa SQL direto via supabase.rpc('exec_sql', ...) se existir,
    // senão via PostgREST `query` parameter — mas o caminho mais robusto é via
    // pg via deno-postgres usando a SUPABASE_DB_URL.
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) {
      return new Response(JSON.stringify({
        error: "SUPABASE_DB_URL not configured. Cannot manage cron jobs from edge.",
        hint: "Run the SQL snippets from docs/EQUITY_BRAIN_CRON.md manually in the SQL editor.",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(dbUrl);
    await client.connect();

    try {
      const out: Array<{ name: string; status: string; error?: string }> = [];
      for (const job of jobs) {
        try {
          if (action === "disable") {
            await client.queryArray(`SELECT cron.unschedule('${job.name}')`);
            out.push({ name: job.name, status: "unscheduled" });
          } else {
            // enable: unschedule (se existir) + schedule de novo (idempotente)
            try {
              await client.queryArray(`SELECT cron.unschedule('${job.name}')`);
            } catch {
              /* não existia */
            }
            await client.queryArray(
              `SELECT cron.schedule($1, $2, $3)`,
              [job.name, job.schedule, job.sql],
            );
            out.push({ name: job.name, status: "scheduled" });
          }
        } catch (e) {
          out.push({
            name: job.name,
            status: "error",
            error: e instanceof Error ? e.message : "Unknown error",
          });
        }
      }
      return new Response(JSON.stringify({ action, jobs: out }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      await client.end();
    }
  } catch (e) {
    console.error("setup-equity-brain-crons error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
