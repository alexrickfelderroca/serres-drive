# SERRES DRIVE — serresdrive.com

Alquiler de coches de lujo en Sant Cugat del Vallès (área metropolitana de
Barcelona). Sitio estático en español, **sin framework y sin paso de build en
producción**: lo que hay en el repositorio es exactamente lo que sirve
Hostinger desde la raíz.

- **13 coches**, seis marcas. La flota real; no hay ningún coche en la web que
  no se pueda alquilar.
- **Reservas por WhatsApp**, con el mensaje prerrellenado por coche.
- **Portada**: hero 3D con el Porsche sobre el techo de LED hexagonales del
  taller, cinco mosaicos de marca (foto generada de cuatro coches de la marca
  en nuestro taller + logo + «Ver coches») y la banda de Serres Wrap Center.
  Sin dirección postal en ninguna página: el propietario no la publica.
- **Cinco idiomas, cada uno con sus propias URLs:** español (raíz), inglés
  (`/en/`), ruso (`/ru/`), catalán (`/ca/`) y francés (`/fr/`), con `hreflang`
  entre las cinco y selector con banderas en el menú.
- **130 páginas** (26 × 5 idiomas) con `<title>`, `description`, `H1`,
  `canonical`, `hreflang` y schema propios.

---

## 1. Cómo está montado

Las páginas HTML **se generan**. No se editan a mano: si tocas
`coches/audi-rsq3/index.html` directamente, el siguiente build lo pisa.

```
data/fleet.json        ← ÚNICA fuente de verdad: precios, slugs, fianzas,
                         fichas técnicas, textos y rutas de fotos
data/seo-meta.json     ← title / description / H1 / canonical, por idioma
_build/i18n/es.json    ← DICCIONARIO FUENTE. Todo el texto de la web sale de
                         aquí; en.json / ru.json / ca.json / fr.json son su
                         traducción, con exactamente las mismas claves

_build/                ← generadores (no los sirve nadie, pero viven en el repo
                         para que el sitio se pueda reconstruir)
  build-images.js        Sicur Cars/ → assets/img/cars/<slug>/ (JPG + WebP)
  build-brand-shots.js   brand-shots-src/manifest.json (URLs de Higgsfield) →
                         originales en brand-shots-src/ → assets/img/brands/
                         <marca>.jpg|webp (1600) y <marca>-800.jpg|webp
  build-brand-logos.js   brand-logos-src/ (logos del propietario) →
                         assets/img/brands/logos/<marca>.png transparentes
  serve.js               servidor estático local (8131) para verificar
  build-data.js          fleet-base + fleet-specs + manifiesto → data/fleet.json
  build-seo-meta.js      data/fleet.json → data/seo-meta.json
  build-site.js          → las 26 páginas + 404.html + sitemap.xml
  build-redirects.js     → .htaccess + seo/redirects/
  how-map.js             mapa SVG del área metropolitana para /como-funciona
  verify.js              compara el HTML generado con los números del encargo
  shot.js · lh.js        capturas con métricas y Lighthouse con el Chrome del
                         sistema (puppeteer-core de la caché de npx), para
                         cuando el navegador del MCP lo retiene otra sesión
```

Un precio vive **en un solo sitio**. Cambiar `prices.d1` de un coche en
`data/fleet.json` y volver a generar mueve a la vez la tarjeta, la ficha del
coche, la tabla de `/tarifas` y el `Offer` de schema.org.

### Regenerar todo

```bash
node _build/build-data.js        # si has tocado _build/fleet-*.json
node _build/build-seo-meta.js
node _build/build-site.js
node _build/build-redirects.js
node _build/verify.js            # 212 comprobaciones; debe salir FAIL 0
```

`build-images.js` solo hace falta si cambian las fotos: necesita la carpeta
`Sicur Cars/` (los originales del propietario, ignorada por git) y `sharp`.

### Cambios habituales

