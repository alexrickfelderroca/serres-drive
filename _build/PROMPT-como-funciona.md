# Encargo: rehacer la página «Cómo funciona»

> **Cómo usar este archivo.** Abre un chat nuevo en
> `c:\Users\Rickfelder\Desktop\serres-drive-main` y escribe una sola línea:
>
> ```
> Lee _build/PROMPT-como-funciona.md entero y ejecútalo.
> ```
>
> No hace falta copiar nada. Todo lo que sigue son las instrucciones.

---

Vas a rehacer **una sola página** de serresdrive.com: `/como-funciona/`. El
resto del sitio no se toca.

## Qué quiero

Que sea una **peliculita que avanza con el scroll**. Ahora mismo son cuatro
tarjetas estáticas y quiero que cada paso se represente con una animación que
se dispare al llegar a él:

1. **ELIGE TU COCHE** — un carrusel de coches pasando de lado, como si
   desfilaran. Que se vean varios de la flota cruzando la pantalla.
2. **RESERVA** — la animación de alguien escribiendo por WhatsApp. Una
   conversación que se va tecleando sola: «Hola Serres, me gustaría conducir
   este coche», con el globo de mensaje, el «escribiendo…», y la respuesta.
3. **ENTREGA** — un mapa con un pin: «te lo llevamos aquí». Que se vea el área
   metropolitana de Barcelona y el punto de entrega.
4. **CONDUCE** — el coche arrancando y saliendo de plano.

Según vas bajando, la película va ocurriendo. No quiero cuatro cajas quietas.

## Cuándo está bien hecho

Estos son los criterios con los que se va a juzgar. Si alguno no se cumple, no
está terminado:

1. **Se ve una película, no una lista.** Bajando de un tirón, los cuatro pasos
   se encadenan. Cada uno tiene movimiento propio, no el mismo *fade-in* cuatro
   veces con distinto texto.
2. **Los cuatro momentos son reconocibles sin leer el texto.** Coches
   desfilando · alguien tecleando en WhatsApp · un mapa con un punto · un coche
   que se va. Si tapas los títulos y no se entiende qué pasa en cada escena,
   falta trabajo.
3. **El texto del cliente se lee entero y con calma.** La animación acompaña al
   texto, no compite con él ni lo tapa.
4. **En móvil funciona igual de bien.** No es una versión degradada: es la misma
   película adaptada. Se comprueba a 360, 390 y 768 px.
5. **Con `prefers-reduced-motion` la página sigue siendo entendible y útil.**
   Quieta, pero completa.
6. **Carga igual en los cinco idiomas.** Ver la comprobación de más abajo.
7. **No baja ninguna métrica.** Lighthouse de accesibilidad sigue en 100,
   consola limpia, sin scroll horizontal.

## Margen de decisión

El *cómo* de cada escena es tuyo: la idea está descrita, la ejecución no.
Puedes proponer algo mejor que lo literal si lo argumentas. Dos cosas que están
deliberadamente abiertas y conviene que resuelvas tú con criterio:

- **El «vídeo» de alguien escribiendo en WhatsApp** no tiene que ser un vídeo.
  Una recreación de la conversación en HTML/CSS —globos, «escribiendo…», el
  mensaje apareciendo letra a letra— se ve mejor, pesa mucho menos y se traduce
  a los cinco idiomas. Un vídeo real no.
- **El «mapa 3D»** no necesita Google Maps ni Mapbox (ver reglas). Un mapa
  estilizado del área metropolitana en SVG, con el pin cayendo, encaja con la
  estética del sitio y no añade dependencias ni cookies de terceros.

**Enseña el resultado antes de darlo por cerrado**: capturas de las cuatro
escenas, en escritorio y en móvil. Es una página muy visual y hay que verla,
no describirla.

## Antes de escribir código, lee esto

- **`README.md`** — cómo está montado el sitio. Es importante: las páginas
  **se generan**, no se editan a mano. Si tocas `como-funciona/index.html`
  directamente, el siguiente build lo pisa.
- **`_build/build-site.js`** — el generador. La página vive en el bloque
  `/* --- /como-funciona --- */`.
- **`_build/i18n/es.json`** → sección `how` — de ahí salen los textos de los
  cuatro pasos. **El sitio está en cinco idiomas** (es, en, ru, ca, fr): todo
  texto nuevo que añadas tiene que ir al diccionario español y a los otros
  cuatro (`_build/i18n/<código>.json`), con las mismas claves. Si te falta una
  clave en un idioma, `_build/verify.js` te lo dice.
- **`css/home.css`, `css/featured.css`, `js/experience.js`, `js/featured.js`**
  — la portada ya tiene animación por scroll con GSAP + ScrollTrigger + Lenis.
  Mira cómo está hecha antes de inventar otra cosa: conviene que las dos
  páginas se muevan con el mismo vocabulario.

## ⚠️ Las dos trampas que ya han mordido en este proyecto

Las dos las he pisado yo montando la portada. Si haces animación con assets,
las vas a pisar igual, así que léelas antes de escribir nada.

### 1. Las rutas de los assets en el JS tienen que ser ABSOLUTAS

El sitio está en cinco idiomas. La portada existe en `/`, `/en/`, `/ru/`,
`/ca/` y `/fr/`. Una ruta relativa dentro de un `.js` se resuelve contra la
página que lo carga, no contra la raíz:

```js
loader.load("assets/models/gt3.glb")    // desde /en/ pide /en/assets/... → 404
loader.load("/assets/models/gt3.glb")   // correcto
```

