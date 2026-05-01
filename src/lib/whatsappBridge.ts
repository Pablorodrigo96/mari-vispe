// WhatsApp Bridge — registra outreach no CRM ao abrir conversa pelo wa.me.
// Usado em todos os botões "Falar no WhatsApp" do MARI EB para garantir tracking
// automático sem o advisor precisar lançar atividade manualmente.

import { supabase } from "@/integrations/supabase/client";
import { getWhatsAppLink, normalizeBrPhone } from "@/lib/whatsapp";

export interface BridgeOpenArgs {
  phone: string | null | undefined;
  message?: string;
  /** Entidade ligada à atividade (mandate / buyer / company) — para o log no CRM. */
  entityType?: "mandate" | "buyer" | "company" | null;
  entityId?: string | null;
  contactId?: string | null;
  /** Se já gerado por IA, marcar como ai_drafted=true no metadata. */
  aiDrafted?: boolean;
  /** Origem da chamada (today_card, mandate_detail, ...) — vai pro metadata. */
  source?: string;
}

/**
 * Abre o WhatsApp em nova aba e dispara o log da atividade.
 * - Nunca redireciona a aba atual.
 * - Se popup bloqueado, copia o link no clipboard e retorna `false`.
 * - O log é "fire-and-forget": não trava o open.
 */
export async function openWhatsAppForContact(args: BridgeOpenArgs): Promise<boolean> {
  const phone = normalizeBrPhone(args.phone ?? "");
  if (!phone) {
    console.warn("[whatsapp-bridge] sem telefone válido", args);
    return false;
  }

  const url = getWhatsAppLink(args.message, phone);

  // 1. Abrir
  let opened = false;
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    opened = !!w;
  } catch {
    opened = false;
  }
  if (!opened) {
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
  }

  // 2. Log assíncrono
  try {
    await supabase.rpc("eb_log_whatsapp_send", {
      p_entity_type: args.entityType ?? null,
      p_entity_id: args.entityId ?? null,
      p_contact_id: args.contactId ?? null,
      p_phone: phone,
      p_message: args.message ?? null,
      p_metadata: {
        ai_drafted: !!args.aiDrafted,
        source: args.source ?? "unknown",
        opened,
      },
    });
  } catch (err) {
    console.warn("[whatsapp-bridge] log falhou", err);
  }

  return opened;
}
