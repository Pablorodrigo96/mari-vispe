// Equity Brain — calculate-vendabilidade-batch (Fase E2)
// Calcula score_vendabilidade para companies qualified (ou stale > 7d).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(withObservability(async (req) => {
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
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    // Auth: admin OR service role
    let isServiceRole = token === serviceKey;
    if (!isServiceRole) {
      const sUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await sUser.auth.getClaims(token);
      const userId = claims?.claims?.sub;
      isServiceRole = claims?.claims?.role === "service_role";
      if (!isServiceRole) {
        if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        const sa = createClient(url, serviceKey, { auth: { persistSession: false } });
        const { data: r } = await sa.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
        if (!r) return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const limit: number = Math.min(Number(body.limit ?? 250), 1000);
    const force: boolean = !!body.force;

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let q = supabase.schema("equity_brain" as any).from("companies")
      .select("cnpj")
      .eq("qualification_status", "qualified")
      .limit(limit);
    if (!force) q = q.or(`sv_calculated_at.is.null,sv_calculated_at.lt.${cutoff}`);
    const { data: companies, error: listErr } = await q;
    if (listErr) throw listErr;

    let success = 0, errors = 0;
    const sample: any[] = [];

    for (const c of companies ?? []) {
      try {
        const { data: result, error: rpcErr } = await supabase
          .schema("equity_brain" as any)
          .rpc("calculate_sv", { p_company_cnpj: (c as any).cnpj });
        if (rpcErr) throw rpcErr;
        const r: any = Array.isArray(result) ? result[0] : result;
        if (!r) throw new Error("empty rpc result");

        const { error: upErr } = await supabase.schema("equity_brain" as any)
          .from("companies").update({
            score_vendabilidade: r.score,
            nivel_maturidade: r.nivel,
            sv_breakdown: r.breakdown,
            sv_data_completeness: r.data_completeness,
            sv_calculated_at: new Date().toISOString(),
          }).eq("cnpj", (c as any).cnpj);
        if (upErr) throw upErr;

        success++;
        if (sample.length < 5) sample.push({ cnpj: (c as any).cnpj, score: r.score, nivel: r.nivel });
      } catch (e) {
        errors++;
        console.error("sv error", (c as any).cnpj, e);
      }
    }

    return new Response(JSON.stringify({
      processed: companies?.length ?? 0,
      success, errors, sample,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("calculate-vendabilidade-batch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { name: "calculate-vendabilidade-batch" }));
