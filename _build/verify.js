/* Checks the GENERATED HTML against the numbers in the brief, rather than
   against fleet.json — fleet.json is what produced the HTML, so comparing
   the two would only prove the generator is deterministic. The table below
   is retyped from ETAPA 0 of serresdrive-claude-code-task_2.md.

   Run: node _build/verify.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

/* slug: [[precios conocidos], deposit|null, brandPage, kmPerDay, kmExtra|null, location|null]

   Retecleado a mano desde las dos fuentes, NO leido de fleet.json: comparar
   el HTML con el JSON que lo genero solo probaria que el generador es
   determinista.
     - Los 13 primeros: ETAPA 0 de serresdrive-claude-code-task_2.md, con las
       fianzas por tramo que fijo Alex el 11.09.2026 (5.000 premium /
       3.500 gama media / 2.000 el resto).
     - Los 13 ultimos: coches del proveedor Stratos. El precio/dia es el PVP
       que paso Alex por chat; fianza, km/dia y km extra salen de la tabla de
       tarifas del proveedor. Solo tienen precio de 1 dia: los demas tramos se
       confirman por WhatsApp, no se inventan. */
const BRIEF = {
  'mercedes-amg-g63':       [[1000, 1700, 2700, 6000, 12000], 5000, 'mercedes-amg', 150, null, 'Barcelona'],
  'lamborghini-urus':       [[1100, 1900, 3000, 6500, 13000], 5000, 'lamborghini',  150, null, 'Barcelona'],
  'audi-rs6-avant':         [[900, 1600, 2500, 5500, 11000],  5000, 'audi',         150, null, 'Barcelona'],
  'porsche-911-cabrio':     [[800, 1500, 2200, 4600, 9000],   5000, 'porsche',      150, null, 'Barcelona'],
  'porsche-911-carrera-s':  [[700, 1300, 2000, 3500, 7500],   5000, 'porsche',      150, null, 'Barcelona'],
  'porsche-cayenne-hybrid': [[700, 1300, 2000, 3500, 7500],   5000, 'porsche',      150, null, 'Barcelona'],
  'mercedes-amg-a45':       [[450, 800, 1100, 2000, 5000],    3500, 'mercedes-amg', 150, null, 'Barcelona'],
  'audi-rs3-sportback':     [[450, 800, 1100, 2000, 5000],    3500, 'audi',         150, null, 'Barcelona'],
  'audi-rsq3':              [[450, 800, 1100, 2000, 5000],    3500, 'audi',         150, null, 'Barcelona'],
  'volkswagen-golf-r':      [[400, 750, 1000, 1800, 4500],    3500, 'volkswagen',   150, null, 'Barcelona'],
  'range-rover-velar':      [[350, 700, 900, 1800, 4300],     3500, 'range-rover',  150, null, 'Barcelona'],
  'mercedes-glc':           [[200, 350, 550, 1000, 2500],     2000, 'mercedes-amg', 150, null, 'Barcelona'],
  'mercedes-a200-4matic':   [[150, 250, 400, 900, 1800],      2000, 'mercedes-amg', 150, null, 'Barcelona'],

  'lamborghini-huracan-evo-spyder': [[1400], 7000, 'lamborghini',  150, 5,   null],
  'lamborghini-urus-s':             [[1100], 6000, 'lamborghini',  150, 5,   null],
  'aston-martin-dbx':               [[1000], 6000, 'aston-martin', 150, 5,   null],
  'mercedes-amg-g63-verde-oliva':   [[1000], 5000, 'mercedes-amg', 150, 5,   null],
  'range-rover-sv':                 [[800],  5000, 'range-rover',  150, 5,   null],
  'range-rover-vogue':              [[800],  3000, 'range-rover',  150, 4,   null],
  'mercedes-gls':                   [[700],  3000, 'mercedes-amg', 150, 3.5, null],
  'range-rover-sport-svr':          [[600],  4000, 'range-rover',  150, 5,   null],
  'mercedes-gle-coupe':             [[600],  3000, 'mercedes-amg', 150, 3.5, null],
  'range-rover-sport':              [[550],  3000, 'range-rover',  150, 4,   null],
  'mercedes-amg-glc-43':            [[500],  3000, 'mercedes-amg', 150, 3.5, null],
  'mercedes-clase-v':               [[350],  1000, 'mercedes-amg', 200, 0.5, null],
  'mercedes-glc-coupe':             [[330],  2000, 'mercedes-amg', 150, 2,   null],
};
const CARS = Object.keys(BRIEF).length;
const eurDec = n => n.toLocaleString('de-DE', {
  minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }) + ' €';

