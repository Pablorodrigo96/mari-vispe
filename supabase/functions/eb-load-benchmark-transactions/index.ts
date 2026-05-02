import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function parseDate(s: string | null | undefined): string | null {
  if (!s) return null;
  // Accept yyyy-mm-dd or dd/mm/yyyy
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";

    // Authenticated client to validate admin role
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let payload = body.transactions_json;
    if (typeof payload === "string") payload = JSON.parse(payload);
    const transacoes: any[] = payload?.transacoes ?? payload;
    if (!Array.isArray(transacoes)) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let inserted = 0;
    const errors: any[] = [];

    for (const t of transacoes) {
      const obs = (t.observacoes_relevantes ?? "").toString().toLowerCase();
      const row = {
        id: t.id,
        alvo_nome: t.alvo,
        comprador_nome: t.comprador,
        tipo_comprador: t.tipo_comprador ?? null,
        setor: t.setor ?? null,
        subsetor: t.subsetor ?? null,
        data_anuncio: t.data_anuncio ?? null,
        data_fechamento: parseDate(t.data_fechamento),
        regiao_alvo: t.regiao_alvo ?? null,
        ev_brl_mm: t.ev_brl_mm ?? null,
        ev_divulgado: t.ev_divulgado ?? false,
        receita_brl_mm: t.receita_brl_mm ?? null,
        ebitda_brl_mm: t.ebitda_brl_mm ?? null,
        multiplo_ev_ebitda: t.multiplo_ev_ebitda ?? null,
        multiplo_ev_receita: t.multiplo_ev_receita ?? null,
        fase_ciclo_setorial: t.fase_ciclo_setorial ?? null,
        competicao_processo: t.competicao_processo ?? null,
        vista_pct: t.estrutura_pagamento?.vista_pct ?? null,
        sinergias_declaradas: t.sinergias_declaradas ?? null,
        tese_estrategica: t.tese_estrategica ?? null,
        observacoes_relevantes: t.observacoes_relevantes ?? null,
        flag_caso_critico: obs.includes("case study"),
        raw_data: t,
      };

      const { error } = await admin
        .schema("equity_brain")
        .from("benchmark_transactions")
        .upsert(row, { onConflict: "id" });

      if (error) errors.push({ id: t.id, err: error.message });
      else inserted++;
    }

    // Health check (best-effort)
    try {
      await admin.schema("mari_ops").from("health_check").insert({
        check_name: "eb-load-benchmark-transactions",
        status: errors.length ? "warning" : "success",
        details: `${inserted}/${transacoes.length} transações carregadas; ${errors.length} erros`,
      });
    } catch (_) {
      // health table may not exist exactly like this; ignore
    }

    return new Response(
      JSON.stringify({ inserted, errors, total: transacoes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
