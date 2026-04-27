// Equity Brain — sync-listings-to-equity-brain
// Garante que toda listing do marketplace está em equity_brain.companies e
// dispara a pipeline (signals → scores → opportunities) para reranquear.
// Auth: admin only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authorization
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
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!roleData) return json({ error: "Forbidden: admin only" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const runPipeline: boolean = body.run_pipeline !== false; // default true

    // 1) Sync: re-aplica o upsert para todas as listings (a trigger só roda no INSERT/UPDATE)
    const { data: listings, error: listErr } = await admin
      .from("listings")
      .select("id");
    if (listErr) return json({ error: listErr.message }, 500);

    let synced = 0;
    const errors: string[] = [];
    for (const l of listings ?? []) {
      const { data, error } = await admin
        .schema("equity_brain" as any)
        .rpc("upsert_company_from_listing" as any, { p_listing_id: l.id });
      if (error) {
        errors.push(`${l.id}: ${error.message}`);
      } else if (data) {
        synced++;
      }
    }

    const result: any = { synced, total_listings: listings?.length ?? 0, errors };

    if (!runPipeline) {
      return json(result);
    }

    // 2) Pipeline em cascata: signals → scores → opportunities
    const fnHeaders = {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      apikey: serviceKey,
    };

    async function callFn(name: string, payload: unknown) {
      const resp = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: "POST",
        headers: fnHeaders,
        body: JSON.stringify(payload),
      });
      const text = await resp.text();
      let parsed: any = text;
      try { parsed = JSON.parse(text); } catch { /* keep text */ }
      return { ok: resp.ok, status: resp.status, body: parsed };
    }

    result.signals       = await callFn("compute-signals",        { limit: 5000 });
    result.scores        = await callFn("calculate-scores",       { limit: 5000 });
    result.opportunities = await callFn("refresh-opportunities",  { top_n: 5000 });

    return json(result);
  } catch (e) {
    console.error("sync-listings-to-equity-brain error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }

  function json(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
