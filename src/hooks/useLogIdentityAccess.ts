import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Throttled client-side logger for identity reveals.
 * Fires `eb_log_identity_access` RPC (SECURITY DEFINER) to register
 * implicit disclosure events in equity_brain.access_logs.
 *
 * Server also throttles 1h per (user, target, context) so duplicate
 * mounts in the same session are safe.
 */

type EntityType = "mandate" | "buyer" | "company" | "listing";

interface LogArgs {
  entityType: EntityType;
  entityId?: string | null;
  cnpj?: string | null;
  context: string; // ex: 'identity_card', 'docs_panel', 'blind_reveal', 'deal_page'
}

// In-memory throttle: same key only fires once every 5 min per session
const recent = new Map<string, number>();
const WINDOW_MS = 5 * 60 * 1000;

export function useLogIdentityAccess() {
  const log = useCallback(async (args: LogArgs) => {
    if (!args.entityId && !args.cnpj) return;
    const key = `${args.entityType}|${args.entityId ?? ""}|${args.cnpj ?? ""}|${args.context}`;
    const now = Date.now();
    const last = recent.get(key) ?? 0;
    if (now - last < WINDOW_MS) return;
    recent.set(key, now);

    try {
      await supabase.rpc("eb_log_identity_access" as any, {
        p_entity_type: args.entityType,
        p_entity_id: args.entityId ?? null,
        p_cnpj: args.cnpj ?? null,
        p_context: args.context,
        p_disclosure_mode: "implicit",
      } as any);
    } catch (e) {
      console.warn("[useLogIdentityAccess]", e);
    }
  }, []);

  return { log };
}

/**
 * Auto-fires the log once when `enabled` becomes true.
 * Use inside components that reveal identity on mount (e.g. IdentityRevealCard,
 * DocumentsPanel, DealPage).
 */
export function useAutoLogIdentityAccess(args: LogArgs & { enabled: boolean }) {
  const { log } = useLogIdentityAccess();
  const fired = useRef(false);
  useEffect(() => {
    if (!args.enabled || fired.current) return;
    fired.current = true;
    log({
      entityType: args.entityType,
      entityId: args.entityId,
      cnpj: args.cnpj,
      context: args.context,
    });
  }, [args.enabled, args.entityType, args.entityId, args.cnpj, args.context, log]);
}
