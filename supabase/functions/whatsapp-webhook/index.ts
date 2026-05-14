// whatsapp-webhook
// Recebe eventos da Meta WhatsApp Cloud API.
//   GET  → validação de webhook (hub.challenge), por advisor_id na query.
//   POST → ingere mensagens (messages[]) e atualiza statuses[].
// Modo MOCK: sem META_APP_SECRET, pula validação de assinatura mas loga aviso.
// Modo REAL: valida X-Hub-Signature-256 (HMAC-SHA256 sobre body cru).
// Sempre devolve 200 OK em ≤2s pra não disparar retentativas da Meta.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { withObservability } from "../_shared/observability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

const onlyDigits = (s: string) => (s ?? "").replace(/\D/g, "");

async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expectedHex = signatureHeader.slice("sha256=".length);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const actualHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // timing-safe compare
  if (actualHex.length !== expectedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHex.length; i++) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return diff === 0;
}

interface ParsedMsg {
  meta_message_id: string;
  meta_message_timestamp: string | null;
  message_type: string;
  content_text: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_caption: string | null;
  from: string;
}

function parseMessage(msg: any): ParsedMsg {
  const type = msg?.type ?? "unknown";
  let content_text: string | null = null;
  let media_url: string | null = null;
  let media_mime_type: string | null = null;
  let media_caption: string | null = null;

  switch (type) {
    case "text":
      content_text = msg?.text?.body ?? null;
      break;
    case "image":
    case "audio":
    case "video":
    case "document":
    case "sticker":
      media_url = msg?.[type]?.id ?? null; // Meta retorna media id; download é etapa separada
      media_mime_type = msg?.[type]?.mime_type ?? null;
      media_caption = msg?.[type]?.caption ?? null;
      content_text = media_caption;
      break;
    case "interactive":
      content_text = JSON.stringify(msg?.interactive ?? {}).slice(0, 1000);
      break;
    case "reaction":
      content_text = msg?.reaction?.emoji ?? null;
      break;
    default:
      content_text = JSON.stringify(msg).slice(0, 500);
  }

  return {
    meta_message_id: msg?.id ?? crypto.randomUUID(),
    meta_message_timestamp: msg?.timestamp
      ? new Date(Number(msg.timestamp) * 1000).toISOString()
      : null,
    message_type: [
      "text",
      "image",
      "audio",
      "video",
      "document",
      "sticker",
      "location",
      "interactive",
      "reaction",
    ].includes(type)
      ? type
      : "unknown",
    content_text,
    media_url,
    media_mime_type,
    media_caption,
    from: msg?.from ?? "",
  };
}

