// Equity Brain — match-batch (Etapa 4)
// Lote massivo: filtra companies_scored e DELEGA scoring para match-company-v2,
// que preenche semantic_fit, wave_pressure, seller_intent, feature_contributions, etc.
// Auth: admin OR service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized", token: "" };
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  const isServiceRole = claimsData?.claims?.role === "service_role";
  if (isServiceRole) return { ok: true, token };
  if (!userId) return { ok: false, status: 401, error: "Unauthorized", token: "" };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only", token: "" };
  return { ok: true, token };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = await checkAuth(req, supabaseUrl, serviceKey);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Reaproveita o JWT original (admin ou service_role) para chamar match-company-v2
    const forwardAuth = req.headers.get("Authorization") ?? `Bearer ${serviceKey}`;

    const body = await req.json().catch(() => ({}));
    const filter = body.filter ?? {};
    const limit: number = Math.min(Number(body.limit ?? 500), 2000);
    const chunkSize: number = Math.min(Number(body.chunk_size ?? 50), 100);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Seleciona CNPJs alvo
    let q = supabase
      .schema("equity_brain" as any)
      .from("companies_scored")
      .select("cnpj")
      .order("ma_score", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (filter.uf) q = q.eq("uf", String(filter.uf).toUpperCase());
    if (filter.setor_ma) q = q.eq("setor_ma", String(filter.setor_ma));
    if (filter.min_ma_score != null) q = q.gte("ma_score", Number(filter.min_ma_score));

    const { data: targets, error: tErr } = await q;
    if (tErr) {
      return new Response(JSON.stringify({ error: tErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const allCnpjs: string[] = (targets ?? []).map((c: any) => c.cnpj);
    if (!allCnpjs.length) {
      return new Response(JSON.stringify({ companies_processed: 0, total_matches: 0, chunks: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Marca matches v1 antigos como não-current (limpa a v1 stale)
    await supabase.schema("equity_brain" as any).from("matches")
      .update({ is_current: false })
      .in("cnpj", allCnpjs)
      .or("engine_version.is.null,engine_version.eq.v1")
      .eq("is_current", true);

    // 3) Invoca match-company-v2 em chunks via HTTP (com service_role key)
    let totalMatches = 0;
    let chunks = 0;
    const errors: string[] = [];

    for (let i = 0; i < allCnpjs.length; i += chunkSize) {
      const cnpjChunk = allCnpjs.slice(i, i + chunkSize);
      chunks++;
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/match-company-v2`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: forwardAuth,
            apikey: serviceKey,
          },
          body: JSON.stringify({ cnpjs: cnpjChunk, limit_companies: cnpjChunk.length, persist: true }),
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          errors.push(`chunk ${chunks}: ${json.error ?? resp.statusText}`);
        } else {
          totalMatches += Number(json.processed ?? 0);
        }
      } catch (e: any) {
        errors.push(`chunk ${chunks}: ${e?.message ?? e}`);
      }
    }

    return new Response(JSON.stringify({
      companies_processed: allCnpjs.length,
      total_matches: totalMatches,
      chunks,
      errors: errors.slice(0, 10),
      engine: "v2",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("match-batch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
