// Etapa 3 — Compute Market Waves (Onda Estrutural)
// Calcula tensão estrutural por (setor, UF) cruzando seller_intent agregado x densidade de buyers ativos.
// Sem dependência de M&A history (que está com volume insuficiente).
// Admin-only. Idempotente — sempre recalcula a célula do zero.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sigmoid(x: number) { return 1 / (1 + Math.exp(-x)); }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData } = await supabaseUser.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    const isServiceRole = claimsData?.claims?.role === "service_role";

    if (!isServiceRole) {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminCheck = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: roleData } = await adminCheck.from("user_roles")
        .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const runStart = Date.now();

    // 1) Carrega companies com setor + uf
    const { data: companies, error: cErr } = await supabase.schema("equity_brain" as any)
      .from("companies").select("cnpj, setor_ma, uf");
    if (cErr) throw cErr;

    // 2) Carrega seller_intent_score por cnpj
    const cnpjs = (companies ?? []).map((c: any) => c.cnpj);
    const { data: intents } = await supabase.schema("equity_brain" as any)
      .from("company_signals").select("cnpj, signal_value")
      .eq("signal_key", "seller_intent_score").in("cnpj", cnpjs);
    const intentByCnpj = new Map<string, number>();
    for (const s of intents ?? []) {
      if (s.signal_value != null) intentByCnpj.set(s.cnpj, Number(s.signal_value));
    }

    // 3) Carrega buyers ativos (não-pausados) com setores/UFs
    const { data: buyers, error: bErr } = await supabase.schema("equity_brain" as any)
      .from("buyers").select("id, setores_interesse, ufs_interesse, pause_signal");
    if (bErr) throw bErr;
    const activeBuyers = (buyers ?? []).filter((b: any) => !b.pause_signal);

    // 4) Agrega por (setor, uf)
    type Cell = { setor: string; uf: string; intents: number[]; buyer_ids: Set<string> };
    const cells = new Map<string, Cell>();
    const cellKey = (s: string, u: string) => `${s}::${u}`;

    for (const c of companies ?? []) {
      const setor = c.setor_ma ?? "indefinido";
      const uf = c.uf ?? "??";
      const k = cellKey(setor, uf);
      if (!cells.has(k)) cells.set(k, { setor, uf, intents: [], buyer_ids: new Set() });
      const cell = cells.get(k)!;
      const intent = intentByCnpj.get(c.cnpj);
      if (intent != null) cell.intents.push(intent);
    }

    for (const b of activeBuyers) {
      const setores: string[] = b.setores_interesse ?? [];
      const ufs: string[] = b.ufs_interesse ?? [];
      // Buyer sem UF declarada = nacional → conta em todas as UFs presentes
      const targetUfs = ufs.length ? ufs : Array.from(new Set((companies ?? []).map((c: any) => c.uf).filter(Boolean)));
      const targetSetores = setores.length ? setores : Array.from(new Set((companies ?? []).map((c: any) => c.setor_ma).filter(Boolean)));
      for (const s of targetSetores) {
        for (const u of targetUfs) {
          const k = cellKey(s, u);
          if (!cells.has(k)) cells.set(k, { setor: s, uf: u, intents: [], buyer_ids: new Set() });
          cells.get(k)!.buyer_ids.add(b.id);
        }
      }
    }

    // 5) Computa wave_score por célula
    // seller_pressure = avg(intents) [0..1]
    // buyer_demand = log(1 + buyer_count) / log(1 + max_buyer_count) [0..1]
    const rawCells = Array.from(cells.values());
    const maxBuyer = Math.max(1, ...rawCells.map((c) => c.buyer_ids.size));
    const logMax = Math.log(1 + maxBuyer);

    const rows = rawCells.map((c) => {
      const seller_pressure = c.intents.length
        ? c.intents.reduce((a, b) => a + b, 0) / c.intents.length
        : 0;
      const buyer_demand = logMax > 0 ? Math.log(1 + c.buyer_ids.size) / logMax : 0;
      // Tensão estrutural = combinação multiplicativa suavizada (precisa de ambos os lados)
      // Se só tem um lado forte e o outro ~0, score fica baixo (correto: sem mercado de fato).
      const wave_score = Math.max(0, Math.min(1,
        sigmoid(2 * (seller_pressure - 0.3)) * sigmoid(2 * (buyer_demand - 0.2))
      ));
      return {
        setor: c.setor,
        uf: c.uf,
        seller_pressure: Number(seller_pressure.toFixed(4)),
        seller_count: c.intents.length,
        buyer_demand: Number(buyer_demand.toFixed(4)),
        buyer_count: c.buyer_ids.size,
        wave_score: Number(wave_score.toFixed(4)),
        computed_at: new Date().toISOString(),
      };
    }).filter((r) => r.seller_count > 0 || r.buyer_count > 0);

    // 6) Upsert em chunks
    const CHUNK = 200;
    let upserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error: upErr } = await supabase.schema("equity_brain" as any)
        .from("market_waves").upsert(slice, { onConflict: "setor,uf" });
      if (upErr) {
        console.error("upsert error:", upErr);
      } else {
        upserted += slice.length;
      }
    }

    // Engine run log (best-effort)
    await supabase.schema("equity_brain" as any).from("engine_runs").insert({
      engine: "compute-market-waves",
      status: "success",
      triggered_by: isServiceRole ? "cron" : "manual",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - runStart,
      rows_processed: upserted,
      metadata: { cells: rows.length, max_buyer: maxBuyer },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({
      ok: true,
      cells_computed: rows.length,
      cells_upserted: upserted,
      sample_top: rows.sort((a, b) => b.wave_score - a.wave_score).slice(0, 10),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("compute-market-waves error:", err);
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
