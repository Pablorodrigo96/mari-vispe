// Equity Brain — news-to-crm-alert
// Recebe um company_news.id já processado e cria alertas no CRM:
//  - crm_activities (kind='note')
//  - notifications (admin/advisor responsável)
//  - company_signals (sinal news_ma_signal/news_funding/news_leadership)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNAL_MAP: Record<string, string> = {
  ma_closed: "news_ma_signal",
  ma_announced: "news_ma_signal",
  funding_round: "news_funding",
  ipo: "news_funding",
  leadership_change: "news_leadership",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { news_id } = await req.json();
    if (!news_id) throw new Error("news_id required");

    const { data: news, error } = await supabase
      .schema("equity_brain").from("company_news")
      .select("*").eq("id", news_id).maybeSingle();
    if (error || !news) throw new Error("news not found");
    if (news.alert_sent) {
      return new Response(JSON.stringify({ ok: true, skipped: "already alerted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let advisorIds: string[] = [];
    let mandateId: string | null = null;
    let entityKind: "company" | "buyer" | "listing" | null = null;
    let entityId: string | null = null;

    // Procura mandato ativo p/ a empresa (cnpj)
    if (news.cnpj) {
      const { data: m } = await supabase.schema("equity_brain").from("mandates")
        .select("id, responsavel_id").eq("company_cnpj", news.cnpj)
        .eq("status", "active").maybeSingle();
      if (m) {
        mandateId = m.id;
        entityKind = "company";
        entityId = m.id; // usado em crm_activities.entity_id
        if (m.responsavel_id) advisorIds.push(m.responsavel_id);
      }
    }

    // Buyer ativo
    if (!entityKind && news.buyer_id) {
      const { data: b } = await supabase.schema("equity_brain").from("buyers")
        .select("id, responsavel_id").eq("id", news.buyer_id).maybeSingle();
      if (b) {
        entityKind = "buyer"; entityId = b.id;
        if (b.responsavel_id) advisorIds.push(b.responsavel_id);
      }
    }

    // Fallback: notifica todos os admins
    if (advisorIds.length === 0) {
      const { data: admins } = await supabase.from("user_roles")
        .select("user_id").eq("role", "admin").limit(10);
      advisorIds = (admins ?? []).map((r: any) => r.user_id);
    }

    // 1. crm_activity
    if (entityKind && entityId) {
      await supabase.schema("equity_brain").from("crm_activities").insert({
        entity_type: entityKind,
        entity_id: entityId,
        kind: "note",
        direction: "internal",
        body: `📰 Notícia detectada (${news.event_type}): ${news.title}\n\nFonte: ${news.source_domain}\n${news.source_url}\n\n${news.summary ?? ""}`,
        metadata: { news_id: news.id, event_type: news.event_type, event_data: news.event_data },
      });
    }

    // 2. notifications p/ advisors
    for (const uid of advisorIds) {
      await supabase.from("notifications").insert({
        user_id: uid,
        type: "news_alert",
        title: `📰 ${news.event_type === "ma_closed" ? "M&A FECHADO" : news.event_type === "ma_announced" ? "M&A anunciado" : news.event_type === "funding_round" ? "Captação detectada" : news.event_type === "ipo" ? "IPO" : "Mudança de liderança"}: ${news.title.slice(0, 80)}`,
        content: `${news.summary?.slice(0, 200) ?? ""}\n\nFonte: ${news.source_domain}`,
      });
    }

    // 3. company_signal (apenas se cnpj conhecido)
    const signalKey = SIGNAL_MAP[news.event_type];
    if (signalKey && news.cnpj) {
      await supabase.schema("equity_brain").from("company_signals").upsert({
        cnpj: news.cnpj,
        signal_key: signalKey,
        signal_value: 1,
        signal_text: `${news.event_type}: ${news.title.slice(0, 200)}`,
        weight: 1,
        source: `news:${news.source_domain}`,
        confidence: news.event_data?.confidence ?? 0.7,
        expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
        evidence_strength: "strong",
        evidence_ts: news.published_at ?? news.ingested_at,
      }, { onConflict: "cnpj,signal_key" });
    }

    await supabase.schema("equity_brain").from("company_news")
      .update({ alert_sent: true }).eq("id", news.id);

    return new Response(JSON.stringify({
      ok: true, advisors_notified: advisorIds.length, mandate_id: mandateId,
      signal_inserted: !!(signalKey && news.cnpj),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("news-to-crm-alert err", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
