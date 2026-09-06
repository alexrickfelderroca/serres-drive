# Prompt para el chat nuevo — página «Cómo funciona»

Copia todo lo que hay entre las líneas y pégalo como primer mensaje de un chat
nuevo abierto en `c:\Users\Rickfelder\Desktop\serres-drive-main`.

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
- **El teléfono es `+34 621 24 44 69` y el WhatsApp sale de
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
