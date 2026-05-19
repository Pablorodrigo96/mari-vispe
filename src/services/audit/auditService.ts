import { supabase } from "@/integrations/supabase/client";

export type AuditEntityType =
  | "mandate"
  | "buyer"
  | "company"
  | "document"
  | "pipeline"
  | "nda"
  | "qna"
  | "negotiation"
  | "deal";

export interface LogAuditEventInput {
  dealId?: string | null;
  entityType: AuditEntityType;
  entityId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
}

/**
 * Registra um evento na trilha de auditoria imutável (audit_events).
 * Use para eventos sensíveis: mudança de stage, disclosure de identidade,
 * upload/aprovação de docs, NDA, NBO, etc.
 *
 * Falhas são logadas mas não interrompem o fluxo do app (best-effort).
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("log_audit_event" as never, {
      _deal_id: input.dealId ?? null,
      _entity_type: input.entityType,
      _entity_id: input.entityId ?? null,
      _event_type: input.eventType,
      _payload: (input.payload ?? {}) as never,
      _ip: null,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    } as never);

    if (error) {
      console.warn("[audit] log_audit_event failed:", error.message);
      return null;
    }
    return (data as unknown as string) ?? null;
  } catch (err) {
    console.warn("[audit] log_audit_event threw:", err);
    return null;
  }
}
