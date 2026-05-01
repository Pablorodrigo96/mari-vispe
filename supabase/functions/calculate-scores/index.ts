// Equity Brain — calculate-scores
// Calcula ma_score, vispe_score e sucessao_score (0..100) a partir de company_signals + signal_catalog.
// Persistência versionada: marca scores anteriores is_current=false e insere novos is_current=true.
// Auth: admin (via user_roles) ou service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FORMULA_VERSION = "v1.0";
const NORM = { ma: 200, vispe: 80, sucessao: 100 };

serve(withObservability(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check: admin OR service_role
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const isServiceRoleByToken = token === serviceKey;
    const { data: claimsData } = isServiceRoleByToken ? { data: null } as any : await supabaseUser.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    const isServiceRole = isServiceRoleByToken || claimsData?.claims?.role === "service_role";

    if (!isServiceRole) {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabaseAdminCheck = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: roleData } = await supabaseAdminCheck
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const cnpjs: string[] | undefined = Array.isArray(body.cnpjs) ? body.cnpjs : undefined;
    const filter = body.filter ?? {};
    const limit: number = Math.min(Number(body.limit ?? 500), 5000);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Carrega catálogo de signals (cache em memória)
    const { data: catalog, error: catErr } = await supabase
      .schema("equity_brain" as any)
      .from("signal_catalog")
      .select("signal_key, default_weight, affects_scores");
    if (catErr) {
      console.error("Catalog fetch error:", catErr);
      return new Response(JSON.stringify({ error: catErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cat = new Map<string, any>();
    for (const c of catalog ?? []) cat.set((c as any).signal_key, c);

    // 2) Seleciona empresas alvo
    let targetCnpjs: string[] = [];
    if (cnpjs && cnpjs.length > 0) {
      targetCnpjs = cnpjs.slice(0, limit);
    } else {
      // Empresas que têm pelo menos 1 signal, opcionalmente filtradas por uf/setor_ma
      let q = supabase
        .schema("equity_brain" as any)
        .from("companies")
        .select("cnpj")
        .limit(limit);
      if (filter.uf) q = q.eq("uf", String(filter.uf).toUpperCase());
      if (filter.setor_ma) q = q.eq("setor_ma", String(filter.setor_ma));
      const { data: companiesList, error: compErr } = await q;
      if (compErr) {
        console.error("Companies fetch error:", compErr);
        return new Response(JSON.stringify({ error: compErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targetCnpjs = (companiesList ?? []).map((c: any) => c.cnpj);
    }

    if (targetCnpjs.length === 0) {
      return new Response(JSON.stringify({ scored: 0, sample_top: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Carrega signals do lote (em chunks p/ não estourar limite IN)
    const allSignals: any[] = [];
    const fetchChunk = 500;
    for (let i = 0; i < targetCnpjs.length; i += fetchChunk) {
      const slice = targetCnpjs.slice(i, i + fetchChunk);
      const { data: sigs, error: sigErr } = await supabase
        .schema("equity_brain" as any)
        .from("company_signals")
        .select("cnpj, signal_key, weight")
        .in("cnpj", slice);
      if (sigErr) {
        console.error("Signals fetch error:", sigErr);
        return new Response(JSON.stringify({ error: sigErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (sigs) allSignals.push(...sigs);
    }

    // 4) Agrupa signals por cnpj
    const byCnpj = new Map<string, any[]>();
    for (const s of allSignals) {
      const arr = byCnpj.get(s.cnpj);
      if (arr) arr.push(s);
      else byCnpj.set(s.cnpj, [s]);
    }

    // 5) Aplica filtro min_signals (se vier)
    const minSignals: number = Number(filter.min_signals ?? 0);
    const eligible = minSignals > 0
      ? targetCnpjs.filter((c) => (byCnpj.get(c)?.length ?? 0) >= minSignals)
      : targetCnpjs;

    // 6) Calcula scores
    const norm = (v: number, d: number) => Math.min(100, Math.round((v / d) * 1000) / 10);
    const newRows: any[] = [];

    for (const cnpj of eligible) {
      const sigs = byCnpj.get(cnpj) ?? [];
      let ma = 0, vispe = 0, suc = 0;
      const maBreak: Record<string, number> = {};
      const vispeBreak: Record<string, number> = {};
      const sucBreak: Record<string, number> = {};

      for (const s of sigs) {
        const c = cat.get(s.signal_key);
        if (!c) continue;
        const w = Number(s.weight ?? c.default_weight ?? 0);
        const affects: string[] = c.affects_scores ?? [];
        if (affects.includes("ma_score")) { ma += w; maBreak[s.signal_key] = w; }
        if (affects.includes("vispe_score")) { vispe += w; vispeBreak[s.signal_key] = w; }
        if (affects.includes("sucessao_score")) { suc += w; sucBreak[s.signal_key] = w; }
      }

      newRows.push({
        cnpj,
        ma_score: norm(ma, NORM.ma),
        vispe_score: norm(vispe, NORM.vispe),
        sucessao_score: norm(suc, NORM.sucessao),
        ma_breakdown: maBreak,
        vispe_breakdown: vispeBreak,
        sucessao_breakdown: sucBreak,
        formula_version: FORMULA_VERSION,
        is_current: true,
      });
    }

    if (newRows.length === 0) {
      return new Response(JSON.stringify({ scored: 0, sample_top: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7) Marca scores antigos como is_current=false (em chunks)
    const writeChunk = 1000;
    for (let i = 0; i < eligible.length; i += writeChunk) {
      const slice = eligible.slice(i, i + writeChunk);
      const { error: updErr } = await supabase
        .schema("equity_brain" as any)
        .from("company_scores")
        .update({ is_current: false })
        .in("cnpj", slice)
        .eq("is_current", true)
        .eq("formula_version", FORMULA_VERSION);
      if (updErr) {
        console.error("Mark old scores error:", updErr);
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 8) Insere novos scores em chunks
    let inserted = 0;
    for (let i = 0; i < newRows.length; i += writeChunk) {
      const chunk = newRows.slice(i, i + writeChunk);
      const { error: insErr } = await supabase
        .schema("equity_brain" as any)
        .from("company_scores")
        .insert(chunk);
      if (insErr) {
        console.error("Insert scores error:", insErr);
        return new Response(JSON.stringify({
          error: insErr.message,
          partial: inserted,
          warning: "Scores antigos marcados is_current=false; rode novamente para recuperar.",
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      inserted += chunk.length;
    }

    const sampleTop = [...newRows]
      .sort((a, b) => b.ma_score - a.ma_score)
      .slice(0, 5)
      .map((r) => ({ cnpj: r.cnpj, ma: r.ma_score, vispe: r.vispe_score, suc: r.sucessao_score }));

    return new Response(JSON.stringify({
      scored: inserted,
      formula_version: FORMULA_VERSION,
      sample_top: sampleTop,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("calculate-scores error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}, { name: "calculate-scores" }));
