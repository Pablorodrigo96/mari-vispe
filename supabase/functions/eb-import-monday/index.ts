// Fase 2 — Importador Monday → MARI
// preview: parse + map + retorna sumário (NÃO escreve)
// commit:  parse + map + upsert mandates + subtasks + companies stub
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// ---------- Estado → UF ----------
const ESTADO_TO_UF: Record<string, string> = {
  "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amapa": "AP",
  "Amazonas": "AM", "Bahia": "BA", "Ceará": "CE", "Ceara": "CE",
  "Distrito Federal": "DF", "Espírito Santo": "ES", "Espirito Santo": "ES",
  "Goiás": "GO", "Goias": "GO", "Maranhão": "MA", "Maranhao": "MA",
  "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG",
  "Pará": "PA", "Para": "PA", "Paraíba": "PB", "Paraiba": "PB",
  "Paraná": "PR", "Parana": "PR", "Pernambuco": "PE", "Piauí": "PI", "Piaui": "PI",
  "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS", "Rondônia": "RO", "Rondonia": "RO",
  "Roraima": "RR", "Santa Catarina": "SC", "São Paulo": "SP", "Sao Paulo": "SP",
  "Sergipe": "SE", "Tocantins": "TO",
  "PT": "EX", "Portugal": "EX",
};

function normalizeUF(value: unknown): string | null {
  if (!value) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  if (cleaned.length === 2) return cleaned.toUpperCase();
  if (ESTADO_TO_UF[cleaned]) return ESTADO_TO_UF[cleaned];
  const firstPart = cleaned.split(",")[0].trim();
  if (ESTADO_TO_UF[firstPart]) return ESTADO_TO_UF[firstPart];
  return null;
}

// ---------- Parsers ----------
function parseMoney(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (!s || s === "-" || s === "—") return null;
  s = s.replace(/R\$\s?/gi, "").replace(/\s/g, "");
  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function parsePct(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v <= 1 ? v * 100 : v;
  const s = String(v).replace("%", "").replace(",", ".").trim();
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = (XLSX as any).SSF?.parse_date_code?.(v);
    if (d) {
      const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
      return dt.toISOString().slice(0, 10);
    }
  }
  const s = String(v).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function parseUrl(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "-") return null;
  if (s.startsWith("http")) return s;
  const m = s.match(/(https?:\/\/[^\s)]+)/);
  return m ? m[1] : null;
}

// ---------- Fase mapping ----------
function mapFaseSellside(fase: string | null): { deal_phase: string; temperature: string | null } {
  if (!fase) return { deal_phase: "match", temperature: null };
  const f = fase.trim().toLowerCase();
  if (f === "nbo") return { deal_phase: "nbo", temperature: null };
  if (f === "spa") return { deal_phase: "spa", temperature: null };
  if (f === "concluído" || f === "concluido") return { deal_phase: "closed", temperature: null };
  if (f === "aguardando retorno") return { deal_phase: "match", temperature: "cold" };
  return { deal_phase: "match", temperature: null };
}

function mapStatus(status: string | null): { outcome: string; status: string } {
  if (!status) return { outcome: "em_andamento", status: "vigente" };
  const s = status.trim().toLowerCase();
  if (s === "concluído" || s === "concluido") return { outcome: "concluido", status: "vendemos" };
  if (s === "cancelado") return { outcome: "cancelado", status: "cancelado" };
  return { outcome: "em_andamento", status: "vigente" };
}

function mapDealTypeBuyside(op: string | null): { deal_type: string; deal_phase_override?: string } {
  if (!op) return { deal_type: "buyside" };
  const o = op.trim().toLowerCase();
  if (o === "buyside") return { deal_type: "buyside" };
  if (o === "cisão" || o === "cisao") return { deal_type: "cisao" };
  if (o === "fusão" || o === "fusao") return { deal_type: "fusao" };
  if (o === "spa") return { deal_type: "buyside", deal_phase_override: "spa" };
  if (o === "due diligence") return { deal_type: "buyside", deal_phase_override: "due_diligence" };
  return { deal_type: "buyside" };
}

