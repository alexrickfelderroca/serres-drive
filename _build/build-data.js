/* Merges the three inputs into data/fleet.json, the single source of truth
   the site is generated from:
     _build/fleet-base.json     prices / slugs / deposits  (from the brief)
     _build/fleet-specs.json    researched + verified specs and Spanish copy
     _build/image-manifest.json what build-images.js actually wrote
   Nothing downstream may hardcode a price, a name or a slug. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'fleet-base.json'), 'utf8'));
const specs = JSON.parse(fs.readFileSync(path.join(__dirname, 'fleet-specs.json'), 'utf8'));
const images = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-manifest.json'), 'utf8'));

const cars = base.cars.map(car => {
  const s = specs[car.slug];
  const shots = images[car.slug];
  if (!s) throw new Error(`no specs for ${car.slug}`);
  if (!shots || !shots.length) throw new Error(`no images for ${car.slug}`);
  /* Nada de datos comerciales a medias. Un coche sin fianza, sin km/dia o sin
     precio de un dia se publicaria con un hueco, y un hueco en un precio lo
     acaba pagando alguien. kmExtra y location SI pueden ser null a proposito:
     null significa "no lo sabemos" y la web lo dice, en vez de inventarlo. */
  if (typeof car.prices?.d1 !== 'number') throw new Error(`${car.slug}: falta prices.d1`);
  if (typeof car.kmPerDay !== 'number') throw new Error(`${car.slug}: falta kmPerDay`);
  if (car.deposit !== null && typeof car.deposit !== 'number') throw new Error(`${car.slug}: deposit invalido`);
  if (car.kmExtra !== null && typeof car.kmExtra !== 'number') throw new Error(`${car.slug}: kmExtra invalido`);
  if (car.location !== null && typeof car.location !== 'string') throw new Error(`${car.slug}: location invalida`);
  const dir = `assets/img/cars/${car.slug}`;
  return {
    ...car,
    variant: s.assumedVariant,
    powerCv: s.powerCv,
    zeroToHundred: s.zeroToHundred,
    topSpeed: s.topSpeed,
    transmission: s.transmission,
    drivetrain: s.drivetrain,
    seats: s.seats,
    fuel: s.fuel,
    bodyType: s.bodyType,
    engine: s.engine,
    taglineEs: s.taglineEs,
    highlightsEs: s.highlightsEs,
    specConfidence: s.confidence,
    specVerified: s.verified,
    ownerNotes: s.notes,
    image: `${dir}/${shots[0].base}.jpg`,          // og:image + schema Product.image
    gallery: shots.map(sh => ({
      jpg: `${dir}/${sh.base}.jpg`,
      webp: `${dir}/${sh.base}.webp`,
      jpg800: `${dir}/${sh.base}-800.jpg`,
      webp800: `${dir}/${sh.base}-800.webp`,
      width: sh.width, height: sh.height,
    })),
  };
});

const byBrand = {};
cars.forEach(c => (byBrand[c.brand] ||= []).push(c.slug));
const brands = base.brands.map(b => ({ ...b, cars: byBrand[b.slug] || [] }));
brands.forEach(b => { if (!b.cars.length) throw new Error(`brand ${b.slug} has no cars`); });

/* "Fianza desde X" se calcula, no se teclea. Estaba fijo en 2.000 € y al
   entrar la Clase V (1.000 €) la frase paso a ser falsa en la portada, en
   /tarifas, en /condiciones-de-alquiler y en las descripciones SEO de los
   cinco idiomas a la vez. Igual que los precios: vive en un solo sitio. */
const fianzas = cars.map(c => c.deposit).filter(d => typeof d === 'number');
const terms = { ...base.terms, depositFrom: Math.min(...fianzas) };

const out = { generated: 'run _build/build-data.js to regenerate', site: base.site, contact: base.contact, terms, brands, cars };
fs.writeFileSync(path.join(ROOT, 'data/fleet.json'), JSON.stringify(out, null, 2));
console.log(`data/fleet.json — ${cars.length} cars, ${brands.length} brands, ${cars.reduce((n, c) => n + c.gallery.length, 0)} images`);
brands.forEach(b => console.log(`  ${b.slug.padEnd(14)} ${b.cars.length}  ${b.cars.join(', ')}`));
