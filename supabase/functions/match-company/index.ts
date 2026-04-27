// Equity Brain — match-company
// Calcula matches (empresa × buyer × tese) para um CNPJ ou lote pequeno.
// Auth: admin OR service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 27 UFs brasileiras + vizinhos terrestres
const UF_NEIGHBORS: Record<string, string[]> = {
  AC: ["AM", "RO"],
  AL: ["PE", "SE", "BA"],
  AM: ["AC", "RO", "MT", "PA", "RR"],
  AP: ["PA"],
  BA: ["MG", "ES", "SE", "AL", "PE", "PI", "TO", "GO", "DF"],
  CE: ["PI", "PB", "PE", "RN"],
  DF: ["GO", "MG"],
  ES: ["RJ", "MG", "BA"],
  GO: ["DF", "MT", "MS", "TO", "BA", "MG"],
  MA: ["PI", "TO", "PA"],
  MG: ["SP", "RJ", "ES", "BA", "GO", "DF", "MS"],
  MS: ["MT", "GO", "MG", "SP", "PR"],
  MT: ["RO", "AM", "PA", "TO", "GO", "MS"],
  PA: ["AP", "MA", "TO", "MT", "AM", "RR"],
  PB: ["RN", "CE", "PE"],
  PE: ["PB", "CE", "PI", "BA", "AL"],
  PI: ["MA", "TO", "BA", "PE", "CE"],
  PR: ["SC", "SP", "MS"],
  RJ: ["SP", "MG", "ES"],
  RN: ["CE", "PB"],
  RO: ["AC", "AM", "MT"],
  RR: ["AM", "PA"],
  RS: ["SC"],
  SC: ["RS", "PR"],
  SE: ["BA", "AL"],
  SP: ["PR", "MG", "RJ", "MS"],
  TO: ["MA", "PI", "BA", "GO", "MT", "PA"],
};

const PORTE_ORDER = ["ME", "EPP", "MEDIA", "GRANDE"];

// ============================================================
// Scoring helper (também usado por match-buyer e match-batch)
// ============================================================
export function scoreCompanyAgainstBuyers(
  companies: any[],
  signalsByCnpj: Map<string, Set<string>>,
  buyers: any[],
  btByBuyer: Map<string, any[]>,
  thesesIdx: Map<string, any>,
): any[] {
  const newMatches: any[] = [];

  for (const company of companies) {
    const sigSet = signalsByCnpj.get(company.cnpj) ?? new Set<string>();

    for (const buyer of buyers) {
      const bts = btByBuyer.get(buyer.id) ?? [];

      // Setor fit
      let setor_fit = 0;
      if (buyer.setores_interesse?.includes(company.setor_ma)) setor_fit = 1.0;
      else if (buyer.subsetores_interesse?.includes(company.subsetor_ma)) setor_fit = 0.7;

      // Geografia fit
      let geografia_fit = 0;
      if (!buyer.ufs_interesse || buyer.ufs_interesse.length === 0) geografia_fit = 1.0;
      else if (buyer.ufs_interesse.includes(company.uf)) geografia_fit = 1.0;
      else if ((UF_NEIGHBORS[company.uf] ?? []).some((n: string) => buyer.ufs_interesse.includes(n))) {
        geografia_fit = 0.5;
      }

      // Porte fit
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

      // Para cada tese do buyer
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
        if (setor_fit > 0) {
          reasons.push({
            key: "setor",
            weight: 0.30,
            value: setor_fit,
            text: setor_fit === 1 ? `Setor exato (${company.setor_ma})` : `Subsetor compartilhado`,
          });
        }
        if (geografia_fit > 0) {
          reasons.push({
            key: "geografia",
            weight: 0.20,
            value: geografia_fit,
            text: geografia_fit === 1 ? `Região-alvo (${company.uf})` : `UF vizinha (${company.uf})`,
          });
        }
        if (porte_fit > 0) {
          reasons.push({
            key: "porte",
            weight: 0.15,
            value: porte_fit,
            text: porte_fit === 1 ? `Porte exato (${company.porte})` : `Porte adjacente (${company.porte})`,
          });
        }
        reasons.push({
          key: "tese",
          weight: 0.20,
          value: tese_fit,
          text: `Tese "${tese.display_name}" — ${reqHits}/${required.length} required + ${boostHits} boosting`,
        });
        reasons.push({
          key: "ma_score",
          weight: 0.15,
          value: ma_norm,
          text: `M&A Score: ${company.ma_score ?? 0}`,
        });

        newMatches.push({
          cnpj: company.cnpj,
          buyer_id: buyer.id,
          thesis_key: bt.thesis_key,
          match_score,
          setor_fit,
          geografia_fit,
          porte_fit,
          tese_fit,
          ma_score_emp: company.ma_score ?? 0,
          reasons,
          status: "novo",
          prioridade: match_score >= 70 ? 1 : (match_score >= 50 ? 2 : 3),
          is_current: true,
        });
      }
    }
  }

  return newMatches;
}

// ============================================================
// Auth helper
// ============================================================
async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
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
  const supabaseAdminCheck = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleData } = await supabaseAdminCheck
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only" };
  return { ok: true };
}

