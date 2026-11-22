/* MendiMaps · partekatu, puntuen argazkiak eta pantaila piztuta (0.8)
   Kargatu ui.js eta lokala.js ondoren, eu.js baino lehen, script nagusiaren aurretik. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const say = t => { const h = $('hint'); if (h) h.textContent = t; };
const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const ICON = {
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>'
};
let map = null;
L.Map.addInitHook(function () { map = this; this.on('popupopen', fill); });

/* --- Argazkiak: IndexedDB (puntuaren koordenatuak dira gakoa) --- */
const dbp = new Promise((ok, ko) => {
  const r = indexedDB.open('mendimaps-photos', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id', autoIncrement: true }).createIndex('k', 'k');
  r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
});
const tx = (mode, f) => dbp.then(d => new Promise((ok, ko) => {
  const t = d.transaction('p', mode), q = f(t.objectStore('p'));
  t.oncomplete = () => ok(q && q.result); t.onerror = () => ko(t.error);
}));
const putPhoto = (k, blob) => tx('readwrite', s => s.add({ k, blob, t: Date.now() }));
const getPhotos = k => tx('readonly', s => s.index('k').getAll(k));
const allPhotos = () => tx('readonly', s => s.getAll());
const delPhoto = id => tx('readwrite', s => s.delete(id));
const key = ll => ll.lat.toFixed(6) + ',' + ll.lng.toFixed(6);

function shrink(file, max = 1280) {
  return new Promise((ok, ko) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob(b => b ? ok(b) : ko(), 'image/jpeg', .8);
    };
    img.onerror = ko; img.src = u;
  });
}
document.body.insertAdjacentHTML('beforeend', '<input type="file" id="phIn" accept="image/*" capture="environment" hidden>');
let target = null;
const takePhoto = m => { target = m; $('phIn').click(); };
$('phIn').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !target) return;
  try {
    await putPhoto(key(target.getLatLng()), await shrink(f)); say('Argazkia gordeta');
    if (target.isPopupOpen()) { target.closePopup(); target.openPopup(); }
  } catch (err) { say('Ezin izan da argazkia gorde'); }
};

/* --- Puntu berri bat gordetzean: "Argazkia atera" botoia agertu eta desagertu egiten da --- */
const _bp = L.Layer.prototype.bindPopup;
L.Layer.include({ bindPopup(c, o) {
  const first = !this._popup, r = _bp.call(this, c, o);          // lehen aldiz + testu formatua = elementu berria (ez editatzea, ez kargatzea)
  if (first && this instanceof L.Marker && typeof c === 'string' && c.startsWith('<b>')) setTimeout(() => offer(this), 80);
  return r;
} });
let pt = 0;
function offer(m) {
  const p = $('phPill'); p.classList.add('show');
  p.onclick = () => { p.classList.remove('show'); takePhoto(m); };
  clearTimeout(pt); pt = setTimeout(() => p.classList.remove('show'), 8000);
}

