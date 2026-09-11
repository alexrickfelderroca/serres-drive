/* Resolves `sharp` wherever it happens to live on this machine.
   Historia: build-images.js y contact-sheet.js apuntaban con ruta absoluta a
   "~/Desktop/serres/_build/node_modules/sharp", un proyecto hermano que ya no
   existe. En vez de volver a clavar una ruta, se prueban varias y se avisa con
   instrucciones si no hay ninguna. */
const path = require('path'), os = require('os');

const CANDIDATES = [
  'sharp',                                                   // resolucion normal
  path.join(__dirname, 'node_modules/sharp'),                // _build/node_modules
  path.join(__dirname, '..', 'node_modules/sharp'),          // raiz del repo
  path.join(os.homedir(), 'node_modules/sharp'),             // instalacion del usuario
  'C:/Users/Rickfelder/Desktop/serres/_build/node_modules/sharp', // ruta historica
];

let sharp = null, tried = [];
for (const c of CANDIDATES) {
  try { sharp = require(c); break; } catch (e) { tried.push(`${c} — ${e.code || e.message.split('\n')[0]}`); }
}
if (!sharp) {
  console.error('No se ha podido cargar sharp. Probado:\n  ' + tried.join('\n  '));
  console.error('\nSolucion:  npm install --os=win32 --cpu=x64 --include=optional sharp');
  process.exit(1);
}
module.exports = sharp;
