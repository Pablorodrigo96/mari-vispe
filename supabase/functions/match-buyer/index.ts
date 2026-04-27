// Equity Brain — match-buyer
// Recalcula matches de UM buyer contra empresas elegíveis (top N por ma_score).
// Auth: admin OR service_role.
// Reusa a lógica de scoring inline (cópia do helper de match-company).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UF_NEIGHBORS: Record<string, string[]> = {
  AC: ["AM", "RO"], AL: ["PE", "SE", "BA"], AM: ["AC", "RO", "MT", "PA", "RR"],
  AP: ["PA"], BA: ["MG", "ES", "SE", "AL", "PE", "PI", "TO", "GO", "DF"],
  CE: ["PI", "PB", "PE", "RN"], DF: ["GO", "MG"], ES: ["RJ", "MG", "BA"],
  GO: ["DF", "MT", "MS", "TO", "BA", "MG"], MA: ["PI", "TO", "PA"],
  MG: ["SP", "RJ", "ES", "BA", "GO", "DF", "MS"],
  MS: ["MT", "GO", "MG", "SP", "PR"], MT: ["RO", "AM", "PA", "TO", "GO", "MS"],
  PA: ["AP", "MA", "TO", "MT", "AM", "RR"], PB: ["RN", "CE", "PE"],
  PE: ["PB", "CE", "PI", "BA", "AL"], PI: ["MA", "TO", "BA", "PE", "CE"],
  PR: ["SC", "SP", "MS"], RJ: ["SP", "MG", "ES"], RN: ["CE", "PB"],
  RO: ["AC", "AM", "MT"], RR: ["AM", "PA"], RS: ["SC"], SC: ["RS", "PR"],
  SE: ["BA", "AL"], SP: ["PR", "MG", "RJ", "MS"],
  TO: ["MA", "PI", "BA", "GO", "MT", "PA"],
};

const PORTE_ORDER = ["ME", "EPP", "MEDIA", "GRANDE"];

