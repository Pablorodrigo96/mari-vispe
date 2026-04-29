import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Heurística pura: rápida, previsível e LGPD-friendly (sem texto enviado a IA).
function classify(daysSince: number, eventCount7d: number, status?: string): { temp: string; reason: string } {
  if (eventCount7d >= 3 || ["loi", "term_sheet", "negotiation"].includes(status ?? "")) {
    return { temp: "hot", reason: `${eventCount7d} interações em 7d` };
  }
  if (daysSince <= 14 && eventCount7d >= 1) {
    return { temp: "warm", reason: `Atividade recente (${daysSince}d)` };
  }
  return { temp: "cold", reason: `Sem interação há ${daysSince}d` };
}

async function rescoreSingle(admin: any, entityType: "mandate" | "buyer", entityId: string) {
  const cutoff7d = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: acts } = await admin.schema("equity_brain")
    .from("crm_activities")
    .select("created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .gte("created_at", cutoff7d);

  const count = acts?.length ?? 0;
  const last = acts?.reduce((m: string, a: any) => (a.created_at > m ? a.created_at : m), "");

  const tableName = entityType === "mandate" ? "mandates" : "contacts";
  const { data: row } = await admin.schema("equity_brain")
    .from(tableName).select("status,updated_at").eq("id", entityId).maybeSingle();

  const lastIso = last || row?.updated_at;
  const ds = lastIso ? Math.floor((Date.now() - new Date(lastIso).getTime()) / 86400000) : 999;
  const { temp, reason } = classify(ds, count, row?.status);

  await admin.schema("equity_brain").from(tableName).update({
    temperature: temp,
    temperature_reason: reason,
    temperature_updated_at: new Date().toISOString(),
  }).eq("id", entityId);

  return { entityType, entityId, temp, reason };
}

async function rescoreBatch(admin: any) {
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
  return { updated };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    try { body = await req.json(); } catch { /* GET / sem body = batch */ }

    // single: { entity_type, entity_id }
    if (body?.entity_type && body?.entity_id) {
      const out = await rescoreSingle(admin, body.entity_type, body.entity_id);
      return new Response(JSON.stringify({ ok: true, ...out }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // batch (default)
    const out = await rescoreBatch(admin);
    return new Response(JSON.stringify({ ok: true, ...out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
