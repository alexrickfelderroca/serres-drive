/* =====================================================================
   SERRES DRIVE — static site generator
   Reads data/fleet.json (prices, names, slugs, specs, photos) and
   data/seo-meta.json (title / description / H1 / canonical) and writes
   every page. No template below hardcodes a price, a name or a slug:
   change fleet.json and the card, the car page, /tarifas and the schema
   all move together, which is what ETAPA 0 of the brief asks for.

   Output is plain directories with an index.html, so the clean URLs work
   on Hostinger with no rewrite rules beyond the redirects in .htaccess.

   Run: node _build/build-site.js
   ===================================================================== */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

const fleet = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fleet.json'), 'utf8'));
const seoAll = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/seo-meta.json'), 'utf8'));

/* ---------- idiomas --------------------------------------------------- *
   Cinco idiomas, cada uno con sus PROPIAS URLs — que es lo unico que Google
   indexa de verdad y lo unico que permite anunciar por idioma. El espanol
   vive en la raiz; los demas cuelgan de su prefijo.

   Los segmentos de ruta NO se traducen (/en/flota/, no /en/fleet/): el slug
   de cada coche tiene que ser identico en los cinco idiomas porque es el que
   llevan los anuncios, y asi el hreflang empareja las cinco versiones sin
   una tabla de equivalencias que mantener.                                */
const LANGS = ['es', 'en', 'ru', 'ca', 'fr'].map(code => {
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n', `${code}.json`), 'utf8'));
  return { code, dict: d, ...d._meta, prefix: code === 'es' ? '' : code + '/' };
});
let LG = LANGS[0];      // idioma que se esta generando
let L = LG.dict;        // su diccionario
let seo = seoAll[LG.code].pages;

/* Rellena {marcadores} de una cadena del diccionario. */
const f = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) =>
  (vars && vars[k] !== undefined) ? vars[k] : m);

/* Antepone el prefijo de idioma a una ruta canonica ("/flota/"). */
const lp = u => u === '/' ? '/' + LG.prefix : '/' + LG.prefix + u.slice(1);

/* Copia por idioma de la ficha de un coche (tagline + highlights). */
const carCopy = (c) => {
  if (LG.code === 'es') return { tagline: c.taglineEs, highlights: c.highlightsEs };
  const t = L.cars && L.cars[c.slug];
  /* Si un idioma no tiene la ficha traducida, cae al espanol en vez de dejar
     la tarjeta vacia: mejor un texto en otro idioma que un hueco. */
  return t || { tagline: c.taglineEs, highlights: c.highlightsEs };
};
const { origin } = fleet.site;
const C = fleet.contact;
const T = fleet.terms;
/* Cache-buster derived from the CONTENT of the assets, never typed by hand.
   .htaccess serves css/js as `immutable, max-age=31536000`, so a stale URL is
   cached for a YEAR. Twice already the stylesheet changed while this string
   stayed at v=20260906, and every browser that had visited kept the old CSS —
   the footer icons rendered at their intrinsic size because the rules sizing
   them were in a file those browsers refused to re-fetch. Hashing the files
   makes forgetting impossible: change the CSS and the URL changes with it. */
const assetHash = (...files) => require('crypto').createHash('sha1')
  .update(files.map(f => fs.readFileSync(path.join(ROOT, f))).join('')).digest('hex').slice(0, 10);
const V = 'v=' + assetHash('css/serres.css', 'js/site.js');
/* Mismo mecanismo para los assets que solo usa la portada restaurada. */
const VH = 'v=' + assetHash('css/home.css', 'css/featured.css', 'css/preloader.css',
  'js/preloader.js', 'js/experience.js', 'js/featured.js', 'js/fleet.js');

/* ---------- helpers -------------------------------------------------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = n => n.toLocaleString('de-DE') + ' €';                  // 1.000 €
const car = slug => fleet.cars.find(c => c.slug === slug);
const carsOf = brand => fleet.brands.find(b => b.slug === brand).cars.map(car);
const brandOf = c => fleet.brands.find(b => b.slug === c.brand);

const wa = (text) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}`;
const waCar = c => wa(f(L.wa.car, { car: c.name }));
const waGeneral = () => wa(L.wa.general);

const depositText = c => c.deposit === null
  ? L.terms.depositUnknown
  : f(L.terms.depositLabel, { amount: eur(c.deposit) });

const ICON = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  wa: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.18 1.62 6L4 29l8.16-1.58a12 12 0 0 0 3.88.64C22.7 28.06 28.1 22.66 28.1 16.02 28.1 8.4 22.68 3 16.04 3Zm5.39 14.57c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.15-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.18-.24-.58-.48-.5-.66-.5l-.56-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z"/></svg>',
  /* Official marks, in their own colours. The Instagram gradient lives once
     per page in the sprite below, so three copies of the icon do not mean
     three elements sharing an id. */
  ig: '<svg class="ico-brand" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6.4" fill="url(#igGrad)"/><g fill="none" stroke="#fff" stroke-width="1.62"><rect x="5.2" y="5.2" width="13.6" height="13.6" rx="4.3"/><circle cx="12" cy="12" r="3.36"/></g><circle cx="16.62" cy="7.46" r="1.06" fill="#fff"/></svg>',
  gmail: '<svg class="ico-brand" viewBox="0 0 512 384" aria-hidden="true"><path fill="#4285f4" d="M395.64 383.9h81.45c19.3 0 34.91-15.64 34.91-34.91V98.75L395.64 186.2z"/><path fill="#34a853" d="M34.91 383.9h81.45V186.2L0 98.75v250.24c0 19.3 15.64 34.91 34.91 34.91z"/><path fill="#fbbc04" d="M395.64 34.99V186.2L512 98.75V52.36c0-43.01-49.11-67.53-83.51-41.73z"/><path fill="#ea4335" d="M116.36 186.2V34.99L256 139.68 395.64 34.99V186.2L256 290.89z"/><path fill="#c5221f" d="M0 52.36v46.39l116.36 87.45V34.99L83.51 10.63C49.05-15.17 0 9.35 0 52.36z"/></svg>',
  waColor: '<svg class="ico-brand" viewBox="0 0 32 32" aria-hidden="true"><path fill="#25D366" d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.18 1.62 6L4 29l8.16-1.58a12 12 0 0 0 3.88.64C22.7 28.06 28.1 22.66 28.1 16.02 28.1 8.4 22.68 3 16.04 3Z"/><path fill="#fff" d="M21.43 17.57c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.15-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.18-.24-.58-.48-.5-.66-.5l-.56-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z"/></svg>',
};

/* Defined once per page; every Instagram icon points at it. */
const SVG_SPRITE = '<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs><radialGradient id="igGrad" cx=".28" cy="1.03" r="1.25"><stop offset="0" stop-color="#FFD776"/><stop offset=".22" stop-color="#F8A650"/><stop offset=".42" stop-color="#EF4A5B"/><stop offset=".62" stop-color="#D62976"/><stop offset=".8" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></radialGradient></defs></svg>';
const btnArrow = `<span class="disc">${ICON.arrow}</span>`;

