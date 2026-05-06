import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "analytics_session_key";
const UTM_KEY = "analytics_utm_v1";
const CONSENT_KEY = "vispe_cookie_consent";

export type AnalyticsEventType =
  | "page_view"
  | "page_leave"
  | "signup"
  | "lead"
  | "cta_click";

/** Returns true when the visitor explicitly opted-out (DNT or analytics consent off). */
export function isAnalyticsOptedOut(): boolean {
  if (typeof window === "undefined") return true;
  // Browser Do Not Track
  const dnt = (navigator as any).doNotTrack ?? (window as any).doNotTrack ?? (navigator as any).msDoNotTrack;
  if (dnt === "1" || dnt === "yes" || dnt === 1) return true;
  // Cookie consent: only opt-in once analytics === true AND consentGiven
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false; // banner ainda pendente — não bloqueia rastreamento básico inicial
    const p = JSON.parse(raw);
    if (p && p.consentGiven && p.analytics === false) return true;
  } catch {
    // ignore
  }
  return false;
}

export function getSessionKey(): string {
  if (typeof window === "undefined") return "";
  let k = sessionStorage.getItem(SESSION_KEY);
  if (!k) {
    k = (crypto?.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem(SESSION_KEY, k);
  }
  return k;
}

function captureUtm(): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  const cached = sessionStorage.getItem(UTM_KEY);
  if (cached) return JSON.parse(cached);
  const sp = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: sp.get("utm_source"),
    utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop",
  };
  sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  return utm;
}

let lastUserId: string | null = null;
supabase.auth.getUser().then(({ data }) => {
  lastUserId = data.user?.id ?? null;
});
supabase.auth.onAuthStateChange((_e, session) => {
  lastUserId = session?.user?.id ?? null;
});

export async function trackEvent(
  type: AnalyticsEventType,
  payload: { path?: string; title?: string; duration_ms?: number; metadata?: Record<string, any> } = {},
) {
  if (typeof window === "undefined") return;
  if (isAnalyticsOptedOut()) return;
  try {
    const session_key = getSessionKey();
    const utm = captureUtm();
    const body = {
      session_key,
      user_id: lastUserId,
      event_type: type,
      path: payload.path ?? window.location.pathname,
      title: payload.title ?? document.title,
      duration_ms: payload.duration_ms ?? null,
      metadata: payload.metadata ?? null,
      ...utm,
    };

    // Beacon for page_leave (works during unload)
    if (type === "page_leave" && navigator.sendBeacon) {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/track-event`;
      const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }

    await supabase.functions.invoke("track-event", { body });
  } catch {
    // silencioso — telemetria não pode quebrar UX
  }
}