serve(withObservability(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const svc = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const reqUrl = new URL(req.url);
  const advisor_id_qs = reqUrl.searchParams.get("advisor_id");

  /* -------- GET: webhook verification -------- */
  if (req.method === "GET") {
    const mode = reqUrl.searchParams.get("hub.mode");
    const token = reqUrl.searchParams.get("hub.verify_token");
    const challenge = reqUrl.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !token || !advisor_id_qs) {
      return new Response("bad request", { status: 400 });
    }

    const { data: cfg } = await svc
      .from("advisor_whatsapp_config")
      .select("verify_token")
      .eq("advisor_id", advisor_id_qs)
      .maybeSingle();

    if (!cfg || cfg.verify_token !== token) {
      return new Response("forbidden", { status: 403 });
    }
    return new Response(challenge ?? "", { status: 200 });
  }

  /* -------- POST: incoming events -------- */
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // Signature validation — required in production
  const appSecret = Deno.env.get("META_APP_SECRET");
  const allowMock = Deno.env.get("WA_ALLOW_MOCK") === "1";
  if (appSecret) {
    const ok = await verifyMetaSignature(
      rawBody,
      req.headers.get("x-hub-signature-256"),
      appSecret,
    );
    if (!ok) {
      console.warn("[whatsapp-webhook] invalid signature");
      return new Response("invalid signature", { status: 403 });
    }
  } else if (!allowMock) {
    console.error(
      "[whatsapp-webhook] META_APP_SECRET not set — rejecting (set WA_ALLOW_MOCK=1 to allow mock mode)",
    );
    return new Response("misconfigured", { status: 403 });
  } else {
    console.warn(
      "[whatsapp-webhook] MOCK mode active (WA_ALLOW_MOCK=1) — signature NOT validated",
    );
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[whatsapp-webhook] invalid JSON");
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  try {
    // Extract phone_number_id from payload (best-effort)
    const phoneNumberId =
      payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ??
        null;

    // Resolve advisor: prefer query string, fallback to phone_number_id lookup
    let cfg: any = null;
    if (advisor_id_qs) {
      const r = await svc
        .from("advisor_whatsapp_config")
        .select(
          "id, advisor_id, phone_number, phone_number_id, total_messages_captured",
        )
        .eq("advisor_id", advisor_id_qs)
        .maybeSingle();
      cfg = r.data;
    }
    if (!cfg && phoneNumberId) {
      const r = await svc
        .from("advisor_whatsapp_config")
        .select(
          "id, advisor_id, phone_number, phone_number_id, total_messages_captured",
        )
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();
      cfg = r.data;
    }

    if (!cfg) {
      console.warn(
        "[whatsapp-webhook] no advisor config matched (qs=%s phone_id=%s)",
        advisor_id_qs,
        phoneNumberId,
      );
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    let inserted = 0;
    let statusUpdates = 0;

    for (const entry of payload?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};
        const metadataPhone = value?.metadata?.display_phone_number ??
          cfg.phone_number;

        // ---- inbound + outbound messages ----
        for (const msg of value?.messages ?? []) {
          const parsed = parseMessage(msg);
          // Direction: outbound when "from" matches advisor's number
          const fromDigits = onlyDigits(parsed.from);
          const advisorDigits = onlyDigits(cfg.phone_number ?? "");
          const direction = fromDigits === advisorDigits && advisorDigits
            ? "outbound"
            : "inbound";

          // Resolve contact (and possibly mandate) by counterpart phone
          const counterpart = direction === "inbound"
            ? fromDigits
            : onlyDigits(value?.contacts?.[0]?.wa_id ?? "");

          let contact_id: string | null = null;
          let mandate_id: string | null = null;
          if (counterpart) {
            const { data: ctRows } = await svc
              .schema("equity_brain" as any)
              .from("contacts")
              .select("id, entity_type, entity_id, telefone_e164")
              .limit(50);
            // We can't run regex_replace from PostgREST easily; do match in JS.
            // Cheaper: pull at most 200 contacts with a similar suffix via ILIKE.
            // (For mock/scale we keep this simple; production: dedicated index/function.)
            if (ctRows) {
              const match = ctRows.find((c: any) =>
                onlyDigits(c.telefone_e164 ?? "").endsWith(
                  counterpart.slice(-10),
                )
              );
              if (match) {
                contact_id = match.id;
                if (match.entity_type === "mandate") mandate_id = match.entity_id;
              }
            }
          }

          const insertRow = {
            advisor_id: cfg.advisor_id,
            contact_id,
            mandate_id,
            direction,
            phone_from: parsed.from,
            phone_to: direction === "inbound"
              ? (cfg.phone_number ?? metadataPhone ?? "")
              : counterpart,
            message_type: parsed.message_type,
            content_text: parsed.content_text,
            media_url: parsed.media_url,
            media_mime_type: parsed.media_mime_type,
            media_caption: parsed.media_caption,
            meta_message_id: parsed.meta_message_id,
            meta_message_timestamp: parsed.meta_message_timestamp,
            status: "received",
            raw_payload: msg,
            received_at: parsed.meta_message_timestamp ??
              new Date().toISOString(),
          };

          const { error } = await svc
            .from("whatsapp_messages")
            .upsert(insertRow, {
              onConflict: "meta_message_id",
              ignoreDuplicates: true,
            });
          if (error) {
            console.error(
              "[whatsapp-webhook] insert error:",
              error.message,
            );
          } else {
            inserted++;
          }
        }

        // ---- delivery statuses ----
        for (const st of value?.statuses ?? []) {
          if (!st?.id || !st?.status) continue;
          const statusMap: Record<string, string> = {
            sent: "sent",
            delivered: "delivered",
            read: "read",
            failed: "failed",
          };
          const newStatus = statusMap[st.status] ?? null;
          if (!newStatus) continue;
          const { error } = await svc
            .from("whatsapp_messages")
            .update({ status: newStatus })
            .eq("meta_message_id", st.id);
          if (!error) statusUpdates++;
        }
      }
    }

    if (inserted > 0) {
      await svc
        .from("advisor_whatsapp_config")
        .update({
          last_message_received_at: new Date().toISOString(),
          total_messages_captured: (cfg.total_messages_captured ?? 0) +
            inserted,
        })
        .eq("id", cfg.id);
    }

    console.log(
      "[whatsapp-webhook] advisor=%s inserted=%d status_updates=%d",
      cfg.advisor_id,
      inserted,
      statusUpdates,
    );

    return new Response(
      JSON.stringify({ ok: true, inserted, status_updates: statusUpdates }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[whatsapp-webhook] unexpected error:", err);
    // Return 200 anyway → Meta won't retry this payload
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
}, { name: "whatsapp-webhook" }));
