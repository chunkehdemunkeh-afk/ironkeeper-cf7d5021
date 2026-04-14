/**
 * Iron Keeper Service Worker
 * 
 * Strategy:
 *  - HTML navigation  → NetworkFirst (always fetch fresh index.html from server)
 *  - JS/CSS assets    → CacheFirst (hashed filenames make this safe)
 *  - Everything else  → NetworkOnly (API calls, Supabase, YouTube, etc.)
 *
 * On activate: clears all old caches so stale content is never served.
 * On install:  skips waiting immediately so this SW takes control right away.
 */

const CACHE_NAME = "ik-v2";
const ASSET_RE = /\.(?:js|css|woff2?|png|jpg|webp|svg|ico)$/;

// ── Install: activate immediately, don't wait for old SW to die ───────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ── Activate: delete old caches, claim all open tabs ─────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin HTTP requests
  if (!url.protocol.startsWith("http")) return;
  if (url.origin !== self.location.origin) return;

  // Never intercept OAuth or Supabase flows
  if (url.pathname.startsWith("/~oauth")) return;
  if (url.hostname.includes("supabase")) return;

  // ── HTML navigation → NetworkFirst ─────────────────────────────────────────
  // This is the critical fix: index.html is ALWAYS fetched from the network.
  // Users will never see a stale version when a new build is deployed.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req)) // offline fallback
    );
    return;
  }

  // ── Hashed static assets (JS/CSS/fonts) → CacheFirst ──────────────────────
  // Safe because Vite includes a content hash in the filename.
  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // ── Everything else → NetworkOnly ──────────────────────────────────────────
  // API calls, version.json, manifest.json, etc. always go to the network.
});
