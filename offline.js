/* MendiMaps · modo offline (0.5)
   Cargar ANTES del script principal: <script src="offline.js"></script> justo después de leaflet.draw.js. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const TILES = 'mendimaps-tiles-v1', VISITED = 'mendimaps-visited-v1';
const K_AREAS = 'mendimaps-offline-v1', K_ORTHO = 'mendimaps-orto-layer';
const ORTHO_URL = 'https://b5m.gipuzkoa.eus/ogc/wms/gipuzkoa_ort_wms';
const MAX_TILES = 5000;
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
};
let map = null, ortho = null, busy = false, cancel = false;

/* --- Enganches a Leaflet (el script principal no se toca) --- */
L.Map.addInitHook(function () { map = this; map.on('moveend', estimate); map.whenReady(estimate); });
L.TileLayer.WMS.addInitHook(function () {
  if (String(this._url).includes('gipuzkoa_ort_wms')) {
    ortho = this;
    const s = ls.get(K_ORTHO); if (s) this.wmsParams.layers = s;   // el nombre de capa no puede cambiar entre sesiones
  }
});
const _setParams = L.TileLayer.WMS.prototype.setParams;
L.TileLayer.WMS.include({ setParams(p, noRedraw) {
  if (this === ortho && p && p.layers) {                            // GetCapabilities solo fija el nombre la primera vez
    const s = ls.get(K_ORTHO);
    if (s) p = { ...p, layers: s }; else ls.set(K_ORTHO, p.layers);
  }
  return _setParams.call(this, p, noRedraw);
} });

/* --- Fuentes descargables (la URL debe ser idéntica a la que pide Leaflet) --- */
function wmsUrl(z, x, y) {
  const t = 256, crs = map.options.crs;
  const nw = map.unproject(L.point(x * t, y * t), z), se = map.unproject(L.point((x + 1) * t, (y + 1) * t), z);
  const b = L.bounds(crs.project(nw), crs.project(se)), p = { ...ortho.wmsParams, crs: crs.code };
  return ORTHO_URL + L.Util.getParamString(p, ORTHO_URL, ortho.options.uppercase) +
         '&bbox=' + [b.min.x, b.min.y, b.max.x, b.max.y].join(',');
}
const SRC = {
  osm: { label: 'OpenStreetMap', bulk: false },
  ign: { label: 'IGN raster', bulk: true, max: 17, kb: 30,
         url: (z, x, y) => `https://tms-mapa-raster.ign.es/1.0.0/mapa-raster/${z}/${x}/${2 ** z - 1 - y}.jpeg` },
  gipuzkoaOrtho: { label: 'Ortofoto Gipuzkoa', bulk: true, max: 18, kb: 100, url: wmsUrl }
};

/* --- Matemática de teselas --- */
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z);
const lat2y = (lat, z) => {
  const r = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z);
};
const range = (b, z) => {
  const m = 2 ** z - 1, c = v => Math.max(0, Math.min(m, v));
  return { x0: c(lon2x(b.w, z)), x1: c(lon2x(b.e, z)), y0: c(lat2y(b.n, z)), y1: c(lat2y(b.s, z)) };
};
const count = (b, z0, z1) => { let n = 0; for (let z = z0; z <= z1; z++) { const r = range(b, z); n += (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1); } return n; };
function* tiles(b, z0, z1) {
  for (let z = z0; z <= z1; z++) { const r = range(b, z);
    for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) yield { z, x, y }; }
}
const inArea = (a, t) => {
  if (t.z < a.z0 || t.z > a.z1) return false;
  const r = range(a.b, t.z); return t.x >= r.x0 && t.x <= r.x1 && t.y >= r.y0 && t.y <= r.y1;
};

/* --- Estado y utilidades --- */
const say = t => { const h = $('hint'); if (h) h.textContent = t; };
const base = () => $('basemap').value;
const areas = () => { try { return JSON.parse(ls.get(K_AREAS) || '[]'); } catch (e) { return []; } };
const saveAreas = a => ls.set(K_AREAS, JSON.stringify(a));
const bounds = () => { const b = map.getBounds(); return { w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() }; };
const zoomRange = () => { const z1 = Number($('offZoom').value); return [Math.max(8, Math.min(Math.floor(map.getZoom()) - 1, z1)), z1]; };

