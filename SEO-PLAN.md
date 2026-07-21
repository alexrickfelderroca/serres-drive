# SERRES DRIVE — Plan SEO

Objetivo: dominar las búsquedas de alquiler de coches de lujo en Barcelona, en
español primero y en inglés después. Basado en una auditoría de 7 dimensiones
(metadatos, datos estructurados, técnico, contenido, rendimiento, imagen/local,
y investigación en vivo de las SERPs competidoras) verificada contra el código
y contra resultados de búsqueda reales.

La conclusión central de la investigación de mercado: **las búsquedas con
dinero ("alquiler ferrari barcelona", "alquiler lamborghini urus barcelona")
las ganan páginas dedicadas por marca y por modelo, nunca homepages**. GT
Rentals, DriveMe, Red Fox y Rentlux rankean con exactamente esa estructura.
Ahora nosotros también la tenemos — con una ventaja: nuestros precios por día
publicados (500–900 €/día en varios modelos) baten a los agregadores que
muestran 750–1.600 €/día o "consultar precio".

---

## FASE 1 — IMPLEMENTADO (este commit)

### Arquitectura: una página real por coche y por marca
- **31 páginas estáticas por modelo** — `alquiler-<slug>-barcelona.html` —
  generadas por `tools/build-seo-pages.js` desde `js/fleet.js`. Cada una con:
  título único con precio ("Alquiler Porsche 911 Targa GTS en Barcelona —
  desde 800 €/día"), descripción única, canonical propio, OG/Twitter con la
  foto real del coche (dimensiones de píxel reales), JSON-LD `Product`+`Car`
  con **todas** las tarifas publicadas (los 4 coches sin precio/día ya no
  quedan sin `price`), `BreadcrumbList`, y la ficha completa pre-renderizada
  (h1, specs, tabla de precios, highlights) **crawleable sin JavaScript**.
  `js/car.js` las hidrata en la ficha interactiva (slug derivado del nombre
  del archivo).
- **6 páginas de marca** — `alquiler-{ferrari,lamborghini,porsche,mercedes,audi,bmw}-barcelona.html`
  con copy original ES/EN, tarjetas estáticas de sus coches, `ItemList` y
  enlaces cruzados entre marcas.
- Antes: las 31 fichas eran `car.html?slug=…` y **todas declaraban como
  canonical la shell vacía** — invitación directa a que Google colapsara el
  inventario entero en una página genérica. Eliminado el canonical de la
  shell; `.htaccess` hace 301 de cada URL antigua a su página nueva.

### Técnico
- **`.htaccess` nuevo**: 301 www→apex (www servía el sitio entero en 200),
  301 `/index.html`→`/`, 301 `car.html?slug=X`→página estática, caché
  immutable de 1 año para assets versionados (?v=), no-cache para HTML,
  `ErrorDocument 404`.
- **`404.html` con marca** (antes: plantilla genérica de Hostinger en inglés).
- **Soft-404 arreglado**: slug inexistente inyecta `noindex` vía JS.
- **`sitemap.xml` regenerado**: 43 URLs canónicas (6 core + 6 marcas + 31
  modelos), `lastmod` real por archivo desde git, sin la shell `car.html`.
- **Favicons completos**: `favicon.ico` raíz, PNG 96px, `apple-touch-icon.png`
  180px (iOS no acepta SVG) — renderizados del mark SD real.
- Enlaces internos `index.html` → `/` en todo el sitio.

### Contenido crawleable (antes: casi todo era JS)
- **fleet.html**: lista estática de los 31 coches con anchors descriptivos
  ("Alquiler Ferrari F8 Spider en Barcelona — Descapotable · 720 CV · desde
  1.200 €/día") — la galería JS la reemplaza al cargar. Antes la página servía
  ~60 palabras y **cero** enlaces a coches; 26 de 31 fichas no tenían ni un
  solo enlace interno estático en todo el sitio.
- **rates.html**: las 31 filas de la tabla pre-renderizadas; el nombre de cada
  coche ahora enlaza a su ficha (antes: a WhatsApp — 31 anchors perfectos
  regalados a un dominio externo). La fila sigue abriendo WhatsApp al tocar.
- **how.html**: sección FAQ visible (7 preguntas: reserva, entrega/aeropuerto,
  fianza, duraciones, requisitos, estado del coche, IVA) + `FAQPage` JSON-LD
  que la refleja literalmente. Solo afirma lo que el sitio ya se compromete a
  cumplir.
- **contact.html**: sección "Zona de entrega" con geografía concreta
  (Barcelona ciudad, El Prat T1/T2, Sant Cugat, Sitges, Castelldefels,
  Maresme) — la promesa de entrega por fin tiene territorio.

### Señales on-page
- **Home**: un único `h1` ("Alquiler de coches de lujo **en Barcelona**") —
  antes eran TRES h1 fragmentados sin "Barcelona". Título con ancla de precio
  ("desde 120 €/día" — honesto: el Abarth publica 120 €/día).
- Slides destacados: `<h2>` ahora "Lamborghini Urus" (marca como eyebrow
  pequeño), alt "…de alquiler en Barcelona", enlaces a las páginas nuevas.
- Jerarquía de encabezados reparada: eyebrow del proceso → `h2` (how), `h4`→`h3`
  + `h2` nuevo (why), `h5` del footer → `<p class="foot-h">` en todo el sitio.
- Títulos afinados: rates (+"en Barcelona"), why (sin marca duplicada),
  contact (+"Sant Cugat"), og:title del home con keywords (antes: "Conduce tu
  sueño", cero keywords).
- `og:image:width/height/alt` en todas las páginas (WhatsApp/Facebook pueden
  no mostrar imagen en el primer share sin dimensiones — crítico cuando la
  reserva ES WhatsApp).
- Alts con contexto de alquiler+ciudad en galería de flota, cards y ficha.

### Entidad local (JSON-LD)
- **Geo corregido**: 41.4890/2.0823 (las coordenadas apuntaban a Mira-sol, a
  ~3 km de la dirección declarada — señal local contradictoria).
- **Entidades separadas**: `sameAs` ya no afirma que Serres Drive ES
  serreswrapcenter.es; la relación real se expresa con `parentOrganization`.
- `areaServed` tipado (Barcelona, Sant Cugat, AMB), `hasMap`, `logo`,
  `currenciesAccepted`, `WebSite.publisher`, `inLanguage`.
- Nodo `AutoRental` de referencia (mismo `@id`) en TODAS las páginas +
  `BreadcrumbList` en cada subpágina.
- Bug real: la ficha del Porsche 911 Targa GTS mostraba un póster del
  Mercedes C220 de Sicurcars (con SU precio). Eliminado del media-map.

### Mantenimiento
`node tools/build-seo-pages.js` regenera páginas de coches/marcas, lista
estática de flota, filas de tarifas y sitemap. **Ejecutar tras cada cambio en
`js/fleet.js` y commitear el resultado.**

---

## FASE 2 — SIGUIENTE (recomendado, en orden)

1. **Google Business Profile "Serres Drive"** — la señal local que más mueve.
   Hoy el NAP entero apunta al listing del Wrap Center. Crear perfil propio
   (categoría "Servicio de alquiler de coches", misma dirección, idealmente
   email/teléfono distinguible), enlazarlo en `hasMap`/`sameAs` y en el footer.
2. **Search Console + indexación**: dar de alta la propiedad, enviar
   sitemap.xml, pedir indexación de las 37 páginas nuevas, vigilar cobertura.
3. **Backlink del hermano**: un enlace desde serreswrapcenter.es con anchor
   "SERRES DRIVE — alquiler de coches de lujo en Barcelona". Es el enlace más
   fácil y más relevante que existirá nunca para este dominio.
4. **Árbol /en/**: espejo estático en inglés (extensión natural del
   generador — el copy EN ya existe en `data-en` y `taglineEn`), con
   `hreflang` recíproco es/en/x-default. Hasta entonces, **no** añadir
   hreflang: con las dos lenguas en la misma URL sería markup inválido.
   El SERP inglés ("rent lamborghini barcelona") es un mercado separado que
   hoy no podemos ganar.
5. **Páginas de categoría**: `alquiler-coches-deportivos-barcelona.html`,
   descapotables, SUV — mismo patrón generador; los SERPs de categoría los
   ganan páginas dedicadas (Europcar, SIXT, RentLuxeCar).
6. **Página de aeropuerto**: "Alquiler de coches de lujo aeropuerto
   Barcelona-El Prat" — cluster entero con competencia débil (LC Barcelona).
7. **Modelos con SERP débil primero** (marketing): DBX 707, McLaren 570S,
   RS6 Avant, Cayenne Turbo GT casi no tienen competidores reales; nuestros
   precios publicados baten a los agregadores. Empujar esas páginas
   (interlinking, GBP posts) antes que pelear Urus/F8.
8. **Reseñas**: pedir reseñas Google al devolver cada coche; cuando existan,
   valorar `aggregateRating` en el JSON-LD (nunca antes).
9. **Fotografía propia**: sustituir las imágenes scrape de Sicurcars (llevan
   su logo y sus precios) por fotos propias `<slug>-2.jpg…` con alts
   descriptivos; añadirlas a un `ImageObject` por coche.
10. **Contenido editorial**: 1–2 guías ("Cuánto cuesta alquilar un Lamborghini
    en Barcelona", con precios reales de fleet.js) — el formato listicle/guía
    rankea en SERPs comerciales de este nicho.
11. **Rendimiento**: pesar assets/img (varios JPG >300 KB), servir WebP/AVIF
    con `<picture>`, y auditar CWV con la página ya desplegada (la caché
    nueva de `.htaccess` ayuda; el three.js del home queda fuera del LCP
    porque el poster estático pinta primero).

## Qué NO hacer
- No añadir hreflang sin URLs separadas por idioma (markup inválido).
- No marcar FAQPage en páginas sin Q&A visible.
- No inventar `aggregateRating` sin reseñas reales.
- No copiar títulos/estructura de Sicurcars: mismo inventario y mismos precios
  — si además sonamos igual, Google preferirá siempre al dominio veterano.
