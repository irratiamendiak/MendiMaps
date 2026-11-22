/* MendiMaps · euskara. Interfaze osoa euskaratzen du (testuak, atributuak, prompt/confirm/alert eta marrazketa-aholkuak).
   Kargatu ui.js eta lokala.js ondoren eta script nagusiaren aurretik. Testu berri bat gaztelaniaz ager bada, gehitu hiztegian. */
(() => {
'use strict';
const D = {
 'MendiMaps · GPS de campo':'MendiMaps · Landa-GPSa','● GPS sin iniciar':'● GPS hasi gabe','◌ Buscando GPS…':'◌ GPSa bilatzen…','● GPS detenido':'● GPSa geldituta','● Error GPS':'● GPS errorea',
 '● Grabar':'● Grabatu','＋ Punto':'＋ Puntua','⬡ Polígono':'⬡ Poligonoa',
 'Proyecto':'Proiektua','Guardar':'Gorde','Nuevo':'Berria','Herramientas de campo':'Landa-tresnak',
 '◎ Mi posición':'◎ Nire kokapena','Localizar GPS':'GPSa kokatu','● Grabar track':'● Grabatu tracka','Iniciar / parar':'Hasi / gelditu',
 '＋ Añadir punto':'＋ Puntua gehitu','Con atributos':'Atributuekin','／ Dibujar línea':'／ Lerroa marraztu','Medir distancia':'Distantzia neurtu',
 'Área y perímetro':'Azalera eta perimetroa','✓ Terminar dibujo':'✓ Marrazketa amaitu','Finalizar geometría':'Geometria amaitu',
 '◎ Medir andando':'◎ Oinez neurtu','Recorrer perímetro con GPS':'Ibili perimetroa GPSarekin','✓ Terminar medición':'✓ Neurketa amaitu',
 '■ Detener track':'■ Gelditu tracka','■ Detener':'■ Gelditu',
 'Mapa base':'Oinarri-mapa','IGN · Cartografía raster':'IGN · Kartografia rasterra','Ortofoto Gipuzkoa':'Gipuzkoako ortofotoa',
 'OpenStreetMap · requiere conexión; las teselas visitadas pueden quedar en caché.':'OpenStreetMap · konexioa behar du.',
 'OpenStreetMap · servicio público online. No admite descarga masiva de teselas.':'OpenStreetMap · online zerbitzu publikoa. Ez du lauzen deskarga masiborik onartzen.',
 'IGN · cartografía raster oficial. Las teselas vistas pueden quedar en caché local.':'IGN · kartografia raster ofiziala. Online kontsultatzen da; eremuak gorde ditzakezu konexiorik gabe erabiltzeko.',
 'Ortofoto Gipuzkoa · servicio WMS oficial B5M; requiere conexión salvo teselas previamente almacenadas.':'Gipuzkoako ortofotoa · B5M WMS zerbitzu ofiziala; online kontsultatzen da, gordetako lauzak izan ezik.',
 'Servicio WMS conectado, pero no se ha identificado automáticamente la capa de ortofoto.':'WMS zerbitzua konektatuta, baina ez da ortofoto-geruza automatikoki identifikatu.',
 'WMS de ortofoto configurado. No se pudo consultar GetCapabilities desde el navegador; puede requerir comprobación de CORS o conexión.':'Ortofotoaren WMSa konfiguratuta. Ezin izan da GetCapabilities kontsultatu; CORS edo konexioa egiaztatu beharko da.',
 'Capas superpuestas':'Gainjarritako geruzak','Catastro Gipuzkoa (parcelas)':'Gipuzkoako katastroa (lursailak)','Transparencia del Catastro':'Katastroaren gardentasuna',
 'WMS oficial B5M · necesita conexión. El parcelario offline se incorporará mediante GeoPackage.':'B5M WMS ofiziala · konexioa behar du. Lursail-datuak konexiorik gabe GeoPackage bidez gehituko dira.',
 'Catastro WMS activo · la visualización requiere conexión.':'Katastroaren WMSa aktibo · ikusteko konexioa behar da.',
 'Catastro WMS desactivado. Para uso offline se necesitará importar el GeoPackage oficial.':'Katastroaren WMSa desaktibatuta. Konexiorik gabe erabiltzeko GeoPackage ofiziala inportatu beharko da.',
 'Mediciones del proyecto':'Proiektuaren neurketak','Superficie':'Azalera','Perímetro':'Perimetroa','Distancia track':'Tracken distantzia','Elementos':'Elementuak',
 'Datos':'Datuak','↓ Exportar GeoJSON':'↓ GeoJSON esportatu','↓ Exportar track GPX':'↓ Tracka GPX esportatu','↑ Importar GeoJSON':'↑ GeoJSON inportatu','Vaciar proyecto':'Proiektua hustu',
 'Todavía no hay elementos.':'Oraindik ez dago elementurik.','Sin descripción':'Deskribapenik gabe','Editar ficha':'Fitxa editatu','Ver en mapa':'Mapan ikusi',
 'Activa el GPS o selecciona una herramienta para empezar':'Aktibatu GPSa edo aukeratu tresna bat hasteko','GPS: sin lectura':'GPS: irakurketarik ez','GPS: detenido':'GPS: geldituta',
 'Este navegador no permite geolocalización':'Nabigatzaile honek ez du geokokapenik onartzen','GPS detenido':'GPSa geldituta','GPS activo. Esperando posición…':'GPSa aktibo. Kokapenaren zain…',
 'Mapa centrado en tu posición':'Mapa zure kokapenean zentratuta','Buscando posición para centrar el mapa…':'Kokapena bilatzen mapa zentratzeko…',
 'Seguimiento de posición activado':'Kokapenaren jarraipena aktibatuta','Seguimiento de posición desactivado':'Kokapenaren jarraipena desaktibatuta',
 'Grabando track GPS… Mantén la pantalla activa':'Track GPSa grabatzen… Mantendu pantaila piztuta','Track detenido y guardado':'Tracka geldituta eta gordeta',
 'Toca el mapa para colocar un punto con atributos':'Ukitu mapa atributuak dituen puntu bat jartzeko','Punto guardado':'Puntua gordeta',
 'Dibuja la línea y termina con doble toque':'Marraztu lerroa eta amaitu ukitu bikoitzarekin','Dibuja el polígono y termina con doble toque':'Marraztu poligonoa eta amaitu ukitu bikoitzarekin',
 'Geometría guardada':'Geometria gordeta','Esperando una posición GPS válida…':'GPS kokapen baliozko baten zain…',
 'Recorre el perímetro a pie. Pulsa «Terminar medición» para cerrar el polígono.':'Ibili perimetroa oinez. Sakatu «Neurketa amaitu» poligonoa ixteko.',
 'Superficie medida y guardada':'Azalera neurtuta eta gordeta','Medición cancelada: hacen falta al menos 3 posiciones GPS':'Neurketa bertan behera: gutxienez 3 GPS kokapen behar dira',
 'Ficha actualizada':'Fitxa eguneratuta','Proyecto guardado en este dispositivo':'Proiektua gailu honetan gordeta','Proyecto nuevo':'Proiektu berria','GeoJSON importado':'GeoJSON inportatuta',
 'No se pudo guardar: almacenamiento lleno':'Ezin izan da gorde: biltegiratzea beteta','Dibujo finalizado si se había completado':'Marrazketa amaituta (osatuta bazegoen)',
 'Mi proyecto de campo':'Nire landa-proiektua','MendiMaps · Nuevo trabajo':'MendiMaps · Lan berria','Nuevo proyecto':'Proiektu berria',
 'Nombre del elemento:':'Elementuaren izena:','Descripción / observaciones (opcional):':'Deskribapena / oharrak (aukerakoa):','Categoría (opcional: trabajo, incidencia, referencia...)':'Kategoria (aukerakoa: lana, gorabehera, erreferentzia...)',
 'Nombre:':'Izena:','Descripción / observaciones:':'Deskribapena / oharrak:','Categoría:':'Kategoria:',
 '¿Crear un proyecto nuevo? Exporta antes los datos si quieres conservarlos.':'Proiektu berri bat sortu? Esportatu datuak aurretik gorde nahi badituzu.',
 '¿Eliminar todos los elementos del proyecto?':'Proiektuko elementu guztiak ezabatu?','No hay tracks guardados.':'Ez dago trackik gordeta.','No se ha podido leer el GeoJSON':'Ezin izan da GeoJSON irakurri',
 /* ui.js */
 'Mapas y capas':'Mapak eta geruzak','Menú y proyecto':'Menua eta proiektua','Instalar app':'Aplikazioa instalatu','Mi posición':'Nire kokapena','Seguir mi posición':'Jarraitu nire kokapena',
 'Acercar':'Hurbildu','Alejar':'Urrundu','Grabar track':'Grabatu tracka','Detener track':'Gelditu tracka','Cerrar':'Itxi','Transparencia del catastro':'Katastroaren gardentasuna',
 'Punto en mi posición':'Puntua nire kokapenean','Punto tocando el mapa':'Puntua mapan ukituz','Línea':'Lerroa','Área':'Azalera','Medir andando':'Oinez neurtu',
 'Calles':'Kaleak','Topográfico':'Topografikoa','IGN raster':'IGN rasterra','Foto aérea':'Argazki aireala','Catastro (parcelas)':'Katastroa (lursailak)',
 'Mapas sin conexión…':'Konexiorik gabeko mapak…','Terminar':'Amaitu','Terminar medición':'Neurketa amaitu','Terminar dibujo':'Marrazketa amaitu',
 'Hacen falta más puntos: dibujo cancelado':'Puntu gehiago behar dira: marrazketa bertan behera',
 'En iPhone/iPad: pulsa Compartir y elige «Añadir a pantalla de inicio».':'iPhone/iPad-en: sakatu Partekatu eta aukeratu «Gehitu hasierako pantailara».'
};
const P = [
 [/^Error GPS: /, 'GPS errorea: '], [/^Midiendo perímetro con GPS · (\d+) puntos$/, 'Perimetroa GPSarekin neurtzen · $1 puntu'],
 [/^Ortofoto Gipuzkoa · capa (.+) \(B5M\)$/, 'Gipuzkoako ortofotoa · $1 geruza (B5M)'],
 [/^Punto (\d+)$/, 'Puntua $1'], [/^Superficie (\d+)$/, 'Azalera $1'], [/^Línea (\d+)$/, 'Lerroa $1']
];
const tr = s => { if (typeof s !== 'string') return s; if (D[s] !== undefined) return D[s]; for (const [r, t] of P) if (r.test(s)) return s.replace(r, t); return s; };

function text(n) { const t = n.nodeValue, k = t.trim(); if (!k) return; const v = tr(k); if (v !== k) n.nodeValue = t.replace(k, v); }
function attrs(el) {
  for (const a of ['title', 'aria-label', 'placeholder']) { const v = el.getAttribute && el.getAttribute(a); if (v) { const w = tr(v); if (w !== v) el.setAttribute(a, w); } }
  if (el.tagName === 'INPUT' && el.type === 'text') { const w = tr(el.value); if (w !== el.value) el.value = w; }
}
function walk(n) {
  if (n.nodeType === 3) return text(n);
  if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.tagName)) return;
  attrs(n); n.childNodes.forEach(walk);
}
walk(document.body); document.title = tr(document.title); document.documentElement.lang = 'eu';
new MutationObserver(ms => ms.forEach(m => {
  if (m.type === 'characterData') text(m.target);
  else if (m.type === 'attributes') attrs(m.target);
  else m.addedNodes.forEach(walk);
})).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label'] });
setTimeout(() => document.querySelectorAll('input[type=text]').forEach(attrs), 400);   // proiektuaren izena script nagusiak jartzen du

const _p = window.prompt, _c = window.confirm, _a = window.alert;
window.prompt = (m, d) => _p.call(window, tr(m), tr(d));
window.confirm = m => _c.call(window, tr(m));
window.alert = m => _a.call(window, tr(m));

if (window.L && L.drawLocal) {                                  // Leaflet.draw-en aholkuak
  const h = L.drawLocal.draw.handlers;
  h.polyline.tooltip = { start: 'Egin klik lerroa marrazten hasteko', cont: 'Egin klik lerroa jarraitzeko', end: 'Egin klik azken puntuan amaitzeko' };
  h.polygon.tooltip = { start: 'Egin klik poligonoa marrazten hasteko', cont: 'Egin klik jarraitzeko', end: 'Egin klik lehen puntuan poligonoa ixteko' };
}
})();
