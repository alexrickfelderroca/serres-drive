# SERRES DRIVE — serresdrive.com

Alquiler de coches de lujo en Sant Cugat del Vallès (área metropolitana de
Barcelona). Sitio estático en español, **sin framework y sin paso de build en
producción**: lo que hay en el repositorio es exactamente lo que sirve
Hostinger desde la raíz.

- **26 coches**, siete marcas. Trece de la flota propia, en Barcelona, y trece
  del proveedor **Stratos**, repartidos por España (alta del 11-09-2026). La
  flota real; no hay ningún coche en la web que no se pueda alquilar.
- **Fianza, kilómetros incluidos y precio del kilómetro extra, por coche.**
  Lo que no está confirmado no se inventa: se dice «te lo confirmamos por
  WhatsApp», igual que ya se hacía con las fianzas desconocidas.
- **Ubicación por coche.** Los de la flota propia llevan «Barcelona»; los de
  Stratos salen sin ubicación a propósito, porque están dispersos.
- **Reservas por WhatsApp**, con el mensaje prerrellenado por coche.
- **Portada**: hero 3D con el Porsche sobre el techo de LED hexagonales del
  taller, cinco mosaicos de marca (foto generada de cuatro coches de la marca
  en nuestro taller + logo + «Ver coches») y la banda de Serres Wrap Center.
  Sin dirección postal en ninguna página: el propietario no la publica.
- **Cinco idiomas, cada uno con sus propias URLs:** español (raíz), inglés
  (`/en/`), ruso (`/ru/`), catalán (`/ca/`) y francés (`/fr/`), con `hreflang`
  entre las cinco y selector con banderas en el menú.
- **215 páginas** (43 × 5 idiomas) con `<title>`, `description`, `H1`,
  `canonical`, `hreflang` y schema propios, más una **404 por idioma**.
- **Consentimiento y medición** (12-09-2026): Consent Mode v2 antes de
  cualquier script de Google, aviso de cookies con aceptar / rechazar /
  configurar al mismo peso visual, tres páginas legales en los cinco idiomas
  y eventos de WhatsApp, teléfono, correo y formulario con conversiones de
  Google Ads. Los identificadores viven en `data/fleet.json` → `analytics`.

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
_build/i18n/legal/     ← los cuerpos de las tres páginas legales, uno por
                         idioma. Aparte de los diccionarios porque son textos
                         largos: dentro descuadrarían la alineación línea a
                         línea de los cinco archivos, que es lo que hace
                         evidente de un vistazo si a un idioma le falta algo

_build/                ← generadores (no los sirve nadie, pero viven en el repo
                         para que el sitio se pueda reconstruir)
  build-images.js        Sicur Cars/ y Stratos/ → assets/img/cars/<slug>/
                         (JPG + WebP). La carpeta origen de cada coche la
                         decide "root" en image-selection.json.
  build-brand-shots.js   brand-shots-src/manifest.json (URLs de Higgsfield) →
                         originales en brand-shots-src/ → assets/img/brands/
                         <marca>.jpg|webp (1600) y <marca>-800.jpg|webp
  build-brand-logos.js   brand-logos-src/ (logos del propietario) →
                         assets/img/brands/logos/<marca>.png transparentes
  serve.js               servidor estático local (8131) para verificar
  render-car-top.js      GT3 del hero visto desde arriba, fondo transparente
                         (three.js en el Chrome del sistema) → assets/img/how/
  build-data.js          fleet-base + fleet-specs + manifiesto → data/fleet.json
  build-seo-meta.js      data/fleet.json → data/seo-meta.json
  build-site.js          → las 43 páginas x 5 idiomas + una 404 por idioma
                         + sitemap.xml
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
node _build/verify.js            # 1.316 comprobaciones; debe salir FAIL 0
```

`build-images.js` solo hace falta si cambian las fotos: necesita `Sicur Cars/`
y `Stratos/` (los originales, las dos ignoradas por git) y `sharp`. `sharp` se
localiza con `_build/sharp-resolve.js`, que prueba varias rutas; si no aparece
por ninguna, el propio script dice cómo instalarlo. Antes estaba clavado con
ruta absoluta a un proyecto hermano que ya no existe.

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
| Cambiar la película de Cómo funciona | `css/how.css`, `js/how.js`, `_build/how-map.js`, `_build/render-car-top.js` (el coche cenital de la escena 04) y el bloque `/como-funciona` de `build-site.js` |
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
/flota/                       catálogo con los 26 coches
/flota/{marca}/               porsche · lamborghini · aston-martin ·
                              mercedes-amg · audi · range-rover · volkswagen
/coches/{slug}/               26 fichas
/tarifas/                     una tabla con las 5 duraciones, la fianza,
                              los km/día y el precio del km extra
/como-funciona/               los 4 pasos como película que avanza con el
                              scroll: desfile de la flota · chat de WhatsApp
                              · mapa con la ruta de entrega · el coche arranca
/condiciones-de-alquiler/
/por-que-serres/
/contacto/                    formulario → WhatsApp
/politica-de-privacidad/      RGPD: qué se hace con los datos
/politica-de-cookies/         qué cookies hay y cómo cambiar la decisión
/aviso-legal/                 LSSI: titular del sitio y condiciones de uso
/404.html                     una por idioma (/en/404.html, /ru/…). Cada
                              carpeta de idioma lleva su propio .htaccess con
                              su ErrorDocument: sin bloques <If>, que bajo
                              LiteSpeed pueden dar 500 en todo el sitio
```

