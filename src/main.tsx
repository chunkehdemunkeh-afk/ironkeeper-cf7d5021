import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (!isInIframe && !isPreviewHost) {

  // ── Service Worker registration ─────────────────────────────────────────────
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js", {
        // updateViaCache:"none" means the browser ALWAYS fetches sw.js fresh
        // from the network, bypassing any CDN/HTTP cache — critical for
        // detecting new versions of the SW itself.
        updateViaCache: "none",
      })
      .then((reg) => {
        // Check for a new sw.js on load and every 60 s.
        // When a new sw.js is found it installs → skipWaiting → controllerchange → reload.
        void reg.update();
        setInterval(() => void reg.update(), 60_000);
      })
      .catch(() => {/* SW registration failed — app still works without it */});

    // When a new SW takes control (e.g. sw.js file itself changed), reload.
    let swRefreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (swRefreshing) return;
      swRefreshing = true;
      window.location.reload();
    });

    // When the SW detects that index.html changed (new Lovable deploy), it
    // broadcasts IK_UPDATE_AVAILABLE to ALL open windows — reload to apply.
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "IK_UPDATE_AVAILABLE") {
        window.location.reload();
      }
    });
  }

  // ── Background version polling (fallback for long-running sessions) ─────────
  // Periodically fetches index.html and compares a lightweight hash.
  // This catches updates even when the user hasn't opened a new tab or navigated,
  // e.g. an Android PWA kept open in the background all day.
  //
  // We use a query-string cache-buster so the SW's navigate rule doesn't apply
  // (programmatic fetch() mode is "cors", not "navigate", so it falls through
  // to NetworkOnly in the SW and always hits Lovable's server directly).

  /** Fast non-cryptographic hash (djb2) */
  const djb2 = (s: string): number => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return h >>> 0; // unsigned 32-bit
  };

  let baselineHash: number | null = null;
  let updateDetected = false;

  const pollVersion = async () => {
    if (updateDetected) return;
    try {
      const res = await fetch(`/?_v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const html = await res.text();
      const hash = djb2(html);

      if (baselineHash === null) {
        baselineHash = hash; // first poll — record the current version
      } else if (hash !== baselineHash) {
        updateDetected = true; // prevent double-reload
        window.location.reload();
      }
    } catch {
      // user may be offline — skip silently
    }
  };

  // First check right after the app loads, then every 60 seconds
  void pollVersion();
  setInterval(() => void pollVersion(), 60_000);
}

createRoot(document.getElementById("root")!).render(<App />);