/* Depth of a URL like /coches/x/ -> how many ../ to reach the site root. */
const rel = (url) => {
  const depth = url.split('/').filter(Boolean).length;
  return depth === 0 ? '' : '../'.repeat(depth);
};

/* ---------- shared chrome -------------------------------------------- */
/* Funcion, no constante: las etiquetas cambian con el idioma y una const se
   habria quedado congelada con el primero de la lista. Las RUTAS no se
   traducen — ver la nota de LANGS. */
const navItems = () => [
  { href: 'flota/', label: L.nav.fleet },
  { href: 'tarifas/', label: L.nav.rates },
  { href: 'como-funciona/', label: L.nav.how },
  { href: 'por-que-serres/', label: L.nav.why },
  { href: 'contacto/', label: L.nav.contact },
];

/* Banderas en SVG, no emoji: Windows NO dibuja los emoji de bandera — en
   lugar de 🇪🇸 pinta las letras "ES", que es exactamente lo que no queremos.
   Dibujadas a 3:2. La catalana ademas no existe como emoji de pais.        */
const FLAG = {
  es: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#c60b1e"/><rect y="10" width="60" height="20" fill="#ffc400"/></svg>',
  en: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="9"/><path d="M0 0l60 40M60 0L0 40" stroke="#c8102e" stroke-width="5"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="14"/><path d="M30 0v40M0 20h60" stroke="#c8102e" stroke-width="8"/></svg>',
  ru: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#fff"/><rect y="13.33" width="60" height="13.34" fill="#0039a6"/><rect y="26.67" width="60" height="13.33" fill="#d52b1e"/></svg>',
  ca: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#fcdd09"/><g fill="#da121a"><rect y="4.44" width="60" height="4.45"/><rect y="13.33" width="60" height="4.45"/><rect y="22.22" width="60" height="4.45"/><rect y="31.11" width="60" height="4.45"/></g></svg>',
  fr: '<svg viewBox="0 0 60 40" aria-hidden="true"><rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ed2939"/></svg>',
};

/* Selector de idioma. Cada opcion apunta a la MISMA pagina en el otro
   idioma (misma ruta canonica, distinto prefijo), no a la portada: si estas
   viendo el Urus en espanol y cambias a frances, sigues en el Urus. */
function langPicker(canonicalUrl) {
  const opts = LANGS.map(l => {
    const href = (l.code === 'es' ? '' : '/' + l.code) + canonicalUrl;
    const on = l.code === LG.code;
    return `<a href="${href}" lang="${l.code}" hreflang="${l.code}"${on ? ' aria-current="true"' : ''} title="${esc(l.label)}"><span class="flag">${FLAG[l.code]}</span><span class="code">${l.code.toUpperCase()}</span><span class="sr">${esc(l.label)}</span></a>`;
  }).join('');
  return `<div class="lang-picker" role="group" aria-label="${esc(L.nav.language)}">${opts}</div>`;
}

function header(r, ra, current, canonicalUrl = '/') {
  const links = navItems().map(n =>
    `<a href="${r}${n.href}"${current === n.href ? ' aria-current="page"' : ''}>${n.label}</a>`).join('\n        ');
  return `<header class="nav">
  <div class="wrap">
    <a href="${r || './'}" class="brand" aria-label="${L.nav.home}">
      <img src="${ra}assets/brand/serres-wordmark.svg" alt="Serres" width="1000" height="89" decoding="async">
      <span class="b-drive">Drive</span>
    </a>
    <nav class="nav-links" aria-label="${L.nav.primary}">
        ${links}
    </nav>
    <div class="nav-actions">
      ${langPicker(canonicalUrl)}
      <a class="btn btn--wa-quiet btn--sm" href="${waGeneral()}" target="_blank" rel="noopener" aria-label="${L.nav.bookWa}">${ICON.waColor}<span>${L.nav.book}</span></a>
      <button class="menu-btn" id="menuBtn" type="button" aria-label="${L.nav.openMenu}" data-open="${esc(L.nav.openMenu)}" data-close="${esc(L.nav.closeMenu)}" aria-expanded="false" aria-controls="mobileMenu"><i></i></button>
    </div>
  </div>
</header>
<div class="mobile-menu" id="mobileMenu" hidden>
  ${navItems().map(n => `<a href="${r}${n.href}">${n.label}</a>`).join('\n  ')}
  <a class="btn btn--wa btn--block" href="${waGeneral()}" target="_blank" rel="noopener">${ICON.waColor}<span>${L.nav.bookWa}</span></a>
  ${langPicker(canonicalUrl)}
</div>`;
}

function footer(r, ra) {
  return `<footer class="footer">
  <div class="wrap">
    <div class="top">
      <a href="${r || './'}" class="brand" aria-label="${L.nav.home}">
        <img src="${ra}assets/brand/serres-wordmark.svg" alt="Serres" width="1000" height="89" loading="lazy" decoding="async">
        <span class="b-drive">Drive</span>
      </a>
      <nav class="footer-nav" aria-label="${L.footer.nav}">
        ${navItems().map(n => `<a href="${r}${n.href}">${n.label}</a>`).join('\n        ')}
        <a href="${C.wrapCenter}" target="_blank" rel="noopener">${L.footer.wrapCenter}</a>
      </nav>
    </div>
    <div class="footer-social">
      <a href="${C.instagram}" target="_blank" rel="noopener">${ICON.ig}<span>${esc(C.instagramHandle)}</span></a>
      <a href="${waGeneral()}" target="_blank" rel="noopener">${ICON.waColor}<span>WhatsApp ${C.phoneDisplay}</span></a>
      <a href="mailto:${C.email}">${ICON.gmail}<span>${C.email}</span></a>
    </div>
    <div class="bottom">
      <span>© ${new Date().getFullYear()} Serres Drive · ${C.address.locality}, ${C.address.region}</span>
      <span><a href="${r}condiciones-de-alquiler/">${L.footer.terms}</a></span>
    </div>
  </div>
</footer>`;
}

