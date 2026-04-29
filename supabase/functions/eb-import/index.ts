// EB Import — bulk upsert para companies/mandates/buyers/contacts/activities
// Espelha as views de export (eb_mandates_enriched, eb_buyers_enriched, eb_crm_activities, eb_v_deal_metrics)
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
  ids: string[];
}

// ---------- helpers ----------
const onlyDigits = (s: any) => String(s ?? "").replace(/\D/g, "");
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
    // Excel serial
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString();
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T00:00:00Z`).toISOString();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// alias resolvers (pt-BR ↔ snake_case)
const pick = (row: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k];
    const lower = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (lower && row[lower] != null && row[lower] !== "") return row[lower];
  }
  return null;
};

// ---------- entity processors ----------
async function processCompanies(
  supabase: any, rows: Record<string, any>[], dry: boolean, userId: string,
): Promise<EntityResult> {
  const result: EntityResult = { entity: "companies", inserted: 0, updated: 0, skipped: 0, errors: [], ids: [] };
  const valid: any[] = [];
  rows.forEach((r, i) => {
    const cnpj = onlyDigits(pick(r, "cnpj"));
    const razao = pick(r, "razao_social", "razão_social", "nome");
    const uf = pick(r, "uf", "estado");
    if (!cnpj || cnpj.length !== 14) { result.errors.push({ row: i + 2, field: "cnpj", msg: "CNPJ inválido (14 dígitos)" }); return; }
    if (!razao) { result.errors.push({ row: i + 2, field: "razao_social", msg: "Razão social obrigatória" }); return; }
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
): Promise<EntityResult> {
  const result: EntityResult = { entity: "buyers", inserted: 0, updated: 0, skipped: 0, errors: [], ids: [] };
  const valid: any[] = [];
  rows.forEach((r, i) => {
    const nome = pick(r, "nome", "name", "buyer_name");
    if (!nome) { result.errors.push({ row: i + 2, field: "nome", msg: "Nome obrigatório" }); return; }
    valid.push({
      ...(pick(r, "id") ? { id: pick(r, "id") } : {}),
      nome: String(nome),
      tipo: pick(r, "tipo") || "estrategico",
      cnpj: pick(r, "cnpj") ? onlyDigits(pick(r, "cnpj")) : null,
      website: pick(r, "website") || null,
      ticket_min: toNum(pick(r, "ticket_min")),
      ticket_max: toNum(pick(r, "ticket_max")),
      porte_alvo: toArray(pick(r, "porte_alvo")),
      setores_interesse: toArray(pick(r, "setores_interesse", "setores")),
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
  if (dry || !valid.length) {
    result.inserted = valid.length;
    return result;
  }
  const { data, error } = await supabase
    .schema("equity_brain")
    .from("buyers")
    .upsert(valid, { onConflict: "id", ignoreDuplicates: false })
    .select("id");
  if (error) { result.errors.push({ row: 0, msg: error.message }); return result; }
  result.inserted = data?.length || 0;
  result.ids = (data || []).map((d: any) => d.id);
  return result;
}

async function processMandates(
  supabase: any, rows: Record<string, any>[], dry: boolean, userId: string,
): Promise<EntityResult> {
  const result: EntityResult = { entity: "mandates", inserted: 0, updated: 0, skipped: 0, errors: [], ids: [] };
  const valid: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cnpj = onlyDigits(pick(r, "company_cnpj", "cnpj"));
    const valor = toNum(pick(r, "valor_pedido", "valor"));
    if (!cnpj || cnpj.length !== 14) { result.errors.push({ row: i + 2, field: "company_cnpj", msg: "CNPJ inválido" }); continue; }
    if (!valor) { result.errors.push({ row: i + 2, field: "valor_pedido", msg: "Valor pedido obrigatório" }); continue; }

    // Garante company stub
    if (!dry) {
      await supabase.schema("equity_brain").from("companies").upsert({
        cnpj,
        razao_social: pick(r, "razao_social") || `Empresa ${cnpj}`,
        uf: pick(r, "uf") ? String(pick(r, "uf")).toUpperCase().slice(0, 2) : null,
        municipio: pick(r, "municipio") || null,
        setor_ma: pick(r, "setor_ma", "setor") || null,
        qualification_status: "qualified",
        qualified_by: userId,
        qualified_at: new Date().toISOString(),
        qualification_source: "import",
        source: "import",
      }, { onConflict: "cnpj", ignoreDuplicates: true });
    }

    valid.push({
      ...(pick(r, "id") ? { id: pick(r, "id") } : {}),
      company_cnpj: cnpj,
      status: pick(r, "status") || "ativo",
      exclusividade: pick(r, "exclusividade") === "sim" || pick(r, "exclusividade") === true,
      data_assinatura: toDate(pick(r, "data_assinatura")),
      data_vencimento: toDate(pick(r, "data_vencimento")),
      comissao_pct: toNum(pick(r, "comissao_pct", "commission_pct")),
      valor_pedido: valor,
      valor_operacao: toNum(pick(r, "valor_operacao")),
      faturamento_vispe: toNum(pick(r, "faturamento_vispe")),
      deal_type: pick(r, "deal_type") || "sell_side",
      pipeline_stage: pick(r, "pipeline_stage") || "originacao",
      outcome: pick(r, "outcome") || null,
      contato_nome: pick(r, "contato_nome") || null,
      contato_telefone: pick(r, "contato_telefone") || null,
      contato_email: pick(r, "contato_email") || null,
      observacoes: pick(r, "observacoes") || null,
      source: "import",
      created_by: userId,
    });
  }
  if (dry || !valid.length) {
    result.inserted = valid.length;
    return result;
  }
  const { data, error } = await supabase
    .schema("equity_brain")
    .from("mandates")
    .upsert(valid, { onConflict: "id", ignoreDuplicates: false })
    .select("id");
  if (error) { result.errors.push({ row: 0, msg: error.message }); return result; }
  result.inserted = data?.length || 0;
  result.ids = (data || []).map((d: any) => d.id);
  return result;
}

async function processContacts(
  supabase: any, rows: Record<string, any>[], dry: boolean,
): Promise<EntityResult> {
  const result: EntityResult = { entity: "contacts", inserted: 0, updated: 0, skipped: 0, errors: [], ids: [] };
  const valid: any[] = [];
  rows.forEach((r, i) => {
    const entity_type = pick(r, "entity_type");
    const entity_id = pick(r, "entity_id");
    const nome = pick(r, "nome", "name");
    const email = pick(r, "email");
    const phone = pick(r, "telefone", "phone");
    if (!entity_type || !entity_id) { result.errors.push({ row: i + 2, msg: "entity_type e entity_id obrigatórios" }); return; }
    if (!nome) { result.errors.push({ row: i + 2, field: "nome", msg: "Nome obrigatório" }); return; }
    if (!email && !phone) { result.errors.push({ row: i + 2, msg: "email ou telefone obrigatório" }); return; }
    valid.push({
      entity_type, entity_id,
      nome: String(nome),
      email: email || null,
      telefone: phone || null,
      cargo: pick(r, "cargo") || null,
      is_primary: pick(r, "is_primary") === "sim" || pick(r, "is_primary") === true,
    });
  });
  if (dry || !valid.length) { result.inserted = valid.length; return result; }
  const { data, error } = await supabase.schema("equity_brain").from("contacts").insert(valid).select("id");
  if (error) { result.errors.push({ row: 0, msg: error.message }); return result; }
  result.inserted = data?.length || 0;
  result.ids = (data || []).map((d: any) => d.id);
  return result;
}

async function processActivities(
  supabase: any, rows: Record<string, any>[], dry: boolean, userId: string,
): Promise<EntityResult> {
  const result: EntityResult = { entity: "activities", inserted: 0, updated: 0, skipped: 0, errors: [], ids: [] };
  const valid: any[] = [];
  rows.forEach((r, i) => {
    const entity_type = pick(r, "entity_type");
    const entity_id = pick(r, "entity_id");
    const kind = pick(r, "kind", "activity_type");
    if (!entity_type || !entity_id || !kind) { result.errors.push({ row: i + 2, msg: "entity_type, entity_id, kind obrigatórios" }); return; }
    valid.push({
      entity_type, entity_id, kind,
      note: pick(r, "note", "notes") || null,
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

// fire-and-forget recompute
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // role check (admin or advisor)
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "advisor");
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden: admin or advisor required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = (await req.json()) as ImportPayload;
    const dry = !!payload.dry_run;
    const userId = userData.user.id;

    const results: EntityResult[] = [];
    if (payload.entity === "bundle") {
      const b = payload.bundle || {};
      if (b.companies?.length) results.push(await processCompanies(supabase, b.companies, dry, userId));
      if (b.buyers?.length) results.push(await processBuyers(supabase, b.buyers, dry, userId));
      if (b.mandates?.length) results.push(await processMandates(supabase, b.mandates, dry, userId));
      if (b.contacts?.length) results.push(await processContacts(supabase, b.contacts, dry));
      if (b.activities?.length) results.push(await processActivities(supabase, b.activities, dry, userId));
    } else {
      const rows = payload.rows || [];
      let r: EntityResult;
      switch (payload.entity) {
        case "companies": r = await processCompanies(supabase, rows, dry, userId); break;
        case "buyers": r = await processBuyers(supabase, rows, dry, userId); break;
        case "mandates": r = await processMandates(supabase, rows, dry, userId); break;
        case "contacts": r = await processContacts(supabase, rows, dry); break;
        case "activities": r = await processActivities(supabase, rows, dry, userId); break;
        default: return new Response(JSON.stringify({ error: "invalid entity" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      results.push(r);
    }

    if (!dry) {
      // log
      await supabase.schema("equity_brain").from("deal_events").insert({
        event_type: "bulk_import",
        actor_id: userId,
        payload: { results },
      }).then(() => null, () => null);
      // fire-and-forget recompute
      triggerRecompute(supabase, results).catch(() => null);
    }

    return new Response(JSON.stringify({ dry_run: dry, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("eb-import error", e);
    return new Response(JSON.stringify({ error: e?.message || "internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