/* "aston martin", "huracán" y "huracan" SALIERON de esta lista el 11.09.2026:
   el DBX y el Huracán EVO Spyder vuelven a la flota con los coches de Stratos,
   asi que ahora tienen que APARECER, no desaparecer. */
const GONE = ['ferrari', 'mclaren', 'maserati', 'alfa romeo', 'abarth', 'bmw',
  'macan', '718 spyder', 'c220d', 'clio', 'tmax', 'harley', 'renault',
  'targa gts', 'turbo gt', 'gts coupé', 'rs 4', 'rs4', 'a5 avant', 'g63 plus'];

const eur = n => n.toLocaleString('de-DE') + ' €';
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const fail = [], warn = [], pass = [];
const check = (ok, msg) => (ok ? pass : fail).push(msg);

/* --- 1. exactamente CARS fichas de coche, ni una mas -------------------- */
const carDirs = fs.readdirSync(path.join(ROOT, 'coches'));
check(carDirs.length === CARS, `${CARS} car pages (found ${carDirs.length})`);
check(carDirs.every(d => BRIEF[d]), `every car page slug is in the brief: ${carDirs.filter(d => !BRIEF[d]).join(', ') || 'yes'}`);
check(Object.keys(BRIEF).every(s => carDirs.includes(s)), 'every brief slug has a page');

/* --- 2. prices + deposit on each car page ------------------------------ */
for (const [slug, [prices, deposit, , kmPerDay, kmExtra, location]] of Object.entries(BRIEF)) {
  const html = read(`coches/${slug}/index.html`);
  const missing = prices.filter(p => !html.includes(eur(p)));
  check(!missing.length, `${slug}: sus ${prices.length} tarifa(s) estan${missing.length ? ` — falta ${missing.map(eur)}` : ''}`);

  /* Un coche con una sola tarifa NO puede haberse inventado las otras cuatro:
     tiene que decir que se confirman por WhatsApp. */
  if (prices.length < 5) {
    check(/te las confirmamos por WhatsApp/i.test(html), `${slug}: dice que los demas tramos se confirman por WhatsApp`);
  }

  /* Kilometros incluidos y precio del kilometro extra. */
  check(html.includes(`${kmPerDay} km/día incluidos`), `${slug}: ${kmPerDay} km/día incluidos`);
  check(html.includes(kmExtra === null ? 'Te lo confirmamos por WhatsApp' : eurDec(kmExtra) + '/km'),
    `${slug}: km extra ${kmExtra === null ? '(por WhatsApp)' : eurDec(kmExtra) + '/km'}`);

  /* Ubicacion: la flota propia la lleva; la del proveedor esta repartida por
     Espana y NO puede inventarse una ciudad ni en el texto ni en el alt. */
  const loc = /class="car-loc car-loc--lg"/.test(html);
  check(location ? loc : !loc, `${slug}: ${location ? 'muestra "' + location + '"' : 'no inventa ubicacion'}`);
  if (location) check(html.includes(location), `${slug}: pone "${location}"`);
  else {
    const heroAlt = (html.match(/alt="([^"]*)" id="gMainImg"/) || [])[1] || '';
    check(!/en Barcelona/.test(heroAlt), `${slug}: el alt del hero no dice "en Barcelona" (dice "${heroAlt}")`);
  }
  if (deposit === null) {
    check(html.includes('te la confirmamos por WhatsApp'), `${slug}: deposit reads "te la confirmamos por WhatsApp"`);
    check(!/Fianza:\s*2\.000/.test(html), `${slug}: no invented 2.000 € deposit`);
  } else {
    check(html.includes(`Fianza: ${eur(deposit)}`), `${slug}: deposit ${eur(deposit)}`);
  }
  check(html.includes(`${eur(100)}`), `${slug}: 100 € delivery stated`);
  /* the brief bans these from every page */
  const banned = ['seguro', 'franquicia', 'cancelaci'].filter(w => new RegExp(w, 'i').test(html.replace(/<script[\s\S]*?<\/script>/g, '')));
  check(!banned.length, `${slug}: says nothing about insurance/franchise/cancellation${banned.length ? ` — found ${banned}` : ''}`);
}

