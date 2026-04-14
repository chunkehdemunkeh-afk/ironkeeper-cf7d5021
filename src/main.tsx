import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Unregister any existing service workers so updates appear immediately
navigator.serviceWorker?.getRegistrations().then((registrations) => {
  registrations.forEach((r) => r.unregister());
});

// Clear all caches left behind by the old PWA
caches.keys().then((names) => {
  names.forEach((name) => caches.delete(name));
});

createRoot(document.getElementById("root")!).render(<App />);
