/* =====================================================================
   SERRES DRIVE — fleet-gallery.js
   Renders #fleetGallery as a "Mouse Scale Gallery": cars in pairs, and as
   the cursor crosses a row the two panels trade widths (33.33% <-> 66.66%)
   with eased inertia. Hover zooms the photo and reveals the car name.
   Filters (type AND brand) combine and are reflected in the URL.

   Reads window.SERRES_FLEET (js/fleet.js must load first). If it is missing
   or empty the existing DOM is left completely untouched.
   Vanilla, no build step, no dependencies.
   ===================================================================== */
(function () {
  "use strict";

  var CONTAINER_ID = "fleetGallery";

  /* Motion constants — mirror of the reference effect. */
  var SMOOTH = 0.15;          // eased approach per rAF frame
  var MIN_W = 33.33;          // compressed panel width, %
  var MAX_W = 66.66;          // stretched panel width, %
  var SETTLED = 0.03;         // below this delta the loop stops

  var ALL_TYPE = "Todos";
  var ALL_BRAND = "*";

  /* matchMedia is guarded like every other optional API in this file: without
     it the stub reports matches:false, which lands us on the static 50/50
     layout — the correct fallback — instead of throwing at parse time and
     never publishing window.SerresFleetGallery. */
  function mq(q) {
    return window.matchMedia
      ? window.matchMedia(q)
      : { matches: false, addEventListener: null, addListener: null };
  }

  var mqReduce = mq("(prefers-reduced-motion:reduce)");
  /* 901px, not 900px: css/fleet-gallery.css stacks at max-width:900px, so at
     exactly 900px both queries would match and the loop would drive --fg-a /
     --fg-b for a row whose widths those properties no longer control. */
  var mqTrade = mq("(min-width:901px) and (hover:hover) and (pointer:fine)");

  /* Canonical type order, overridden at init by window.SERRES_CATEGORIES when
     it is present. A type is only offered if the data actually contains it. */
  var TYPE_ORDER = ["Deportivo", "SUV", "Lujo", "Descapotable", "Compacto", "Utilitario"];
  var TYPE_EN = {
    "Todos": "All", "SUV": "SUV", "Deportivo": "Sports", "Lujo": "Luxury",
    "Descapotable": "Convertible", "Compacto": "Compact", "Utilitario": "City"
  };
  /* English typeKey -> Spanish category, for records that only carry typeKey. */
  var KEY_ES = {
    "SUV": "SUV", "Sports": "Deportivo", "Luxury": "Lujo",
    "Convertible": "Descapotable", "Compact": "Compacto", "City": "Utilitario"
  };

  /* Longest prefix first so "Mercedes-AMG" wins over "Mercedes". */
  var BRANDS = [
    "Mercedes-Benz", "Mercedes-AMG", "Mercedes Benz", "Mercedes",
    "Alfa Romeo", "Aston Martin", "Range Rover", "Land Rover",
    "Lamborghini", "Volkswagen", "Maserati", "McLaren", "Porsche",
    "Ferrari", "Renault", "Bentley", "Abarth", "Cupra", "Tesla",
    "Audi", "BMW", "Mini", "Seat", "Kia"
  ];

  /* ---------- state (module scope, reset by initPage) ---------- */
  var container = null;
  var state = { type: ALL_TYPE, brand: ALL_BRAND };
  var rowCtrls = [];
  var revealIO = null;
  var barHandler = null;
  var tradeHandler = null;
  var types = [];
  var brands = [];

  /* ================================================================
     helpers
     ================================================================ */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function lbl(es, en) { return '<span data-es>' + es + '</span><span data-en>' + en + '</span>'; }
  // Separator follows the language: 3.900 € in ES, 3,900 € in EN — an English
  // reader parses "3.900 €" as three euros.
  function num(n) {
    var sep = document.documentElement.lang === "en" ? "," : ".";
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }
  function money(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.]/g, ""));
    return (isFinite(n) && n > 0) ? n : null;
  }
  function mqOn(mq, fn) {
    if (mq.addEventListener) mq.addEventListener("change", fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  function mqOff(mq, fn) {
    if (mq.removeEventListener) mq.removeEventListener("change", fn);
    else if (mq.removeListener) mq.removeListener(fn);
  }

  function catOf(car) {
    if (car.category) return String(car.category);
    if (car.typeKey) return KEY_ES[car.typeKey] || String(car.typeKey);
    return "";
  }
  function enCat(c) { return TYPE_EN[c] || c; }

  /* js/fleet.js publishes the canonical facet list; adopt its order and its
     EN labels so a change there needs no edit here. Canonical entries it omits
     stay appended, and unexpected categories in the data are added by initPage. */
  function readCategories() {
    var list = window.SERRES_CATEGORIES;
    if (!list || !list.length) return;
    var order = [], i, c;
    for (i = 0; i < list.length; i++) {
      c = list[i];
      if (!c || !c.key || c.key === ALL_TYPE) continue;
      if (order.indexOf(c.key) === -1) order.push(c.key);
      if (c.en) {
        TYPE_EN[c.key] = c.en;
        if (!KEY_ES[c.en]) KEY_ES[c.en] = c.key;   // ?cat=Sports -> Deportivo
      }
    }
    if (!order.length) return;
    for (i = 0; i < TYPE_ORDER.length; i++) {
      if (order.indexOf(TYPE_ORDER[i]) === -1) order.push(TYPE_ORDER[i]);
    }
    TYPE_ORDER = order;
  }

  function brandOf(car) {
    if (car.brand) return String(car.brand);
    var name = String(car.name || "");
    for (var i = 0; i < BRANDS.length; i++) {
      if (name.indexOf(BRANDS[i]) === 0) return BRANDS[i];
    }
    var sp = name.indexOf(" ");
    return sp > 0 ? name.slice(0, sp) : (name || "—");
  }

  /* prices{} may be missing ANY tier: four cars publish no d1 (urus,
     portofino-m, huracan-coupe, cayenne-gts-coupe) and six no w1, so every
     step degrades to the next longest rate and finally to "Consúltanos".
     Both data-es and data-en spans are always emitted. */
  function priceLabel(car) {
    var p = (car && car.prices) || {};
    var d1 = money(p.d1), w1 = money(p.w1), d15 = money(p.d15), m1 = money(p.m1);
    if (d1) return lbl("desde " + num(d1) + " € / día", "from " + num(d1) + " € / day");
    if (w1) return lbl("desde " + num(w1) + " € / semana", "from " + num(w1) + " € / week");
    if (d15) return lbl("desde " + num(d15) + " € / 15 días", "from " + num(d15) + " € / 15 days");
    if (m1) return lbl("desde " + num(m1) + " € / mes", "from " + num(m1) + " € / month");
    return lbl("Consúltanos", "On request");
  }

  function fleet() {
    var f = window.SERRES_FLEET;
    if (!f || !f.length) return [];
    return f.filter(function (c) { return c && c.slug; });
  }

  function matches(car, type, brand) {
    if (type !== ALL_TYPE && catOf(car) !== type) return false;
    if (brand !== ALL_BRAND && brandOf(car) !== brand) return false;
    return true;
  }
  function filtered() {
    return fleet().filter(function (c) { return matches(c, state.type, state.brand); });
  }

  /* ================================================================
     markup
     ================================================================ */
  function panelHtml(car) {
    var slug = String(car.slug);
    var name = esc(car.name || slug);
    var cat = catOf(car);
    var accent = /^#[0-9a-f]{3,8}$/i.test(String(car.accent || "")) ? car.accent : "";
    var path = encodeURIComponent(slug);

    return '<a class="fg-panel" href="car.html?slug=' + path + '"' +
             (accent ? ' style="--fg-accent:' + esc(accent) + '"' : '') + '>' +
             '<span class="fg-media">' +
               /* Decorative: the model name is already the link's own text in
                  .fg-name, and opacity:0 does not hide it from the a11y tree,
                  so an alt here would make the name announce twice. */
               '<img class="fg-img" alt="" loading="lazy" decoding="async"' +
                    ' data-src1="assets/img/cars/' + path + '.jpg"' +
                    ' data-src2="assets/img/cars/ring/' + path + '.jpg">' +
             '</span>' +
             '<span class="fg-scrim"></span>' +
             (cat ? '<span class="fg-tag">' + lbl(esc(cat), esc(enCat(cat))) + '</span>' : '') +
             '<span class="fg-info">' +
               '<span class="fg-name">' + name + '</span>' +
               '<span class="fg-price">' + priceLabel(car) + '</span>' +
             '</span>' +
           '</a>';
  }

  function rowsHtml(list) {
    var out = "", i = 0, idx = 0;
    for (i = 0; i < list.length; i += 2) {
      var a = list[i], b = list[i + 1];
      var solo = !b;                                  // odd tail -> full-width row
      var reversed = (idx % 2) === 1;                 // zig-zag resting bias
      out += '<div class="fg-row' + (solo ? ' fg-row--solo' : '') +
             '" data-reversed="' + (reversed ? 'true' : 'false') + '">' +
             panelHtml(a) + (solo ? '' : panelHtml(b)) +
             '</div>';
      idx++;
    }
    return out;
  }

  function chipHtml(kind, value, labelHtml, pressed) {
    return '<button type="button" class="chip fg-chip" data-fg-' + kind + '="' + esc(value) + '"' +
           ' aria-pressed="' + (pressed ? "true" : "false") + '">' +
           labelHtml + '<span class="fg-n"></span></button>';
  }

  function barHtml() {
    var typeChips = chipHtml("type", ALL_TYPE, lbl("Todos", "All"), state.type === ALL_TYPE);
    types.forEach(function (t) {
      typeChips += chipHtml("type", t, lbl(esc(t), esc(enCat(t))), state.type === t);
    });

    var brandChips = chipHtml("brand", ALL_BRAND, lbl("Todas", "All"), state.brand === ALL_BRAND);
    brands.forEach(function (b) {
      brandChips += chipHtml("brand", b, esc(b), state.brand === b);
    });

    return '<div class="fg-bar">' +
             '<div class="fg-group">' +
               '<span class="fg-group-label">' + lbl("Tipo de coche", "Car type") + '</span>' +
               '<div class="fg-chips" role="group" aria-label="Tipo de coche / Car type">' + typeChips + '</div>' +
             '</div>' +
             '<div class="fg-group">' +
               '<span class="fg-group-label">' + lbl("Marca", "Brand") + '</span>' +
               '<div class="fg-chips" role="group" aria-label="Marca / Brand">' + brandChips + '</div>' +
             '</div>' +
             '<p class="fg-count" id="fgCount" aria-live="polite"></p>' +
           '</div>';
  }

  function emptyHtml() {
    return '<div class="fg-empty">' +
             '<p class="fg-empty-t">' +
               lbl("No hay coches con estos filtros.", "No cars match these filters.") +
             '</p>' +
             '<button type="button" class="chip fg-chip fg-reset" data-fg-reset="1">' +
               lbl("Ver toda la flota", "See the whole fleet") +
             '</button>' +
           '</div>';
  }

  function countHtml(n) {
    return '<b>' + n + '</b> ' + (n === 1 ? lbl("coche", "car") : lbl("coches", "cars"));
  }

  /* ================================================================
     images — <slug>.jpg -> ring/<slug>.jpg -> accent colour
     src is assigned after the error listener is attached so a cached
     failure can never slip past us.
     ================================================================ */
  function wireImages(root) {
    var imgs = root.querySelectorAll("img.fg-img");
    Array.prototype.forEach.call(imgs, function (img) {
      var step = 0;
      img.addEventListener("error", function () {
        step++;
        var alt = img.getAttribute("data-src2");
        if (step === 1 && alt) { img.src = alt; return; }
        img.style.display = "none";
        var panel = img.parentNode && img.parentNode.parentNode;
        if (panel && panel.classList) panel.classList.add("fg-noimg");
      });
      var first = img.getAttribute("data-src1");
      if (first) img.src = first;
    });
  }

  /* ================================================================
     the width-trading loop, one controller per row
     ================================================================ */
  function makeRow(row) {
    if (row.className.indexOf("fg-row--solo") !== -1) return null;
    var panels = row.querySelectorAll(".fg-panel");
    if (panels.length < 2) return null;

    var rest = row.getAttribute("data-reversed") === "true" ? MIN_W : MAX_W;
    var cur = rest, target = rest, raf = 0, alive = true, on = false;

    function apply() {
      row.style.setProperty("--fg-a", cur.toFixed(3) + "%");
      row.style.setProperty("--fg-b", (100 - cur).toFixed(3) + "%");
    }
    function frame() {
      raf = 0;
      if (!alive) return;
      cur += (target - cur) * SMOOTH;
      if (Math.abs(target - cur) < SETTLED) { cur = target; apply(); return; }  // settled: stop
      apply();
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && alive && on) raf = requestAnimationFrame(frame); }

    function onMove(e) {
      if (!on) return;
      // The row's own rect — not innerWidth: the row is not full-bleed.
      var r = row.getBoundingClientRect();
      if (!r.width) return;
      var p = (e.clientX - r.left) / r.width;
      if (p < 0) p = 0; else if (p > 1) p = 1;
      target = MAX_W - p * (MAX_W - MIN_W);   // cursor left -> left panel stretches
      kick();
    }
    function onLeave() { if (!on) return; target = rest; kick(); }

    row.addEventListener("mousemove", onMove);
    row.addEventListener("mouseleave", onLeave);

    return {
      setActive: function (yes) {
        on = !!yes;
        if (on) { cur = target = rest; apply(); }
        else {
          if (raf) { cancelAnimationFrame(raf); raf = 0; }
          row.style.removeProperty("--fg-a");
          row.style.removeProperty("--fg-b");
        }
      },
      destroy: function () {
        alive = false;
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        row.removeEventListener("mousemove", onMove);
        row.removeEventListener("mouseleave", onLeave);
        row.style.removeProperty("--fg-a");
        row.style.removeProperty("--fg-b");
      }
    };
  }

  function teardownRows() {
    rowCtrls.forEach(function (c) { c.destroy(); });
    rowCtrls = [];
    if (revealIO) { revealIO.disconnect(); revealIO = null; }
  }

  function onTradeChange() {
    var yes = !mqReduce.matches && mqTrade.matches;
    rowCtrls.forEach(function (c) { c.setActive(yes); });
  }

  /* ================================================================
     reveal (opt-in: .fg-anim is only added once we are driving it)
     ================================================================ */
  function canAnimate() {
    return !mqReduce.matches && ("IntersectionObserver" in window);
  }

  function revealRows(wrap) {
    var rows = wrap.querySelectorAll(".fg-row");
    if (!canAnimate()) {
      Array.prototype.forEach.call(rows, function (r) { r.classList.add("fg-in"); });
      return;
    }
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("fg-in");
        if (revealIO) revealIO.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    Array.prototype.forEach.call(rows, function (r) { revealIO.observe(r); });
  }

  /* ================================================================
     render
     ================================================================ */
  function renderBody() {
    var body = container.querySelector(".fg-body");
    if (!body) return;
    teardownRows();

    var list = filtered();
    if (!list.length) {
      body.innerHTML = emptyHtml();
    } else {
      // .fg-anim must be present before the rows paint, or they flash in visible.
      body.innerHTML = '<div class="fg-rows' + (canAnimate() ? ' fg-anim' : '') + '">' +
                       rowsHtml(list) + '</div>';
      var wrap = body.querySelector(".fg-rows");
      wireImages(wrap);
      Array.prototype.forEach.call(wrap.querySelectorAll(".fg-row"), function (row) {
        var c = makeRow(row);
        if (c) rowCtrls.push(c);
      });
      onTradeChange();
      revealRows(wrap);
    }
    updateBar(list.length);
  }

  /* Counts are contextual: a type chip counts cars of that type *within*
     the active brand, and vice versa — so the two filters read as combined. */
  function updateBar(total) {
    var all = fleet();
    Array.prototype.forEach.call(container.querySelectorAll("[data-fg-type]"), function (chip) {
      var v = chip.getAttribute("data-fg-type");
      var n = all.filter(function (c) { return matches(c, v, state.brand); }).length;
      chip.setAttribute("aria-pressed", String(v === state.type));
      chip.classList.toggle("fg-chip--empty", n === 0);
      var slot = chip.querySelector(".fg-n");
      if (slot) slot.textContent = String(n);
    });
    Array.prototype.forEach.call(container.querySelectorAll("[data-fg-brand]"), function (chip) {
      var v = chip.getAttribute("data-fg-brand");
      var n = all.filter(function (c) { return matches(c, state.type, v); }).length;
      chip.setAttribute("aria-pressed", String(v === state.brand));
      chip.classList.toggle("fg-chip--empty", n === 0);
      var slot = chip.querySelector(".fg-n");
      if (slot) slot.textContent = String(n);
    });
    var cnt = container.querySelector("#fgCount");
    if (cnt) cnt.innerHTML = countHtml(total);
  }

  /* ================================================================
     URL
     ================================================================ */
  function readUrl() {
    state.type = ALL_TYPE;
    state.brand = ALL_BRAND;
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var cat = q.get("cat");
    if (cat) {
      if (KEY_ES[cat]) cat = KEY_ES[cat];              // accept ?cat=SUV or ?cat=Sports
      if (types.indexOf(cat) !== -1) state.type = cat; // unknown value -> Todos
    }
    var br = q.get("brand");
    if (br && brands.indexOf(br) !== -1) state.brand = br;
  }

  function syncUrl() {
    if (!window.history || !history.replaceState) return;
    var q = [];
    if (state.type !== ALL_TYPE) q.push("cat=" + encodeURIComponent(state.type));
    if (state.brand !== ALL_BRAND) q.push("brand=" + encodeURIComponent(state.brand));
    try {
      history.replaceState(history.state, "",
        location.pathname + (q.length ? "?" + q.join("&") : "") + location.hash);
    } catch (e) {}
  }

  /* ================================================================
     init / teardown
     ================================================================ */
  function teardown() {
    teardownRows();
    if (container && barHandler) container.removeEventListener("click", barHandler);
    barHandler = null;
    if (tradeHandler) {
      mqOff(mqTrade, tradeHandler);
      mqOff(mqReduce, tradeHandler);
      tradeHandler = null;
    }
    container = null;
  }

  function initPage() {
    teardown();

    var box = document.getElementById(CONTAINER_ID);
    if (!box) return;
    var all = fleet();
    if (!all.length) return;          // no data -> leave the fallback markup alone

    container = box;
    container.classList.add("fg-gallery");

    readCategories();

    // Type list: canonical order first, then anything unexpected in the data.
    var present = {};
    all.forEach(function (c) { var k = catOf(c); if (k) present[k] = true; });
    types = TYPE_ORDER.filter(function (t) { return present[t]; });
    Object.keys(present).forEach(function (k) { if (types.indexOf(k) === -1) types.push(k); });

    var seen = {};
    brands = [];
    all.forEach(function (c) {
      var b = brandOf(c);
      if (b && !seen[b]) { seen[b] = true; brands.push(b); }
    });
    brands.sort(function (a, b) { return a.localeCompare(b, "es"); });

    readUrl();
    /* Rewrite the query string from the state we actually adopted, so a deep
       link we could not honour does not leave a lie in the address bar:
       ?cat=Compacto (retired category, still linked from every footer) drops
       out entirely and ?cat=Sports normalises to ?cat=Deportivo. history.state
       is passed through untouched, keeping transitions.js's { pt:true } marker. */
    syncUrl();

    container.innerHTML = barHtml() + '<div class="fg-body"></div>';

    barHandler = function (e) {
      var chip = e.target.closest ? e.target.closest("button") : null;
      if (!chip || !container.contains(chip)) return;
      if (chip.hasAttribute("data-fg-reset")) {
        state.type = ALL_TYPE; state.brand = ALL_BRAND;
      } else if (chip.hasAttribute("data-fg-type")) {
        state.type = chip.getAttribute("data-fg-type");
      } else if (chip.hasAttribute("data-fg-brand")) {
        state.brand = chip.getAttribute("data-fg-brand");
      } else return;
      syncUrl();
      renderBody();                   // re-pairs the rows from scratch
    };
    container.addEventListener("click", barHandler);

    tradeHandler = onTradeChange;
    mqOn(mqTrade, tradeHandler);
    mqOn(mqReduce, tradeHandler);

    renderBody();
  }

  window.SerresFleetGallery = { initPage: initPage };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPage);
  } else {
    initPage();
  }
})();
