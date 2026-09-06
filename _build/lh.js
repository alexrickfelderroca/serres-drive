/* =====================================================================
   Lighthouse (accesibilidad, buenas prácticas, SEO) sin el navegador del
   MCP: lanza el Chrome del sistema con chrome-launcher y usa el paquete
   lighthouse que ya está en la caché de npx. Escribe el informe JSON al
   lado de las capturas y saca las tres puntuaciones por consola.

   Uso:
     node _build/lh.js <url> [mobile|desktop] [salida.json]
   ===================================================================== */
const path = require('path'), fs = require('fs');
const NM = process.env.SHOT_NODE_MODULES
  || 'C:/Users/Rickfelder/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules';
const CHROME = process.env.SHOT_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const form = process.argv[3] === 'desktop' ? 'desktop' : 'mobile';
const outFile = process.argv[4];
if (!url) { console.error('uso: node _build/lh.js <url> [mobile|desktop] [salida.json]'); process.exit(2); }

(async () => {
  const chromeLauncher = require(path.join(NM, 'chrome-launcher'));
  const { default: lighthouse } = await import('file:///' + path.join(NM, 'lighthouse/core/index.js').replace(/\\/g, '/'));
  const chrome = await chromeLauncher.launch({
    chromePath: CHROME,
    chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  try {
    const flags = {
      port: chrome.port, output: 'json', logLevel: 'error',
      onlyCategories: ['accessibility', 'best-practices', 'seo'],
      formFactor: form,
      screenEmulation: form === 'mobile'
        ? { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false }
        : { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
      throttlingMethod: 'provided',
    };
    const result = await lighthouse(url, flags);
    const lhr = result.lhr;
    const score = c => Math.round((lhr.categories[c].score || 0) * 100);
    const failing = Object.values(lhr.audits)
      .filter(a => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicative' && a.scoreDisplayMode !== 'manual')
      .map(a => `${a.id} (${a.score})`);
    console.log(JSON.stringify({ url, form, accessibility: score('accessibility'), bestPractices: score('best-practices'), seo: score('seo'), failing }));
    if (outFile) fs.writeFileSync(outFile, result.report);
  } finally {
    /* En Windows el borrado del perfil temporal a veces falla (EBUSY): el
       informe ya está escrito, así que no es un error del audit. */
    try { await chrome.kill(); } catch (e) {}
  }
})().catch(e => { console.error(e); process.exit(1); });
