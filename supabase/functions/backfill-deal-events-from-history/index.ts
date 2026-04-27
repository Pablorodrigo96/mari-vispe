// Equity Brain v2 — backfill-deal-events-from-history
// Popula equity_brain.deal_events a partir de interest_logs (contacted) e
// messages agrupadas (reply_received quando ≥2 mensagens do mesmo sender no listing).
// Idempotente via metadata.source.
//
// POST /backfill-deal-events-from-history
//   { dry_run?: boolean = false }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = new Date().toISOString();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let backfilledInterest = 0;
  let backfilledReplies = 0;
  let status = "success";
  let errorMsg: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    // ─── 1. interest_logs → contacted ───
    const { data: interests, error: intErr } = await supabase
      .from("interest_logs")
      .select("id, listing_id, investor_email, created_at")
      .not("investor_email", "is", null)
      .limit(5000);
    if (intErr) throw intErr;

    // Buscar cnpjs das listings
    const listingIds = [...new Set((interests ?? []).map((i: any) => i.listing_id))];
    const { data: listings } = await supabase
      .from("listings")
      .select("id, cnpj")
      .in("id", listingIds);
    const listingCnpj = new Map((listings ?? []).map((l: any) => [l.id, l.cnpj]));

    // Buscar eventos já backfilled para evitar duplicatas
    const { data: existingInterest } = await supabase
      .schema("equity_brain")
      .from("deal_events")
      .select("metadata")
      .eq("event_type", "contacted")
      .contains("metadata", { source: "backfill_interest" })
      .limit(10000);
    const seenInterestIds = new Set(
      (existingInterest ?? []).map((e: any) => e.metadata?.interest_id).filter(Boolean),
    );

    const interestRows: any[] = [];
    for (const i of interests ?? []) {
      if (seenInterestIds.has(i.id)) continue;
      const cnpj = listingCnpj.get(i.listing_id);
      if (!cnpj) continue;
      interestRows.push({
        match_id: null,
        cnpj,
        buyer_id: null,
        event_type: "contacted",
        created_at: i.created_at,
        notes: `Backfill from interest_logs (${i.investor_email})`,
        metadata: { source: "backfill_interest", interest_id: i.id, investor_email: i.investor_email },
      });
    }

    if (!dryRun && interestRows.length > 0) {
      // Batch inserts em lotes de 500
      for (let off = 0; off < interestRows.length; off += 500) {
        const slice = interestRows.slice(off, off + 500);
        const { error } = await supabase.schema("equity_brain").from("deal_events").insert(slice);
        if (error) console.error("interest batch error:", error);
        else backfilledInterest += slice.length;
      }
    } else {
      backfilledInterest = interestRows.length;
    }

    // ─── 2. messages → reply_received (≥2 mensagens do mesmo sender) ───
    const { data: msgs, error: msgErr } = await supabase
      .from("messages")
      .select("listing_id, sender_email, created_at")
      .not("sender_email", "is", null)
      .limit(10000);
    if (msgErr) throw msgErr;

    // Agrupar por (listing_id, sender_email)
    const groups = new Map<string, { listing_id: string; sender_email: string; count: number; first: string }>();
    for (const m of msgs ?? []) {
      const key = `${m.listing_id}::${m.sender_email}`;
      const g = groups.get(key);
      if (g) { g.count++; if (m.created_at < g.first) g.first = m.created_at; }
      else groups.set(key, { listing_id: m.listing_id, sender_email: m.sender_email, count: 1, first: m.created_at });
    }

    const replyListingIds = [...new Set([...groups.values()].map((g) => g.listing_id))];
    const { data: replyListings } = await supabase
      .from("listings").select("id, cnpj").in("id", replyListingIds);
    const replyListingCnpj = new Map((replyListings ?? []).map((l: any) => [l.id, l.cnpj]));

    const { data: existingReplies } = await supabase
      .schema("equity_brain").from("deal_events")
      .select("metadata").eq("event_type", "reply_received")
      .contains("metadata", { source: "backfill_reply" }).limit(10000);
    const seenReplyKeys = new Set(
      (existingReplies ?? []).map((e: any) => e.metadata?.group_key).filter(Boolean),
    );

    const replyRows: any[] = [];
    for (const [key, g] of groups) {
      if (g.count < 2) continue;
      if (seenReplyKeys.has(key)) continue;
      const cnpj = replyListingCnpj.get(g.listing_id);
      if (!cnpj) continue;
      replyRows.push({
        match_id: null,
        cnpj,
        buyer_id: null,
        event_type: "reply_received",
        created_at: g.first,
        notes: `Backfill from messages (${g.count} msgs from ${g.sender_email})`,
        metadata: { source: "backfill_reply", group_key: key, message_count: g.count, sender_email: g.sender_email },
      });
    }

    if (!dryRun && replyRows.length > 0) {
      for (let off = 0; off < replyRows.length; off += 500) {
        const slice = replyRows.slice(off, off + 500);
        const { error } = await supabase.schema("equity_brain").from("deal_events").insert(slice);
        if (error) console.error("reply batch error:", error);
        else backfilledReplies += slice.length;
      }
    } else {
      backfilledReplies = replyRows.length;
    }

    await supabase.schema("equity_brain").from("engine_runs").insert({
      engine_name: "backfill-deal-events-from-history",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "success",
      rows_processed: backfilledInterest + backfilledReplies,
      metadata: { dry_run: dryRun, backfilled_interest: backfilledInterest, backfilled_replies: backfilledReplies },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      success: true, dry_run: dryRun,
      backfilled_interest: backfilledInterest,
      backfilled_replies: backfilledReplies,
      total: backfilledInterest + backfilledReplies,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    status = "error";
    errorMsg = e instanceof Error ? e.message : "Unknown error";
    console.error("backfill error:", e);
    await supabase.schema("equity_brain").from("engine_runs").insert({
      engine_name: "backfill-deal-events-from-history",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status, rows_processed: backfilledInterest + backfilledReplies,
      error_message: errorMsg,
    }).then(() => {}, () => {});
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
