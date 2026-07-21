#!/usr/bin/env node
/* =====================================================================
   SERRES DRIVE — tools/build-seo-pages.js

   Static SEO build. Run manually (node tools/build-seo-pages.js) whenever
   js/fleet.js changes, and commit the output. No build pipeline: the site
   stays plain files on Hostinger; this script just pre-renders what search
   engines must be able to see without executing JavaScript.

   It generates, from js/fleet.js + car.html (used as the chrome template):

   1. alquiler-<slug>-barcelona.html      one real page per car: unique
      title/description/canonical/OG (the car's own photo, real pixel size),
      Product+Car+Offer JSON-LD with every published price tier, breadcrumb
      JSON-LD, and a fully crawlable pre-render of the ficha (hero, specs,
      prices, highlights). js/car.js hydrates it into the interactive page
      (slug derived from the filename — see boot() in js/car.js).

   2. alquiler-<brand>-barcelona.html     brand landing pages ("alquiler
      ferrari barcelona" is won by dedicated brand pages in every SERP we
      checked): unique copy, static cards for that brand's cars, ItemList
      JSON-LD.

   3. fleet.html                          static crawlable list of every car
      between BUILD:FLEET-STATIC markers (fleet-gallery.js replaces it).

   4. rates.html                          static price-table rows between
      BUILD:RATES-STATIC markers (app.js renderRates() replaces them).

   5. sitemap.xml                         core pages + all generated pages,
      lastmod from git where the file is tracked.
   ===================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SITE = "https://serresdrive.com/";
const WA = "https://wa.me/34621244469?text=";

/* ---------- load the fleet ---------- */
const w = {};
new Function("window", fs.readFileSync(path.join(ROOT, "js/fleet.js"), "utf8"))(w);
const FLEET = w.SERRES_FLEET;
if (!FLEET || !FLEET.length) throw new Error("SERRES_FLEET failed to load");

/* ---------- small helpers ---------- */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const eurES = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €";
const lbl = (es, en) => `<span data-es>${es}</span><span data-en>${en}</span>`;
const carUrl = (slug) => `alquiler-${slug}-barcelona.html`;

function fromPrice(car) {
  const p = car.prices || {};
  if (p.d1 != null) return { amount: p.d1, es: "/día", en: "/day" };
  if (p.w1 != null) return { amount: p.w1, es: "/semana", en: "/week" };
  if (p.d15 != null) return { amount: p.d15, es: "/15 días", en: "/15 days" };
  if (p.m1 != null) return { amount: p.m1, es: "/mes", en: "/month" };
  return null;
}

/* JPEG pixel size (SOF scan) so og:image:width/height are real values. */
function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

