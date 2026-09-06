# SERRES DRIVE — serresdrive.com

Alquiler de coches de lujo en Sant Cugat del Vallès (área metropolitana de
Barcelona). Sitio estático en español, **sin framework y sin paso de build en
producción**: lo que hay en el repositorio es exactamente lo que sirve
Hostinger desde la raíz.

- **13 coches**, seis marcas. La flota real; no hay ningún coche en la web que
  no se pueda alquilar.
- **Reservas por WhatsApp**, con el mensaje prerrellenado por coche.
- **Un solo idioma en el DOM: español.** No hay conmutador ES/EN.
- **26 páginas** con `<title>`, `description`, `H1`, `canonical` y schema
  propios.

---

## 1. Cómo está montado

Las páginas HTML **se generan**. No se editan a mano: si tocas
`coches/audi-rsq3/index.html` directamente, el siguiente build lo pisa.

```
data/fleet.json        ← ÚNICA fuente de verdad: precios, slugs, fianzas,
                         fichas técnicas, textos y rutas de fotos
data/seo-meta.json     ← title / description / H1 / canonical de las 26 páginas

_build/                ← generadores (no los sirve nadie, pero viven en el repo
                         para que el sitio se pueda reconstruir)
  build-images.js        Sicur Cars/ → assets/img/cars/<slug>/ (JPG + WebP)
  build-data.js          fleet-base + fleet-specs + manifiesto → data/fleet.json
  build-seo-meta.js      data/fleet.json → data/seo-meta.json
  build-site.js          → las 26 páginas + 404.html + sitemap.xml
  build-redirects.js     → .htaccess + seo/redirects/
  verify.js              compara el HTML generado con los números del encargo
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
| Cambiar diseño | `css/serres.css` (hoja única) |
| Cambiar comportamiento | `js/site.js` (script único) |

Después de cualquier cambio en `css/` o `js/`, sube el cache-buster `V` en
`_build/build-site.js` y vuelve a generar.

---

## 2. Estructura de URLs

```
/                             portada: hero + rejilla de 6 marcas + contacto
/flota/                       catálogo con los 13 coches
/flota/{marca}/               porsche · lamborghini · mercedes-amg · audi ·
                              range-rover · volkswagen
/coches/{slug}/               13 fichas
/tarifas/                     una tabla con las 5 duraciones
/como-funciona/               4 pasos estáticos
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

**Motion:** solo hover y focus. No hay apariciones por scroll, ni carruseles,
ni drag, ni parallax — las tarjetas simplemente están en la página. `prefers-reduced-motion` desactiva hasta esas micro-interacciones.

---

## 7. Estado de las comprobaciones

Última verificación (06-09-2026, Chrome DevTools sobre el sitio generado):

- Lighthouse móvil — Accesibilidad **100**, Buenas prácticas **100**, SEO **100**
  en portada, ficha de coche y contacto.
- Sin scroll horizontal a 360 / 390 / 768 px.
- Consola sin errores ni avisos.
- `node _build/verify.js` → **212 comprobaciones, 0 fallos**.

## 8. Pendiente de confirmar con el propietario

Está recogido en `_build/OWNER-TODO.md`. Resumen: el teléfono y el WhatsApp
propios de Serres Drive, la fianza del Urus y del RS 6, si los 150 km son por
día o por alquiler, y las fichas técnicas de los coches marcados con confianza
media. Nada de eso está inventado en la web: donde falta el dato, la web dice
que se confirma por WhatsApp.
