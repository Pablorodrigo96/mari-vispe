// Edge function: track-event (anon-allowed) — registra page_views, page_leave e CTAs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED = new Set(["page_view", "page_leave", "signup", "lead", "cta_click"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const event_type = String(body.event_type ?? "");
    if (!ALLOWED.has(event_type)) {
      return new Response(JSON.stringify({ error: "invalid event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session_key = String(body.session_key ?? "").slice(0, 80);
    if (!session_key) {
      return new Response(JSON.stringify({ error: "missing session_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const path = body.path ? String(body.path).slice(0, 500) : null;
    const title = body.title ? String(body.title).slice(0, 300) : null;
    const referrer = body.referrer ? String(body.referrer).slice(0, 500) : null;
    const user_agent = body.user_agent ? String(body.user_agent).slice(0, 500) : null;
    const device = body.device ? String(body.device).slice(0, 20) : null;
    const utm_source = body.utm_source ? String(body.utm_source).slice(0, 100) : null;
    const utm_medium = body.utm_medium ? String(body.utm_medium).slice(0, 100) : null;
    const utm_campaign = body.utm_campaign ? String(body.utm_campaign).slice(0, 100) : null;
    const duration_ms = Number.isFinite(Number(body.duration_ms)) ? Math.min(Number(body.duration_ms), 60 * 60 * 1000) : null;
    const user_id = body.user_id ? String(body.user_id) : null;
    const visitor_id = body.visitor_id ? String(body.visitor_id).slice(0, 80) : null;
    const metadata = body.metadata ?? null;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Calcula is_new_visitor: true se nenhuma sessão anterior existe para esse visitor_id
    let is_new_visitor: boolean | null = null;
    if (visitor_id) {
      const { data: prev } = await sb
        .from("analytics_sessions")
        .select("session_key")
        .eq("visitor_id", visitor_id)
        .neq("session_key", session_key)
        .limit(1);
      is_new_visitor = !prev || prev.length === 0;
    }

    // upsert session
    await sb.from("analytics_sessions").upsert(
      {
        session_key,
        visitor_id,
        is_new_visitor,
        user_id,
        last_seen_at: new Date().toISOString(),
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        device,
        user_agent,
      },
      { onConflict: "session_key" },
    );

    // insert event
    await sb.from("analytics_events").insert({
      session_key,
      visitor_id,
      user_id,
      event_type,
      path,
      title,
      referrer,
      duration_ms,
      metadata,
    });


    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
