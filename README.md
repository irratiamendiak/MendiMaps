# MendiMaps 0.4 — controles de navegación GPS

Prototipo web adaptable a móvil, tablet y ordenador.

## Novedades de 0.4
- Botón permanente para centrar el mapa en la posición GPS.
- Botón para activar/desactivar el seguimiento de la posición.
- Controles permanentes de zoom + y −.
- Indicador de estado y precisión GPS.

## Ejecutar en el ordenador
1. Descomprime el ZIP.
2. Abre la carpeta en Visual Studio Code.
3. Inicia Live Server desde `index.html`.
4. Se abrirá la aplicación en el navegador.

## Probar GPS
El GPS del navegador requiere permiso de ubicación y un contexto seguro (HTTPS o localhost). Un portátil puede no tener receptor GPS; en ese caso la ubicación puede ser aproximada o no estar disponible. Para probar el GPS real, abre la aplicación desde un móvil con HTTPS y concede permiso de ubicación.

## Cartografía y limitaciones
- OpenStreetMap es el mapa base. Las teselas estándar requieren conexión y no deben descargarse masivamente para uso offline.
- IGN y ortofoto de Gipuzkoa están configurados como fuentes remotas; todavía no están empaquetados localmente.
- Catastro Gipuzkoa está configurado como capa WMS; requiere conexión.
- Esta versión no incorpora todavía paquetes de mapas offline ni garantiza disponibilidad sin conexión.
- Leaflet y Leaflet.draw se cargan desde CDN, por lo que el primer arranque requiere Internet.
- La precisión GPS de un móvil normal puede variar varios metros; las mediciones son orientativas.

## Siguiente fase
Incorporar descarga/importación de cartografía con licencias compatibles, almacenamiento offline y datos catastrales locales.