Son **directorios con `index.html`**, así que las URLs limpias funcionan sin
reescrituras. `.htaccess` solo se ocupa de los 301 y de la caché.

---

## 3. Redirecciones

`.htaccess` (generado) cubre los destinos 301: las fichas antiguas que
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

Las fotos salen de dos carpetas de originales, una subcarpeta por coche:
`Sicur Cars/` (flota propia) y `Stratos/` (las del proveedor). Cuál se usa lo
dice `"root"` en `_build/image-selection.json`. `_build/build-images.js` recorta cada una a 3:2 con un encuadre
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
las 26 tarjetas compartan encuadre aunque los reportajes sean de dos
proveedores distintos.

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

### 13-09-2026 (5) — el botón de los mosaicos, transparente

El botón «Ver coches» de cada mosaico de marca era blanco macizo y tapaba la
foto del taller. Ahora deja verla.

**Un blanco translúcido no valía.** Medido pintando la página dos veces —una
normal y otra con el texto del botón en transparente— y leyendo con `sharp`
los píxeles reales que quedan debajo: con un velo blanco al 10 % el peor píxel
llegaba a `rgb(150,150,150)` y el contraste caía a **2,8:1**, muy por debajo
del mínimo AA de 4,5 (el texto es de 15 px y peso 600: no cuenta como texto
grande). Se cambió a un film **oscuro** al 44 %: sigue viéndose la foto a
través y las cinco marcas pasan con margen.

| marca | peor píxel | contraste |
|---|---|---|
| Porsche | rgb(93,98,104) | 6,05:1 |
| Lamborghini | rgb(106,108,111) | 5,18:1 |
| Mercedes-AMG | rgb(106,107,110) | 5,24:1 |
| Audi | rgb(107,111,113) | 4,99:1 |
| Volkswagen | rgb(106,108,113) | 5,17:1 |

Audi era el que mandaba: su foto tiene una zona clara justo bajo el botón y se
quedaba en 4,28:1 con el film al 34 %. El resto ya pasaba.

Sin borde a propósito: un contorno de 1 px sobre una figura achaflanada deja la
diagonal sin línea y parece un fallo de maquetación.

- 1.318 comprobaciones en 0 fallos · 32/32 funcionales · Lighthouse de la
  portada 100/100/100 en móvil y escritorio · capturas y medidas en
  `.screenshots/boton-transparente/`.

### 13-09-2026 (4) — el catálogo estaba apretado en escritorio

Reportado: en ordenador el catálogo se veía «muy compactado, pequeño y
apretado». Medido antes de tocar nada, en `/flota/`:

| pantalla | contenedor | aire muerto por lado | tarjeta | foto |
|---|---|---|---|---|
| 1366 | 1240 | 63 px | 355 px | 235 px |
| 1440 | 1240 | 100 px | 355 px | 235 px |
| 1920 | 1240 | **340 px** | 355 px | 235 px |
| 2560 | 1240 | 660 px | 355 px | 235 px |

