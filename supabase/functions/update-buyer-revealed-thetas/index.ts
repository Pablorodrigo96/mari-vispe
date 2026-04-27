// Equity Brain v2 — update-buyer-revealed-thetas
// Fase 4: aprendizado adaptativo. Lê deal_events por buyer e atualiza
// equity_brain.buyer_revealed_thetas via Bayesian update online com decay temporal.
//
// Body: { buyer_id?: string, since_days?: number, dry_run?: boolean }
// Auth: admin only.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVENT_SIGNAL: Record<string, number> = {
  closed: 1.0,
  term_sheet: 0.85,
  loi_received: 0.7,
  nda_signed: 0.4,
  reply_received: 0.2,
  contacted: 0.0,
  rejected: -0.7,
  dropped: -0.5,
};

const REJECTION_FEATURE_PENALTY: Record<string, string[]> = {
  geo_fora_radar: ["geografia", "densidade_local"],
  tamanho_pequeno: ["tamanho", "financeiro"],
  tamanho_grande: ["tamanho", "financeiro"],
  setor_secundario: ["setor", "vertical_fit"],
  governanca_problema: ["governanca"],
  timing_ruim: ["timing"],
  preco_alto: ["financeiro"],
  fit_fraco: ["tese"],
};

function timeDecay(eventTs: string, halfLifeDays = 90): number {
  const ageDays = (Date.now() - new Date(eventTs).getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / halfLifeDays);
}

