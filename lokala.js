/* MendiMaps · gailuko mapa (.mbtiles errasterra) erabiltzeko — konexiorik gabe ere balio du.
   Kargatu ui.js ondoren eta script nagusiaren aurretik. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const SQL_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/';
let map = null, SQL = null, layer = null;
L.Map.addInitHook(function () { map = this; });

const Local = L.GridLayer.extend({
  createTile(c, done) {
    const img = document.createElement('img'); img.alt = '';
    const st = this.options.db.prepare('SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?');
    st.bind([c.z, c.x, 2 ** c.z - 1 - c.y]);                          // MBTiles: TMS errenkada
    if (st.step()) {
      const d = st.get()[0];
      img.onload = () => { URL.revokeObjectURL(img.src); done(null, img); };
      img.src = URL.createObjectURL(new Blob([d], { type: this.options.mime }));
    } else setTimeout(() => done(null, img), 0);
    st.free();
    return img;
  }
});
const loadSql = () => SQL ? Promise.resolve(SQL) : new Promise((ok, ko) => {
  const s = document.createElement('script'); s.src = SQL_BASE + 'sql-wasm.js';
  s.onload = () => initSqlJs({ locateFile: f => SQL_BASE + f }).then(x => ok(SQL = x), ko);
  s.onerror = () => ko(new Error('sql.js')); document.head.appendChild(s);
});

$('uOff').insertAdjacentHTML('beforebegin', `
<div class="swrow"><span>Gailuko mapa (.mbtiles)</span></div>
<label class="btn wide" style="display:block;text-align:center">Fitxategia aukeratu<input type="file" id="lokFile" hidden></label>
<div class="feature-list" id="lokInfo">Gailuan duzun mapa errasterra erabil dezakezu, konexiorik gabe ere. Saio bakoitzean fitxategia berriro aukeratu behar da.</div>
<input type="range" id="lokOp" min="0" max="100" value="100" hidden style="width:100%;accent-color:#24584e" aria-label="Gailuko mapa gardentasuna">
<button class="btn wide" id="lokOff" hidden>Gailuko mapa kendu</button>`);

const info = t => { $('lokInfo').textContent = t; };
$('lokFile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 300 * 1048576 && !confirm(`Fitxategi handia da (${Math.round(f.size / 1048576)} MB) eta gailuaren memoriara kargatuko da. Jarraitu?`)) return;
  try {
    info('Irakurtzen…');
    const SQLjs = await loadSql(), db = new SQLjs.Database(new Uint8Array(await f.arrayBuffer())), md = {};
    db.exec('SELECT name,value FROM metadata')[0].values.forEach(([k, v]) => md[k] = v);
    const fmt = (md.format || 'png').toLowerCase();
    if (fmt === 'pbf') throw new Error('pbf');
    const zr = db.exec('SELECT min(zoom_level),max(zoom_level) FROM tiles')[0].values[0];
    if (layer) map.removeLayer(layer);
    layer = new Local({ db, mime: fmt === 'jpg' || fmt === 'jpeg' ? 'image/jpeg' : 'image/' + fmt, minNativeZoom: zr[0], maxNativeZoom: zr[1],
      maxZoom: 20, zIndex: 5, attribution: md.name || f.name }).addTo(map);
    $('lokOp').hidden = $('lokOff').hidden = false; $('lokOp').value = 100;
    const b = (md.bounds || '').split(',').map(Number);
    if (b.length === 4 && b.every(isFinite)) map.fitBounds([[b[1], b[0]], [b[3], b[2]]]);
    info(`${md.name || f.name} · zooma ${zr[0]}–${zr[1]} · ${fmt}`);
    const h = $('hint'); if (h) h.textContent = 'Gailuko mapa kargatuta. Konexiorik gabe ere erabil daiteke.';
  } catch (err) {
    info('Ezin izan da fitxategia irakurri: MBTiles errasterra (png/jpg/webp) behar da.');
  }
  e.target.value = '';
};
$('lokOp').oninput = e => layer && layer.setOpacity(e.target.value / 100);
$('lokOff').onclick = () => {
  if (layer) map.removeLayer(layer); layer = null; $('lokOp').hidden = $('lokOff').hidden = true;
  info('Gailuko mapa kenduta.');
};
})();