/* --- Popup-a: argazkiak + botoiak --- */
function fill(e) {
  const m = e.popup._source; if (!(m instanceof L.Marker)) return;
  const box = e.popup.getElement().querySelector('.leaflet-popup-content'); if (!box) return;
  const w = document.createElement('div'); box.appendChild(w);
  getPhotos(key(m.getLatLng())).then(list => list.forEach(p => {
    const i = new Image(); i.src = URL.createObjectURL(p.blob);
    i.style.cssText = 'width:64px;height:64px;object-fit:cover;border-radius:8px;margin:6px 6px 0 0;cursor:pointer';
    i.onclick = () => lightbox(p, m); w.appendChild(i);
  }));
  const bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:6px;margin-top:8px';
  bar.innerHTML = '<button class="btn" data-a="ph" style="padding:6px 9px;font-size:12px">Argazkia atera</button><button class="btn" data-a="sh" style="padding:6px 9px;font-size:12px">Partekatu</button>';
  bar.onclick = ev => { const a = ev.target.dataset.a; if (a === 'ph') takePhoto(m); if (a === 'sh') sharePoint(m); };
  box.appendChild(bar);
}
function lightbox(p, m) {
  const o = document.createElement('div'), u = URL.createObjectURL(p.blob);
  o.style.cssText = 'position:fixed;inset:0;z-index:2000;background:#000d;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:12px';
  o.innerHTML = `<img src="${u}" style="max-width:100%;max-height:75%;border-radius:10px"><div style="display:flex;gap:8px"><button class="btn" data-a="sh">Partekatu</button><button class="btn danger" data-a="del">Ezabatu</button><button class="btn" data-a="x">Itxi</button></div>`;
  const close = () => { o.remove(); URL.revokeObjectURL(u); };
  o.onclick = async ev => {
    const a = ev.target.dataset && ev.target.dataset.a;
    if (a === 'sh') out({ title: 'Argazkia', files: [new File([p.blob], 'argazkia.jpg', { type: 'image/jpeg' })] });
    else if (a === 'del') { if (confirm('Argazki hau ezabatu?')) { await delPhoto(p.id); close(); m.closePopup(); m.openPopup(); } }
    else if (a === 'x' || ev.target === o) close();
  };
  document.body.appendChild(o);
}

