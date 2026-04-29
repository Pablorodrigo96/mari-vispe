import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registra um acesso de visualização a um mandato/buyer para auditoria LGPD.
 * Roda uma única vez por (entityType, entityId) durante o ciclo de vida do componente.
 */
export function useAccessLog(entityType: "mandate" | "buyer", entityId: string | undefined) {
  const logged = useRef<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    const key = `${entityType}:${entityId}`;
    if (logged.current === key) return;
    logged.current = key;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any).schema("equity_brain").from("access_logs").insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        action: "view",
      });
    })();
  }, [entityType, entityId]);
}
