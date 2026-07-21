/* =====================================================================
   SERRES DRIVE — js/preloader.js
   "SERRES → DRIVE" split-overlay preloader.

   TIMELINE (seconds)
     0.0  three tag words drift in at scattered positions
     0.5  SERRES reveals character by character out of per-glyph masks
     2.3  DRIVE slides in to SERRES' right; the lockup re-centres around
          the finished SERRES DRIVE wordmark
     3.6  the assembled lockup settles — a slight scale-down/tighten
     4.2  tag words leave the way they came
     4.4  THE SPLIT — top half peels up, bottom half peels down, opening
          a letterbox slit at the centre (1s, "hop" cubic-bezier)
     5.4  overlay removed, scroll handed back

   ---------------------------------------------------------------------
   WHY THE OVERLAY SPLITS RATHER THAN THE PAGE BEING CLIPPED
   The reference this is adapted from wraps the whole page in a container
   and animates a clip-path on it. That cannot be done here: the home
   page runs a position:fixed WebGL stage, a fixed backdrop, Lenis smooth
   scroll and ScrollTrigger-pinned scrollytelling. A transformed or
   clipped ancestor re-parents every fixed child and desyncs every
   trigger. So THE PAGE IS NEVER TOUCHED. The overlay is two halves that
   peel apart to reveal it. Identical result, zero risk.

   ---------------------------------------------------------------------
   WHY THE WHOLE OVERLAY IS BUILT FROM JS
   No markup is required in any HTML file. If this script fails to load,
   throws, or is disabled, there is literally nothing left behind — which
   is the strongest possible form of "content is never permanently
   hidden". Nothing is ever hidden in the first place.

   ---------------------------------------------------------------------
   FAILSAFES (a stuck preloader is worse than no preloader)
     · everything runs inside try/catch → any throw force-removes it
     · 10s hard watchdog → fade out, then force-remove regardless of
       animation state
     · any click or keydown → skip out
     · the scroll lock is released on every one of those paths
   ===================================================================== */
