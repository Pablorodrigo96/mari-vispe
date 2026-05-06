import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

export function usePageTracking() {
  const location = useLocation();
  const enterTs = useRef<number>(Date.now());
  const lastPath = useRef<string>("");

  useEffect(() => {
    const path = location.pathname + location.search;
    if (path === lastPath.current) return;

    // saída da rota anterior
    if (lastPath.current) {
      const dur = Date.now() - enterTs.current;
      trackEvent("page_leave", { path: lastPath.current, duration_ms: dur });
    }

    lastPath.current = path;
    enterTs.current = Date.now();
    trackEvent("page_view", { path });

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        const dur = Date.now() - enterTs.current;
        trackEvent("page_leave", { path: lastPath.current, duration_ms: dur });
      }
    };
    const onUnload = () => {
      const dur = Date.now() - enterTs.current;
      trackEvent("page_leave", { path: lastPath.current, duration_ms: dur });
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [location.pathname, location.search]);
}
