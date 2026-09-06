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

const ROOT = path.join(__dirname, '..');
const fleet = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fleet.json'), 'utf8'));

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
    const src = path.join(ROOT, c.gallery[0].jpg);

    /* Diapositiva del carrusel: el markup declara width=1280, pero los
       originales no llegan; se sube solo hasta el ancho real disponible. */
    const meta = await sharp(src).metadata();
    const wide = Math.min(1280, meta.width);
    const slide = await sharp(src).resize(wide, Math.round(wide / 1.5), { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true, progressive: true }).toBuffer();
    fs.writeFileSync(path.join(CARS, `${c.slug}.jpg`), slide);

    /* Textura del tubo: pequena a proposito — son 13 texturas cargadas a la
       vez en WebGL y el tile se ve a pocos cientos de pixeles. */
    const ring = await sharp(src).resize(640, 427, { fit: 'cover' })
      .jpeg({ quality: 72, mozjpeg: true }).toBuffer();
    fs.writeFileSync(path.join(RING, `${c.slug}.jpg`), ring);

    report.push({ slug: c.slug, slideKb: Math.round(slide.length / 1024), ringKb: Math.round(ring.length / 1024), w: wide });
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

  const js = `/* =====================================================================
   SERRES DRIVE — dataset para la portada (hero 3D + tubo)
   GENERADO por _build/build-home-assets.js desde data/fleet.json.
   No editar a mano: el siguiente build lo pisa. Los precios viven en
   _build/fleet-base.json y de ahi bajan a data/fleet.json.

   Son los 13 coches REALES. La version anterior de este archivo tenia 31
   e incluia Ferrari, BMW, McLaren y demas, que ya no estan en la flota.
   ===================================================================== */
window.SERRES_FLEET = [
${entries}
];
`;
  fs.writeFileSync(path.join(ROOT, 'js/fleet.js'), js);

  console.log(`js/fleet.js — ${fleet.cars.length} coches`);
  report.forEach(r => console.log(`  ${r.slug.padEnd(24)} slide ${String(r.w).padStart(4)}px ${String(r.slideKb).padStart(3)}KB   ring ${String(r.ringKb).padStart(3)}KB`));
  const featured = fleet.cars.filter(c => ['lamborghini-urus', 'mercedes-amg-g63', 'audi-rs6-avant', 'porsche-911-cabrio', 'porsche-cayenne-hybrid'].includes(c.slug));
  console.log(`destacados: ${featured.map(c => c.name).join(' · ')}`);
})();
