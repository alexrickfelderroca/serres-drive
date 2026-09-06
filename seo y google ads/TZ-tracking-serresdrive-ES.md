# Especificación técnica: analítica, consentimiento y conversiones — serresdrive.com (rediseño)

**Para:** programador del rediseño de Serres Drive · **Versión:** 03.09.2026

**Por qué:** las reservas de Serres Drive llegan por WhatsApp, formulario y teléfono. Google Ads solo
puede optimizar si ve esos clics como conversiones. Todo lo de abajo debe estar en producción
**antes** de activar cualquier campaña — es la condición de arranque de la publicidad.

**Orden de trabajo:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → verificación (sección 10).

---

## 0. Datos pendientes (bloqueantes)

| Dato | Valor | Quién lo entrega |
|---|---|---|
| ID de medición GA4 | `G-XXXXXXXXXX` — propiedad **nueva** «Serres Drive» (**no** usar `G-1K6FYZ99GN`, es de Serres Wrap Center) | propietario |
| ID de conversión Google Ads | `AW-XXXXXXXXX` | propietario (script `setup_serresdrive_conversions.py`) |
| Etiquetas de conversión | `LABEL_WHATSAPP`, `LABEL_FORM`, `LABEL_PHONE` | propietario (mismo script) |
| Número WhatsApp Serres Drive | `34XXXXXXXXX` (sin «+», sin espacios) | propietario |
| Teléfono Serres Drive | `+34 XXX XX XX XX` | propietario |
| Email Serres Drive | reemplaza `info@serreswrapcenter.es` en todo el sitio (footer, formulario, schema, mailto, metadata) | propietario |

Hasta recibirlos, dejar los placeholders **exactamente** como están escritos aquí: se sustituyen con
buscar‑y‑reemplazar en un solo paso.

**Fuente de datos del sitio:** `fleet.json` (entregado junto a este documento). Los 13 vehículos, sus
precios, el `slug` de cada página `/coches/{slug}` y el valor `brand_slug` del filtro `/flota?marca=`
salen de ahí. Los slugs **no se pueden cambiar**: son las URLs de destino de los anuncios.

---

## 1. Consent Mode v2 — en `<head>`, ANTES de cualquier script de Google, en todas las páginas

España = UE = RGPD. Sin Consent Mode v2 Google Ads descarta los datos del sitio para audiencias y
modelado de conversiones.

```html
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}

  // 1) Estado por defecto: todo denegado hasta que el usuario decida
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', true);   // conserva gclid en la navegación si se rechaza

  // 2) Si ya eligió en una visita anterior, aplicar su decisión
  try {
    var sdc = JSON.parse(localStorage.getItem('sd_consent') || 'null');
    if (sdc && sdc.v === 1) gtag('consent', 'update', sdc.state);
  } catch (e) {}
</script>
```

**Banner de cookies** (visible en la primera visita, bloquea solo la esquina inferior, no la página):

- Tres botones con el mismo peso visual: **«Aceptar»**, **«Rechazar»**, **«Configurar»**.
- «Configurar» muestra dos interruptores: *Analítica* (`analytics_storage`) y *Publicidad*
  (`ad_storage` + `ad_user_data` + `ad_personalization`).
- Al pulsar cualquiera de los botones:

```js
function sdSaveConsent(analytics, ads) {
  var state = {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: ads ? 'granted' : 'denied',
    ad_user_data: ads ? 'granted' : 'denied',
    ad_personalization: ads ? 'granted' : 'denied'
  };
  gtag('consent', 'update', state);
  try { localStorage.setItem('sd_consent', JSON.stringify({v: 1, state: state, t: Date.now()})); } catch (e) {}
  // ocultar el banner
}
// Aceptar → sdSaveConsent(true, true) · Rechazar → sdSaveConsent(false, false)
```

- Enlace «Cambiar preferencias de cookies» en el footer que vuelve a abrir el banner.
- Páginas legales **en español**: `/politica-de-privacidad` y `/politica-de-cookies`, enlazadas desde el
  banner y el footer. Sin ellas Google rechaza los anuncios en la revisión.

---

## 2. Google tag (gtag.js) — en `<head>`, justo después del bloque de consentimiento

```html
<!-- Google tag (gtag.js): GA4 + Google Ads -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
  gtag('config', 'AW-XXXXXXXXX', { allow_enhanced_conversions: true });
</script>
```

(`window.dataLayer` y `gtag` ya existen por el bloque de la sección 1 — no redeclararlos.)

