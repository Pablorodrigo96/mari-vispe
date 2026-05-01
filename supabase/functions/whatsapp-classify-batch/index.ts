// whatsapp-classify-batch
// Classifica sentimento e intenção de mensagens inbound recém recebidas.
// Roda manualmente (admin) ou via cron (Fase 4 — a cada ~30min).
// Usa Lovable AI Gateway (gemini-2.5-flash) — sem secret novo.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MsgRow {
  id: string;
  mandate_id: string | null;
  contact_id: string | null;
  advisor_id: string;
  phone_from: string;
  content_text: string | null;
  received_at: string;
}

async function classifyGroup(messages: MsgRow[]): Promise<
  { sentiment: string; intent: string; confidence: number; summary: string }
> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY not set");

  const transcript = messages
    .slice(-20)
    .map((m) =>
      `[${m.received_at}] ${m.phone_from}: ${m.content_text ?? "(media)"}`
    )
    .join("\n");

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content:
          "Você é um assistente que analisa conversas de WhatsApp entre um advisor de M&A e um dono de empresa. Responda SEMPRE em JSON válido, sem texto extra.",
      },
      {
        role: "user",
        content:
          `Classifique a conversa abaixo. Retorne JSON com:\n` +
          `{"sentiment":"positive|neutral|negative|urgent","intent":"interested|asking_info|negotiating|stalling|rejecting|closing|other","confidence":0.0-1.0,"summary":"resumo em até 240 caracteres"}\n\nConversa:\n${transcript}`,
      },
    ],
    response_format: { type: "json_object" },
  };

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`AI gateway ${r.status}: ${txt.slice(0, 200)}`);
  }
  const data = await r.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return {
    sentiment: ["positive", "neutral", "negative", "urgent"].includes(
        parsed.sentiment,
      )
      ? parsed.sentiment
      : "neutral",
    intent: typeof parsed.intent === "string" ? parsed.intent : "other",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
  };
}

serve(withObservability(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // AuthN: must be admin
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
  });
  const { data: claims } = await userClient.auth.getClaims(
    auth.replace("Bearer ", ""),
  );
  if (!claims?.claims?.sub) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const svc = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  const { data: roleRows } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", claims.claims.sub);
  const isAdmin = (roleRows ?? []).some((r: any) => r.role === "admin");
  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: "forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Pull recent unprocessed inbound messages
  const since = new Date(Date.now() - 35 * 60 * 1000).toISOString();
  const { data: msgs, error } = await svc
    .from("whatsapp_messages")
    .select(
      "id, advisor_id, mandate_id, contact_id, phone_from, content_text, received_at",
    )
    .eq("status", "received")
    .eq("direction", "inbound")
    .gte("received_at", since)
    .order("received_at", { ascending: true })
    .limit(200);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const groups = new Map<string, MsgRow[]>();
  for (const m of (msgs ?? []) as MsgRow[]) {
    const key = m.mandate_id ?? `c:${m.contact_id ?? "none"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  let processed = 0;
  let errors = 0;
  for (const [key, list] of groups) {
    try {
      const r = await classifyGroup(list);
      const ids = list.map((m) => m.id);
      await svc
        .from("whatsapp_messages")
        .update({
          status: "processed",
          sentiment: r.sentiment,
          intent: r.intent,
          processed_at: new Date().toISOString(),
        })
        .in("id", ids);
      processed += ids.length;
    } catch (err) {
      console.error(
        "[whatsapp-classify-batch] group=%s error=%s",
        key,
        (err as Error).message,
      );
      const ids = list.map((m) => m.id);
      await svc
        .from("whatsapp_messages")
        .update({
          status: "error",
          processing_error: (err as Error).message.slice(0, 500),
        })
        .in("id", ids);
      errors += ids.length;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      groups: groups.size,
      processed,
      errors,
      since,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}, { name: "whatsapp-classify-batch" }));
