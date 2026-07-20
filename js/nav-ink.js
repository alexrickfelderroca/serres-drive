/* =====================================================================
   SERRES DRIVE — nav-ink.js
   "Ink Blot Circle Reveal" mobile navigation.

   Clicking the round toggle grows a near-black ink blot from the centre
   of the button until it covers the viewport. Two layers stay in perfect
   sync because they are driven by the SAME numbers every frame:
     1. an SVG <circle> inside a <clipPath> clipping a full-bleed <rect>
     2. clip-path:circle(var(--ink-r) at var(--ink-x) var(--ink-y)) on the
        interactive panel
   One paused GSAP timeline plays forward to open and reverses to close.
   Falls back to a rAF tween when GSAP is absent, and to an instant
   show/hide under prefers-reduced-motion.

   ---------------------------------------------------------------------
   MARKUP THE ORCHESTRATOR MUST PASTE (identical on all 7 pages)
   ---------------------------------------------------------------------
   A) In <head>, after css/styles.css:
      <link rel="stylesheet" href="css/nav-ink.css">

   B) Inside .nav-actions, REPLACING <button class="burger" id="burger">…:

<button class="ink-toggle" id="inkToggle" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="inkMenu"><span class="ink-bars" aria-hidden="true"><i></i><i></i></span></button>

   C) REPLACING the whole <div class="mobile-menu" id="mobileMenu">…</div>:

<div class="ink-nav" id="inkMenu" aria-hidden="true">
  <svg class="ink-blot" aria-hidden="true" focusable="false"><defs><clipPath id="inkClip"><circle class="ink-circle" cx="0" cy="0" r="0"></circle></clipPath></defs><rect class="ink-fill" width="100%" height="100%" clip-path="url(#inkClip)"></rect></svg>
  <div class="ink-panel">
    <nav class="ink-links" aria-label="Menú principal">
      <a href="fleet.html"><span class="ink-num">01</span><span class="ink-label"><span data-es>Flota</span><span data-en>Fleet</span></span></a>
      <a href="rates.html"><span class="ink-num">02</span><span class="ink-label"><span data-es>Tarifas</span><span data-en>Rates</span></span></a>
      <a href="how.html"><span class="ink-num">03</span><span class="ink-label"><span data-es>Cómo funciona</span><span data-en>How it works</span></span></a>
      <a href="why.html"><span class="ink-num">04</span><span class="ink-label"><span data-es>Por qué Serres</span><span data-en>Why Serres</span></span></a>
      <a href="contact.html"><span class="ink-num">05</span><span class="ink-label"><span data-es>Contacto</span><span data-en>Contact</span></span></a>
    </nav>
    <div class="ink-foot">
      <div class="lang" role="group" aria-label="Idioma / Language">
        <button data-lang="es" aria-pressed="true">ES</button>
        <button data-lang="en" aria-pressed="false">EN</button>
      </div>
    </div>
  </div>
</div>

   D) Before </body>, after js/app.js:
      <script src="js/nav-ink.js"></script>

   Add aria-current="page" to the matching <a> on each page, exactly as
   the old .mobile-menu did. app.js already wires [data-lang] buttons and
   [data-es]/[data-en] visibility, so the language toggle needs no extra
   work here.
   ===================================================================== */
