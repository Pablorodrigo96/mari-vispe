// Equity Brain — expand-companies-from-rfb
// Importa empresas da base RFB (5M CNPJs) sob demanda quando o pool curado é insuficiente.
// Filtra pelo perfil do buyer (setores, UFs, porte, capital, idade), exclui CNPJs já no EB,
// faz UPSERT em equity_brain.companies com qualification_status='unqualified' e source='rfb_expand'.
// Auth: admin OR advisor.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITUACAO_MAP: Record<string, string> = {
  "01": "NULA", "02": "ATIVA", "03": "SUSPENSA", "04": "INAPTA", "08": "BAIXADA",
};

function mapPorte(porte: string | null, capital: number | null): string {
  const cap = Number(capital ?? 0);
  if (porte === "01") return "ME";
  if (porte === "03") return "EPP";
  if (cap > 1_000_000) return "MEDIA";
  return "DEMAIS";
}

// CNAE prefix → Vispe / EB sector (mantém alinhado a national-search)
function cnaePrefixesForSetor(setores: string[]): string[] {
  // Mapeia setores M&A do EB para prefixos CNAE (heurística — pode ser ajustada via cnae_setor_map no futuro)
  const map: Record<string, string[]> = {
    tech: ["62", "63", "58", "59", "26", "72", "73"],
    saude: ["86", "87", "88", "21"],
    health: ["86", "87", "88", "21"],
    industria: ["10","11","12","13","14","15","16","17","18","19","20","22","23","24","25","27","28","29","30","31","32","33"],
    industry: ["10","11","12","13","14","15","16","17","18","19","20","22","23","24","25","27","28","29","30","31","32","33"],
    servicos: ["64","65","66","68","69","70","74","78","81","82","84","94"],
    services: ["64","65","66","68","69","70","74","78","81","82","84","94"],
    comercio: ["45","46","47"],
    commerce: ["45","46","47"],
    educacao: ["85"],
    education: ["85"],
    alimentacao: ["55","56","10","11"],
    food: ["55","56","10","11"],
    logistica: ["49","50","51","52","53"],
    logistics: ["49","50","51","52","53"],
    agro: ["01","02","03"],
    agronegocio: ["01","02","03"],
    construcao: ["41","42","43"],
    energia: ["35"],
    telecom: ["60","61"],
  };
  const out = new Set<string>();
  for (const s of setores) {
    const key = String(s).toLowerCase().trim();
    for (const p of map[key] ?? []) out.add(p);
  }
  return [...out];
}

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized" };
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) return { ok: true, isService: true };
  const sbUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData } = await sbUser.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "advisor");
  if (!allowed) return { ok: false, status: 403, error: "Forbidden: admin or advisor only" };
  return { ok: true, userId };
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
    const externalDbUrl = Deno.env.get("EXTERNAL_DB_URL");
    if (!externalDbUrl) {
      return new Response(JSON.stringify({ error: "EXTERNAL_DB_URL not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = await checkAuth(req, supabaseUrl, serviceKey);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const buyerId: string | undefined = body.buyer_id;
    const mandateId: string | undefined = body.mandate_id;
    const target: "companies" | "buyers" = body.target === "buyers" ? "buyers" : "companies";
    const filters = body.filters ?? {};
    const setores: string[] = Array.isArray(filters.setores) ? filters.setores : [];
    const ufs: string[] = Array.isArray(filters.ufs) ? filters.ufs : [];
    const portes: string[] = Array.isArray(filters.portes) ? filters.portes : [];
    const capitalMin: number = Number(filters.capital_min ?? 0);
    const idadeMin: number = Math.max(0, Number(filters.idade_min_anos ?? 3));
    const limit: number = Math.min(Math.max(Number(filters.limit ?? 50), 1), 200);
    const dryRun: boolean = body.dry_run === true;

    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Se buyer_id passado, mescla filtros com o perfil do buyer
    let buyer: any = null;
    if (buyerId) {
      const { data } = await sb.schema("equity_brain" as any).from("buyers").select("*").eq("id", buyerId).maybeSingle();
      buyer = data;
      if (buyer) {
        if (!setores.length && Array.isArray(buyer.setores_interesse)) setores.push(...buyer.setores_interesse);
        if (!ufs.length && Array.isArray(buyer.ufs_interesse)) ufs.push(...buyer.ufs_interesse);
        if (!portes.length && Array.isArray(buyer.porte_alvo)) portes.push(...buyer.porte_alvo);
      }
    }

    const cnaePrefixes = cnaePrefixesForSetor(setores);

    // Conecta na base RFB
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(externalDbUrl);
    await client.connect();

    let imported = 0;
    let scanned = 0;
    let preview: any[] = [];
    try {
      const conditions: string[] = [
        "e.situacao_cadastral = '02'",
        "e.data_inicio_atividade IS NOT NULL",
        `e.data_inicio_atividade <= (CURRENT_DATE - INTERVAL '${idadeMin} years')`,
      ];
      const args: unknown[] = [];

      if (ufs.length) {
        args.push(ufs.map((u) => String(u).toUpperCase()));
        conditions.push(`e.uf = ANY($${args.length}::text[])`);
      }
      if (cnaePrefixes.length) {
        const likes = cnaePrefixes.map((p) => {
          args.push(`${String(p).replace(/[^0-9]/g, "")}%`);
          return `e.cnae_fiscal_principal LIKE $${args.length}`;
        });
        conditions.push(`(${likes.join(" OR ")})`);
      }
      if (capitalMin > 0) {
        args.push(capitalMin);
        conditions.push(`em.capital_social >= $${args.length}`);
      }

      // Exclui CNPJs já presentes no EB
      const { data: existing } = await sb.schema("equity_brain" as any).from("companies").select("cnpj").limit(50000);
      const existingSet = new Set((existing ?? []).map((r: any) => r.cnpj));

      // Pega 3x o limit pra filtrar duplicados
      const rawLimit = Math.min(limit * 4, 800);
      const query = `
        SELECT
          e.cnpj_basico,
          (e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv) AS cnpj,
          e.nome_fantasia,
          e.cnae_fiscal_principal,
          e.cnae_fiscal_secundaria,
          e.uf, e.municipio, e.bairro, e.cep,
          e.tipo_logradouro, e.logradouro, e.numero,
          e.situacao_cadastral, e.data_situacao_cadastral,
          e.data_inicio_atividade AS data_abertura,
          em.razao_social, em.capital_social, em.porte_empresa, em.natureza_juridica
        FROM estabelecimentos e
        INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
        WHERE ${conditions.join(" AND ")}
        ORDER BY em.capital_social DESC NULLS LAST, e.data_inicio_atividade ASC
        LIMIT ${rawLimit}
      `;
      const result = await client.queryObject({ text: query, args });
      const allRows = result.rows as any[];
      scanned = allRows.length;

      const rows = allRows.filter((r) => !existingSet.has(r.cnpj)).slice(0, limit);

      if (!rows.length) {
        return new Response(JSON.stringify({ imported: 0, scanned, message: "Nenhuma empresa nova encontrada com esses filtros" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const records = rows.map((r) => {
        const capital = r.capital_social != null ? Number(r.capital_social) : null;
        const dataAbertura = r.data_abertura ? new Date(r.data_abertura).toISOString().slice(0, 10) : null;
        const cnaeSecundarios = r.cnae_fiscal_secundaria
          ? String(r.cnae_fiscal_secundaria).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
        return {
          cnpj: r.cnpj,
          razao_social: r.razao_social,
          nome_fantasia: r.nome_fantasia,
          cnae_principal: r.cnae_fiscal_principal,
          cnae_secundarios: cnaeSecundarios,
          natureza_juridica: r.natureza_juridica,
          porte: mapPorte(r.porte_empresa, capital),
          uf: r.uf,
          municipio: r.municipio ? String(r.municipio) : null,
          bairro: r.bairro,
          cep: r.cep,
          endereco_logradouro: [r.tipo_logradouro, r.logradouro].filter(Boolean).join(" ").trim() || null,
          endereco_numero: r.numero,
          data_abertura: dataAbertura,
          situacao_cadastral: SITUACAO_MAP[r.situacao_cadastral] ?? r.situacao_cadastral,
          capital_social: capital,
          source: "rfb_expand",
          qualification_status: "unqualified",
          last_enriched_at: new Date().toISOString(),
        };
      });
      preview = records.slice(0, 5);

      if (dryRun) {
        return new Response(JSON.stringify({ dry_run: true, would_import: records.length, scanned, preview }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: upErr } = await sb.schema("equity_brain" as any)
        .from("companies").upsert(records, { onConflict: "cnpj" });
      if (upErr) {
        console.error("Upsert error:", upErr);
        return new Response(JSON.stringify({ error: upErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      imported = records.length;
    } finally {
      await client.end();
    }

    // Dispara match-buyer (best-effort) para incluir as novas empresas
    let matchTriggered = false;
    if (buyerId) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/match-buyer`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ buyer_id: buyerId }),
        });
        matchTriggered = r.ok;
      } catch (e) {
        console.error("match-buyer trigger failed:", e);
      }
    }

    return new Response(JSON.stringify({
      imported, scanned, match_triggered: matchTriggered, preview,
      filters_used: { setores, ufs, portes, capital_min: capitalMin, idade_min_anos: idadeMin, cnae_prefixes: cnaePrefixes, limit },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("expand-companies-from-rfb error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