// ---------- DB helpers ----------
type DB = ReturnType<typeof createClient>;

const advisorCache = new Map<string, string | null>();
const companyCache = new Map<string, string>();
const buyerCache = new Map<string, string | null>();

async function findAdvisor(db: DB, name: string): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (advisorCache.has(key)) return advisorCache.get(key) ?? null;

  const r1 = await db.from("profiles").select("user_id").ilike("full_name", name.trim()).maybeSingle();
  if (r1.data?.user_id) { advisorCache.set(key, r1.data.user_id as string); return r1.data.user_id as string; }

  try {
    const r2 = await db.rpc("find_user_by_meta_name", { search_name: name.trim() });
    if (r2.data) { advisorCache.set(key, r2.data as string); return r2.data as string; }
  } catch (_) { /* helper opcional */ }

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0], last = parts[parts.length - 1];
    const r3 = await db.from("profiles").select("user_id, full_name")
      .ilike("full_name", `${first}%${last}%`).limit(1).maybeSingle();
    if (r3.data?.user_id) { advisorCache.set(key, r3.data.user_id as string); return r3.data.user_id as string; }
  }

  await db.schema("equity_brain").from("advisors_pending_mapping").upsert({
    monday_name: name.trim(),
    occurrences: 1,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "monday_name" });
  advisorCache.set(key, null);
  return null;
}

async function findBuyer(db: DB, name: string): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (buyerCache.has(key)) return buyerCache.get(key) ?? null;
  const r = await db.schema("equity_brain").from("buyers").select("id").ilike("nome", name.trim()).limit(1).maybeSingle();
  const id = (r.data?.id as string | undefined) ?? null;
  buyerCache.set(key, id);
  return id;
}

async function sha256Hex(s: string, len = 8): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).slice(0, len / 2)
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

async function findOrCreateCompany(db: DB, razao: string, uf: string | null): Promise<string> {
  const key = razao.trim().toLowerCase();
  if (companyCache.has(key)) return companyCache.get(key)!;

  const tbl = () => db.schema("equity_brain").from("companies");

  let r = await tbl().select("cnpj").ilike("razao_social", razao.trim()).limit(1).maybeSingle();
  if (r.data?.cnpj) { companyCache.set(key, r.data.cnpj as string); return r.data.cnpj as string; }

  r = await tbl().select("cnpj").ilike("nome_fantasia", razao.trim()).limit(1).maybeSingle();
  if (r.data?.cnpj) { companyCache.set(key, r.data.cnpj as string); return r.data.cnpj as string; }

  const cleanName = razao.replace(/\b(Ltda|ME|EIRELI|S\/A|S\.A\.|EPP|MEI)\b\.?/gi, "").trim();
  if (cleanName && cleanName !== razao.trim()) {
    r = await tbl().select("cnpj").ilike("razao_social", `%${cleanName}%`).limit(1).maybeSingle();
    if (r.data?.cnpj) { companyCache.set(key, r.data.cnpj as string); return r.data.cnpj as string; }
  }

  const suffix = await sha256Hex(razao);
  const stubCnpj = `PENDING-${suffix}`;
  await tbl().insert({
    cnpj: stubCnpj,
    razao_social: razao.trim(),
    uf: uf ?? null,
    needs_cnpj_enrichment: true,
    qualification_status: "unqualified",
    source: "import_monday",
    raw_data: { imported_name: razao },
  });
  companyCache.set(key, stubCnpj);
  return stubCnpj;
}

// ---------- Sheet → linhas ----------
type RawRow = (string | number | null)[];

