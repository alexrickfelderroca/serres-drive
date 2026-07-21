/* =====================================================================
   SERRES DRIVE — car.js
   Renders the per-car detail page (car.html?slug=…) from SERRES_FLEET:
   hero, the live Serres poster, spec sheet, full price table, highlights
   and a gallery of the collaboration's real photos (SERRES_MEDIA).
   Vanilla JS. Bilingual labels use the site's data-es/data-en CSS toggle.
   ===================================================================== */
(function () {
  "use strict";

  var WA_DIGITS = "34621244469";
  function waLink(msg) { return "https://wa.me/" + WA_DIGITS + "?text=" + encodeURIComponent(msg); }
  function isEn() { return document.documentElement.lang === "en"; }

  // Sicurcars does not publish every rate tier for every car — a missing value
  // is expected, so render it bilingually rather than as "undefined €".
  // The thousands separator follows the language: 10.000 € in ES, 10,000 € in EN
  // (an English reader parses "10.000 €" as ten euros).
  function eur(n) {
    if (n == null || n === "" || isNaN(n)) return lbl("Consúltanos", "On request");
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, isEn() ? "," : ".") + " €";
  }
  // 0-100 times are stored with a Spanish decimal comma.
  function num(s) { return isEn() ? String(s).replace(",", ".") : s; }

  /* fleet.js stores gearbox and fuel in Spanish only. Rather than duplicating
     every value in the data, translate the recurring words for the EN view —
     an English label over a Spanish value reads like a data error. */
  var GEARBOX = [
    [/(\d+)\s*vel\./, "$1-speed"], [/Autom[áa]tico/i, "Automatic"], [/Manual/i, "Manual"],
    [/doble embrague/i, "dual-clutch"], [/secuencial/i, "sequential"],
  ];
  var FUEL = [
    [/^Gasolina MHEV$/i, "Mild-hybrid petrol"], [/^Gasolina$/i, "Petrol"], [/^Di[ée]sel$/i, "Diesel"],
    [/^H[íi]brido enchufable$/i, "Plug-in hybrid"], [/^H[íi]brido ligero$/i, "Mild hybrid"],
    [/^H[íi]brido$/i, "Hybrid"], [/^El[ée]ctrico$/i, "Electric"],
  ];
  function spec(value, rules) {
    if (!isEn() || !value) return value;
    var out = String(value);
    for (var i = 0; i < rules.length; i++) out = out.replace(rules[i][0], rules[i][1]);
    return out;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  // Cheapest published rate, for the "Desde …" line.
  function fromPrice(car) {
    var p = car.prices || {};
    if (p.d1 != null)  return { amount: p.d1,  unit: lbl("/día", "/day") };
    if (p.w1 != null)  return { amount: p.w1,  unit: lbl("/semana", "/week") };
    if (p.d15 != null) return { amount: p.d15, unit: lbl("/15 días", "/15 days") };
    if (p.m1 != null)  return { amount: p.m1,  unit: lbl("/mes", "/month") };
    return null;
  }

  var BRANDS = ["Mercedes-AMG", "Mercedes-Benz", "Mercedes", "Range Rover", "Land Rover", "Volkswagen", "Porsche", "Audi", "BMW", "Renault"];
  function splitName(name) {
    for (var i = 0; i < BRANDS.length; i++) {
      if (name.indexOf(BRANDS[i]) === 0) return { brand: BRANDS[i], model: name.slice(BRANDS[i].length).trim() };
    }
    var sp = name.indexOf(" ");
    return sp > 0 ? { brand: name.slice(0, sp), model: name.slice(sp + 1) } : { brand: name, model: "" };
  }
  function engCat(c) {
    var m = { "Deportivo": "Sports", "Descapotable": "Convertible", "SUV": "SUV", "Compacto": "Compact", "Utilitario": "City" };
    return m[c] || c;
  }

  function lbl(es, en) { return '<span data-es>' + es + '</span><span data-en>' + en + '</span>'; }

  var IC = {
    power: '<path d="M13 2L4.5 13H11l-1 9 8.5-11H12z" fill="currentColor" stroke="none"/>',
    gauge: '<path d="M12 13l4-3"/><path d="M4 18a8 8 0 1 1 16 0"/><circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
    top:   '<path d="M12 3v6M12 3l-3 3M12 3l3 3"/><path d="M4 20a8 8 0 0 1 16 0"/>',
    gear:  '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    awd:   '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',
    seat:  '<path d="M6 4h3a2 2 0 0 1 2 2v6H7a2 2 0 0 1-2-2z"/><path d="M5 14h9l4 5"/><path d="M17 12V5"/>',
    fuel:  '<path d="M6 20V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v15M4 20h12"/><path d="M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5V16a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9l-3-3"/>',
    body:  '<path d="M3 13l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 21 8l2 5v4h-2a2 2 0 0 1-4 0H7a2 2 0 0 1-4 0H1v-4z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>'
  };
  function svg(paths, sw) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.7) + '" aria-hidden="true">' + paths + '</svg>'; }
  function specChip(icon, value, unit) { return '<span class="spec">' + svg(icon) + '<b>' + esc(value) + '</b>' + (unit ? " " + unit : "") + '</span>'; }
  function cell(icon, k, v, unit) {
    return '<div class="cell"><div class="k">' + k + '</div><div class="v">' + esc(v) + (unit ? '<small>' + unit + '</small>' : '') + '</div></div>';
  }

  function waSvg() {
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.18 1.62 6L4 29l8.16-1.58a12 12 0 0 0 3.88.64C22.7 28.06 28.1 22.66 28.1 16.02 28.1 8.4 22.68 3 16.04 3Zm5.39 14.57c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.15-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.18-.24-.58-.48-.5-.66-.5l-.56-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z"/></svg>';
  }

  function render(car) {
    var root = document.getElementById("carDetail");
    if (!root) return;
    var nm = splitName(car.name);
    var wa = waLink("Hola SERRES DRIVE 👋, me interesa reservar el " + car.name + ". ¿Disponibilidad y condiciones?");
    // Prefer the full-size photo; the small tube tile is the fallback.
    var hero = "assets/img/cars/" + car.slug + ".jpg";
    var ph = "assets/img/cars/ring/" + car.slug + ".jpg";
    var imgOnErr = "this.onerror=null;this.src='" + ph + "'";
    var fp = fromPrice(car);
    var hi = (isEn() && car.highlightsEn && car.highlightsEn.length)
      ? car.highlightsEn : (car.highlightsEs || []);

    // hero
    var heroHtml =
      '<a class="back-link" href="fleet.html">' + svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 2) + lbl("Volver a la flota", "Back to the fleet") + '</a>' +
      '<nav class="breadcrumb" aria-label="Ruta" style="margin:8px 0 4px">' +
        '<a href="index.html">' + lbl("Inicio", "Home") + '</a><span class="sep">/</span>' +
        '<a href="fleet.html">' + lbl("Flota", "Fleet") + '</a><span class="sep">/</span>' +
        '<span>' + esc(car.name) + '</span>' +
      '</nav>' +
      '<div class="car-hero">' +
        '<div class="car-hero-media">' +
          '<span class="car-hero-cat">' + lbl(esc(car.category), esc(engCat(car.category))) + '</span>' +
          '<img alt="' + esc(car.name) + '" src="' + hero + '" onerror="' + imgOnErr + '">' +
        '</div>' +
        '<div class="car-hero-info">' +
          '<span class="eyebrow">' + lbl("Serres Drive · Barcelona", "Serres Drive · Barcelona") + '</span>' +
          '<h1>' + esc(car.name) + '</h1>' +
          '<p class="tag">' + lbl(esc(car.taglineEs), esc(car.taglineEn)) + '</p>' +
          '<div class="car-hero-specs">' +
            specChip(IC.power, car.powerCv, "CV") +
            specChip(IC.gauge, car.zeroToHundred, "") +
            specChip(IC.top, car.topSpeed, "") +
            specChip(IC.awd, car.drivetrain, "") +
          '</div>' +
          '<div class="car-hero-buy">' +
            '<div class="car-hero-price">' +
              (fp
                ? '<span class="from">' + lbl("Desde", "From") + '</span>' +
                  '<span class="amt">' + eur(fp.amount) + '<small>' + fp.unit + '</small></span>'
                : '<span class="amt">' + lbl("Consúltanos", "On request") + '</span>') +
            '</div>' +
            '<div class="car-hero-actions">' +
              '<a class="btn wa" href="' + wa + '" data-wa-name="' + esc(car.name) + '" target="_blank" rel="noopener">' + waSvg() + lbl("Reservar", "Book") + '</a>' +
              '<a class="btn ghost" href="rates.html">' + lbl("Ver tarifas", "See rates") + '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // live Serres poster
    var posterHtml =
      '<section class="car-section">' +
        '<div class="serres-poster">' +
          '<img class="serres-poster__img" alt="" src="' + hero + '" onerror="' + imgOnErr + '">' +
          '<div class="serres-poster__in">' +
            '<div class="serres-poster__top">' +
              '<span class="serres-poster__brandmark"><img class="b-mark" src="assets/brand/serres-wordmark.svg" alt="Serres" width="1000" height="89" decoding="async"><span class="b-drive chrome-text">Drive</span></span>' +
              '<span class="serres-poster__kicker">' + lbl("Alquiler de coches de lujo", "Luxury car rental") + '</span>' +
              '<span class="serres-poster__hairline"></span>' +
            '</div>' +
            '<div class="serres-poster__mid">' +
              '<div class="serres-poster__brand">' + esc(nm.brand) + '</div>' +
              '<div class="serres-poster__model">' + esc(nm.model || nm.brand) + '</div>' +
              '<div class="serres-poster__tagline">' + esc(hi.join("  ·  ")) + '</div>' +
              '<div class="serres-poster__prices">' +
                '<div class="col"><div class="pk">' + lbl("Por día", "Per day") + '</div><div class="pv">' + eur(car.prices.d1) + '</div></div>' +
                '<div class="col"><div class="pk">' + lbl("Por semana", "Per week") + '</div><div class="pv">' + eur(car.prices.w1) + '</div></div>' +
                '<div class="col"><div class="pk">' + lbl("Por mes", "Per month") + '</div><div class="pv">' + eur(car.prices.m1) + '</div></div>' +
              '</div>' +
            '</div>' +
            '<div class="serres-poster__loc">' + svg('<path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/>') + 'Barcelona</div>' +
          '</div>' +
        '</div>' +
      '</section>';

    // spec sheet
    var specHtml =
      '<section class="car-section">' +
        '<h2>' + lbl("Especificaciones", "Specifications") + '</h2>' +
        '<div class="spec-sheet">' +
          cell(null, lbl("Potencia", "Power"), car.powerCv, isEn() ? "hp" : "CV") +
          cell(null, "0–100 km/h", num(car.zeroToHundred), "") +
          cell(null, lbl("Vel. máx", "Top speed"), car.topSpeed, "") +
          cell(null, lbl("Cambio", "Gearbox"), spec(car.transmission, GEARBOX), "") +
          cell(null, lbl("Tracción", "Drivetrain"), car.drivetrain, "") +
          cell(null, lbl("Plazas", "Seats"), car.seats, "") +
          cell(null, lbl("Combustible", "Fuel"), spec(car.fuel, FUEL), "") +
          cell(null, lbl("Carrocería", "Body"), car.bodyType, "") +
        '</div>' +
      '</section>';

    // price table + deposit
    // Only the tiers Sicurcars publishes for this car.
    var rows = [["d1", "1 día", "1 day"], ["w1", "1 semana", "1 week"], ["d15", "15 días", "15 days"], ["m1", "1 mes", "1 month"]]
      .filter(function (r) { return car.prices && car.prices[r[0]] != null; })
      .map(function (r) { return '<tr><td>' + lbl(r[1], r[2]) + '</td><td>' + eur(car.prices[r[0]]) + '</td></tr>'; }).join("");
    var priceHtml =
      '<section class="car-section">' +
        '<h2>' + lbl("Tarifas", "Rates") + '</h2>' +
        '<p class="sub">' + lbl("Precios orientativos en EUR. Kilometraje y condiciones a confirmar por WhatsApp.", "Indicative prices in EUR. Mileage and terms confirmed on WhatsApp.") + '</p>' +
        '<div class="price-block">' +
          '<table class="price-table"><thead><tr><th>' + lbl("Duración", "Duration") + '</th><th style="text-align:right">' + lbl("Precio", "Price") + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
          '<div class="price-aside">' +
            '<div class="dep-k">' + lbl("Fianza", "Deposit") + '</div>' +
            // Sicurcars sets the deposit per booking, so there is no figure to show.
            '<div class="dep-v">' + lbl("Según reserva", "Per booking") + '</div>' +
            '<p>' + lbl("Reembolsable, según vehículo y duración. Se libera tras la devolución del coche en su estado de entrega.", "Refundable, set by car and rental length. Released once the car is returned in its delivery condition.") + '</p>' +
            '<a class="btn wa" href="' + wa + '" data-wa-name="' + esc(car.name) + '" target="_blank" rel="noopener">' + waSvg() + lbl("Reservar este coche", "Book this car") + '</a>' +
          '</div>' +
        '</div>' +
      '</section>';

    // highlights — fleet.js carries both languages; pick the right one
    var hlHtml = "";
    if (hi.length) {
      hlHtml =
        '<section class="car-section">' +
          '<h2>' + lbl("Lo que lo hace especial", "What makes it special") + '</h2>' +
          '<ul class="hl-list">' +
            hi.map(function (h) { return '<li>' + svg(IC.check, 2) + '<span>' + esc(h) + '</span></li>'; }).join("") +
          '</ul>' +
        '</section>';
    }

    // gallery from the collaboration's real photos
    var galHtml = "";
    var media = (window.SERRES_MEDIA || {})[car.slug] || [];
    if (media.length) {
      galHtml =
        '<section class="car-section">' +
          '<h2>' + lbl("En la flota", "In the fleet") + '</h2>' +
          '<p class="sub">' + lbl("Fotografías reales de la flota, en colaboración con Sicurcars.", "Real fleet photography, in collaboration with Sicurcars.") + '</p>' +
          '<div class="car-gallery">' +
            media.map(function (f) {
              var src = "assets/img/cars/scrape/" + f;
              return '<figure><img loading="lazy" alt="' + esc(car.name) + '" src="' + src + '"></figure>';
            }).join("") +
          '</div>' +
        '</section>';
    }

    root.innerHTML = heroHtml + posterHtml + specHtml + priceHtml + hlHtml + galHtml;
    document.title = car.name + " · SERRES DRIVE — " + (document.documentElement.lang === "en" ? "Luxury car rental in Barcelona" : "Alquiler de coches de lujo en Barcelona");
  }

  function showFallback() {
    var fb = document.getElementById("carFallback");
    if (fb) fb.classList.remove("hidden");
  }

  function boot() {
    var FLEET = window.SERRES_FLEET || [];
    var slug = "";
    try { slug = new URLSearchParams(location.search).get("slug") || ""; } catch (e) {}
    var car = FLEET.filter(function (c) { return c.slug === slug; })[0];
    if (car) render(car); else showFallback();
  }

  // js/transitions.js only injects a page's scripts once, so on the second
  // visit to car.html this hook is the only thing that re-renders the car.
  window.SerresCar = { initPage: boot };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
