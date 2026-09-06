/* Construye data/seo-meta.json — el <head> de cada página se renderiza desde
   aquí (ETAPA 7). Ahora en cinco idiomas: el archivo es { es:{pages}, en:{…} }.

   Los títulos y descripciones se componen desde data/fleet.json y desde las
   plantillas de la sección "seo" de cada diccionario, así que un precio o un
   nombre siguen viviendo en un único sitio.

   Regenerar: node _build/build-seo-meta.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const fleet = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fleet.json'), 'utf8'));
const { origin } = fleet.site;

const LANGS = ['es', 'en', 'ru', 'ca', 'fr'].map(code => ({
  code,
  dict: JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n', `${code}.json`), 'utf8')),
  prefix: code === 'es' ? '' : '/' + code,
}));

const eur = n => n.toLocaleString('de-DE') + ' €';
const cheapest = cars => cars.reduce((m, c) => Math.min(m, c.prices.d1), Infinity);
const car = slug => fleet.cars.find(c => c.slug === slug);
const carsOf = brand => fleet.brands.find(b => b.slug === brand).cars.map(car);
const f = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => vars[k] !== undefined ? vars[k] : m);

const out = {};

for (const lang of LANGS) {
  const S = lang.dict.seo;
  const pages = {};
  /* canonical lleva el prefijo de idioma; la clave del objeto NO, para que
     el generador pueda pedir seo['/flota/'] sea cual sea el idioma. */
  const add = (url, o) => { pages[url] = { url, canonical: origin + lang.prefix + url, ...o }; };
  const list = names => names.length === 1 ? names[0]
    : names.slice(0, -1).join(', ') + S.listJoin + names[names.length - 1];

  const T = fleet.terms;
  const vars = {
    total: fleet.cars.length,
    from: eur(cheapest(fleet.cars)),
    deposit: eur(T.depositFrom),
    delivery: eur(T.deliveryFee),
    age: T.minAge,
    km: T.kmIncluded,
  };

  add('/', { title: S.homeTitle, description: f(S.homeDesc, vars), h1: S.homeH1, type: 'home',
    image: origin + '/' + car('porsche-911-cabrio').image });
  add('/flota/', { title: S.fleetTitle, description: f(S.fleetDesc, vars), h1: lang.dict.fleet.h1, type: 'fleet',
    image: origin + '/' + car('lamborghini-urus').image });
  add('/tarifas/', { title: S.ratesTitle, description: f(S.ratesDesc, vars), h1: lang.dict.rates.h1, type: 'rates',
    image: origin + '/' + car('mercedes-amg-g63').image });
  add('/como-funciona/', { title: S.howTitle, description: S.howDesc, h1: lang.dict.how.h1, type: 'how',
    image: origin + '/' + car('mercedes-amg-g63').image });
  add('/condiciones-de-alquiler/', { title: S.termsTitle, description: f(S.termsDesc, vars), h1: lang.dict.termsPage.h1, type: 'terms',
    image: origin + '/' + car('porsche-911-carrera-s').image });
  add('/por-que-serres/', { title: S.whyTitle, description: S.whyDesc, h1: lang.dict.why.h1, type: 'why',
    image: origin + '/' + car('range-rover-velar').image });
  add('/contacto/', { title: S.contactTitle, description: S.contactDesc, h1: lang.dict.contact.h1, type: 'contact',
    image: origin + '/' + car('mercedes-amg-a45').image });

  for (const brand of fleet.brands) {
    const cars = carsOf(brand.slug);
    const v = { brand: brand.label, list: list(cars.map(c => c.name)), from: eur(cheapest(cars)) };
    add(`/flota/${brand.slug}/`, {
      title: f(S.brandTitle, v),
      description: f(cars.length === 1 ? S.brandDescOne : S.brandDescMany, v),
      h1: f(S.brandH1, v), type: 'brand', brand: brand.slug,
      image: origin + '/' + cars[0].image,
    });
  }

  for (const c of fleet.cars) {
    const v = { car: c.name, from: eur(c.prices.d1), cv: c.powerCv, zero: c.zeroToHundred };
    add(`/coches/${c.slug}/`, {
      title: f(S.carTitle, v), description: f(S.carDesc, v), h1: f(S.carH1, v),
      type: 'car', slug: c.slug, image: origin + '/' + c.image,
    });
  }

  out[lang.code] = { pages };
}

fs.writeFileSync(path.join(ROOT, 'data/seo-meta.json'), JSON.stringify(out, null, 2));

const per = Object.keys(out.es.pages).length;
console.log(`data/seo-meta.json — ${LANGS.length} idiomas x ${per} páginas = ${LANGS.length * per}`);
for (const lang of LANGS) {
  const long = Object.values(out[lang.code].pages).filter(p => p.title.length > 65);
  console.log(`  ${lang.code}: ${Object.keys(out[lang.code].pages).length} páginas` +
    (long.length ? `  (${long.length} title > 65 car.)` : ''));
}