La tarjeta **no crecía nunca**: el contenedor estaba clavado en `--maxw:1240px`
y en un monitor de 1920 se tiraban 340 px a cada lado, un 35 % de la pantalla.

1240 es el ancho correcto para una **columna de texto** — más allá, una línea
de prosa se lee mal. Pero una rejilla de tarjetas no es prosa. Se añade
`--maxw-wide:1680px` y la clase `.wrap--wide`, y la usan `/flota/` y las
páginas de marca. 1680 es el mismo ancho que ya usaba la barra de navegación,
con un comentario que describía este mismo problema. El `.lede` de dentro
sigue limitado por su propio `max-width` en `ch`, así que la rejilla se
ensancha sin estirar el párrafo.

Resultado: la tarjeta pasa de 355 px a **497 px en 1920 (+40 %)** y la foto de
235 a 330. En 1440, de 355 a 420 (+18 %).

**Las tarjetas se dimensionan ahora por su PROPIO ancho, no por el de la
pantalla** (`container-type:inline-size` + unidades `cqi`). Con `vw` pasaba
esto: en un monitor de 1920 el título se iba al tope de 29 px tanto en el
catálogo (tarjeta de 497 px, donde cuadra) como en la rejilla de «más de esta
marca» de las fichas, que sigue a 1240 con tarjetas de 351 px — ahí quedaba
apretado. Las reglas con `vw` se quedan debajo como respaldo para cualquier
navegador sin `@supports (container-type)`.

**Un fallo preexistente que salió por el camino:** `carCard()` emite `h2` en
`/flota/` y en las páginas de marca, y `h3` en la rejilla de las fichas. La
regla de estilo apuntaba solo a `.car-card h3`, así que **en todo el catálogo
el título de la tarjeta nunca recibió su estilo** y caía al tamaño por defecto
del navegador. Con `:is(h2,h3,h4)` vale para los tres. Efecto visible: los
nombres del catálogo ahora van en versalitas, como ya iban en las fichas.

- 1.318 comprobaciones en 0 fallos · 32/32 funcionales · Lighthouse de
  `/flota/` 100/100/100 en móvil **y** en escritorio · sin scroll horizontal ni
  imágenes rotas a 390, 1440 y 1920.
- Capturas en `.screenshots/catalogo-ancho/`.

### 13-09-2026 (3) — el lenguaje visual de Serres Wrap Center

A petición del propietario, la web de alquiler adopta el lenguaje visual de
la de detailing (`Serres web/Serres wrap center webpage/Serres wrap center V12`).
**Son dos marcas del mismo dueño y ahora se parecen a propósito** — es la
excepción deliberada a la regla de que dos proyectos no se parezcan.

Los valores NO se sacaron de una captura: se leyeron del CSS de la otra web.
Resultó que la mitad ya coincidía — las dos usan Barlow Condensed + DM Sans y
el mismo gradiente cromado (`--chrome` allí, `--chrome-grad` aquí, carácter por
carácter). Lo que faltaba era aplicarlo.

| | antes | ahora |
|---|---|---|
| Titulares `.h-lg` / `.h-md` | blanco sólido | cromado (`background-clip:text`) |
| Tracking de titular | −.015em (negativo) | +.012em |
| Interlineado de titular | 1.02 | .94 |
| Texto base | 16px | 17px |
| `--text` | `#e7e7ec` | `#f3f3f5` |
| `.lede` | `--text-dim`, 19px | `#d4d4d9`, 20px, 1.55 |
| `.eyebrow` | DM Sans 11px / .22em | Barlow Condensed 13px / .34em |
| Botones | píldora 999px, 17px / .06em | rectángulo, 15px / .14em |
| Paneles y spots | `border-radius:16px` | chaflán abajo-izquierda de 16px |
| Icono de WhatsApp | burbuja maciza | logo contorneado |

**La esquina cortada tiene tres trampas**, las tres comprobadas en pantalla y
documentadas en `css/serres.css`:

1. `clip-path` y `border-radius` no se sustituyen, **se intersecan**: sin poner
   el radius a 0 quedan tres esquinas redondas y una cortada.
2. `clip-path` **recorta la `box-shadow` exterior**. Las sombras de esos paneles
   ya no se veían; se han quitado en vez de dejarlas mintiendo. (`drop-shadow`
   en el mismo elemento tampoco sobrevive: haría falta un envoltorio.)
