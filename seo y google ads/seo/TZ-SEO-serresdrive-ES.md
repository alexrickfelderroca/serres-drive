# Especificación técnica SEO — serresdrive.com (rediseño)

**Para:** programador del rediseño · **Versión:** 03.09.2026 · **Complementa:** `TZ-tracking-serresdrive-ES.md`

**Por qué:** el sitio actual tiene buena base técnica (canonical, schema, alt, sitemap), pero
Google recibe hoy más de 20 páginas de coches que no existen, precios que no son, y cada H1 en
dos idiomas a la vez. El rediseño debe conservar lo bueno y corregir esto sin perder las URLs que
ya tienen antigüedad.

**Archivos que acompañan a este documento** (carpeta `seo/`):

| Archivo | Uso |
|---|---|
| `seo-meta.json` | `<title>`, `description`, `h1`, `canonical`, tipos de schema, migas de pan y enlaces internos de **cada** página. Renderizar el `<head>` desde aquí, no a mano |
| `sitemap.xml` | Sitemap del sitio nuevo (29 URLs). Actualizar `<lastmod>` con la fecha real de publicación |
| `redirects/_redirects` · `redirects/htaccess.txt` | 52 redirecciones 301 del sitio antiguo al nuevo, en dos formatos |
| `../fleet.json` | Los 13 vehículos, precios, slugs. Única fuente de precios y nombres |

---

## 1. URLs

- Sin `.html`, minúsculas, guiones, **sin barra final**: `/flota`, `/flota/porsche`, `/coches/porsche-911-carrera-s`.
- `/flota/porsche` con barra final o con mayúsculas → 301 a la forma canónica.
- **Páginas de marca estáticas**: `/flota/porsche`, `/flota/lamborghini`, `/flota/mercedes-amg`, `/flota/audi`,
  `/flota/range-rover`, `/flota/volkswagen`. Cada una es HTML propio con su `<head>`, no un estado JavaScript de `/flota`.
- `/flota?marca=porsche` → 301 a la página estática (incluido en `redirects/`).
  Si la URL trae otros parámetros (`?marca=porsche&gclid=…`), `/flota` aplica el filtro en el cliente y **no** redirige.
- Slugs de coche: exactamente los de `fleet.json`. Son también los destinos de los anuncios.
- Una URL por página. Nada de `#seccion` como destino de menú para contenido indexable.
- 404 personalizada (código HTTP 404, no 200) con enlaces a `/flota` y WhatsApp.

## 2. Un idioma por URL

El sitio actual mete español e inglés en el mismo DOM y Google ve `<h1>Alquiler Porsche en BarcelonaRent a Porsche in Barcelona</h1>`.

- **Fase 1: solo español.** `<html lang="es">`. Eliminar el conmutador ES/EN y todo el texto en inglés del HTML.
- Fase 2 (cuando se decida): versión inglesa como páginas separadas bajo `/en/…` con el mismo slug, y en **ambas** versiones:

```html
<link rel="alternate" hreflang="es" href="https://serresdrive.com/coches/porsche-911-carrera-s">
<link rel="alternate" hreflang="en" href="https://serresdrive.com/en/cars/porsche-911-carrera-s">
<link rel="alternate" hreflang="x-default" href="https://serresdrive.com/coches/porsche-911-carrera-s">
```

Hasta entonces, **ningún** `hreflang`.

## 3. `<head>` de cada página — desde `seo-meta.json`

Para la página con `url` = ruta actual:

```html
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="https://serresdrive.com{og_image o imagen hero}">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
```

Límites ya respetados en el JSON: title ≤ 65 caracteres, description 110–160. Si se cambia un precio en `fleet.json`,
se regenera el JSON (`python3 build_seo_meta.py`); no editar títulos a mano.

## 4. Encabezados y texto

- **Un solo `<h1>`** por página = campo `h1` del JSON. En la ficha de coche: `Alquiler {modelo} en Barcelona` (no solo el nombre del modelo, como ahora).
- Ficha de coche, orden fijo de `<h2>`: `Tarifas` → `Especificaciones` → `Para quién es este coche` → `Cómo reservar` → `Preguntas frecuentes` → `También te puede interesar`.
- El precio por día y el botón de WhatsApp están **antes** del primer `<h2>`, visibles sin scroll en móvil.
- Texto mínimo: ficha 400 palabras, marca 300, hub 250. Los textos los entrega el propietario según `content-plan.md`; no publicar fichas con solo tabla y foto.
- Nada de texto oculto (`display:none`, pestañas cerradas con contenido SEO). Lo que Google debe leer, el usuario lo ve.