---

## 3. Datos de página — cada página declara qué es

En `<head>`, después del gtag, **en cada página**, generado desde `fleet.json`:

```html
<script>
  window.SD_PAGE = {
    page_type: 'coche',                 // 'home' | 'flota' | 'coche' | 'tarifas' | 'como_funciona' | 'contacto' | 'legal' | '404'
    car_slug:  'mercedes-amg-g63',      // solo en page_type = 'coche'; si no, null
    car_name:  'Mercedes-AMG G63',      // idem
    car_brand: 'Mercedes-AMG',          // idem
    price_1d:  1000                     // idem, número, EUR
  };
</script>
```

Estos campos son los parámetros de los eventos de la sección 4. Sin `car_slug` y `price_1d` no
sabremos qué coches generan reservas y cuáles solo generan clics.

---

## 4. Eventos — un solo script antes de `</body>`, en todas las páginas

Envía cada acción a GA4 (evento con parámetros) y, las tres principales, también a Google Ads
como conversión directa.

```html
<script>
(function () {
  var P = window.SD_PAGE || {};
  var ADS = 'AW-XXXXXXXXX';
  var LABELS = { whatsapp_click: 'LABEL_WHATSAPP', form_submit: 'LABEL_FORM', phone_click: 'LABEL_PHONE' };

  function base() {
    return { page_type: P.page_type || null, car_slug: P.car_slug || null,
             car_brand: P.car_brand || null, price_1d: P.price_1d || null,
             page_path: location.pathname + location.search };
  }
  function track(name, extra) {
    if (typeof gtag !== 'function') return;
    var params = Object.assign(base(), extra || {});
    gtag('event', name, params);                                   // GA4
    if (LABELS[name]) {                                            // Google Ads
      gtag('event', 'conversion', { send_to: ADS + '/' + LABELS[name],
                                    value: P.price_1d || 0, currency: 'EUR' });
    }
  }
  window.SD = window.SD || {};
  window.SD.track = track;

  // Clics en WhatsApp / teléfono / email — delegación, cubre enlaces añadidos dinámicamente
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a || !a.href) return;
    var h = a.href;
    if (h.indexOf('wa.me') !== -1 || h.indexOf('api.whatsapp.com') !== -1) {
      track('whatsapp_click', { link_url: h, placement: a.getAttribute('data-placement') || null });
    } else if (h.indexOf('tel:') === 0) {
      track('phone_click', { link_url: h });
    } else if (h.indexOf('mailto:') === 0) {
      track('email_click', { link_url: h });
    }
  }, true);

  // Vistas de página con valor para audiencias
  if (P.page_type === 'coche')   track('view_car');
  if (P.page_type === 'tarifas') track('view_tarifas');
})();
</script>
```

**Desde el código del filtro de `/flota`** (sección 6), al aplicar una marca:

```js
window.SD && SD.track('filter_brand', { brand: marcaSeleccionada });   // p. ej. 'porsche'
```

**Desde el formulario de contacto**, solo tras el envío **correcto** (respuesta OK del servidor,
nunca al pulsar el botón):

```js
// Enhanced conversions: datos del cliente ANTES del evento; Google los hashea en el navegador
gtag('set', 'user_data', {
  email: form.email.value.trim().toLowerCase(),
  phone_number: sdE164(form.phone.value)          // '+34612345678'
});
window.SD && SD.track('form_submit', {
  car_slug: form.car.value || null,                // slug elegido en el selector «Car»
  dates: form.dates.value || null,
  source_page: document.referrer || null
});

function sdE164(v) {                              // normaliza a formato +34XXXXXXXXX
  var d = String(v || '').replace(/[^\d+]/g, '');
  if (d.indexOf('+') === 0) return d;
  if (d.length === 9) return '+34' + d;
  if (d.indexOf('34') === 0 && d.length === 11) return '+' + d;
  return d ? '+' + d : '';
}
```

El campo «Car» del formulario es un `<select>` cuyos `value` son los `slug` de `fleet.json`
(opción «Sin decidir» = valor vacío).

### Tabla de eventos (resumen)

