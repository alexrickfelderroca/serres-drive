/* =====================================================================
   SERRES DRIVE — transitions.js
   "Async slide transitions": clicking an internal .html link pushes the
   current content LEFT (scaling down + dimming) while the next page
   slides in from the RIGHT. fetch() + DOMParser, no full reload.

   ---------------------------------------------------------------------
   MARKUP CONTRACT
   Every page wraps its swappable region in:

       <div id="page-root" class="pt-root"> …page content… </div>

   Persistent chrome — header.nav, .mobile-menu, .wa-float and ALL
   <script> tags — must live OUTSIDE #page-root and is never touched.

   ---------------------------------------------------------------------
   RE-INIT CONTRACT (all optional, each called inside its own try/catch
   so one broken module can never stop the other two, nor the tween)
       window.SerresApp.initPage()           nav, ES/EN, fleet, WA links
       window.SerresCar.initPage()           car.html detail render
       window.SerresFleetGallery.initPage()  fleet gallery
   History is updated BEFORE these run, so anything reading
   location.search (app.js ?cat=, car.js ?slug=) sees the new URL.
   Afterwards a 'serres:pageswap' CustomEvent {detail:{url}} fires on
   document.

   ---------------------------------------------------------------------
   SAFETY RULE THAT OUTRANKS EVERYTHING ELSE
   Content must never end up permanently hidden. #page-root is parked
   off-canvas between prep() and into(), so every path out of a
   navigation — a thrown hook, a stalled tween, a hung fetch, an empty
   swapped region — funnels through finish() or hardNav(). Two watchdog
   timers guarantee it even if a future code path forgets.

   ---------------------------------------------------------------------
   index.html IS DELIBERATELY EXCLUDED, both directions:
   js/experience.js boots three.js + Lenis + ScrollTrigger and cannot be
   re-initialised after a DOM swap. Links TO index.html, and every link
   ON a page whose <body> has .home-exp, fall through to the browser.
   ===================================================================== */