3. 🔴 El `outline` de foco global lleva `outline-offset:3px`, o sea **por fuera**
   de la caja, y el chaflán se lo come entero. Todo lo achaflanado que se puede
   enfocar lleva ahora el anillo hacia dentro. La web de detailing arrastra ese
   fallo en sus tarjetas: es lo único que NO se ha copiado.

Las **tarjetas de coche del catálogo** (`.car-card`), su galería y sus miniaturas
se quedan con las esquinas redondeadas, por decisión del propietario.

**La ciudad del titular rota**: Barcelona · Marbella · Ibiza · Madrid. Se pinta
con `content:` desde una variable CSS, **no como texto del DOM**: así el
`textContent` del H1 sigue siendo el canónico («…en Barcelona», el que coincide
con `data/seo-meta.json`). Con dos spans de texto el H1 renderizado decía
«…en Barcelonaen Marbella», y con uno solo Google podía capturar «en Madrid»
mientras el title y el canonical dicen Barcelona. Las formas no son mecánicas:
en ruso Ibiza es una isla y pide «на Ибице», y en catalán es Eivissa.

- 1.318 comprobaciones en 0 fallos · 32/32 funcionales · Lighthouse móvil
  100/100/100 en portada, ficha y contacto · sin scroll horizontal ni errores
  de consola en las 14 capturas.
- Capturas del antes y el después en `.screenshots/estilo-detailing/`.

**Pendiente de decisión, no de código:** si de verdad se opera en las cuatro
ciudades, el SEO sigue apuntando solo a Barcelona (títulos, descripciones,
`areaServed` del schema y la línea de entrega «Área metropolitana de
Barcelona»). El rotativo es una promesa visual que el SEO todavía no respalda.

### 13-09-2026 (2) — el Porsche no giraba al bajar rápido

Reportado: «si scrolleas rápido el coche se buguea y no hace el efecto de
girar». Eran **dos causas a la vez**, y las dos medidas antes de tocar nada
sumando el recorrido angular fotograma a fotograma al bajar el hero entero
(una vuelta entera = 6,283 rad):

| | despacio | normal | rápido | de un tirón |
|---|---|---|---|---|
| **antes** | 98 % | 26 % | 1 % | **1 %** |
| **después** | 99 % | 95 % | 86 % | 79 % |

**1. `wrapPi()` mataba el giro.** El seguimiento del yaw envolvía el error en
(−π, π] porque «el yaw es modular». Cierto, pero la vuelta completa es
exactamente `SPINS = 2π`: al bajar rápido la pose avanzaba casi 2π de golpe,
`wrapPi` lo convertía en ~0 y el coche **se quedaba quieto**. Cuanto más
rápido bajabas, menos giraba. Quitado: `ry` es continua en `p`, así que no hay
ambigüedad modular que resolver, y un salto real lo acota el techo de rad/s.

**2. La pista era de media pantalla.** El giro se repartía en
`.brands.offsetTop − 52 % de pantalla` = **432 px en escritorio, 405 en móvil**:
0,48 pantallas para 360°. Cualquier deslizamiento se la comía de un trago.
Ahora `--hero-pista: 110svh` reparte la vuelta en ~1,6 pantallas.

Esa es la forma de que «el scroll vaya lento ahí» **sin secuestrar el dedo**:
sin tocar la inercia nativa, sin `syncTouch` (que en iOS da problemas) y sin
pelearse con quien solo quiere llegar abajo.

**La pista solo existe si el coche existe** (`body.sd-home`). Sin WebGL, sin JS
o con `prefers-reduced-motion` vale 0 y la página vuelve a 5,4 pantallas: si no,
sería el hueco vacío del 12-09 otra vez, por otro camino. Verificado en los tres.

También: el techo de giro baja de 18 a 9 rad/s (18 dejaba la vuelta en 0,35 s,
que no se ve girar, se ve parpadear) y el coche deja de renderizarse cuando ha
**terminado** la vuelta, no a los N ms — antes se congelaba a mitad de giro y lo
que se desvanecía era una foto quieta.

- Se probó 4,2 rad/s y era peor: el coche se quedaba tan rezagado que aparcaba
  sin terminar, y seguía girando después de parar el dedo. Queda anotado.
