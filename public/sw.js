/**
 * Iron Keeper Service Worker
 *
 * Caching strategy:
 *   navigate (HTML)  → NetworkFirst  — index.html always fetched fresh
 *   JS/CSS/fonts     → CacheFirst    — safe because Vite hashes filenames
 *   everything else  → NetworkOnly   — Supabase, APIs, etc.
 *
 * Update detection:
 *   On every navigation, if the fresh index.html differs from the cached copy
 *   we notify ALL open clients so they can reload immediately — even ones that
 *   have been running in the background for hours.
 */

const CACHE_NAME = "ik-v2";
const ASSET_RE = /\.(?:js|css|woff2?|ttf|png|jpg|webp|svg|ico)$/;

// ── Install: skip waiting so this SW activates immediately ────────────────────
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ── Activate: wipe old caches, claim all tabs ─────────────────────────────────
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

// ── Fetch routing ─────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin HTTP requests
  if (!url.protocol.startsWith("http")) return;
  if (url.origin !== self.location.origin) return;

  // Never intercept OAuth, Supabase, or the SW update-check requests
  if (url.pathname.startsWith("/~oauth")) return;

  // ── HTML navigation → NetworkFirst + change detection ──────────────────────
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(req, { cache: "no-store" });
          if (!networkRes.ok) throw new Error("network-error");

          // Read the fresh HTML once; we'll build two Response objects from it
          const freshHtml = await networkRes.text();

          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req);

          if (cached) {
            const cachedHtml = await cached.text();

            if (freshHtml !== cachedHtml) {
              // ✅ New version detected — update cache …
              await cache.put(
                req,
                new Response(freshHtml, {
                  status: networkRes.status,
                  statusText: networkRes.statusText,
                  headers: networkRes.headers,
                })
              );

              // … and tell every open client window to reload
              const clients = await self.clients.matchAll({ type: "window" });
              clients.forEach((c) => c.postMessage({ type: "IK_UPDATE_AVAILABLE" }));
            }
          } else {
            // First visit — just cache it
            await cache.put(
              req,
              new Response(freshHtml, {
                status: networkRes.status,
                statusText: networkRes.statusText,
                headers: networkRes.headers,
              })
            );
          }

          // Return the fresh HTML to the browser
          return new Response(freshHtml, {
            status: networkRes.status,
            statusText: networkRes.statusText,
            headers: networkRes.headers,
          });
        } catch {
          // Offline fallback
          const cached = await caches.match(req);
          return cached ?? new Response("Offline — please reconnect.", { status: 503 });
        }
      })()
    );
    return;
  }

  // ── Hashed static assets → CacheFirst ────────────────────────────────────
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

  // ── Everything else → NetworkOnly ─────────────────────────────────────────
  // (version.json, manifest.json, API calls, Supabase, etc.)
});