## 5. Datos estructurados (JSON-LD)

Un bloque `<script type="application/ld+json">` por página con un `@graph`. Tipos por página en el campo `schema` del JSON.

**En todas las páginas** — organización (sustituye teléfono y email por los de Serres Drive):

```json
{
  "@type": "AutoRental",
  "@id": "https://serresdrive.com/#org",
  "name": "Serres Drive",
  "url": "https://serresdrive.com/",
  "telephone": "+34XXXXXXXXX",
  "email": "EMAIL_SERRES_DRIVE",
  "image": "https://serresdrive.com/RUTA/og-home.jpg",
  "address": { "@type": "PostalAddress", "streetAddress": "Av. Can Fatjó dels Aurons, 15",
               "postalCode": "08174", "addressLocality": "Sant Cugat del Vallès",
               "addressRegion": "Barcelona", "addressCountry": "ES" },
  "areaServed": ["Barcelona", "Sant Cugat del Vallès", "Aeropuerto de Barcelona-El Prat"],
  "priceRange": "80 € - 1.000 € / día",
  "sameAs": ["URL_INSTAGRAM_SERRES_DRIVE"]
}
```

**Migas de pan** (todas menos la home) — del campo `breadcrumb` + la página actual:

```json
{ "@type": "BreadcrumbList", "itemListElement": [
  { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://serresdrive.com/" },
  { "@type": "ListItem", "position": 2, "name": "Flota", "item": "https://serresdrive.com/flota" },
  { "@type": "ListItem", "position": 3, "name": "Porsche", "item": "https://serresdrive.com/flota/porsche" },
  { "@type": "ListItem", "position": 4, "name": "Porsche 911 Carrera S" } ] }
```

**`/flota` y páginas de marca** — `ItemList` con un `ListItem` por coche (`url` = ficha, `name` = nombre).

**Ficha de coche** — `Product` con oferta por día y las demás duraciones, datos de `fleet.json`:

```json
{
  "@type": "Product",
  "name": "Porsche 911 Carrera S",
  "brand": { "@type": "Brand", "name": "Porsche" },
  "category": "Alquiler de coches de lujo",
  "image": ["https://serresdrive.com/RUTA/porsche-911-carrera-s-1.jpg"],
  "url": "https://serresdrive.com/coches/porsche-911-carrera-s",
  "offers": {
    "@type": "Offer",
    "url": "https://serresdrive.com/coches/porsche-911-carrera-s",
    "priceCurrency": "EUR",
    "price": "700",
    "priceSpecification": [
      { "@type": "UnitPriceSpecification", "price": "700",  "priceCurrency": "EUR", "unitCode": "DAY", "name": "1 día" },
      { "@type": "UnitPriceSpecification", "price": "3500", "priceCurrency": "EUR", "unitCode": "WEE", "name": "1 semana" },
      { "@type": "UnitPriceSpecification", "price": "7500", "priceCurrency": "EUR", "unitCode": "MON", "name": "1 mes" }
    ],
    "availability": "https://schema.org/InStock",
    "seller": { "@id": "https://serresdrive.com/#org" }
  }
}
```

**FAQ** (fichas, marcas, `/como-funciona`, `/condiciones-de-alquiler`, landings) — `FAQPage` con las preguntas
visibles en la página, mismas palabras. **`/como-funciona`** — además `HowTo` con los 4 pasos.

No marcar como `Product` coches que no estén en `fleet.json`. No usar `AggregateRating` sin reseñas reales en la página.

## 6. Enlaces internos

- Menú: Flota · Tarifas · Cómo funciona · Por qué Serres · Contacto. Footer: los mismos + legales + una sola línea «Serres Wrap Center».
- Home: 6 tarjetas de marca → `/flota/{marca}` (Porsche, Lamborghini, Mercedes-AMG, Audi, Range Rover, Volkswagen).
- Cada ficha enlaza a: su página de marca, 2–3 coches relacionados (campo `links_to`), `/tarifas`, `/como-funciona`, `/condiciones-de-alquiler`.
- Cada página de marca enlaza a todas sus fichas y a las otras marcas.
- Migas de pan **visibles** (no solo en JSON-LD), con enlaces reales.
- Textos de enlace descriptivos: «Alquiler Porsche 911 Carrera S», nunca «ver más» / «aquí».
- Reservar un bloque «Guías relacionadas» al final de cada ficha para los artículos del blog (fase 3), vacío hasta entonces.

