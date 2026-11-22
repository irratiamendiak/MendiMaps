/* MendiMaps · konexiorik gabeko modua (0.7) — mapak online kontsultatzen dira; koadrikulen bidez eremuak gorde daitezke.
   Kargatu script nagusiaren AURRETIK (leaflet.draw.js ondoren). */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const TILES = 'mendimaps-tiles-v1', K_AREAS = 'mendimaps-offline-v2', K_ORTHO = 'mendimaps-orto-layer';
const ORTHO_URL = 'https://b5m.gipuzkoa.eus/ogc/wms/gipuzkoa_ort_wms';
const MAX_TILES = 5000;
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
};
let map = null, ortho = null, busy = false, cancel = false, grid = false, gz = 13;
const sel = new Set(), cellLayer = L.layerGroup();

/* --- Leaflet-en gainean jartzen diren kakoak --- */
L.Map.addInitHook(function () { map = this; map.on('moveend', () => { if (grid) drawGrid(); }); map.whenReady(estimate); });
L.TileLayer.WMS.addInitHook(function () {
  const u = String(this._url);
  if (u.includes('inspire/wms/gipuzkoa_wms')) this.options.zIndex = 10;      // katastroa beti oinarri-mapen gainean
  if (u.includes('gipuzkoa_ort_wms')) { ortho = this; const s = ls.get(K_ORTHO); if (s) this.wmsParams.layers = s; }
});
const _setParams = L.TileLayer.WMS.prototype.setParams;
L.TileLayer.WMS.include({ setParams(p, noRedraw) {
  if (this === ortho && p && p.layers) { const s = ls.get(K_ORTHO); if (s) p = { ...p, layers: s }; else ls.set(K_ORTHO, p.layers); }
  return _setParams.call(this, p, noRedraw);
} });

/* --- Iturriak (URLak Leaflet-ek eskatzen dituenen berdinak izan behar dute) --- */
function wmsUrl(z, x, y) {
  const t = 256, crs = map.options.crs;
  const nw = map.unproject(L.point(x * t, y * t), z), se = map.unproject(L.point((x + 1) * t, (y + 1) * t), z);
  const b = L.bounds(crs.project(nw), crs.project(se)), p = { ...ortho.wmsParams, crs: crs.code };
  return ORTHO_URL + L.Util.getParamString(p, ORTHO_URL, ortho.options.uppercase) + '&bbox=' + [b.min.x, b.min.y, b.max.x, b.max.y].join(',');
}
const SRC = {
  osm: { label: 'OpenStreetMap', bulk: false },
  ign: { label: 'IGN rasterra', bulk: true, max: 17, kb: 30, url: (z, x, y) => `https://tms-mapa-raster.ign.es/1.0.0/mapa-raster/${z}/${x}/${2 ** z - 1 - y}.jpeg` },
  gipuzkoaOrtho: { label: 'Gipuzkoako ortofotoa', bulk: true, max: 18, kb: 100, url: wmsUrl }
};

/* --- Lauzen eta koadrikulen matematika --- */
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z);
const lat2y = (lat, z) => { const r = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };
const t2lon = (x, z) => x / 2 ** z * 360 - 180;
const t2lat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** z))) * 180 / Math.PI;
const range = (b, z) => { const m = 2 ** z - 1, c = v => Math.max(0, Math.min(m, v)); return { x0: c(lon2x(b.w, z)), x1: c(lon2x(b.e, z)), y0: c(lat2y(b.n, z)), y1: c(lat2y(b.s, z)) }; };
function* tilesOf(a) {                                   // a = {gz, cells:[[x,y]], z0, z1}
  for (let z = a.z0; z <= a.z1; z++) {
    const d = z - a.gz;
    if (d >= 0) { const k = 2 ** d; for (const [cx, cy] of a.cells) for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) yield { z, x: cx * k + i, y: cy * k + j }; }
    else { const seen = new Set(); for (const [cx, cy] of a.cells) { const x = cx >> -d, y = cy >> -d, k = x + ',' + y; if (!seen.has(k)) { seen.add(k); yield { z, x, y }; } } }
  }
}
const countOf = a => { let n = 0; for (let z = a.z0; z <= a.z1; z++) { const d = z - a.gz; n += d >= 0 ? a.cells.length * 4 ** d : new Set(a.cells.map(([x, y]) => (x >> -d) + ',' + (y >> -d))).size; } return n; };
const hasTile = (a, t) => {
  if (t.z < a.z0 || t.z > a.z1) return false;
  const d = t.z - a.gz;
  return a.cells.some(([cx, cy]) => d >= 0 ? (t.x >> d) === cx && (t.y >> d) === cy : (cx >> -d) === t.x && (cy >> -d) === t.y);
};

