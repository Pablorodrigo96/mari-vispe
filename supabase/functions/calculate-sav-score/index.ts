// Equity Brain — calculate-sav-score (Fase E2)
// Calcula sav_score (Score Assimetria de Valor) por match.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function authorize(req: Request): Promise<{ ok: boolean; status?: number; supabase?: any }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401 };
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) {
    return { ok: true, supabase: createClient(url, serviceKey, { auth: { persistSession: false } }) };
  }
  const sUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await sUser.auth.getClaims(token);
  const userId = claims?.claims?.sub;
  if (claims?.claims?.role === "service_role") {
    return { ok: true, supabase: createClient(url, serviceKey, { auth: { persistSession: false } }) };
  }
  if (!userId) return { ok: false, status: 401 };
  const sa = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: r } = await sa.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!r) return { ok: false, status: 403 };
  return { ok: true, supabase: sa };
}

async function calcOne(supabase: any, matchId: string) {
  const { data: match, error } = await supabase
    .schema("equity_brain" as any)
    .from("matches")
    .select("id, cnpj, buyer_id, is_current")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;
  if (!match) throw new Error("match not found");

  const [{ data: company }, { data: buyer }] = await Promise.all([
    supabase.schema("equity_brain" as any).from("companies")
      .select("cnpj, setor_ma, subsetor_ma, uf, municipio").eq("cnpj", match.cnpj).maybeSingle(),
    supabase.schema("equity_brain" as any).from("buyers")
      .select("id, nome, tipo_comprador, setores_interesse, subsetores_interesse, ufs_interesse, municipios_interesse, deals_last_12m, recent_capital_raise_brl")
      .eq("id", match.buyer_id).maybeSingle(),
  ]);
  if (!company || !buyer) throw new Error("company or buyer not found");

  // Historical deals (best-effort; benchmark may be empty)
  const firstToken = String(buyer.nome ?? "").split(/\s+/)[0] ?? "";
  let historicalDeals: any[] = [];
  if (firstToken) {
    const { data: hd } = await supabase.schema("equity_brain" as any).from("benchmark_transactions")
      .select("id").ilike("comprador_nome", `%${firstToken}%`).limit(5);
    historicalDeals = hd ?? [];
  }

  const setores: string[] = buyer.setores_interesse ?? [];
  const subsetores: string[] = buyer.subsetores_interesse ?? [];
  const ufs: string[] = buyer.ufs_interesse ?? [];
  const municipios: string[] = buyer.municipios_interesse ?? [];
  const tipo: string | null = buyer.tipo_comprador ?? null;

  // 1. Sinergia de custo (25%)
  let sinergiaCusto = 30;
  if (company.setor_ma && setores.includes(company.setor_ma)) {
    sinergiaCusto = 70;
    if (tipo === "estrategico_incumbente") sinergiaCusto = 85;
    if (tipo === "consolidador") sinergiaCusto = 80;
  }
  // 2. Sinergia de receita (15%)
  let sinergiaReceita = 40;
  if (company.subsetor_ma && subsetores.includes(company.subsetor_ma)) sinergiaReceita = 75;
  // 3. Eliminação competitiva (15%)
  let eliminacao = 30;
  if (company.uf && ufs.includes(company.uf)) {
    eliminacao = 70;
    if (tipo === "estrategico_incumbente") eliminacao = 90;
    if (tipo === "eliminatorio") eliminacao = 95;
  }
  // 4. Geografia (15%)
  let geografia = 30;
  if (company.uf && ufs.includes(company.uf)) geografia = 75;
  if (company.municipio && municipios.includes(company.municipio)) geografia = 90;
  // 5. Custo de oportunidade (15%)
  let custoOportunidade = 50;
  if (tipo === "estrategico_entrante") custoOportunidade = 85;
  if (tipo === "plataforma_pe") custoOportunidade = 80;
  if (tipo === "internacional") custoOportunidade = 80;
  if (tipo === "oportunista") custoOportunidade = 20;
  // 6. Encaixe estratégico (15%)
  let encaixe = 40;
  if (buyer.deals_last_12m && buyer.deals_last_12m >= 3) encaixe += 20;
  if (buyer.recent_capital_raise_brl && buyer.recent_capital_raise_brl > 100_000_000) encaixe += 15;
  if (historicalDeals.length >= 2) encaixe += 15;
  encaixe = Math.min(100, encaixe);

  const sav = Math.round(
    sinergiaCusto * 0.25 +
    sinergiaReceita * 0.15 +
    eliminacao * 0.15 +
    geografia * 0.15 +
    custoOportunidade * 0.15 +
    encaixe * 0.15
  );

  const breakdown = {
    sinergia_custo: sinergiaCusto,
    sinergia_receita: sinergiaReceita,
    eliminacao_competitiva: eliminacao,
    geografia,
    custo_oportunidade: custoOportunidade,
    encaixe_estrategico: encaixe,
    historical_deals_count: historicalDeals.length,
    buyer_tipo: tipo,
  };

  const { error: upErr } = await supabase.schema("equity_brain" as any)
    .from("matches").update({
      sav_score: sav,
      sav_breakdown: breakdown,
      sav_calculated_at: new Date().toISOString(),
    }).eq("id", matchId);
  if (upErr) throw upErr;

  return { sav, breakdown };
}

serve(withObservability(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const auth = await authorize(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.status === 403 ? "Forbidden" : "Unauthorized" }), {
        status: auth.status ?? 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = auth.supabase!;
    const body = await req.json().catch(() => ({}));

    if (body.match_id) {
      const r = await calcOne(supabase, body.match_id);
      return new Response(JSON.stringify({ ok: true, ...r }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = Math.min(Number(body.limit ?? 200), 500);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: matches, error: listErr } = await supabase
      .schema("equity_brain" as any).from("matches")
      .select("id")
      .eq("is_current", true)
      .or(`sav_calculated_at.is.null,sav_calculated_at.lt.${cutoff}`)
      .order("match_score", { ascending: false })
      .limit(limit);
    if (listErr) throw listErr;

    let success = 0, errors = 0;
    for (const m of matches ?? []) {
      try { await calcOne(supabase, (m as any).id); success++; }
      catch (e) { errors++; console.error("sav err", (m as any).id, e); }
    }
    return new Response(JSON.stringify({ processed: matches?.length ?? 0, success, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("calculate-sav-score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { name: "calculate-sav-score" }));
