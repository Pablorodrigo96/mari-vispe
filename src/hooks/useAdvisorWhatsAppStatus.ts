import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdvisorWAStatus = "active" | "pending" | "configure" | "loading";

export interface AdvisorWARow {
  status: AdvisorWAStatus;
  is_mock: boolean;
  phone_number: string | null;
}

/**
 * Returns map advisor_id -> WhatsApp status. Used by AdminUsers list.
 */
export function useAdvisorWhatsAppStatus(userIds: string[]) {
  const [map, setMap] = useState<Record<string, AdvisorWARow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userIds.length) {
      setMap({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [cfg, pend] = await Promise.all([
        supabase
          .from("advisor_whatsapp_config" as any)
          .select("advisor_id, status, is_mock, phone_number")
          .in("advisor_id", userIds),
        supabase
          .from("advisor_whatsapp_setup_pending" as any)
          .select("advisor_id, status, phone_number")
          .in("advisor_id", userIds),
      ]);

      const next: Record<string, AdvisorWARow> = {};
      for (const id of userIds) {
        next[id] = { status: "configure", is_mock: false, phone_number: null };
      }
      for (const row of (pend.data ?? []) as any[]) {
        next[row.advisor_id] = {
          status: "pending",
          is_mock: false,
          phone_number: row.phone_number,
        };
      }
      for (const row of (cfg.data ?? []) as any[]) {
        next[row.advisor_id] = {
          status: row.status === "active" ? "active" : "configure",
          is_mock: !!row.is_mock,
          phone_number: row.phone_number,
        };
      }
      if (!cancelled) {
        setMap(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userIds.join(",")]);

  return { statusMap: map, loading };
}