| Evento | Cuándo | Va a Ads como conversión | Parámetros clave |
|---|---|---|---|
| `whatsapp_click` | clic en cualquier enlace `wa.me` | **sí** | `car_slug`, `car_brand`, `price_1d`, `page_type`, `placement` |
| `form_submit` | envío correcto del formulario | **sí** (+ enhanced conversions) | `car_slug`, `dates`, `source_page` |
| `phone_click` | clic en `tel:` | **sí** | `page_type` |
| `email_click` | clic en `mailto:` | no | — |
| `view_car` | carga de `/coches/{slug}` | no (audiencias) | `car_slug`, `car_brand`, `price_1d` |
| `filter_brand` | filtro de marca aplicado en `/flota` | no | `brand` |
| `view_tarifas` | carga de `/tarifas` | no | — |

---

## 5. Botón de WhatsApp — mensaje prellenado

El cliente no debe explicar qué coche estaba mirando.

```js
function sdWaLink(carName, dateText) {
  var msg = 'Hola, me interesa alquilar ' + (carName ? 'el ' + carName : 'un coche');
  if (dateText) msg += ' - ' + dateText;
  return 'https://wa.me/34XXXXXXXXX?text=' + encodeURIComponent(msg);
}
// Home y /flota:      sdWaLink(null)
// /coches/{slug}:     sdWaLink(SD_PAGE.car_name)             → «Hola, me interesa alquilar el Porsche 911 Carrera S»
// con fechas (form):  sdWaLink(SD_PAGE.car_name, '12-15 oct')
```

Requisitos:

- `carName` sale de `fleet.json` (campo `name`), nunca escrito a mano.
- En móvil el botón es **sticky** (posición fija, esquina inferior, siempre visible al hacer scroll).
- Todos los botones llevan `data-placement="hero|card|sticky|footer|ficha"` para saber cuál convierte.
- El teléfono se muestra siempre como enlace `<a href="tel:+34XXXXXXXXX">`, nunca como texto plano.

---

## 6. Páginas de marca y filtro de `/flota` — no romper la atribución

Las páginas de marca son **URLs estáticas**: `/flota/porsche`, `/flota/lamborghini`, `/flota/mercedes-amg`,
`/flota/audi`, `/flota/range-rover`, `/flota/volkswagen` (campo `brand_slug` en `fleet.json`). Los anuncios llegan a `/flota/porsche?gclid=…` (y `utm_*`, `gbraid`,
`wbraid`) y a `/coches/{slug}?gclid=…`.

1. Cada página de marca se sirve renderizada con su propio `<title>`, meta y H1 (`seo/seo-meta.json`),
   no como estado JavaScript de `/flota`.
2. El filtro de marca en `/flota` **navega** a la página de marca conservando la query string:

```js
function sdGoBrand(brandSlug) {                 // '' = todas
  var q = location.search;                      // gclid / utm_* siguen ahí
  window.SD && SD.track('filter_brand', { brand: brandSlug || 'todas' });
  location.href = (brandSlug ? '/flota/' + brandSlug : '/flota') + q;
}
```

3. `/flota?marca=porsche` (formato antiguo del brief) responde **301** a `/flota/porsche` (ver
   `seo/redirects/`). Si la URL trae más parámetros (`?marca=porsche&gclid=…`), `/flota` aplica el
   filtro leyendo `marca` en el cliente y **no** redirige, para no perder el `gclid`.

Prohibido: reconstruir la URL sin `location.search` (borra gclid y toda la atribución).

---

## 7. Redirecciones 301 y página 404

Mantener el SEO existente: cada URL antigua responde **301** a su equivalente nueva (tabla completa
en `fleet.json` → `legacy_url` por vehículo y `legacy_pages_to_redirect`). Resumen:

| Antigua | Nueva |
|---|---|
| `/fleet.html` | `/flota` |
| `/rates.html` | `/tarifas` |
| `/how.html` | `/como-funciona` |
| `/contact.html` | `/contacto` |
| `/alquiler-porsche-barcelona.html` | `/flota/porsche` |
| `/alquiler-mercedes-barcelona.html` | `/flota/mercedes-amg` |
| `/alquiler-audi-barcelona.html` | `/flota/audi` |
| `/alquiler-mercedes-amg-g63-barcelona.html` | `/coches/mercedes-amg-g63` |
| `/alquiler-mercedes-amg-a45-s-barcelona.html` | `/coches/mercedes-amg-a45` |
| `/alquiler-audi-rs3-barcelona.html` | `/coches/audi-rs3-sportback` |
| `/alquiler-volkswagen-golf-r-barcelona.html` | `/coches/volkswagen-golf-r` |
| `/alquiler-porsche-911-carrera-992-barcelona.html` | `/coches/porsche-911-carrera-s` |
| `/alquiler-porsche-911-targa-gts-barcelona.html` | `/coches/porsche-911-cabrio` |
| `/alquiler-lamborghini-urus-barcelona.html` | `/coches/lamborghini-urus` |
| `/alquiler-audi-rs6-avant-barcelona.html` | `/coches/audi-rs6-avant` |
| `/alquiler-audi-rsq3-sportback-barcelona.html` · `/alquiler-audi-rs-q3-barcelona.html` | `/coches/audi-rsq3` |
| `/alquiler-lamborghini-barcelona.html` · Huracán | `/flota/lamborghini` |
| `/alquiler-porsche-718-spyder-barcelona.html` · Cayenne GTS / Turbo GT | `/flota/porsche` · `/coches/porsche-cayenne-hybrid` |
| `/alquiler-mercedes-c220d-cabrio-barcelona.html` | `/flota/mercedes-amg` |
| páginas de Ferrari, McLaren, Aston, BMW, Maserati, Alfa, Abarth (no disponibles) | `/flota` |
| páginas de Audi RS4 / A5 (no disponibles) | `/flota/audi` |

