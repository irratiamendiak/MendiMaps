/* MendiMaps · interfaz 0.6 — botones flotantes. Cargar después de offline.js y ANTES del script principal.
   No sustituye la lógica: pulsa los botones originales (ids de index.html). */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const wrap = document.querySelector('.mapwrap'), aside = $('aside');
const I = {
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  locate: '<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  follow: '<path d="M12 3l7 17-7-4-7 4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  rec: '<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',
  pin: '<path d="M12 21s-6-5.6-6-10a6 6 0 0112 0c0 4.4-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
  line: '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M6.5 16.5l11-9"/>',
  poly: '<path d="M12 3l8 6-3 11H7L4 9z"/>',
  walk: '<path d="M4 20l5-5 3 3 8-9"/><path d="M15 9h5v5"/>',
  check: '<path d="M5 12l5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  grid: '<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>',
  install: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'
};
const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const fab = (id, ic, t, cls = '') => `<button class="fab ${cls}" id="${id}" title="${t}" aria-label="${t}">${svg(I[ic])}</button>`;
const say = t => { const h = $('hint'); if (h) h.textContent = t; };

/* Cabecera */
const b = document.querySelector('.brand'), sub = 'MAPAK · GPSA · LANDA-LANA · 0.7';
b.innerHTML = `<svg viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#d8ed9b"/><path d="M5 24l8-13 5 8 3-4 6 9z" fill="#173b35"/></svg><span>MendiMaps<small>${sub}</small></span>`;

/* Construcción */
const T = [['pointBtnM', 'pin', 'Punto en mi posición'], ['pointBtn', 'pin', 'Punto tocando el mapa'],
           ['lineBtn', 'line', 'Línea'], ['polyBtn', 'poly', 'Área'], ['measureGpsBtn', 'walk', 'Medir andando'], ['offGrid', 'grid', 'Deskargatzeko koadrikula']];
const NAMES = { osm: ['Calles', 'OpenStreetMap'], ign: ['Topográfico', 'IGN raster'], gipuzkoaOrtho: ['Foto aérea', 'Gipuzkoa'] };
const cards = [...$('basemap').options].map(o => {
  const n = NAMES[o.value] || [o.text, ''];
  return `<button class="mapcard" data-v="${o.value}"><i class="sw-${o.value}"></i>${n[0]}<small>${n[1]}</small></button>`;
}).join('');
wrap.insertAdjacentHTML('beforeend', `
<div class="col" id="uTop">${fab('uLayers', 'layers', 'Mapas y capas')}${fab('uMenu', 'menu', 'Menú y proyecto')}${fab('uInstall', 'install', 'Instalar app', 'hid')}</div>
<div class="col" id="uMid">${fab('uLocate', 'locate', 'Mi posición')}${fab('uFollow', 'follow', 'Seguir mi posición')}${fab('uZin', 'plus', 'Acercar')}${fab('uZout', 'minus', 'Alejar')}</div>
${fab('uRec', 'rec', 'Grabar track')}
<button class="pill" id="uFin">${svg(I.check)}<span>Terminar</span></button>
<div id="uDial"><div class="dial-items">${T.map(([id, ic, l], i) =>
  `<button class="item" data-t="${id}" style="--i:${i}"><span>${l}</span><i class="fab">${svg(I[ic])}</i></button>`).join('')}</div>
  ${fab('uTools', 'plus', 'Herramientas de campo', 'main')}</div>
<div class="sheet" id="uSheet"><h4>Mapas y capas<button id="uSheetX" aria-label="Cerrar">${svg(I.x)}</button></h4>
  <div class="maps">${cards}</div>
  <label class="swrow"><span>Catastro (parcelas)</span><input type="checkbox" id="uCad"></label>
  <input type="range" id="uOp" min="0" max="100" value="85" style="width:100%;accent-color:#24584e" aria-label="Transparencia del catastro">
  <button class="btn wide" id="uOff">Mapas sin conexión…</button></div>`);

