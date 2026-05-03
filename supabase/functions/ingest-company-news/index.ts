// Equity Brain — ingest-company-news
// Coleta notícias sobre empresas-alvo via Perplexity (sonar) e armazena em equity_brain.company_news.
//
// POST /ingest-company-news
//   { scope?: 'mandates'|'top500'|'listings'|'buyers'|'all', limit?: number, dry_run?: boolean }
//
// Auth: admin OR service_role (chamado pelo cron).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";
const TRUSTED_DOMAINS = [
  "valor.globo.com", "neofeed.com.br", "brazilfunds.com",
  "infomoney.com.br", "exame.com", "estadao.com.br",
  "folha.uol.com.br", "money.globo.com", "pipelinevalor.globo.com",
  "capitalreset.com", "startse.com", "brazilianreport.com",
  "reuters.com", "bloomberg.com",
];

interface Target {
  kind: "company" | "buyer" | "listing";
  cnpj?: string;
  buyer_id?: string;
  listing_id?: string;
  name: string;
  context?: string;
}

async function sha1(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

async function searchPerplexity(apiKey: string, target: Target): Promise<any[]> {
  const queryName = target.name;
  const prompt = `Encontre as notícias mais recentes (últimos 6 meses) sobre a empresa brasileira "${queryName}"${target.context ? ` (${target.context})` : ""}. Foque em: M&A (fusões, aquisições, vendas), captação de recursos (equity, dívida, IPO), mudanças de liderança (CEO, sócios, sucessão), expansão (novos mercados, plantas, contratos relevantes), eventos regulatórios. Retorne URLs específicos das notícias com data, título e resumo de 2 linhas. Se não houver notícias relevantes, responda "NENHUMA".`;

  const body = {
    model: "sonar",
    messages: [
      { role: "system", content: "Você é um analista de M&A. Liste apenas notícias verificáveis com URL direta para a fonte original. Em formato: [DATA] [VEÍCULO] Título — resumo. URL: ..." },
      { role: "user", content: prompt },
    ],
    search_recency_filter: "month",
    search_domain_filter: TRUSTED_DOMAINS,
    max_tokens: 1500,
    temperature: 0.1,
  };

  const resp = await fetch(PERPLEXITY_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    console.error("Perplexity error", resp.status, await resp.text().catch(() => ""));
    return [];
  }

  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const citations: string[] = data?.citations ?? data?.search_results?.map((r: any) => r.url) ?? [];

  try {
    const { logApiUsage } = await import("../_shared/apiTrack.ts");
    await logApiUsage({
      provider: "perplexity", category: "llm", model: body.model,
      function_name: "ingest-company-news", feature: "company_news_ingestion",
      input_tokens: data?.usage?.prompt_tokens, output_tokens: data?.usage?.completion_tokens,
      total_tokens: data?.usage?.total_tokens, status: "success", http_status: 200,
    });
  } catch (e) { console.error("apiTrack:", e); }

  if (/NENHUMA/i.test(content)) return [];

  // Heurística: para cada URL citada, tenta achar o trecho do texto que a referencia.
  const items: any[] = [];
  const seen = new Set<string>();

  for (const url of citations) {
    if (!url || seen.has(url)) continue;
    seen.add(url);

    // Tenta extrair título: primeira linha do bloco que contém algo parecido com o domínio
    const dom = domainOf(url);
    const blocks = content.split(/\n\n+/);
    let title = "", summary = "", publishedAt: string | null = null;

    for (const blk of blocks) {
      if (blk.includes(url) || (dom && blk.toLowerCase().includes(dom.split(".")[0]))) {
        const lines = blk.split("\n").filter(Boolean);
        // Tenta data dd/mm/aaaa ou aaaa-mm-dd
        const dateMatch = blk.match(/(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const raw = dateMatch[0];
          if (raw.includes("/")) {
            const [d, m, y] = raw.split("/");
            publishedAt = `${y}-${m}-${d}T00:00:00Z`;
          } else {
            publishedAt = `${raw}T00:00:00Z`;
          }
        }
        title = lines[0]?.replace(/^\W+/, "").slice(0, 240) ?? "";
        summary = lines.slice(1).join(" ").slice(0, 800);
        break;
      }
    }

    if (!title) {
      title = `Notícia sobre ${queryName} (${dom})`;
      summary = content.slice(0, 600);
    }

    items.push({
      source_url: url,
      source_domain: dom,
      title,
      summary,
      published_at: publishedAt,
    });
  }

  return items;
}

async function buildTargets(supabase: any, scope: string, limit: number): Promise<Target[]> {
  const targets: Target[] = [];

  if (scope === "mandates" || scope === "all") {
    const { data } = await supabase
      .schema("equity_brain")
      .from("mandates")
      .select("company_cnpj, status")
      .eq("status", "active")
      .limit(limit);
    for (const m of data ?? []) {
      if (!m.company_cnpj) continue;
      const { data: c } = await supabase.schema("equity_brain").from("companies")
        .select("razao_social, nome_fantasia, setor_ma").eq("cnpj", m.company_cnpj).maybeSingle();
      targets.push({
        kind: "company",
        cnpj: m.company_cnpj,
        name: c?.nome_fantasia || c?.razao_social || m.company_cnpj,
        context: c?.setor_ma ?? undefined,
      });
    }
  }

  if (scope === "top500" || scope === "all") {
    const { data } = await supabase.schema("equity_brain")
      .from("companies_scored")
      .select("cnpj, razao_social, nome_fantasia, setor_ma, ma_score")
      .order("ma_score", { ascending: false })
      .limit(Math.min(limit, 500));
    for (const c of data ?? []) {
      targets.push({
        kind: "company", cnpj: c.cnpj,
        name: c.nome_fantasia || c.razao_social || c.cnpj,
        context: c.setor_ma ?? undefined,
      });
    }
  }

  if (scope === "listings" || scope === "all") {
    const { data } = await supabase.from("listings")
      .select("id, title, category, cnpj")
      .eq("status", "active").limit(limit);
    for (const l of data ?? []) {
      targets.push({
        kind: "listing", listing_id: l.id, cnpj: l.cnpj ?? undefined,
        name: l.title, context: l.category ?? undefined,
      });
    }
  }

  if (scope === "buyers" || scope === "all") {
    const { data } = await supabase.schema("equity_brain")
      .from("buyers").select("id, nome, vertical_principal, qualification_status")
      .eq("qualification_status", "qualified").limit(limit);
    for (const b of data ?? []) {
      targets.push({
        kind: "buyer", buyer_id: b.id, name: b.nome,
        context: b.vertical_principal ?? undefined,
      });
    }
  }

  // Deduplica por nome
  const seen = new Set<string>();
  return targets.filter((t) => {
    const k = `${t.kind}:${t.cnpj ?? t.buyer_id ?? t.listing_id ?? t.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

serve(withObservability(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const scope = body.scope ?? "mandates";
    const limit = Math.min(body.limit ?? 50, 500);
    const dryRun = !!body.dry_run;

    const targets = await buildTargets(supabase, scope, limit);
    console.log(`[ingest-company-news] scope=${scope} targets=${targets.length}`);

    let inserted = 0, duplicates = 0, errors = 0;
    const startedAt = new Date().toISOString();

    for (const t of targets) {
      try {
        const items = await searchPerplexity(PERPLEXITY_API_KEY, t);
        for (const it of items) {
          const dedupeBase = `${it.source_url}|${t.cnpj ?? t.buyer_id ?? t.listing_id ?? t.name}`;
          const dedupe = await sha1(dedupeBase);
          if (dryRun) { inserted++; continue; }

          const { error } = await supabase
            .schema("equity_brain")
            .from("company_news")
            .insert({
              cnpj: t.cnpj ?? null,
              buyer_id: t.buyer_id ?? null,
              listing_id: t.listing_id ?? null,
              source_url: it.source_url,
              source_domain: it.source_domain,
              title: it.title,
              summary: it.summary,
              published_at: it.published_at,
              status: "ingested",
              dedupe_hash: dedupe,
              scope_origin: scope,
            });
          if (error) {
            if (error.code === "23505") duplicates++;
            else { errors++; console.error("insert err", error.message); }
          } else inserted++;
        }
        // Pequeno delay para não estourar rate-limit
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors++;
        console.error("target err", t.name, e instanceof Error ? e.message : e);
      }
    }

    return new Response(JSON.stringify({
      ok: true, scope, targets: targets.length, inserted, duplicates, errors,
      started_at: startedAt, finished_at: new Date().toISOString(),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ingest-company-news fatal", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { name: "ingest-company-news" }));