/* ---------- page shell ------------------------------------------------ */
function page({ url, body, schema = [], bodyClass = '', current = '', extraHead = '', extraScripts = '', afterMain = '', beforeMain = '', mainClass = '' }) {
  const meta = seo[url];
  if (!meta) throw new Error(`no seo-meta entry for ${url} (${LG.code})`);
  /* DOS profundidades distintas, y confundirlas rompe medio sitio:
       r  -> sube a la raiz del IDIOMA. Para enlaces entre paginas: desde
             /en/coches/x/ subir ../../ cae en /en/, que es lo que quieres.
       ra -> sube a la raiz del SITIO. Para css, js y assets, que NO estan
             duplicados por idioma y viven en /css, /js, /assets.            */
  const r = rel(url);
  const ra = rel(lp(url));
  const home = r || './';
  /* hreflang: las cinco versiones se apuntan entre si, y el espanol hace de
     x-default. Sin esto Google trata cada idioma como contenido duplicado. */
  const alternates = LANGS.map(l =>
    `<link rel="alternate" hreflang="${l.code}" href="${origin}${l.code === 'es' ? '' : '/' + l.code}${url}">`
  ).concat(`<link rel="alternate" hreflang="x-default" href="${origin}${url}">`).join('\n');
  const ld = schema.length
    ? `<script type="application/ld+json">${JSON.stringify(schema.length === 1 ? schema[0] : { '@context': 'https://schema.org', '@graph': schema })}</script>`
    : '';
  return `<!DOCTYPE html>
<html lang="${LG.code}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<link rel="canonical" href="${meta.canonical}">
${alternates}
<meta name="theme-color" content="#0a0a0b">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Serres Drive">
<meta property="og:locale" content="${LG.locale}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${meta.canonical}">
<meta property="og:image" content="${meta.image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${meta.image}">
<link rel="icon" href="${ra}assets/brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="${ra}assets/brand/favicon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="${ra}assets/brand/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${ra}css/serres.css?${V}">
${extraHead}
${ld}
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ''}>
${SVG_SPRITE}
<a class="skip" href="#main">${L.nav.skip}</a>
${header(r, ra, current, url)}
${beforeMain}
<main id="main"${mainClass ? ` class="${mainClass}"` : ''}>
${body}
</main>
${afterMain}
${footer(r, ra)}
${extraScripts}
<script src="${ra}js/site.js?${V}" defer></script>
</body>
</html>
`;
}

/* ---------- reusable blocks ------------------------------------------- */
function carCard(c, r, ra, { lazy = true } = {}) {
  const g = c.gallery[0];
  return `<article class="car-card">
  <a class="shot card-link" href="${r}coches/${c.slug}/" aria-label="${esc(c.name)} — ${L.common.seeCarAria}">
    <picture>
      <source type="image/webp" srcset="${ra}${g.webp800} 800w, ${ra}${g.webp} ${g.width}w" sizes="(max-width:640px) 92vw, (max-width:1040px) 46vw, 30vw">
      <img src="${ra}${g.jpg800}" width="800" height="533" alt="${esc(c.name)} ${L.common.rentalAlt}, ${L.common.threeQuarterAlt}"${lazy ? ' loading="lazy"' : ''} decoding="async">
    </picture>
  </a>
  <div class="body">
    <h3>${esc(c.name)}</h3>
    <ul class="specs">
      <li>${c.powerCv} CV</li><li>0-100 ${c.zeroToHundred}</li><li>${c.seats} plazas</li><li>${esc(c.bodyType)}</li>
    </ul>
    <div class="foot">
      <p class="price"><b>${eur(c.prices.d1)}</b><span>${L.common.perDay}</span></p>
      <a class="btn btn--wa-quiet btn--sm wa-mini" href="${waCar(c)}" target="_blank" rel="noopener" aria-label="Reservar ${esc(c.name)} por WhatsApp">${ICON.wa}<span>${L.nav.book}</span></a>
    </div>
  </div>
</article>`;
}

/* Brand mark on the homepage cards. The SVGs are the manufacturers' own and
   nobody has supplied them yet, so this renders the logo ONLY when the file
   is actually there — drop <slug>.svg into assets/brand/marcas/ and rebuild.
   Optical height is per brand (see LOGO_H): a single `height` makes the
   Porsche crest tower over the Audi rings, because one is a tall shield and
   the other a wide strip. */
const LOGO_H = {
  porsche: 54, lamborghini: 52, 'mercedes-amg': 44,
  audi: 26, 'range-rover': 30, volkswagen: 44,
};
function brandLogo(b, r) {
  const file = path.join(ROOT, 'assets/brand/marcas', `${b.slug}.svg`);
  if (!fs.existsSync(file)) return '';
  return `<img class="brand-logo" src="${ra}assets/brand/marcas/${b.slug}.svg" alt="" aria-hidden="true" style="height:${LOGO_H[b.slug] || 40}px" loading="lazy" decoding="async">`;
}

function brandChips(r, current) {
  return `<nav class="chips" aria-label="${L.common.filterByBrand}">
  <a class="chip" href="${r}flota/"${!current ? ' aria-current="page"' : ''}>${L.common.allCars}</a>
  ${fleet.brands.map(b => `<a class="chip" href="${r}flota/${b.slug}/"${current === b.slug ? ' aria-current="page"' : ''}>${b.label}</a>`).join('\n  ')}
</nav>`;
}

function crumbs(r, trail) {
  return `<nav class="wrap crumbs" aria-label="${L.common.breadcrumb}">
  <a href="${r || '/'}">${L.common.start}</a>
  ${trail.map(t => `<span aria-hidden="true">/</span>${t.href ? `<a href="${t.href}">${esc(t.label)}</a>` : `<span>${esc(t.label)}</span>`}`).join('\n  ')}
</nav>`;
}

function termsList() {
  return `<ul class="terms-list">
  <li><span class="k">${L.terms.age}</span><span class="v">${f(L.terms.ageValue, { age: T.minAge })}</span></li>
  <li><span class="k">${L.terms.licence}</span><span class="v">${esc(L.terms.licenceValue)}</span></li>
  <li><span class="k">${L.terms.km}</span><span class="v">${f(L.terms.kmValue, { km: T.kmIncluded })}</span></li>
  <li><span class="k">${L.terms.deposit}</span><span class="v">${f(L.terms.depositFrom, { amount: eur(T.depositFrom) })}</span></li>
  <li><span class="k">${L.terms.delivery}</span><span class="v">${f(L.terms.deliveryValue, { amount: eur(T.deliveryFee) })}</span></li>
</ul>`;
}

/* ---------- schema ---------------------------------------------------- */
const businessSchema = {
  '@type': 'AutoRental',
  '@id': `${origin}/#business`,
  name: 'Serres Drive',
  url: `${origin}/`,
  telephone: `+${C.whatsapp}`,
  email: C.email,
  image: `${origin}/${car('mercedes-amg-g63').image}`,
  logo: `${origin}/assets/brand/serres-wordmark-flat.svg`,
  priceRange: '€€€',
  currenciesAccepted: 'EUR',
  address: {
    '@type': 'PostalAddress',
    streetAddress: C.address.street, postalCode: C.address.postalCode,
    addressLocality: C.address.locality, addressRegion: C.address.region,
    addressCountry: C.address.country,
  },
  geo: { '@type': 'GeoCoordinates', latitude: C.geo.lat, longitude: C.geo.lng },
  areaServed: [
    { '@type': 'City', name: 'Barcelona' },
    { '@type': 'City', name: C.address.locality },
    { '@type': 'AdministrativeArea', name: 'Àrea Metropolitana de Barcelona' },
  ],
  sameAs: [C.instagram],
};

