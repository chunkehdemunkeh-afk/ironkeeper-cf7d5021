import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

declare const __APP_VERSION__: string;

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  // Unregister any SW in preview/editor so stale caches don't interfere
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
} else {
  let updateInProgress = false;

  const applyUpdate = async () => {
    if (updateInProgress) return;
    updateInProgress = true;

    // Show the update banner in the UI
    window.dispatchEvent(new Event("ik-updating"));

    // Flag so the app shows "What's New" after reload
    try { localStorage.setItem("ik-just-updated", "1"); } catch {}

    // Small delay so user sees the banner before the reload
    await new Promise((r) => setTimeout(r, 1200));

    window.location.reload();
  };

  // Strategy A: controllerchange fires when a new SW takes control.
  // Works with registerType:"autoUpdate" + skipWaiting:true (future builds).
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    void applyUpdate();
  });

  // Strategy B: Directly activate any waiting SW by sending SKIP_WAITING.
  // Works with registerType:"prompt" (current deployed builds) and doesn't
  // interfere with autoUpdate builds.
  const activateWaitingSW = async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const checkPublishedVersion = async () => {
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = (await response.json()) as { version?: string };
      if (data.version && data.version !== __APP_VERSION__) {
        // version.json changed — force the SW to check for a new version
        const reg = await navigator.serviceWorker?.getRegistration();
        await reg?.update();
        // Give the browser a moment to install the new SW, then activate it
        setTimeout(() => void activateWaitingSW(), 1500);
        // Safety net: if nothing else triggers applyUpdate, reload after 4s
        setTimeout(() => void applyUpdate(), 4000);
      }
    } catch {
      // ignore transient network issues
    }
  };

  // On load: check for updates immediately
  void checkPublishedVersion();
  void activateWaitingSW();

  // Then poll every 60 seconds
  setInterval(async () => {
    // Force browser to re-fetch sw.js and check for changes
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
    // Activate any SW that installed and is now waiting
    await activateWaitingSW();
    // Also verify via version.json
    void checkPublishedVersion();
  }, 60 * 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