function readSheet(buf: ArrayBuffer): { type: "sellside" | "buyside" | null; rows: RawRow[]; headers: string[] } {
  const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { header: 1, defval: null, raw: true });
  let detectedType: "sellside" | "buyside" | null = null;
  const a1 = String(rows[0]?.[0] ?? "").toLowerCase();
  if (a1.includes("sellside")) detectedType = "sellside";
  else if (a1.includes("buyside")) detectedType = "buyside";
  const headers = (rows[2] ?? []).map((h) => String(h ?? "").trim());
  return { type: detectedType, rows, headers };
}

function isSeparatorRow(name: string): boolean {
  const n = name.trim().toLowerCase();
  return ["match", "name", "subitems", "em andamento", ""].includes(n);
}
function isSubitemHeaderRow(name: string): boolean {
  return name.trim().toLowerCase() === "subitems";
}

// ---------- Mapeamento ----------
type MappedMandate = {
  monday_item_id: string | null;
  company_cnpj: string;
  razao_social: string;
  payload: Record<string, unknown>;
  warnings: { row: number; field: string; message: string }[];
  monday_responsavel_name?: string | null;
  monday_padrinho_name?: string | null;
};

async function mapRowSellside(db: DB, row: RawRow, rowIndex: number): Promise<MappedMandate | null> {
  const name = String(row[0] ?? "").trim();
  if (!name || isSeparatorRow(name)) return null;

  const fase = row[4] ? String(row[4]).trim() : null;
  const statusRaw = row[6] ? String(row[6]).trim() : null;
  const phase = mapFaseSellside(fase);
  const st = mapStatus(statusRaw);

  let deal_phase = phase.deal_phase;
  let outcome = st.outcome;
  let status = st.status;

  const contractUrl = parseUrl(row[14]);
  const driveUrl = parseUrl(row[5]);
  const faseLow = (fase ?? "").toLowerCase();
  if (contractUrl && (faseLow === "concluído" || faseLow === "concluido")) {
    deal_phase = "closed"; status = "vendemos"; outcome = "vendemos";
  } else if (contractUrl && faseLow === "spa") {
    deal_phase = "spa";
  } else if (driveUrl && faseLow === "nbo") {
    deal_phase = "nbo";
  }

  const uf = normalizeUF(row[15]);
  const cnpj = await findOrCreateCompany(db, name, uf);

  const compradorMatchName = row[3] ? String(row[3]).trim() : "";
  const matchBuyerId = compradorMatchName ? await findBuyer(db, compradorMatchName) : null;

  const execName = row[11] ? String(row[11]).trim() : "";
  const responsavelId = execName ? await findAdvisor(db, execName) : null;

  const matchCol = row[12] ? String(row[12]).trim() : "";
  const obsParts: string[] = [];
  if (matchCol && matchCol !== name) obsParts.push(`Match Monday: ${matchCol}`);
  if (execName) obsParts.push(`[mari:monday_responsavel=${execName}]`);

  const payload: Record<string, unknown> = {
    company_cnpj: cnpj,
    deal_type: "sellside",
    deal_kind: "mandato_assinado",
    deal_phase,
    outcome,
    status,
    pipeline_stage: deal_phase,
    comprador_nome: row[2] ? String(row[2]).trim() : null,
    match_buyer_id: matchBuyerId,
    drive_url: driveUrl,
    contract_url: contractUrl,
    valor_operacao: parseMoney(row[8]),
    faturamento_vispe: parseMoney(row[9]),
    commission_pct: parsePct(row[10]),
    responsavel_id: responsavelId,
    data_assinatura_contrato: parseDate(row[7]),
    data_fechamento: parseDate(row[13]),
    uf,
    regiao: row[16] ? String(row[16]).trim() : null,
    monday_item_id: row[17] ? String(row[17]).trim() : null,
    imported_from: "monday_sellside",
    imported_at: new Date().toISOString(),
    source: "import_monday",
    observacoes: obsParts.join(" "),
    temperature: phase.temperature,
  };

  return {
    monday_item_id: payload.monday_item_id as string | null,
    company_cnpj: cnpj,
    razao_social: name,
    payload,
    warnings: [],
    monday_responsavel_name: execName || null,
  };
}

