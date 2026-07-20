/* =====================================================================
   SERRES DRIVE — app.js
   Renders the fleet + rates, handles ES/EN, filters, WhatsApp deep-links,
   scroll reveals, count-ups, mobile menu, and auto-upgrading photo slots.
   Vanilla JS, no dependencies (matches serreswrapcenter.es).
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- Contact constants (same as Serres Wrap Center) ---------- */
  var WA_DIGITS = "34621244469";                 // +34 621 24 44 69
  function waLink(msg) { return "https://wa.me/" + WA_DIGITS + "?text=" + encodeURIComponent(msg); }

  /* ---------- Localised dynamic strings ---------- */
  var T = {
    dayRate:  { es: "Desde", en: "From" },
    perDay:   { es: "/día", en: "/day" },
    perWeek:  { es: "/semana", en: "/week" },
    per15:    { es: "/15 días", en: "/15 days" },
    perMonth: { es: "/mes", en: "/month" },
    onRequest:{ es: "Consúltanos", en: "On request" },
    reserve:  { es: "Reservar", en: "Book" },
    seeRates: { es: "Ver tarifas", en: "See rates" },
    hideRates:{ es: "Ocultar", en: "Hide" },
    seats:    { es: "plazas", en: "seats" },
    // Sicurcars publishes these four tiers (not every car has all four).
    rk: {
      d1:  { es: "1 día", en: "1 day" },   w1: { es: "1 semana", en: "1 week" },
      d15: { es: "15 días", en: "15 days" }, m1: { es: "1 mes", en: "1 month" }
    },
    waBase: {
      es: "Hola SERRES DRIVE 👋, me gustaría reservar un vehículo. ¿Me indicáis disponibilidad y condiciones?",
      en: "Hi SERRES DRIVE 👋, I'd like to book a car. Could you share availability and terms?"
    },
    waCar: {
      es: function (n) { return "Hola SERRES DRIVE 👋, me interesa reservar el " + n + ". ¿Disponibilidad y condiciones?"; },
      en: function (n) { return "Hi SERRES DRIVE 👋, I'm interested in booking the " + n + ". Availability and terms?"; }
    }
  };

  var lang = (function () {
    try { return localStorage.getItem("serres-lang") || "es"; } catch (e) { return "es"; }
  })();
  // Publish the language immediately, not at DOMContentLoaded: car.js and the
  // other renderers read document.documentElement.lang while building their
  // markup, and they must not depend on which <script> tag comes first.
  document.documentElement.lang = lang;

  var FLEET = window.SERRES_FLEET || [];
  var CATS = window.SERRES_CATEGORIES || [];
  var activeCat = "Todos";

  /* ---------- helpers ---------- */
  // Thousands separator "." on every value (1.000 €, 2.000 €) to match the store price list.
  // Sicurcars does not publish every tier for every car, so a missing rate is
  // an expected state, not a bug — show "Consúltanos" instead of "undefined €".
  // The separator follows the language: 10.000 € in ES, 10,000 € in EN — an
  // English reader parses "10.000 €" as ten euros.
  function eur(n) {
    if (n == null || n === "" || isNaN(n)) return tr("onRequest");
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "en" ? "," : ".") + " €";
  }
  function cv() { return lang === "en" ? "hp" : "CV"; }
  // Cheapest published rate, for the "desde …" line on cards.
  function fromPrice(car) {
    var p = car.prices || {};
    if (p.d1 != null) return { amount: p.d1, unit: tr("perDay") };
    if (p.w1 != null) return { amount: p.w1, unit: tr("perWeek") };
    if (p.d15 != null) return { amount: p.d15, unit: tr("per15") };
    if (p.m1 != null) return { amount: p.m1, unit: tr("perMonth") };
    return null;
  }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function tr(key) { return T[key] ? (T[key][lang] || T[key].es) : key; }
  function svg(paths, opts) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">' + paths + '</svg>';
  }
  var IC = {
    power: '<path d="M13 2L4.5 13H11l-1 9 8.5-11H12z" fill="currentColor" stroke="none"/>',
    gauge: '<path d="M12 13l4-3"/><path d="M4 18a8 8 0 1 1 16 0"/><circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
    gear:  '<circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
    seat:  '<path d="M6 4h3a2 2 0 0 1 2 2v6H7a2 2 0 0 1-2-2z"/><path d="M5 14h9l4 5"/><path d="M17 12V5"/>',
    awd:   '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>'
  };

  /* ==================================================================
     RENDER: filters
     ================================================================== */
  function renderFilters() {
    var box = document.getElementById("filters");
    if (!box) return;
    box.innerHTML = "";
    CATS.forEach(function (c) {
      var count = c.key === "Todos" ? FLEET.length : FLEET.filter(function (x) { return x.category === c.key; }).length;
      if (count === 0 && c.key !== "Todos") return;
      var label = lang === "en" ? c.en : c.key;
      var chip = el('<button class="chip" data-cat="' + c.key + '" aria-pressed="' + (c.key === activeCat) + '">' +
        label + '<span class="count">' + count + '</span></button>');
      chip.addEventListener("click", function () { setCategory(c.key); });
      box.appendChild(chip);
    });
  }

  function setCategory(key) {
    activeCat = key;
    document.querySelectorAll("#filters .chip").forEach(function (ch) {
      ch.setAttribute("aria-pressed", String(ch.getAttribute("data-cat") === key));
    });
    renderFleet();
  }

  /* ==================================================================
     RENDER: fleet cards
     ================================================================== */
  function specChip(icon, value, unit) {
    return '<span class="spec">' + svg(icon) + '<b>' + value + '</b>' + (unit ? " " + unit : "") + '</span>';
  }

  function carCard(car) {
    var name = car.name;
    var tag = lang === "en" ? car.taglineEn : car.taglineEs;
    var jpg = "assets/img/cars/" + car.slug + ".jpg";
    // Every car now ships a real photo; the small tube tile is the fallback.
    var ph = "assets/img/cars/ring/" + car.slug + ".jpg";
    var waHref = waLink(T.waCar[lang] ? T.waCar[lang](name) : T.waCar.es(name));
    var fp = fromPrice(car);

    // Only list the tiers this car actually has a published rate for.
    var rates = ["d1", "w1", "d15", "m1"].filter(function (k) {
      return car.prices && car.prices[k] != null;
    }).map(function (k) {
      return '<div><div class="rk">' + T.rk[k][lang] + '</div><div class="rv">' + eur(car.prices[k]) + '</div></div>';
    }).join("");

    var card = el(
      '<article class="car" data-cat="' + car.category + '">' +
        '<div class="car-media">' +
          '<img loading="lazy" alt="' + name + '" src="' + jpg + '" ' +
               'onerror="this.onerror=null;this.src=\'' + ph + '\'">' +
          '<span class="car-cat">' + (lang === "en" ? engCat(car.category) : car.category) + '</span>' +
          (car.featured ? '<span class="car-fav">★ ' + (lang === "en" ? "Top pick" : "Destacado") + '</span>' : '') +
        '</div>' +
        '<div class="car-body">' +
          '<h3 class="car-name">' + name + '</h3>' +
          '<p class="car-tag">' + tag + '</p>' +
          '<div class="car-specs">' +
            specChip(IC.power, car.powerCv, cv()) +
            specChip(IC.gauge, car.zeroToHundred, "") +
            specChip(IC.seat, car.seats, tr("seats")) +
            specChip(IC.awd, car.drivetrain, "") +
          '</div>' +
          '<div class="car-foot">' +
            '<div class="car-price">' +
              (fp
                ? '<span class="from">' + tr("dayRate") + '</span>' +
                  '<span class="amt">' + eur(fp.amount) + '<small>' + fp.unit + '</small></span>'
                : '<span class="amt">' + tr("onRequest") + '</span>') +
            '</div>' +
            '<div class="car-actions">' +
              '<button class="icon-btn js-rates" aria-label="' + tr("seeRates") + '" title="' + tr("seeRates") + '">' +
                svg('<path d="M4 5h16M4 12h16M4 19h16" stroke-width="1.7"/>') + '</button>' +
              '<a class="btn wa sm js-reserve" href="' + waHref + '" target="_blank" rel="noopener">' +
                '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.18 1.62 6L4 29l8.16-1.58a12 12 0 0 0 3.88.64C22.7 28.06 28.1 22.66 28.1 16.02 28.1 8.4 22.68 3 16.04 3Zm5.39 14.57c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.15-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.18-.24-.58-.48-.5-.66-.5l-.56-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z"/></svg>' +
                tr("reserve") + '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="car-rates">' + rates + '</div>' +
      '</article>'
    );

    card.querySelector(".js-rates").addEventListener("click", function () {
      card.classList.toggle("rates-open");
    });
    return card;
  }

  function engCat(c) {
    var m = { "Deportivo": "Sports", "Descapotable": "Convertible", "SUV": "SUV", "Lujo": "Luxury" };
    return m[c] || c;
  }

  function renderFleet() {
    var grid = document.getElementById("fleetGrid");
    var empty = document.getElementById("fleetEmpty");
    if (!grid) return;
    grid.innerHTML = "";
    var list = activeCat === "Todos" ? FLEET : FLEET.filter(function (c) { return c.category === activeCat; });
    list.forEach(function (car, i) {
      var card = carCard(car);
      card.classList.add("reveal");
      card.setAttribute("data-d", String((i % 3) + 1));
      grid.appendChild(card);
    });
    if (empty) empty.style.display = list.length ? "none" : "block";
    observeReveals();
  }

  /* ==================================================================
     RENDER: rates table
     ================================================================== */
  function renderRates() {
    var body = document.getElementById("ratesBody");
    if (!body) return;
    body.innerHTML = "";
    FLEET.forEach(function (car) {
      var waHref = waLink(T.waCar[lang] ? T.waCar[lang](car.name) : T.waCar.es(car.name));
      var row = el(
        '<tr style="cursor:pointer" title="' + tr("reserve") + ' · ' + car.name + '">' +
          '<td><a class="car-cell" href="' + waHref + '" target="_blank" rel="noopener">' + car.name +
            '<small>' + (lang === "en" ? engCat(car.category) : car.category) + ' · ' + car.powerCv + ' ' + cv() + '</small></a></td>' +
          '<td><span class="euro">' + eur(car.prices.d1) + '</span></td>' +
          '<td><span class="euro">' + eur(car.prices.w1) + '</span></td>' +
          '<td><span class="euro">' + eur(car.prices.d15) + '</span></td>' +
          '<td><span class="euro">' + eur(car.prices.m1) + '</span></td>' +
        '</tr>'
      );
      row.addEventListener("click", function (e) {
        if (e.target.closest("a")) return;
        window.open(waHref, "_blank", "noopener");
      });
      body.appendChild(row);
    });
  }

  /* ==================================================================
     WhatsApp links (static buttons)
     ================================================================== */
  function refreshWaLinks() {
    var href = waLink(T.waBase[lang]);
    ["nav-wa", "hero-wa", "cta-wa", "foot-wa", "wa-float"].forEach(function (id) {
      var a = document.getElementById(id);
      if (a) a.href = href;
    });
    // per-car WhatsApp links on the home showcase (data-wa-name="Mercedes-AMG G63")
    document.querySelectorAll("a[data-wa-name]").forEach(function (a) {
      var n = a.getAttribute("data-wa-name");
      a.href = waLink(T.waCar[lang] ? T.waCar[lang](n) : T.waCar.es(n));
    });
  }

  /* ==================================================================
     Language
     ================================================================== */
  function setLang(next) {
    lang = next;
    document.documentElement.lang = next;
    try { localStorage.setItem("serres-lang", next); } catch (e) {}
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === next));
    });
    renderFilters();
    renderFleet();
    renderRates();
    refreshWaLinks();
  }

  /* ==================================================================
     Reveals + count-up
     ================================================================== */
  var revObserver;
  function observeReveals() {
    var els = document.querySelectorAll(".reveal:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("in"); }); return;
    }
    if (!revObserver) {
      revObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); revObserver.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    }
    els.forEach(function (e) { revObserver.observe(e); });
  }

  function countUp() {
    var nums = document.querySelectorAll(".num[data-count]");
    var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var node = en.target, target = parseInt(node.getAttribute("data-count"), 10);
        var suffix = node.getAttribute("data-suffix") || "";
        if (reduce) { node.textContent = target + suffix; return; }
        var start = performance.now(), dur = 1400;
        (function step(now) {
          var p = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          node.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ==================================================================
     Nav / mobile menu / misc
     ================================================================== */
  /* Persistent chrome — lives OUTSIDE #page-root, so it survives an async page
     swap and must only ever be wired once. */
  var chromeReady = false;
  function initChrome() {
    if (chromeReady) return;
    chromeReady = true;

    var nav = document.getElementById("nav");
    if (nav) {
      var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 20); };
      onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    }

    // The mobile menu is the ink-blot component (js/nav-ink.js); it wires itself.
    // Language buttons live in both the header and that menu.
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
    });
  }

  /* ==================================================================
     Optional hero media auto-upgrade (drop assets/img/hero.jpg)
     ================================================================== */
  function heroUpgrade() {
    var box = document.getElementById("heroMedia");
    var hero = document.querySelector(".hero");
    if (!box) return;

    function reveal(node, op) {
      box.appendChild(node);
      if (hero) hero.classList.add("has-media");
      requestAnimationFrame(function () { node.style.opacity = op; });
    }
    function showImage() {              // fallback: assets/img/hero.jpg
      var img = new Image();
      img.onload = function () { img.alt = ""; reveal(img, "0.6"); };
      img.src = "assets/img/hero.jpg";
    }

    // Prefer a looping muted background video (assets/img/hero.mp4); else photo; else CSS scene.
    var v = document.createElement("video");
    if (!(v.canPlayType && v.canPlayType("video/mp4"))) { showImage(); return; }
    v.muted = true; v.defaultMuted = true; v.loop = true; v.autoplay = true; v.preload = "auto";
    v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
    var settled = false;
    v.addEventListener("loadeddata", function () {
      if (settled) return; settled = true;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      reveal(v, "0.6");
    });
    v.addEventListener("error", function () { if (!settled) { settled = true; showImage(); } });
    v.src = "assets/img/hero.mp4";
  }

  /* Everything inside #page-root. Safe to call again after an async page swap
     (js/transitions.js calls this); it only ever re-reads the current DOM. */
  function initPage() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });

    // deep-link: fleet.html?cat=SUV pre-selects that category
    activeCat = "Todos";
    try {
      var qCat = new URLSearchParams(location.search).get("cat");
      if (qCat && CATS.some(function (c) { return c.key === qCat; })) activeCat = qCat;
    } catch (e) {}

    renderFilters();
    renderFleet();
    renderRates();
    refreshWaLinks();

    // footer category quick-links (inside the swapped region, so re-bind each time)
    document.querySelectorAll("a[data-cat]").forEach(function (a) {
      a.addEventListener("click", function () { setCategory(a.getAttribute("data-cat")); });
    });

    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    countUp();
    // Drop observations of the nodes the swap just destroyed before re-observing,
    // otherwise the observer keeps them alive for the life of the session.
    if (revObserver) revObserver.disconnect();
    observeReveals();
    heroUpgrade();
  }

  window.SerresApp = { initPage: initPage, setLang: setLang, getLang: function () { return lang; } };

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initChrome();
    initPage();
  });
})();
