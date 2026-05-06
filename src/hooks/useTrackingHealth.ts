import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAnalyticsOptedOut, getSessionKey } from "@/lib/analytics";

const CONSENT_KEY = "vispe_cookie_consent";

export type ConsentState = "accepted" | "rejected" | "pending";

export function getBrowserTrackingState() {
  if (typeof window === "undefined") {
    return { dnt: false, consent: "pending" as ConsentState, sessionKey: "", optedOut: true };
  }
  const dntRaw = (navigator as any).doNotTrack ?? (window as any).doNotTrack ?? (navigator as any).msDoNotTrack;
  const dnt = dntRaw === "1" || dntRaw === "yes" || dntRaw === 1;

  let consent: ConsentState = "pending";
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.consentGiven) consent = p.analytics === false ? "rejected" : "accepted";
    }
  } catch {}

  return {
    dnt,
    consent,
    sessionKey: getSessionKey(),
    optedOut: isAnalyticsOptedOut(),
  };
}

export function useTrackingHealth() {
  return useQuery({
    queryKey: ["tracking-health"],
    refetchInterval: 30_000,
    staleTime: 20_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [{ data: events }, { data: sessions }] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("event_type,created_at,session_key,user_id")
          .gte("created_at", since)
          .limit(10000),
        supabase
          .from("analytics_sessions")
          .select("session_key,user_id")
          .gte("last_seen_at", since)
          .limit(5000),
      ]);

      const byType: Record<string, number> = {};
      let lastAt: string | null = null;
      const sessionsWithLeave = new Set<string>();
      for (const e of events ?? []) {
        byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
        if (!lastAt || (e.created_at && e.created_at > lastAt)) lastAt = e.created_at as string;
        if (e.event_type === "page_leave" && e.session_key) sessionsWithLeave.add(e.session_key);
      }

      const totalSessions = sessions?.length ?? 0;
      const anonSessions = (sessions ?? []).filter((s) => !s.user_id).length;
      const leavePct = totalSessions ? Math.round((sessionsWithLeave.size / totalSessions) * 100) : 0;
      const anonPct = totalSessions ? Math.round((anonSessions / totalSessions) * 100) : 0;
      const lastEventAgoMin = lastAt ? Math.round((Date.now() - new Date(lastAt).getTime()) / 60000) : null;

      return { byType, totalSessions, leavePct, anonPct, lastAt, lastEventAgoMin };
    },
  });
}
