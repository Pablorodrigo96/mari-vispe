import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale chunk hashes after a redeploy.
// When the browser holds an old index referencing a chunk that no longer
// exists, dynamic import() throws "Failed to fetch dynamically imported
// module". We reload once to pick up the fresh manifest.
const RELOAD_FLAG = "__chunk_reload__";
function isChunkLoadError(msg: string | undefined) {
  if (!msg) return false;
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
}
function tryReload() {
  if (sessionStorage.getItem(RELOAD_FLAG)) return;
  sessionStorage.setItem(RELOAD_FLAG, "1");
  window.location.reload();
}
window.addEventListener("error", (e) => {
  if (isChunkLoadError(e?.message)) tryReload();
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = (e?.reason?.message ?? String(e?.reason ?? "")) as string;
  if (isChunkLoadError(msg)) tryReload();
});
// NOTE: Flag is intentionally NOT auto-cleared on load. Keeping it sticky for
// the tab's lifetime prevents the reload-loop we observed when the chunk error
// kept re-occurring after the 2s window. The flag resets naturally when the
// user closes/reopens the tab (sessionStorage is per-tab).

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
