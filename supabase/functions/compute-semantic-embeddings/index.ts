// Equity Brain v3 — compute-semantic-embeddings
// Etapa 2: gera embeddings semânticos (768d, google/text-embedding-004) para
// equity_brain.companies e equity_brain.buyers. Usado por match-company-v2 para
// computar feature `semantic_fit` = 1 - cosine_distance.
// Idempotente: só recalcula se o hash do texto-fonte mudou.
// Admin only.

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

async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  // Tenta múltiplos modelos de embedding (Lovable Gateway pode mudar disponibilidade)
  const models = [
    "openai/text-embedding-3-small",
    "google/text-embedding-004",
    "text-embedding-3-small",
  ];
  for (const model of models) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: text.slice(0, 4000) }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        if (resp.status === 400 && t.includes("invalid model")) continue; // tenta próximo
        console.error(`[embed] ${model} ${resp.status}: ${t.slice(0, 200)}`);
        continue;
      }
      const json = await resp.json();
      const vec = json?.data?.[0]?.embedding;
      if (Array.isArray(vec) && vec.length > 0) {
        // pgvector aceita qualquer dim — mas a coluna é vector(768). Se vier diferente, trunca/pad.
        if (vec.length === EMBEDDING_DIMS) return vec as number[];
        if (vec.length > EMBEDDING_DIMS) return (vec as number[]).slice(0, EMBEDDING_DIMS);
        const padded = vec.slice() as number[];
        while (padded.length < EMBEDDING_DIMS) padded.push(0);
        return padded;
      }
    } catch (e) {
      console.error(`[embed] ${model} crash:`, e);
    }
  }
  return null;
}

function buildCompanyText(c: any): string {
  const parts = [
    c.razao_social,
    c.nome_fantasia,
    c.setor_ma,
    c.subsetor_ma,
    c.cnae_descricao,
    c.uf ? `UF: ${c.uf}` : null,
    c.porte ? `Porte: ${c.porte}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function buildBuyerText(b: any): string {
  const parts = [
    b.nome,
    b.tipo,
    b.archetype_id,
    Array.isArray(b.setores_interesse) && b.setores_interesse.length ? `Setores: ${b.setores_interesse.join(", ")}` : null,
    Array.isArray(b.subsetores_interesse) && b.subsetores_interesse.length ? `Subsetores: ${b.subsetores_interesse.join(", ")}` : null,
    Array.isArray(b.sinergias_chave) && b.sinergias_chave.length ? `Sinergias: ${b.sinergias_chave.join(", ")}` : null,
    Array.isArray(b.ufs_interesse) && b.ufs_interesse.length ? `UFs: ${b.ufs_interesse.join(", ")}` : null,
    b.observacoes,
  ].filter(Boolean);
  return parts.join(" · ");
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
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    let isAuthorized = false;
    if (token === serviceKey) {
      isAuthorized = true;
    } else {
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
    const limit = Math.min(Number(body.limit ?? 200), 500);

    const runStart = Date.now();
    const { data: runRow } = await admin.schema("equity_brain" as any)
      .from("engine_runs").insert({
        engine: "compute-semantic-embeddings",
        status: "running",
        triggered_by: "manual",
        metadata: { target, force, limit },
      }).select("id").single();
    const runId = runRow?.id ?? null;

    const result = {
      companies: { processed: 0, embedded: 0, skipped: 0, failed: 0 },
      buyers: { processed: 0, embedded: 0, skipped: 0, failed: 0 },
    };

    async function processTable(tableName: "companies" | "buyers", buildText: (r: any) => string, idCol: string) {
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

        const vec = await generateEmbedding(text, apiKey);
        if (!vec) { stats.failed++; continue; }

        const vecStr = `[${vec.join(",")}]`;
        const updateKey = idCol === "cnpj" ? { cnpj: row.cnpj } : { id: row.id };
        const { error: updErr } = await admin.schema("equity_brain" as any)
          .from(tableName)
          .update({
            embedding: vecStr,
            embedding_computed_at: new Date().toISOString(),
            embedding_text_hash: hash,
          } as any)
          .match(updateKey);

        if (updErr) {
          console.error(`[${tableName}] update error:`, updErr);
          stats.failed++;
        } else {
          stats.embedded++;
        }

        // Pequeno throttle para não saturar gateway
        if (stats.embedded % BATCH_SIZE === 0) {
          await new Promise((r) => setTimeout(r, 200));
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

      // Counts atuais
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
        }).eq("id", runId);
      }

      return new Response(JSON.stringify({
        ok: true,
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
