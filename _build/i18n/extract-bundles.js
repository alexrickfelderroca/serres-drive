/* El journal guarda el resultado de cada agente por separado; lo que el
   pipeline ensambla ({code, ui, cars, review}) sólo está en la salida de la
   tarea. Este script la recorta y la deja en _bundles.json. */
const fs = require('fs');
const raw = fs.readFileSync(process.argv[2], 'utf8');

const start = raw.indexOf('[{"code"');
if (start < 0) { console.error('no encuentro el array de resultados'); process.exit(1); }

let depth = 0, end = -1, inStr = false, esc = false;
for (let i = start; i < raw.length; i++) {
  const c = raw[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') inStr = true;
  else if (c === '[' || c === '{') depth++;
  else if (c === ']' || c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (end < 0) { console.error('el array no cierra: la salida está truncada'); process.exit(1); }

const arr = JSON.parse(raw.slice(start, end));
fs.writeFileSync(__dirname + '/_bundles.json', JSON.stringify(arr));
console.log(`${arr.length} idiomas: ${arr.map(x => x.code).join(', ')}`);
arr.forEach(b => console.log(`  ${b.code}: ui=${!!b.ui} cars=${b.cars ? (b.cars.cars || []).length : 0} review=${b.review ? (b.review.problems || []).length + ' problemas' : 'no'}`));
