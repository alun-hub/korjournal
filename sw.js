const CACHE_NAME = "korjournal-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./congestion_tax.js",
  "./manifest.json",
  "./icon.svg",
  "./leaflet.css",
  "./leaflet.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Map tiles — let the browser handle these directly (network only)
  if (url.hostname.endsWith("tile.openstreetmap.org")) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((response) => {
          // Cache successful GET responses
          if (e.request.method === "GET" && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (e.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
