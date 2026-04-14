import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (!isInIframe && !isPreviewHost && "serviceWorker" in navigator) {
  // Register our custom SW.
  // updateViaCache:"none" forces the browser to ALWAYS fetch sw.js fresh from
  // the network, bypassing any CDN/HTTP cache — critical for detecting updates.
  navigator.serviceWorker
    .register("/sw.js", { updateViaCache: "none" })
    .then((reg) => {
      // Check for a new SW immediately and then every 60 seconds.
      // This catches updates even when the user hasn't navigated.
      void reg.update();
      setInterval(() => void reg.update(), 60_000);
    })
    .catch(() => {/* SW not supported — app still works */});

  // When a new SW takes control, reload to get the fresh page.
  // This fires after our SW's skipWaiting + clients.claim complete.
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
