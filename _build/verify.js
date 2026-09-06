/* Checks the GENERATED HTML against the numbers in the brief, rather than
   against fleet.json — fleet.json is what produced the HTML, so comparing
   the two would only prove the generator is deterministic. The table below
   is retyped from ETAPA 0 of serresdrive-claude-code-task_2.md.

   Run: node _build/verify.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

/* slug: [1d, 2d, 3d, week, month, deposit|null], brandPage */
const BRIEF = {
  'mercedes-amg-g63':       [[1000, 1700, 2700, 6000, 12000], 5000, 'mercedes-amg'],
  'lamborghini-urus':       [[1100, 1900, 3000, 6500, 13000], null, 'lamborghini'],
  'audi-rs6-avant':         [[900, 1600, 2500, 5500, 11000], null, 'audi'],
  'porsche-911-cabrio':     [[800, 1500, 2200, 4600, 9000], 2000, 'porsche'],
  'porsche-911-carrera-s':  [[700, 1300, 2000, 3500, 7500], 2000, 'porsche'],
  'porsche-cayenne-hybrid': [[700, 1300, 2000, 3500, 7500], 2000, 'porsche'],
  'mercedes-amg-a45':       [[450, 800, 1100, 2000, 5000], 2000, 'mercedes-amg'],
  'audi-rs3-sportback':     [[450, 800, 1100, 2000, 5000], 2000, 'audi'],
  'audi-rsq3':              [[450, 800, 1100, 2000, 5000], 2000, 'audi'],
  'volkswagen-golf-r':      [[400, 750, 1000, 1800, 4500], 2000, 'volkswagen'],
  'range-rover-velar':      [[350, 700, 900, 1800, 4300], 2000, 'range-rover'],
  'mercedes-glc':           [[200, 350, 550, 1000, 2500], 2000, 'mercedes-amg'],
  'mercedes-a200-4matic':   [[150, 250, 400, 900, 1800], 2000, 'mercedes-amg'],
};
const GONE = ['ferrari', 'mclaren', 'aston martin', 'maserati', 'alfa romeo', 'abarth', 'bmw',
  'huracán', 'huracan', 'macan', '718 spyder', 'c220d', 'clio', 'tmax', 'harley', 'renault',
  'targa gts', 'turbo gt', 'gts coupé', 'rs 4', 'rs4', 'a5 avant', 'g63 plus'];

const eur = n => n.toLocaleString('de-DE') + ' €';
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const fail = [], warn = [], pass = [];
const check = (ok, msg) => (ok ? pass : fail).push(msg);

/* --- 1. exactly 13 car pages, no more ---------------------------------- */
const carDirs = fs.readdirSync(path.join(ROOT, 'coches'));
check(carDirs.length === 13, `13 car pages (found ${carDirs.length})`);
check(carDirs.every(d => BRIEF[d]), `every car page slug is in the brief: ${carDirs.filter(d => !BRIEF[d]).join(', ') || 'yes'}`);
check(Object.keys(BRIEF).every(s => carDirs.includes(s)), 'every brief slug has a page');

/* --- 2. prices + deposit on each car page ------------------------------ */
for (const [slug, [prices, deposit]] of Object.entries(BRIEF)) {
  const html = read(`coches/${slug}/index.html`);
  const missing = prices.filter(p => !html.includes(eur(p)));
  check(!missing.length, `${slug}: all 5 prices present${missing.length ? ` — missing ${missing.map(eur)}` : ''}`);
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
  for (const [slug, [prices, deposit]] of Object.entries(BRIEF)) {
    const row = html.split('<tr>').find(r => r.includes(`coches/${slug}/`));
    check(!!row, `tarifas: row for ${slug}`);
    if (!row) continue;
    const missing = prices.filter(p => !row.includes(eur(p)));
    check(!missing.length, `tarifas ${slug}: 5 prices match${missing.length ? ` — missing ${missing.map(eur)}` : ''}`);
    check(row.includes(deposit === null ? 'Por WhatsApp' : eur(deposit)), `tarifas ${slug}: deposit cell`);
  }
}

/* --- 4. brand pages hold the right cars --------------------------------- */
const BRANDS = ['porsche', 'lamborghini', 'mercedes-amg', 'audi', 'range-rover', 'volkswagen'];
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
    if (e.isDirectory()) { if (!/^(_build|\.git|\.screenshots|node_modules|Sicur Cars|data|seo|seo y google ads)$/.test(e.name)) walk(p); }
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
  /* 26 páginas x 5 idiomas. */
  check(locs.length === 130, `sitemap tiene 130 URLs (26 x 5 idiomas) — encontradas ${locs.length}`);
  const perLang = { es: 0, en: 0, ru: 0, ca: 0, fr: 0 };
  locs.forEach(u => { const m = u.match(/^\/(en|ru|ca|fr)\//); perLang[m ? m[1] : 'es']++; });
  check(Object.values(perLang).every(n => n === 26),
    `26 URLs por idioma — ${JSON.stringify(perLang)}`);
  const alts = (xml.match(/xhtml:link rel="alternate"/g) || []).length;
  check(alts === 130 * 6, `cada URL declara sus 6 alternativas (${alts}/${130 * 6})`);
  const missing = locs.filter(u => !fs.existsSync(path.join(ROOT, u === '/' ? 'index.html' : u.slice(1) + 'index.html')));
  check(!missing.length, `every sitemap URL exists${missing.length ? ` — missing ${missing}` : ''}`);
  check(!/alquiler-|fleet\.html|rates\.html|motos/.test(xml), 'sitemap has no legacy URLs');
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
