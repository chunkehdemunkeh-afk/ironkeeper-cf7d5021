import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

// ── Shared update handler ──────────────────────────────────────────────────────
// All three detection paths call this one function so the UX is consistent:
//   1. Shows the "Updating Iron Keeper…" banner (UpdateBanner in App.tsx)
//   2. Sets the ik-just-updated flag so WhatsNewSheet opens after reload
//   3. Waits 1.2 s so the user sees the banner, then reloads
let updateInProgress = false;

function applyUpdate() {
  if (updateInProgress) return;
  updateInProgress = true;

  // Tell App.tsx to show the animated update banner
  window.dispatchEvent(new Event("ik-updating"));

  // Tell App.tsx to open the "What's New" sheet after the reload
  try { localStorage.setItem("ik-just-updated", "1"); } catch {}

  // Short delay — user sees the banner before the page disappears
  setTimeout(() => window.location.reload(), 1200);
}

if (!isInIframe && !isPreviewHost) {

  // ── Service Worker registration ─────────────────────────────────────────────
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js", {
        // Always fetch sw.js from the network — bypasses CDN/HTTP cache so
        // any change to the SW file is detected immediately.
        updateViaCache: "none",
      })
      .then((reg) => {
        // Check for an updated sw.js now and every 60 s
        void reg.update();
        setInterval(() => void reg.update(), 60_000);
      })
      .catch(() => {/* SW unsupported — app works without it */});

    // Fires when sw.js itself changed and the new SW took control
    navigator.serviceWorker.addEventListener("controllerchange", applyUpdate);

    // Fires when the SW's NetworkFirst handler detected new HTML content
    // (The SW broadcasts this to ALL open windows — see public/sw.js)
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "IK_UPDATE_AVAILABLE") applyUpdate();
    });
  }

  // ── Background version polling ───────────────────────────────────────────────
  // Catches updates for long-running sessions where no navigation event fires.
  // Polls index.html every 60 s and compares a hash — if Lovable deployed a
  // new build the HTML content changes (new hashed JS filenames inside it).
  //
  // Uses a query-string cache-buster so the request mode is "cors" (not
  // "navigate"), bypassing the SW's NetworkFirst cache and hitting the server.

  const djb2 = (s: string): number => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return h >>> 0;
  };

  let baselineHash: number | null = null;

  const pollVersion = async () => {
    if (updateInProgress) return;
    try {
      const res = await fetch(`/?_v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const hash = djb2(await res.text());
      if (baselineHash === null) {
        baselineHash = hash;          // record the version we started with
      } else if (hash !== baselineHash) {
        applyUpdate();                // new version on the server → update
      }
    } catch {
      // offline — skip silently
    }
  };

  void pollVersion();
  setInterval(() => void pollVersion(), 60_000);
}

createRoot(document.getElementById("root")!).render(<App />);