const carSchema = c => ({
  '@type': 'Product',
  '@id': `${origin}/coches/${c.slug}/#product`,
  name: c.name,
  brand: { '@type': 'Brand', name: brandOf(c).label },
  image: `${origin}/${c.image}`,
  description: carCopy(c).tagline,
  offers: {
    '@type': 'Offer',
    price: c.prices.d1,
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    url: `${origin}/coches/${c.slug}/`,
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: c.prices.d1, priceCurrency: 'EUR',
      unitCode: 'DAY', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'DAY' },
    },
    seller: { '@id': `${origin}/#business` },
  },
});

const breadcrumb = items => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem', position: i + 1, name: it.name, item: origin + it.url,
  })),
});

/* ---------- pages ----------------------------------------------------- */
const out = [];                 // [{ canonical, url, lang }] para sitemap y hreflang
const write = (url, html) => {
  const full = lp(url);         // "/flota/" -> "/en/flota/"
  const dir = path.join(ROOT, full === '/' ? '.' : full);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  out.push({ canonical: url, url: full, lang: LG.code });
};

/* Se genera el sitio entero una vez por idioma. Cada pasada fija L (el
   diccionario), LG (el idioma) y seo (sus metadatos), y todo lo de abajo
   los lee sin saber en que idioma esta. */
