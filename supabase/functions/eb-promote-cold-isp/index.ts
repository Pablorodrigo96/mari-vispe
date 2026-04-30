// Promote a cold ISP suggestion → real CRM company
// Cria/atualiza equity_brain.companies a partir de isp_market_entries (Anatel),
// muda qualification_status para 'contacted' (ou outro válido), grava em
// isp_promotion_log (que destrava o trigger guard_isp_promotion), e marca
// matches frios daquele CNPJ como aceitos (sai de cold → entra no fluxo CRM).
//
// IMPORTANTE: este é o ÚNICO caminho autorizado para mover um ISP da lista fria
// para o CRM. Qualquer UPDATE direto em qualification_status é bloqueado pelo trigger.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TARGET_STATUSES = new Set([
  "cold_prospect",
  "contacted",
  "relationship_started",
  "qualified",
  "do_not_contact",
  "lost",
]);

interface PromoteBody {
  cnpj: string;
  to_status?: string; // default 'contacted'
  reason?: string;
  thesis_key?: string | null;
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // Auth client (verifica usuário e roles)
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(url, service);

  try {
    const { data: userData, error: uerr } = await userClient.auth.getUser();
    if (uerr || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // Checa role admin/advisor via tabela public.user_roles
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    if (!roleSet.has("admin") && !roleSet.has("advisor")) {
      return json({ error: "forbidden — admin/advisor only" }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as PromoteBody;
    const cnpj = String(body.cnpj ?? "").replace(/\D/g, "");
    if (cnpj.length !== 14) return json({ error: "cnpj inválido" }, 400);

    const toStatus = body.to_status ?? "contacted";
    if (!ALLOWED_TARGET_STATUSES.has(toStatus)) {
      return json({ error: `to_status inválido (use um de: ${[...ALLOWED_TARGET_STATUSES].join(", ")})` }, 400);
    }

    // 1) Pega o registro mais recente do ISP no fato isp_market_entries
    const { data: entries, error: eerr } = await admin
      .schema("equity_brain")
      .from("isp_market_entries")
      .select("cnpj, provider_name, provider_name_norm, uf, municipio, ibge_code, period_ref, accesses")
      .eq("cnpj", cnpj)
      .order("period_ref", { ascending: false })
      .limit(50);
    if (eerr) throw eerr;
    if (!entries || entries.length === 0) {
      return json({ error: "CNPJ não encontrado em isp_market_entries" }, 404);
    }
    const head = entries[0];
    const totalAccesses = entries
      .filter((e: any) => e.period_ref === head.period_ref)
      .reduce((s: number, e: any) => s + Number(e.accesses ?? 0), 0);

    // 2) Pega stats agregadas (se existirem)
    const { data: stats } = await admin
      .schema("equity_brain")
      .from("isp_company_market_stats")
      .select("*")
      .eq("cnpj", cnpj)
      .order("period_ref", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3) Verifica se company já existe
    const { data: existing } = await admin
      .schema("equity_brain")
      .from("companies")
      .select("cnpj, qualification_status, codename, source")
      .eq("cnpj", cnpj)
      .maybeSingle();

    if (body.dry_run) {
      return json({
        dry_run: true,
        cnpj,
        will_create: !existing,
        from_status: existing?.qualification_status ?? null,
        to_status: toStatus,
        provider_name: head.provider_name,
        uf: head.uf,
        municipio: head.municipio,
        total_accesses: totalAccesses,
        period_ref: head.period_ref,
        stats_available: !!stats,
      });
    }

    const fromStatus = existing?.qualification_status ?? null;

    // 4) Loga em isp_promotion_log ANTES de mexer em companies (libera o trigger por 5s)
    const snapshot = {
      provider_name: head.provider_name,
      uf: head.uf,
      municipio: head.municipio,
      ibge_code: head.ibge_code,
      period_ref: head.period_ref,
      total_accesses: totalAccesses,
      stats: stats ?? null,
      promoted_at_utc: new Date().toISOString(),
    };
    const { error: logErr } = await admin
      .schema("equity_brain")
      .from("isp_promotion_log")
      .insert({
        cnpj,
        from_status: fromStatus,
        to_status: toStatus,
        reason: body.reason ?? null,
        thesis_key: body.thesis_key ?? null,
        promoted_by: userId,
        snapshot,
      });
    if (logErr) throw logErr;

    // 5) Upsert company
    const companyPayload: any = {
      cnpj,
      razao_social: head.provider_name || `ISP ${cnpj}`,
      nome_fantasia: head.provider_name,
      uf: head.uf,
      municipio: head.municipio,
      source: "ANATEL_BANDA_LARGA_FIXA",
      qualification_status: toStatus,
      setor_ma: "telecom_isp",
      raw_data: { isp_snapshot: snapshot },
    };

    if (!existing) {
      const { error: insErr } = await admin
        .schema("equity_brain")
        .from("companies")
        .insert(companyPayload);
      if (insErr) throw insErr;
    } else {
      // UPDATE — guard_isp_promotion vai checar isp_promotion_log (acabamos de inserir, < 5s)
      const { error: updErr } = await admin
        .schema("equity_brain")
        .from("companies")
        .update({
          qualification_status: toStatus,
          razao_social: companyPayload.razao_social,
          nome_fantasia: companyPayload.nome_fantasia,
          uf: companyPayload.uf,
          municipio: companyPayload.municipio,
          setor_ma: companyPayload.setor_ma,
          raw_data: companyPayload.raw_data,
        })
        .eq("cnpj", cnpj);
      if (updErr) throw updErr;
    }

    // 6) Marca matches frios desse CNPJ como "promovidos" (saem de cold → CRM)
    let promotedMatches = 0;
    const { data: updMatches } = await admin
      .schema("equity_brain")
      .from("matches")
      .update({ is_cold_suggestion: false })
      .eq("cnpj", cnpj)
      .eq("is_cold_suggestion", true)
      .select("id");
    promotedMatches = updMatches?.length ?? 0;

    // 7) Pega codename atribuído (auto-gerado pelo trigger no insert)
    const { data: finalCo } = await admin
      .schema("equity_brain")
      .from("companies")
      .select("codename, qualification_status")
      .eq("cnpj", cnpj)
      .maybeSingle();

    return json({
      ok: true,
      cnpj,
      created: !existing,
      from_status: fromStatus,
      to_status: toStatus,
      codename: finalCo?.codename ?? null,
      matches_promoted: promotedMatches,
    });
  } catch (e: any) {
    console.error("[eb-promote-cold-isp]", e);
    return json({ error: e.message ?? "internal error" }, 500);
  }

  function json(payload: any, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
