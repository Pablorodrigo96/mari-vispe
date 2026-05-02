// Equity Brain — calculate-vpl-proposal (Fase E2)
// Calcula VPL ajustado de uma proposta de transação.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CUSTO_CAPITAL_VENDEDOR = 0.15;
const PROB_EARN_OUT = 0.55;
const PROB_ESCROW_RETORNO = 0.70;
const DESCONTO_LIQUIDEZ_ACOES = 0.25;
const PROB_GARANTIAS_ACIONADAS = 0.30;

const discount = (months: number | null | undefined, divisor = 12) => {
  if (!months) return 1;
  return 1 / Math.pow(1 + CUSTO_CAPITAL_VENDEDOR, Number(months) / divisor);
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
    const sUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = token === serviceKey ? { data: null } : await sUser.auth.getClaims(token);
    const isService = token === serviceKey || claims?.claims?.role === "service_role";
    const userId = claims?.claims?.sub ?? null;
    if (!isService && !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const proposalId: string = body.proposal_id;
    if (!proposalId) {
      return new Response(JSON.stringify({ error: "proposal_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: p, error } = await supabase.schema("equity_brain" as any)
      .from("transaction_proposals").select("*").eq("id", proposalId).maybeSingle();
    if (error) throw error;
    if (!p) throw new Error("proposal not found");

    const vista = Number(p.vista_brl_mm ?? 0);
    const earnOutAjustado = Number(p.earn_out_brl_mm ?? 0) * PROB_EARN_OUT * discount(p.earn_out_prazo_meses);
    const escrowAjustado = Number(p.escrow_brl_mm ?? 0) * PROB_ESCROW_RETORNO * discount(p.escrow_prazo_meses);
    const parcelamentoAjustado = Number(p.parcelamento_brl_mm ?? 0) * discount(p.parcelamento_prazo_meses, 24);
    const acoesAjustado = Number(p.acoes_brl_mm ?? 0) * (1 - DESCONTO_LIQUIDEZ_ACOES) * discount(p.acoes_lockup_meses);

    const custoNonCompete = -1 * Number(p.non_compete_anos ?? 0) * vista * 0.03;
    const custoLockup = -1 * Number(p.lockup_operacional_meses ?? 0) * 0.02 * vista / 12;
    const custoGarantias = -1 * Number(p.garantias_pessoais_brl_mm ?? 0) * PROB_GARANTIAS_ACIONADAS;

    const total = vista + earnOutAjustado + escrowAjustado + parcelamentoAjustado +
      acoesAjustado + custoNonCompete + custoLockup + custoGarantias;

    const breakdown = {
      vista,
      earn_out_nominal: Number(p.earn_out_brl_mm ?? 0),
      earn_out_ajustado: earnOutAjustado,
      escrow_nominal: Number(p.escrow_brl_mm ?? 0),
      escrow_ajustado: escrowAjustado,
      parcelamento_nominal: Number(p.parcelamento_brl_mm ?? 0),
      parcelamento_ajustado: parcelamentoAjustado,
      acoes_nominal: Number(p.acoes_brl_mm ?? 0),
      acoes_ajustado: acoesAjustado,
      custo_non_compete: custoNonCompete,
      custo_lockup: custoLockup,
      custo_garantias: custoGarantias,
    };
    const assumptions = {
      custo_capital_vendedor_aa: CUSTO_CAPITAL_VENDEDOR,
      prob_earn_out: PROB_EARN_OUT,
      prob_escrow_retorno: PROB_ESCROW_RETORNO,
      desconto_liquidez_acoes: DESCONTO_LIQUIDEZ_ACOES,
      prob_garantias_acionadas: PROB_GARANTIAS_ACIONADAS,
      calculated_at: new Date().toISOString(),
    };

    const totalRounded = Math.round(total * 100) / 100;
    const { error: upErr } = await supabase.schema("equity_brain" as any)
      .from("transaction_proposals").update({
        vpl_ajustado_brl_mm: totalRounded,
        vpl_breakdown: breakdown,
        vpl_assumptions: assumptions,
        vpl_calculated_at: new Date().toISOString(),
      }).eq("id", proposalId);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, total: totalRounded, breakdown, assumptions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("calculate-vpl-proposal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { name: "calculate-vpl-proposal" }));