for (const lang of LANGS) {
  LG = lang; L = lang.dict; seo = seoAll[lang.code].pages;

/* --- home ------------------------------------------------------------- */
/* La portada vuelve a la experiencia anterior a peticion del propietario:
   hero 3D con el Porsche y scroll suave, carrusel "Destacados", el tubo
   "Toda la flota, en movimiento", la banda de Serres Wrap Center y el CTA
   final. Se restauran home.css / featured.css / preloader.css y sus
   scripts tal cual estaban (cero colisiones de selectores con serres.css,
   comprobado).

   Lo unico que NO vuelve son los coches que ya no existen: el carrusel
   llevaba un Ferrari F8 y un Huracan, y el tubo los 31 antiguos. Ahora
   ambos leen los 13 reales, porque la ETAPA 1 prohibe ensenar coches no
   disponibles ni como decoracion. El modelo 3D del hero sigue siendo el
   GT3 RS: es el unico .glb que existe, y esta anotado en OWNER-TODO.

   El resto de paginas no cambia: siguen con serres.css y site.js.        */
{
  const url = '/', r = rel(url), ra = rel(lp(url)), meta = seo[url];
  /* Cuatro, no cinco: cada coche anade su tramo de scroll, y con cinco el
     carrusel pedia 540vh. Son los cuatro tope de gama de la flota. */
  const featured = ['lamborghini-urus', 'mercedes-amg-g63', 'audi-rs6-avant',
    'porsche-911-cabrio'].map(car);

  const extraHead = `<link rel="stylesheet" href="${ra}css/home.css?${VH}">
<link rel="stylesheet" href="${ra}css/featured.css?${VH}">
<link rel="stylesheet" href="${ra}css/preloader.css?${VH}">
<script src="${ra}js/preloader.js?${VH}"></script>`;

  /* Orden y atributos calcados del index.html anterior: experience.js es un
     modulo ES y necesita el importmap de three delante; sin `type="module"`
     el navegador tira "Cannot use import statement outside a module" y el
     hero 3D no arranca. Los CDN van sin defer porque el inline de
     registerPlugin corre justo detras. */
  const extraScripts = `<script src="https://unpkg.com/lenis@1.1.16/dist/lenis.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script>window.gsap&&window.ScrollTrigger&&gsap.registerPlugin(ScrollTrigger);</script>
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
}}
</script>
<script src="${ra}js/fleet.js?${VH}"></script>
<script type="module" src="${ra}js/experience.js?${VH}"></script>
<script src="${ra}js/featured.js?${VH}"></script>
<!-- Rellena la rejilla de respaldo de .oa-choose desde la flota. Si no hay
     WebGL ni JS, se queda el enlace estatico "Ver la flota completa". -->
<script>
(function () {
  var grid = document.getElementById("chooseGrid");
  var fleet = window.SERRES_FLEET;
  if (!grid || !fleet || !fleet.length) return;
  function eur(n){ return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, "."); }
  var items = fleet.map(function (c) {
    var px = c.prices && c.prices.d1 ? eur(c.prices.d1) + " €/d" : "";
    return '<a href="${r}coches/' + encodeURIComponent(c.slug) + '/"><span>' + c.name + '</span><span class="px">' + px + '</span></a>';
  });
  items.push('<a href="${r}flota/"><span>${L.common.seeFullFleet}</span><span class="px">&rarr;</span></a>');
  grid.innerHTML = items.join("");
})();
</script>`;

  const body = `  <section class="oa-intro">
    <h1 class="oa-title">
      <span class="oa-row">${L.home.titleRow1}</span>
      <span class="oa-row">${L.home.titleRow2}</span>
      <span class="oa-row">${L.home.titleRow3}</span>
      <span class="oa-row oa-row-geo">${L.home.titleRow4}</span>
    </h1>
    <div class="oa-cta oa-intro-cta">
      <a href="${waGeneral()}" class="btn gold" target="_blank" rel="noopener">
        ${L.home.ctaBook}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
      <a href="${r}flota/" class="btn ghost">
        ${L.common.seeFleet}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
      <a href="${C.wrapCenter}" class="btn ghost" target="_blank" rel="noopener">
        Serres Wrap Center
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
      </a>
    </div>
  </section>

  <!-- DESTACADOS — carrusel sticky de cinco coches de la flota. El markup es
       el fallback sin JS: cinco fotos apiladas, legibles y enlazadas.
       js/featured.js lo convierte en el barrido por scroll. -->
  <section class="fc-sec" id="featured">
    <div class="fc-pin">
      <div class="fc-head">
        <p class="fc-eyebrow">${L.home.featured}</p>
        <p class="fc-sub">${f(L.home.featuredSub, { n: featured.length, total: fleet.cars.length })}</p>
      </div>
      <div class="fc-stage">
        ${featured.map(c => `<a class="fc-slide" href="${r}coches/${c.slug}/">
          <picture>
            <source type="image/webp" srcset="${ra}assets/img/cars/${c.slug}.webp">
            <img src="${ra}assets/img/cars/${c.slug}.jpg" alt="${esc(c.name)} ${L.common.rentalAlt}" loading="lazy" decoding="async" width="1800" height="1013">
          </picture>
          <h2 class="fc-title"><span class="fc-brand">${esc(brandOf(c).label)}</span>${esc(c.name.replace(brandOf(c).label, '').replace(/^[\\s-]+/, '') || c.name)}</h2>
        </a>`).join('\n        ')}
      </div>
      <div class="fc-progress" aria-hidden="true">${featured.map(() => '<i></i>').join('')}</div>
      <p class="fc-hint">${L.home.keepScrolling}</p>
    </div>
  </section>

  <!-- ELIGE TU COCHE — el anillo WebGL gira alrededor del Porsche. Esta
       seccion aporta el recorrido de scroll y el fallback sin WebGL. -->
  <section class="oa-choose" id="choose">
    <div class="oa-choose-head">
      <p>${L.home.chooseKicker}</p>
      <h2>${L.home.chooseTitle}</h2>
    </div>
    <div class="oa-choose-grid" id="chooseGrid" aria-label="${L.nav.fleet}">
      <a href="${r}flota/">${L.common.seeFullFleet}</a>
    </div>
  </section>

  <section class="oa-outro">
    <div class="oa-footer">
      <p>${L.home.outro}</p>
      <p>© ${new Date().getFullYear()} · BCN</p>
    </div>
  </section>
`;

  const afterMain = `<div class="sd-choose-ui" aria-hidden="true">
  <div class="cu-title">
    <span class="cu-kicker">${L.home.chooseKicker}</span>
    <span class="cu-h">${L.home.chooseUiTitle}</span>
  </div>
  <div class="cu-hint">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 12h8M8 12l3-3M8 12l3 3M16 12l-3-3M16 12l-3 3"/></svg>
    Desliza para girar
  </div>
</div>
<div class="sd-tooltip" role="status" aria-live="polite"></div>
<div class="sd-cursor" aria-hidden="true"></div>

<div class="sd-below">
  <!-- NEGOCIO HERMANO — Serres Wrap Center. -->
  <section class="section swc" id="wrap-center">
    <div class="wrap">
      <div class="swc-band">
        <div class="swc-copy">
          <span class="eyebrow">${L.footer.wrapCenter}</span>
          <h2 class="h-md">Antes de conducirlo, <span class="gold-text">${L.home.swcTitleB}</span>.</h2>
          <p class="lede">${L.home.swcBody}</p>
          <ul class="chips" style="margin:18px 0">
            <li class="chip">${L.home.swcTags[0]}</li><li class="chip">${L.home.swcTags[1]}</li><li class="chip">${L.home.swcTags[2]}</li><li class="chip">${L.home.swcTags[3]}</li><li class="chip">${L.home.swcTags[4]}</li>
          </ul>
          <a class="btn btn--secondary" href="${C.wrapCenter}" target="_blank" rel="noopener">Visitar Serres Wrap Center ${btnArrow}</a>
        </div>
        <a class="swc-shot" href="${C.wrapCenter}" target="_blank" rel="noopener"
           aria-label="${L.home.swcShotAria}">
          <img src="${ra}assets/img/wrapcenter/hero-poster.jpg" width="1600" height="900" loading="lazy" decoding="async"
               alt="${L.home.swcShotAlt}">
          <span class="swc-shot-tag">${L.home.swcShotTag}</span>
        </a>
      </div>
    </div>
  </section>

  <!-- CTA FINAL -->
  <section class="section" id="contact-cta">
    <div class="wrap">
      <div class="panel" style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px">
        <h2 class="h-md">${L.home.ctaTitleA} <span class="gold-text">${L.home.ctaTitleB}</span>?</h2>
        <p class="lede" style="margin-inline:auto">${L.home.ctaBody}</p>
        <div class="hero-cta" style="justify-content:center">
          <a href="${waGeneral()}" class="btn btn--wa" target="_blank" rel="noopener">${ICON.wa}<span>${L.common.writeWa}</span></a>
          <a href="tel:+${C.whatsapp}" class="btn btn--secondary">${C.phoneDisplay}</a>
        </div>
        <div class="footer-social" style="justify-content:center">
          <a href="${C.instagram}" target="_blank" rel="noopener">${ICON.ig}<span>${esc(C.instagramHandle)}</span></a>
          <a href="mailto:${C.email}">${ICON.gmail}<span>${C.email}</span></a>
        </div>
      </div>
    </div>
  </section>
</div>
`;

  /* experience.js sale por la puerta de atras si no encuentra .sd-model y
     .oa-exp (js/experience.js:34, "not the home page"), asi que el lienzo
     WebGL y su fondo tienen que estar en el DOM antes de <main>, y <main>
     tiene que llevar la clase .oa-exp. Sin esto no hay hero 3D y no avisa. */
  const beforeMain = `<div class="oa-backdrop" aria-hidden="true"></div>
<div class="sd-model" aria-hidden="true"><!-- lienzo WebGL: aqui gira el Porsche --></div>`;

  write(url, page({
    url, body, beforeMain, afterMain, mainClass: 'oa-exp',
    current: '', bodyClass: 'home-exp', extraHead, extraScripts,
    schema: [businessSchema],
  }));
}

/* --- /flota ------------------------------------------------------------ */
{
  const url = '/flota/', r = rel(url), ra = rel(lp(url)), meta = seo[url];
  const cars = [...fleet.cars].sort((a, b) => b.prices.d1 - a.prices.d1);
  const body = `${crumbs(r, [{ label: L.nav.fleet }])}
<section class="section section--tight">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${fleet.cars.length} ${L.common.carsAvailable}</p>
      <h1 class="h-lg">${esc(meta.h1)}</h1>
      <p class="lede">${esc(meta.description)}</p>
    </div>
    ${brandChips(r, '')}
    <div class="car-grid" style="margin-top:28px">
      ${cars.map((c, i) => carCard(c, r, ra, { lazy: i > 2 })).join('\n      ')}
    </div>
  </div>
</section>`;
  write(url, page({
    url, body, current: 'flota/',
    schema: [breadcrumb([{ name: L.common.start, url: '/' }, { name: L.nav.fleet, url: '/flota/' }]), {
      '@type': 'ItemList', name: 'Flota Serres Drive',
      itemListElement: cars.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${origin}/coches/${c.slug}/`, name: c.name })),
    }],
  }));
}

/* --- brand pages -------------------------------------------------------- */
for (const b of fleet.brands) {
  const url = `/flota/${b.slug}/`, r = rel(url), ra = rel(lp(url)), meta = seo[url];
  const cars = carsOf(b.slug).sort((a, x) => x.prices.d1 - a.prices.d1);
  const body = `${crumbs(r, [{ label: L.nav.fleet, href: `${r}flota/` }, { label: b.label }])}
<section class="section section--tight">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${cars.length} ${cars.length === 1 ? L.common.modelAvailable : L.common.modelsAvailable}</p>
      <h1 class="h-lg">${esc(meta.h1)}</h1>
      <p class="lede">${esc(meta.description)}</p>
    </div>
    ${brandChips(r, b.slug)}
    <div class="car-grid${cars.length <= 2 ? ' car-grid--2' : ''}" style="margin-top:28px">
      ${cars.map((c, i) => carCard(c, r, ra, { lazy: i > 1 })).join('\n      ')}
    </div>
  </div>
</section>`;
  write(url, page({
    url, body, current: 'flota/',
    schema: [breadcrumb([{ name: L.common.start, url: '/' }, { name: L.nav.fleet, url: '/flota/' }, { name: b.label, url }])],
  }));
}

/* --- car pages ----------------------------------------------------------- */
for (const c of fleet.cars) {
  const url = `/coches/${c.slug}/`, r = rel(url), ra = rel(lp(url)), meta = seo[url];
  const b = brandOf(c);
  const g0 = c.gallery[0];
  const priceRows = [
    [L.carPage.d1, c.prices.d1], [L.carPage.d2, c.prices.d2], [L.carPage.d3, c.prices.d3],
    [L.carPage.w1, c.prices.w1], [L.carPage.m1, c.prices.m1],
  ];
  const specs = [
    [L.carPage.power, `${c.powerCv} CV`], [L.carPage.zeroHundred, c.zeroToHundred],
    [L.carPage.topSpeed, c.topSpeed], [L.carPage.seats, c.seats],
    [L.carPage.transmission, c.transmission], [L.carPage.drivetrain, c.drivetrain],
    [L.carPage.fuel, c.fuel], [L.carPage.bodyType, c.bodyType],
  ];
  const others = fleet.cars.filter(x => x.brand === c.brand && x.slug !== c.slug).slice(0, 3);

  const body = `${crumbs(r, [{ label: L.nav.fleet, href: `${r}flota/` }, { label: b.label, href: `${r}flota/${b.slug}/` }, { label: c.name }])}
<section class="section section--tight">
  <div class="wrap">
    <div class="car-head">
      <div class="gallery">
        <div class="main" id="gMain">
          <picture>
            <source type="image/webp" srcset="${ra}${g0.webp}" id="gMainWebp">
            <img src="${ra}${g0.jpg}" width="${g0.width}" height="${g0.height}" alt="${esc(c.name)} ${L.common.rentalAlt}" id="gMainImg" fetchpriority="high" decoding="async">
          </picture>
        </div>
        ${c.gallery.length > 1 ? `<div class="thumbs" style="--n:${c.gallery.length}" role="group" aria-label="${f(L.carPage.gallery, { car: esc(c.name) })}">
          ${c.gallery.map((g, i) => `<button type="button" data-jpg="${ra}${g.jpg}" data-webp="${ra}${g.webp}"${i === 0 ? ' aria-current="true"' : ''} aria-label="${f(L.carPage.photoOf, { n: i + 1, total: c.gallery.length })}">
            <img src="${ra}${g.jpg800}" alt="" width="800" height="533" loading="lazy" decoding="async">
          </button>`).join('\n          ')}
        </div>` : ''}
      </div>

      <div class="car-aside">
        <div>
          <p class="eyebrow">${b.label}</p>
          <h1 class="h-md" style="margin-top:8px">${esc(c.name)}</h1>
          <p class="lede" style="margin-top:12px">${esc(carCopy(c).tagline)}</p>
        </div>

        <div class="price-box">
          <p class="from"><b>${eur(c.prices.d1)}</b><span>${L.common.aDay}</span></p>
          <ul class="price-list">
            ${priceRows.map(([k, v]) => `<li><span>${k}</span><b>${eur(v)}</b></li>`).join('\n            ')}
          </ul>
          <p class="mute-sm" style="margin-top:14px">${esc(depositText(c))} · ${f(L.terms.deliveryShort, { amount: eur(T.deliveryFee) })}</p>
          <a class="btn btn--wa btn--block" style="margin-top:16px" href="${waCar(c)}" target="_blank" rel="noopener">${ICON.wa}<span>${L.nav.bookWa}</span></a>
        </div>

        <ul class="highlights">${carCopy(c).highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
      </div>
    </div>
  </div>
</section>

<section class="section--tight" style="padding-bottom:0">
  <div class="wrap">
    <h2 class="h-sm" style="margin-bottom:16px">${L.carPage.specs}</h2>
    <div class="spec-grid">
      ${specs.map(([k, v]) => `<div class="spec"><span class="spec-k">${k}</span><span class="spec-v">${esc(v)}</span></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap split">
    <div class="panel">
      <h2 class="h-sm" style="margin-bottom:14px">${L.footer.terms}</h2>
      ${termsList()}
      <p class="mute-sm" style="margin-top:16px"><strong>${esc(depositText(c))}</strong> · <a href="${r}condiciones-de-alquiler/">${L.common.seeAllTerms}</a></p>
    </div>
    <div class="section-head">
      <p class="eyebrow">${L.carPage.bookEyebrow}</p>
      <h2 class="h-md">${f(L.carPage.bookTitle, { car: esc(c.name) })}</h2>
      <p class="lede">${L.carPage.bookBody}</p>
      <div class="hero-cta">
        <a class="btn btn--wa" href="${waCar(c)}" target="_blank" rel="noopener">${ICON.wa}<span>${L.nav.bookWa}</span></a>
        <a class="btn btn--ghost" href="${r}contacto/?coche=${c.slug}">Formulario ${btnArrow}</a>
      </div>
    </div>
  </div>
</section>

${others.length ? `<section class="section--tight" style="padding-top:0">
  <div class="wrap">
    <h2 class="h-sm" style="margin-bottom:20px">${f(L.carPage.moreOfBrand, { brand: b.label })}</h2>
    <div class="car-grid${others.length <= 2 ? ' car-grid--2' : ''}">
      ${others.map(o => carCard(o, r, ra)).join('\n      ')}
    </div>
  </div>
</section>` : ''}

<div class="sticky-wa">
  <a class="btn btn--wa btn--block" href="${waCar(c)}" target="_blank" rel="noopener">${ICON.wa}<span>Reservar ${esc(c.name)}</span></a>
</div>`;

  write(url, page({
    url, body, current: 'flota/', bodyClass: 'has-sticky',
    schema: [carSchema(c), breadcrumb([
      { name: L.common.start, url: '/' }, { name: L.nav.fleet, url: '/flota/' },
      { name: b.label, url: `/flota/${b.slug}/` }, { name: c.name, url },
    ])],
  }));
}

/* --- /tarifas ------------------------------------------------------------ */
{
  const url = '/tarifas/', r = rel(url), ra = rel(lp(url)), meta = seo[url];
  const cars = [...fleet.cars].sort((a, b) => b.prices.d1 - a.prices.d1);
  const body = `${crumbs(r, [{ label: L.nav.rates }])}
<section class="section section--tight">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${L.rates.eyebrow}</p>
      <h1 class="h-lg">${esc(meta.h1)}</h1>
      <p class="lede">${esc(meta.description)}</p>
    </div>
    <div class="table-scroll">
      <table class="rates">
        <caption class="sr">${L.rates.caption}</caption>
        <thead><tr>
          <th scope="col">${L.rates.colCar}</th><th scope="col">${L.carPage.d1}</th><th scope="col">${L.carPage.d2}</th>
          <th scope="col">${L.carPage.d3}</th><th scope="col">${L.carPage.w1}</th><th scope="col">${L.carPage.m1}</th><th scope="col">${L.terms.deposit}</th>
        </tr></thead>
        <tbody>
          ${cars.map(c => `<tr>
            <td><div class="car-cell">
              <img src="${ra}${c.gallery[0].jpg800}" alt="" width="64" height="43" loading="lazy" decoding="async">
              <a href="${r}coches/${c.slug}/"><b>${esc(c.name)}</b></a>
            </div></td>
            <td class="d1">${eur(c.prices.d1)}</td><td>${eur(c.prices.d2)}</td><td>${eur(c.prices.d3)}</td>
            <td>${eur(c.prices.w1)}</td><td>${eur(c.prices.m1)}</td>
            <td>${c.deposit === null ? L.common.byWhatsapp : eur(c.deposit)}</td>
          </tr>`).join('\n          ')}
        </tbody>
      </table>
    </div>
    <p class="mute-sm" style="margin-top:14px">${f(L.rates.note, { delivery: eur(T.deliveryFee), km: T.kmIncluded, deposit: eur(T.depositFrom) })}</p>
  </div>
</section>`;
  write(url, page({ url, body, current: 'tarifas/', schema: [breadcrumb([{ name: L.common.start, url: '/' }, { name: L.nav.rates, url }])] }));
}

/* --- /como-funciona ------------------------------------------------------ */
{
  const url = '/como-funciona/', r = rel(url), ra = rel(lp(url)), meta = seo[url];
  const steps = L.how.steps.map(st => [st.n, st.title, f(st.body, { amount: eur(T.deliveryFee) })]);
  const shot = car('mercedes-amg-g63').gallery[0];
  const body = `${crumbs(r, [{ label: L.nav.how }])}
<section class="section section--tight">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${L.how.eyebrow}</p>
      <h1 class="h-lg">${esc(meta.h1)}</h1>
      <p class="lede">${esc(meta.description)}</p>
    </div>
    <div class="plate" style="margin-bottom:36px"><div class="plate-core">
      <picture>
        <source type="image/webp" srcset="${ra}${shot.webp}">
        <img src="${ra}${shot.jpg}" width="${shot.width}" height="${shot.height}" alt="${L.how.shotAlt}" loading="lazy" decoding="async">
      </picture>
    </div></div>
    <div class="steps">
      ${steps.map(([n, t, d]) => `<article class="step"><span class="n">${n}</span><h3>${t}</h3><p class="muted">${esc(d)}</p></article>`).join('\n      ')}
    </div>
    <div class="hero-cta" style="margin-top:34px">
      <a class="btn btn--primary" href="${r}flota/">${L.common.seeFleet} ${btnArrow}</a>
      <a class="btn btn--wa" href="${waGeneral()}" target="_blank" rel="noopener">${ICON.wa}<span>${L.nav.bookWa}</span></a>
    </div>
  </div>
</section>`;
  write(url, page({
    url, body, current: 'como-funciona/',
    schema: [breadcrumb([{ name: L.common.start, url: '/' }, { name: L.nav.how, url }]), {
      '@type': 'HowTo', name: L.how.h1,
      step: steps.map(([n, t, d], i) => ({ '@type': 'HowToStep', position: i + 1, name: t, text: d })),
    }],
  }));
}

/* --- /condiciones-de-alquiler --------------------------------------------- */
{
  const url = '/condiciones-de-alquiler/', r = rel(url), ra = rel(lp(url)), meta = seo[url];
  const body = `${crumbs(r, [{ label: L.footer.terms }])}
<section class="section section--tight">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${L.termsPage.eyebrow}</p>
      <h1 class="h-lg">${esc(meta.h1)}</h1>
    </div>
    <div class="split">
      <div class="panel">
        <h2 class="h-sm" style="margin-bottom:14px">${L.termsPage.requirements}</h2>
        ${termsList()}
      </div>
      <div class="panel">
        <h2 class="h-sm" style="margin-bottom:14px">${L.termsPage.depositPerCar}</h2>
        <ul class="price-list">
          ${[...fleet.cars].sort((a, b) => b.prices.d1 - a.prices.d1).map(c =>
            `<li><span><a href="${r}coches/${c.slug}/">${esc(c.name)}</a></span><b>${c.deposit === null ? L.common.byWhatsapp : eur(c.deposit)}</b></li>`).join('\n          ')}
        </ul>
      </div>
    </div>
    <p class="mute-sm" style="margin-top:24px;max-width:70ch">${L.termsPage.footnote}</p>
    <div class="hero-cta" style="margin-top:20px">
      <a class="btn btn--wa" href="${waGeneral()}" target="_blank" rel="noopener">${ICON.wa}<span>${L.common.askWa}</span></a>
    </div>
  </div>
</section>`;
  write(url, page({ url, body, schema: [breadcrumb([{ name: L.common.start, url: '/' }, { name: L.footer.terms, url }])] }));
}

/* --- /por-que-serres ------------------------------------------------------- */
{
  const url = '/por-que-serres/', r = rel(url), ra = rel(lp(url)), meta = seo[url];
  const reasons = L.why.reasons.map(rs => [rs.title,
    f(rs.body, { total: fleet.cars.length, amount: eur(T.deliveryFee) })]);
  const shot = car('range-rover-velar').gallery[0];
  const body = `${crumbs(r, [{ label: L.nav.why }])}
<section class="section section--tight">
  <div class="wrap">
    <div class="section-head">
      <p class="eyebrow">${L.why.eyebrow}</p>
      <h1 class="h-lg">${esc(meta.h1)}</h1>
      <p class="lede">${esc(meta.description)}</p>
    </div>
    <div class="plate" style="margin-bottom:36px"><div class="plate-core">
      <picture>
        <source type="image/webp" srcset="${ra}${shot.webp}">
        <img src="${ra}${shot.jpg}" width="${shot.width}" height="${shot.height}" alt="${L.why.shotAlt}" loading="lazy" decoding="async">
      </picture>
    </div></div>
    <div class="steps">
      ${reasons.map(([t, d]) => `<article class="step"><h3>${esc(t)}</h3><p class="muted">${esc(d)}</p></article>`).join('\n      ')}
    </div>
    <div class="hero-cta" style="margin-top:34px">
      <a class="btn btn--primary" href="${r}flota/">${L.common.seeFleet} ${btnArrow}</a>
    </div>
  </div>
</section>`;
  write(url, page({ url, body, current: 'por-que-serres/', schema: [breadcrumb([{ name: L.common.start, url: '/' }, { name: L.nav.why, url }])] }));
}

/* --- /contacto -------------------------------------------------------------- */
{
  const url = '/contacto/', r = rel(url), ra = rel(lp(url)), meta = seo[url];
  const body = `${crumbs(r, [{ label: L.nav.contact }])}
<section class="section section--tight">
  <div class="wrap split">
    <div class="section-head">
      <p class="eyebrow">${L.contact.eyebrow}</p>
      <h1 class="h-lg">${esc(meta.h1)}</h1>
      <p class="lede">${esc(meta.description)}</p>
      <div class="hero-cta">
        <a class="btn btn--wa" href="${waGeneral()}" target="_blank" rel="noopener">${ICON.wa}<span>${C.phoneDisplay}</span></a>
        <a class="btn btn--secondary" href="mailto:${C.email}">${ICON.gmail}<span>${L.contact.writeEmail}</span></a>
        <a class="btn btn--secondary" href="${C.instagram}" target="_blank" rel="noopener" aria-label="Instagram ${esc(C.instagramHandle)}">${ICON.ig}<span>${L.contact.instagram}</span></a>
      </div>
      <ul class="terms-list" style="margin-top:24px">
        <li><span class="k">${L.contact.where}</span><span class="v">${esc(C.address.street)}, ${C.address.postalCode} ${esc(C.address.locality)} (${esc(C.address.region)})</span></li>
        <li><span class="k">${L.terms.delivery}</span><span class="v">Área metropolitana de Barcelona · ${eur(T.deliveryFee)}</span></li>
        <li><span class="k">${L.contact.email}</span><span class="v"><a class="ico-link" href="mailto:${C.email}">${ICON.gmail}<span>${C.email}</span></a></span></li>
        <li><span class="k">${L.contact.instagram}</span><span class="v"><a class="ico-link" href="${C.instagram}" target="_blank" rel="noopener">${ICON.ig}<span>${esc(C.instagramHandle)}</span></a></span></li>
      </ul>
    </div>

    <div class="panel">
      <h2 class="h-sm" style="margin-bottom:16px">${L.contact.formTitle}</h2>
      <script type="application/json" id="formI18n">${JSON.stringify({
        errName: L.contact.errName, errPhone: L.contact.errPhone,
        errCar: L.contact.errCar, errDates: L.contact.errDates,
        waIntro: L.contact.waIntro, waName: L.contact.waName,
        waPhone: L.contact.waPhone, waCar: L.contact.waCar,
        waDates: L.contact.waDates, waMessage: L.contact.waMessage,
      })}</script>
      <form class="form" id="bookForm" data-wa="${C.whatsapp}" novalidate>
        <div class="field">
          <label for="f-name">${L.contact.name}</label>
          <input id="f-name" name="name" type="text" autocomplete="name" required>
          <p class="err" id="e-name" role="alert"></p>
        </div>
        <div class="field">
          <label for="f-phone">${L.contact.phone}</label>
          <input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required>
          <p class="err" id="e-phone" role="alert"></p>
        </div>
        <div class="field field--full">
          <label for="f-car">${L.rates.colCar}</label>
          <select id="f-car" name="car" required>
            <option value="">${L.contact.chooseCar}</option>
            ${fleet.cars.map(c => `<option value="${esc(c.name)}" data-slug="${c.slug}">${esc(c.name)} — desde ${eur(c.prices.d1)}/día</option>`).join('\n            ')}
          </select>
          <p class="err" id="e-car" role="alert"></p>
        </div>
        <div class="field field--full">
          <label for="f-dates">${L.contact.dates}</label>
          <input id="f-dates" name="dates" type="text" placeholder="${L.contact.datesPlaceholder}" required>
          <p class="err" id="e-dates" role="alert"></p>
        </div>
        <div class="field field--full">
          <label for="f-msg">${L.contact.message}</label>
          <textarea id="f-msg" name="message" rows="4" placeholder="${L.contact.messagePlaceholder}"></textarea>
        </div>
        <div class="field--full">
          <button class="btn btn--wa btn--block" type="submit">${ICON.wa}<span>${L.contact.submit}</span></button>
        </div>
        <p class="form-note">${L.contact.note}</p>
      </form>
    </div>
  </div>
</section>`;
  write(url, page({ url, body, current: 'contacto/', schema: [businessSchema, breadcrumb([{ name: L.common.start, url: '/' }, { name: L.nav.contact, url }])] }));
}

}   /* fin del bucle de idiomas */

/* La 404 la sirve Apache para cualquier ruta: se genera una sola, en
   espanol, y su selector de idioma lleva a la portada de cada uno. */
LG = LANGS[0]; L = LG.dict; seo = seoAll.es.pages;

/* --- 404 (not in the sitemap, noindex) ------------------------------------- */
{
  const r = '';
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${L.e404.title}</title>
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#0a0a0b">
<link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/serres.css?${V}">
</head>
<body>
${SVG_SPRITE}
<a class="skip" href="#main">${L.nav.skip}</a>
${header('/', '/', '').replace(/href="\/\//g, 'href="/')}
<main id="main">
  <section class="section">
    <div class="wrap center-pad">
      <div class="section-head" style="align-items:center;text-align:center">
        <p class="eyebrow">${L.e404.eyebrow}</p>
        <h1 class="h-lg">${L.e404.h1}</h1>
        <p class="lede" style="margin-inline:auto">Puede que el coche que buscabas ya no esté en la flota. Estos son los ${fleet.cars.length} que sí puedes alquilar ahora mismo.</p>
        <div class="hero-cta" style="justify-content:center">
          <a class="btn btn--primary" href="/flota/">${L.common.seeFleet} ${btnArrow}</a>
          <a class="btn btn--secondary" href="/">Ir al inicio ${btnArrow}</a>
        </div>
      </div>
    </div>
  </section>
</main>
${footer('/', '/').replace(/href="\/\//g, 'href="/')}
<script src="/js/site.js?${V}" defer></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, '404.html'), html);
}

/* --- sitemap --------------------------------------------------------------- */
{
  const today = new Date().toISOString().slice(0, 10);
  const prio = u => u === '/' ? '1.0' : u.startsWith('/coches/') ? '0.9' : u.startsWith('/flota') ? '0.8' : '0.6';
  /* Cada <url> declara sus cinco alternativas con xhtml:link. Es la forma que
     Google pide para sitios multiidioma: sin esto trata las cinco versiones
     como contenido duplicado y elige una por su cuenta. */
  const alt = canonical => LANGS.map(l =>
    `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${origin}${l.code === 'es' ? '' : '/' + l.code}${canonical}"/>`
  ).concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}${canonical}"/>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${out.map(p => `  <url>
    <loc>${origin}${p.url}</loc>
${alt(p.canonical)}
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${prio(p.canonical)}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
}

const byLang = {};

console.log(`Generated ${out.length} pages + 404.html + sitemap.xml`);
console.log('  ' + Object.entries(byLang).map(([k, v]) => `${k}:${v}`).join('  '));

