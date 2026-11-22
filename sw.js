/* MendiMaps · service worker
   - App eta liburutegiak: instalatzean gordetzen dira.
   - Lauzak: ONLINE lehenengo (4 s-ko denbora-muga); konexiorik ez badago, gordetako eremuak (mendimaps-tiles-v1). */
const SHELL = 'mendimaps-shell-v4';
const TILES = 'mendimaps-tiles-v1';
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
  'https://unpkg.com/leaflet-draw@1.0.4/dist/images/spritesheet.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm'
];
const OPTIONAL = ['./manifest.webmanifest', './offline.js', './ui.js', './ui.css', './lokala.js', './extras.js', './eu.js', './icon-192.png', './icon-512.png'];

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
      if ((k.startsWith('mendimaps-shell-') && k !== SHELL) || k === 'mendimaps-visited-v1') await caches.delete(k);
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
  if (url.origin === location.origin || url.hostname === 'unpkg.com' || url.hostname === 'cdnjs.cloudflare.com') return e.respondWith(shell(e));
});

async function tile(req) {
  const cached = async () => (await caches.match(req, { ignoreVary: true })) || new Response('', { status: 504 });
  if (!navigator.onLine) return cached();
  try { return await Promise.race([fetch(req), new Promise((_, no) => setTimeout(no, 4000))]); }
  catch (err) { return cached(); }
}

function shell(e) {
  const req = e.request, cdn = new URL(req.url).origin !== location.origin;
  return caches.match(req, { ignoreSearch: !cdn, ignoreVary: true }).then(hit => {
    const net = () => fetch(req).then(r => {
      if (r.ok) { const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); }
      return r;
    });
    if (hit) { if (!cdn) e.waitUntil(net().catch(() => {})); return hit; }
    return net().catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
  });
}
