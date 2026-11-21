const CACHE = 'mendimaps-shell-v4';
const TILE_CACHE = 'mendimaps-viewed-maps-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('mendimaps-shell-') && key !== CACHE) {
        await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(hit => {
        if (hit) return hit;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  const hosts = [
    'tile.openstreetmap.org',
    'tms-mapa-raster.ign.es',
    'b5m.gipuzkoa.eus'
  ];

  if (hosts.includes(url.hostname)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async cache => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        try {
          const response = await fetch(event.request);
          if (response.ok || response.type === 'opaque') {
            await cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          return hit || Response.error();
        }
      })
    );
  }
});