(function () {
  "use strict";

  /* Re-entry guard. transitions.js re-executes a page's scripts after a
     swapped navigation, and the session gate below would normally catch
     that — this covers the first-visit case where it would not. */
  if (window.SerresPreloader) return;

  var SEEN_KEY   = "serres-preloader-seen";
  /* Watchdog. Worst nominal case is FONT_CAP + ENGINE_CAP + the 5.4s
     timeline ≈ 6.5s. The extra headroom is for the host page: index.html
     boots a WebGL stage, Lenis and ScrollTrigger concurrently behind the
     overlay, and GSAP advances the timeline in ticker time (lagSmoothing),
     not wall-clock — two shader-compile stalls would otherwise let this
     fire mid-split. */
  var HARD_CAP   = 10000; // ms — watchdog; nothing may outlive this
  /* Both gates below are pre-roll ON TOP of the 5.4s timeline, so they
     are what decide the worst case. */
  var FONT_CAP   = 500;   // ms — max wait for webfonts before measuring
  var ENGINE_CAP = 600;   // ms — max wait for the GSAP CDN (see whenEngineReady)
  var SKIP_FADE  = 300;   // ms — must match .pl--out in preloader.css
  var REDUCED_MS = 600;   // ms — static hold under prefers-reduced-motion

  /* Tag words. Authored as data-es/data-en sibling spans exactly like the
     rest of the site: the bilingual swap is pure CSS driven by <html lang>,
     so these self-correct the moment app.js publishes the stored language.

     No vertical position here on purpose. --pl-top is authored in
     css/preloader.css keyed off data-i, because an inline custom property
     outranks every author rule without !important — emitting it here made
     the (max-height:520px) landscape adjustment dead CSS. Adding a tag
     means adding its --pl-top rule alongside. */
  var TAGS = [
    { es: "Barcelona",           en: "Barcelona",
      side: "left",  inset: "12%", dx: "-26px", low: false },
    { es: "Flota premium",       en: "Premium fleet",
      side: "right", inset: "11%", dx: "26px",  low: false },
    { es: "Entrega a domicilio", en: "Door-to-door delivery",
      side: "left",  inset: "16%", dx: "-26px", low: true  }
  ];

  var root = null;      // the overlay element
  var tl = null;        // GSAP timeline, when GSAP is available
  var timers = [];      // setTimeout ids for the CSS fallback path
  var hardTimer = null;
  var dead = false;
  var skipping = false; // latch: skip() is one-shot (see skip())

  /* ---------- session gate ----------
     Once per session. sessionStorage throws outright in Safari private
     mode, so every touch of it is wrapped — a storage failure must never
     stop the page, it just means the preloader may run again. */
  function seen() {
    try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return false; }
  }
  function markSeen() {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (e) { /* private mode */ }
  }

  if (seen()) return;   // do nothing at all: no overlay, no scroll lock

  /* ---------- cubic-bezier easing ----------
     GSAP core cannot parse a cubic-bezier() string and CustomEase is a
     premium plugin we are not allowed to depend on, so the "hop" curve
     is solved here. Newton-Raphson on x, clamped — 8 iterations is well
     past convergence for a monotonic curve like (.8,0,.3,1). */
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function calc(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }

    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      var t = p, i, err, s;
      for (i = 0; i < 8; i++) {
        err = calc(t, x1, x2) - p;
        if (Math.abs(err) < 1e-5) break;
        s = slope(t, x1, x2);
        if (s === 0) break;
        t -= err / s;
      }
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      return calc(t, y1, y2);
    };
  }
  var HOP = bezier(0.8, 0, 0.3, 1);

  /* ---------- markup ---------- */

  // SERRES is the real logotype, so it cannot be split into characters the
  // way type can. It is revealed instead by a clip-path edge travelling
  // left-to-right across it — which suits an italic, forward-leaning mark
  // far better than a per-letter drop: it reads as the word being laid
  // down at speed.
  function markHTML() {
    return '<img class="pl-mark" src="assets/brand/serres-wordmark.svg" alt="" ' +
           'width="1000" height="89" decoding="async">';
  }

  // DRIVE arrives as one word behind a single mask, so its characters
  // only need the chrome fill, not their own boxes.
  function plainChars(word) {
    var out = "", i;
    for (i = 0; i < word.length; i++) out += '<span class="pl-char">' + word.charAt(i) + "</span>";
    return out;
  }

  function tagsHTML() {
    var out = "", i, t, pos;
    for (i = 0; i < TAGS.length; i++) {
      t = TAGS[i];
      // --i and --pl-dx stay inline: genuinely per-instance, and nothing
      // in a media query needs to override them.
      pos = "--i:" + i + ";--pl-dx:" + t.dx + ";" +
            (t.side === "right" ? "--pl-right:" + t.inset : "--pl-left:" + t.inset);
      out += '<span class="pl-tag' +
               (t.side === "right" ? " pl-tag--right" : "") +
               (t.low ? " pl-tag--low" : "") +
             '" data-i="' + i + '" style="' + pos + '">' +
               "<span data-es>" + t.es + "</span><span data-en>" + t.en + "</span>" +
             "</span>";
    }
    return out;
  }

  function lockupHTML() {
    return '<div class="pl-lockup-pos"><div class="pl-shift"><div class="pl-lockup">' +
             '<span class="pl-word pl-word--serres">' + markHTML() + "</span>" +
             '<span class="pl-drive-mask"><span class="pl-word pl-word--drive">' +
               plainChars("DRIVE") +
             "</span></span>" +
           "</div></div></div>";
  }

  // Both halves receive byte-identical content inside a .pl-vp that is
  // exactly one viewport tall and anchored to the outer edge. That is
  // what makes the two copies compose one continuous wordmark: each is
  // positioned in viewport coordinates and simply clipped to its half,
  // so the lockup at top:50% is cut exactly in two by the seam.
  function buildHalf(which) {
    var half = document.createElement("div");
    half.className = "pl-half pl-half--" + which;
    var vp = document.createElement("div");
    vp.className = "pl-vp";
    vp.innerHTML = tagsHTML() + lockupHTML();
    half.appendChild(vp);
    return half;
  }

  function build() {
    var el = document.createElement("div");
    el.className = "pl";
    // Decorative twice over: it duplicates the wordmark and it covers the
    // real content, which is what a screen reader should be reading.
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("role", "presentation");
    el.appendChild(buildHalf("top"));
    el.appendChild(buildHalf("bot"));
    return el;
  }

  /* ---------- measurement ----------
     SERRES must sit on the optical centre before DRIVE exists, then the
     lockup slides left as DRIVE arrives. The offset is half the width
     DRIVE (plus the word gap) occupies, which is simply
     (lockup width − SERRES width) / 2.

     Returned in EM, not px. The type size is viewport-relative
     (clamp(2.2rem,11vw,7rem)), so a px offset measured at load is wrong
     the moment the device is rotated. As a proportion of the type size
     the offset is constant at every width, which makes the whole thing
     resize-proof without a single listener. Published as --pl-shift so
     the GSAP path and the CSS path read the identical number. */
  function measureShift(el) {
    var lock = el.querySelector(".pl-half--top .pl-lockup");
    var ser  = el.querySelector(".pl-half--top .pl-word--serres");
    if (!lock || !ser) return 0;
    var px = (lock.getBoundingClientRect().width - ser.getBoundingClientRect().width) / 2;
    var em = parseFloat(getComputedStyle(lock).fontSize);
    if (!isFinite(px) || px <= 0 || !isFinite(em) || em <= 0) return 0;
    return px / em;
  }

  /* Barlow Condensed arrives over the network; measuring against the
     fallback stack would put SERRES visibly off-centre. Waiting is what
     a preloader is FOR, but it is capped so a dead font CDN can never
     stall the sequence. */
  function whenFontsReady(cb) {
    var fired = false;
    function go() { if (!fired) { fired = true; cb(); } }
    var t = setTimeout(go, FONT_CAP);
    try {
      if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
        document.fonts.ready.then(function () { clearTimeout(t); go(); }, function () { clearTimeout(t); go(); });
      } else {
        clearTimeout(t); go();
      }
    } catch (e) { clearTimeout(t); go(); }
  }

  /* ---------- scroll lock ---------- */
  function lockScroll() {
    document.documentElement.classList.add("pl-lock");
    // Lenis is entirely optional — it only exists on index.html, and only
    // after experience.js has booted, which may be after we start.
    try { if (window.lenis && typeof window.lenis.stop === "function") window.lenis.stop(); } catch (e) {}
  }
  function unlockScroll() {
    document.documentElement.classList.remove("pl-lock");
    try { if (window.lenis && typeof window.lenis.start === "function") window.lenis.start(); } catch (e) {}
    // ScrollTrigger may have measured while the scroller was locked.
    // Re-measuring afterwards costs nothing and removes a whole class of
    // "the scrollytelling is off by a screen" bug.
    try { if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === "function") window.ScrollTrigger.refresh(); } catch (e) {}
  }

  /* ---------- teardown ---------- */
  function clearTimers() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers.length = 0;
  }

  function destroy() {
    if (dead) return;
    dead = true;
    clearTimeout(hardTimer);
    hardTimer = null;
    clearTimers();
    try { if (tl) tl.kill(); } catch (e) {}
    document.removeEventListener("keydown", onDismiss, true);
    document.removeEventListener("pointerdown", onDismiss, true);
    try { if (root && root.parentNode) root.parentNode.removeChild(root); } catch (e) {}
    /* window.SerresPreloader pins this closure for the lifetime of the
       page, so every handle has to be dropped by hand. kill() stops the
       tweens but they keep _targets references to the ~40 overlay nodes —
       without this the detached subtree can never be collected. */
    tl = null;
    root = null;
    unlockScroll();
  }

  // Skip stops the sequence and fades out rather than cutting hard, so a
  // stray click does not read as a glitch. The watchdog stays armed, so
  // even a failed fade still ends in destroy().
  function skip() {
    /* Torn down FIRST, and latched, so this can only ever run once. A
       second dismiss inside the fade window — double-click, mobile
       double-tap, or a held ArrowDown/Space auto-repeating — used to
       re-enter here, and clearTimers() would discard the pending destroy
       while a fresh one was armed. Every further event pushed the
       deadline out again, leaving the page silently unscrollable under
       html.pl-lock behind an already-invisible overlay. */
    document.removeEventListener("keydown", onDismiss, true);
    document.removeEventListener("pointerdown", onDismiss, true);
    if (skipping) return;
    skipping = true;
    if (dead || !root) { destroy(); return; }
    try { if (tl) tl.kill(); } catch (e) {}
    clearTimers();
    root.className += " pl--out";
    timers.push(setTimeout(destroy, SKIP_FADE));
  }

  function onDismiss() { skip(); }

  /* ---------- GSAP path ----------
     Advanced stagger: the flat node list is [half1 chars…, half2 chars…],
     so a plain `stagger` value would run the bottom half after the top
     half and tear the wordmark in two. Keying the delay off data-i makes
     both copies move as one. */
  function byIndex(step) {
    return function (i, el) {
      var n = parseInt(el.getAttribute("data-i"), 10);
      return (isNaN(n) ? i : n) * step;
    };
  }

  function runGsap(gsap) {
    var all    = function (sel) { return root.querySelectorAll(sel); };
    var tags   = all(".pl-tag");
    var marks  = all(".pl-word--serres");
    var drive  = all(".pl-word--drive");
    var shifts = all(".pl-shift");
    var locks  = all(".pl-lockup");

    // The wipe edge. Both properties are set: Safari still wants the
    // prefixed one, and a half-applied clip would leave the mark hidden.
    var WIPE_HID = "inset(0% 100% 0% 0%)";
    var WIPE_VIS = "inset(0% 0% 0% 0%)";

    /* Re-assert the start state as inline transforms. The CSS already
       declares it (so there is no unstyled frame), but getComputedStyle
       hands GSAP a px matrix, not the authored percentages — tweening
       yPercent against that would compound the two. Setting it
       explicitly makes the start state unambiguous. */
    gsap.set(marks,  { clipPath: WIPE_HID, webkitClipPath: WIPE_HID });
    gsap.set(drive,  { xPercent: 105,  x: 0 });
    // .pl-shift is deliberately NOT pre-set: leaving the em-based CSS
    // transform in place keeps it correct across a rotation right up
    // until the tween below claims it at t=2.3, at which point GSAP
    // reads the resolved px off the computed matrix.
    gsap.set(tags,   { opacity: 0, y: 8, x: function (i, el) {
      return parseFloat((el.style.getPropertyValue("--pl-dx") || "0")) || 0;
    } });

    tl = gsap.timeline({ onComplete: destroy });

    // t=0.0 — tags drift in
    tl.to(tags, { opacity: 1, x: 0, y: 0, duration: 0.7, ease: "power2.out",
                  stagger: byIndex(0.12) }, 0);

    // t=0.5 — the speed wipe lays SERRES down left to right
    tl.to(marks, { clipPath: WIPE_VIS, webkitClipPath: WIPE_VIS,
                   duration: 1.25, ease: "power3.inOut" }, 0.5);

    // t=2.3 — DRIVE joins and the lockup re-centres around the finished
    // wordmark. Both tweens share a duration so they read as one move.
    tl.to(drive,  { xPercent: 0, duration: 0.9, ease: "power3.out" }, 2.3);
    tl.to(shifts, { x: 0,        duration: 0.9, ease: "power3.out" }, 2.3);

    // t=3.6 — settle/tighten
    tl.to(locks, { scale: 0.94, duration: 0.7, ease: "power2.inOut" }, 3.6);

    // t=4.2 — tags leave the way they came
    tl.to(tags, { opacity: 0, y: 8, duration: 0.5, ease: "power2.in",
                  stagger: byIndex(0.08),
                  x: function (i, el) {
                    return parseFloat((el.style.getPropertyValue("--pl-dx") || "0")) || 0;
                  } }, 4.2);

    // t=4.4 — THE SPLIT
    tl.to(all(".pl-half--top"), { yPercent: -100, duration: 1, ease: HOP }, 4.4);
    tl.to(all(".pl-half--bot"), { yPercent:  100, duration: 1, ease: HOP }, 4.4);
  }

  /* ---------- CSS fallback path ----------
     Same beats, driven by classes on the root. Every transition is gated
     on .pl--css in the stylesheet so it can never compete with GSAP. */
  var BEATS = [
    [0,    "is-tags"],
    [500,  "is-serres"],
    [2300, "is-drive"],
    [3600, "is-settle"],
    [4200, "is-tagsout"],
    [4400, "is-split"]
  ];

  function runCss() {
    root.className += " pl--css";
    // Belt and braces on top of the frames whenEngineReady already spent:
    // without a style flush the browser can coalesce "appended" and "class
    // added" into one state and the first transition never runs.
    void root.offsetWidth;
    for (var i = 0; i < BEATS.length; i++) {
      (function (beat) {
        timers.push(setTimeout(function () {
          if (!dead && root) root.className += " " + beat[1];
        }, beat[0]));
      })(BEATS[i]);
    }
    /* skip(), not destroy(): these beats are wall-clock timers but the
       transitions they trigger are not, so a stalled main thread can put
       the split behind schedule. Fading out covers that case; at 5400 on
       a healthy frame budget the halves are already off screen, so the
       fade is invisible and costs nothing. */
    timers.push(setTimeout(skip, 5400));
  }

  /* ---------- reduced motion ----------
     No stagger, no slide, no split: the finished lockup is simply held,
     then the whole overlay cross-fades away. A static readable state,
     never a blank one. */
  function runReduced() {
    root.className += " pl--reduced";
    timers.push(setTimeout(function () {
      if (dead || !root) return;
      root.className += " pl--out";
      timers.push(setTimeout(destroy, SKIP_FADE + 120));
    }, REDUCED_MS));
  }

  /* ---------- engine gate ----------
     WHY THIS EXISTS: this script runs from <head>, but index.html loads
     GSAP from a CDN at the END of <body>. whenFontsReady can resolve in a
     few ms on a warm font cache — long before GSAP exists — so deciding
     the engine there silently took the CSS fallback on the one page that
     actually has GSAP. So poll animation frames for it instead.

     The cap is as load-bearing as the wait: if GSAP genuinely never loads
     (every other page, or a blocked CDN) we must still animate, and
     ENGINE_CAP of pre-roll keeps the whole sequence inside HARD_CAP. The
     minimum of two frames also serves the CSS path, which needs the
     appended element styled before its first beat class lands. */
  function whenEngineReady(cb) {
    var t0 = now();
    var frames = 0;
    function now() {
      try { return performance.now(); } catch (e) { return Date.now(); }
    }
    (function poll() {
      if (dead || !root) return;
      if (window.gsap && typeof window.gsap.timeline === "function") { cb(window.gsap); return; }
      if (frames >= 2 && now() - t0 >= ENGINE_CAP) { cb(null); return; }
      frames++;
      requestAnimationFrame(poll);
    })();
  }

  /* ---------- boot ---------- */
  function start() {
    root = build();
    document.body.appendChild(root);
    markSeen();   // set as the animation starts, not when it finishes:
                  // a reload mid-sequence must not replay it
    lockScroll();

    /* Nothing may outlive this, whatever the animation engine does. It
       fades rather than cutting: ripping the halves out mid-split is the
       exact pop skip() exists to avoid. */
    hardTimer = setTimeout(function () {
      skip();
      // Deliberately NOT pushed into `timers` — skip() clears that array,
      // and this is the one timer that has to survive to guarantee the
      // overlay and its scroll lock are gone even if the fade never runs.
      setTimeout(destroy, SKIP_FADE + 100);
    }, HARD_CAP);
    document.addEventListener("keydown", onDismiss, true);
    document.addEventListener("pointerdown", onDismiss, true);

    var reduce = false;
    try {
      reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {}

    if (reduce) { runReduced(); return; }

    whenFontsReady(function () {
      if (dead || !root) return;
      try {
        root.style.setProperty("--pl-shift", measureShift(root) + "em");

        whenEngineReady(function (gsap) {
          if (dead || !root) return;
          try {
            if (gsap) runGsap(gsap); else runCss();
          } catch (e) {
            destroy();
          }
        });
      } catch (e) {
        destroy();   // a broken preloader must leave no trace
      }
    });
  }

  /* The overlay has to exist before the page paints, so this runs the
     moment the script does. It is written to work from <head> as well as
     from the end of <body>: if <body> is not parsed yet we poll for it
     on animation frames rather than waiting for DOMContentLoaded, which
     would let the page flash into view first. */
  function whenBody(cb) {
    if (document.body) { cb(); return; }
    var tries = 0;
    (function poll() {
      if (document.body) { cb(); return; }
      if (++tries > 120) { return; }   // ~2s of frames; give up silently
      requestAnimationFrame(poll);
    })();
    document.addEventListener("DOMContentLoaded", function once() {
      document.removeEventListener("DOMContentLoaded", once);
      if (!root && !dead) cb();
    });
  }

  // The single global: a manual escape hatch, nothing else.
  window.SerresPreloader = { skip: skip };

  try {
    whenBody(function () {
      if (root || dead) return;   // whenBody has two racing callbacks
      try { start(); } catch (e) { destroy(); }
    });
  } catch (e) {
    destroy();
  }
})();
