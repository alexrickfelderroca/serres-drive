/* =====================================================================
   Capturas y métricas de verificación, sin depender del navegador del
   MCP de Chrome DevTools (que lo retiene una sola sesión a la vez).

   Usa el Chrome del sistema con puppeteer-core, que ya vive en la caché
   de npx (lo instala el propio MCP / lighthouse). Cada captura devuelve
   una línea JSON con lo que hay que mirar de verdad: errores de consola,
   peticiones fallidas, imágenes rotas, si hay scroll horizontal y la
   altura del documento — lo que pide ~/.claude/rules/web-verification.md.

   Uso:
     node _build/shot.js <spec.json>

   spec.json:
     { "base": "http://localhost:8131",
       "shots": [ { "name": "pass-1-desktop", "url": "/como-funciona/",
                    "out": ".screenshots/x/pass-1-desktop.png",
                    "w": 1440, "h": 900, "mobile": false, "dpr": 1,
                    "rm": false,          // prefers-reduced-motion: reduce
                    "scroll": 0.5,        // px | fracción 0..1 | selector CSS
                    "steps": 12,          // baja en N pasos (dispara triggers)
                    "wait": 800,          // ms de espera antes de capturar
                    "full": false,        // página entera
                    "eval": "document.title" } ] }

   Las rutas de máquina van con variable de entorno para que el script
   siga siendo útil en otro PC: SHOT_NODE_MODULES y SHOT_CHROME.
   ===================================================================== */
const fs = require('fs'), path = require('path');
const NM = process.env.SHOT_NODE_MODULES
  || 'C:/Users/Rickfelder/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules';
const CHROME = process.env.SHOT_CHROME
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const puppeteer = require(path.join(NM, 'puppeteer-core'));
const ROOT = path.join(__dirname, '..');

const specPath = process.argv[2];
if (!specPath) { console.error('uso: node _build/shot.js <spec.json>'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const base = (spec.base || 'http://localhost:8131').replace(/\/$/, '');

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    /* SHOT_PROFILE: un perfil por proceso para poder lanzar varias tandas a la vez. */
    userDataDir: path.join(process.env.TEMP || ROOT, process.env.SHOT_PROFILE || 'serres-shot-profile'),
    args: ['--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const results = [];
  for (const s of spec.shots) {
    const page = await browser.newPage();
    const errors = [], warnings = [], failed = [], pageErrors = [];
    page.on('console', m => {
      const t = m.type();
      if (t === 'error') errors.push(m.text());
      else if (t === 'warning' || t === 'warn') warnings.push(m.text());
    });
    page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
    page.on('requestfailed', r => failed.push(r.url() + ' — ' + (r.failure() && r.failure().errorText)));
    page.on('response', r => { if (r.status() >= 400) failed.push(r.url() + ' — HTTP ' + r.status()); });

    const w = s.w || 1440, h = s.h || 900;
    await page.setViewport({ width: w, height: h, deviceScaleFactor: s.dpr || 1, isMobile: !!s.mobile, hasTouch: !!s.mobile });
    if (s.mobile) await page.setUserAgent(MOBILE_UA);
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: s.rm ? 'reduce' : 'no-preference' }]);

    const url = /^https?:/.test(s.url) ? s.url : base + s.url;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);

    /* Desplazamiento: en pasos, para que los ScrollTrigger vean pasar el
       scroll como lo vería una persona, no un salto único. */
    if (s.scroll !== undefined && s.scroll !== null) {
      /* offsetFrac: fracción de la ALTURA del elemento que se añade al
         destino — sirve para caer en mitad de una sección pineada (p. ej.
         la cuarta diapositiva del carrusel de la portada). */
      const target = await page.evaluate((sc, offsetFrac, offsetPx) => {
        const H = document.documentElement.scrollHeight - window.innerHeight;
        if (typeof sc === 'number') return sc <= 1 ? Math.round(H * sc) : sc;
        const el = document.querySelector(sc);
        if (!el) return 0;
        const top = el.getBoundingClientRect().top + window.scrollY;
        return Math.round(top + (offsetFrac || 0) * el.offsetHeight + (offsetPx || 0));
      }, s.scroll, s.offsetFrac || 0, s.offset || 0);
      const steps = s.steps || 1;
      for (let i = 1; i <= steps; i++) {
        await page.evaluate(y => window.scrollTo(0, y), Math.round(target * i / steps));
        await new Promise(r => setTimeout(r, s.stepWait || 90));
      }
    }
    await new Promise(r => setTimeout(r, s.wait || 600));

    /* resize: [w, h] — redimensiona la ventana DESPUÉS de desplazar, para
       reproducir lo que hace un refresh de ScrollTrigger a mitad de página
       (girar el móvil, cambiar de ventana). */
    if (Array.isArray(s.resize)) {
      await page.setViewport({ width: s.resize[0], height: s.resize[1], deviceScaleFactor: s.dpr || 1, isMobile: !!s.mobile, hasTouch: !!s.mobile });
      await new Promise(r => setTimeout(r, s.resizeWait || 1200));
    }

    const metrics = await page.evaluate(() => {
      const imgs = [...document.images];
      return {
        title: document.title,
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        docHeight: document.documentElement.scrollHeight,
        scrollY: Math.round(window.scrollY),
        imgCount: imgs.length,
        brokenImages: imgs.filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.currentSrc || i.src),
      };
    });
    let evalResult = null;
    if (s.eval) {
      try { evalResult = await page.evaluate(s.eval); }
      catch (e) { evalResult = 'EVAL ERROR: ' + e.message; }
    }
    if (s.out) {
      const out = path.isAbsolute(s.out) ? s.out : path.join(ROOT, s.out);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out, fullPage: !!s.full, type: /\.jpe?g$/i.test(out) ? 'jpeg' : 'png', ...(/\.jpe?g$/i.test(out) ? { quality: 82 } : {}) });
    }
    const r = {
      name: s.name, url, viewport: `${w}x${h}${s.mobile ? ' mobile' : ''}${s.rm ? ' reduced-motion' : ''}`,
      out: s.out || null,
      horizontalScroll: metrics.scrollWidth > metrics.innerWidth || metrics.bodyScrollWidth > metrics.innerWidth,
      ...metrics,
      consoleErrors: errors, consoleWarnings: warnings, pageErrors, requestsFailed: failed,
      eval: evalResult,
    };
    results.push(r);
    console.log(JSON.stringify(r));
    await page.close();
  }
  await browser.close();
  if (spec.summary) fs.writeFileSync(path.join(ROOT, spec.summary), JSON.stringify(results, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
