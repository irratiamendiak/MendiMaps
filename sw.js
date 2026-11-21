/* MendiMaps · service worker (modo offline)
   - App y librerías: se guardan al instalar y funcionan sin conexión.
   - Teselas: primero la caché (zonas guardadas + teselas ya vistas), después la red. */
const SHELL = 'mendimaps-shell-v1';
const TILES = 'mendimaps-tiles-v1';      // zonas guardadas (las escribe offline.js)
const VISITED = 'mendimaps-visited-v1';  // teselas vistas al navegar (máx. MAX_VISITED)
const MAX_VISITED = 3000;

const CDN = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/layers.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/layers-2x.png',
  'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css',
  'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js',
  'https://unpkg.com/leaflet-draw@1.0.4/dist/images/spritesheet.png',
  'https://unpkg.com/leaflet-draw@1.0.4/dist/images/spritesheet-2x.png',
  'https://unpkg.com/leaflet-draw@1.0.4/dist/images/spritesheet.svg'
];
const OPTIONAL = ['./manifest.webmanifest', './offline.js', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(['./', './index.html'].map(u => new Request(u, { cache: 'reload' })));
    await Promise.allSettled([
      ...OPTIONAL.map(u => c.add(new Request(u, { cache: 'reload' }))),
      ...CDN.map(u => c.add(new Request(u, { mode: 'cors' })))
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys())
      if (k.startsWith('mendimaps-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isTile = u =>
  /(^|\.)tile\.openstreetmap\.org$/.test(u.hostname) ||
  u.hostname === 'tms-mapa-raster.ign.es' ||
  (u.hostname === 'b5m.gipuzkoa.eus' && u.pathname.includes('/ogc/wms/gipuzkoa_ort_wms') && /request=getmap/i.test(u.search));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (isTile(url)) return e.respondWith(tile(req));
  if (url.origin === location.origin || url.hostname === 'unpkg.com') return e.respondWith(shell(e));
});

async function tile(req) {
  const hit = await caches.match(req, { ignoreVary: true });
  if (hit) return hit;
  try {
    const r = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
    if (r.ok && /^image\//.test(r.headers.get('content-type') || '')) {
      const c = await caches.open(VISITED);
      await c.put(req.url, r.clone());
      trim(c);
    }
    return r;
  } catch (err) {
    try { return await fetch(req); }                      // servidor sin CORS: se muestra, pero no se guarda
    catch (err2) { return new Response('', { status: 504 }); }
  }
}

let puts = 0;
async function trim(c) {
  if (++puts % 100) return;
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_VISITED; i++) await c.delete(keys[i]);
}

function shell(e) {
  const req = e.request, cdn = new URL(req.url).origin !== location.origin;
  return caches.match(req, { ignoreSearch: !cdn, ignoreVary: true }).then(hit => {
    const net = () => fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); }
      return r;
    });
    if (hit) { if (!cdn) e.waitUntil(net().catch(() => {})); return hit; }   // app: sirve la copia y se actualiza detrás
    return net().catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
  });
}