La tabla completa y definitiva (52 reglas) está en `seo/redirects/`.

Página **404 personalizada** con enlace a `/flota` y el botón de WhatsApp (para anuncios que queden
desactualizados). Actualizar `sitemap.xml` con las URLs nuevas únicamente.

---

## 8. Schema.org en cada página de coche

Mantener el `AutoRental` de la organización (ya existe) y añadir en `/coches/{slug}` un `Product`
con `Offer`, generado desde `fleet.json`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Mercedes-AMG G63",
  "brand": { "@type": "Brand", "name": "Mercedes-AMG" },
  "image": "https://serresdrive.com/RUTA/IMAGEN.jpg",
  "url": "https://serresdrive.com/coches/mercedes-amg-g63",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "EUR",
    "price": "1000",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "1000", "priceCurrency": "EUR",
      "unitCode": "DAY", "unitText": "día"
    },
    "availability": "https://schema.org/InStock",
    "seller": { "@type": "AutoRental", "name": "Serres Drive" }
  }
}
</script>
```

Cuando las rutas de las imágenes estén decididas, rellenar el campo `image` de cada vehículo en
`fleet.json` (ruta relativa, p. ej. `/img/coches/mercedes-amg-g63.jpg`): de ahí sale también el feed
de Performance Max.

---

## 9. Rendimiento en móvil

70–80 % del tráfico de anuncios es móvil. Objetivo **LCP < 2,5 s** en la página de coche:

- Imagen hero en WebP/AVIF, `<link rel="preload">`, dimensiones fijas (sin CLS).
- Precio del día **visible sin hacer scroll** en `/coches/{slug}`.
- Sin sliders infinitos, drag, parallax ni coches girando (instrucción del rediseño, punto 15).
- gtag con `async`; el bloque de consentimiento es inline y ligero.
- Fuentes: máximo dos familias, `font-display: swap`.

---

## 10. Verificación antes de dar por terminado

1. Chrome → extensión **Tag Assistant** → abrir el sitio → aparecen `G-XXXXXXXXXX` y `AW-XXXXXXXXX`,
   estado de consentimiento «denied» antes del banner y «granted» tras «Aceptar».
2. Con consentimiento **aceptado**: clic en WhatsApp de una página de coche → GA4 → Informes →
   Tiempo real → evento `whatsapp_click` con `car_slug` y `price_1d` correctos.
3. Con consentimiento **rechazado**: el mismo clic no crea cookies `_ga` / `_gcl_au`, pero el evento
   sí sale (Consent Mode envía pings sin cookies) — comprobar en Tag Assistant.
4. Abrir `https://serresdrive.com/flota?marca=porsche&gclid=TEST123` → cambiar el filtro a Audi →
   la URL conserva `gclid=TEST123`.
5. Enviar el formulario de prueba → Tag Assistant muestra `user_data` (email/phone) en el hit de Ads.
6. Todas las URLs antiguas de la sección 7 devuelven 301 (comprobar con `curl -I`).
7. `/coches/{slug}` existe para los **13** slugs de `fleet.json` y ninguno devuelve 404.
8. Google Ads → Objetivos → Conversiones: las tres acciones pasan de «Inactiva» a «Registrando
   conversiones» en 24–48 h tras los clics de prueba (lo comprueba el propietario).

Cuando los puntos 1–7 estén verificados, avisar al propietario: a partir de ahí se activan las
campañas.
