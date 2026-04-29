import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Heuristic-only (no AI): cheap and predictable. Runs daily via cron OR on demand.
function classify(daysSince: number, eventCount7d: number, status?: string): { temp: string; reason: string } {
  if (eventCount7d >= 3 || ["loi", "term_sheet", "negotiation"].includes(status ?? "")) {
    return { temp: "hot", reason: `${eventCount7d} interações em 7d` };
  }
  if (daysSince <= 14 && eventCount7d >= 1) {
    return { temp: "warm", reason: `Atividade recente (${daysSince}d)` };
  }
  return { temp: "cold", reason: `Sem interação há ${daysSince}d` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff7d = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: acts } = await admin.schema("equity_brain")
      .from("crm_activities")
      .select("entity_type,entity_id,created_at")
      .gte("created_at", cutoff7d);

    const counts = new Map<string, { count: number; last: string }>();
    for (const a of acts ?? []) {
      const k = `${a.entity_type}:${a.entity_id}`;
      const prev = counts.get(k);
      if (!prev) counts.set(k, { count: 1, last: a.created_at });
      else { prev.count++; if (a.created_at > prev.last) prev.last = a.created_at; }
    }

    const now = Date.now();
    const daysSince = (iso?: string) => iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : 999;

    let updated = 0;

    const [{ data: mandates }, { data: contacts }] = await Promise.all([
      admin.schema("equity_brain").from("mandates").select("id,status,updated_at"),
      admin.schema("equity_brain").from("contacts").select("id,updated_at"),
    ]);

    for (const m of mandates ?? []) {
      const stat = counts.get(`mandate:${m.id}`);
      const ds = daysSince(stat?.last ?? m.updated_at);
      const { temp, reason } = classify(ds, stat?.count ?? 0, m.status);
      await admin.schema("equity_brain").from("mandates").update({
        temperature: temp, temperature_reason: reason, temperature_updated_at: new Date().toISOString(),
      }).eq("id", m.id);
      updated++;
    }
    for (const c of contacts ?? []) {
      const stat = counts.get(`buyer:${c.id}`);
      const ds = daysSince(stat?.last ?? c.updated_at);
      const { temp, reason } = classify(ds, stat?.count ?? 0);
      await admin.schema("equity_brain").from("contacts").update({
        temperature: temp, temperature_reason: reason, temperature_updated_at: new Date().toISOString(),
      }).eq("id", c.id);
      updated++;
    }

    return new Response(JSON.stringify({ ok: true, updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