function scoreCompanyAgainstBuyer(
  company: any,
  sigSet: Set<string>,
  buyer: any,
  bts: any[],
  thesesIdx: Map<string, any>,
): any[] {
  const out: any[] = [];

  let setor_fit = 0;
  if (buyer.setores_interesse?.includes(company.setor_ma)) setor_fit = 1.0;
  else if (buyer.subsetores_interesse?.includes(company.subsetor_ma)) setor_fit = 0.7;

  let geografia_fit = 0;
  if (!buyer.ufs_interesse || buyer.ufs_interesse.length === 0) geografia_fit = 1.0;
  else if (buyer.ufs_interesse.includes(company.uf)) geografia_fit = 1.0;
  else if ((UF_NEIGHBORS[company.uf] ?? []).some((n: string) => buyer.ufs_interesse.includes(n))) {
    geografia_fit = 0.5;
  }

  let porte_fit = 0;
  if (company.porte && buyer.porte_alvo?.includes(company.porte)) porte_fit = 1.0;
  else if (company.porte && buyer.porte_alvo?.length) {
    const idx = PORTE_ORDER.indexOf(company.porte);
    if (idx >= 0) {
      const adjacent = (buyer.porte_alvo ?? []).some(
        (p: string) => Math.abs(PORTE_ORDER.indexOf(p) - idx) === 1,
      );
      porte_fit = adjacent ? 0.6 : 0;
    }
  }

  for (const bt of bts) {
    const tese = thesesIdx.get(bt.thesis_key);
    if (!tese) continue;

    const required: string[] = tese.required_signals ?? [];
    const boosting: string[] = tese.boosting_signals ?? [];
    const reqHits = required.filter((k: string) => sigSet.has(k)).length;
    const boostHits = boosting.filter((k: string) => sigSet.has(k)).length;

    let tese_fit = 0;
    if (required.length === 0) tese_fit = 0.5;
    else if (reqHits === required.length) tese_fit = 1.0;
    else if (reqHits >= Math.ceil(required.length / 2)) tese_fit = 0.5;
    else continue;

    tese_fit = Math.min(1.0, tese_fit + boostHits * 0.1);
    const ma_norm = (Number(company.ma_score) || 0) / 100;

    const match_score = Math.round(
      (setor_fit * 0.30 + geografia_fit * 0.20 + porte_fit * 0.15 + tese_fit * 0.20 + ma_norm * 0.15) * 100,
    );
    if (match_score < 30) continue;

    const reasons: any[] = [];
    if (setor_fit > 0) reasons.push({ key: "setor", weight: 0.30, value: setor_fit, text: setor_fit === 1 ? `Setor exato (${company.setor_ma})` : `Subsetor compartilhado` });
    if (geografia_fit > 0) reasons.push({ key: "geografia", weight: 0.20, value: geografia_fit, text: geografia_fit === 1 ? `Região-alvo (${company.uf})` : `UF vizinha (${company.uf})` });
    if (porte_fit > 0) reasons.push({ key: "porte", weight: 0.15, value: porte_fit, text: porte_fit === 1 ? `Porte exato (${company.porte})` : `Porte adjacente (${company.porte})` });
    reasons.push({ key: "tese", weight: 0.20, value: tese_fit, text: `Tese "${tese.display_name}" — ${reqHits}/${required.length} required + ${boostHits} boosting` });
    reasons.push({ key: "ma_score", weight: 0.15, value: ma_norm, text: `M&A Score: ${company.ma_score ?? 0}` });

    out.push({
      cnpj: company.cnpj, buyer_id: buyer.id, thesis_key: bt.thesis_key,
      match_score, setor_fit, geografia_fit, porte_fit, tese_fit,
      ma_score_emp: company.ma_score ?? 0, reasons, status: "novo",
      prioridade: match_score >= 70 ? 1 : (match_score >= 50 ? 2 : 3),
      is_current: true,
    });
  }
  return out;
}

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized" };
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) return { ok: true };
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  const isServiceRole = claimsData?.claims?.role === "service_role";
  if (isServiceRole) return { ok: true };
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only" };
  return { ok: true };
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

    const body = await req.json().catch(() => ({}));
    const buyer_id: string | undefined = body.buyer_id;
    const max_companies: number = Math.min(Number(body.max_companies ?? 2000), 5000);
    if (!buyer_id) {
      return new Response(JSON.stringify({ error: "buyer_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Carrega buyer
    const { data: buyer, error: bErr } = await supabase
      .schema("equity_brain" as any)
      .from("buyers")
      .select("*")
      .eq("id", buyer_id)
      .maybeSingle();
    if (bErr || !buyer) {
      return new Response(JSON.stringify({ error: "buyer not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Buyer theses (apenas deste buyer)
    const { data: bts, error: btErr } = await supabase
      .schema("equity_brain" as any)
      .from("buyer_theses")
      .select("*")
      .eq("buyer_id", buyer_id)
      .eq("active", true);
    if (btErr) {
      return new Response(JSON.stringify({ error: btErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!bts || bts.length === 0) {
      return new Response(JSON.stringify({ buyer_id, total_matches: 0, reason: "buyer has no active theses" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Catálogo de teses
    const thesisKeys = bts.map((b: any) => b.thesis_key);
    const { data: theses, error: tErr } = await supabase
      .schema("equity_brain" as any)
      .from("investment_theses")
      .select("*")
      .in("thesis_key", thesisKeys)
      .eq("active", true);
    if (tErr) {
      return new Response(JSON.stringify({ error: tErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const thesesIdx = new Map((theses ?? []).map((t: any) => [t.thesis_key, t]));

    // 4) Filtra companies elegíveis
    let q = supabase
      .schema("equity_brain" as any)
      .from("companies_scored")
      .select("*")
      .order("ma_score", { ascending: false, nullsFirst: false })
      .limit(max_companies);
    if (buyer.setores_interesse?.length) q = q.in("setor_ma", buyer.setores_interesse);
    if (buyer.ufs_interesse?.length) q = q.in("uf", buyer.ufs_interesse);

    const { data: companies, error: cErr } = await q;
    if (cErr) {
      return new Response(JSON.stringify({ error: cErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const companyList = companies ?? [];
    const cnpjs = companyList.map((c: any) => c.cnpj);

    if (!cnpjs.length) {
      // Marca matches antigos do buyer como is_current=false (zera)
      await supabase.schema("equity_brain" as any).from("matches")
        .update({ is_current: false }).eq("buyer_id", buyer_id).eq("is_current", true);
      return new Response(JSON.stringify({ buyer_id, companies_evaluated: 0, total_matches: 0, reason: "no eligible companies" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Carrega signals em chunks
    const signalsByCnpj = new Map<string, Set<string>>();
    for (let i = 0; i < cnpjs.length; i += 200) {
      const slice = cnpjs.slice(i, i + 200);
      const { data: sigs } = await supabase
        .schema("equity_brain" as any)
        .from("company_signals")
        .select("cnpj, signal_key")
        .in("cnpj", slice);
      for (const s of sigs ?? []) {
        const set = signalsByCnpj.get(s.cnpj);
        if (set) set.add(s.signal_key);
        else signalsByCnpj.set(s.cnpj, new Set([s.signal_key]));
      }
    }

    // 6) Score
    const newMatches: any[] = [];
    for (const company of companyList) {
      const sigSet = signalsByCnpj.get(company.cnpj) ?? new Set<string>();
      newMatches.push(...scoreCompanyAgainstBuyer(company, sigSet, buyer, bts, thesesIdx));
    }

    // 7) Marca antigos matches deste buyer como is_current=false
    const { error: updErr } = await supabase
      .schema("equity_brain" as any)
      .from("matches")
      .update({ is_current: false })
      .eq("buyer_id", buyer_id)
      .eq("is_current", true);
    if (updErr) {
      return new Response(JSON.stringify({ error: `mark old: ${updErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8) Insere novos
    let inserted = 0;
    for (let i = 0; i < newMatches.length; i += 1000) {
      const chunk = newMatches.slice(i, i + 1000);
      const { error: insErr } = await supabase
        .schema("equity_brain" as any)
        .from("matches")
        .insert(chunk);
      if (insErr) {
        return new Response(JSON.stringify({ error: `insert: ${insErr.message}`, partial: inserted }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted += chunk.length;
    }

    return new Response(JSON.stringify({
      buyer_id,
      companies_evaluated: companyList.length,
      total_matches: inserted,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("match-buyer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
