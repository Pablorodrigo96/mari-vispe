// Equity Brain v3 — compute-seller-intent
// Etapa 1 do Oráculo v3: materializa 4 sinais estruturais (Receita Federal)
// + score agregado seller_intent_score em equity_brain.company_signals.
// Admin only. Idempotente.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleData } = await admin.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body.dry_run ?? false);

    const runStart = Date.now();
    const { data: runRow } = await admin.schema("equity_brain" as any)
      .from("engine_runs").insert({
        engine: "compute-seller-intent",
        status: "running",
        triggered_by: isServiceRole ? "cron" : "manual",
        metadata: { dry_run: dryRun },
      }).select("id").single();
    const runId = runRow?.id ?? null;

    try {
      let processed = 0;
      let signals = 0;

      if (!dryRun) {
        const { data, error } = await admin.schema("equity_brain" as any)
          .rpc("compute_seller_intent_signals_sql");
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        processed = row?.processed_companies ?? 0;
        signals = row?.signals_upserted ?? 0;
      }

      // Distribuição do seller_intent_score (para o card de monitoramento)
      const { data: dist } = await admin.schema("equity_brain" as any)
        .from("company_signals")
        .select("signal_value")
        .eq("signal_key", "seller_intent_score");

      const values = (dist ?? [])
        .map((r: any) => Number(r.signal_value))
        .filter((v: number) => Number.isFinite(v))
        .sort((a: number, b: number) => a - b);

      const stats = values.length ? {
        count: values.length,
        min: values[0],
        p25: values[Math.floor(values.length * 0.25)],
        median: values[Math.floor(values.length * 0.5)],
        p75: values[Math.floor(values.length * 0.75)],
        p90: values[Math.floor(values.length * 0.9)],
        max: values[values.length - 1],
        high_intent_count: values.filter((v: number) => v >= 0.6).length,
      } : null;

      // Top 10 empresas por intent
      const { data: top } = await admin.schema("equity_brain" as any)
        .from("company_signals")
        .select("cnpj, signal_value, updated_at")
        .eq("signal_key", "seller_intent_score")
        .order("signal_value", { ascending: false })
        .limit(10);

      const cnpjs = (top ?? []).map((t: any) => t.cnpj);
      const { data: companies } = cnpjs.length ? await admin.schema("equity_brain" as any)
        .from("companies")
        .select("cnpj, razao_social, uf, municipio, setor_ma, qtd_socios, data_abertura")
        .in("cnpj", cnpjs) : { data: [] as any[] };

      const companyByCnpj = new Map<string, any>();
      (companies ?? []).forEach((c: any) => companyByCnpj.set(c.cnpj, c));

      const topEnriched = (top ?? []).map((t: any) => ({
        cnpj: t.cnpj,
        score: Number(t.signal_value),
        company: companyByCnpj.get(t.cnpj) ?? null,
      }));

      if (runId) {
        await admin.schema("equity_brain" as any).from("engine_runs").update({
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          rows_processed: processed,
          status: "success",
        }).eq("id", runId);
      }

      return new Response(JSON.stringify({
        ok: true,
        dry_run: dryRun,
        processed_companies: processed,
        signals_upserted: signals,
        intent_distribution: stats,
        top_intent: topEnriched,
        run_id: runId,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (innerErr: any) {
      if (runId) {
        await admin.schema("equity_brain" as any).from("engine_runs").update({
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          status: "error",
          error_message: innerErr?.message ?? String(innerErr),
        }).eq("id", runId);
      }
      throw innerErr;
    }
  } catch (err: any) {
    console.error("compute-seller-intent error:", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