/* --- Partekatu: sistemaren partekatze-menua (WhatsApp, posta…); ezin bada, fitxategia deskargatu / WhatsApp esteka --- */
const saveAs = f => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); };
async function out(d) {
  if (navigator.share && (!d.files || (navigator.canShare && navigator.canShare({ files: d.files })))) {
    try { await navigator.share(d); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  if (d.files) { d.files.forEach(saveAs); say('Fitxategia deskargatu da. Partekatu zure aplikazioetatik.'); return; }
  open('https://wa.me/?text=' + encodeURIComponent(d.text || d.title), '_blank');
}
const proj = () => { try { return JSON.parse(localStorage.getItem('mendimaps-v03') || 'null') || { project: 'MendiMaps', features: [] }; } catch (e) { return { project: 'MendiMaps', features: [] }; } };
const xe = s => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const gmaps = (a, o) => `https://www.google.com/maps?q=${a},${o}`;
function gpx(p) {
  const w = p.features.filter(f => f.geometry.type === 'Point').map(f => { const [x, y] = f.geometry.coordinates;
    return `<wpt lat="${y}" lon="${x}"><name>${xe(f.properties.name)}</name><desc>${xe(f.properties.description)}</desc></wpt>`; }).join('');
  const t = p.features.filter(f => f.geometry.type === 'LineString').map(f =>
    `<trk><name>${xe(f.properties.name)}</name><trkseg>${f.geometry.coordinates.map(c => `<trkpt lat="${c[1]}" lon="${c[0]}"></trkpt>`).join('')}</trkseg></trk>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="MendiMaps" xmlns="http://www.topografix.com/GPX/1/1">${w}${t}</gpx>`;
}
function summary(p) {
  const lines = p.features.map((f, i) => { const c = f.geometry.type === 'Point' ? f.geometry.coordinates : null;
    return `${i + 1}. ${f.properties.name || f.geometry.type}${f.properties.description ? ' — ' + f.properties.description : ''}${c ? '\n' + gmaps(c[1], c[0]) : ''}`; });
  return `${p.project}\n\n` + (lines.join('\n') || 'Elementurik ez.');
}
async function sharePoint(m) {
  const ll = m.getLatLng(), f = proj().features.find(f => f.geometry.type === 'Point' &&
    Math.abs(f.geometry.coordinates[1] - ll.lat) < 1e-6 && Math.abs(f.geometry.coordinates[0] - ll.lng) < 1e-6);
  const n = f ? f.properties.name : 'Puntua', d = f && f.properties.description ? '\n' + f.properties.description : '';
  const files = (await getPhotos(key(ll))).map((p, i) => new File([p.blob], `argazkia-${i + 1}.jpg`, { type: 'image/jpeg' }));
  out({ title: n, text: `${n}${d}\n${gmaps(ll.lat, ll.lng)}`, ...(files.length ? { files } : {}) });
}

const wrap = document.querySelector('.mapwrap');
wrap.insertAdjacentHTML('beforeend', `
<button class="fab" id="uShare" title="Partekatu" aria-label="Partekatu" style="left:12px;bottom:84px">${svg(ICON.share)}</button>
<button class="pill" id="phPill">${svg(ICON.cam)}<span>Argazkia atera</span></button>
<div class="sheet" id="shSheet"><h4>Partekatu<button id="shX" aria-label="Itxi">${svg(ICON.x)}</button></h4>
  <button class="btn wide" data-s="pos">Nire kokapena<span>Esteka eta koordenatuak</span></button>
  <button class="btn wide" data-s="sum">Puntuen laburpena<span>Testua: WhatsApp, posta…</span></button>
  <button class="btn wide" data-s="gpx">Trackak eta puntuak (GPX)<span>Fitxategia</span></button>
  <button class="btn wide" data-s="geo">Proiektu osoa (GeoJSON)<span>Fitxategia</span></button>
  <button class="btn wide" data-s="pho">Argazkiak<span>Gordetako azken 10ak</span></button></div>`);
const sh = $('shSheet');
$('uShare').onclick = () => {
  const o = !sh.classList.contains('open');
  ['uSheet', 'uDial', 'aside'].forEach(id => $(id).classList.remove('open')); sh.classList.toggle('open', o);
};
$('shX').onclick = () => sh.classList.remove('open');
['uLayers', 'uMenu', 'uTools'].forEach(id => $(id).addEventListener('click', () => sh.classList.remove('open')));
wrap.addEventListener('pointerdown', e => { if (!e.target.closest('.fab,.sheet,.pill,.item')) sh.classList.remove('open'); });
sh.addEventListener('click', async e => {
  const b = e.target.closest('[data-s]'); if (!b) return;
  const p = proj(), name = (p.project || 'mendimaps').replace(/[^\w-]+/g, '_'); sh.classList.remove('open');
  if (b.dataset.s === 'pos') navigator.geolocation.getCurrentPosition(g => {
    const a = g.coords.latitude, o = g.coords.longitude;
    out({ title: 'Nire kokapena', text: `Nire kokapena: ${a.toFixed(5)}, ${o.toFixed(5)}\n${gmaps(a, o)}` });
  }, () => say('Ezin izan da kokapena lortu'), { enableHighAccuracy: true, timeout: 15000 });
  if (b.dataset.s === 'sum') out({ title: p.project, text: summary(p) });
  if (b.dataset.s === 'gpx') out({ title: p.project, files: [new File([gpx(p)], name + '.gpx', { type: 'text/plain' })] });
  if (b.dataset.s === 'geo') out({ title: p.project, files: [new File([JSON.stringify({ type: 'FeatureCollection', features: p.features }, null, 2)], name + '.geojson', { type: 'text/plain' })] });
  if (b.dataset.s === 'pho') {
    const all = await allPhotos(); if (!all.length) return say('Ez dago argazkirik');
    out({ title: p.project, files: all.slice(-10).map((x, i) => new File([x.blob], `argazkia-${i + 1}.jpg`, { type: 'image/jpeg' })) });
  }
});

/* --- Pantaila piztuta mantendu track-a grabatzen den bitartean --- */
let wl = null;
async function lock(on) {
  try {
    if (on && !wl) { wl = await navigator.wakeLock.request('screen'); wl.onrelease = () => { wl = null; }; }
    else if (!on && wl) { await wl.release(); wl = null; }
  } catch (e) {}
}
const rec = () => /■/.test($('trackBtn').textContent);
new MutationObserver(() => lock(rec())).observe($('trackBtn'), { childList: true, characterData: true, subtree: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && rec()) lock(true); });
})();
