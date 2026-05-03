// Equity Brain — crawl-ma-sources
// Varre as principais fontes brasileiras de M&A em busca de deals do dia/semana,
// independente de termos a empresa cadastrada. Cruza por nome com equity_brain.companies.
//
// POST /crawl-ma-sources { lookback?: 'day'|'week' (default 'week') }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";
const SOURCES = [
  "valor.globo.com", "neofeed.com.br", "pipelinevalor.globo.com",
  "infomoney.com.br", "exame.com", "capitalreset.com", "brazilianreport.com",
];

async function sha1(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

async function searchDeals(apiKey: string, lookback: "day" | "week"): Promise<any[]> {
  const body = {
    model: "sonar",
    messages: [
      { role: "system", content: "Você lista deals de M&A brasileiros recentes. Sempre cite fonte com URL direto. Formato: [DATA] Comprador adquire/anuncia Vendedor — setor — valor (se disponível). URL: ..." },
      { role: "user", content: `Liste todas as fusões, aquisições e vendas de empresas brasileiras anunciadas ou fechadas ${lookback === "day" ? "nas últimas 24 horas" : "nos últimos 7 dias"}. Inclua valor da transação se conhecido. Mínimo 5 deals.` },
    ],
    search_recency_filter: lookback,
    search_domain_filter: SOURCES,
    max_tokens: 2000,
    temperature: 0.1,
  };

  const resp = await fetch(PERPLEXITY_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    console.error("crawl perplexity err", resp.status);
    return [];
  }
  const data = await resp.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const citations: string[] = data?.citations ?? data?.search_results?.map((r: any) => r.url) ?? [];

  try {
    const { logApiUsage } = await import("../_shared/apiTrack.ts");
    await logApiUsage({
      provider: "perplexity", category: "llm", model: body.model,
      function_name: "crawl-ma-sources", feature: "ma_news_search",
      input_tokens: data?.usage?.prompt_tokens, output_tokens: data?.usage?.completion_tokens,
      total_tokens: data?.usage?.total_tokens, status: "success", http_status: 200,
    });
  } catch (e) { console.error("apiTrack:", e); }

  const items: any[] = [];
  const seen = new Set<string>();
  for (const url of citations) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const dom = domainOf(url);
    const blocks = content.split(/\n\n+/);
    let title = "", summary = "";
    for (const blk of blocks) {
      if (blk.includes(url) || (dom && blk.toLowerCase().includes(dom.split(".")[0]))) {
        const lines = blk.split("\n").filter(Boolean);
        title = lines[0]?.replace(/^\W+/, "").slice(0, 240) ?? "";
        summary = lines.slice(1).join(" ").slice(0, 800);
        break;
      }
    }
    if (!title) { title = `Deal noticiado em ${dom}`; summary = content.slice(0, 600); }
    items.push({ source_url: url, source_domain: dom, title, summary });
  }
  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { lookback = "week" } = await req.json().catch(() => ({}));

    const items = await searchDeals(PERPLEXITY_API_KEY, lookback);
    let inserted = 0, duplicates = 0, matched = 0;

    for (const it of items) {
      // Tenta cruzar com companies por palavras do título (lookup grosseiro por LIKE)
      const tokens = it.title.split(/\s+/).filter((w: string) => w.length > 4 && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(w)).slice(0, 4);
      let matchedCnpj: string | null = null;
      for (const tok of tokens) {
        const { data } = await supabase.schema("equity_brain").from("companies")
          .select("cnpj").ilike("razao_social", `%${tok}%`).limit(1);
        if (data && data[0]) { matchedCnpj = data[0].cnpj; matched++; break; }
      }

      const dedupe = await sha1(`${it.source_url}|${matchedCnpj ?? "crawl"}`);
      const { error } = await supabase.schema("equity_brain").from("company_news").insert({
        cnpj: matchedCnpj,
        source_url: it.source_url,
        source_domain: it.source_domain,
        title: it.title,
        summary: it.summary,
        status: "ingested",
        dedupe_hash: dedupe,
        scope_origin: "crawl",
      });
      if (error) {
        if (error.code === "23505") duplicates++;
      } else inserted++;
    }

    return new Response(JSON.stringify({
      ok: true, lookback, items_found: items.length, inserted, duplicates, matched_to_companies: matched,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