| Quiero… | Toco… |
|---|---|
| Cambiar un precio o una fianza | `_build/fleet-base.json` → `build-data.js` → `build-site.js` |
| Corregir una ficha técnica o un texto | `_build/fleet-specs.json` → igual |
| Cambiar un title o una description | `_build/build-seo-meta.js` → `build-seo-meta.js` → `build-site.js` |
| Añadir o quitar un coche | `_build/fleet-base.json` + `_build/image-selection.json` → cadena completa |
| Cambiar diseño (todo menos portada) | `css/serres.css` |
| Cambiar la portada | `css/home.css`, `css/preloader.css`; el hero 3D en `js/experience.js`; el bloque `/* --- home` de `build-site.js` |
| Cambiar una foto o un logo de marca | `_build/brand-shots-src/manifest.json` → `build-brand-shots.js`; `_build/brand-logos-src/` → `build-brand-logos.js`; altura óptica de cada logo en `TILES` de `build-site.js` |
| Cambiar comportamiento | `js/site.js` (script único) |
| Cambiar la película de Cómo funciona | `css/how.css`, `js/how.js`, `_build/how-map.js` y el bloque `/como-funciona` de `build-site.js` |
| Cambiar un texto | `_build/i18n/es.json` **y su equivalente en los otros 4** |
| Añadir un idioma | un `<código>.json` en `_build/i18n/` + su código en `LANGS` |

El cache-buster `V` es un **hash del contenido** de `css/serres.css` + `js/site.js`,
así que se actualiza solo: cambia el CSS y cambia la URL. No hay que tocarlo a
mano — y no se puede olvidar, que es justo lo que pasó dos veces y dejó a los
navegadores con el CSS viejo cacheado (`immutable`, un año).

---

## 2. Estructura de URLs

Cada idioma cuelga de su prefijo; el español vive en la raíz. **Los segmentos
de ruta NO se traducen** (`/en/flota/`, no `/en/fleet/`): el slug de cada
coche tiene que ser idéntico en los cinco porque es el que llevan los
anuncios, y así el `hreflang` empareja las versiones sin una tabla de
equivalencias que mantener.

```
/  ·  /en/  ·  /ru/  ·  /ca/  ·  /fr/     mismas rutas bajo cada prefijo

/                             portada: hero 3D con scroll + mosaicos de
                              marcas + Wrap Center + CTA
/flota/                       catálogo con los 13 coches
/flota/{marca}/               porsche · lamborghini · mercedes-amg · audi ·
                              range-rover · volkswagen
/coches/{slug}/               13 fichas
/tarifas/                     una tabla con las 5 duraciones
/como-funciona/               los 4 pasos como película que avanza con el
                              scroll: desfile de la flota · chat de WhatsApp
                              · mapa con la ruta de entrega · el coche arranca
/condiciones-de-alquiler/
/por-que-serres/
/contacto/                    formulario → WhatsApp
/404.html
```

Son **directorios con `index.html`**, así que las URLs limpias funcionan sin
reescrituras. `.htaccess` solo se ocupa de los 301 y de la caché.

---

## 3. Redirecciones

`.htaccess` (generado) cubre **61 destinos 301**: las 13 fichas antiguas que
siguen vivas, las 18 de coches que salieron de la flota, las 6 páginas de marca
antiguas, las 5 páginas antiguas (`fleet.html` → `/flota/`…), `car.html?slug=`,
los 19 valores de `?marca=` y un comodín para cualquier `alquiler-*.html` que
no esté en la lista.

`RewriteRule` conserva la query string, así que **`gclid` y `utm_*` sobreviven
a cada salto**. Dentro del sitio lo hace `js/site.js`, que copia los parámetros
de la URL a todos los enlaces internos (los externos y los de `wa.me` se dejan
intactos).

> Tras cada deploy conviene comprobar los 301 con peticiones reales, no a ojo:
> `curl -sI https://serresdrive.com/alquiler-ferrari-barcelona.html | head -2`

---

## 4. Fotografía

Las fotos de la flota salen de las carpetas del propietario (`Sicur Cars/`, una
por coche). `_build/build-images.js` recorta cada una a 3:2 con un encuadre
centrado en el coche —`position:'attention'` de sharp se quedaba con la copa de
los árboles en las tomas de exterior— y escribe cuatro archivos por foto:

```
assets/img/cars/<slug>/alquiler-<slug>-barcelona-<n>.jpg      ~1200 px
assets/img/cars/<slug>/alquiler-<slug>-barcelona-<n>.webp
assets/img/cars/<slug>/alquiler-<slug>-barcelona-<n>-800.jpg   800 px
assets/img/cars/<slug>/alquiler-<slug>-barcelona-<n>-800.webp
```