## 7. Imágenes

- Nombre de archivo: `alquiler-{slug}-barcelona-{n}.jpg` (p. ej. `alquiler-mercedes-amg-g63-barcelona-1.jpg`).
- `alt` obligatorio y descriptivo: `Mercedes-AMG G63 de alquiler en Barcelona, vista frontal`.
- Formatos WebP/AVIF con `<picture>` y respaldo JPG; `srcset` con 480/960/1440 px; `width` y `height` siempre (sin CLS).
- Hero de la ficha: `<link rel="preload" as="image">` + `fetchpriority="high"`. Resto: `loading="lazy"`.
- Peso objetivo: hero ≤ 150 KB, tarjetas ≤ 60 KB.
- Rellenar `image` en `fleet.json` con la ruta del hero de cada coche: de ahí salen `og:image`, el `Product.image` y el feed de Performance Max.
- Ninguna foto de coches que no estén en la flota, ni siquiera decorativa.

## 8. Rendimiento

Objetivos en móvil (Lighthouse / PageSpeed): **LCP < 2,5 s · CLS < 0,1 · INP < 200 ms · puntuación ≥ 90**.

- Eliminar GSAP (71 KB), Lenis (13 KB, servido desde unpkg) y los scripts de sliders/parallax/preloader del sitio actual: el rediseño no tiene esas animaciones.
- Presupuesto JS propio ≤ 60 KB; CSS crítico inline, el resto en un archivo.
- Máximo dos familias tipográficas, `font-display: swap`, `preconnect` a `fonts.gstatic.com`.
- Todo el HTML se sirve renderizado (estático o SSR). Nada del contenido indexable depende de JavaScript.
- Cache: `Cache-Control` largo para assets con hash en el nombre; HTML sin cache larga.

## 9. Sitemap y robots

- Publicar `seo/sitemap.xml` en `/sitemap.xml` con `<lastmod>` reales (fecha de publicación o del último cambio de precio). Solo URLs canónicas con 200 e indexables; sin las páginas de fase 2 hasta que existan.
- `/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /gracias
Sitemap: https://serresdrive.com/sitemap.xml
```

(`/gracias` = página de confirmación del formulario, si existe; no indexar.)

- Sin `noindex` en ninguna página de fase 1, legales incluidas.

## 10. Redirecciones 301

- Aplicar `redirects/_redirects` (Netlify, Cloudflare Pages, Vercel con adaptación) **o** `redirects/htaccess.txt` (Apache). Nginx: misma tabla con `return 301`.
- Las páginas de coches que ya no están en la flota van a su marca (si sigue existiendo) o a `/flota`; nunca a la home.
- Mantener las reglas **al menos 12 meses**. Comprobar tras publicar:

```
curl -I https://serresdrive.com/alquiler-porsche-barcelona.html      → 301 → /flota/porsche
curl -I https://serresdrive.com/alquiler-ferrari-f8-spider-barcelona.html → 301 → /flota
curl -I https://serresdrive.com/fleet.html                            → 301 → /flota
curl -I "https://serresdrive.com/flota?marca=porsche"                 → 301 → /flota/porsche
```

- Nada de cadenas (A → B → C) ni redirecciones 302.

## 11. Verificación antes de entregar

1. `curl -s URL | grep -c "<h1"` = 1 en cada página, y el H1 no contiene texto en inglés.
2. Rich Results Test de Google en una ficha, una marca, `/como-funciona` y `/flota`: sin errores en Product, BreadcrumbList, FAQPage, ItemList.
3. PageSpeed Insights móvil de `/coches/mercedes-amg-g63`: ≥ 90 y LCP < 2,5 s.
4. `/sitemap.xml` válido, todas las URLs responden 200 y coinciden con el canonical.
5. Los 4 `curl -I` de la sección 10 devuelven 301 a la URL correcta, sin cadenas.
6. Ninguna página contiene `serreswrapcenter.es` como email/teléfono, ni menciona Ferrari, Huracán, BMW, McLaren, Aston Martin, Maserati, Alfa Romeo, Abarth, Macan, 718, Clio ni motos.
7. Buscar en el HTML de todas las páginas `data-lang` → 0 resultados.
8. Propietario: propiedad de Search Console para `serresdrive.com` verificada por DNS, sitemap enviado, «Solicitar indexación» en `/`, `/flota`, las 6 marcas y las 4 fichas prioritarias (G63, Urus, RS6, 911).