// ============================================================
// Persistência: marca antigos is_current=false e insere novos
// ============================================================
export async function persistMatches(
  supabase: any,
  cnpjsAffected: string[],
  newMatches: any[],
  scope: "by_cnpj" | "by_buyer",
  buyerId?: string,
): Promise<{ inserted: number; error?: string }> {
  if (cnpjsAffected.length === 0 && scope === "by_cnpj") return { inserted: 0 };

  // Marca antigos como is_current=false
  const writeChunk = 500;
  if (scope === "by_cnpj") {
    for (let i = 0; i < cnpjsAffected.length; i += writeChunk) {
      const slice = cnpjsAffected.slice(i, i + writeChunk);
      const { error } = await supabase
        .schema("equity_brain" as any)
        .from("matches")
        .update({ is_current: false })
        .in("cnpj", slice)
        .eq("is_current", true);
      if (error) return { inserted: 0, error: `mark old (cnpj): ${error.message}` };
    }
  } else if (scope === "by_buyer" && buyerId) {
    const { error } = await supabase
      .schema("equity_brain" as any)
      .from("matches")
      .update({ is_current: false })
      .eq("buyer_id", buyerId)
      .eq("is_current", true);
    if (error) return { inserted: 0, error: `mark old (buyer): ${error.message}` };
  }

  if (newMatches.length === 0) return { inserted: 0 };

  // Insere novos em chunks
  let inserted = 0;
  for (let i = 0; i < newMatches.length; i += 1000) {
    const chunk = newMatches.slice(i, i + 1000);
    const { error } = await supabase
      .schema("equity_brain" as any)
      .from("matches")
      .insert(chunk);
    if (error) return { inserted, error: `insert: ${error.message}` };
    inserted += chunk.length;
  }
  return { inserted };
}

// ============================================================
// Carrega buyers + theses + catálogo (compartilhado)
// ============================================================
export async function loadBuyersAndTheses(supabase: any) {
  const { data: buyers, error: bErr } = await supabase
    .schema("equity_brain" as any)
    .from("buyers").select("*").eq("status", "ativo");
  if (bErr) throw new Error(`buyers: ${bErr.message}`);

  const { data: buyerTheses, error: btErr } = await supabase
    .schema("equity_brain" as any)
    .from("buyer_theses").select("*").eq("active", true);
  if (btErr) throw new Error(`buyer_theses: ${btErr.message}`);

  const { data: theses, error: tErr } = await supabase
    .schema("equity_brain" as any)
    .from("investment_theses").select("*").eq("active", true);
  if (tErr) throw new Error(`investment_theses: ${tErr.message}`);

  const thesesIdx = new Map((theses ?? []).map((t: any) => [t.thesis_key, t]));
  const btByBuyer = new Map<string, any[]>();
  for (const bt of buyerTheses ?? []) {
    const arr = btByBuyer.get(bt.buyer_id);
    if (arr) arr.push(bt);
    else btByBuyer.set(bt.buyer_id, [bt]);
  }
  return { buyers: buyers ?? [], btByBuyer, thesesIdx };
}

// ============================================================
// Handler principal
// ============================================================
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
    const cnpjList: string[] = body.cnpj
      ? [String(body.cnpj)]
      : (Array.isArray(body.cnpjs) ? body.cnpjs.map(String) : []);
    if (!cnpjList.length) {
      return new Response(JSON.stringify({ error: "cnpj or cnpjs required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cnpjList.length > 500) {
      return new Response(JSON.stringify({ error: "max 500 cnpjs per call" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Carrega empresas (com scores)
    const { data: companies, error: cErr } = await supabase
      .schema("equity_brain" as any)
      .from("companies_scored")
      .select("*")
      .in("cnpj", cnpjList);
    if (cErr) {
      return new Response(JSON.stringify({ error: cErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Signals em chunks
    const signalsByCnpj = new Map<string, Set<string>>();
    for (let i = 0; i < cnpjList.length; i += 200) {
      const slice = cnpjList.slice(i, i + 200);
      const { data: sigs, error: sErr } = await supabase
        .schema("equity_brain" as any)
        .from("company_signals")
        .select("cnpj, signal_key")
        .in("cnpj", slice);
      if (sErr) {
        return new Response(JSON.stringify({ error: sErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const s of sigs ?? []) {
        const set = signalsByCnpj.get(s.cnpj);
        if (set) set.add(s.signal_key);
        else signalsByCnpj.set(s.cnpj, new Set([s.signal_key]));
      }
    }

    // 3) Buyers + theses
    const { buyers, btByBuyer, thesesIdx } = await loadBuyersAndTheses(supabase);

    // 4) Score
    const newMatches = scoreCompanyAgainstBuyers(companies ?? [], signalsByCnpj, buyers, btByBuyer, thesesIdx);

    // 5) Persiste
    const result = await persistMatches(supabase, cnpjList, newMatches, "by_cnpj");
    if (result.error) {
      return new Response(JSON.stringify({ error: result.error, partial: result.inserted }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const top5 = [...newMatches]
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 5)
      .map((m) => ({ cnpj: m.cnpj, buyer_id: m.buyer_id, thesis_key: m.thesis_key, match_score: m.match_score }));

    return new Response(JSON.stringify({
      companies_processed: cnpjList.length,
      matches_created: result.inserted,
      top_5: top5,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("match-company error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
