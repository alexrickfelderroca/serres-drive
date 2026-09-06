/* =====================================================================
   Assets que necesita la home restaurada (el hero 3D + el tubo + el
   carrusel), derivados de los mismos originales que el resto del sitio.

   La home antigua leia:
     window.SERRES_FLEET            -> js/fleet.js
     assets/img/cars/<slug>.jpg     -> diapositivas del carrusel
     assets/img/cars/ring/<slug>.jpg-> texturas del tubo WebGL

   Se regeneran para los 13 coches REALES. Los 31 archivos originales
   (con Ferrari, BMW y demas) no vuelven: la ETAPA 1 del encargo prohibe
   ensenar coches no disponibles ni como decoracion.

   Run: node _build/build-home-assets.js
   ===================================================================== */
const sharp = require('C:/Users/Rickfelder/Desktop/serres/_build/node_modules/sharp');
const fs = require('fs'), path = require('path');
const { cropRect } = require('./subject-crop');

const ROOT = path.join(__dirname, '..');
const fleet = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fleet.json'), 'utf8'));
/* Se parte SIEMPRE del original de "Sicur Cars", nunca del JPG de 1200 px que
   ya genero build-images.js: reescalar un reescalado pierde detalle dos veces. */
const SEL = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-selection.json'), 'utf8'));
const MAN = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-manifest.json'), 'utf8'));
const originalFor = slug => path.join(ROOT, 'Sicur Cars', SEL[slug].folder, MAN[slug][0].source);

const CARS = path.join(ROOT, 'assets/img/cars');
const RING = path.join(CARS, 'ring');
fs.mkdirSync(RING, { recursive: true });

/* Acento por marca: el tubo y el carrusel lo usan para el tinte del tile.
   Se toma de la marca, no del color de la unidad, para que las tres
   Porsche no se vean de tres colores distintos. */
const ACCENT = {
  porsche: '#c8ccd6', lamborghini: '#f2c200', 'mercedes-amg': '#b9bec9',
  audi: '#c3c7d0', 'range-rover': '#9fb0ad', volkswagen: '#aeb6c4',
};

(async () => {
  const report = [];
  for (const c of fleet.cars) {
    const src = originalFor(c.slug);

    /* Diapositiva del carrusel. Cuando la seccion esta activa el slide ocupa
       TODA la pantalla con object-fit:cover — en un portatil de 1920 se pinta
       a ~1997 px. Servirlo a 1200 dejaba al navegador estirandolo x1,66 con
       interpolacion bilineal, y de ahi la falta de nitidez.

       Los originales solo tienen 1092-1448 px de ancho, asi que subir de ahi
       es inevitable: no hay detalle que recuperar. Lo que si se puede es
       hacerlo bien — Lanczos3 y una mascara de enfoque suave ganan bastante a
       que lo estire el navegador. Se recorta a 16:9, el aspecto real del
       escenario, para no tirar pixeles de ancho.

       El arreglo de verdad son originales mas grandes: estos son capturas de
       movil de un anuncio. Anotado en OWNER-TODO. */
    const meta = await sharp(src).metadata();
    const SLIDE_W = 1800, SLIDE_H = Math.round(SLIDE_W / (16 / 9));
    const crop = await cropRect(src, meta.width, meta.height, 16 / 9);
    const base = sharp(src).rotate().extract(crop)
      .resize(SLIDE_W, SLIDE_H, { fit: 'cover', kernel: 'lanczos3' })
      .sharpen({ sigma: 0.9, m1: 0.6, m2: 0.35 });
    const slide = await base.clone()
      .jpeg({ quality: 88, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' }).toBuffer();
    fs.writeFileSync(path.join(CARS, `${c.slug}.jpg`), slide);
    const slideWebp = await base.clone().webp({ quality: 84 }).toBuffer();
    fs.writeFileSync(path.join(CARS, `${c.slug}.webp`), slideWebp);

    /* Textura del tubo: pequena a proposito — son 13 texturas cargadas a la
       vez en WebGL y el tile se ve a pocos cientos de pixeles. */
    const ring = await sharp(src).resize(640, 427, { fit: 'cover' })
      .jpeg({ quality: 72, mozjpeg: true }).toBuffer();
    fs.writeFileSync(path.join(RING, `${c.slug}.jpg`), ring);

    report.push({ slug: c.slug, webpKb: Math.round(slideWebp.length/1024), slideKb: Math.round(slide.length / 1024), ringKb: Math.round(ring.length / 1024), srcW: (await sharp(src).metadata()).width });
  }

  /* js/fleet.js — la forma que esperan experience.js y app.js, con los 13
     coches reales. Generado: no se edita a mano. */
  const entries = fleet.cars.map(c => {
    const o = {
      slug: c.slug, name: c.name, brand: c.brandLabel,
      category: c.bodyType, bodyType: c.bodyType,
      powerCv: c.powerCv, zeroToHundred: c.zeroToHundred, topSpeed: c.topSpeed,
      transmission: c.transmission, drivetrain: c.drivetrain, seats: c.seats,
      fuel: c.fuel, accent: ACCENT[c.brand] || '#c9cdd7',
      featured: ['lamborghini-urus', 'mercedes-amg-g63', 'audi-rs6-avant',
        'porsche-911-cabrio', 'porsche-cayenne-hybrid'].includes(c.slug),
      taglineEs: c.taglineEs,
      highlightsEs: c.highlightsEs,
      prices: { d1: c.prices.d1, d2: c.prices.d2, d3: c.prices.d3, w1: c.prices.w1, m1: c.prices.m1 },
      deposit: c.deposit,
      url: `/coches/${c.slug}/`,
    };
    return '  ' + JSON.stringify(o);
  }).join(',\n');

  /* Las texturas del tubo las pide experience.js en caliente, asi que no
     pasan por el generador de HTML y no llevan hash en la URL. Se publica
     una version calculada sobre los propios archivos: al cambiar una foto
     cambia la version y el navegador deja de servir la vieja de cache. */
  const ringV = require('crypto').createHash('sha1')
    .update(fleet.cars.map(c => fs.readFileSync(path.join(RING, c.slug + '.jpg'))).join(''))
    .digest('hex').slice(0, 10);

  const js = `/* =====================================================================
   SERRES DRIVE — dataset para la portada (hero 3D + tubo)
   GENERADO por _build/build-home-assets.js desde data/fleet.json.
   No editar a mano: el siguiente build lo pisa. Los precios viven en
   _build/fleet-base.json y de ahi bajan a data/fleet.json.

   Son los 13 coches REALES. La version anterior de este archivo tenia 31
   e incluia Ferrari, BMW, McLaren y demas, que ya no estan en la flota.
   ===================================================================== */
window.SERRES_RING_V = "${ringV}";
window.SERRES_FLEET = [
${entries}
];
`;
  fs.writeFileSync(path.join(ROOT, 'js/fleet.js'), js);

  console.log(`js/fleet.js — ${fleet.cars.length} coches`);
  report.forEach(r => console.log(`  ${r.slug.padEnd(24)} src ${String(r.srcW).padStart(4)}px -> slide 1800px jpg ${String(r.slideKb).padStart(3)}KB webp ${String(r.webpKb).padStart(3)}KB   ring ${String(r.ringKb).padStart(3)}KB`));
  const featured = fleet.cars.filter(c => ['lamborghini-urus', 'mercedes-amg-g63', 'audi-rs6-avant', 'porsche-911-cabrio', 'porsche-cayenne-hybrid'].includes(c.slug));
  console.log(`destacados: ${featured.map(c => c.name).join(' · ')}`);
})();
