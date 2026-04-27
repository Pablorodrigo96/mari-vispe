// Equity Brain — sync-companies-from-cnpj
// Importa um lote de empresas da base nacional (Receita Federal) para equity_brain.companies + company_partners.
// Auth: requer JWT (verify_jwt = true por default). Operação cara — só admin/service role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITUACAO_MAP: Record<string, string> = {
  "01": "NULA",
  "02": "ATIVA",
  "03": "SUSPENSA",
  "04": "INAPTA",
  "08": "BAIXADA",
};

function mapPorte(porte: string | null, capitalSocial: number | null): string {
  const cap = Number(capitalSocial ?? 0);
  if (porte === "01") return "ME";
  if (porte === "03") return "EPP";
  // '05' ou '00' (DEMAIS / não informado): reclassifica por capital
  if (cap > 1_000_000) return "MEDIA";
  return "DEMAIS";
}

function mapTipoSocio(identificador: string | number | null): string {
  const v = String(identificador ?? "");
  if (v === "1") return "PJ";
  return "PF"; // 2 = PF, 3 = estrangeiro tratado como PF
}

function isProvavelFundador(qualificacao: string | null, dataEntrada: string | null, dataAbertura: string | null): boolean {
  if (!qualificacao) return false;
  const q = qualificacao.toUpperCase();
  const isSocio = q.includes("SÓCIO") || q.includes("SOCIO") || q.includes("ADMINISTRADOR") || q.includes("TITULAR");
  if (!isSocio) return false;
  if (!dataEntrada || !dataAbertura) return isSocio;
  // Fundador = entrou no primeiro ano da empresa
  const entrada = new Date(dataEntrada).getTime();
  const abertura = new Date(dataAbertura).getTime();
  const diffDays = Math.abs(entrada - abertura) / (1000 * 60 * 60 * 24);
  return diffDays <= 365;
}

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
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const externalDbUrl = Deno.env.get("EXTERNAL_DB_URL");
    if (!externalDbUrl) {
      return new Response(JSON.stringify({ error: "EXTERNAL_DB_URL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: only admin or service_role
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
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: roleData } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const uf: string | undefined = body.uf;
    const cnaePrefixes: string[] = Array.isArray(body.cnae_prefixes) ? body.cnae_prefixes : [];
    const limit: number = Math.min(Number(body.limit ?? 1000), 5000);
    const offset: number = Math.max(Number(body.offset ?? 0), 0);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // 1) Conecta na base nacional via deno-postgres
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(externalDbUrl);
    await client.connect();

    try {
      // Monta condições dinâmicas
      const conditions: string[] = [
        "e.situacao_cadastral = '02'",
        "e.data_inicio_atividade <= (CURRENT_DATE - INTERVAL '5 years')",
        "e.data_inicio_atividade IS NOT NULL",
      ];
      const args: unknown[] = [];

      if (uf) {
        args.push(uf.toUpperCase());
        conditions.push(`e.uf = $${args.length}`);
      }

      if (cnaePrefixes.length > 0) {
        const likes = cnaePrefixes.map((p) => {
          args.push(`${String(p).replace(/[^0-9]/g, "")}%`);
          return `e.cnae_fiscal_principal LIKE $${args.length}`;
        });
        conditions.push(`(${likes.join(" OR ")})`);
      }

      const baseQuery = `
        SELECT
          e.cnpj_basico,
          (e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv) AS cnpj,
          e.nome_fantasia,
          e.cnae_fiscal_principal,
          e.cnae_fiscal_secundaria,
          e.uf,
          e.municipio,
          e.bairro,
          e.cep,
          e.tipo_logradouro,
          e.logradouro,
          e.numero,
          e.situacao_cadastral,
          e.data_situacao_cadastral,
          e.data_inicio_atividade AS data_abertura,
          em.razao_social,
          em.capital_social,
          em.porte_empresa,
          em.natureza_juridica
        FROM estabelecimentos e
        INNER JOIN empresas em ON em.cnpj_basico = e.cnpj_basico
        WHERE ${conditions.join(" AND ")}
        ORDER BY e.cnpj_basico
        LIMIT ${limit} OFFSET ${offset}
      `;

      const result = await client.queryObject({ text: baseQuery, args });
      const rows = result.rows as any[];

      if (rows.length === 0) {
        return new Response(JSON.stringify({ imported: 0, skipped: 0, partners_imported: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cnpjBasicos = [...new Set(rows.map((r) => r.cnpj_basico))];
      const cnpjsCompletos = rows.map((r) => r.cnpj);

      // 2) Carrega sócios do lote
      const partnersResult = await client.queryObject({
        text: `
          SELECT s.cnpj_basico, s.identificador_socio, s.nome_socio,
                 s.cnpj_cpf_socio, s.qualificacao_socio, s.data_entrada_sociedade
          FROM socios s
          WHERE s.cnpj_basico = ANY($1::text[])
        `,
        args: [cnpjBasicos],
      });
      const partnersRows = partnersResult.rows as any[];

      // Indexa sócios por cnpj_basico
      const partnersByBasico = new Map<string, any[]>();
      for (const p of partnersRows) {
        const arr = partnersByBasico.get(p.cnpj_basico) ?? [];
        arr.push(p);
        partnersByBasico.set(p.cnpj_basico, arr);
      }

      // 3) Carrega cnae_setor_map
      const { data: cnaeMap } = await supabase
        .schema("equity_brain" as any)
        .from("cnae_setor_map")
        .select("*");
      const cnaeIndex = new Map<string, any>();
      for (const c of cnaeMap ?? []) cnaeIndex.set(String((c as any).cnae_principal), c);

      // 4) Cruza com listings (intencao_venda_explicita)
      const { data: listingsCross } = await supabase
        .from("listings")
        .select("id, cnpj")
        .in("cnpj", cnpjsCompletos);
      const listingByCnpj = new Map<string, string>();
      for (const l of listingsCross ?? []) {
        if ((l as any).cnpj) listingByCnpj.set((l as any).cnpj, (l as any).id);
      }

      // 5) Monta records de companies
      const records = rows.map((r) => {
        const partnersList = partnersByBasico.get(r.cnpj_basico) ?? [];
        const sociosPF = partnersList.filter((p) => mapTipoSocio(p.identificador_socio) === "PF").length;
        const sociosPJ = partnersList.filter((p) => mapTipoSocio(p.identificador_socio) === "PJ").length;
        const cnaeEntry = cnaeIndex.get(String(r.cnae_fiscal_principal));
        const capital = r.capital_social != null ? Number(r.capital_social) : null;
        const dataAbertura = r.data_abertura ? new Date(r.data_abertura).toISOString().slice(0, 10) : null;
        const dataSituacao = r.data_situacao_cadastral
          ? new Date(r.data_situacao_cadastral).toISOString().slice(0, 10)
          : null;
        const enderecoLogradouro = [r.tipo_logradouro, r.logradouro].filter(Boolean).join(" ").trim() || null;
        const cnaeSecundarios = r.cnae_fiscal_secundaria
          ? String(r.cnae_fiscal_secundaria).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
        const listingId = listingByCnpj.get(r.cnpj) ?? null;

        return {
          cnpj: r.cnpj,
          razao_social: r.razao_social,
          nome_fantasia: r.nome_fantasia,
          cnae_principal: r.cnae_fiscal_principal,
          cnae_descricao: null,
          cnae_secundarios: cnaeSecundarios,
          natureza_juridica: r.natureza_juridica,
          natureza_descricao: null,
          porte: mapPorte(r.porte_empresa, capital),
          uf: r.uf,
          municipio: r.municipio ? String(r.municipio) : null,
          bairro: r.bairro,
          cep: r.cep,
          endereco_logradouro: enderecoLogradouro,
          endereco_numero: r.numero,
          latitude: null,
          longitude: null,
          data_abertura: dataAbertura,
          situacao_cadastral: SITUACAO_MAP[r.situacao_cadastral] ?? r.situacao_cadastral,
          data_situacao_cadastral: dataSituacao,
          capital_social: capital,
          qtd_socios: partnersList.length,
          socios_pf: sociosPF,
          socios_pj: sociosPJ,
          setor_ma: cnaeEntry?.setor_ma ?? null,
          subsetor_ma: cnaeEntry?.subsetor_ma ?? null,
          has_listing: !!listingId,
          listing_id: listingId,
          source: "national_db",
          raw_data: r,
          last_enriched_at: new Date().toISOString(),
        };
      });

      // UPSERT companies
      const { error: upsertErr } = await supabase
        .schema("equity_brain" as any)
        .from("companies")
        .upsert(records, { onConflict: "cnpj" });

      if (upsertErr) {
        console.error("Companies upsert error:", upsertErr);
        return new Response(JSON.stringify({ error: upsertErr.message, stage: "companies_upsert" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 6) Sócios — refresh por batch (DELETE + INSERT em massa)
      let partnersImported = 0;
      if (partnersRows.length > 0) {
        // Mapeia cnpj_basico -> cnpj completo (usamos o primeiro estabelecimento do batch)
        const cnpjByBasico = new Map<string, string>();
        for (const r of rows) {
          if (!cnpjByBasico.has(r.cnpj_basico)) cnpjByBasico.set(r.cnpj_basico, r.cnpj);
        }
        const cnpjAberturaMap = new Map<string, string | null>();
        for (const r of rows) {
          if (!cnpjAberturaMap.has(r.cnpj_basico)) {
            cnpjAberturaMap.set(
              r.cnpj_basico,
              r.data_abertura ? new Date(r.data_abertura).toISOString().slice(0, 10) : null,
            );
          }
        }

        const partnerRecords = partnersRows
          .map((p) => {
            const cnpjFull = cnpjByBasico.get(p.cnpj_basico);
            if (!cnpjFull) return null;
            const dataEntrada = p.data_entrada_sociedade
              ? new Date(p.data_entrada_sociedade).toISOString().slice(0, 10)
              : null;
            const dataAbertura = cnpjAberturaMap.get(p.cnpj_basico) ?? null;
            return {
              cnpj: cnpjFull,
              nome: p.nome_socio,
              cpf_cnpj: p.cnpj_cpf_socio,
              tipo: mapTipoSocio(p.identificador_socio),
              qualificacao: p.qualificacao_socio ? String(p.qualificacao_socio) : null,
              data_entrada: dataEntrada,
              idade_estimada: null, // será preenchido pela IA na Fase 7
              is_provavel_fundador: isProvavelFundador(
                p.qualificacao_socio ? String(p.qualificacao_socio) : null,
                dataEntrada,
                dataAbertura,
              ),
              raw_data: p,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        // DELETE partners do lote (idempotência)
        const { error: delErr } = await supabase
          .schema("equity_brain" as any)
          .from("company_partners")
          .delete()
          .in("cnpj", cnpjsCompletos);
        if (delErr) {
          console.error("Partners delete error:", delErr);
        }

        // INSERT em chunks de 500
        const chunkSize = 500;
        for (let i = 0; i < partnerRecords.length; i += chunkSize) {
          const chunk = partnerRecords.slice(i, i + chunkSize);
          const { error: insErr } = await supabase
            .schema("equity_brain" as any)
            .from("company_partners")
            .insert(chunk);
          if (insErr) {
            console.error("Partners insert error:", insErr);
          } else {
            partnersImported += chunk.length;
          }
        }
      }

      return new Response(
        JSON.stringify({
          imported: records.length,
          skipped: 0,
          partners_imported: partnersImported,
          batch: { uf: uf ?? null, cnae_prefixes: cnaePrefixes, limit, offset },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } finally {
      await client.end();
    }
  } catch (e) {
    console.error("sync-companies-from-cnpj error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
