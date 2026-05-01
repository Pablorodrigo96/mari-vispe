import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DashboardInsightType = "executivo" | "mandato" | "match" | "nbo";

interface State {
  body: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generates an AI insight for the given dashboard snapshot.
 * Uses server-side cache (1h) to avoid spamming the AI gateway.
 */
export function useDashboardInsight(
  type: DashboardInsightType,
  snapshot: Record<string, any> | null,
): State {
  const [state, setState] = useState<State>({ body: null, loading: false, error: null });

  useEffect(() => {
    if (!snapshot || Object.keys(snapshot).length === 0) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    supabase.functions
      .invoke("generate-dashboard-insight", { body: { dashboard_type: type, snapshot_data: snapshot } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState({ body: null, loading: false, error: error.message });
          return;
        }
        setState({ body: (data as any)?.body ?? null, loading: false, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ body: null, loading: false, error: e?.message ?? "Falha ao gerar insight" });
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, JSON.stringify(snapshot ?? {})]);

  return state;
}
