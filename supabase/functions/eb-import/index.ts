// EB Import — bulk upsert para companies/mandates/buyers/contacts/activities
// Compatível com exports do Monday (pt-BR) e templates internos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Entity = "companies" | "mandates" | "buyers" | "contacts" | "activities" | "bundle";

interface ImportPayload {
  entity: Entity;
  rows?: Record<string, any>[];
  bundle?: Partial<Record<Exclude<Entity, "bundle">, Record<string, any>[]>>;
  dry_run?: boolean;
}

interface RowError { row: number; field?: string; msg: string }
interface EntityResult {
  entity: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: RowError[];
  warnings: RowError[];
  ids: string[];
}

// ---------- helpers ----------
const onlyDigits = (s: any) => String(s ?? "").replace(/\D/g, "");

/** Normaliza CNPJ: pad com zero à esquerda se vier com 13 dígitos (Excel come o leading-zero). */
const normalizeCnpj = (s: any): string | null => {
  const d = onlyDigits(s);
  if (!d) return null;
  if (d.length === 14) return d;
  if (d.length === 13) return d.padStart(14, "0");
  return null;
};

const toArray = (v: any): string[] => {
  if (v == null || v === "") return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return String(v).split(/[|,;]/).map((x) => x.trim()).filter(Boolean);
};
const toNum = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const toDate = (v: any): string | null => {
  if (!v) return null;
  if (typeof v === "number") {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString();
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00Z`).toISOString();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const toBool = (v: any): boolean => {
  if (v === true) return true;
  if (v == null || v === "") return false;
  const s = String(v).trim().toLowerCase();
  return ["sim", "s", "yes", "y", "true", "1", "x"].includes(s);
};

const pick = (row: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k];
    const lower = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (lower && row[lower] != null && row[lower] !== "") return row[lower];
  }
  return null;
};

// ---------- Mapeamentos pt-BR → enum DB ----------
const STAGE_MAP: Record<string, string> = {
  originacao: "match",
  originação: "match",
  qualificacao: "match",
  qualificação: "match",
  match: "match",
  mandato_assinado: "nbo",
  marketing: "nbo",
  ofertas: "nbo",
  nbo: "nbo",
  due_diligence: "due_diligence",
  "due diligence": "due_diligence",
  dd: "due_diligence",
  spa: "spa",
  fechamento: "closing",
  closing: "closing",
  closed: "closed",
  fechado: "closed",
};

const DEAL_TYPE_MAP: Record<string, string> = {
  sell_side: "sellside",
  "sell-side": "sellside",
  sellside: "sellside",
  buy_side: "buyside",
  "buy-side": "buyside",
  buyside: "buyside",
  capital_raise: "buyside", // aproximação razoável
  spa: "spa",
  due_diligence: "due_diligence",
  cisao: "cisao",
  fusao: "fusao",
  nbo: "nbo",
  match: "match",
};

const STATUS_MAP: Record<string, string> = {
  ativo: "vigente",
  active: "vigente",
  vigente: "vigente",
  vencido: "vencido",
  expirado: "vencido",
  vendemos: "vendemos",
  fechado: "vendemos",
  em_negociacao: "em_negociacao",
  "em negociação": "em_negociacao",
  negociando: "em_negociacao",
  vendeu_sozinho: "vendeu_sozinho",
  cancelado: "cancelado",
};

const norm = (s: any) =>
  String(s ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const mapEnum = (raw: any, table: Record<string, string>, fallback: string): string => {
  if (!raw) return fallback;
  const k = norm(raw);
  return table[k] ?? fallback;
};

/** Buyer "tipo" textual → enum {financeiro|estrategico|family_office} + setor preservado. */
const classifyBuyerTipo = (raw: any): { tipo: string; setor_inferido: string | null } => {
  if (!raw) return { tipo: "estrategico", setor_inferido: null };
  const s = norm(raw);
  if (s.includes("financ") || s.includes("banco") || s.includes("seguro") || s.includes("fintech")) {
    return { tipo: "financeiro", setor_inferido: "Financeiro" };
  }
  if (s.includes("family") || s.includes("familia")) {
    return { tipo: "family_office", setor_inferido: null };
  }
  // Conhecidos do schema
  if (["estrategico", "estratégico", "financeiro", "family_office"].includes(s)) {
    return { tipo: s.replace("estratégico", "estrategico"), setor_inferido: null };
  }
  // Texto livre = setor; tipo default estratégico
  return { tipo: "estrategico", setor_inferido: String(raw).trim() };
};

// Aceita singular ou plural em entity_type
const normEntityType = (raw: any): "company" | "buyer" | "mandate" | null => {
  const s = norm(raw);
  if (["company", "companies", "empresa", "empresas"].includes(s)) return "company";
  if (["buyer", "buyers", "comprador", "compradores"].includes(s)) return "buyer";
  if (["mandate", "mandates", "mandato", "mandatos"].includes(s)) return "mandate";
  return null;
};

// ---------- entity processors ----------
async function processCompanies(
  supabase: any, rows: Record<string, any>[], dry: boolean, userId: string,
): Promise<EntityResult> {
  const result: EntityResult = { entity: "companies", inserted: 0, updated: 0, skipped: 0, errors: [], warnings: [], ids: [] };
  const valid: any[] = [];
  rows.forEach((r, i) => {
    const cnpjRaw = normalizeCnpj(pick(r, "cnpj"));
    const razao = pick(r, "razao_social", "razão_social", "nome");
    const uf = pick(r, "uf", "estado");
    if (!razao) { result.errors.push({ row: i + 2, field: "razao_social", msg: "Razão social obrigatória" }); return; }

    let cnpj = cnpjRaw;
    let external_ref: string | null = null;
    let needs_enrich = false;
    if (!cnpj) {
      // Gera CNPJ-placeholder estável a partir do nome+i (não-real, mas preserva PK).
      const seed = (String(razao).replace(/\W/g, "").toLowerCase() + i).slice(0, 14).padEnd(14, "0");
      // Force prefixo 99999 para sinalizar placeholder + hash
      let h = 0;
      for (const ch of seed) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
      const tail = String(Math.abs(h)).padStart(9, "0").slice(0, 9);
      cnpj = "99999" + tail; // 14 dígitos, prefixo identificável
      external_ref = `MARI-MONDAY-${String(razao).slice(0, 40)}-${i}`;
      needs_enrich = true;
      result.warnings.push({ row: i + 2, field: "cnpj", msg: `CNPJ ausente — placeholder ${cnpj} criado (needs_cnpj_enrichment=true)` });
    }

    valid.push({
      cnpj,
      razao_social: String(razao),
      nome_fantasia: pick(r, "nome_fantasia") || null,
      cnae_principal: pick(r, "cnae_principal", "cnae") ? onlyDigits(pick(r, "cnae_principal", "cnae")) : null,
      cnae_descricao: pick(r, "cnae_descricao") || null,
      porte: pick(r, "porte") || null,
      uf: uf ? String(uf).toUpperCase().slice(0, 2) : null,
      municipio: pick(r, "municipio", "cidade") || null,
      capital_social: toNum(pick(r, "capital_social")),
      faturamento_estimado: toNum(pick(r, "faturamento_estimado", "faturamento")),
      setor_ma: pick(r, "setor_ma", "setor") || null,
      subsetor_ma: pick(r, "subsetor_ma", "subsetor") || null,
      qualification_status: "qualified",
      qualified_at: new Date().toISOString(),
      qualified_by: userId,
      qualification_source: "import",
      source: "import",
      external_ref,
      needs_cnpj_enrichment: needs_enrich,
    });
  });
  if (dry || !valid.length) {
    result.inserted = valid.length;
    return result;
  }
  const { data, error } = await supabase
    .schema("equity_brain")
    .from("companies")
    .upsert(valid, { onConflict: "cnpj", ignoreDuplicates: false })
    .select("cnpj");
  if (error) { result.errors.push({ row: 0, msg: error.message }); return result; }
  result.inserted = data?.length || 0;
  result.ids = (data || []).map((d: any) => d.cnpj);
  return result;
}

async function processBuyers(
  supabase: any, rows: Record<string, any>[], dry: boolean, userId: string,
): Promise<{ result: EntityResult; nameToId: Record<string, string> }> {
  const result: EntityResult = { entity: "buyers", inserted: 0, updated: 0, skipped: 0, errors: [], warnings: [], ids: [] };
  const valid: any[] = [];
  const namesInOrder: string[] = [];

  rows.forEach((r, i) => {
    const nome = pick(r, "nome", "name", "buyer_name");
    if (!nome) { result.errors.push({ row: i + 2, field: "nome", msg: "Nome obrigatório" }); return; }

    const { tipo, setor_inferido } = classifyBuyerTipo(pick(r, "tipo"));
    const setoresExplicitos = toArray(pick(r, "setores_interesse", "setores"));
    const setores = setor_inferido && !setoresExplicitos.length
      ? [setor_inferido]
      : setoresExplicitos;

    namesInOrder.push(String(nome));
    valid.push({
      ...(pick(r, "id") ? { id: pick(r, "id") } : {}),
      nome: String(nome),
      tipo,
      cnpj: pick(r, "cnpj") ? normalizeCnpj(pick(r, "cnpj")) : null,
      website: pick(r, "website") || null,
      ticket_min: toNum(pick(r, "ticket_min")),
      ticket_max: toNum(pick(r, "ticket_max")),
      porte_alvo: toArray(pick(r, "porte_alvo")),
      setores_interesse: setores,
      subsetores_interesse: toArray(pick(r, "subsetores_interesse")),
      ufs_interesse: toArray(pick(r, "ufs_interesse", "ufs")).map((u) => u.toUpperCase()),
      municipios_interesse: toArray(pick(r, "municipios_interesse", "cidades")),
      sinergias_chave: toArray(pick(r, "sinergias_chave")),
      observacoes: pick(r, "observacoes") || null,
      status: pick(r, "status") || "ativo",
      qualification_status: "qualified",
      qualified_at: new Date().toISOString(),
      qualified_by: userId,
      qualification_source: "import",
      source: "import",
    });
  });

  const nameToId: Record<string, string> = {};
  if (dry || !valid.length) {
    result.inserted = valid.length;
    // Em dry-run, popular nameToId com UUIDs sintéticos para que o lookup de contacts valide.
    if (dry) {
      valid.forEach((b, i) => {
        nameToId[String(b.nome).toLowerCase()] = `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`;
      });
    }
    return { result, nameToId };
  }

  // Para conseguir mapear nome→id, fazemos upsert por nome (primeiro tenta UPDATE pelo nome existente,
  // se não existir, INSERT). Como buyers não tem UNIQUE em nome, vamos fazer manualmente:
  // 1) busca os existentes por nome
  const namesUnique = Array.from(new Set(namesInOrder.map((n) => n.toLowerCase())));
  const { data: existing } = await supabase
    .schema("equity_brain")
    .from("buyers")
    .select("id,nome")
    .in("nome", Array.from(new Set(namesInOrder)));
  const existingMap = new Map<string, string>();
  (existing || []).forEach((b: any) => existingMap.set(b.nome.toLowerCase(), b.id));

  // 2) separar updates dos inserts
  const toInsert: any[] = [];
  const toUpdate: any[] = [];
  valid.forEach((row) => {
    const existId = existingMap.get(row.nome.toLowerCase());
    if (existId) toUpdate.push({ ...row, id: existId });
    else toInsert.push(row);
  });

  // 3) inserir
  if (toInsert.length) {
    const { data, error } = await supabase
      .schema("equity_brain")
      .from("buyers")
      .insert(toInsert)
      .select("id,nome");
    if (error) { result.errors.push({ row: 0, msg: `insert buyers: ${error.message}` }); }
    else {
      result.inserted = data?.length || 0;
      (data || []).forEach((b: any) => { nameToId[b.nome.toLowerCase()] = b.id; });
    }
  }

  // 4) atualizar
  for (const row of toUpdate) {
    const { error } = await supabase
      .schema("equity_brain")
      .from("buyers")
      .update(row)
      .eq("id", row.id);
    if (error) result.errors.push({ row: 0, msg: `update buyer ${row.nome}: ${error.message}` });
    else { result.updated++; nameToId[row.nome.toLowerCase()] = row.id; }
  }

  result.ids = Object.values(nameToId);
  return { result, nameToId };
}

async function processMandates(
  supabase: any, rows: Record<string, any>[], dry: boolean, userId: string,
): Promise<{ result: EntityResult; cnpjToId: Record<string, string> }> {
  const result: EntityResult = { entity: "mandates", inserted: 0, updated: 0, skipped: 0, errors: [], warnings: [], ids: [] };
  const valid: any[] = [];
  const cnpjToId: Record<string, string> = {};

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let cnpj = normalizeCnpj(pick(r, "company_cnpj", "cnpj"));
    const valor = toNum(pick(r, "valor_pedido", "valor"));
    const razaoOrName = pick(r, "razao_social", "nome", "company_name", "empresa") || null;
    let needsEnrichment = false;

    // Aceita mandato sem CNPJ — gera placeholder estável a partir de razão social/contato
    if (!cnpj) {
      const seed = String(razaoOrName || pick(r, "contato_nome") || pick(r, "contato_telefone") || `row${i}`)
        .toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20).padEnd(20, "0");
      const tail = Array.from(seed).reduce((s, c) => s + c.charCodeAt(0).toString(), "").slice(0, 9).padEnd(9, "0");
      cnpj = "99999" + tail;
      needsEnrichment = true;
      result.warnings.push({ row: i + 2, field: "company_cnpj", msg: `CNPJ ausente — placeholder ${cnpj} criado (needs_enrichment=true). Enriqueça depois.` });
    }
    if (!valor) {
      result.warnings.push({ row: i + 2, field: "valor_pedido", msg: "valor_pedido vazio — mandato será criado mesmo assim" });
    }

    // Garante company stub
    if (!dry) {
      const ufRaw = pick(r, "uf");
      const ufClean = ufRaw ? String(ufRaw).split(/[|,;]/)[0].trim().toUpperCase().slice(0, 2) : null;
      await supabase.schema("equity_brain").from("companies").upsert({
        cnpj,
        razao_social: razaoOrName || `Empresa ${cnpj}`,
        uf: ufClean,
        municipio: pick(r, "municipio") || null,
        setor_ma: pick(r, "setor_ma", "setor") ? String(pick(r, "setor_ma", "setor")).split(",")[0].trim() : null,
        qualification_status: "qualified",
        qualified_by: userId,
        qualified_at: new Date().toISOString(),
        qualification_source: "import",
        source: "import",
        needs_cnpj_enrichment: needsEnrichment,
      }, { onConflict: "cnpj", ignoreDuplicates: true });
    }

    const ufRaw = pick(r, "uf");
    const ufClean = ufRaw ? String(ufRaw).split(/[|,;]/)[0].trim().toUpperCase().slice(0, 2) : null;
    const setorRaw = pick(r, "setor_ma", "setor");
    const setorPrincipal = setorRaw ? String(setorRaw).split(",")[0].trim() : null;
    const setoresExtras = setorRaw && String(setorRaw).includes(",")
      ? String(setorRaw).split(",").slice(1).map((s) => s.trim()).join(", ")
      : "";

    const observacoesBase = pick(r, "observacoes") || "";
    const obsExtras: string[] = [];
    if (setoresExtras) obsExtras.push(`Setores adicionais: ${setoresExtras}`);
    if (ufRaw && String(ufRaw).match(/[|,;]/)) obsExtras.push(`UFs adicionais: ${String(ufRaw)}`);

    valid.push({
      ...(pick(r, "id") ? { id: pick(r, "id") } : {}),
      company_cnpj: cnpj,
      status: mapEnum(pick(r, "status"), STATUS_MAP, "vigente"),
      exclusividade: toBool(pick(r, "exclusividade")),
      data_assinatura: toDate(pick(r, "data_assinatura")),
      data_vencimento: toDate(pick(r, "data_vencimento")),
      comissao_pct: toNum(pick(r, "comissao_pct", "commission_pct")),
      valor_pedido: valor,
      valor_operacao: toNum(pick(r, "valor_operacao")),
      faturamento_vispe: toNum(pick(r, "faturamento_vispe")),
      deal_type: mapEnum(pick(r, "deal_type"), DEAL_TYPE_MAP, "sellside"),
      pipeline_stage: mapEnum(pick(r, "pipeline_stage"), STAGE_MAP, "match"),
      outcome: pick(r, "outcome") || null,
      uf: ufClean,
      setor: setorPrincipal,
      contato_nome: pick(r, "contato_nome") || null,
      contato_telefone: pick(r, "contato_telefone") ? String(pick(r, "contato_telefone")) : null,
      contato_email: pick(r, "contato_email") || null,
      observacoes: [observacoesBase, ...obsExtras].filter(Boolean).join(" | ") || null,
      source: "import",
      needs_enrichment: needsEnrichment,
      created_by: userId,
    });
  }
  if (dry || !valid.length) {
    result.inserted = valid.length;
    if (dry) {
      valid.forEach((m, i) => {
        cnpjToId[m.company_cnpj] = `00000000-0000-0000-0000-${String(1000 + i).padStart(12, "0")}`;
      });
    }
    return { result, cnpjToId };
  }

  // Para mapear cnpj→id: distinguir mandates novos vs existentes via (company_cnpj, status='vigente')
  // — mas como podem existir múltiplos mandatos por empresa, usamos abordagem: insert direto e devolve id.
  const { data, error } = await supabase
    .schema("equity_brain")
    .from("mandates")
    .upsert(valid, { onConflict: "id", ignoreDuplicates: false })
    .select("id, company_cnpj");
  if (error) { result.errors.push({ row: 0, msg: error.message }); return { result, cnpjToId }; }
  result.inserted = data?.length || 0;
  (data || []).forEach((m: any) => { cnpjToId[m.company_cnpj] = m.id; });
  result.ids = (data || []).map((d: any) => d.id);
  return { result, cnpjToId };
}

// Normaliza nome para chave de lookup: lowercase, sem acento, sem pontuação leve, espaços colapsados.
const nkey = (s: any) => String(s ?? "")
  .toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[.,;:'"`´]/g, "")
  .replace(/\s+/g, " ")
  .trim();

