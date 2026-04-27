// Equity Brain — process-event
// Consumidor idempotente de equity_brain.events. Roteia cada evento para a edge correta.
// Auth: admin OR service_role.
// Chamado por pg_cron a cada 1 minuto OU manualmente após inserção crítica (fire-and-forget).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized" };
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) return { ok: true };
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const userId = claimsData?.claims?.sub ?? null;
  const isServiceRole = claimsData?.claims?.role === "service_role";
  if (isServiceRole) return { ok: true };
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only" };
  return { ok: true };
}

async function callEdge(supabaseUrl: string, serviceKey: string, name: string, body: any): Promise<{ ok: boolean; error?: string }> {
  const url = `${supabaseUrl}/functions/v1/${name}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    return { ok: false, error: `${name} ${resp.status}: ${t.slice(0, 300)}` };
  }
  // drena body para evitar leak
  await resp.text();
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

  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Pull lote da fila
    const { data: events, error: pullErr } = await supabase
      .schema("equity_brain" as any)
      .from("events")
      .select("id, event_type, entity_type, entity_id, payload, retry_count")
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (pullErr) {
      return new Response(JSON.stringify({ error: `pull: ${pullErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ processed: 0, latency_ms: Date.now() - t0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let success = 0, errors = 0, skipped = 0, dropped = 0;

    for (const ev of events as any[]) {
      try {
        let result: { ok: boolean; error?: string } = { ok: true };
        let isSkipped = false;

        switch (ev.event_type) {
          case "company.signal_added":
          case "call.completed": {
            // Recompute score só dessa empresa
            const r1 = await callEdge(supabaseUrl, serviceKey, "calculate-scores", {
              cnpjs: [ev.entity_id], limit: 1,
            });
            if (!r1.ok) { result = r1; break; }
            // Recompute matches só dessa empresa
            result = await callEdge(supabaseUrl, serviceKey, "match-company", {
              cnpj: ev.entity_id,
            });
            break;
          }
          case "buyer.thesis_added": {
            result = await callEdge(supabaseUrl, serviceKey, "match-buyer", {
              buyer_id: ev.entity_id,
              max_companies: 2000,
            });
            break;
          }
          case "signal.embed_pending": {
            // Fase 7 — gera embedding semântico do signal_text
            result = await callEdge(supabaseUrl, serviceKey, "embed-signal", {
              signal_id: ev.entity_id,
            });
            break;
          }
          case "opportunity.promoted": {
            console.log(`[process-event] opportunity.promoted entity=${ev.entity_id} (Slack/email pendente — Fase 11)`);
            isSkipped = true;
            break;
          }
          default: {
            console.log(`[process-event] unknown event_type=${ev.event_type} id=${ev.id}`);
            isSkipped = true;
            break;
          }
        }

        if (isSkipped) {
          await supabase
            .schema("equity_brain" as any)
            .from("events")
            .update({ processed_at: new Date().toISOString(), processed_status: "skipped" })
            .eq("id", ev.id);
          skipped++;
        } else if (result.ok) {
          await supabase
            .schema("equity_brain" as any)
            .from("events")
            .update({ processed_at: new Date().toISOString(), processed_status: "success" })
            .eq("id", ev.id);
          success++;
        } else {
          // Erro: incrementa retry. Se passou de MAX_RETRIES, marca processed_at (drop).
          const newRetry = (ev.retry_count ?? 0) + 1;
          if (newRetry >= MAX_RETRIES) {
            await supabase
              .schema("equity_brain" as any)
              .from("events")
              .update({
                retry_count: newRetry,
                processed_at: new Date().toISOString(),
                processed_status: "error",
                error_message: `[dropped after ${MAX_RETRIES} tries] ${result.error}`,
              })
              .eq("id", ev.id);
            dropped++;
          } else {
            await supabase
              .schema("equity_brain" as any)
              .from("events")
              .update({
                retry_count: newRetry,
                error_message: result.error,
                // processed_at fica NULL → será reprocessado
              })
              .eq("id", ev.id);
            errors++;
          }
        }
      } catch (e) {
        console.error(`[process-event] event ${ev.id} crashed:`, e);
        const newRetry = (ev.retry_count ?? 0) + 1;
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        if (newRetry >= MAX_RETRIES) {
          await supabase
            .schema("equity_brain" as any)
            .from("events")
            .update({
              retry_count: newRetry,
              processed_at: new Date().toISOString(),
              processed_status: "error",
              error_message: `[dropped] ${errMsg}`,
            })
            .eq("id", ev.id);
          dropped++;
        } else {
          await supabase
            .schema("equity_brain" as any)
            .from("events")
            .update({ retry_count: newRetry, error_message: errMsg })
            .eq("id", ev.id);
          errors++;
        }
      }
    }

    return new Response(JSON.stringify({
      processed: events.length,
      success,
      skipped,
      errors,
      dropped,
      latency_ms: Date.now() - t0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("process-event error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
