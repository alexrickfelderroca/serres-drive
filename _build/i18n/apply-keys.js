/* Sustituye en build-site.js los literales en espanol por referencias al
   diccionario (L.seccion.clave). El mapeo se construye AL REVES desde
   es.json, asi que solo toca cadenas que existen palabra por palabra en el
   diccionario: si una no coincide exactamente, se queda como esta y sale en
   el informe, en vez de romperse en silencio.

   Se ejecuta una sola vez. Uso: node _build/i18n/apply-keys.js [--dry] */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TARGET = path.join(ROOT, '_build/build-site.js');
const es = JSON.parse(fs.readFileSync(path.join(__dirname, 'es.json'), 'utf8'));
const dry = process.argv.includes('--dry');

/* aplana es.json -> [{ value, keyPath }], de mas largo a mas corto para que
   una frase larga no se coma un trozo antes que su version completa */
const flat = [];
(function walk(node, trail) {
  for (const [k, v] of Object.entries(node)) {
    if (k === '_meta') continue;
    const p = trail.concat(k);
    if (typeof v === 'string') flat.push({ value: v, key: 'L.' + p.join('.') });
    else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'string') flat.push({ value: item, key: `L.${p.join('.')}[${i}]` });
        else if (item && typeof item === 'object') {
          for (const [k2, v2] of Object.entries(item)) {
            if (typeof v2 === 'string') flat.push({ value: v2, key: `L.${p.join('.')}[${i}].${k2}` });
          }
        }
      });
    } else if (v && typeof v === 'object') walk(v, p);
  }
})(es, []);

flat.sort((a, b) => b.value.length - a.value.length);

let src = fs.readFileSync(TARGET, 'utf8');
const hits = [];
const misses = [];

for (const { value, key } of flat) {
  /* Solo se sustituyen literales que NO llevan marcador: los que llevan
     {algo} se resuelven con una funcion de formato y se hacen a mano. */
  if (/\{[a-z]+\}/i.test(value)) { misses.push({ value, key, why: 'lleva marcador, se hace a mano' }); continue; }
  if (value.length < 3) { misses.push({ value, key, why: 'demasiado corto, riesgo de falso positivo' }); continue; }

  let n = 0;
  /* dentro de una plantilla: >texto<  ->  >${key}<  */
  const between = new RegExp('>' + escapeRe(value) + '<', 'g');
  src = src.replace(between, () => { n++; return '>${' + key + '}<'; });
  /* en atributos: ="texto"  ->  ="${key}"  */
  const attr = new RegExp('="' + escapeRe(value) + '"', 'g');
  src = src.replace(attr, () => { n++; return '="${' + key + '}"'; });
  /* literal JS entre comillas simples: 'texto' -> L.clave  */
  const single = new RegExp("'" + escapeRe(value) + "'", 'g');
  src = src.replace(single, () => { n++; return key; });

  if (n) hits.push({ value: value.slice(0, 58), key, n });
  else misses.push({ value: value.slice(0, 58), key, why: 'no aparece literal en build-site.js' });
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

if (!dry) fs.writeFileSync(TARGET, src);

console.log(`${hits.length} literales sustituidos, ${misses.length} sin tocar\n`);
console.log('--- SUSTITUIDOS ---');
hits.forEach(h => console.log(`  ${String(h.n).padStart(2)}x  ${h.key.padEnd(34)} ${h.value}`));
console.log('\n--- SIN TOCAR (revisar a mano) ---');
misses.filter(m => m.why !== 'lleva marcador, se hace a mano').slice(0, 40)
  .forEach(m => console.log(`  ${m.key.padEnd(34)} ${m.why}  "${m.value}"`));
const withVars = misses.filter(m => m.why === 'lleva marcador, se hace a mano');
console.log(`\n  (+ ${withVars.length} con marcador {x}, se cablean a mano)`);
