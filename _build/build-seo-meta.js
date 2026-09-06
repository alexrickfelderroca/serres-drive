/* Builds data/seo-meta.json — the head of every page is rendered from it
   (ETAPA 7). Titles and descriptions are composed from data/fleet.json so a
   price or a name only ever lives in one place; the wording per page type is
   the editable part below. Regenerate with: node _build/build-seo-meta.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const fleet = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fleet.json'), 'utf8'));
const { origin } = fleet.site;

const eur = n => n.toLocaleString('de-DE') + ' €';         // "1.000 €"
const cheapest = cars => cars.reduce((m, c) => Math.min(m, c.prices.d1), Infinity);
const car = slug => fleet.cars.find(c => c.slug === slug);
const carsOf = brand => fleet.brands.find(b => b.slug === brand).cars.map(car);
const list = names =>
  names.length === 1 ? names[0]
  : names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1];

const pages = {};
const add = (url, o) => { pages[url] = { url, canonical: origin + url, ...o }; };

/* ---- static pages -------------------------------------------------- */
add('/', {
  title: 'Alquiler de coches de lujo en Barcelona · Serres Drive',
  description: `Alquiler de coches de lujo en Barcelona y Sant Cugat: Porsche, Lamborghini, Mercedes-AMG, Audi, Range Rover y Volkswagen desde ${eur(cheapest(fleet.cars))} al día. Reserva por WhatsApp.`,
  h1: 'Alquiler de coches de lujo en Barcelona',
  type: 'home',
  image: origin + '/' + car('porsche-911-cabrio').image,
});

add('/flota/', {
  title: 'Nuestra flota · Serres Drive Barcelona',
  description: `Los ${fleet.cars.length} coches disponibles ahora mismo en Serres Drive, con precio por día, por semana y por mes. Entrega en el área metropolitana de Barcelona.`,
  h1: 'Nuestra flota',
  type: 'fleet',
  image: origin + '/' + car('lamborghini-urus').image,
});

add('/tarifas/', {
  title: 'Tarifas de alquiler · Serres Drive Barcelona',
  description: `Precios de 1 día, 2 días, 3 días, 1 semana y 1 mes para los ${fleet.cars.length} coches de la flota. Fianza desde ${eur(fleet.terms.depositFrom)}. Sin sorpresas.`,
  h1: 'Tarifas',
  type: 'rates',
  image: origin + '/' + car('mercedes-amg-g63').image,
});

add('/como-funciona/', {
  title: 'Cómo funciona el alquiler · Serres Drive',
  description: 'Elige el coche, reserva por WhatsApp, recoge o pide la entrega y conduce. Cuatro pasos y una sola persona al otro lado del teléfono.',
  h1: 'Cómo funciona',
  type: 'how',
  image: origin + '/' + car('mercedes-amg-g63').image,
});

add('/condiciones-de-alquiler/', {
  title: 'Condiciones de alquiler · Serres Drive',
  description: `Desde 18 años, sin antigüedad mínima de carnet, ${fleet.terms.kmIncluded} km incluidos, fianza desde ${eur(fleet.terms.depositFrom)} y entrega en el área metropolitana por ${eur(fleet.terms.deliveryFee)}.`,
  h1: 'Condiciones de alquiler',
  type: 'terms',
  image: origin + '/' + car('porsche-911-carrera-s').image,
});

add('/por-que-serres/', {
  title: 'Por qué Serres Drive · Alquiler en Sant Cugat',
  description: 'Flota propia y revisada, entrega donde estés dentro del área metropolitana de Barcelona y trato directo por WhatsApp, sin mostradores ni colas.',
  h1: 'Por qué Serres Drive',
  type: 'why',
  image: origin + '/' + car('range-rover-velar').image,
});

add('/contacto/', {
  title: 'Contacto y reservas · Serres Drive Barcelona',
  description: 'Reserva tu coche por WhatsApp o escríbenos desde el formulario. Serres Drive, Sant Cugat del Vallès, área metropolitana de Barcelona.',
  h1: 'Contacto',
  type: 'contact',
  image: origin + '/' + car('mercedes-amg-a45').image,
});

/* ---- brand pages ---------------------------------------------------- */
for (const brand of fleet.brands) {
  const cars = carsOf(brand.slug);
  const names = cars.map(c => c.name);
  add(`/flota/${brand.slug}/`, {
    title: `Alquiler de ${brand.label} en Barcelona · Serres Drive`,
    description: `${cars.length === 1 ? 'Disponible' : 'Disponibles'} en Serres Drive: ${list(names)}. Desde ${eur(cheapest(cars))} al día, con entrega en el área metropolitana de Barcelona.`,
    h1: `Alquiler de ${brand.label} en Barcelona`,
    type: 'brand',
    brand: brand.slug,
    image: origin + '/' + cars[0].image,
  });
}

/* ---- car pages ------------------------------------------------------ */
for (const c of fleet.cars) {
  add(`/coches/${c.slug}/`, {
    title: `Alquiler ${c.name} en Barcelona · Serres Drive`,
    description: `Alquila un ${c.name} en Barcelona desde ${eur(c.prices.d1)} al día. ${c.powerCv} CV, 0-100 en ${c.zeroToHundred}. Reserva por WhatsApp con entrega en el área metropolitana.`,
    h1: `Alquiler ${c.name} en Barcelona`,
    type: 'car',
    slug: c.slug,
    image: origin + '/' + c.image,
  });
}

const long = Object.values(pages).filter(p => p.title.length > 62);
fs.writeFileSync(path.join(ROOT, 'data/seo-meta.json'), JSON.stringify({ pages }, null, 2));
console.log(`data/seo-meta.json — ${Object.keys(pages).length} pages`);
if (long.length) {
  console.log(`  note: ${long.length} title(s) over 62 chars:`);
  long.forEach(p => console.log(`    ${p.title.length}  ${p.url}  ${p.title}`));
}
