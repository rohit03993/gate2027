self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(
      () => new Response("Offline. Open the app once on Wi‑Fi.", { status: 503, headers: { "Content-Type": "text/plain" } }),
    ),
  );
});