(function () {
  "use strict";

  var DUR = 0.9;            // seconds, blot open
  var LINKS_AT = 0.55;      // links start 55% through the blot
  var PAD = 8;              // radius overshoot past the farthest corner

  var root = document.documentElement;
  // Flag the ready state at SCRIPT-EXECUTION time, not DOMContentLoaded, so mobile
  // never flashes the desktop .nav-links strip on a slow load. init() revokes it
  // again if the required markup turns out to be missing.
  root.classList.add("ink-ready");

  var toggle, menu, panel, circle, linkEls, footEl;
  var open = false;
  var reduce = false, tl = null, prog = { p: 0 }, raf = null, curP = 0;
  var cx = 0, cy = 0, R = 0;
  var lockedScroll = 0, prevBodyOverflow = "", prevRootOverflow = "";

  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function toArr(list) { return Array.prototype.slice.call(list); }

  /* ---------- geometry: origin = centre of the toggle, R = farthest corner ---------- */
  function measure() {
    var w = window.innerWidth, h = window.innerHeight;
    var b = toggle.getBoundingClientRect();
    // If the toggle is display:none (desktop) fall back to the top-right corner.
    if (b.width) { cx = b.left + b.width / 2; cy = b.top + b.height / 2; }
    else { cx = w - 40; cy = 40; }
    R = Math.max(
      Math.sqrt(cx * cx + cy * cy),
      Math.sqrt((w - cx) * (w - cx) + cy * cy),
      Math.sqrt(cx * cx + (h - cy) * (h - cy)),
      Math.sqrt((w - cx) * (w - cx) + (h - cy) * (h - cy))
    ) + PAD;
    circle.setAttribute("cx", cx.toFixed(1));
    circle.setAttribute("cy", cy.toFixed(1));
    menu.style.setProperty("--ink-x", cx.toFixed(1) + "px");
    menu.style.setProperty("--ink-y", cy.toFixed(1) + "px");
  }

  // The single source of truth for both layers.
  function render(p) {
    curP = p;
    var r = R * p;
    circle.setAttribute("r", r.toFixed(1));
    menu.style.setProperty("--ink-r", r.toFixed(1) + "px");
  }

  /* ---------- scroll lock ----------
     overflow:hidden alone is not enough on the homepage: Lenis drives its own
     rAF loop and would keep scrolling the page behind the overlay.
     js/experience.js publishes window.lenis, so stop()/start() below does the
     real work there. The wheel/touchmove swallowing stays as the fallback for
     every other page (and for the homepage if the 3D experience bailed out —
     it does on reduced-motion or without WebGL, and never sets window.lenis). */
  function blockScroll(e) {
    var t = e.target;
    if (t && t.nodeType === 3) t = t.parentNode;              // text node → element
    if (panel && t && t.nodeType === 1 && panel.contains(t)) return; // let the panel scroll
    if (e.cancelable) e.preventDefault();
  }

  function lockScroll(on) {
    if (on) {
      lockedScroll = window.scrollY || window.pageYOffset || 0;
      prevBodyOverflow = document.body.style.overflow;
      prevRootOverflow = root.style.overflow;
      document.body.style.overflow = "hidden";
      root.style.overflow = "hidden";
      window.addEventListener("wheel", blockScroll, { passive: false });
      window.addEventListener("touchmove", blockScroll, { passive: false });
      if (window.lenis && window.lenis.stop) window.lenis.stop();
    } else {
      document.body.style.overflow = prevBodyOverflow;
      root.style.overflow = prevRootOverflow;
      window.removeEventListener("wheel", blockScroll, { passive: false });
      window.removeEventListener("touchmove", blockScroll, { passive: false });
      if (window.lenis && window.lenis.start) window.lenis.start();
      // Some browsers nudge the scroll position while overflow is hidden.
      if (Math.abs((window.scrollY || 0) - lockedScroll) > 2) window.scrollTo(0, lockedScroll);
    }
  }

  /* ---------- state plumbing ---------- */
  function label(o) {
    var en = root.lang === "en";
    return o ? (en ? "Close menu" : "Cerrar menú") : (en ? "Open menu" : "Abrir menú");
  }

  function markOpen() {
    open = true;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    root.classList.add("ink-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", label(true));
  }

  // Runs when the closing animation has finished (or immediately, instantly).
  function finishClose() {
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
  }

  function markClosing() {
    open = false;
    root.classList.remove("ink-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", label(false));
  }

  /* ---------- animation ---------- */
  function buildTimeline() {
    if (reduce || !window.gsap) return;
    root.classList.add("ink-gsap");
    tl = window.gsap.timeline({
      paused: true,
      onReverseComplete: finishClose
    });
    tl.to(prog, {
      p: 1, duration: DUR, ease: "power3.inOut",
      onUpdate: function () { render(prog.p); }
    }, 0);
    tl.fromTo(linkEls,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: .55, stagger: .06, ease: "power2.out" },
      DUR * LINKS_AT);
    if (footEl) {
      tl.fromTo(footEl,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: .4, ease: "power2.out" },
        DUR * LINKS_AT + .2);
    }
  }

  // rAF fallback with a power3.inOut curve, used when GSAP never loaded.
  function tween(target) {
    var from = curP, start = null;
    var dist = Math.abs(target - from);
    var ms = DUR * 1000 * (dist || 1);
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (!dist) { render(target); if (!target) finishClose(); return; }
    raf = requestAnimationFrame(function step(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / ms, 1);
      var e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      render(from + (target - from) * e);
      if (t < 1) { raf = requestAnimationFrame(step); }
      else { raf = null; if (target === 0) finishClose(); }
    });
  }

  /* ---------- open / close ---------- */
  function openMenu() {
    if (open) return;
    markOpen();
    lockScroll(true);
    measure();   // after the lock: hiding a scrollbar can shift the toggle
    if (reduce) { render(1); }
    else if (tl) { tl.play(); }
    else { tween(1); }
    focusFirst();
  }

  function closeMenu(instant) {
    if (!open) return;
    markClosing();
    lockScroll(false);
    if (reduce || instant) {
      if (tl) { tl.pause(0); prog.p = 0; }
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      render(0); finishClose();
    } else if (tl) {
      tl.reverse();
    } else {
      tween(0);
    }
    try { toggle.focus({ preventScroll: true }); } catch (e) { toggle.focus(); }
  }

  /* ---------- focus handling ---------- */
  // The overlay only ever holds links + the two language buttons, and they are
  // all visible whenever it is open — no visibility filtering needed.
  function focusables() {
    return [toggle].concat(toArr(menu.querySelectorAll('a[href], button:not([disabled])')));
  }

  // Move focus INTO the overlay without landing on a link.
  //
  // This used to focus the first link (FLOTA). On touch the browser cannot infer
  // the input modality of a programmatic focus, so it resolved :focus-visible and
  // painted the gooey chrome wash + the global focus ring behind that one row —
  // the "weird shade on the first option" on phones. Focusing the panel itself
  // keeps the screen-reader announcement and the tab trap working while leaving
  // every link unstyled. trap() handles activeElement === panel via its i === -1
  // branch, so the first Tab lands on the toggle and the ring proceeds normally.
  function focusFirst() {
    if (!panel) return;
    try { panel.focus({ preventScroll: true }); } catch (e) { panel.focus(); }
  }

  // Deterministic trap. A boundary-only trap leaks: the toggle sits early in the
  // DOM (inside .nav-actions) while #inkMenu sits after all page content, so a
  // native Tab from either one walks straight into the page behind the overlay.
  // Always cancel the default and drive the ring ourselves.
  function trap(e) {
    if (e.key !== "Tab") return;
    var f = focusables();
    if (!f.length) return;
    e.preventDefault();
    var i = f.indexOf(document.activeElement);
    var el = i === -1 ? f[0] : f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length];
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
  }

  /* ---------- init ---------- */
  function init() {
    toggle = q("#inkToggle");
    menu = q("#inkMenu");
    // Markup missing → give the header links back rather than hiding the nav.
    if (!toggle || !menu) { root.classList.remove("ink-ready"); return; }
    panel = q(".ink-panel", menu);
    circle = q(".ink-circle", menu);
    linkEls = toArr(menu.querySelectorAll(".ink-links a"));
    footEl = q(".ink-foot", menu);
    if (!circle || !panel) { root.classList.remove("ink-ready"); return; }

    // Set here rather than in the markup so all 7 pages stay in sync from one
    // place. -1 keeps the panel out of the Tab order but lets focusFirst() land
    // on it — see the note there.
    panel.setAttribute("tabindex", "-1");

    reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    if (reduce) root.classList.add("ink-reduce");

    // app.js sets html[lang] in its own DOMContentLoaded handler, which runs
    // BEFORE this one, so the MutationObserver below never fires for the
    // initial value — localise the label once, here.
    toggle.setAttribute("aria-label", label(false));

    buildTimeline();
    measure();
    render(0);

    toggle.addEventListener("click", function () { open ? closeMenu() : openMenu(); });

    // Any link closes the menu — the page-transition component may own the nav.
    linkEls.forEach(function (a) {
      a.addEventListener("click", function () { closeMenu(true); });
    });

    document.addEventListener("keydown", function (e) {
      if (!open) return;
      if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); closeMenu(); return; }
      trap(e);
    });

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        // Crossing the 860px breakpoint while open (e.g. rotating a tablet)
        // takes the toggle out of the layout and strands a full-screen,
        // scroll-locked overlay with no visible close control. Hard-close.
        if (open && !toggle.getClientRects().length) { closeMenu(true); return; }
        measure();
        render(open ? curP : 0);
      }, 120);
    }, { passive: true });

    // After a page transition: hard-reset to a closed, re-measured state.
    document.addEventListener("serres:pageswap", function (e) {
      // transitions.js already jumped the new document to 0, so the stale
      // lockedScroll would yank the user mid-page. Re-baseline it first.
      lockedScroll = window.scrollY || window.pageYOffset || 0;
      if (open) closeMenu(true); else finishClose();
      measure();
      render(0);
      toggle.setAttribute("aria-label", label(false));

      // transitions.js only re-syncs '.nav-links a, .mobile-menu a', so the
      // overlay's current-page marker is ours to maintain.
      var here = document.createElement("a");
      here.href = (e && e.detail && e.detail.url) || location.href;
      linkEls.forEach(function (a) {
        if (a.pathname === here.pathname) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    });

    // Keep the aria-label in the right language when app.js flips ES/EN.
    if (window.MutationObserver) {
      new MutationObserver(function () {
        toggle.setAttribute("aria-label", label(open));
      }).observe(root, { attributes: true, attributeFilter: ["lang"] });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
