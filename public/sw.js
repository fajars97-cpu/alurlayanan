// sw.js — SW minimalis: cache-first untuk aset statis, SWR untuk HTML/data
const CACHE = "pj-offline-v1";
const STATIC = [
  "/", "/index.html",
  "/favicon.ico",
  // folder infografis (sesuaikan dengan hosting kamu)
  // boleh dikosongkan; entry akan masuk runtime cache juga.
];

// install: pre-cache minimal shell
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

// activate: cleanup old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// fetch: SWR utk HTML/data, cache-first utk assets
self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);
  const isHTML = request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
  const isAsset = /\.(?:png|jpe?g|webp|svg|ico|css|js|woff2?|mp3|mp4|webm)$/i.test(url.pathname) ||
                  url.pathname.startsWith("/infografis/");
  if (isAsset) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(request).then((hit) =>
          hit || fetch(request).then((res) => { c.put(request, res.clone()); return res; })
        )
      )
    );
    return;
  }
  if (isHTML) {
    e.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      }).catch(() => caches.match(request).then((hit) => hit || caches.match("/index.html")))
    );
    return;
  }
  // default: try network, fallback cache
  e.respondWith(fetch(request).catch(() => caches.match(request)));
});