Los originales llegan a 1290 px de ancho como mucho, así que **no se escala
hacia arriba**: 1200 px es el tope real. La calidad baja automáticamente hasta
que cada archivo entra en su presupuesto; todos los hero están por debajo de
150 KB. La foto 1 de cada coche es siempre un tres cuartos delantero, para que
las 13 tarjetas compartan encuadre aunque las sesiones sean distintas.

`_build/image-selection.json` es la selección y el orden, elegidos a ojo.

---

## 5. Deploy

Hostinger sirve **la raíz del repositorio**. Un push a `main` publica.

Todo lo que se comitea es accesible desde el dominio: por eso `Sicur Cars/`
(62 MB de originales) y el documento del encargo están en `.gitignore`.

---

## 6. Diseño

Tokens en `:root` de `css/serres.css`, heredados de serreswrapcenter.es:
lienzo casi negro (`#0a0a0b`), acento cromo/plata, **Barlow Condensed** para
titulares y **DM Sans** para texto.

Un solo sistema de botones (primario / secundario / fantasma, más las dos
variantes de WhatsApp). Sombras en capas y tintadas hacia el fondo, nunca negro
puro. Espaciado en la escala de 4/8 px.

**Motion:** en las páginas interiores, solo hover y focus — sin apariciones
por scroll ni carruseles; las tarjetas simplemente están ahí. Dos excepciones:
la **portada** (hero 3D con three.js y scroll suave con Lenis + GSAP
ScrollTrigger; el Porsche da una vuelta mientras bajas y se apaga cuando llega
la sección de marcas — el carrusel «Destacados» y el tubo de la flota se
quitaron el 07-09-2026 a petición del propietario), y **/como-funciona/**, que a petición del propietario es una
película en cuatro escenas que avanza con el scroll (mismo GSAP + ScrollTrigger
+ Lenis, escenarios pegados con `position:sticky`). En las dos, el marcado es
también el fotograma final: sin JS, sin GSAP o con `prefers-reduced-motion` se
ven quietas y completas (la clase `.fc-on` / `.film-on` que activa la
animación solo la añade el script).

**Tarifas en móvil:** por debajo de 860 px la tabla se pinta como tarjetas
(`role=` y `data-label` en el generador, CSS en `serres.css`), porque la tabla
de 720 px desplazada en horizontal dejaba los precios cortados.

---

## 7. Estado de las comprobaciones

Última verificación (07-09-2026, portada nueva; `_build/serve.js` + Chrome
DevTools MCP para las capturas, `_build/shot.js` para los idiomas y
reduced-motion, `_build/lh.js` para Lighthouse):

- Lighthouse móvil en portada, español y ruso — Accesibilidad **100**, Buenas
  prácticas **100**, SEO **100**, sin ninguna auditoría fallida (el enlace de
  la foto del taller llevaba un `aria-label` que no contenía su texto visible;
  arreglado). Escritorio, español: 100 / 100 / 100.
- Sin scroll horizontal en portada a 360 (ruso), 390 (los cinco idiomas) y
  1440 px. En ruso el titular ya cabe en móvil (antes «АВТОМОБИЛЕЙ» desbordaba
  y la página entera se alejaba): Barlow Condensed no tiene cirílico y el
  titular cae en la fuente de reserva, así que en ruso y francés lleva su
  propio tamaño en `css/home.css`. **Pendiente:** el nav de escritorio en ruso
  sigue desbordando entre 1151 y ~1560 px (etiquetas más largas; corte a menú
  móvil en 1150), anotado.
- Con `prefers-reduced-motion`: sin lienzo WebGL ni Lenis, el titular sobre el
  fondo del taller y los cinco mosaicos, medido en escritorio y móvil.
- Consola sin errores ni avisos; sin imágenes rotas ni peticiones fallidas en
  los cinco idiomas.
- `node _build/verify.js` → **656 comprobaciones, 0 fallos**.
- Capturas de las dos pasadas en `.screenshots/portada-marcas/` (ignorada por git).

## 8. Pendiente de confirmar con el propietario

Está recogido en `_build/OWNER-TODO.md`. Resueltos el 07-09-2026: el teléfono
de reservas es el del propietario (+34 649 66 33 80) y la dirección postal no se
publica (ni en contacto, ni en el schema, ni coordenadas). Resumen de lo que
queda: la fianza del Urus y del RS 6, si los 150 km son por
día o por alquiler, y las fichas técnicas de los coches marcados con confianza
media. Nada de eso está inventado en la web: donde falta el dato, la web dice
que se confirma por WhatsApp.