Esto tuvo el 3D del Porsche y las texturas del tubo **sin cargar en los cuatro
idiomas que no son español**, y no daba ningún error visible: el módulo
simplemente se rendía. Si tu película carga imágenes, vídeos, sprites o un
mapa desde JavaScript, **compruébalo en `/ru/` además de en `/`**, y no des por
buena una página hasta haberla visto en los cinco.

En el HTML generado hay dos profundidades distintas y confundirlas rompe medio
sitio:

- `r` → sube a la raíz del **idioma**. Para enlaces entre páginas.
- `ra` → sube a la raíz del **sitio**. Para `css/`, `js/` y `assets/`.

### 2. Las imágenes se cachean: si cambias una, cambia su URL

`.htaccess` cachea los assets. El nombre de archivo de una foto lo fija el slug
del coche y **no cambia cuando cambia la foto**, así que sustituir una imagen
no llega a quien ya haya entrado. Pasó con el Urus: los archivos eran del coche
negro y los visitantes seguían viendo el amarillo, miniaturas incluidas.

Ya está resuelto y tienes que seguir el mismo patrón:

- En el HTML, usa el helper **`asset(ruta)`** de `_build/build-site.js`: añade
  `?v=<hash del contenido>` solo.
- Si cargas una imagen **desde JavaScript**, no pasa por el generador: publica
  una versión como se hace con `window.SERRES_RING_V` (la calcula
  `_build/build-home-assets.js` sobre los propios archivos) y añádela a la URL.

Y una consecuencia práctica al desarrollar: **si cambias una imagen y no la ves
cambiar en el navegador, no estás loco — es la caché.** Recarga con
Ctrl+Shift+R antes de perseguir un fantasma.

## Reglas del proyecto que no puedes saltarte

- **Los textos de los cuatro pasos son del cliente y están fijados en el
  encargo.** Puedes envolverlos en animación, pero no reescribirlos:
  - `01 ELIGE TU COCHE` — Elige tu vehículo de nuestra flota disponible.
  - `02 RESERVA` — Contacta por WhatsApp, confirma fechas y condiciones.
  - `03 ENTREGA` — Recoge el vehículo o solicita la entrega. Entrega y recogida
    en el área metropolitana: 100 €.
  - `04 CONDUCE` — Disfruta del viaje y devuelve el vehículo en el plazo
    acordado.
- **Sólo se pueden enseñar los 13 coches de la flota.** Están en
  `data/fleet.json`. Ni un Ferrari de decoración: el encargo lo prohíbe
  expresamente («ни как декорация»).
- **`prefers-reduced-motion` tiene que dejar la página usable y quieta.** No es
  opcional; el resto del sitio ya lo respeta.
- **Nada de bibliotecas nuevas.** GSAP, ScrollTrigger y Lenis ya están (por
  CDN, en la portada). Si necesitas el mapa, hazlo con SVG o canvas: no metas
  Google Maps ni Mapbox sin preguntar.
- **El teléfono es `+34 649 66 33 80` y el WhatsApp sale de
  `data/fleet.json` → `contact`.** No inventes números para la animación de
  la conversación; usa el real o un chat sin número visible.

## Cómo se construye y se comprueba

```bash
node _build/build-site.js      # regenera las 130 páginas
node _build/verify.js          # 656 comprobaciones, tiene que dar FAIL 0
```

Servidor local para mirarlo:

```bash
npx serve -l 8123 .
```

**Verificación obligatoria antes de dar nada por hecho** (está en
`~/.claude/rules/web-verification.md`): capturas antes y después a 1440×900 y
390×844 con Chrome DevTools MCP, consola limpia, sin scroll horizontal a
360/390/768, y Lighthouse de accesibilidad. La página actual ya da 100/100/100
— no la dejes peor.

**Y una comprobación específica de este sitio, que no es opcional:** la página
tiene que cargar **igual en los cinco idiomas**. Compruébalo midiendo, no a
ojo — así se cazó que el 3D no arrancaba fuera del español:

```js
// en la consola, o con evaluate_script sobre iframes de cada idioma
for (const p of ['/como-funciona/', '/en/como-funciona/', '/ru/como-funciona/',
                 '/ca/como-funciona/', '/fr/como-funciona/']) {
  // comparar: nº de imágenes rotas, elementos clave presentes,
  // scripts que arrancaron, altura del documento
}
```

Si una versión carga algo que otra no, es un bug, no una diferencia de idioma.

## Deploy

Hostinger sirve la raíz del repositorio: un push a `main` publica. Dos avisos
que ya han mordido en este proyecto:

- El cache-buster es un hash del contenido, así que se actualiza solo. No lo
  toques.
- **No hagas `git add -A` a ciegas.** Dos veces se han colado en el repo
  público cosas que no debían (la carpeta de Google Ads del propietario y 8,5
  MB de fotos originales). Mira `git status` antes de preparar el commit.

## Contexto de lo que ya se hizo

Está todo en `_build/OWNER-TODO.md`, incluido lo que sigue pendiente de que
conteste el propietario. Para esta página te importan dos cosas:

- Las fotos de la flota son capturas de móvil de 1.092–1.448 px de ancho. Si tu
  animación amplía un coche a pantalla completa, se va a ver blanda. Cuenta con
  ello al diseñar los planos.
- Los logos de las seis marcas no están todavía (los tiene que enviar el
  propietario); si el carrusel del paso 1 los necesita, usa las fotos.

---