/* --- Egoera --- */
const say = t => { const h = $('hint'); if (h) h.textContent = t; };
const base = () => $('basemap').value;
const areas = () => { try { return JSON.parse(ls.get(K_AREAS) || '[]'); } catch (e) { return []; } };
const saveAreas = a => ls.set(K_AREAS, JSON.stringify(a));
const plan = () => ({ gz, cells: [...sel].map(k => k.split(',').map(Number)), z0: Math.max(8, gz - 1), z1: Number($('offZoom').value) });
const covers = (a, x, y) => a.gz <= gz && a.cells.some(([cx, cy]) => (x >> (gz - a.gz)) === cx && (y >> (gz - a.gz)) === cy);

/* --- Interfazea --- */
$('areaVal').closest('.section').insertAdjacentHTML('beforebegin', `
<div class="section"><h3>Mapak konexiorik gabe</h3>
  <div class="feature-list">Mapak online kontsultatzen dira. Eremu bat gorde dezakezu konexiorik gabe erabiltzeko: erakutsi koadrikula eta ukitu laukiak.</div>
  <button class="btn wide" id="offGrid">▦ Koadrikula erakutsi<span>Aukeratu deskargatzeko laukiak</span></button>
  <div class="row" style="margin-top:7px"><select class="field" id="offCell" aria-label="Laukiaren tamaina">
    <option value="12">Lauki handiak (≈ 7 km)</option><option value="13" selected>Lauki ertainak (≈ 3,5 km)</option><option value="14">Lauki txikiak (≈ 1,8 km)</option></select>
    <select class="field" id="offZoom" aria-label="Gehieneko zooma"></select></div>
  <div class="feature-list" id="offEstimate" style="margin-top:8px"></div>
  <button class="btn primary wide" id="offGo">↓ Hautatutakoak deskargatu</button>
  <button class="btn wide" id="offReset">Hautapena garbitu</button>
  <div id="offProg" hidden><progress id="offBar" max="100" value="0" style="width:100%;margin-top:8px"></progress><div class="feature-list" id="offProgTxt"></div>
    <button class="btn wide" id="offCancel">Deskarga bertan behera utzi</button></div>
  <div id="offList" class="feature-list" style="margin-top:8px"></div>
  <div class="feature-list" id="offSpace"></div>
  <button class="btn wide danger" id="offClear">Gordetako mapak hustu</button>
</div>`);
document.querySelector('.mapwrap').insertAdjacentHTML('beforeend', '<button class="pill" id="offPill"><span></span></button>');

const gps = $('gpsStatus'), net = document.createElement('div'), wrap = document.createElement('div');
net.className = 'status'; net.textContent = '⌁ Konexiorik gabe';
wrap.style.cssText = 'display:flex;gap:6px;align-items:center';
gps.parentNode.insertBefore(wrap, gps); wrap.append(net, gps);
const upd = () => { net.hidden = navigator.onLine; };
addEventListener('online', upd); addEventListener('offline', upd); upd();
const icon = document.createElement('link'); icon.rel = 'apple-touch-icon'; icon.href = 'icon-192.png'; document.head.appendChild(icon);