async function mapRowBuyside(db: DB, row: RawRow, rowIndex: number): Promise<MappedMandate | null> {
  const name = String(row[0] ?? "").trim();
  if (!name || isSeparatorRow(name)) return null;
  const cliente = row[3] ? String(row[3]).trim() : "";
  if (!cliente) return null;

  const opTipo = row[9] ? String(row[9]).trim() : null;
  const dt = mapDealTypeBuyside(opTipo);
  const statusRaw = row[15] ? String(row[15]).trim() : null;
  const st = mapStatus(statusRaw);

  let deal_phase: string = dt.deal_phase_override ?? "match";
  const nboUrl = parseUrl(row[5]);
  const spaUrl = parseUrl(row[6]);
  const contractUrl = parseUrl(row[7]);
  const driveCol = parseUrl(row[10]);
  if (nboUrl) deal_phase = "nbo";
  if (spaUrl) deal_phase = "spa";
  if (contractUrl) deal_phase = (statusRaw ?? "").toLowerCase().includes("conclu") ? "closed" : "closing";

  const uf = normalizeUF(row[11]);
  let regiao: string | null = row[12] ? String(row[12]).trim() : null;
  if (uf === "EX") regiao = "Internacional";

  const cnpj = await findOrCreateCompany(db, cliente, uf);

  const execName = row[13] ? String(row[13]).trim() : "";
  const padName = row[14] ? String(row[14]).trim() : "";
  const responsavelId = execName ? await findAdvisor(db, execName) : null;
  const padrinhoId = padName ? await findAdvisor(db, padName) : null;

  const crossSellRaw = row[21] ? String(row[21]).trim() : "";
  const crossSellFlags = crossSellRaw
    ? crossSellRaw.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(Boolean)
    : [];

  const obsParts: string[] = [];
  if (row[20]) obsParts.push(String(row[20]).trim());
  if (execName) obsParts.push(`[mari:monday_responsavel=${execName}]`);
  if (padName) obsParts.push(`[mari:monday_padrinho=${padName}]`);

  const payload: Record<string, unknown> = {
    company_cnpj: cnpj,
    deal_type: dt.deal_type,
    deal_kind: "buyer_mandate",
    deal_phase,
    pipeline_stage: deal_phase,
    outcome: st.outcome,
    status: st.status,
    contato_nome: name,
    comprador_nome: row[4] ? String(row[4]).trim() : null,
    drive_url: nboUrl ?? driveCol,
    contract_url: contractUrl ?? spaUrl,
    data_fechamento: parseDate(row[8]),
    data_assinatura_contrato: parseDate(row[16]),
    valor_operacao: parseMoney(row[17]),
    faturamento_vispe: parseMoney(row[18]),
    commission_pct: parsePct(row[19]),
    responsavel_id: responsavelId,
    padrinho_id: padrinhoId,
    cross_sell_flags: crossSellFlags,
    contato_telefone: row[22] ? String(row[22]).trim() : null,
    contato_email: row[23] ? String(row[23]).trim() : null,
    uf,
    regiao,
    monday_item_id: row[24] ? String(row[24]).trim() : null,
    imported_from: "monday_buyside",
    imported_at: new Date().toISOString(),
    source: "import_monday",
    observacoes: obsParts.join(" | "),
  };

  return {
    monday_item_id: payload.monday_item_id as string | null,
    company_cnpj: cnpj,
    razao_social: cliente,
    payload,
    warnings: [],
    monday_responsavel_name: execName || null,
    monday_padrinho_name: padName || null,
  };
}

// ---------- Subtarefas ----------
type SubtaskRow = {
  parent_index: number;
  name: string;
  etapa: string | null;
  responsavel_id: string | null;
  status: string;
  data_entrega: string | null;
  arquivos_url: string[];
  anotacoes: string | null;
};

