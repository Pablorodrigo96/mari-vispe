// Equity Brain — extract-news-event
// Pega lote de company_news com status='ingested', classifica o tipo do evento e,
// para eventos M&A/funding/IPO, extrai dados estruturados via Perplexity sonar-pro.
//
// POST /extract-news-event { limit?: number }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { trackedAIFetch } from "../_shared/apiTrack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";

const EVENT_ENUM = [
  "ma_closed", "ma_announced", "funding_round", "ipo",
  "leadership_change", "expansion", "regulatory", "generic",
];
const STRUCTURED_TYPES = new Set(["ma_closed", "ma_announced", "funding_round", "ipo"]);

async function classify(lovableKey: string, title: string, summary: string): Promise<string> {
  const body = {
    model: "google/gemini-2.5-flash-lite",
    messages: [
      { role: "system", content: "Você classifica notícias corporativas brasileiras em um único tipo. Retorne APENAS o valor exato do enum, sem explicações." },
      { role: "user", content: `Tipos disponíveis: ${EVENT_ENUM.join(", ")}.\n\nTítulo: ${title}\nResumo: ${summary}\n\nQual o tipo? Responda apenas com o enum.` },
    ],
    max_tokens: 20,
    temperature: 0,
  };

  const resp = await trackedAIFetch(AI_GATEWAY, {
    method: "POST",
    headers: { "Authorization": `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, { function_name: "extract-news-event", feature: "classify", model: body.model });
  if (!resp.ok) {
    console.error("classify error", resp.status, await resp.text().catch(() => ""));
    return "generic";
  }
  const data = await resp.json();
  const raw = (data?.choices?.[0]?.message?.content ?? "").trim().toLowerCase().replace(/[^a-z_]/g, "");
  return EVENT_ENUM.includes(raw) ? raw : "generic";
}

async function extractStructured(perplexityKey: string, sourceUrl: string, title: string, summary: string): Promise<any> {
  const body = {
    model: "sonar-pro",
    messages: [
      { role: "system", content: "Você é um analista de M&A. Extraia dados estruturados verificáveis a partir da notícia indicada. Use null para campos sem informação confirmada — nunca invente." },
      { role: "user", content: `Notícia URL: ${sourceUrl}\nTítulo: ${title}\nResumo: ${summary}\n\nExtraia: comprador, vendedor (target), valor da transação em BRL, múltiplo EV/EBITDA, múltiplo EV/Receita, advisors financeiros, advisors legais, data do anúncio, setor.` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ma_event",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            comprador:   { type: ["string", "null"] },
            vendedor:    { type: ["string", "null"] },
            ev_brl:      { type: ["number", "null"] },
            ev_usd:      { type: ["number", "null"] },
            ebitda_multiple:  { type: ["number", "null"] },
            revenue_multiple: { type: ["number", "null"] },
            advisors_financeiros: { type: "array", items: { type: "string" } },
            advisors_legais:      { type: "array", items: { type: "string" } },
            announcement_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD" },
            setor: { type: ["string", "null"] },
            confidence: { type: "number", description: "0-1, sua confiança nos dados extraídos" },
          },
          required: ["comprador", "vendedor", "ev_brl", "ebitda_multiple", "advisors_financeiros", "advisors_legais", "confidence"],
        },
      },
    },
    max_tokens: 1000,
    temperature: 0,
  };

  const resp = await trackedAIFetch(PERPLEXITY_API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${perplexityKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, { function_name: "extract-news-event", feature: "news_event_extraction", model: body.model });
  if (!resp.ok) {
    console.error("extract err", resp.status, await resp.text().catch(() => ""));
    return null;
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  // Usage already logged by trackedAIFetch.

  try { return JSON.parse(content); } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit ?? 50, 200);

    const { data: rows, error } = await supabase
      .schema("equity_brain")
      .from("company_news")
      .select("*")
      .eq("status", "ingested")
      .order("ingested_at", { ascending: true })
      .limit(limit);
    if (error) throw error;

    let processed = 0, structured = 0, transactions = 0, alerts = 0, errors = 0;

    for (const row of rows ?? []) {
      try {
        const eventType = await classify(LOVABLE_API_KEY, row.title, row.summary ?? "");
        let eventData: any = {};
        if (STRUCTURED_TYPES.has(eventType)) {
          const ext = await extractStructured(PERPLEXITY_API_KEY, row.source_url, row.title, row.summary ?? "");
          if (ext) {
            eventData = ext;
            structured++;
            // Cria canonical_transaction se for ma_closed com valor
            if (eventType === "ma_closed" && ext.ev_brl && ext.confidence >= 0.6) {
              const { error: txErr } = await supabase
                .schema("equity_brain")
                .from("canonical_transactions")
                .insert({
                  buyer_name: ext.comprador,
                  target_name: ext.vendedor,
                  sector: ext.setor,
                  deal_date: ext.announcement_date,
                  ev_brl: ext.ev_brl,
                  ebitda_multiple: ext.ebitda_multiple,
                  revenue_multiple: ext.revenue_multiple,
                  source: `news:${row.source_domain}`,
                });
              if (!txErr) transactions++;
            }
          }
        }

        await supabase.schema("equity_brain").from("company_news").update({
          event_type: eventType,
          event_data: eventData,
          status: "extracted",
        }).eq("id", row.id);

        processed++;

        // Dispara alerta se for relevante e empresa tem mandato/buyer ativo
        if (STRUCTURED_TYPES.has(eventType) || eventType === "leadership_change") {
          const { error: alertErr } = await supabase.functions.invoke("news-to-crm-alert", {
            body: { news_id: row.id },
          });
          if (!alertErr) alerts++;
        }

        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        errors++;
        console.error("extract row err", row.id, e instanceof Error ? e.message : e);
        await supabase.schema("equity_brain").from("company_news")
          .update({ status: "failed" }).eq("id", row.id);
      }
    }

    return new Response(JSON.stringify({
      ok: true, processed, structured, transactions, alerts, errors,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