/* --- 3. /tarifas carries the same numbers ------------------------------ */
{
  const html = read('tarifas/index.html');
  for (const [slug, [prices, deposit, , kmPerDay, kmExtra]] of Object.entries(BRIEF)) {
    /* <tr role="row">: la tabla lleva roles explícitos porque en móvil se
       pinta como tarjetas (display:grid) y eso le quitaría la semántica. */
    const row = html.split(/<tr[^>]*>/).find(r => r.includes(`coches/${slug}/`));
    check(!!row, `tarifas: row for ${slug}`);
    if (!row) continue;
    const missing = prices.filter(p => !row.includes(eur(p)));
    check(!missing.length, `tarifas ${slug}: cuadran sus ${prices.length} tarifa(s)${missing.length ? ` — falta ${missing.map(eur)}` : ''}`);
    check(row.includes(deposit === null ? 'Por WhatsApp' : eur(deposit)), `tarifas ${slug}: celda de fianza`);
    check(row.includes(`>${kmPerDay} km<`), `tarifas ${slug}: ${kmPerDay} km/día`);
    check(row.includes(kmExtra === null ? 'Por WhatsApp' : eurDec(kmExtra) + '/km'), `tarifas ${slug}: celda de km extra`);
    /* Las celdas sin tarifa dicen "Por WhatsApp"; ninguna se rellena sola. */
    const vacias = (row.match(/Por WhatsApp/g) || []).length;
    check(vacias >= (5 - prices.length), `tarifas ${slug}: ${5 - prices.length} tramo(s) sin inventar`);
  }
}

/* --- 4. brand pages hold the right cars --------------------------------- */
const BRANDS = ['porsche', 'lamborghini', 'aston-martin', 'mercedes-amg', 'audi', 'range-rover', 'volkswagen'];
for (const b of BRANDS) {
  const html = read(`flota/${b}/index.html`);
  const expect = Object.entries(BRIEF).filter(([, v]) => v[2] === b).map(([s]) => s);
  const cards = [...html.matchAll(/coches\/([a-z0-9-]+)\/" aria-label/g)].map(m => m[1]);
  const uniq = [...new Set(cards)];
  check(expect.every(s => uniq.includes(s)) && uniq.length === expect.length,
    `/flota/${b}/: ${expect.length} car(s) — expected [${expect}], got [${uniq}]`);
}
check(!fs.existsSync(path.join(ROOT, 'flota/motos')), 'no /flota/motos');
check(!fs.existsSync(path.join(ROOT, 'flota/renault')), 'no /flota/renault');

/* --- 5. removed cars appear nowhere ------------------------------------- */
const shipped = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    /* "seo y google ads" is the owner's internal documentation, not shipped
       pages. Its TZ files legitimately name Ferrari, BMW and the rest while
       describing what was removed, so walking it produced 13 false failures. */
    if (e.isDirectory()) { if (!/^(_build|\.git|\.screenshots|node_modules|Sicur Cars|Stratos|data|seo|seo y google ads)$/.test(e.name)) walk(p); }
    else if (/\.(html|xml|txt)$/.test(e.name)) shipped.push(p);
  }
})(ROOT);
for (const word of GONE) {
  const hits = shipped.filter(f => new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(fs.readFileSync(f, 'utf8')));
  check(!hits.length, `"${word}" absent from shipped pages${hits.length ? ` — in ${hits.map(h => path.relative(ROOT, h))}` : ''}`);
}

