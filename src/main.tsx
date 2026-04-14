import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
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
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
} else {
  let updateSW: ReturnType<typeof registerSW> | null = null;
  let updateInProgress = false;

  const applyUpdate = async () => {
    if (updateInProgress) return;
    updateInProgress = true;

    // Flag so the app shows "What's New" after reload
    try { localStorage.setItem("ik-just-updated", "1"); } catch {}

    // Small delay so user sees the banner
    await new Promise((r) => setTimeout(r, 1200));

    try {
      await navigator.serviceWorker
        ?.getRegistration()
        ?.then((registration) => registration?.update());
      await updateSW?.(true);
    } catch {
      // fall back to reload
    } finally {
      window.location.reload();
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
        await applyUpdate();
      }
    } catch {
      // ignore transient network issues
    }
  };

  updateSW = registerSW({
    onNeedRefresh() {
      void applyUpdate();
    },
    onOfflineReady() {
      console.log("Iron Keeper is ready to work offline.");
    },
  });

  void checkPublishedVersion();
  setInterval(() => {
    void updateSW?.();
    void checkPublishedVersion();
  }, 60 * 1000);
}

createRoot(document.getElementById("root")!).render(<App />);