/* --- Interfaz: sección nueva en el menú + indicador de conexión --- */
$('areaVal').closest('.section').insertAdjacentHTML('beforebegin', `
<div class="section"><h3>Mapas sin conexión</h3>
  <div class="feature-list" id="offEstimate"></div>
  <select class="field" id="offZoom" aria-label="Zoom máximo a guardar" style="margin:8px 0 0"></select>
  <button class="btn primary wide" id="offGo">↓ Guardar zona visible<span>Encuadra antes la zona en pantalla</span></button>
  <div id="offProg" hidden>
    <progress id="offBar" max="100" value="0" style="width:100%;margin-top:8px"></progress>
    <div class="feature-list" id="offProgTxt"></div>
    <button class="btn wide" id="offCancel">Cancelar descarga</button>
  </div>
  <div id="offList" class="feature-list" style="margin-top:8px"></div>
  <div class="feature-list" id="offSpace"></div>
  <button class="btn wide danger" id="offClear">Vaciar mapas guardados</button>
</div>`);

const gps = $('gpsStatus'), net = document.createElement('div'), wrap = document.createElement('div');
net.className = 'status'; net.textContent = '⌁ Sin conexión';
wrap.style.cssText = 'display:flex;gap:6px;align-items:center';
gps.parentNode.insertBefore(wrap, gps); wrap.append(net, gps);
const upd = () => { net.hidden = navigator.onLine; };
addEventListener('online', upd); addEventListener('offline', upd); upd();

const icon = document.createElement('link'); icon.rel = 'apple-touch-icon'; icon.href = 'icon-192.png'; document.head.appendChild(icon);

function fillZoom() {
  const max = SRC[base()].max || 17, sel = $('offZoom'), prev = Number(sel.value) || 16;
  sel.innerHTML = '';
  for (let z = 13; z <= max; z++) sel.add(new Option('Hasta zoom ' + z, z));
  sel.value = Math.min(prev, max);
}
function estimate() {
  if (!map || !map._loaded) return;
  const s = SRC[base()], go = $('offGo');
  if (!s.bulk) {
    $('offEstimate').textContent = 'OpenStreetMap no permite descargas masivas: solo se guardan las teselas que vas viendo. Para guardar una zona, cambia a IGN u Ortofoto.';
    go.disabled = true; return;
  }
  const [z0, z1] = zoomRange(), n = count(bounds(), z0, z1), mb = Math.round(n * s.kb / 1024);
  $('offEstimate').textContent = `Zoom ${z0}–${z1} · ${n.toLocaleString('es-ES')} teselas · ≈ ${mb} MB` +
    (n > MAX_TILES ? ' · demasiadas: reduce la zona o el zoom' : '');
  go.disabled = busy || n > MAX_TILES;
}
function render() {
  const a = areas();
  $('offList').innerHTML = a.length ? a.map(x => `<div class="feature"><b>${SRC[x.src] ? SRC[x.src].label : x.src}</b> · zoom ${x.z0}–${x.z1}<br>` +
    `${x.n.toLocaleString('es-ES')} teselas · ${new Date(x.date).toLocaleDateString('es-ES')}${x.fail ? ' · ' + x.fail + ' fallidas' : ''}<br>` +
    `<button class="btn" data-v="${x.id}" style="margin-top:5px;padding:5px 8px;font-size:11px">Ver zona</button> ` +
    `<button class="btn danger" data-d="${x.id}" style="margin-top:5px;padding:5px 8px;font-size:11px">Borrar</button></div>`).join('')
    : 'Todavía no has guardado ninguna zona.';
  space();
}
async function space() {
  if (!navigator.storage || !navigator.storage.estimate) return;
  const e = await navigator.storage.estimate();
  $('offSpace').textContent = `Espacio usado por MendiMaps: ${Math.round(e.usage / 1048576)} MB` +
    (e.quota ? ` (límite ≈ ${Math.round(e.quota / 1048576)} MB)` : '');
}

