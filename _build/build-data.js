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

const out = { generated: 'run _build/build-data.js to regenerate', site: base.site, contact: base.contact, terms: base.terms, brands, cars };
fs.writeFileSync(path.join(ROOT, 'data/fleet.json'), JSON.stringify(out, null, 2));
console.log(`data/fleet.json — ${cars.length} cars, ${brands.length} brands, ${cars.reduce((n, c) => n + c.gallery.length, 0)} images`);
brands.forEach(b => console.log(`  ${b.slug.padEnd(14)} ${b.cars.length}  ${b.cars.join(', ')}`));