function gitLastMod(file) {
  try {
    const out = execSync(`git log -1 --format=%cs -- "${file}"`, { cwd: ROOT }).toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch (e) { /* untracked */ }
  return new Date().toISOString().slice(0, 10);
}

/* ---------- head surgery on the car.html template ---------- */
const TEMPLATE = fs.readFileSync(path.join(ROOT, "car.html"), "utf8");

function buildHead(tpl, o) {
  let h = tpl;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(o.title)}</title>`);
  h = h.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(o.description)}$2`);
  // the shell's "why no canonical" comment does not belong on generated pages
  h = h.replace(/<!-- No static canonical[\s\S]*?-->\n?/, "");
  h = h.replace(/(<meta name="theme-color"[^>]*>)/, `$1\n<link rel="canonical" href="${o.url}">`);
  h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(o.title)}$2`);
  h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(o.description)}$2`);
  h = h.replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${o.ogType || "website"}$2`);
  h = h.replace(/(<meta property="og:type"[^>]*>)/, `$1\n<meta property="og:url" content="${o.url}">`);
  h = h.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${o.image}$2`);
  h = h.replace(/(<meta property="og:image:width" content=")[^"]*(")/, `$1${o.imageW}$2`);
  h = h.replace(/(<meta property="og:image:height" content=")[^"]*(")/, `$1${o.imageH}$2`);
  h = h.replace(/(<meta property="og:image:alt" content=")[^"]*(")/, `$1${esc(o.imageAlt)}$2`);
  h = h.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(o.title)}$2`);
  h = h.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(o.description)}$2`);
  h = h.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${o.image}$2`);
  // extra JSON-LD after the shared AutoRental block
  if (o.jsonld) h = h.replace(/<\/head>/, `<script type="application/ld+json">\n${JSON.stringify(o.jsonld, null, 1)}\n</script>\n</head>`);
  // page marker
  h = h.replace(/<!DOCTYPE html>/i, `<!DOCTYPE html>\n<!-- GENERATED by tools/build-seo-pages.js — do not edit by hand. Edit js/fleet.js or the generator and re-run. -->`);
  return h;
}

function replaceMain(html, mainHtml) {
  return html.replace(/<main class="wrap car-detail" id="carDetail">[\s\S]*?<\/main>/, mainHtml);
}

/* ---------- 1 · per-car pages ---------- */
const DRIVE_CFG = {
  RWD: "https://schema.org/RearWheelDriveConfiguration",
  AWD: "https://schema.org/AllWheelDriveConfiguration",
  FWD: "https://schema.org/FrontWheelDriveConfiguration"
};
const TIERS = [["d1", 1, "DAY", "1 día", "1 day"], ["w1", 1, "WEE", "1 semana", "1 week"], ["d15", 15, "DAY", "15 días", "15 days"], ["m1", 1, "MON", "1 mes", "1 month"]];

function carJsonLd(car, url) {
  const specs = TIERS.filter((t) => car.prices && car.prices[t[0]] != null).map((t) => ({
    "@type": "UnitPriceSpecification",
    "price": car.prices[t[0]],
    "priceCurrency": "EUR",
    "referenceQuantity": { "@type": "QuantitativeValue", "value": t[1], "unitCode": t[2] }
  }));
  const offer = {
    "@type": "Offer",
    "url": url,
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "seller": { "@id": SITE + "#business" }
  };
  if (specs.length) { offer.price = specs[0].price; offer.priceSpecification = specs; }
  const model = car.name.replace(car.brand, "").trim() || car.name;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Product", "Car"],
        "@id": url + "#car",
        "name": car.name,
        "brand": { "@type": "Brand", "name": car.brand },
        "model": model,
        "vehicleModelDate": String(car.year),
        "bodyType": car.bodyType,
        "vehicleTransmission": car.transmission,
        "driveWheelConfiguration": DRIVE_CFG[car.drivetrain] || car.drivetrain,
        "seatingCapacity": car.seats,
        "fuelType": car.fuel,
        "vehicleEngine": { "@type": "EngineSpecification", "enginePower": { "@type": "QuantitativeValue", "value": car.powerCv, "unitText": "CV" } },
        "image": SITE + "assets/img/cars/" + car.slug + ".jpg",
        "url": url,
        "description": car.taglineEs || "",
        "offers": offer
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": SITE },
          { "@type": "ListItem", "position": 2, "name": "Flota", "item": SITE + "fleet.html" },
          { "@type": "ListItem", "position": 3, "name": car.name, "item": url }
        ]
      }
    ]
  };
}

function carMain(car, dims) {
  const wa = WA + encodeURIComponent(`Hola SERRES DRIVE 👋, me interesa reservar el ${car.name}. ¿Disponibilidad y condiciones?`);
  const fp = fromPrice(car);
  const rows = TIERS.filter((t) => car.prices && car.prices[t[0]] != null)
    .map((t) => `<tr><td>${lbl(t[3], t[4])}</td><td>${eurES(car.prices[t[0]])}</td></tr>`).join("\n            ");
  const hl = (car.highlightsEs || []).map((h, i) =>
    `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg><span>${lbl(esc(h), esc((car.highlightsEn || [])[i] || h))}</span></li>`).join("\n            ");
  const dimAttrs = dims ? ` width="${dims.width}" height="${dims.height}"` : "";
  return `<main class="wrap car-detail" id="carDetail">
  <!-- Static pre-render: crawlable without JavaScript. js/car.js replaces
       this whole container with the interactive ficha on load. -->
  <a class="back-link" href="fleet.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>${lbl("Volver a la flota", "Back to the fleet")}</a>
  <nav class="breadcrumb" aria-label="Ruta" style="margin:8px 0 4px">
    <a href="/">${lbl("Inicio", "Home")}</a><span class="sep">/</span>
    <a href="fleet.html">${lbl("Flota", "Fleet")}</a><span class="sep">/</span>
    <span>${esc(car.name)}</span>
  </nav>
  <div class="car-hero">
    <div class="car-hero-media">
      <span class="car-hero-cat">${lbl(esc(car.category), esc(car.category === "Deportivo" ? "Sports" : car.category === "Descapotable" ? "Convertible" : car.category === "Lujo" ? "Luxury" : car.category))}</span>
      <img alt="${esc(car.name)} de alquiler en Barcelona — Serres Drive" src="assets/img/cars/${car.slug}.jpg"${dimAttrs}>
    </div>
    <div class="car-hero-info">
      <span class="eyebrow">${lbl("Alquiler de coches de lujo · Barcelona", "Luxury car rental · Barcelona")}</span>
      <h1>${esc(car.name)}</h1>
      <p class="tag">${lbl(esc(car.taglineEs), esc(car.taglineEn))}</p>
      <div class="car-hero-specs">
        <span class="spec"><b>${car.powerCv}</b> CV</span>
        <span class="spec"><b>${esc(car.zeroToHundred)}</b> 0–100</span>
        <span class="spec"><b>${esc(car.topSpeed)}</b></span>
        <span class="spec"><b>${esc(car.drivetrain)}</b></span>
      </div>
      <div class="car-hero-buy">
        <div class="car-hero-price">
          ${fp ? `<span class="from">${lbl("Desde", "From")}</span><span class="amt">${eurES(fp.amount)}<small>${lbl(fp.es, fp.en)}</small></span>` : `<span class="amt">${lbl("Consúltanos", "On request")}</span>`}
        </div>
        <div class="car-hero-actions">
          <a class="btn wa" href="${wa}" target="_blank" rel="noopener">${lbl("Reservar por WhatsApp", "Book on WhatsApp")}</a>
          <a class="btn ghost" href="rates.html">${lbl("Ver tarifas", "See rates")}</a>
        </div>
      </div>
    </div>
  </div>
  <section class="car-section">
    <h2>${lbl("Especificaciones", "Specifications")}</h2>
    <div class="spec-sheet">
      <div class="cell"><div class="k">${lbl("Potencia", "Power")}</div><div class="v">${car.powerCv}<small>CV</small></div></div>
      <div class="cell"><div class="k">0–100 km/h</div><div class="v">${esc(car.zeroToHundred)}</div></div>
      <div class="cell"><div class="k">${lbl("Vel. máx", "Top speed")}</div><div class="v">${esc(car.topSpeed)}</div></div>
      <div class="cell"><div class="k">${lbl("Cambio", "Gearbox")}</div><div class="v">${esc(car.transmission)}</div></div>
      <div class="cell"><div class="k">${lbl("Tracción", "Drivetrain")}</div><div class="v">${esc(car.drivetrain)}</div></div>
      <div class="cell"><div class="k">${lbl("Plazas", "Seats")}</div><div class="v">${car.seats}</div></div>
      <div class="cell"><div class="k">${lbl("Combustible", "Fuel")}</div><div class="v">${esc(car.fuel)}</div></div>
      <div class="cell"><div class="k">${lbl("Carrocería", "Body")}</div><div class="v">${esc(car.bodyType)}</div></div>
    </div>
  </section>
  <section class="car-section">
    <h2>${lbl("Tarifas", "Rates")}</h2>
    <p class="sub">${lbl("Precios orientativos en EUR. Kilometraje y condiciones a confirmar por WhatsApp.", "Indicative prices in EUR. Mileage and terms confirmed on WhatsApp.")}</p>
    <div class="price-block">
      <table class="price-table"><thead><tr><th>${lbl("Duración", "Duration")}</th><th style="text-align:right">${lbl("Precio", "Price")}</th></tr></thead><tbody>
            ${rows}
      </tbody></table>
      <div class="price-aside">
        <div class="dep-k">${lbl("Fianza", "Deposit")}</div>
        <div class="dep-v">${lbl("Según reserva", "Per booking")}</div>
        <p>${lbl("Reembolsable, según vehículo y duración. Se libera tras la devolución del coche en su estado de entrega.", "Refundable, set by car and rental length. Released once the car is returned in its delivery condition.")}</p>
        <a class="btn wa" href="${wa}" target="_blank" rel="noopener">${lbl("Reservar este coche", "Book this car")}</a>
      </div>
    </div>
  </section>
  ${hl ? `<section class="car-section">
    <h2>${lbl("Lo que lo hace especial", "What makes it special")}</h2>
    <ul class="hl-list">
            ${hl}
    </ul>
  </section>` : ""}
</main>`;
}

const generated = [];
for (const car of FLEET) {
  const url = SITE + carUrl(car.slug);
  const img = path.join(ROOT, "assets/img/cars", car.slug + ".jpg");
  const dims = fs.existsSync(img) ? jpegSize(img) : null;
  const d1 = car.prices && car.prices.d1;
  const title = `Alquiler ${car.name} en Barcelona${d1 ? ` — desde ${eurES(d1)}/día` : ""} | SERRES DRIVE`;
  const description = `Alquiler ${car.name} en Barcelona${d1 ? ` desde ${eurES(d1)}/día` : " — precio a consultar"}. ${car.powerCv} CV · ${car.year}. Entrega a domicilio, en tu hotel o en el aeropuerto de Barcelona-El Prat. Reserva por WhatsApp.`;
  let html = buildHead(TEMPLATE, {
    title, description, url,
    image: SITE + "assets/img/cars/" + car.slug + ".jpg",
    imageW: dims ? dims.width : 1280, imageH: dims ? dims.height : 800,
    imageAlt: `Alquiler ${car.name} en Barcelona — Serres Drive`,
    jsonld: carJsonLd(car, url)
  });
  html = replaceMain(html, carMain(car, dims));
  fs.writeFileSync(path.join(ROOT, carUrl(car.slug)), html);
  generated.push(carUrl(car.slug));
}

/* ---------- 2 · brand landing pages ---------- */
const BRANDS = [
  {
    key: "ferrari", match: (c) => c.brand === "Ferrari", display: "Ferrari",
    es: "Conducir un Ferrari por Barcelona no necesita presentación: necesita fechas. En Serres Drive alquilamos Ferrari descapotables y coupé — del V8 biturbo del F8 Spider al canto atmosférico del 458 Spider — preparados en nuestro taller con detailing de nivel concours antes de cada entrega. Te llevamos el coche a tu hotel, a tu casa o al aeropuerto de Barcelona-El Prat, y la reserva se cierra por WhatsApp en minutos: nos dices fechas y modelo, te confirmamos disponibilidad, fianza y condiciones al momento.",
    en: "Driving a Ferrari through Barcelona needs no introduction — only dates. Serres Drive rents Ferrari convertibles and coupés, from the F8 Spider's twin-turbo V8 to the naturally aspirated song of the 458 Spider, each prepared to concours standard in our own workshop before every handover. We deliver to your hotel, home or Barcelona-El Prat airport, and booking closes over WhatsApp in minutes."
  },
  {
    key: "lamborghini", match: (c) => c.brand === "Lamborghini", display: "Lamborghini",
    es: "Un Lamborghini convierte cualquier trayecto por Barcelona en un acontecimiento. Alquila el Urus — el SUV que acepta equipaje y devora autopista — o el Huracán Coupé y su V10 atmosférico de 8.500 vueltas. Cada coche sale de nuestro taller en estado impecable, con entrega a domicilio, en tu hotel o en el aeropuerto de Barcelona-El Prat. Reserva por WhatsApp: fechas, modelo y te confirmamos disponibilidad y fianza al momento.",
    en: "A Lamborghini turns any Barcelona drive into an event. Rent the Urus — the SUV that swallows luggage and motorways alike — or the Huracán Coupé with its 8,500-rpm naturally aspirated V10. Every car leaves our workshop in flawless condition, delivered to your hotel, home or Barcelona-El Prat airport. Booking is a WhatsApp message away."
  },
  {
    key: "porsche", match: (c) => c.brand === "Porsche", display: "Porsche",
    es: "Del 911 Targa GTS al Cayenne Turbo GT, alquilamos la gama Porsche que mejor sienta a Barcelona: bóxer atmosférico o biturbo, techo abierto o cinco plazas, siempre con la preparación concours de nuestro taller. Entrega a domicilio, en tu hotel o en el aeropuerto de Barcelona-El Prat, y reserva por WhatsApp con confirmación inmediata de disponibilidad, fianza y condiciones.",
    en: "From the 911 Targa GTS to the Cayenne Turbo GT, we rent the Porsche range that suits Barcelona best — flat-six or twin-turbo, open roof or five seats, always with our workshop's concours preparation. Delivery to your hotel, home or Barcelona-El Prat airport, booking confirmed instantly on WhatsApp."
  },
  {
    key: "mercedes", match: (c) => c.brand === "Mercedes-Benz", display: "Mercedes-AMG",
    es: "El AMG G 63 es el rey de Barcelona: presencia militar, 585 CV y un interior que no pide perdón. Lo alquilamos junto al resto de la gama Mercedes — del A45 S al C 220 d Cabrio para la costa — todos preparados en nuestro taller antes de cada entrega. Te lo llevamos a tu hotel, a casa o al aeropuerto de El Prat, y la reserva se confirma por WhatsApp al momento.",
    en: "The AMG G 63 owns Barcelona: military presence, 585 hp and an interior that apologises to no one. We rent it alongside the rest of the Mercedes range — from the A45 S to the C 220 d Cabrio for the coast — all workshop-prepared before every handover. Delivered to your hotel, home or El Prat airport; bookings confirmed instantly on WhatsApp."
  },
  {
    key: "audi", match: (c) => c.brand === "Audi", display: "Audi",
    es: "Cinco cilindros con voz propia, familiares de 600 CV y SUV quattro: la gama Audi RS que alquilamos en Barcelona cubre del RS 3 al RS 6 Avant, siempre con tracción total y la puesta a punto de nuestro taller. Entrega a domicilio, en tu hotel o en el aeropuerto de Barcelona-El Prat. Escríbenos por WhatsApp con fechas y modelo y te confirmamos disponibilidad al momento.",
    en: "Five-cylinder voices, 600-hp estates and quattro SUVs: our Audi RS range in Barcelona runs from the RS 3 to the RS 6 Avant, always all-wheel drive, always workshop-prepared. Delivery to your hotel, home or Barcelona-El Prat airport. Message us on WhatsApp with dates and model for instant confirmation."
  },
  {
    key: "bmw", match: (c) => c.brand === "BMW", display: "BMW",
    es: "Del M8 Competition Cabrio con 625 CV a cielo abierto al X7 de seis plazas para llegar a todas partes, la gama BMW M que alquilamos en Barcelona combina potencia y uso diario real. Cada coche pasa por nuestro taller antes de la entrega — a domicilio, en tu hotel o en el aeropuerto de El Prat — y la reserva se cierra por WhatsApp en minutos.",
    en: "From the 625-hp open-top M8 Competition Cabrio to the six-seat X7 that carries everyone, our BMW M range in Barcelona blends power with genuine everyday usability. Every car is workshop-prepared before delivery — to your hotel, home or El Prat airport — and booking closes on WhatsApp in minutes."
  }
];

function brandMain(b, cars) {
  const cards = cars.map((car) => {
    const fp = fromPrice(car);
    return `      <a class="car reveal" href="${carUrl(car.slug)}">
        <div class="car-media"><img loading="lazy" decoding="async" alt="Alquiler ${esc(car.name)} en Barcelona" src="assets/img/cars/${car.slug}.jpg"></div>
        <div class="car-body">
          <h3 class="car-name">${esc(car.name)}</h3>
          <p class="car-tag">${lbl(esc(car.taglineEs), esc(car.taglineEn))}</p>
          <div class="car-foot">
            <div class="car-price">${fp ? `<span class="from">${lbl("Desde", "From")}</span><span class="amt">${eurES(fp.amount)}<small>${lbl(fp.es, fp.en)}</small></span>` : `<span class="amt">${lbl("Consúltanos", "On request")}</span>`}</div>
          </div>
        </div>
      </a>`;
  }).join("\n");
  const others = BRANDS.filter((x) => x.key !== b.key)
    .map((x) => `<a href="alquiler-${x.key}-barcelona.html">${x.display}</a>`).join("\n      ");
  return `<main class="wrap car-detail" id="carDetail">
  <header class="page-header" style="border-bottom:0;padding-left:0;padding-right:0">
    <nav class="breadcrumb" aria-label="Ruta">
      <a href="/">${lbl("Inicio", "Home")}</a><span class="sep">/</span>
      <a href="fleet.html">${lbl("Flota", "Fleet")}</a><span class="sep">/</span>
      <span>${esc(b.display)}</span>
    </nav>
    <span class="eyebrow">${lbl("Alquiler " + esc(b.display), esc(b.display) + " rental")}</span>
    <h1>${lbl("Alquiler " + esc(b.display) + " en Barcelona", "Rent a " + esc(b.display) + " in Barcelona")}</h1>
    <p class="lede">${lbl(esc(b.es), esc(b.en))}</p>
  </header>
  <section class="section" style="padding-top:24px">
    <h2 class="section-title" style="font-size:clamp(1.4rem,3vw,2rem);margin-bottom:24px">${lbl("Nuestros " + esc(b.display), "Our " + esc(b.display) + " fleet")}</h2>
    <div class="fleet-grid">
${cards}
    </div>
  </section>
  <section class="section" style="padding-top:0">
    <p class="section-sub" style="margin-bottom:10px">${lbl("Otras marcas de la flota:", "Other brands in the fleet:")}</p>
    <div class="filters">
      ${others}
      <a href="fleet.html">${lbl("Toda la flota", "The whole fleet")}</a>
    </div>
  </section>
</main>`;
}

for (const b of BRANDS) {
  const cars = FLEET.filter(b.match);
  if (!cars.length) continue;
  const url = SITE + `alquiler-${b.key}-barcelona.html`;
  const minD1 = Math.min(...cars.filter((c) => c.prices && c.prices.d1 != null).map((c) => c.prices.d1));
  const priceBit = isFinite(minD1) ? ` — desde ${eurES(minD1)}/día` : "";
  const title = `Alquiler ${b.display} en Barcelona${priceBit} | SERRES DRIVE`;
  const description = `Alquila un ${b.display} en Barcelona con Serres Drive: ${cars.length} ${cars.length === 1 ? "modelo disponible" : "modelos disponibles"}${isFinite(minD1) ? `, desde ${eurES(minD1)} al día` : ""}. Entrega a domicilio, hotel o aeropuerto de El Prat. Reserva por WhatsApp.`;
  const first = cars[0];
  const img = path.join(ROOT, "assets/img/cars", first.slug + ".jpg");
  const dims = fs.existsSync(img) ? jpegSize(img) : null;
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        "@id": url + "#list",
        "name": `Alquiler ${b.display} en Barcelona — Serres Drive`,
        "numberOfItems": cars.length,
        "itemListElement": cars.map((c, i) => ({
          "@type": "ListItem", "position": i + 1, "name": c.name, "url": SITE + carUrl(c.slug)
        }))
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": SITE },
          { "@type": "ListItem", "position": 2, "name": "Flota", "item": SITE + "fleet.html" },
          { "@type": "ListItem", "position": 3, "name": b.display, "item": url }
        ]
      }
    ]
  };
  let html = buildHead(TEMPLATE, {
    title, description, url,
    image: SITE + "assets/img/cars/" + first.slug + ".jpg",
    imageW: dims ? dims.width : 1280, imageH: dims ? dims.height : 800,
    imageAlt: `Alquiler ${b.display} en Barcelona — Serres Drive`,
    jsonld
  });
  html = replaceMain(html, brandMain(b, cars));
  fs.writeFileSync(path.join(ROOT, `alquiler-${b.key}-barcelona.html`), html);
  generated.push(`alquiler-${b.key}-barcelona.html`);
}

/* ---------- 3 · static fleet list in fleet.html ---------- */
function injectBetween(file, startMark, endMark, content) {
  const p = path.join(ROOT, file);
  const src = fs.readFileSync(p, "utf8");
  const re = new RegExp(`(${startMark})[\\s\\S]*?(${endMark})`);
  if (!re.test(src)) throw new Error(`${file}: markers not found`);
  fs.writeFileSync(p, src.replace(re, `$1\n${content}\n    $2`));
}

const fleetList = FLEET.map((car) => {
  const fp = fromPrice(car);
  const price = fp ? ` · desde ${eurES(fp.amount)}${fp.es}` : "";
  return `      <li><a href="${carUrl(car.slug)}">Alquiler ${esc(car.name)} en Barcelona — ${esc(car.category)} · ${car.powerCv} CV${price}</a></li>`;
}).join("\n");
injectBetween("fleet.html", "<!-- BUILD:FLEET-STATIC:START -->", "<!-- BUILD:FLEET-STATIC:END -->",
  `    <ul class="fleet-static">\n${fleetList}\n    </ul>`);

/* ---------- 4 · static rates rows in rates.html ---------- */
const ratesRows = FLEET.map((car) => {
  const p = car.prices || {};
  const cell = (v) => (v == null ? '<span data-es>Consúltanos</span><span data-en>On request</span>' : `<span class="euro">${eurES(v)}</span>`);
  return `        <tr><td><a class="car-cell" href="${carUrl(car.slug)}">${esc(car.name)}<small>${esc(car.category)} · ${car.powerCv} CV</small></a></td>` +
    `<td data-label-es="1 día" data-label-en="1 day">${cell(p.d1)}</td>` +
    `<td data-label-es="1 semana" data-label-en="1 week">${cell(p.w1)}</td>` +
    `<td data-label-es="15 días" data-label-en="15 days">${cell(p.d15)}</td>` +
    `<td data-label-es="1 mes" data-label-en="1 month">${cell(p.m1)}</td></tr>`;
}).join("\n");
injectBetween("rates.html", "<!-- BUILD:RATES-STATIC:START -->", "<!-- BUILD:RATES-STATIC:END -->", ratesRows);

/* ---------- 5 · sitemap.xml ---------- */
const CORE = [
  { file: "index.html", loc: SITE, changefreq: "weekly", priority: "1.0" },
  { file: "fleet.html", loc: SITE + "fleet.html", changefreq: "weekly", priority: "0.9" },
  { file: "rates.html", loc: SITE + "rates.html", changefreq: "weekly", priority: "0.8" },
  { file: "how.html", loc: SITE + "how.html", changefreq: "monthly", priority: "0.6" },
  { file: "why.html", loc: SITE + "why.html", changefreq: "monthly", priority: "0.6" },
  { file: "contact.html", loc: SITE + "contact.html", changefreq: "monthly", priority: "0.7" }
];
const urls = [
  ...CORE.map((c) => ({ loc: c.loc, lastmod: gitLastMod(c.file), changefreq: c.changefreq, priority: c.priority })),
  ...BRANDS.filter((b) => FLEET.some(b.match)).map((b) => ({
    loc: SITE + `alquiler-${b.key}-barcelona.html`, lastmod: gitLastMod(`alquiler-${b.key}-barcelona.html`), changefreq: "weekly", priority: "0.8"
  })),
  ...FLEET.map((c) => ({
    loc: SITE + carUrl(c.slug), lastmod: gitLastMod(carUrl(c.slug)), changefreq: "monthly", priority: "0.7"
  }))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

console.log(`Generated ${generated.length} pages, fleet static list (${FLEET.length} cars), rates rows, sitemap (${urls.length} URLs).`);
