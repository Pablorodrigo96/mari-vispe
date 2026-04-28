// Equity Brain v3 — compute-semantic-embeddings
// Etapa 2: gera embeddings semânticos (768d) para companies e buyers.
// Estratégia: tenta Lovable AI Gateway; se indisponível, cai para TF-IDF
// determinístico (hashing trick) sobre tokens normalizados. Mantém o mesmo
// shape vector(768) e métrica cosseno — match-company-v2 não precisa saber a origem.
// Idempotente: só recalcula se hash(texto) mudou. Admin only.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBEDDING_DIMS = 768;
const BATCH_SIZE = 25;

async function sha1(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-1", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// FNV-1a 32 bits — rápido, determinístico, suficiente p/ hashing trick
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  // normaliza, remove acento, lowercase, split por não-alfanum, descarta stopwords mínimas
  const stop = new Set([
    "de", "da", "do", "das", "dos", "e", "a", "o", "os", "as", "para", "por", "em", "no", "na",
    "nos", "nas", "com", "sem", "um", "uma", "uns", "umas", "que", "se", "ou", "ao", "aos",
  ]);
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !stop.has(t));
}

/**
 * Embedding determinístico via hashing trick + bigrams.
 * Cada token vira 2 hashes (sign +/-) em buckets de EMBEDDING_DIMS.
 * Resultado é L2-normalizado para cosine_distance ser estável.
 */
function deterministicEmbedding(text: string): number[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) return new Array(EMBEDDING_DIMS).fill(0);

  const vec = new Array(EMBEDDING_DIMS).fill(0);
  const bump = (tok: string, weight: number) => {
    const h1 = fnv1a(tok);
    const h2 = fnv1a("_" + tok);
    const bucket = h1 % EMBEDDING_DIMS;
    const sign = (h2 & 1) === 0 ? 1 : -1;
    vec[bucket] += sign * weight;
  };

  // unigrams (peso 1)
  for (const t of tokens) bump(t, 1);
  // bigrams (peso 0.6) — captura "varejo+alimentar", "saude+tech"
  for (let i = 0; i < tokens.length - 1; i++) {
    bump(`${tokens[i]}|${tokens[i + 1]}`, 0.6);
  }

  // L2 normalize
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

async function tryGatewayEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  const models = [
    "openai/text-embedding-3-small",
    "google/text-embedding-004",
  ];
  for (const model of models) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: text.slice(0, 4000) }),
      });
      if (!resp.ok) continue;
      const json = await resp.json();
      const vec = json?.data?.[0]?.embedding;
      if (!Array.isArray(vec) || vec.length === 0) continue;
      if (vec.length === EMBEDDING_DIMS) return vec as number[];
      if (vec.length > EMBEDDING_DIMS) return (vec as number[]).slice(0, EMBEDDING_DIMS);
      const padded = (vec as number[]).slice();
      while (padded.length < EMBEDDING_DIMS) padded.push(0);
      return padded;
    } catch { /* tenta próximo */ }
  }
  return null;
}

function buildCompanyText(c: any): string {
  return [
    c.razao_social, c.nome_fantasia, c.setor_ma, c.subsetor_ma,
    c.cnae_descricao, c.uf ? `UF: ${c.uf}` : null, c.porte ? `Porte: ${c.porte}` : null,
  ].filter(Boolean).join(" · ");
}

