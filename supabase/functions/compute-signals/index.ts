// Equity Brain — compute-signals
// Gera sinais determinísticos em equity_brain.company_signals com base nas regras do catálogo.
// Sem IA. Auth: requer JWT (default). Operação interna.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    // Authorization: admin or service_role
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

    // 1) Carrega lote de empresas com sócios
    let query = supabase
      .schema("equity_brain" as any)
      .from("companies")
      .select("*, company_partners(*)")
      .limit(limit);

    if (cnpjs && cnpjs.length > 0) query = query.in("cnpj", cnpjs);
    if (filter.uf) query = query.eq("uf", String(filter.uf).toUpperCase());
    if (filter.setor_ma) query = query.eq("setor_ma", String(filter.setor_ma));

    const { data: companies, error: companiesErr } = await query;
    if (companiesErr) {
      console.error("Companies fetch error:", companiesErr);
      return new Response(JSON.stringify({ error: companiesErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Carrega cnae_setor_map
    const { data: cnaeMap } = await supabase
      .schema("equity_brain" as any)
      .from("cnae_setor_map")
      .select("*");
    const cnaeIndex = new Map<string, any>();
    for (const c of cnaeMap ?? []) cnaeIndex.set(String((c as any).cnae_principal), c);

    const allSignals: Array<{
      cnpj: string;
      signal_key: string;
      signal_value: number | null;
      signal_text: string | null;
      weight: number;
      source: string;
      confidence: number;
    }> = [];

    for (const c of companies ?? []) {
      const company = c as any;
      const partners = (company.company_partners ?? []) as any[];
      const ageYears = company.data_abertura
        ? (Date.now() - new Date(company.data_abertura).getTime()) / (1000 * 60 * 60 * 24 * 365)
        : 0;
      const cnaeEntry = cnaeIndex.get(String(company.cnae_principal));

      const push = (key: string, weight: number, value?: number | null, text?: string | null) => {
        allSignals.push({
          cnpj: company.cnpj,
          signal_key: key,
          signal_value: value ?? null,
          signal_text: text ?? null,
          weight,
          source: "derived_sql",
          confidence: 1.0,
        });
      };

      // 1) Idade da empresa
      if (ageYears >= 15) {
        push("idade_empresa_15_plus", 20, Number(ageYears.toFixed(1)), `Empresa com ${ageYears.toFixed(1)} anos`);
      } else if (ageYears >= 10) {
        push("idade_empresa_10_a_15", 12, Number(ageYears.toFixed(1)), `Empresa com ${ageYears.toFixed(1)} anos`);
      }

      // 2) Situação ativa
      if (company.situacao_cadastral === "ATIVA") {
        push("empresa_ativa_situacao_regular", 5);
      }

      // 3) Sócios PF / único / família
      const pfPartners = partners.filter((p) => p.tipo === "PF");
      const totalSocios = partners.length;
      const pfCount = pfPartners.length;

      if (totalSocios > 0 && pfCount === totalSocios) push("socios_apenas_pf", 15);
      if (totalSocios === 1) push("socio_unico", 10);

      const sobrenomes = pfPartners
        .map((p) => String(p.nome ?? "").trim().split(/\s+/).pop()?.toUpperCase())
        .filter(Boolean) as string[];
      const sobrenomesUnicos = new Set(sobrenomes);
      if (totalSocios >= 2 && sobrenomes.length >= 2 && sobrenomesUnicos.size < sobrenomes.length) {
        push("multiplos_socios_familia", 10);
      }

      // 4) Idade do sócio principal (heurística — depende de idade_estimada, populada pela IA na Fase 7)
      const idadesPF = pfPartners
        .map((p) => p.idade_estimada)
        .filter((v): v is number => typeof v === "number" && v > 0);
      const idadeMax = idadesPF.length ? Math.max(...idadesPF) : null;
      if (idadeMax !== null && idadeMax >= 60) {
        push("fundador_60_plus", 35, idadeMax, `Fundador com ~${idadeMax} anos`);
      } else if (idadeMax !== null && idadeMax >= 55) {
        push("fundador_55_plus", 25, idadeMax, `Fundador com ~${idadeMax} anos`);
      }
      if (idadeMax !== null && idadeMax >= 55 && ageYears >= 15) {
        push("sucessao_provavel", 30);
      }

      // 5) Setor (do CNAE map)
      if (cnaeEntry?.is_consolidando) push("setor_consolidando", 20);
      if (cnaeEntry?.is_recorrente) push("cnae_recorrente", 10);

      // 6+7) Porte atrativo / capital alto
      const cap = Number(company.capital_social ?? 0);
      if (cap >= 100_000 && cap <= 5_000_000 && ["MEDIA", "EPP"].includes(company.porte)) {
        push("porte_atrativo_ma", 15, cap);
      }
      if (cap > 500_000) push("capital_social_alto", 5, cap);

      // 8) Intenção de venda explícita
      if (company.has_listing) push("intencao_venda_explicita", 50);

      // 9+10) Governança baixa / oportunidade CFO Vispe
      const govBaixa =
        totalSocios > 0 && pfCount === totalSocios && totalSocios <= 2 && ageYears >= 10;
      if (govBaixa) push("governanca_baixa", 8);
      if (govBaixa && cap >= 100_000 && cap <= 5_000_000) push("oportunidade_cfo_vispe", 25);

      // TODO Fase 3: regiao_com_compradores_ativos
      // Depende de equity_brain.buyers (não criada ainda). Quando vier:
      //   const { data: buyers } = await supabase.schema("equity_brain")
      //     .from("buyers").select("id")
      //     .eq("setor_ma", company.setor_ma)
      //     .contains("uf_interesse", [company.uf]).limit(1);
      //   if (buyers?.length) push("regiao_com_compradores_ativos", 15);
    }

    if (allSignals.length === 0) {
      return new Response(
        JSON.stringify({ companies: companies?.length ?? 0, signals: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // UPSERT em chunks de 1000
    const chunkSize = 1000;
    let totalInserted = 0;
    for (let i = 0; i < allSignals.length; i += chunkSize) {
      const chunk = allSignals.slice(i, i + chunkSize);
      const { error: upsertErr } = await supabase
        .schema("equity_brain" as any)
        .from("company_signals")
        .upsert(chunk, { onConflict: "cnpj,signal_key" });
      if (upsertErr) {
        console.error("Signals upsert error:", upsertErr);
        return new Response(
          JSON.stringify({ error: upsertErr.message, partial: totalInserted }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      totalInserted += chunk.length;
    }

    return new Response(
      JSON.stringify({
        companies: companies?.length ?? 0,
        signals: allSignals.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("compute-signals error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
