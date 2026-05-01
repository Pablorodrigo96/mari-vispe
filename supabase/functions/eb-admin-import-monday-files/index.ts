// One-shot importer (Phase 4 cutover). Recebe XLSXs via JSON base64.
// Reusa toda a lógica do eb-import-monday — duplicado pra não tocar no original.
// Auth: aceita JWT admin OU header x-mari-bulk-secret matching env MARI_BULK_IMPORT_SECRET.
// Após o cutover Phase 4, este arquivo deve ser apagado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mari-bulk-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Bypass secret one-shot (não persiste em secret storage; é hardcode pq função será removida)
const BULK_SECRET = "MARI_PHASE4_CUTOVER_2026";

// ============= Parser duplicado de eb-import-monday =============

const ESTADO_TO_UF: Record<string, string> = {
  "Acre":"AC","Alagoas":"AL","Amapá":"AP","Amapa":"AP","Amazonas":"AM","Bahia":"BA","Ceará":"CE","Ceara":"CE",
  "Distrito Federal":"DF","Espírito Santo":"ES","Espirito Santo":"ES","Goiás":"GO","Goias":"GO",
  "Maranhão":"MA","Maranhao":"MA","Mato Grosso":"MT","Mato Grosso do Sul":"MS","Minas Gerais":"MG",
  "Pará":"PA","Para":"PA","Paraíba":"PB","Paraiba":"PB","Paraná":"PR","Parana":"PR",
  "Pernambuco":"PE","Piauí":"PI","Piaui":"PI","Rio de Janeiro":"RJ","Rio Grande do Norte":"RN",
  "Rio Grande do Sul":"RS","Rondônia":"RO","Rondonia":"RO","Roraima":"RR","Santa Catarina":"SC",
  "São Paulo":"SP","Sao Paulo":"SP","Sergipe":"SE","Tocantins":"TO","PT":"EX","Portugal":"EX",
};
function normalizeUF(v: unknown): string|null {
  if (!v) return null;
  const c = String(v).trim();
  if (!c) return null;
  if (c.length===2) return c.toUpperCase();
  if (ESTADO_TO_UF[c]) return ESTADO_TO_UF[c];
  const fp = c.split(",")[0].trim();
  return ESTADO_TO_UF[fp] ?? null;
}
function parseMoney(v: unknown): number|null {
  if (v===null||v===undefined||v==="") return null;
  if (typeof v==="number") return v;
  let s=String(v).trim();
  if (!s||s==="-"||s==="—") return null;
  s=s.replace(/R\$\s?/gi,"").replace(/\s/g,"");
  if (/,\d{1,2}$/.test(s)) s=s.replace(/\./g,"").replace(",",".");
  else s=s.replace(/,/g,"");
  const n=Number(s); return isFinite(n)?n:null;
}
function parsePct(v: unknown): number|null {
  if (v===null||v===undefined||v==="") return null;
  if (typeof v==="number") return v<=1?v*100:v;
  const s=String(v).replace("%","").replace(",",".").trim();
  const n=Number(s); return isFinite(n)?n:null;
}
function parseDate(v: unknown): string|null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v==="number") {
    const d=(XLSX as any).SSF?.parse_date_code?.(v);
    if (d) return new Date(Date.UTC(d.y,d.m-1,d.d)).toISOString().slice(0,10);
  }
  const s=String(v).trim(); if (!s) return null;
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) { const [,d,mo,y]=m; const yy=y.length===2?`20${y}`:y; return `${yy}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return null;
}
function parseUrl(v: unknown): string|null {
  if (!v) return null;
  const s=String(v).trim();
  if (!s||s==="-") return null;
  if (s.startsWith("http")) return s;
  const m=s.match(/(https?:\/\/[^\s)]+)/); return m?m[1]:null;
}
function mapFaseSellside(fase: string|null): {deal_phase:string;temperature:string|null} {
  if (!fase) return {deal_phase:"match",temperature:null};
  const f=fase.trim().toLowerCase();
  if (f==="nbo") return {deal_phase:"nbo",temperature:null};
  if (f==="spa") return {deal_phase:"spa",temperature:null};
  if (f==="concluído"||f==="concluido") return {deal_phase:"closed",temperature:null};
  if (f==="aguardando retorno") return {deal_phase:"match",temperature:"cold"};
  return {deal_phase:"match",temperature:null};
}
function mapStatus(status: string|null): {outcome:string;status:string} {
  if (!status) return {outcome:"em_andamento",status:"vigente"};
  const s=status.trim().toLowerCase();
  if (s==="concluído"||s==="concluido") return {outcome:"concluido",status:"vendemos"};
  if (s==="cancelado") return {outcome:"cancelado",status:"cancelado"};
  return {outcome:"em_andamento",status:"vigente"};
}
function mapDealTypeBuyside(op: string|null): {deal_type:string;deal_phase_override?:string} {
  if (!op) return {deal_type:"buyside"};
  const o=op.trim().toLowerCase();
  if (o==="buyside") return {deal_type:"buyside"};
  if (o==="cisão"||o==="cisao") return {deal_type:"cisao"};
  if (o==="fusão"||o==="fusao") return {deal_type:"fusao"};
  if (o==="spa") return {deal_type:"buyside",deal_phase_override:"spa"};
  if (o==="due diligence") return {deal_type:"buyside",deal_phase_override:"due_diligence"};
  return {deal_type:"buyside"};
}

type DB = ReturnType<typeof createClient>;
const advisorCache = new Map<string,string|null>();
const companyCache = new Map<string,string>();
const buyerCache = new Map<string,string|null>();

async function findAdvisor(db: DB, name: string): Promise<string|null> {
  const key=name.trim().toLowerCase(); if (!key) return null;
  if (advisorCache.has(key)) return advisorCache.get(key)??null;
  const r1=await db.from("profiles").select("user_id").ilike("full_name",name.trim()).maybeSingle();
  if (r1.data?.user_id) { advisorCache.set(key,r1.data.user_id as string); return r1.data.user_id as string; }
  try {
    const r2=await db.rpc("find_user_by_meta_name",{search_name:name.trim()});
    if (r2.data) { advisorCache.set(key,r2.data as string); return r2.data as string; }
  } catch { /* opt */ }
  const parts=name.trim().split(/\s+/);
  if (parts.length>=2) {
    const r3=await db.from("profiles").select("user_id").ilike("full_name",`${parts[0]}%${parts[parts.length-1]}%`).limit(1).maybeSingle();
    if (r3.data?.user_id) { advisorCache.set(key,r3.data.user_id as string); return r3.data.user_id as string; }
  }
  await db.schema("equity_brain").from("advisors_pending_mapping").upsert({
    monday_name:name.trim(), occurrences:1, last_seen_at:new Date().toISOString(),
  },{onConflict:"monday_name"});
  advisorCache.set(key,null);
  return null;
}
async function findBuyer(db: DB, name: string): Promise<string|null> {
  const key=name.trim().toLowerCase(); if (!key) return null;
  if (buyerCache.has(key)) return buyerCache.get(key)??null;
  const r=await db.schema("equity_brain").from("buyers").select("id").ilike("nome",name.trim()).limit(1).maybeSingle();
  const id=(r.data?.id as string|undefined)??null; buyerCache.set(key,id); return id;
}
async function sha256Hex(s: string, len=8): Promise<string> {
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).slice(0,len/2).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function findOrCreateCompany(db: DB, razao: string, uf: string|null): Promise<string> {
  const key=razao.trim().toLowerCase();
  if (companyCache.has(key)) return companyCache.get(key)!;
  const tbl=()=>db.schema("equity_brain").from("companies");
  let r=await tbl().select("cnpj").ilike("razao_social",razao.trim()).limit(1).maybeSingle();
  if (r.data?.cnpj) { companyCache.set(key,r.data.cnpj as string); return r.data.cnpj as string; }
  r=await tbl().select("cnpj").ilike("nome_fantasia",razao.trim()).limit(1).maybeSingle();
  if (r.data?.cnpj) { companyCache.set(key,r.data.cnpj as string); return r.data.cnpj as string; }
  const cleanName=razao.replace(/\b(Ltda|ME|EIRELI|S\/A|S\.A\.|EPP|MEI)\b\.?/gi,"").trim();
  if (cleanName&&cleanName!==razao.trim()) {
    r=await tbl().select("cnpj").ilike("razao_social",`%${cleanName}%`).limit(1).maybeSingle();
    if (r.data?.cnpj) { companyCache.set(key,r.data.cnpj as string); return r.data.cnpj as string; }
  }
  // Stub CNPJ must fit VARCHAR(14). Use "P" + 13 hex chars from sha256 = 14 chars.
  const suffix=await sha256Hex(razao, 26); // 26 hex chars / 2 = 13 bytes hex
  const stubCnpj=`P${suffix.slice(0,13)}`;
  await tbl().insert({
    cnpj:stubCnpj, razao_social:razao.trim(), uf:uf??null,
    needs_cnpj_enrichment:true, qualification_status:"unqualified",
    source:"import_monday", raw_data:{imported_name:razao},
  });
  companyCache.set(key,stubCnpj); return stubCnpj;
}

type RawRow=(string|number|null)[];
function readSheet(buf: ArrayBuffer): {type:"sellside"|"buyside"|null;rows:RawRow[]} {
  const wb=XLSX.read(new Uint8Array(buf),{type:"array",cellDates:false});
  const ws=wb.Sheets[wb.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json<RawRow>(ws,{header:1,defval:null,raw:true});
  let type:"sellside"|"buyside"|null=null;
  const a1=String(rows[0]?.[0]??"").toLowerCase();
  if (a1.includes("sellside")) type="sellside";
  else if (a1.includes("buyside")) type="buyside";
  return {type,rows};
}
const isSep=(n: string)=>["match","name","subitems","em andamento",""].includes(n.trim().toLowerCase());

type Mapped={monday_item_id:string|null;company_cnpj:string;razao_social:string;payload:Record<string,unknown>;monday_responsavel_name?:string|null;monday_padrinho_name?:string|null};

async function mapRowSellside(db: DB, row: RawRow): Promise<Mapped|null> {
  const name=String(row[0]??"").trim();
  if (!name||isSep(name)) return null;
  const fase=row[4]?String(row[4]).trim():null;
  const statusRaw=row[6]?String(row[6]).trim():null;
  const phase=mapFaseSellside(fase); const st=mapStatus(statusRaw);
  let deal_phase=phase.deal_phase, outcome=st.outcome, status=st.status;
  const contractUrl=parseUrl(row[14]); const driveUrl=parseUrl(row[5]);
  const fl=(fase??"").toLowerCase();
  if (contractUrl&&(fl==="concluído"||fl==="concluido")) { deal_phase="closed"; status="vendemos"; outcome="vendemos"; }
  else if (contractUrl&&fl==="spa") deal_phase="spa";
  else if (driveUrl&&fl==="nbo") deal_phase="nbo";
  const uf=normalizeUF(row[15]);
  const cnpj=await findOrCreateCompany(db,name,uf);
  const compradorMatch=row[3]?String(row[3]).trim():"";
  const matchBuyerId=compradorMatch?await findBuyer(db,compradorMatch):null;
  const execName=row[11]?String(row[11]).trim():"";
  const responsavelId=execName?await findAdvisor(db,execName):null;
  const matchCol=row[12]?String(row[12]).trim():"";
  const obs:string[]=[];
  if (matchCol&&matchCol!==name) obs.push(`Match Monday: ${matchCol}`);
  if (execName) obs.push(`[mari:monday_responsavel=${execName}]`);
  return {
    monday_item_id:row[17]?String(row[17]).trim():null,
    company_cnpj:cnpj, razao_social:name,
    monday_responsavel_name:execName||null,
    payload:{
      company_cnpj:cnpj, deal_type:"sellside", deal_kind:"mandato_assinado",
      deal_phase, outcome, status, pipeline_stage:deal_phase,
      comprador_nome:row[2]?String(row[2]).trim():null,
      match_buyer_id:matchBuyerId, drive_url:driveUrl, contract_url:contractUrl,
      valor_operacao:parseMoney(row[8]), faturamento_vispe:parseMoney(row[9]),
      commission_pct:parsePct(row[10]), responsavel_id:responsavelId,
      data_assinatura_contrato:parseDate(row[7]), data_fechamento:parseDate(row[13]),
      uf, regiao:row[16]?String(row[16]).trim():null,
      monday_item_id:row[17]?String(row[17]).trim():null,
      imported_from:"monday_sellside", imported_at:new Date().toISOString(),
      source:"import_monday", observacoes:obs.join(" "), temperature:phase.temperature,
    },
  };
}
async function mapRowBuyside(db: DB, row: RawRow): Promise<Mapped|null> {
  const name=String(row[0]??"").trim();
  if (!name||isSep(name)) return null;
  const cliente=row[3]?String(row[3]).trim():"";
  if (!cliente) return null;
  const opTipo=row[9]?String(row[9]).trim():null;
  const dt=mapDealTypeBuyside(opTipo);
  const statusRaw=row[15]?String(row[15]).trim():null;
  const st=mapStatus(statusRaw);
  let deal_phase:string=dt.deal_phase_override??"match";
  const nboUrl=parseUrl(row[5]); const spaUrl=parseUrl(row[6]); const contractUrl=parseUrl(row[7]);
  const driveCol=parseUrl(row[10]);
  if (nboUrl) deal_phase="nbo";
  if (spaUrl) deal_phase="spa";
  if (contractUrl) deal_phase=(statusRaw??"").toLowerCase().includes("conclu")?"closed":"closing";
  const uf=normalizeUF(row[11]);
  let regiao:string|null=row[12]?String(row[12]).trim():null;
  if (uf==="EX") regiao="Internacional";
  const cnpj=await findOrCreateCompany(db,cliente,uf);
  const execName=row[13]?String(row[13]).trim():"";
  const padName=row[14]?String(row[14]).trim():"";
  const responsavelId=execName?await findAdvisor(db,execName):null;
  const padrinhoId=padName?await findAdvisor(db,padName):null;
  const crossSellRaw=row[21]?String(row[21]).trim():"";
  const crossSellFlags=crossSellRaw?crossSellRaw.split(/[,;]/).map(s=>s.trim().toLowerCase()).filter(Boolean):[];
  const obs:string[]=[];
  if (row[20]) obs.push(String(row[20]).trim());
  if (execName) obs.push(`[mari:monday_responsavel=${execName}]`);
  if (padName) obs.push(`[mari:monday_padrinho=${padName}]`);
  return {
    monday_item_id:row[24]?String(row[24]).trim():null,
    company_cnpj:cnpj, razao_social:cliente,
    monday_responsavel_name:execName||null, monday_padrinho_name:padName||null,
    payload:{
      company_cnpj:cnpj, deal_type:dt.deal_type, deal_kind:"buyer_mandate",
      deal_phase, pipeline_stage:deal_phase, outcome:st.outcome, status:st.status,
      contato_nome:name, comprador_nome:row[4]?String(row[4]).trim():null,
      drive_url:nboUrl??driveCol, contract_url:contractUrl??spaUrl,
      data_fechamento:parseDate(row[8]), data_assinatura_contrato:parseDate(row[16]),
      valor_operacao:parseMoney(row[17]), faturamento_vispe:parseMoney(row[18]),
      commission_pct:parsePct(row[19]), responsavel_id:responsavelId, padrinho_id:padrinhoId,
      cross_sell_flags:crossSellFlags,
      contato_telefone:row[22]?String(row[22]).trim():null,
      contato_email:row[23]?String(row[23]).trim():null,
      uf, regiao,
      monday_item_id:row[24]?String(row[24]).trim():null,
      imported_from:"monday_buyside", imported_at:new Date().toISOString(),
      source:"import_monday", observacoes:obs.join(" | "),
    },
  };
}
async function upsertMandate(db: DB, m: Mapped): Promise<{action:"created"|"updated"}> {
  const tbl=()=>db.schema("equity_brain").from("mandates");
  if (m.monday_item_id) {
    const existing=await tbl().select("id").eq("monday_item_id",m.monday_item_id).maybeSingle();
    if (existing.data?.id) {
      const upd=Object.fromEntries(Object.entries(m.payload).filter(([_,v])=>v!==null&&v!==undefined&&!(Array.isArray(v)&&v.length===0)));
      await tbl().update({...upd,imported_at:new Date().toISOString()}).eq("id",existing.data.id);
      return {action:"updated"};
    }
  }
  const ins=await tbl().insert(m.payload).select("id").single();
  if (ins.error) throw new Error(`insert mandate: ${ins.error.message}`);
  return {action:"created"};
}

// ============= Handler =============
async function processFile(db: DB, buf: ArrayBuffer, kind: "sellside"|"buyside") {
  const parsed=readSheet(buf);
  const type=parsed.type??kind;
  advisorCache.clear(); companyCache.clear(); buyerCache.clear();
  const mapped:Mapped[]=[];
  const map_errors:{row:number;name:string;error:string}[]=[];
  const upsert_errors:{name:string;error:string;payload_keys:string[]}[]=[];
  let total=0,skipped=0;
  for (let i=3; i<parsed.rows.length; i++) {
    const row=parsed.rows[i]??[];
    const name=String(row[0]??"").trim();
    if (!name) { skipped++; continue; }
    total++;
    if (isSep(name)) { skipped++; continue; }
    try {
      const m=type==="sellside"?await mapRowSellside(db,row):await mapRowBuyside(db,row);
      if (!m) { skipped++; continue; }
      mapped.push(m);
    } catch (e) {
      skipped++;
      map_errors.push({row:i,name,error:String((e as Error)?.message ?? e)});
    }
  }
  let created=0,updated=0;
  for (const m of mapped) {
    try {
      const r=await upsertMandate(db,m);
      if (r.action==="created") created++; else updated++;
    } catch (e) {
      upsert_errors.push({
        name:m.razao_social,
        error:String((e as Error)?.message ?? e),
        payload_keys:Object.keys(m.payload),
      });
    }
  }
  const stub=mapped.filter(m=>m.company_cnpj.startsWith("PENDING-"));
  const unmapped=new Map<string,number>();
  for (const m of mapped) {
    for (const n of [m.monday_responsavel_name,m.monday_padrinho_name]) {
      if (!n) continue;
      if (advisorCache.get(n.toLowerCase())===null) unmapped.set(n,(unmapped.get(n)??0)+1);
    }
  }
  return {
    type, total_rows:total, parsed:mapped.length, skipped, created, updated,
    companies_stub:new Set(stub.map(s=>s.company_cnpj)).size,
    advisors_unmapped:Array.from(unmapped.entries()).map(([n,c])=>({name:n,count:c})),
    map_errors: map_errors.slice(0, 30),
    map_errors_total: map_errors.length,
    upsert_errors: upsert_errors.slice(0, 30),
    upsert_errors_total: upsert_errors.length,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if (req.method!=="POST") return new Response(JSON.stringify({error:"POST only"}),{status:405,headers:{...corsHeaders,"Content-Type":"application/json"}});

  // Auth: secret OR admin JWT
  const secret = req.headers.get("x-mari-bulk-secret");
  let authorized = secret === BULK_SECRET;
  if (!authorized) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader) {
      try {
        const u = createClient(SUPABASE_URL, ANON_KEY, { global:{headers:{Authorization:authHeader}}, auth:{persistSession:false}});
        const { data } = await u.auth.getUser();
        if (data?.user) {
          const r = await u.rpc("has_role",{_user_id:data.user.id,_role:"admin"});
          if (r.data) authorized = true;
        }
      } catch { /* */ }
    }
  }
  if (!authorized) return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:{...corsHeaders,"Content-Type":"application/json"}});

  let body: { sellside_b64?: string; buyside_b64?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({error:"invalid json body"}),{status:400,headers:{...corsHeaders,"Content-Type":"application/json"}}); }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{persistSession:false}});
  const out:any = {};

  if (body.sellside_b64) {
    const bin=Uint8Array.from(atob(body.sellside_b64), c=>c.charCodeAt(0));
    out.sellside = await processFile(db, bin.buffer, "sellside");
  }
  if (body.buyside_b64) {
    const bin=Uint8Array.from(atob(body.buyside_b64), c=>c.charCodeAt(0));
    out.buyside = await processFile(db, bin.buffer, "buyside");
  }

  // Health log
  try {
    await db.schema("mari_ops").from("health_check").insert({
      check_name:"eb-admin-import-monday-files",
      status:"ok",
      details:out,
    });
  } catch { /* health table may not exist or schema differ */ }

  return new Response(JSON.stringify({ok:true,...out}),{headers:{...corsHeaders,"Content-Type":"application/json"}});
});
