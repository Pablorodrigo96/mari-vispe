import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Compares the latest match snapshot for a buyer with the new top-N
 * and notifies the responsible advisor when a new high-score match
 * (>= 0.80) appears that wasn't in the previous top 5.
 */
Deno.serve(withObservability(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { buyer_id, top_mandate_ids = [], top_scores = [] } = await req.json();

    if (!buyer_id || !Array.isArray(top_mandate_ids)) {
      return new Response(JSON.stringify({ error: "buyer_id and top_mandate_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Last snapshot
    const { data: prev } = await admin
      .schema("equity_brain")
      .from("match_snapshots")
      .select("top_mandate_ids")
      .eq("buyer_id", buyer_id)
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevTop = new Set<string>((prev?.top_mandate_ids ?? []).slice(0, 5));
    const newEntries: { id: string; score: number }[] = [];
    for (let i = 0; i < Math.min(top_mandate_ids.length, 5); i++) {
      const id = top_mandate_ids[i];
      const score = Number(top_scores[i] ?? 0);
      if (!prevTop.has(id) && score >= 0.8) newEntries.push({ id, score });
    }

    // Save new snapshot
    await admin.schema("equity_brain").from("match_snapshots").insert({
      buyer_id,
      top_mandate_ids,
      top_scores,
    });

    if (newEntries.length === 0) {
      return new Response(JSON.stringify({ new: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve owner of buyer (advisor/admin) — best-effort via buyer_profiles.user_id
    const { data: buyer } = await admin
      .from("buyer_profiles")
      .select("user_id, buyer_name")
      .eq("id", buyer_id)
      .maybeSingle();

    if (buyer?.user_id) {
      await admin.from("notifications").insert({
        user_id: buyer.user_id,
        type: "match_new",
        title: "Novos matches relevantes",
        content: `${newEntries.length} nova(s) oportunidade(s) com alta aderência para ${buyer.buyer_name ?? "buyer"}.`,
      });
    }

    return new Response(JSON.stringify({ new: newEntries.length, entries: newEntries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { name: "crm-detect-new-matches" }));
