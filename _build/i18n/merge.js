/* Toma la salida del workflow de traducción y escribe _build/i18n/<lang>.json.

   Hace tres cosas:
     1. valida que el diccionario traducido tiene EXACTAMENTE las mismas
        claves que es.json y los mismos marcadores {x} — si falta uno, la web
        imprimiría un hueco, así que aquí se cae con error en vez de publicarlo;
     2. mete las fichas de coche traducidas bajo la clave "cars";
     3. aplica las correcciones de los revisores nativos que son sustitución
        literal (was -> shouldBe). Las de criterio global se anotan y se
        arreglan aparte.

   Uso: node _build/i18n/merge.js <ruta-al-journal.jsonl> */
const fs = require('fs'), path = require('path');
const DIR = __dirname;
const es = JSON.parse(fs.readFileSync(path.join(DIR, 'es.json'), 'utf8'));

/* _bundles.json es lo que ensambla el pipeline: [{code, meta, ui, cars,
   review}]. Sale del volcado de la tarea, no del journal — el journal guarda
   el resultado de cada agente por separado, sin juntar. */
const bundles = JSON.parse(fs.readFileSync(path.join(DIR, '_bundles.json'), 'utf8'))
  .filter(r => r && r.code && r.ui && r.cars);

const paths = (node, trail = []) => {
  const out = [];
  for (const [k, v] of Object.entries(node)) {
    if (k === '_meta') continue;
    const p = trail.concat(k);
    if (typeof v === 'string') out.push(p.join('.'));
    else if (Array.isArray(v)) v.forEach((it, i) => {
      if (typeof it === 'string') out.push(`${p.join('.')}[${i}]`);
      else if (it && typeof it === 'object') for (const k2 of Object.keys(it)) out.push(`${p.join('.')}[${i}].${k2}`);
    });
    else if (v && typeof v === 'object') out.push(...paths(v, p));
  }
  return out;
};
const get = (obj, p) => p.replace(/\[(\d+)\]/g, '.$1').split('.').reduce((o, k) => o && o[k], obj);
const marks = s => (String(s).match(/\{(\w+)\}/g) || []).sort().join(',');

const esPaths = paths(es);
let failed = 0;

for (const b of bundles) {
  let dict;
  try { dict = JSON.parse(b.ui.json); }
  catch (e) { console.error(`${b.code}: el JSON del diccionario no parsea — ${e.message}`); failed++; continue; }

  /* 1 · mismas claves, mismos marcadores */
  const tPaths = paths(dict);
  const missing = esPaths.filter(p => !tPaths.includes(p));
  const extra = tPaths.filter(p => !esPaths.includes(p));
  const badMarks = esPaths.filter(p => tPaths.includes(p) && marks(get(es, p)) !== marks(get(dict, p)));
  if (missing.length || extra.length || badMarks.length) {
    console.error(`${b.code}: FALLA la validación`);
    if (missing.length) console.error(`   faltan ${missing.length}: ${missing.slice(0, 6).join(', ')}`);
    if (extra.length) console.error(`   sobran ${extra.length}: ${extra.slice(0, 6).join(', ')}`);
    if (badMarks.length) console.error(`   marcadores distintos en: ${badMarks.slice(0, 6).join(', ')}`);
    failed++; continue;
  }

  /* 2 · fichas de coche */
  dict.cars = {};
  for (const c of (b.cars.cars || [])) {
    dict.cars[c.slug] = { tagline: c.tagline, highlights: c.highlights };
  }

  /* 3 · correcciones literales de los revisores.
     Ojo: el campo "shouldBe" lo escribe un revisor, y a veces trae la
     corrección MÁS una alternativa entre paréntesis («Faites défiler (o
     simplemente …)»). Metida tal cual, esa nota se publica en la web — pasó
     con dos claves francesas. Se rechaza cualquier sustitución que huela a
     comentario en vez de a texto final. */
  const NOTE = [/\((?:o|or|ou|или)\s/i, /\(simplemente/i, /«[^»]*»\s*\)/, /\bp\. ?ej\./i, /\be\.g\./i];
  let applied = 0; const skipped = [];
  for (const p of (b.review && b.review.problems) || []) {
    if (!p.was || !p.shouldBe) continue;
    if (NOTE.some(re => re.test(p.shouldBe))) {
      skipped.push(`${p.key} [nota del revisor, no texto final]`);
      continue;
    }
    const before = JSON.stringify(dict);
    const after = before.split(JSON.stringify(p.was).slice(1, -1)).join(JSON.stringify(p.shouldBe).slice(1, -1));
    if (after !== before) { dict = JSON.parse(after); applied++; }
    else skipped.push(p.key);
  }

  dict._meta = { ...dict._meta, lang: b.code, flag: b.meta.flag, locale: b.meta.locale, label: b.meta.label };
  fs.writeFileSync(path.join(DIR, `${b.code}.json`), JSON.stringify(dict, null, 2));

  const nCars = Object.keys(dict.cars).length;
  console.log(`${b.code}: ${tPaths.length} claves OK · ${nCars} coches · ${applied} correcciones aplicadas` +
    (skipped.length ? `\n     sin aplicar (criterio, no literal): ${skipped.map(s => s.slice(0, 44)).join(' | ')}` : ''));
}

if (failed) { console.error(`\n${failed} idioma(s) rechazados: no se han escrito.`); process.exit(1); }
console.log(`\n${bundles.length} idiomas escritos.`);
