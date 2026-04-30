// EB Import Anatel — ingestão da base fria de banda larga fixa (ISPs)
// Lê CSV/XLSX da Anatel, normaliza, deduplica e grava em equity_brain.isp_market_entries
// SEM tocar em equity_brain.companies (lista fria nunca vira cliente automaticamente)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ImportRequest {
  file_url?: string;       // path no bucket isp-anatel (ex: "uploads/2025-q1.csv")
  file_name?: string;      // display
  rows?: Record<string, any>[]; // alternativa: enviar rows já parseadas
  period_ref?: string;     // YYYY-MM-DD (opcional, sobrescreve qualquer coluna)
  dry_run?: boolean;
}

interface RowError { row: number; field?: string; msg: string }

// ---------- helpers de normalização ----------
const onlyDigits = (s: any) => String(s ?? "").replace(/\D/g, "");
const norm = (s: any) =>
  String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().trim().replace(/\s+/g, " ");
const toInt = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};
const toDate = (v: any): string | null => {
  if (!v) return null;
  if (typeof v === "number") {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // YYYY-MM
  const ym = s.match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return s;
  // BR
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

// alias resolver case-insensitive
const pick = (row: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k];
    const lower = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (lower && row[lower] != null && row[lower] !== "") return row[lower];
  }
  return null;
};

// Normaliza row Anatel → schema isp_market_entries
function normalizeRow(r: Record<string, any>, periodOverride: string | null) {
  const cnpj = onlyDigits(pick(r, "cnpj", "CNPJ", "cnpj_prestadora"));
  const provider = pick(r, "razao_social", "nome_prestadora", "prestadora", "provider_name");
  const uf = pick(r, "uf", "UF", "sigla_uf");
  const municipio = pick(r, "municipio", "Município", "nome_municipio");
  const ibge = pick(r, "codigo_ibge", "ibge", "cod_ibge", "código_ibge");
  const tech = pick(r, "tecnologia", "technology", "meio_acesso");
  const service = pick(r, "produto", "service_type", "tipo_servico", "servico");
  const accesses = toInt(pick(r, "acessos", "accesses", "qtde_acessos", "quantidade"));
  const period = periodOverride || toDate(pick(r, "periodo", "ano_mes", "mes_ref", "data"));

  return {
    cnpj,
    provider_name: provider ? String(provider).trim() : null,
    provider_name_norm: provider ? norm(provider) : null,
    uf: uf ? String(uf).toUpperCase().slice(0, 2) : null,
    municipio: municipio ? String(municipio).trim() : null,
    ibge_code: ibge ? String(ibge).trim() : null,
    technology: tech ? String(tech).trim() : null,
    service_type: service ? String(service).trim() : null,
    accesses,
    period_ref: period,
    source: "anatel",
    raw: r,
  };
}

async function parseFileFromBucket(supabase: any, path: string) {
  const { data, error } = await supabase.storage.from("isp-anatel").download(path);
  if (error) throw new Error(`Storage download: ${error.message}`);
  const buf = await data.arrayBuffer();
  const ext = path.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    const text = new TextDecoder("utf-8").decode(buf);
    const wb = XLSX.read(text, { type: "string" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
  }
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1) Auth — exige usuário admin/advisor
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uerr } = await userClient.auth.getUser();
    if (uerr || !user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "advisor");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "forbidden: admin/advisor required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ImportRequest = await req.json();
    const dry = !!body.dry_run;
    const periodOverride = body.period_ref ? toDate(body.period_ref) : null;

    // 2) Carrega rows (ou do bucket, ou do payload)
    let rows: Record<string, any>[] = [];
    if (body.rows?.length) rows = body.rows;
    else if (body.file_url) rows = await parseFileFromBucket(admin, body.file_url);
    else {
      return new Response(JSON.stringify({ error: "missing rows or file_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Audit row inicial (status=running)
    const fileName = body.file_name || body.file_url || "inline";
    let importId: string | null = null;
    if (!dry) {
      const { data: imp, error: ierr } = await admin
        .schema("equity_brain")
        .from("isp_anatel_imports")
        .insert({
          file_name: fileName,
          file_url: body.file_url ?? null,
          period_ref: periodOverride,
          uploaded_by: user.id,
          total_rows: rows.length,
          inserted_rows: 0,
          rejected_rows: 0,
          dedup_rows: 0,
          status: "running",
        })
        .select("id").single();
      if (ierr) throw new Error("audit insert: " + ierr.message);
      importId = imp.id;
    }

    // 4) Normalização + validação
    const errors: RowError[] = [];
    const valid: any[] = [];
    rows.forEach((r, i) => {
      const n = normalizeRow(r, periodOverride);
      if (!n.cnpj || n.cnpj.length !== 14) {
        errors.push({ row: i + 2, field: "cnpj", msg: "CNPJ inválido" }); return;
      }
      if (!n.period_ref) {
        errors.push({ row: i + 2, field: "period_ref", msg: "período (YYYY-MM-DD) ausente" }); return;
      }
      if (n.accesses == null) {
        errors.push({ row: i + 2, field: "accesses", msg: "número de acessos ausente" }); return;
      }
      if (importId) (n as any).import_id = importId;
      valid.push(n);
    });

    // 5) Dedup interno do batch (mesma chave)
    const seen = new Set<string>();
    const deduped: any[] = [];
    let internalDup = 0;
    for (const v of valid) {
      const key = `${v.cnpj}|${v.ibge_code ?? "0"}|${v.period_ref}|${v.technology ?? "NA"}`;
      if (seen.has(key)) { internalDup++; continue; }
      seen.add(key);
      deduped.push(v);
    }

    // 6) Dry-run: retorna preview sem gravar
    if (dry) {
      return new Response(JSON.stringify({
        dry_run: true,
        total_rows: rows.length,
        valid: deduped.length,
        rejected: errors.length,
        internal_duplicates: internalDup,
        errors: errors.slice(0, 50),
        sample: deduped.slice(0, 5),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 7) Upsert em isp_market_entries (chunks de 500)
    let inserted = 0;
    let upsertErrors = 0;
    const CHUNK = 500;
    for (let i = 0; i < deduped.length; i += CHUNK) {
      const chunk = deduped.slice(i, i + CHUNK);
      const { error: upErr, count } = await admin
        .schema("equity_brain")
        .from("isp_market_entries")
        .upsert(chunk, {
          onConflict: "cnpj,ibge_code,period_ref,technology",
          ignoreDuplicates: false,
          count: "exact",
        });
      if (upErr) {
        upsertErrors += chunk.length;
        errors.push({ row: 0, msg: `chunk ${i}: ${upErr.message}` });
      } else {
        inserted += count ?? chunk.length;
      }
    }

    // 8) Fecha audit row
    await admin.schema("equity_brain").from("isp_anatel_imports")
      .update({
        total_rows: rows.length,
        inserted_rows: inserted,
        rejected_rows: errors.length,
        dedup_rows: internalDup,
        status: upsertErrors > 0 ? "partial" : "completed",
        error_log: errors.slice(0, 200),
      })
      .eq("id", importId!);

    return new Response(JSON.stringify({
      ok: true,
      import_id: importId,
      total_rows: rows.length,
      inserted,
      rejected: errors.length,
      internal_duplicates: internalDup,
      errors: errors.slice(0, 50),
      next_step: "Rode a Fase 3: compute-isp-market-stats para gerar HHI/leader/score",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[eb-import-anatel] fatal", e);
    return new Response(JSON.stringify({ error: e.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