function bayesianUpdate(
  prior: { mean: number; std: number; n: number },
  observation: number,
  weight: number,
): { mean: number; std: number; n: number } {
  const w = Math.max(0.01, weight);
  const newN = prior.n + w;
  const delta = observation - prior.mean;
  const newMean = prior.mean + (w * delta) / newN;
  const newStd = Math.max(0.05, prior.std * Math.sqrt(prior.n + 1) / Math.sqrt(newN + 1));
  return { mean: newMean, std: newStd, n: newN };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supabaseUser.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    const isServiceRole = claimsData?.claims?.role === "service_role";

    if (!isServiceRole) {
      if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const adminCheck = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: roleData } = await adminCheck.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!roleData) return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetBuyerId: string | undefined = body.buyer_id;
    const sinceDays = Math.min(Math.max(Number(body.since_days ?? 365), 1), 1825);
    const dryRun = Boolean(body.dry_run ?? false);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const sinceISO = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

    // Engine run tracking (Fase 5 — observabilidade)
    const runStart = Date.now();
    const { data: runRow } = await supabase.schema("equity_brain" as any).from("engine_runs").insert({
      engine: "update-buyer-revealed-thetas",
      status: "running",
      triggered_by: isServiceRole ? "cron" : "manual",
      metadata: { buyer_id: targetBuyerId ?? null, since_days: sinceDays, dry_run: dryRun },
    }).select("id").single();
    const runId = runRow?.id ?? null;
    async function finishRun(status: "success" | "error", rowsProcessed: number, errorMsg?: string) {
      if (!runId) return;
      await supabase.schema("equity_brain" as any).from("engine_runs").update({
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - runStart,
        rows_processed: rowsProcessed,
        status,
        error_message: errorMsg ?? null,
      }).eq("id", runId);
    }

    try {

    // 1. Eventos
    let evQuery = supabase.schema("equity_brain" as any).from("deal_events")
      .select("id, match_id, buyer_id, event_type, rejection_reason, event_ts, metadata")
      .gte("event_ts", sinceISO)
      .not("buyer_id", "is", null);
    if (targetBuyerId) evQuery = evQuery.eq("buyer_id", targetBuyerId);
    const { data: events, error: evErr } = await evQuery;
    if (evErr) throw evErr;

    if (!events?.length) {
      await finishRun("success", 0);
      return new Response(JSON.stringify({
        ok: true, buyers_updated: 0, events_processed: 0,
        message: "Sem eventos novos para aprender", run_id: runId,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Matches associados (para feature_contributions)
    const matchIds = [...new Set(events.map((e: any) => e.match_id).filter(Boolean))];
    const { data: matches } = await supabase.schema("equity_brain" as any).from("matches")
      .select("id, buyer_id, feature_contributions").in("id", matchIds);
    const matchById = new Map<string, any>();
    (matches ?? []).forEach((m: any) => matchById.set(m.id, m));

    // 3. Agrupa por buyer
    const byBuyer = new Map<string, any[]>();
    for (const e of events) {
      if (!byBuyer.has(e.buyer_id)) byBuyer.set(e.buyer_id, []);
      byBuyer.get(e.buyer_id)!.push(e);
    }

    // 4. Thetas existentes
    const buyerIds = [...byBuyer.keys()];
    const { data: existingThetas } = await supabase.schema("equity_brain" as any)
      .from("buyer_revealed_thetas").select("*").in("buyer_id", buyerIds);
    const thetaIdx = new Map<string, any>();
    (existingThetas ?? []).forEach((t: any) =>
      thetaIdx.set(`${t.buyer_id}|${t.feature_name}`, t));

    // 5. Updates
    const upserts: any[] = [];
    const summary: any[] = [];

    for (const [buyerId, buyerEvents] of byBuyer.entries()) {
      const featureAccum = new Map<string, { mean: number; std: number; n: number }>();
      let eventsApplied = 0;

      for (const ev of buyerEvents) {
        const baseSignal = EVENT_SIGNAL[ev.event_type];
        if (baseSignal === undefined) continue;

        const decay = timeDecay(ev.event_ts);
        const match = matchById.get(ev.match_id);
        const contribs = match?.feature_contributions;
        if (!Array.isArray(contribs) || contribs.length === 0) continue;

        const absSum = contribs.reduce((acc: number, c: any) =>
          acc + Math.abs(Number(c.contribution ?? 0)), 0) || 1;

        const penaltyFeats = ev.rejection_reason
          ? (REJECTION_FEATURE_PENALTY[ev.rejection_reason] ?? [])
          : [];

        for (const c of contribs) {
          const featName = String(c.feature ?? "");
          if (!featName) continue;
          const featContribNorm = Math.abs(Number(c.contribution ?? 0)) / absSum;
          let observation = baseSignal;
          if (penaltyFeats.includes(featName)) observation -= 0.3;
          observation = Math.max(-1, Math.min(1, observation));
          const weight = decay * (0.3 + featContribNorm);

          const key = `${buyerId}|${featName}`;
          const dbPrior = thetaIdx.get(key);
          const accumulated = featureAccum.get(featName);
          const prior = accumulated ?? (dbPrior
            ? { mean: Number(dbPrior.posterior_mean), std: Number(dbPrior.posterior_std), n: Number(dbPrior.n_observations) }
            : { mean: 0, std: 1.0, n: 0 });

          const updated = bayesianUpdate(prior, observation, weight);
          featureAccum.set(featName, updated);
          eventsApplied++;
        }
      }

      for (const [featName, posterior] of featureAccum.entries()) {
        upserts.push({
          buyer_id: buyerId,
          feature_name: featName,
          posterior_mean: Number(posterior.mean.toFixed(4)),
          posterior_std: Number(posterior.std.toFixed(4)),
          n_observations: Math.round(posterior.n),
          last_updated: new Date().toISOString(),
        });
      }

      summary.push({
        buyer_id: buyerId,
        events_count: buyerEvents.length,
        features_updated: featureAccum.size,
        events_applied: eventsApplied,
      });
    }

    if (!dryRun && upserts.length) {
      const CHUNK = 200;
      for (let i = 0; i < upserts.length; i += CHUNK) {
        const { error: upErr } = await supabase.schema("equity_brain" as any)
          .from("buyer_revealed_thetas")
          .upsert(upserts.slice(i, i + CHUNK), { onConflict: "buyer_id,feature_name" });
        if (upErr) console.error("upsert chunk error:", upErr);
      }
    }

    await finishRun("success", upserts.length);
    return new Response(JSON.stringify({
      ok: true,
      buyers_updated: summary.length,
      events_processed: events.length,
      thetas_upserted: dryRun ? 0 : upserts.length,
      dry_run: dryRun,
      summary: summary.slice(0, 20),
      sample_thetas: upserts.slice(0, 10),
      run_id: runId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (innerErr: any) {
      await finishRun("error", 0, innerErr?.message ?? String(innerErr));
      throw innerErr;
    }
  } catch (err: any) {
    console.error("update-buyer-revealed-thetas error:", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