function fillZoom() {
  const max = SRC[base()].max || 17, el = $('offZoom'), prev = Number(el.value) || 16;
  el.innerHTML = '';
  for (let z = gz + 1; z <= Math.max(max, gz + 1); z++) el.add(new Option('Zooma ' + z + ' arte', z));
  el.value = Math.max(gz + 1, Math.min(prev, max));
}
function drawGrid() {
  cellLayer.clearLayers();
  if (!SRC[base()].bulk) return;
  const bb = map.getBounds(), r = range({ w: bb.getWest(), s: bb.getSouth(), e: bb.getEast(), n: bb.getNorth() }, gz);
  if ((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) > 400) { say('Gerturatu mapa koadrikula ikusteko'); return; }
  const saved = areas().filter(a => a.src === base());
  for (let x = r.x0; x <= r.x1; x++) for (let y = r.y0; y <= r.y1; y++) {
    const k = x + ',' + y, on = sel.has(k), done = saved.some(a => covers(a, x, y));
    L.rectangle([[t2lat(y + 1, gz), t2lon(x, gz)], [t2lat(y, gz), t2lon(x + 1, gz)]], {
      weight: on ? 3 : 1, color: on ? '#24584e' : '#173b35aa', fillColor: on ? '#d8ed9b' : done ? '#2d815e' : '#ffffff',
      fillOpacity: on ? .55 : done ? .3 : .05, bubblingMouseEvents: false
    }).on('click', () => { sel.has(k) ? sel.delete(k) : sel.add(k); drawGrid(); estimate(); }).addTo(cellLayer);
  }
}
function estimate() {
  if (!$('offEstimate')) return;
  const s = SRC[base()]; let txt, pill = '';
  if (!s.bulk) { txt = 'OpenStreetMap-ek ez du deskarga masiborik onartzen. Aldatu IGN edo ortofoto mapara eremu bat gordetzeko.'; $('offGo').disabled = true; }
  else if (!sel.size) { txt = grid ? 'Ukitu mapako laukiak deskargatzeko aukeratzeko.' : 'Erakutsi koadrikula eta aukeratu deskargatu nahi dituzun laukiak.'; $('offGo').disabled = true; }
  else {
    const p = plan(), n = countOf(p), mb = Math.round(n * s.kb / 1024);
    txt = `${sel.size} lauki · zooma ${p.z0}–${p.z1} · ${n.toLocaleString()} lauza · ≈ ${mb} MB` + (n > MAX_TILES ? ' · gehiegi: aukeratu lauki gutxiago edo zoom txikiagoa' : '');
    pill = n > MAX_TILES ? '' : `Deskargatu · ${sel.size} lauki · ≈ ${mb} MB`;
    $('offGo').disabled = busy || n > MAX_TILES;
  }
  $('offEstimate').textContent = txt;
  if (!busy) $('offPill').firstChild.textContent = pill;
  $('offPill').classList.toggle('show', busy || (grid && !!pill));
}
function render() {
  const a = areas();
  $('offList').innerHTML = a.length ? a.map(x => `<div class="feature"><b>${SRC[x.src] ? SRC[x.src].label : x.src}</b> · zooma ${x.z0}–${x.z1}<br>` +
    `${x.n.toLocaleString()} lauza · ${x.cells.length} lauki · ${new Date(x.date).toLocaleDateString('es-ES')}${x.fail ? ' · ' + x.fail + ' huts' : ''}<br>` +
    `<button class="btn" data-v="${x.id}" style="margin-top:5px;padding:5px 8px;font-size:11px">Eremua ikusi</button> ` +
    `<button class="btn danger" data-d="${x.id}" style="margin-top:5px;padding:5px 8px;font-size:11px">Ezabatu</button></div>`).join('')
    : 'Oraindik ez duzu eremurik gorde.';
  space();
}
async function space() {
  if (!navigator.storage || !navigator.storage.estimate) return;
  const e = await navigator.storage.estimate();
  $('offSpace').textContent = `MendiMaps-ek erabilitako tokia: ${Math.round(e.usage / 1048576)} MB` + (e.quota ? ` (muga ≈ ${Math.round(e.quota / 1048576)} MB)` : '');
}