// Variações úteis para lookup:
// "EBT (ENORMITY)" -> ["ebt (enormity)", "ebt", "enormity"]
// "CEUNET + 8G TELECOM + LIVE CONNECT" -> [..., "ceunet", "8g telecom", "live connect"]
function nameVariants(raw: string): string[] {
  const out = new Set<string>();
  const s = String(raw || "");
  if (!s.trim()) return [];
  out.add(nkey(s));
  const stripped = s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (stripped) out.add(nkey(stripped));
  for (const m of s.matchAll(/\(([^)]+)\)/g)) {
    const inside = m[1].trim();
    if (inside) out.add(nkey(inside));
  }
  const parts = s.split(/\s*[+,/]\s*| - /).map((p) => p.replace(/\([^)]*\)/g, "").trim()).filter(Boolean);
  if (parts.length > 1) parts.forEach((p) => out.add(nkey(p)));
  return Array.from(out).filter(Boolean);
}

async function processContacts(
  supabase: any,
  rows: Record<string, any>[],
  dry: boolean,
  userId: string,
  ctx: { buyerNameToId: Record<string, string>; mandateCnpjToId: Record<string, string> },
): Promise<EntityResult> {
  const result: EntityResult = { entity: "contacts", inserted: 0, updated: 0, skipped: 0, errors: [], warnings: [], ids: [] };

  // 1) Pré-carrega tudo do banco e indexa em memória.
  const { data: allBuyers } = await supabase.schema("equity_brain").from("buyers").select("id,nome").limit(50000);
  const buyerIdx: Record<string, string> = {};
  (allBuyers || []).forEach((b: any) => {
    nameVariants(b.nome).forEach((v) => { if (v && !buyerIdx[v]) buyerIdx[v] = b.id; });
  });
  Object.entries(ctx.buyerNameToId).forEach(([k, v]) => { if (!buyerIdx[k]) buyerIdx[k] = v; });

  // Mandates: indexa por cnpj e pelas variações da razão social/nome_fantasia da empresa.
  const { data: allMandates } = await supabase.schema("equity_brain").from("mandates")
    .select("id, company_cnpj").limit(50000);
  const mandateIdx: Record<string, string> = {};
  const mandateCnpjs: string[] = [];
  (allMandates || []).forEach((m: any) => {
    if (m.company_cnpj) { mandateIdx[`cnpj:${m.company_cnpj}`] = m.id; mandateCnpjs.push(m.company_cnpj); }
  });
  Object.entries(ctx.mandateCnpjToId).forEach(([cnpj, id]) => { mandateIdx[`cnpj:${cnpj}`] = id; mandateCnpjs.push(cnpj); });

  // Companies: por cnpj e por nome_fantasia/razão_social.
  const { data: allCompanies } = await supabase.schema("equity_brain").from("companies")
    .select("id, cnpj, razao_social, nome_fantasia").limit(50000);
  const companyIdx: Record<string, string> = {};
  const cnpjToCompany: Record<string, { razao_social: string|null; nome_fantasia: string|null }> = {};
  (allCompanies || []).forEach((c: any) => {
    if (c.cnpj) {
      companyIdx[`cnpj:${c.cnpj}`] = c.id;
      cnpjToCompany[c.cnpj] = { razao_social: c.razao_social, nome_fantasia: c.nome_fantasia };
    }
    [...nameVariants(c.razao_social || ""), ...nameVariants(c.nome_fantasia || "")].forEach((v) => {
      if (v && !companyIdx[`name:${v}`]) companyIdx[`name:${v}`] = c.id;
    });
  });
  // Cruza mandates × companies para indexar mandates por nome também.
  (allMandates || []).forEach((m: any) => {
    const c = m.company_cnpj ? cnpjToCompany[m.company_cnpj] : null;
    if (!c) return;
    [...nameVariants(c.razao_social || ""), ...nameVariants(c.nome_fantasia || "")].forEach((v) => {
      if (v && !mandateIdx[`name:${v}`]) mandateIdx[`name:${v}`] = m.id;
    });
  });

  // 2) Resolver linha-a-linha. Buyers que falharem viram stubs em batch.
  const buyersToStub: Record<string, { rowIdx: number; original: string }> = {};
  type Pending = {
    row: number; entity_type: "buyer"|"company"|"mandate"; entity_id: string|null;
    nome: string; email: string|null; phone: string|null; cargo: string|null;
    is_primary: boolean; pendingStubKey?: string;
  };
  const pending: Pending[] = [];

  rows.forEach((r, i) => {
    const et = normEntityType(pick(r, "entity_type"));
    const eidRaw = pick(r, "entity_id");
    const nome = pick(r, "nome", "name");
    const email = pick(r, "email");
    const phone = pick(r, "telefone", "phone");
    if (!et || !eidRaw) { result.errors.push({ row: i + 2, msg: "entity_type e entity_id obrigatórios" }); return; }
    if (!nome) { result.errors.push({ row: i + 2, field: "nome", msg: "Nome obrigatório" }); return; }
    if (!email && !phone) result.warnings.push({ row: i + 2, msg: "sem email/telefone — contato criado só com nome+cargo" });

    const eidStr = String(eidRaw).trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eidStr);
    let entity_id: string | null = null;
    let pendingStubKey: string | undefined;

    if (isUuid) {
      entity_id = eidStr;
    } else if (et === "buyer") {
      for (const v of nameVariants(eidStr)) { if (buyerIdx[v]) { entity_id = buyerIdx[v]; break; } }
      if (!entity_id) {
        const key = nkey(eidStr) || `stub-${i}`;
        pendingStubKey = key;
        if (!buyersToStub[key]) buyersToStub[key] = { rowIdx: i + 2, original: eidStr };
      }
    } else if (et === "company") {
      const c = normalizeCnpj(eidStr);
      if (c && companyIdx[`cnpj:${c}`]) entity_id = companyIdx[`cnpj:${c}`];
      else for (const v of nameVariants(eidStr)) { if (companyIdx[`name:${v}`]) { entity_id = companyIdx[`name:${v}`]; break; } }
    } else if (et === "mandate") {
      const c = normalizeCnpj(eidStr);
      if (c && mandateIdx[`cnpj:${c}`]) entity_id = mandateIdx[`cnpj:${c}`];
      else for (const v of nameVariants(eidStr)) { if (mandateIdx[`name:${v}`]) { entity_id = mandateIdx[`name:${v}`]; break; } }
    }

    if (!entity_id && !pendingStubKey) {
      result.errors.push({ row: i + 2, field: "entity_id", msg: `${et} '${eidStr}' não encontrado (busquei UUID, CNPJ, nome exato, alias entre parênteses e variações)` });
      return;
    }

    pending.push({
      row: i + 2,
      entity_type: et as any,
      entity_id,
      nome: String(nome),
      email: email || null,
      phone: phone ? String(phone) : null,
      cargo: pick(r, "cargo") || null,
      is_primary: toBool(pick(r, "is_primary")),
      pendingStubKey,
    });
  });

  // 3) Cria buyer-stubs em batch (real ou simulado em dry-run).
  const stubKeys = Object.keys(buyersToStub);
  const stubResolved: Record<string, string> = {};
  if (stubKeys.length) {
    if (dry) {
      stubKeys.forEach((k, i) => {
        stubResolved[k] = `00000000-0000-0000-0000-${String(900000 + i).padStart(12, "0")}`;
        result.warnings.push({
          row: buyersToStub[k].rowIdx, field: "entity_id",
          msg: `buyer '${buyersToStub[k].original}' não existia — será criado stub para revisão (qualification_status=pending)`,
        });
      });
    } else {
      const stubRows = stubKeys.map((k) => ({
        nome: buyersToStub[k].original,
        tipo: "estrategico",
        status: "ativo",
        qualification_status: "cold_prospect",
        qualification_source: "import_contact_stub",
        qualified_at: new Date().toISOString(),
        qualified_by: userId,
        source: "import_contact_stub",
        observacoes: `Stub criado automaticamente em ${new Date().toISOString().slice(0, 10)} via import de contatos. Buyer não existia. Revisar e completar dados (tese, ticket, setores, regiões).`,
      }));
      const { data: stubData, error: stubErr } = await supabase
        .schema("equity_brain").from("buyers").insert(stubRows).select("id, nome");
      if (stubErr) {
        result.errors.push({ row: 0, msg: `falha ao criar buyer-stubs: ${stubErr.message}` });
      } else {
        (stubData || []).forEach((b: any) => {
          const k = nkey(b.nome);
          stubResolved[k] = b.id;
          buyerIdx[k] = b.id;
        });
        stubKeys.forEach((k) => {
          if (stubResolved[k]) {
            result.warnings.push({
              row: buyersToStub[k].rowIdx, field: "entity_id",
              msg: `buyer '${buyersToStub[k].original}' não existia — stub criado (qualification_status=pending). Revisar em CRM › Buyers.`,
            });
          }
        });
      }
    }
  }

  // 4) Monta valid list resolvendo stubs pendentes.
  const valid: any[] = [];
  for (const p of pending) {
    let eid = p.entity_id;
    if (!eid && p.pendingStubKey) eid = stubResolved[p.pendingStubKey] || null;
    if (!eid) {
      result.errors.push({ row: p.row, field: "entity_id", msg: "stub não pôde ser resolvido" });
      continue;
    }
    valid.push({
      entity_type: p.entity_type,
      entity_id: eid,
      nome: p.nome,
      email: p.email,
      telefone_e164: p.phone,
      cargo: p.cargo,
      is_primary: p.is_primary,
      source: "import",
      created_by: userId,
    });
  }

  if (dry || !valid.length) { result.inserted = valid.length; return result; }
  const { data, error } = await supabase.schema("equity_brain").from("contacts").insert(valid).select("id");
  if (error) { result.errors.push({ row: 0, msg: error.message }); return result; }
  result.inserted = data?.length || 0;
  result.ids = (data || []).map((d: any) => d.id);
  return result;
}

