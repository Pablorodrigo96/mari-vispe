// mari-refresh-active-summaries — Cron a cada 4h.
// Pega os 50 mandatos com maior priority_score e chama mari-summarize-deal
// para os que não têm resumo válido em cache.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function handler(_req: Request): Promise<Response> {
  const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Top 50 mandatos ativos por priority_score
  const { data: mandates = [] } = await supa
    .schema("equity_brain")
    .from("mandates")
    .select("id, priority_score")
    .not("status", "in", '("won","lost","cancelled","archived")')
    .order("priority_score", { ascending: false, nullsFirst: false })
    .limit(50);

  // Quais já têm resumo válido?
  const ids = mandates.map((m: any) => m.id);
  const { data: cached = [] } = await supa
    .schema("equity_brain")
    .from("mandate_summaries")
    .select("mandate_id, expires_at")
    .in("mandate_id", ids)
    .gt("expires_at", new Date().toISOString());

  const cachedSet = new Set(cached.map((c: any) => c.mandate_id));
  const toRefresh = mandates.filter((m: any) => !cachedSet.has(m.id));

  let ok = 0, fail = 0;
  for (const m of toRefresh) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/mari-summarize-deal`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mandate_id: m.id }),
      });
      if (resp.ok) ok++; else fail++;
      await resp.text(); // drain
      // Pequeno delay para não martelar o gateway
      await new Promise((r) => setTimeout(r, 250));
    } catch {
      fail++;
    }
  }

  return new Response(JSON.stringify({
    total_active: mandates.length,
    already_cached: cached.length,
    refreshed: ok,
    failed: fail,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(withObservability(handler, { name: "mari-refresh-active-summaries" }));
