// Equity Brain — match-batch
// Lote massivo: filtra companies_scored por critérios e processa em chunks.
// Auth: admin OR service_role.
// Reusa scoring inline (mesmo helper de match-company / match-buyer).

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

function scoreBatch(
  companies: any[],
  signalsByCnpj: Map<string, Set<string>>,
  buyers: any[],
  btByBuyer: Map<string, any[]>,
  thesesIdx: Map<string, any>,
): any[] {
  const out: any[] = [];
  for (const company of companies) {
    const sigSet = signalsByCnpj.get(company.cnpj) ?? new Set<string>();
    for (const buyer of buyers) {
      const bts = btByBuyer.get(buyer.id) ?? [];
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
    }
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
    const filter = body.filter ?? {};
    const limit: number = Math.min(Number(body.limit ?? 1000), 5000);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Seleciona CNPJs alvo via filtro
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

    // 2) Carrega buyers + theses uma vez (compartilhado entre chunks)
    const { data: buyers } = await supabase.schema("equity_brain" as any).from("buyers").select("*").eq("status", "ativo");
    const { data: buyerTheses } = await supabase.schema("equity_brain" as any).from("buyer_theses").select("*").eq("active", true);
    const { data: theses } = await supabase.schema("equity_brain" as any).from("investment_theses").select("*").eq("active", true);
    const thesesIdx = new Map((theses ?? []).map((t: any) => [t.thesis_key, t]));
    const btByBuyer = new Map<string, any[]>();
    for (const bt of buyerTheses ?? []) {
      const arr = btByBuyer.get(bt.buyer_id);
      if (arr) arr.push(bt);
      else btByBuyer.set(bt.buyer_id, [bt]);
    }

    // 3) Processa em chunks de 200 cnpjs
    const CHUNK = 200;
    let totalMatches = 0;
    let chunks = 0;
    for (let i = 0; i < allCnpjs.length; i += CHUNK) {
      const cnpjChunk = allCnpjs.slice(i, i + CHUNK);
      chunks++;

      // companies do chunk
      const { data: companies } = await supabase
        .schema("equity_brain" as any)
        .from("companies_scored")
        .select("*")
        .in("cnpj", cnpjChunk);

      // signals do chunk
      const signalsByCnpj = new Map<string, Set<string>>();
      const { data: sigs } = await supabase
        .schema("equity_brain" as any)
        .from("company_signals")
        .select("cnpj, signal_key")
        .in("cnpj", cnpjChunk);
      for (const s of sigs ?? []) {
        const set = signalsByCnpj.get(s.cnpj);
        if (set) set.add(s.signal_key);
        else signalsByCnpj.set(s.cnpj, new Set([s.signal_key]));
      }

      const newMatches = scoreBatch(companies ?? [], signalsByCnpj, buyers ?? [], btByBuyer, thesesIdx);

      // Marca antigos do chunk
      const { error: updErr } = await supabase
        .schema("equity_brain" as any)
        .from("matches")
        .update({ is_current: false })
        .in("cnpj", cnpjChunk)
        .eq("is_current", true);
      if (updErr) {
        return new Response(JSON.stringify({ error: `mark old: ${updErr.message}`, total_matches: totalMatches, chunks }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Dedupe por (cnpj, buyer_id, thesis_key) — mantém o de maior match_score
      // (defesa contra unique index uniq_matches_current quando scoreBatch gera duplicatas)
      const dedupeMap = new Map<string, any>();
      for (const m of newMatches) {
        const k = `${m.cnpj}|${m.buyer_id}|${m.thesis_key}`;
        const prev = dedupeMap.get(k);
        if (!prev || (m.match_score ?? 0) > (prev.match_score ?? 0)) dedupeMap.set(k, m);
      }
      const deduped = Array.from(dedupeMap.values());

      // Insere novos do chunk
      for (let j = 0; j < deduped.length; j += 1000) {
        const ins = deduped.slice(j, j + 1000);
        const { error: insErr } = await supabase
          .schema("equity_brain" as any)
          .from("matches")
          .insert(ins);
        if (insErr) {
          return new Response(JSON.stringify({ error: `insert: ${insErr.message}`, total_matches: totalMatches, chunks }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        totalMatches += ins.length;
      }
    }

    return new Response(JSON.stringify({
      companies_processed: allCnpjs.length,
      total_matches: totalMatches,
      chunks,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("match-batch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
