// Equity Brain CRM — rematch-buyer
// Recalcula matches para um único buyer (após mudança de preferência) chamando
// match-company-v2 em modo escopado. Idempotente. Admin/advisor only OU service_role
// (a trigger SQL chama via service role).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    const isServiceRole = claimsData?.claims?.role === "service_role";

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    if (!isServiceRole) {
      if (!userId) return json({ error: "Unauthorized" }, 401);
      const { data: roleData } = await admin
        .from("user_roles").select("role").eq("user_id", userId)
        .in("role", ["admin", "advisor"]).maybeSingle();
      if (!roleData) return json({ error: "Forbidden" }, 403);
    }

    const { buyer_id } = await req.json().catch(() => ({}));
    if (!buyer_id || typeof buyer_id !== "string") {
      return json({ error: "buyer_id required" }, 400);
    }

    // Conta matches atuais antes
    const { count: beforeCount } = await admin
      .schema("equity_brain" as any)
      .from("matches" as any)
      .select("*", { count: "exact", head: true })
      .eq("buyer_id", buyer_id)
      .eq("is_current", true);

    // Invoca match-company-v2 em modo single-buyer
    const resp = await fetch(`${supabaseUrl}/functions/v1/match-company-v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        apikey: serviceKey,
      },
      body: JSON.stringify({ buyer_ids: [buyer_id], persist: true, limit_companies: 2000 }),
    });
    const engineResult = await resp.json().catch(() => ({}));

    // Conta depois
    const { count: afterCount } = await admin
      .schema("equity_brain" as any)
      .from("matches" as any)
      .select("*", { count: "exact", head: true })
      .eq("buyer_id", buyer_id)
      .eq("is_current", true);

    // Log activity
    await admin
      .schema("equity_brain" as any)
      .from("crm_activities" as any)
      .insert({
        entity_type: "buyer",
        entity_id: buyer_id,
        kind: "match_event",
        direction: "system",
        body: `Rematch automático: ${beforeCount ?? 0} → ${afterCount ?? 0} matches ativos`,
        metadata: { engine: "v2", before: beforeCount, after: afterCount, engine_result: engineResult },
      });

    return json({
      ok: true,
      buyer_id,
      before: beforeCount ?? 0,
      after: afterCount ?? 0,
      engine: engineResult,
    });
  } catch (e) {
    console.error("rematch-buyer error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }

  function json(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