function mapSubtaskStatus(s: string | null): string {
  if (!s) return "pendente";
  const v = s.trim().toLowerCase();
  if (v.includes("conclu")) return "concluido";
  if (v.includes("cancel")) return "cancelado";
  if (v.includes("bloque")) return "bloqueado";
  if (v.includes("andamento") || v.includes("doing")) return "em_andamento";
  return "pendente";
}

// ---------- Upsert ----------
async function upsertMandate(db: DB, m: MappedMandate): Promise<{ action: "created" | "updated"; mandate_id: string }> {
  const tbl = () => db.schema("equity_brain").from("mandates");
  if (m.monday_item_id) {
    const existing = await tbl().select("id").eq("monday_item_id", m.monday_item_id).maybeSingle();
    if (existing.data?.id) {
      const upd = Object.fromEntries(
        Object.entries(m.payload).filter(([_, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)),
      );
      await tbl().update({ ...upd, imported_at: new Date().toISOString() }).eq("id", existing.data.id);
      return { action: "updated", mandate_id: existing.data.id as string };
    }
  }
  const ins = await tbl().insert(m.payload).select("id").single();
  if (ins.error) throw new Error(`insert mandate: ${ins.error.message}`);
  return { action: "created", mandate_id: ins.data.id as string };
}

// ---------- Handler ----------
async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing auth" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: uErr } = await userClient.auth.getUser();
  if (uErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const isAdmin = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
  if (!isAdmin.data) {
    return new Response(JSON.stringify({ error: "admin required" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const type = form.get("type") as "sellside" | "buyside" | null;
  const mode = form.get("mode") as "preview" | "commit" | null;
  const importId = (form.get("import_id") as string | null) ?? crypto.randomUUID();

  if (!file || !type || !mode) {
    return new Response(JSON.stringify({ error: "file, type and mode required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!["sellside", "buyside"].includes(type) || !["preview", "commit"].includes(mode)) {
    return new Response(JSON.stringify({ error: "invalid type or mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const buf = await file.arrayBuffer();
  const parsed = readSheet(buf);
  const detectedType = parsed.type ?? type;
  const rows = parsed.rows;

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  advisorCache.clear(); companyCache.clear(); buyerCache.clear();

  const mapped: MappedMandate[] = [];
  const subtasks: SubtaskRow[] = [];
  const warnings: { row: number; field: string; message: string }[] = [];
  let inSubitemBlock = false;
  let lastParentIndex = -1;
  let total = 0, skipped = 0;

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const name = String(row[0] ?? "").trim();
    if (!name) { skipped++; continue; }
    total++;

    if (isSubitemHeaderRow(name)) { inSubitemBlock = true; skipped++; continue; }

    if (inSubitemBlock && lastParentIndex >= 0) {
      const itemIdCol = type === "sellside" ? row[17] : row[24];
      const looksLikeMandate = !!itemIdCol;
      if (!looksLikeMandate) {
        const respName = row[2] ? String(row[2]).trim() : "";
        const respId = respName ? await findAdvisor(db, respName) : null;
        subtasks.push({
          parent_index: lastParentIndex,
          name,
          etapa: row[1] ? String(row[1]).trim() : null,
          responsavel_id: respId,
          status: mapSubtaskStatus(row[3] ? String(row[3]) : null),
          data_entrega: parseDate(row[4]),
          arquivos_url: row[5] ? [String(row[5])].filter(Boolean) : [],
          anotacoes: row[6] ? String(row[6]).trim() : null,
        });
        continue;
      }
      inSubitemBlock = false;
    }

    if (isSeparatorRow(name)) { skipped++; continue; }

    try {
      const m = type === "sellside"
        ? await mapRowSellside(db, row, i)
        : await mapRowBuyside(db, row, i);
      if (!m) { skipped++; continue; }
      mapped.push(m);
      warnings.push(...m.warnings);
      lastParentIndex = mapped.length - 1;
    } catch (err) {
      warnings.push({ row: i + 1, field: "_row", message: (err as Error).message });
      skipped++;
    }
  }

  const stubCompanies = mapped.filter(m => m.company_cnpj.startsWith("PENDING-"));
  const compCounts = new Map<string, number>();
  for (const m of stubCompanies) compCounts.set(m.razao_social, (compCounts.get(m.razao_social) ?? 0) + 1);

  const unmappedAdv = new Map<string, number>();
  for (const m of mapped) {
    for (const n of [m.monday_responsavel_name, m.monday_padrinho_name]) {
      if (!n) continue;
      const cached = advisorCache.get(n.toLowerCase());
      if (cached === null) unmappedAdv.set(n, (unmappedAdv.get(n) ?? 0) + 1);
    }
  }

  if (mode === "preview") {
    return new Response(JSON.stringify({
      import_id: importId,
      type: detectedType,
      mode: "preview",
      total_rows: total,
      parsed_rows: mapped.length,
      skipped_rows: skipped,
      preview: mapped.slice(0, 20).map(m => ({
        razao_social: m.razao_social,
        company_cnpj: m.company_cnpj,
        deal_phase: m.payload.deal_phase,
        deal_type: m.payload.deal_type,
        outcome: m.payload.outcome,
        status: m.payload.status,
        valor_operacao: m.payload.valor_operacao,
        faturamento_vispe: m.payload.faturamento_vispe,
        responsavel_id: m.payload.responsavel_id,
        monday_item_id: m.monday_item_id,
        monday_responsavel_name: m.monday_responsavel_name,
      })),
      warnings: warnings.slice(0, 100),
      advisors_unmapped: Array.from(unmappedAdv.entries()).map(([n, c]) => ({ monday_name: n, occurrences: c })),
      companies_to_create: Array.from(compCounts.entries()).map(([r, c]) => ({ razao_social: r, count: c })),
      validation_errors: [],
      subtasks_count: subtasks.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // COMMIT
  let created = 0, updated = 0, subtasksCreated = 0;
  const companiesCreatedSet = new Set(stubCompanies.map(s => s.company_cnpj));
  const parentIdMap = new Map<number, string>();

  for (let i = 0; i < mapped.length; i++) {
    const m = mapped[i];
    try {
      const r = await upsertMandate(db, m);
      if (r.action === "created") created++; else updated++;
      parentIdMap.set(i, r.mandate_id);
    } catch (err) {
      warnings.push({ row: -1, field: "upsert", message: `${m.razao_social}: ${(err as Error).message}` });
    }
  }

  if (subtasks.length > 0) {
    const subRows = subtasks
      .map((s, idx) => {
        const pid = parentIdMap.get(s.parent_index);
        if (!pid) return null;
        return {
          mandate_id: pid,
          name: s.name,
          etapa: s.etapa,
          responsavel_id: s.responsavel_id,
          status: s.status,
          data_entrega: s.data_entrega,
          arquivos_url: s.arquivos_url,
          anotacoes: s.anotacoes,
          ordem: idx,
        };
      })
      .filter(Boolean) as Record<string, unknown>[];

    if (subRows.length > 0) {
      const insSub = await db.schema("equity_brain").from("mandate_subtasks").insert(subRows);
      if (!insSub.error) subtasksCreated = subRows.length;
      else warnings.push({ row: -1, field: "subtasks", message: insSub.error.message });
    }
  }

  return new Response(JSON.stringify({
    import_id: importId,
    type: detectedType,
    mode: "commit",
    total_rows: total,
    parsed_rows: mapped.length,
    skipped_rows: skipped,
    preview: [],
    warnings: warnings.slice(0, 200),
    advisors_unmapped: Array.from(unmappedAdv.entries()).map(([n, c]) => ({ monday_name: n, occurrences: c })),
    companies_to_create: Array.from(compCounts.entries()).map(([r, c]) => ({ razao_social: r, count: c })),
    validation_errors: [],
    result: {
      mandates_created: created,
      mandates_updated: updated,
      companies_created: companiesCreatedSet.size,
      subtasks_created: subtasksCreated,
    },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(withObservability(handler, { name: "eb-import-monday" }));