async function processActivities(
  supabase: any,
  rows: Record<string, any>[],
  dry: boolean,
  userId: string,
  ctx: { buyerNameToId: Record<string, string>; mandateCnpjToId: Record<string, string> },
): Promise<EntityResult> {
  const result: EntityResult = { entity: "activities", inserted: 0, updated: 0, skipped: 0, errors: [], warnings: [], ids: [] };
  const valid: any[] = [];
  rows.forEach((r, i) => {
    const et = normEntityType(pick(r, "entity_type"));
    const eidRaw = pick(r, "entity_id");
    const kind = pick(r, "kind", "activity_type");
    if (!et || !eidRaw || !kind) { result.errors.push({ row: i + 2, msg: "entity_type, entity_id, kind obrigatórios" }); return; }
    const eidStr = String(eidRaw).trim();
    let entity_id: string | null = null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eidStr)) entity_id = eidStr;
    else if (et === "buyer") entity_id = ctx.buyerNameToId[eidStr.toLowerCase()] || null;
    else if (et === "mandate") {
      const c = normalizeCnpj(eidStr);
      entity_id = c ? (ctx.mandateCnpjToId[c] || null) : null;
    }
    if (!entity_id) { result.errors.push({ row: i + 2, field: "entity_id", msg: `${et} '${eidStr}' não encontrado` }); return; }

    valid.push({
      entity_type: et,
      entity_id,
      kind,
      direction: (pick(r, "direction") as string) || "out",
      body: pick(r, "body", "note", "notes") || null,
      created_by: userId,
      created_at: toDate(pick(r, "created_at")) || new Date().toISOString(),
    });
  });
  if (dry || !valid.length) { result.inserted = valid.length; return result; }
  const { data, error } = await supabase.schema("equity_brain").from("crm_activities").insert(valid).select("id");
  if (error) { result.errors.push({ row: 0, msg: error.message }); return result; }
  result.inserted = data?.length || 0;
  result.ids = (data || []).map((d: any) => d.id);
  return result;
}