/* --- Descarga, borrado --- */
async function fetchTile(u) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(u, { mode: 'cors', credentials: 'omit' });
      if (r.ok && /^image\//.test(r.headers.get('content-type') || '')) return r;
    } catch (e) {}
  }
  return null;
}
async function go() {
  if (busy) return;
  const key = base(), s = SRC[key];
  if (!s.bulk || !window.caches || (key === 'gipuzkoaOrtho' && !ortho)) return;
  const b = bounds(), [z0, z1] = zoomRange(), n = count(b, z0, z1), mb = Math.round(n * s.kb / 1024);
  if (n > MAX_TILES) return;
  if ((n > 1500 || mb > 150) && !confirm(`Se guardarán ≈ ${n.toLocaleString('es-ES')} teselas (≈ ${mb} MB). ¿Continuar?`)) return;
  const t0 = tiles(b, z0, z1).next().value;
  if (!(await fetchTile(s.url(t0.z, t0.x, t0.y)))) {
    say('No se pudo descargar: el servidor no responde o no permite guardar teselas desde el navegador (CORS).'); return;
  }
  busy = true; cancel = false; $('offProg').hidden = false; $('offBar').value = 0; estimate();
  try { await navigator.storage.persist(); } catch (e) {}
  const cache = await caches.open(TILES), it = tiles(b, z0, z1);
  let done = 0, fail = 0, full = false;
  const worker = async () => {
    for (;;) {
      if (cancel) return;
      const t = it.next(); if (t.done) return;
      const u = s.url(t.value.z, t.value.x, t.value.y);
      if (!(await cache.match(u, { ignoreVary: true }))) {
        const r = await fetchTile(u);
        if (!r) fail++;
        else try { await cache.put(u, r); } catch (e) { cancel = full = true; return; }
      }
      done++;
      if (done % 8 === 0 || done === n) {
        $('offBar').value = done / n * 100;
        $('offProgTxt').textContent = `${done.toLocaleString('es-ES')} / ${n.toLocaleString('es-ES')} teselas`;
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  busy = false; $('offProg').hidden = true;
  if (full) say('Espacio insuficiente en el dispositivo. Borra zonas guardadas e inténtalo de nuevo.');
  else if (cancel) say('Descarga cancelada. Las teselas ya guardadas se conservan.');
  else {
    const a = areas(); a.push({ id: Date.now(), src: key, b, z0, z1, n, fail, date: Date.now() }); saveAreas(a);
    say(fail ? `Zona guardada, con ${fail} teselas fallidas.` : 'Zona guardada para usar sin conexión.');
  }
  render(); estimate();
}
async function del(id) {
  const a = areas(), t = a.find(x => x.id === id);
  if (!t || !confirm('¿Borrar esta zona guardada?')) return;
  const keep = a.filter(x => x.id !== id && x.src === t.src), cache = await caches.open(TILES);
  for (const k of tiles(t.b, t.z0, t.z1)) {
    if (keep.some(o => inArea(o, k))) continue;                    // no borrar teselas que usa otra zona
    await cache.delete(SRC[t.src].url(k.z, k.x, k.y), { ignoreVary: true });
  }
  saveAreas(a.filter(x => x.id !== id)); render(); say('Zona borrada');
}
async function clearAll() {
  if (!confirm('¿Borrar todas las zonas y teselas guardadas?')) return;
  await caches.delete(TILES); await caches.delete(VISITED); saveAreas([]); render(); say('Mapas guardados borrados');
}

$('offGo').onclick = go;
$('offCancel').onclick = () => { cancel = true; };
$('offClear').onclick = clearAll;
$('offZoom').onchange = estimate;
$('basemap').addEventListener('change', () => { fillZoom(); estimate(); });
$('offList').addEventListener('click', e => {
  const v = e.target.closest('[data-v]'), d = e.target.closest('[data-d]');
  if (d) del(Number(d.dataset.d));
  if (v) {
    const x = areas().find(a => a.id === Number(v.dataset.v)); if (!x) return;
    const sel = $('basemap');
    if (sel.value !== x.src) { sel.value = x.src; sel.dispatchEvent(new Event('change')); }
    map.fitBounds([[x.b.s, x.b.w], [x.b.n, x.b.e]]);
  }
});
fillZoom(); render();
})();
