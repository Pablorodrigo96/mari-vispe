// process-match-queue — Worker que drena equity_brain.match_queue
// Lê items pendentes (processed_at IS NULL), chama match-buyer/match-company-v2
// conforme entity_type, e marca processed_at. Roda via cron a cada 5 minutos.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100);

    const { data: items, error } = await sb
      .schema("equity_brain" as any)
      .from("match_queue")
      .select("id, entity_type, entity_id, reason, enqueued_at")
      .is("processed_at", null)
      .order("enqueued_at", { ascending: true })
      .limit(limit);
    if (error) throw error;

    const results: any[] = [];
    for (const it of (items ?? []) as any[]) {
      let fn = "";
      let payload: any = null;
      if (it.entity_type === "buyer") { fn = "match-buyer"; payload = { buyer_id: it.entity_id }; }
      else if (it.entity_type === "company") { fn = "match-company-v2"; payload = { company_cnpj: it.entity_id }; }
      else if (it.entity_type === "mandate") { fn = "match-company-v2"; payload = { mandate_id: it.entity_id }; }

      let ok = false;
      let errMsg: string | null = null;
      if (fn) {
        try {
          const r = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          ok = r.ok;
          if (!ok) errMsg = `${r.status} ${await r.text().catch(() => "")}`.slice(0, 200);
        } catch (e: any) {
          errMsg = e?.message ?? "fetch failed";
        }
      } else {
        errMsg = `unknown entity_type: ${it.entity_type}`;
      }

      // marca como processado mesmo em erro pra não travar fila (pode reenfileirar manualmente)
      await sb
        .schema("equity_brain" as any)
        .from("match_queue")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", it.id);

      results.push({ id: it.id, entity_type: it.entity_type, ok, error: errMsg });
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("process-match-queue error:", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