/* --- Deskargatu eta ezabatu --- */
async function fetchTile(u) {
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(u, { mode: 'cors', credentials: 'omit' }); if (r.ok && /^image\//.test(r.headers.get('content-type') || '')) return r; } catch (e) {}
  }
  return null;
}
async function go() {
  if (busy) return;
  const key = base(), s = SRC[key], p = plan();
  if (!s.bulk || !window.caches || !p.cells.length || (key === 'gipuzkoaOrtho' && !ortho)) return;
  const n = countOf(p), mb = Math.round(n * s.kb / 1024);
  if (n > MAX_TILES) return;
  if ((n > 1500 || mb > 150) && !confirm(`≈ ${n.toLocaleString()} lauza (≈ ${mb} MB) gordeko dira. Jarraitu?`)) return;
  const t0 = tilesOf(p).next().value;
  if (!(await fetchTile(s.url(t0.z, t0.x, t0.y)))) { say('Ezin izan da deskargatu: zerbitzariak ez du erantzuten edo nabigatzaileak ezin ditu lauzak gorde (CORS).'); return; }
  busy = true; cancel = false; $('offProg').hidden = false; $('offBar').value = 0; estimate();
  try { await navigator.storage.persist(); } catch (e) {}
  const cache = await caches.open(TILES), it = tilesOf(p);
  let done = 0, fail = 0, full = false;
  const worker = async () => {
    for (;;) {
      if (cancel) return;
      const t = it.next(); if (t.done) return;
      const u = s.url(t.value.z, t.value.x, t.value.y);
      if (!(await cache.match(u, { ignoreVary: true }))) {
        const r = await fetchTile(u);
        if (!r) fail++; else try { await cache.put(u, r); } catch (e) { cancel = full = true; return; }
      }
      done++;
      if (done % 8 === 0 || done === n) {
        $('offBar').value = done / n * 100;
        $('offProgTxt').textContent = `${done.toLocaleString()} / ${n.toLocaleString()} lauza`;
        $('offPill').firstChild.textContent = `Deskargatzen ${done}/${n} · ukitu bertan behera uzteko`;
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  busy = false; $('offProg').hidden = true;
  if (full) say('Ez dago nahikoa toki gailuan. Ezabatu gordetako eremuak eta saiatu berriro.');
  else if (cancel) say('Deskarga bertan behera utzi da. Gordetako lauzak mantentzen dira.');
  else {
    const a = areas(); a.push({ id: Date.now(), src: key, ...p, n, fail, date: Date.now() }); saveAreas(a); sel.clear();
    say(fail ? `Eremua gordeta, ${fail} lauza huts eginda.` : 'Eremua gordeta, konexiorik gabe erabiltzeko.');
  }
  render(); if (grid) drawGrid(); estimate();
}
async function del(id) {
  const a = areas(), t = a.find(x => x.id === id);
  if (!t || !confirm('Gordetako eremu hau ezabatu?')) return;
  const keep = a.filter(x => x.id !== id && x.src === t.src), cache = await caches.open(TILES);
  for (const k of tilesOf(t)) {
    if (keep.some(o => hasTile(o, k))) continue;                   // beste eremu batek erabiltzen dituen lauzak ez dira ezabatzen
    await cache.delete(SRC[t.src].url(k.z, k.x, k.y), { ignoreVary: true });
  }
  saveAreas(a.filter(x => x.id !== id)); render(); if (grid) drawGrid(); say('Eremua ezabatuta');
}
async function clearAll() {
  if (!confirm('Gordetako eremu eta lauza guztiak ezabatu?')) return;
  await caches.delete(TILES); saveAreas([]); render(); if (grid) drawGrid(); say('Gordetako mapak ezabatuta');
}
function toggleGrid() {
  grid = !grid; $('offGrid').firstChild.textContent = grid ? '▦ Koadrikula ezkutatu' : '▦ Koadrikula erakutsi';
  if (grid) { cellLayer.addTo(map); drawGrid(); $('aside').classList.remove('open'); say('Ukitu laukiak aukeratzeko eta sakatu «Deskargatu»'); }
  else map.removeLayer(cellLayer);
  estimate();
}

$('offGrid').onclick = toggleGrid;
$('offGo').onclick = go;
$('offPill').onclick = () => { if (busy) cancel = true; else go(); };
$('offCancel').onclick = () => { cancel = true; };
$('offReset').onclick = () => { sel.clear(); if (grid) drawGrid(); estimate(); };
$('offClear').onclick = clearAll;
$('offZoom').onchange = estimate;
$('offCell').onchange = e => { gz = Number(e.target.value); sel.clear(); fillZoom(); if (grid) drawGrid(); estimate(); };
$('basemap').addEventListener('change', () => { fillZoom(); if (grid) drawGrid(); estimate(); });
$('offList').addEventListener('click', e => {
  const v = e.target.closest('[data-v]'), d = e.target.closest('[data-d]');
  if (d) del(Number(d.dataset.d));
  if (v) {
    const x = areas().find(a => a.id === Number(v.dataset.v)); if (!x) return;
    const xs = x.cells.map(c => c[0]), ys = x.cells.map(c => c[1]), s = $('basemap');
    if (s.value !== x.src) { s.value = x.src; s.dispatchEvent(new Event('change')); }
    map.fitBounds([[t2lat(Math.max(...ys) + 1, x.gz), t2lon(Math.min(...xs), x.gz)], [t2lat(Math.min(...ys), x.gz), t2lon(Math.max(...xs) + 1, x.gz)]]);
  }
});
fillZoom(); render(); estimate();
})();