(function () {
  "use strict";

  var ROOT_ID   = "page-root";
  var DUR       = 0.45;   // seconds, both directions — keep --pt-dur in css/transitions.css in sync
  var OUT_AT    = 0.75;   // fire OUT's callback at 75% so IN overlaps the tail of OUT
  var OUT_VW    = 8;      // % of viewport width the outgoing page travels
  var OUT_SCALE = 0.94;
  var OUT_ALPHA = 0.35;
  var ASSET_CAP = 1500;   // ms ceiling on waiting for a page's own css/js
  var NET_CAP   = 8000;   // ms ceiling on the fetch before we hand the URL to the browser

  var OUT_CLS = ["pt-out-left", "pt-out-right"];
  var IN_CLS  = ["pt-from-left", "pt-from-right"];

  var busy = false;
  var live = null;        // aria-live region, created once at init
  var idx  = 0;           // our depth in the history stack — tells back from forward
  var said = "";          // language-aware label for the incoming page

  /* ---------- helpers (js/app.js house style) ---------- */
  function abs(u) { var a = document.createElement("a"); a.href = u; return a.href; }
  function parse(u) { var a = document.createElement("a"); a.href = u; return a; }
  function root() { return document.getElementById(ROOT_ID); }
  function once(fn) { var done = false; return function () { if (done) return; done = true; fn(); }; }
  function reflow(el) { void el.offsetWidth; }
  function drop(el, list) { for (var i = 0; i < list.length; i++) el.classList.remove(list[i]); }
  function warn(where, e) {
    if (window.console && window.console.error) window.console.error("[transitions] " + where, e);
  }
  function reduced() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches);
  }
  function isHomeDoc() { return document.body.classList.contains("home-exp"); }
  // "/", "/index.html", "/sub/" — anything the 3D experience owns.
  function isIndex(pathname) { return /(^|\/)(index\.html)?$/.test(pathname); }
  // The site keeps both languages in the DOM as <span data-es>…</span><span data-en>…</span>.
  function langCode() {
    var l = document.documentElement.getAttribute("lang") || "es";
    return l.toLowerCase().indexOf("en") === 0 ? "en" : "es";
  }

  // Scroll without the global `scroll-behavior:smooth` animating a page change.
  function jumpTo(y) {
    var h = document.documentElement, prev = h.style.scrollBehavior;
    h.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    h.style.scrollBehavior = prev;
  }

  /* ==================================================================
     Link eligibility
     ================================================================== */
  function anchorFrom(node) {
    while (node && node !== document) {
      if (node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === "a") return node;
      node = node.parentNode;
    }
    return null;
  }

  // Absolute URL to transition to, or null to let the browser navigate.
  function eligible(a) {
    if (!a) return null;
    var raw = a.getAttribute("href");
    if (!raw || raw.charAt(0) === "#") return null;                  // hash-only
    if (a.hasAttribute("download")) return null;
    if (a.hasAttribute("data-no-transition")) return null;
    var target = a.getAttribute("target");
    if (target && target !== "_self") return null;                   // _blank etc.

    var link = parse(raw);
    // mailto: / tel: are non-http; wa.me / instagram are off-host.
    if (link.protocol !== "http:" && link.protocol !== "https:") return null;
    if (link.host !== location.host) return null;
    if (!/\.html$/i.test(link.pathname)) return null;                // only real pages
    if (isIndex(link.pathname)) return null;                         // experience.js
    // Same page (incl. plain anchor jumps): browser handles it better than we do.
    if (link.pathname === location.pathname && link.search === location.search) return null;
    return link.href;
  }

  function onClick(e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var url = eligible(anchorFrom(e.target));
    if (!url) return;                       // never preventDefault before we're sure

    e.preventDefault();
    if (busy) return;                       // ignore rapid double-clicks
    navigate(url, "forward", true);
  }

  /* ==================================================================
     Animation — GSAP when present, CSS classes otherwise.

     Three steps, because the outgoing state must survive until the DOM
     swap (otherwise the old content snaps back to centre for a frame):
       out()   move current content aside, and LEAVE it there
       prep()  after the swap: stamp the incoming start state, untweened
       in()    release it

     out() reports back at OUT_AT (75%) rather than on completion, so the
     fetch + swap + re-init overlap the tail of the outgoing motion
     instead of queueing behind it. prep() kills the still-running OUT
     tween so it cannot overwrite the incoming start state.
     ================================================================== */
  function out(dir, cb) {
    var el = root(), go = once(cb);
    if (!el || reduced()) { go(); return; }

    if (window.gsap) {
      try { window.gsap.killTweensOf(el); } catch (e) {}
      window.gsap.timeline()
        .to(el, {
          xPercent: (dir === "back" ? 1 : -1) * OUT_VW,
          scale: OUT_SCALE, opacity: OUT_ALPHA,
          duration: DUR, ease: "power3.inOut"
        }, 0)
        .call(go, null, DUR * OUT_AT);
      // Timer as well as tween: a killed or stalled GSAP tween must not strand us.
      setTimeout(go, DUR * 1000 + 260);
      return;
    }
    el.classList.add("pt-anim");
    reflow(el);                             // commit the transition before the target
    el.classList.add(dir === "back" ? "pt-out-right" : "pt-out-left");
    setTimeout(go, DUR * 1000 * OUT_AT);    // timer, not transitionend: never stalls
  }

  function prep(dir) {
    var el = root();
    if (!el) return;
    // The OUT tween is still in flight (we handed control back at 75%).
    if (window.gsap) { try { window.gsap.killTweensOf(el); } catch (e) {} }
    if (reduced()) return;

    if (window.gsap) {
      window.gsap.set(el, { xPercent: dir === "back" ? -100 : 100, scale: 1, opacity: 1 });
      return;
    }
    el.classList.add("pt-no-tween");        // transition:none — also kills the running OUT
    drop(el, OUT_CLS);
    el.classList.add(dir === "back" ? "pt-from-left" : "pt-from-right");
    reflow(el);                             // land on the start state with no tween
  }

  function into(cb) {
    var el = root(), go = once(cb);
    if (!el) { go(); return; }
    if (reduced()) { clear(el); go(); return; }

    if (window.gsap) {
      var landed = false;
      window.gsap.to(el, {
        xPercent: 0, scale: 1, opacity: 1,
        duration: DUR, ease: "power3.inOut",
        onComplete: function () { landed = true; clear(el); go(); }
      });
      // Backstop only — a stalled tween must not leave the page off-canvas.
      // Skipped once the tween has landed, so it can never reach into a
      // navigation that has already started after this one.
      setTimeout(function () { if (landed) return; clear(el); go(); }, DUR * 1000 + 260);
      return;
    }
    el.classList.remove("pt-no-tween");
    el.classList.add("pt-anim");
    reflow(el);
    drop(el, IN_CLS);
    setTimeout(function () { clear(el); go(); }, DUR * 1000 + 60);
  }

  function clear(el) {
    el.classList.remove("pt-anim", "pt-no-tween");
    drop(el, OUT_CLS);
    drop(el, IN_CLS);
    if (window.gsap) {
      try { window.gsap.set(el, { clearProps: "transform,opacity,willChange" }); } catch (e) {}
    }
  }

  /* ==================================================================
     Per-page assets.
     car.html pulls in css/car.css + js/media-map.js + js/car.js, which
     the page we came from never loaded — without this the swapped-in
     car page would be unstyled and empty.
     ================================================================== */
  function preloadStyles(doc, cb) {
    var have = {}, pending = 0, go = once(cb), i;
    var mine = document.querySelectorAll('link[rel~="stylesheet"][href]');
    for (i = 0; i < mine.length; i++) have[abs(mine[i].getAttribute("href"))] = true;

    var incoming = doc.querySelectorAll('link[rel~="stylesheet"][href]');
    for (i = 0; i < incoming.length; i++) {
      var href = abs(incoming[i].getAttribute("href"));
      if (have[href]) continue;
      have[href] = true;
      pending++;
      var n = document.createElement("link");
      n.rel = "stylesheet";
      n.href = href;
      n.setAttribute("data-pt-injected", "1");  // ours to remove again — see pruneStyles
      n.onload = n.onerror = function () { if (--pending === 0) go(); };
      document.head.appendChild(n);
    }
    if (!pending) go(); else setTimeout(go, ASSET_CAP);
  }

  // Drop per-page stylesheets the new page does not ask for. Called AFTER the
  // swap so the incoming markup is never painted unstyled. Only ever touches
  // links this file created; the pages' own <link>s are untouched.
  function pruneStyles(doc) {
    var want = {}, i, n, href;
    var incoming = doc.querySelectorAll('link[rel~="stylesheet"][href]');
    for (i = 0; i < incoming.length; i++) want[abs(incoming[i].getAttribute("href"))] = true;

    var mine = document.querySelectorAll("link[data-pt-injected]");
    for (i = mine.length - 1; i >= 0; i--) {
      n = mine[i];
      href = abs(n.getAttribute("href") || "");
      if (!want[href] && n.parentNode) n.parentNode.removeChild(n);
    }
  }

  // A page's scripts are injected once and then stay in the document, so on a
  // SECOND visit nothing re-runs. That is what the initPage() hooks are for —
  // and what the empty-region check at the end of swap() backstops.
  function loadScripts(doc, cb) {
    var have = {}, go = once(cb), queue = [], i;
    var mine = document.querySelectorAll("script[src]");
    for (i = 0; i < mine.length; i++) have[abs(mine[i].getAttribute("src"))] = true;

    var incoming = doc.querySelectorAll("script[src]");
    for (i = 0; i < incoming.length; i++) {
      // type=module is experience.js only, and we never swap into that page.
      if (incoming[i].getAttribute("type") === "module") continue;
      var src = abs(incoming[i].getAttribute("src"));
      if (have[src]) continue;
      have[src] = true;
      queue.push(src);
    }
    if (!queue.length) { go(); return; }

    setTimeout(go, ASSET_CAP);
    (function next() {
      if (!queue.length) { go(); return; }
      var s = document.createElement("script");
      s.src = queue.shift();
      s.async = false;                      // keep fleet.js → car.js ordering
      s.onload = s.onerror = next;
      document.body.appendChild(s);
    })();
  }

  /* ==================================================================
     Head + chrome sync
     ================================================================== */
  function syncHead(doc) {
    var t = doc.querySelector("title");
    if (t) document.title = t.textContent;

    // Language-aware label for the route announcement. document.title is
    // single-language; the <h1> carries both via data-es / data-en.
    said = "";
    var region = doc.getElementById(ROOT_ID);
    var h1 = region ? region.querySelector("h1") : null;
    if (h1) {
      var span = h1.querySelector("[data-" + langCode() + "]");
      if (span) said = (span.textContent || "").replace(/\s+/g, " ").trim();
    }

    var next = doc.querySelector('meta[name="description"]');
    var cur = document.querySelector('meta[name="description"]');
    if (next) {
      if (!cur) {
        cur = document.createElement("meta");
        cur.setAttribute("name", "description");
        document.head.appendChild(cur);
      }
      cur.setAttribute("content", next.getAttribute("content") || "");
    }

    // Pages carry their own skip-link target (#main vs #carDetail).
    var newSkip = doc.querySelector('body > a[href^="#"]');
    var oldSkip = document.querySelector('body > a[href^="#"]');
    if (newSkip && oldSkip) oldSkip.setAttribute("href", newSkip.getAttribute("href"));

    // A page-specific <body> class, if any. home-exp is never adopted.
    if (doc.body) {
      var cls = (doc.body.getAttribute("class") || "").replace(/\bhome-exp\b/g, "").trim();
      if (cls) document.body.setAttribute("class", cls);
      else document.body.removeAttribute("class");
    }
  }

  function updateNav(url) {
    var here = parse(url).pathname;
    var links = document.querySelectorAll(".nav-links a, .mobile-menu a");
    for (var i = 0; i < links.length; i++) {
      var a = links[i], on = parse(a.href).pathname === here;
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      a.classList.toggle("active", on);
    }
  }

  /* Route change is silent to assistive tech unless we say so. The region has
     to exist and be monitored BEFORE its text changes, so it is created once
     at init() — creating it and filling it in the same task announces nothing
     in most screen readers. */
  function ensureLive() {
    if (live || !document.body) return;
    live = document.createElement("div");
    live.className = "pt-live";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    document.body.appendChild(live);
  }

  function announce() {
    ensureLive();
    if (live) live.textContent = said || document.title;
  }

  // Each hook is isolated: a throwing module must not skip the others, and
  // must never skip into() — the caller's try/catch is the second net.
  function callHook(ns, name) {
    var o = window[ns];
    if (!o || typeof o[name] !== "function") return;
    try { o[name](); } catch (e) { warn(ns + "." + name + "()", e); }
  }

  function reinit(url) {
    callHook("SerresApp", "initPage");
    callHook("SerresCar", "initPage");
    callHook("SerresFleetGallery", "initPage");
    try { updateNav(url); } catch (e) { warn("updateNav()", e); }
    try {
      document.dispatchEvent(new CustomEvent("serres:pageswap", { detail: { url: url } }));
    } catch (e) {}
  }

  /* ==================================================================
     The navigation itself
     ================================================================== */
  function hardNav(url) {
    busy = false;
    document.documentElement.classList.remove("is-transitioning", "pt-transitioning");
    window.location.href = url;
  }

  function navigate(url, dir, push) {
    var el = root();
    if (!el) { hardNav(url); return; }

    busy = true;
    document.documentElement.classList.add("is-transitioning", "pt-transitioning");

    var doc = null, failed = false, moved = false, swapped = false;
    var netGuard = 0, tweenGuard = 0;

    /* The single way out. Releases the click guard, drops the classes that
       make .pt-root pointer-events:none, and unparks #page-root. Safe to call
       twice, and safe to call at any point in the sequence. */
    function finish() {
      if (netGuard) { clearTimeout(netGuard); netGuard = 0; }
      if (tweenGuard) { clearTimeout(tweenGuard); tweenGuard = 0; }
      var r = root();
      if (r) {
        if (window.gsap) { try { window.gsap.killTweensOf(r); } catch (e) {} }
        clear(r);                           // never leave content off-canvas
      }
      document.documentElement.classList.remove("is-transitioning", "pt-transitioning");
      busy = false;
    }

    /* Watchdog 1 — the fetch neither resolved nor rejected (hung connection).
       Nothing has been swapped yet, so a real page load is the clean recovery. */
    netGuard = setTimeout(function () {
      if (busy && !swapped) hardNav(url);
    }, NET_CAP);

    // The fetch runs alongside the OUT tween, so the wait is usually free.
    window.fetch(url, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then(function (html) {
        var d = new DOMParser().parseFromString(html, "text/html");
        if (!d.getElementById(ROOT_ID)) throw new Error("no #" + ROOT_ID);
        doc = d;
        settle();
      })["catch"](function () { failed = true; settle(); });

    out(dir, function () { moved = true; settle(); });

    function settle() {
      if (!moved || (!doc && !failed)) return;
      if (!doc) { hardNav(url); return; }   // network error / not a Serres page
      preloadStyles(doc, swap);
    }

    function swap() {
      swapped = true;

      if (push) {
        // Stamp where the outgoing page was scrolled to (and how deep it sits)
        // onto its own entry BEFORE pushing the new one over it, so Back can
        // restore the offset — history.scrollRestoration is 'manual'.
        try {
          history.replaceState(
            { pt: true, url: location.href, i: idx, y: window.pageYOffset }, "", location.href);
        } catch (e) {}
        idx++;
        // History first: app.js reads ?cat= and car.js reads ?slug= at init time.
        try { history.pushState({ pt: true, url: url, i: idx, y: 0 }, "", url); } catch (e) {}
      }

      syncHead(doc);
      el.innerHTML = doc.getElementById(ROOT_ID).innerHTML;

      /* styles.css hides .reveal (opacity:0, translateY(26px)) until an
         IntersectionObserver adds .in. That observer would measure this region
         while prep() has it parked at translate3d(100%,0,0) and score every
         element at 0% intersecting, so the page would land empty and then pop
         in section by section over the following second. The slide IS the
         entrance animation — reveal the incoming content up front. */
      var rv = el.querySelectorAll(".reveal:not(.in)");
      for (var i = 0; i < rv.length; i++) rv[i].classList.add("in");

      prep(dir);                            // park off-screen before anything paints

      var hash = parse(url).hash;
      var anchor = hash ? document.getElementById(hash.slice(1)) : null;
      var y;
      if (anchor) y = anchor.getBoundingClientRect().top + window.pageYOffset;
      else if (push) y = 0;
      else y = (history.state && history.state.y) || 0;   // Back returns you where you were
      jumpTo(y);

      /* Watchdog 2 — content is now parked off-canvas. Whatever happens from
         here, the guard comes off and the page comes back on screen. */
      tweenGuard = setTimeout(function () {
        if (busy) finish();
      }, (DUR * 2000) + ASSET_CAP + 1000);

      loadScripts(doc, function () {
        // Nothing in here may prevent into(finish) from running.
        try {
          reinit(url);
          announce();
          el.setAttribute("tabindex", "-1");
          try { el.focus({ preventScroll: true }); } catch (e) {}
        } catch (err) {
          warn("post-swap", err);
        }

        try { pruneStyles(doc); } catch (e) { warn("pruneStyles()", e); }

        /* Defence for the "second visit renders an empty shell" class of bug:
           a page's scripts are injected only once, so a page that self-boots on
           load and exposes no re-init hook would swap in nothing but its static
           shell. If the region really is empty and nothing can fill it, take
           the real navigation — a page load always beats a blank page. */
        var cd = document.getElementById("carDetail");
        if (cd && !cd.children.length && !(window.SerresCar && window.SerresCar.initPage)) {
          hardNav(url);
          return;
        }

        into(finish);
      });
    }
  }

  /* ==================================================================
     Back / forward — same animation, mirrored for the direction actually
     travelled (state.i vs the depth we last knew about).
     ================================================================== */
  function onPopState(e) {
    if (!e.state || !e.state.pt) return;    // not one of ours; leave it alone
    // The 3D homepage can never be restored into this document.
    if (isIndex(location.pathname)) { location.reload(); return; }
    // Hammering back mid-flight: the URL moved but the DOM did not — resync hard.
    if (busy) { location.reload(); return; }

    var to = (typeof e.state.i === "number") ? e.state.i : 0;
    var dir = to < idx ? "back" : "forward";
    idx = to;
    navigate(location.href, dir, false);
  }

  /* ---------- boot ---------- */
  function init() {
    // Never on the 3D homepage — experience.js owns that document entirely.
    if (isHomeDoc() || isIndex(location.pathname)) return;
    if (!root()) return;
    if (!window.fetch || !window.DOMParser || !window.history || !history.pushState) return;

    document.documentElement.classList.add("pt-ready");

    // The live region must be in the DOM and monitored before its text ever
    // changes, otherwise the first route change is announced to nobody.
    ensureLive();

    // We restore scroll ourselves in swap(); the browser's own restoration
    // races jumpTo() and the user ends up at the top on every Back.
    try { history.scrollRestoration = "manual"; } catch (e) {}

    // Seed the current entry so popstate can tell our history apart, and pick
    // up our depth again if we got here by a full load of a pushed URL.
    if (history.state && history.state.pt && typeof history.state.i === "number") idx = history.state.i;
    try {
      history.replaceState({ pt: true, url: location.href, i: idx, y: window.pageYOffset }, "", location.href);
    } catch (e) {}

    document.addEventListener("click", onClick, false);
    window.addEventListener("popstate", onPopState, false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