/* Abrir / cerrar (solo uno a la vez) */
const dial = $('uDial'), sheet = $('uSheet');
const closeAll = except => {
  if (except !== 'dial') dial.classList.remove('open');
  if (except !== 'sheet') sheet.classList.remove('open');
  if (except !== 'aside') aside.classList.remove('open');
};
$('uTools').onclick = () => { const o = !dial.classList.contains('open'); closeAll('dial'); dial.classList.toggle('open', o); };
$('uLayers').onclick = () => { const o = !sheet.classList.contains('open'); closeAll('sheet'); sheet.classList.toggle('open', o); };
$('uSheetX').onclick = () => closeAll();
$('uMenu').onclick = () => { const o = !aside.classList.contains('open'); closeAll('aside'); aside.classList.toggle('open', o); };
dial.addEventListener('click', e => { const it = e.target.closest('.item'); if (it) { $(it.dataset.t).click(); closeAll(); } });
wrap.addEventListener('pointerdown', e => { if (!e.target.closest('.fab,.item,.sheet,.pill')) closeAll('aside'); });

/* Botones que delegan en los originales */
$('uLocate').onclick = () => $('centerGpsBtn').click();
$('uFollow').onclick = () => $('followGpsBtn').click();
$('uZin').onclick = () => $('zoomInBtn').click();
$('uZout').onclick = () => $('zoomOutBtn').click();
$('uRec').onclick = () => {
  const rec = /■/.test($('trackBtn').textContent);
  if (!rec && /sin iniciar|detenido|Error|hasi gabe|geldituta|errorea/i.test($('gpsStatus').textContent)) $('gpsBtn').click();   // el track necesita GPS activo
  $('trackBtn').click();
};

/* Mapas y capas */
const bm = $('basemap'), selCard = () => document.querySelectorAll('.mapcard').forEach(c => c.classList.toggle('sel', c.dataset.v === bm.value));
document.querySelector('.maps').addEventListener('click', e => {
  const c = e.target.closest('.mapcard'); if (!c) return;
  bm.value = c.dataset.v; bm.dispatchEvent(new Event('change')); selCard();
});
bm.addEventListener('change', selCard); selCard();
$('uCad').onchange = e => { $('cadastreToggle').checked = e.target.checked; $('cadastreToggle').dispatchEvent(new Event('change')); };
$('uOp').oninput = e => { $('cadastreOpacity').value = e.target.value; $('cadastreOpacity').dispatchEvent(new Event('input')); };
$('uOff').onclick = () => {
  closeAll('aside'); aside.classList.add('open');
  const h = [...aside.querySelectorAll('h3')].find(x => /sin conexión|konexiorik gabe/i.test(x.textContent)); if (h) h.scrollIntoView({ behavior: 'smooth' });
};

/* Estado: grabación, "Terminar" y seguimiento */
let drawing = false, cur = null;
L.Map.addInitHook(function () {
  this.on('draw:drawstart', () => { drawing = true; sync(); });
  this.on('draw:drawstop', () => { drawing = false; sync(); });
});
if (L.Draw && L.Draw.Polyline) L.Draw.Polyline.addInitHook(function () { cur = this; });
const measuring = () => /✓/.test($('measureGpsBtn').textContent);
function sync() {
  const rec = /■/.test($('trackBtn').textContent), r = $('uRec');
  r.classList.toggle('on', rec); r.innerHTML = svg(rec ? I.stop : I.rec); r.title = rec ? 'Detener track' : 'Grabar track';
  $('uFin').classList.toggle('show', drawing || measuring());
  $('uFin').querySelector('span').textContent = measuring() ? 'Terminar medición' : 'Terminar dibujo';
  $('uFollow').classList.toggle('on', $('followGpsBtn').classList.contains('active'));
}
['trackBtn', 'measureGpsBtn', 'followGpsBtn'].forEach(id =>
  new MutationObserver(sync).observe($(id), { childList: true, characterData: true, subtree: true, attributes: true }));
$('uFin').onclick = () => {
  if (measuring()) { $('measureGpsBtn').click(); return; }
  if (cur && cur._enabled) {
    cur.completeShape();
    if (cur._enabled) { cur.disable(); say('Hacen falta más puntos: dibujo cancelado'); }
  }
};
sync();

/* Instalar como app (Android/Chrome: aviso nativo; iPhone/iPad: instrucciones) */
let dp = null;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const showInstall = () => $('uInstall').classList.remove('hid');
addEventListener('beforeinstallprompt', e => { e.preventDefault(); dp = e; showInstall(); });
addEventListener('appinstalled', () => $('uInstall').classList.add('hid'));
if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) showInstall();
$('uInstall').onclick = async () => {
  if (dp) { dp.prompt(); await dp.userChoice; dp = null; $('uInstall').classList.add('hid'); }
  else alert('En iPhone/iPad: pulsa Compartir y elige «Añadir a pantalla de inicio».');
};
})();