async function triggerRecompute(supabase: any, results: EntityResult[]) {
  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const fns: Promise<any>[] = [];
  const has = (e: string) => results.find((r) => r.entity === e && r.inserted > 0);

  if (has("mandates") || has("buyers")) {
    fns.push(fetch(`${supaUrl}/functions/v1/match-batch`, {
      method: "POST", headers: { Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "bulk-import" }),
    }).catch(() => null));
  }
  if (has("companies")) {
    fns.push(fetch(`${supaUrl}/functions/v1/calculate-scores`, {
      method: "POST", headers: { Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "bulk-import" }),
    }).catch(() => null));
  }
  if (has("mandates")) {
    fns.push(fetch(`${supaUrl}/functions/v1/compute-mandate-active-proba`, {
      method: "POST", headers: { Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
    }).catch(() => null));
    fns.push(fetch(`${supaUrl}/functions/v1/compute-market-waves`, {
      method: "POST", headers: { Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
    }).catch(() => null));
  }
  await Promise.allSettled(fns);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Admin client (service role) — NO user Authorization header,
    // otherwise PostgREST honors the user JWT and falls back to RLS.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "advisor");
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden: admin or advisor required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let payload = (await req.json()) as ImportPayload & { bundle_url?: string };
    // Support fetching a large bundle from a URL to avoid inline payload limits
    if ((payload as any).bundle_url) {
      const r = await fetch((payload as any).bundle_url);
      if (!r.ok) return new Response(JSON.stringify({ error: `bundle_url fetch failed: ${r.status}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const fetched = await r.json();
      payload = { entity: "bundle", bundle: fetched, dry_run: payload.dry_run };
    }
    const dry = !!payload.dry_run;
    const userId = userData.user.id;

    const results: EntityResult[] = [];
    const ctx = { buyerNameToId: {} as Record<string, string>, mandateCnpjToId: {} as Record<string, string> };

    if (payload.entity === "bundle") {
      const b = payload.bundle || {};
      if (b.companies?.length) results.push(await processCompanies(supabase, b.companies, dry, userId));
      if (b.buyers?.length) {
        const { result, nameToId } = await processBuyers(supabase, b.buyers, dry, userId);
        results.push(result);
        Object.assign(ctx.buyerNameToId, nameToId);
      }
      if (b.mandates?.length) {
        const { result, cnpjToId } = await processMandates(supabase, b.mandates, dry, userId);
        results.push(result);
        Object.assign(ctx.mandateCnpjToId, cnpjToId);
      }
      if (b.contacts?.length) results.push(await processContacts(supabase, b.contacts, dry, userId, ctx));
      if (b.activities?.length) results.push(await processActivities(supabase, b.activities, dry, userId, ctx));
    } else {
      const rows = payload.rows || [];
      let r: EntityResult;
      switch (payload.entity) {
        case "companies": r = await processCompanies(supabase, rows, dry, userId); break;
        case "buyers": r = (await processBuyers(supabase, rows, dry, userId)).result; break;
        case "mandates": r = (await processMandates(supabase, rows, dry, userId)).result; break;
        case "contacts": r = await processContacts(supabase, rows, dry, userId, ctx); break;
        case "activities": r = await processActivities(supabase, rows, dry, userId, ctx); break;
        default: return new Response(JSON.stringify({ error: "invalid entity" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      results.push(r);
    }

    if (!dry) {
      await supabase.schema("equity_brain").from("deal_events").insert({
        event_type: "bulk_import",
        actor_id: userId,
        payload: { results },
      }).then(() => null, () => null);
      triggerRecompute(supabase, results).catch(() => null);
    }

    // Sumário consolidado
    const summary = {
      total_inserted: results.reduce((s, r) => s + r.inserted, 0),
      total_updated: results.reduce((s, r) => s + r.updated, 0),
      total_errors: results.reduce((s, r) => s + r.errors.length, 0),
      total_warnings: results.reduce((s, r) => s + r.warnings.length, 0),
    };

    return new Response(JSON.stringify({ dry_run: dry, summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("eb-import error", e);
    return new Response(JSON.stringify({ error: e?.message || "internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