/* --- 6. one language, no leftovers -------------------------------------- */
for (const f of shipped) {
  const html = fs.readFileSync(f, 'utf8');
  const rp = path.relative(ROOT, f);
  if (/\.html$/.test(rp)) {
    /* El sitio es multiidioma: cada página declara el idioma de SU carpeta.
       Un /ru/ que dijera lang="es" haría que Google lo tratara como español
       duplicado y que los lectores de pantalla lo leyeran con voz castellana. */
    const m = rp.replace(/\\/g, '/').match(/^(en|ru|ca|fr)\//);
    const expect = m ? m[1] : 'es';
    check(new RegExp(`<html lang="${expect}">`).test(html), `${rp}: lang="${expect}"`);
    check(!/data-lang=|data-en\b|data-es\b/.test(html), `${rp}: no data-lang machinery`);
    check(!/info@serreswrapcenter/.test(html), `${rp}: no wrap-centre email`);
    /* hreflang completo: las 5 versiones + x-default en cada página. */
    const alts = (html.match(/rel="alternate" hreflang=/g) || []).length;
    if (!/404\.html$/.test(rp)) check(alts === 6, `${rp}: 6 hreflang (tiene ${alts})`);
  }
}

/* --- 7. sitemap: every URL is a real page ------------------------------- */
{
  const xml = read('sitemap.xml');
  const locs = [...xml.matchAll(/<loc>https:\/\/serresdrive\.com(.*?)<\/loc>/g)].map(m => m[1]);
  /* páginas fijas + una por coche + una por marca, x 5 idiomas. */
  const FIJAS = 10;  // /, flota, tarifas, como-funciona, condiciones, por-que-serres,
                     // contacto + las tres legales (privacidad, cookies, aviso legal)
  const PAGES = FIJAS + CARS + BRANDS.length, URLS = PAGES * 5;
  check(locs.length === URLS, `sitemap tiene ${URLS} URLs (${PAGES} x 5 idiomas) — encontradas ${locs.length}`);
  const perLang = { es: 0, en: 0, ru: 0, ca: 0, fr: 0 };
  locs.forEach(u => { const m = u.match(/^\/(en|ru|ca|fr)\//); perLang[m ? m[1] : 'es']++; });
  check(Object.values(perLang).every(n => n === PAGES),
    `${PAGES} URLs por idioma — ${JSON.stringify(perLang)}`);
  const alts = (xml.match(/xhtml:link rel="alternate"/g) || []).length;
  check(alts === URLS * 6, `cada URL declara sus 6 alternativas (${alts}/${URLS * 6})`);
  const missing = locs.filter(u => !fs.existsSync(path.join(ROOT, u === '/' ? 'index.html' : u.slice(1) + 'index.html')));
  check(!missing.length, `every sitemap URL exists${missing.length ? ` — missing ${missing}` : ''}`);
  check(!/alquiler-|fleet\.html|rates\.html|motos/.test(xml), 'sitemap has no legacy URLs');
}

/* --- 9. consentimiento, medicion y paginas legales ---------------------- */
/* Una comprobacion POR CONDICION, no por archivo: con 220 HTML, un check por
   archivo y condicion son mas de mil lineas de ruido y la cuenta total deja
   de decir nada. Cada check nombra a los infractores si los hay.          */
{
  const pages = shipped.filter(f => /\.html$/.test(f))
    .map(f => ({ rp: path.relative(ROOT, f).replace(/\\/g, '/'), html: fs.readFileSync(f, 'utf8') }));
  const offenders = fn => pages.filter(fn).map(p => p.rp);
  const few = a => a.length ? ` — ${a.slice(0, 5).join(', ')}${a.length > 5 ? ` y ${a.length - 5} mas` : ''}` : '';

  check(pages.length === 220, `220 HTML servidos: 215 paginas + 5 paginas 404 (hay ${pages.length})`);

  let bad = offenders(p => !/gtag\('consent','default'/.test(p.html));
  check(!bad.length, `las ${pages.length} paginas declaran el consentimiento por defecto${few(bad)}`);

  /* Lo que de verdad importa del Consent Mode es el ORDEN: si el gtag se
     carga antes de la declaracion, el consentimiento por defecto no se
     aplica y Google trata la visita como consentida. */
  bad = offenders(p => {
    const c = p.html.indexOf("gtag('consent','default'");
    const g = p.html.indexOf('googletagmanager.com/gtag/js');
    return c < 0 || g < 0 || c > g;
  });
  check(!bad.length, `el consentimiento se declara ANTES de cargar gtag${few(bad)}`);

  /* En la portada el primer script era preloader.js, sincrono y bloqueante:
     si el bloque de consentimiento quedara detras, no serviria de nada. */
  bad = offenders(p => {
    const c = p.html.indexOf("gtag('consent','default'");
    const pre = p.html.indexOf('js/preloader.js');
    return pre >= 0 && c > pre;
  });
  check(!bad.length, `en la portada el consentimiento va antes que preloader.js${few(bad)}`);

  bad = offenders(p => !/window\.SD_PAGE=\{/.test(p.html));
  check(!bad.length, `las ${pages.length} paginas declaran window.SD_PAGE${few(bad)}`);

  bad = offenders(p => !/href="tel:\+34649663380"/.test(p.html));
  check(!bad.length, `las ${pages.length} paginas tienen al menos un enlace tel:${few(bad)}`);

  /* Un wa.me sin data-placement es una conversion que llega sin saber de
     que boton salio, que es justo lo que se queria arreglar. */
  bad = offenders(p => (p.html.match(/<a[^>]*wa\.me[^>]*>/g) || []).some(a => !/data-placement=/.test(a)));
  check(!bad.length, `todos los enlaces wa.me llevan data-placement${few(bad)}`);

  bad = offenders(p => !/id="cookieCard"/.test(p.html));
  check(!bad.length, `las ${pages.length} paginas llevan el aviso de cookies${few(bad)}`);

  /* El marcador de GA4 nunca puede llegar a produccion: seria una peticion
     rota a googletagmanager.com en cada carga de cada pagina. */
  bad = offenders(p => /G-X{6,}/.test(p.html));
  check(!bad.length, `ningun marcador G-XXXXXXXXXX en el HTML servido${few(bad)}`);

  /* Ni datos fiscales inventados: mientras fleet.json los tenga a null, el
     bloque de identificacion no puede aparecer. */
  const legalData = JSON.parse(read('data/fleet.json')).legal;
  if (!legalData.entityName) {
    bad = offenders(p => /class="legal-id"/.test(p.html));
    check(!bad.length, `sin datos fiscales en fleet.json, no se imprime ningun bloque de identificacion${few(bad)}`);
  }

  /* Las tres legales, en los cinco idiomas, existen y estan enlazadas. */
  for (const slug of ['politica-de-privacidad', 'politica-de-cookies', 'aviso-legal']) {
    const missing = ['', 'en/', 'ru/', 'ca/', 'fr/']
      .filter(pre => !fs.existsSync(path.join(ROOT, pre + slug, 'index.html')));
    check(!missing.length, `/${slug}/ existe en los 5 idiomas${missing.length ? ` — falta en ${missing}` : ''}`);
    bad = offenders(p => !new RegExp(`${slug}/"`).test(p.html));
    check(!bad.length, `todas las paginas enlazan a /${slug}/ en el pie${few(bad)}`);
  }

  /* Cada 404 en su idioma: era el fallo concreto que reporto el delta. */
  for (const [pre, code] of [['', 'es'], ['en/', 'en'], ['ru/', 'ru'], ['ca/', 'ca'], ['fr/', 'fr']]) {
    const f = path.join(ROOT, pre + '404.html');
    const ok = fs.existsSync(f) && new RegExp(`<html lang="${code}">`).test(fs.readFileSync(f, 'utf8'));
    check(ok, `/${pre}404.html existe y declara lang="${code}"`);
  }
  /* Cada idioma lleva su ErrorDocument en SU carpeta, no en la raiz con
     bloques <If>: bajo LiteSpeed una directiva no soportada no degrada, da
     500 en todo el sitio. */
  check(/^ErrorDocument 404 \/404\.html$/m.test(read('.htaccess')), '.htaccess de la raiz sirve la 404 espanola');
  for (const code of ['en', 'ru', 'ca', 'fr']) {
    const f = path.join(ROOT, code, '.htaccess');
    const ok = fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes(`ErrorDocument 404 /${code}/404.html`);
    check(ok, `/${code}/.htaccess sirve la 404 de su idioma`);
  }
  check(!/^\s*<If /m.test(read('.htaccess')), 'sin bloques <If> en .htaccess (LiteSpeed daria 500)');

  /* @context en TODO el JSON-LD: sin el, Google no lee el bloque. */
  bad = offenders(p => (p.html.match(/<script type="application\/ld\+json">([^<]*)</g) || [])
    .some(s => !s.includes('"@context"')));
  check(!bad.length, `todo el JSON-LD lleva @context${few(bad)}`);
}

/* --- 8. no legacy files left ------------------------------------------- */
const legacy = fs.readdirSync(ROOT).filter(f => /^alquiler-|^(fleet|rates|how|contact|why|car)\.html$/.test(f));
check(!legacy.length, `no legacy pages at root${legacy.length ? ` — ${legacy}` : ''}`);

/* --- report ------------------------------------------------------------- */
console.log(`\n  PASS ${pass.length}   FAIL ${fail.length}   WARN ${warn.length}\n`);
fail.forEach(m => console.log('  FAIL  ' + m));
warn.forEach(m => console.log('  WARN  ' + m));
if (!fail.length) console.log('  Everything the brief specifies numerically checks out against the built HTML.');
process.exit(fail.length ? 1 : 0);
