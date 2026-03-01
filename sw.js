const CACHE_NAME = "korjournal-v10";
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

  // Karttiles — nätverket direkt
  if (url.hostname.endsWith("tile.openstreetmap.org")) return;

  // App-filer — network-first: hämta färskt om möjligt, annars cache (offline)
  if (APP_SHELL.some((path) => url.pathname.endsWith(path.replace("./", "/")) || url.pathname === "/korjournal/" || url.pathname === "/")) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Övriga resurser — cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (e.request.method === "GET" && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        if (e.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