- 1.318 comprobaciones en 0 fallos · 32/32 funcionales · Lighthouse móvil de la
  portada 100 / 100 / 100 · capturas en `.screenshots/giro-hero/`.

### 13-09-2026 — el Porsche vuelve al hero en móvil

El cambio del 12-09 apagaba el hero 3D en `<=960px` y en los clics de anuncio,
para ahorrar los 1,49 MiB de `gt3.glb`. **Revertido el mismo dia siguiente**: el
«hero estático» al que caía NO tiene coche, así que la mitad de abajo de la
portada se quedaba vacía. Lo notaron varias personas desde el móvil, y en
escritorio le pasaba además a quien llegaba con `gclid` — la visita pagada.

Lo que **sí se conserva** es saltarse el preloader en los clics de anuncio: ahí
el ahorro son 4,3 s de scroll bloqueado y no deja ningún hueco.

La lección, escrita también al lado del código en `js/experience.js`: **no se
apaga un elemento visual sin poner algo en su lugar.** Si algún día se quiere
volver a ahorrar ese peso, primero hay que renderizar un WebP del propio
`gt3.glb` con `_build/render-car-top.js` (el de `/como-funciona` pesa 46 KB) y
enseñarlo donde estaba el coche; entonces sí.

- **32/32 comprobaciones funcionales**, tres de ellas nuevas: el hero 3D
  arranca en móvil, hay lienzo y el modelo está visible, y `gt3.glb` se
  descarga. Esa es justo la comprobación que faltaba el 12-09 — nada medía que
  el coche siguiera ahí.
- Capturas del antes y el después en `.screenshots/hero-movil-incidencia/`.

### 12-09-2026 — consentimiento, medición y páginas legales

El navegador del MCP de Chrome DevTools **no estaba levantado**, así que todo
se midió con `_build/shot.js` y `_build/lh.js` (Chrome del sistema con
puppeteer-core), que es para lo que existen.

- `node _build/verify.js` → **1.316 comprobaciones, 0 fallos** (antes 1.218).
  Las nuevas cubren, en las 220 páginas servidas: que el consentimiento se
  declara **antes** de cargar gtag, que en la portada va antes que
  `preloader.js`, que existe `window.SD_PAGE`, que hay `tel:`, que ningún
  `wa.me` se queda sin `data-placement`, que no se cuela el marcador
  `G-XXXXXXXXXX`, que sin datos fiscales no se imprime ningún bloque de
  identificación, y que las tres legales y las cinco 404 existen y están
  enlazadas.
- **29/29 comprobaciones funcionales** en Chrome, interceptando `dataLayer`
  para leer lo que se envía de verdad: consentimiento por defecto denegado,
  aceptar → `consent update` + `sd_consent` guardado, recarga sin reaparecer,
  `whatsapp_click` y `phone_click` con su conversión y su `send_to`,
  `form_submit` con el teléfono en E.164 y **sin** `whatsapp_click` duplicado,
  `filter_brand`, y la portada con `?gclid=` sin preloader.
- Lighthouse móvil en portada, `/contacto/`, ficha de coche y
  `/politica-de-privacidad/` — Accesibilidad **100**, Buenas prácticas **100**,
  SEO **100**. Dos auditorías se arreglaron por el camino: el enlace `tel:`
  del pie tenía un `aria-label` que no contenía su texto visible (WCAG 2.5.3)
  y el enlace del aviso decía «Más información» a secas.
- Ficha en móvil: el precio del día pasa de **758 px** (al borde de una
  pantalla de 844 y tapado por la barra verde) a **366 px**, y el H1 de 589 a
  196. El aviso de cookies se coloca **encima** de `.sticky-wa`, sin taparla.
- Sin scroll horizontal a 390 px ni a 1440 en ninguna página nueva; consola
  sin errores, sin imágenes rotas.
- **Pendiente, y NO es de este cambio:** el nav de escritorio en ruso desborda
  a 1440 px (1.564 px de ancho). Medido idéntico antes y después contra un
  worktree en `HEAD`, y ya estaba anotado abajo desde el 07-09.
- Capturas de las dos pasadas en `.screenshots/tracking-consent-legal/`.

### 07-09-2026 — portada nueva

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
