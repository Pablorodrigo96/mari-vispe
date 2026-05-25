// Equity Brain v2 — seed-synthetic-deal-events
// Gera ~200 deal_events sintéticos plausíveis para destravar o loop adaptativo
// quando não há histórico operacional real. Idempotente via metadata.source.
//
// POST /seed-synthetic-deal-events
//   { target?: number = 200, dry_run?: boolean = false }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { requireAuth, authErrorResponse } from "../_shared/authGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYNTHETIC_TAG = "synthetic_v1";

// Distribuição global desejada
const DIST = [
  { type: "contacted", pct: 0.50 },
  { type: "reply_received", pct: 0.20 },
  { type: "rejected", pct: 0.15 },
  { type: "nda_signed", pct: 0.10 },
  { type: "loi_received", pct: 0.04 },
  { type: "closed", pct: 0.01 },
];

const REJECTION_REASONS = [
  "geo_fora_radar",
  "tamanho_pequeno",
  "tamanho_grande",
  "setor_secundario",
  "timing_ruim",
  "preco_alto",
  "fit_fraco",
  "sem_resposta",
];

function pickWeighted<T>(items: { v: T; w: number }[]): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = Math.random() * total;
  for (const it of items) {
    if ((r -= it.w) <= 0) return it.v;
  }
  return items[items.length - 1].v;
}

// Score-aware: matches de score alto têm mais chance de eventos positivos.
// score esperado em [0,1]. Retorna event_type plausível.
function chooseEventType(score: number): string {
  // Boost para positivos quando score alto, boost para rejected quando baixo
  const adj = DIST.map((d) => {
    let w = d.pct;
    if (d.type === "rejected") w *= (1.5 - score); // baixo score => mais rejected
    else if (d.type === "contacted") w *= 1; // neutro
    else w *= (0.5 + score); // outros positivos crescem com score
    return { v: d.type, w: Math.max(0.01, w) };
  });
  return pickWeighted(adj);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAuth(req, { requireAnyRole: ["admin"] });
  if (!auth.ok) return authErrorResponse(auth, corsHeaders);


  const startedAt = new Date().toISOString();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const target = Math.min(Math.max(Number(body.target ?? 200), 10), 1000);
    const dryRun = body.dry_run === true;

    // Idempotência: contar quantos sintéticos já existem
    const { count: existing } = await supabase
      .schema("equity_brain")
      .from("deal_events")
      .select("id", { count: "exact", head: true })
      .contains("metadata", { source: SYNTHETIC_TAG });

    if ((existing ?? 0) >= target) {
      return new Response(JSON.stringify({
        success: true, skipped: true,
        reason: `Já existem ${existing} eventos sintéticos (target=${target}).`,
        existing,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const need = target - (existing ?? 0);

    // Buscar matches v2 ativos com cnpj e buyer_id válidos
    const { data: matches, error: mErr } = await supabase
      .schema("equity_brain")
      .from("matches")
      .select("id, buyer_id, cnpj, match_score")
      .eq("is_current", true)
      .eq("engine_version", "v2")
      .not("buyer_id", "is", null)
      .not("cnpj", "is", null)
      .limit(2000);
    if (mErr) throw mErr;
    if (!matches || matches.length === 0) {
      throw new Error("Nenhum match v2 ativo encontrado.");
    }

    // Garantir ≥5 buyers com ≥10 eventos cada => agrupar por buyer e fazer round-robin
    const byBuyer = new Map<string, any[]>();
    for (const m of matches) {
      const arr = byBuyer.get(m.buyer_id) ?? [];
      arr.push(m);
      byBuyer.set(m.buyer_id, arr);
    }
    const buyers = [...byBuyer.keys()];
    // Embaralha matches dentro de cada buyer
    for (const arr of byBuyer.values()) {
      arr.sort(() => Math.random() - 0.5);
    }

    // Construir eventos: ao menos minPerBuyer para cada buyer (até esgotar matches dele),
    // depois preenche aleatório.
    const minPerBuyer = Math.min(10, Math.floor(need / Math.min(buyers.length, 10)));
    const events: any[] = [];
    const usedMatchIds = new Set<string>();

    // Fase 1: distribuir minPerBuyer entre top-N buyers
    const topBuyers = buyers.slice(0, Math.min(buyers.length, 20));
    for (const b of topBuyers) {
      const arr = byBuyer.get(b)!;
      const take = Math.min(minPerBuyer, arr.length);
      for (let i = 0; i < take && events.length < need; i++) {
        const m = arr[i];
        if (usedMatchIds.has(m.id)) continue;
        usedMatchIds.add(m.id);
        events.push(m);
      }
    }

    // Fase 2: preencher aleatoriamente
    const allShuffled = [...matches].sort(() => Math.random() - 0.5);
    for (const m of allShuffled) {
      if (events.length >= need) break;
      if (usedMatchIds.has(m.id)) continue;
      usedMatchIds.add(m.id);
      events.push(m);
    }

    // Mapear para deal_events
    const now = Date.now();
    const sixtyDaysMs = 60 * 24 * 3600 * 1000;
    const rows = events.map((m) => {
      const score = Math.max(0, Math.min(1, Number(m.match_score ?? 0.5)));
      const evType = chooseEventType(score);
      const ts = new Date(now - Math.random() * sixtyDaysMs).toISOString();
      const row: any = {
        match_id: m.id,
        cnpj: m.cnpj,
        buyer_id: m.buyer_id,
        event_type: evType,
        event_ts: ts,
        notes: `Sintético v1 — score base ${score.toFixed(2)}`,
        metadata: {
          source: SYNTHETIC_TAG,
          synthetic: true,
          base_score: score,
          generated_at: new Date().toISOString(),
        },
      };
      if (evType === "rejected") {
        row.rejection_reason =
          REJECTION_REASONS[Math.floor(Math.random() * REJECTION_REASONS.length)];
      }
      return row;
    });

    // Distribuição final (telemetria)
    const dist: Record<string, number> = {};
    for (const r of rows) dist[r.event_type] = (dist[r.event_type] ?? 0) + 1;
    const buyerCounts: Record<string, number> = {};
    for (const r of rows) buyerCounts[r.buyer_id] = (buyerCounts[r.buyer_id] ?? 0) + 1;
    const buyersWith10plus = Object.values(buyerCounts).filter((c) => c >= 10).length;

    let inserted = 0;
    if (!dryRun && rows.length > 0) {
      for (let off = 0; off < rows.length; off += 200) {
        const slice = rows.slice(off, off + 200);
        const { error } = await supabase
          .schema("equity_brain")
          .from("deal_events")
          .insert(slice);
        if (error) {
          console.error("insert error:", error);
          throw error;
        }
        inserted += slice.length;
      }
    }

    await supabase.schema("equity_brain").from("engine_runs").insert({
      engine_name: "seed-synthetic-deal-events",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "success",
      rows_processed: inserted,
      metadata: { dry_run: dryRun, target, existing_before: existing, distribution: dist, buyers_used: Object.keys(buyerCounts).length, buyers_with_10plus_events: buyersWith10plus },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      success: true,
      dry_run: dryRun,
      existing_before: existing,
      planned: rows.length,
      inserted,
      distribution: dist,
      buyers_used: Object.keys(buyerCounts).length,
      buyers_with_10plus_events: buyersWith10plus,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("seed-synthetic error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