function buildBuyerText(b: any): string {
  return [
    b.nome, b.tipo, b.archetype_id,
    Array.isArray(b.setores_interesse) && b.setores_interesse.length ? `Setores: ${b.setores_interesse.join(", ")}` : null,
    Array.isArray(b.subsetores_interesse) && b.subsetores_interesse.length ? `Subsetores: ${b.subsetores_interesse.join(", ")}` : null,
    Array.isArray(b.sinergias_chave) && b.sinergias_chave.length ? `Sinergias: ${b.sinergias_chave.join(", ")}` : null,
    Array.isArray(b.ufs_interesse) && b.ufs_interesse.length ? `UFs: ${b.ufs_interesse.join(", ")}` : null,
    b.observacoes,
  ].filter(Boolean).join(" · ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    let isAuthorized = false;
    if (token === serviceKey) isAuthorized = true;
    else {
      const { data: claimsData } = await userClient.auth.getClaims(token);
      const userId = claimsData?.claims?.sub;
      if (claimsData?.claims?.role === "service_role") isAuthorized = true;
      else if (userId) {
        const { data: roleData } = await admin.from("user_roles")
          .select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
        if (roleData) isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const target: "companies" | "buyers" | "both" = body.target ?? "both";
    const force = Boolean(body.force ?? false);
    const limit = Math.min(Number(body.limit ?? 500), 1000);
    const mode: "auto" | "deterministic" | "gateway" = body.mode ?? "auto";

    const runStart = Date.now();
    const { data: runRow } = await admin.schema("equity_brain" as any)
      .from("engine_runs").insert({
        engine: "compute-semantic-embeddings",
        status: "running",
        triggered_by: "manual",
        metadata: { target, force, limit, mode },
      }).select("id").single();
    const runId = runRow?.id ?? null;

    const result = {
      companies: { processed: 0, embedded: 0, skipped: 0, failed: 0, by_method: { gateway: 0, deterministic: 0 } },
      buyers: { processed: 0, embedded: 0, skipped: 0, failed: 0, by_method: { gateway: 0, deterministic: 0 } },
    };

    let gatewayDisabled = mode === "deterministic";

    async function getEmbedding(text: string, stats: any): Promise<number[] | null> {
      if (!gatewayDisabled && apiKey && mode !== "deterministic") {
        const v = await tryGatewayEmbedding(text, apiKey);
        if (v) { stats.by_method.gateway++; return v; }
        // primeira falha → desliga gateway p/ resto do batch (evita 50 req inúteis)
        gatewayDisabled = true;
        console.log("[embeddings] gateway indisponível — usando fallback determinístico");
      }
      const v = deterministicEmbedding(text);
      stats.by_method.deterministic++;
      return v;
    }

    async function processTable(
      tableName: "companies" | "buyers",
      buildText: (r: any) => string,
      idCol: "cnpj" | "id",
    ) {
      const stats = result[tableName];
      const selectCols = tableName === "companies"
        ? "cnpj, razao_social, nome_fantasia, setor_ma, subsetor_ma, cnae_descricao, uf, porte, embedding_text_hash"
        : "id, nome, tipo, archetype_id, setores_interesse, subsetores_interesse, sinergias_chave, ufs_interesse, observacoes, embedding_text_hash";

      const { data: rows, error } = await admin.schema("equity_brain" as any)
        .from(tableName).select(selectCols).limit(limit);
      if (error) throw new Error(`${tableName} fetch: ${error.message}`);

      for (const row of rows ?? []) {
        stats.processed++;
        const text = buildText(row);
        if (!text || text.length < 8) { stats.skipped++; continue; }

        const hash = await sha1(text);
        if (!force && row.embedding_text_hash === hash) { stats.skipped++; continue; }

        const vec = await getEmbedding(text, stats);
        if (!vec) { stats.failed++; continue; }

        const vecStr = `[${vec.join(",")}]`;
        const updateKey: any = idCol === "cnpj" ? { cnpj: row.cnpj } : { id: row.id };
        const { error: updErr } = await admin.schema("equity_brain" as any)
          .from(tableName).update({
            embedding: vecStr,
            embedding_computed_at: new Date().toISOString(),
            embedding_text_hash: hash,
          } as any).match(updateKey);

        if (updErr) { console.error(`[${tableName}] update:`, updErr); stats.failed++; }
        else stats.embedded++;

        if (stats.embedded % BATCH_SIZE === 0 && !gatewayDisabled) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    }

    try {
      if (target === "companies" || target === "both") {
        await processTable("companies", buildCompanyText, "cnpj");
      }
      if (target === "buyers" || target === "both") {
        await processTable("buyers", buildBuyerText, "id");
      }

      const { count: companiesEmbedded } = await admin.schema("equity_brain" as any)
        .from("companies").select("*", { count: "exact", head: true }).not("embedding", "is", null);
      const { count: buyersEmbedded } = await admin.schema("equity_brain" as any)
        .from("buyers").select("*", { count: "exact", head: true }).not("embedding", "is", null);

      if (runId) {
        await admin.schema("equity_brain" as any).from("engine_runs").update({
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          rows_processed: result.companies.embedded + result.buyers.embedded,
          status: "success",
          metadata: { target, force, limit, mode, gateway_used: !gatewayDisabled, result },
        } as any).eq("id", runId);
      }

      return new Response(JSON.stringify({
        ok: true,
        method: gatewayDisabled ? "deterministic" : "gateway",
        result,
        totals: {
          companies_with_embedding: companiesEmbedded ?? 0,
          buyers_with_embedding: buyersEmbedded ?? 0,
        },
        run_id: runId,
        duration_ms: Date.now() - runStart,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (innerErr: any) {
      if (runId) {
        await admin.schema("equity_brain" as any).from("engine_runs").update({
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - runStart,
          status: "error",
          error_message: innerErr?.message ?? String(innerErr),
        }).eq("id", runId);
      }
      throw innerErr;
    }
  } catch (err: any) {
    console.error("compute-semantic-embeddings error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
