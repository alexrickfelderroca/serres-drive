/* =====================================================================
   SERRES DRIVE — wave-process.js
   "Wave Distortion Slider" adapted into the four-step process slider on
   how.html. Progressive enhancement: it upgrades an existing, readable
   <ol> of four steps into a single-stage slider whose photograph ripples
   under a travelling sine displacement driven by pointer proximity, drag
   velocity, and a burst fired on every slide change.

   ---------------------------------------------------------------------
   WHY 2D CANVAS AND NOT THREE.JS
   ---------------------------------------------------------------------
   The reference effect is a three.js plane with a custom vertex/fragment
   shader. three.js exists in this project, but only on index.html and only
   through an ES-module importmap; how.html loads neither three nor GSAP.
   Pulling a ~600 KB WebGL dependency onto a short informational page to
   ripple four photographs is a bad trade, and a WebGL context is one more
   thing to lose on mobile.

   So the displacement is done on a plain 2D canvas: the image is blitted in
   horizontal strips, each strip shifted along x by a travelling sine wave.
   Strip height is bounded (and adaptive) so the per-frame cost cannot run
   away with image size. The reference's r/g/b sampling offsets are
   reproduced by isolating the three colour channels into cached offscreen
   canvases and re-compositing them with 'lighter' at slightly different x
   offsets during a transition. Same look, same motion, zero dependencies,
   no shader compilation, no context loss.

   We never call getImageData(), so canvas tainting is irrelevant here even
   if an image were ever served cross-origin.

   ---------------------------------------------------------------------
   MARKUP THE ORCHESTRATOR MUST PASTE
   ---------------------------------------------------------------------
   A) In <head>, after css/styles.css:
      <link rel="stylesheet" href="css/wave-process.css">
   B) Replace the <div class="steps"> block inside <section id="main"> with
      the #waveProcess markup shipped alongside this file (four <li> steps,
      real <img> tags, both language spans). That markup is the no-JS
      fallback and the SEO/alt-text surface — it is never generated here.
   C) Before </body>, after js/app.js:
      <script src="js/wave-process.js"></script>

   The canvas is layered ON TOP of the current <img> and only fades in once
   it has genuinely painted a frame. Every image stays in the DOM underneath
   it, so a missing context, a reduced-motion preference, a small viewport,
   a low-capability device or an outright exception all leave the visitor
   looking at the photographs.
   ===================================================================== */
(function () {
  "use strict";

  var ROOT_ID = "waveProcess";

  /* ---------- motion constants (CSS pixels / seconds) ---------- */
  var FREQ = 0.011;        // rad per px — wavelength ~570px
  var HOVER_AMP = 5;       // resting ripple while the pointer is over the stage
  var VEL_GAIN = 0.045;    // pointer speed (px/s) -> amplitude
  var VEL_MAX = 13;
  var DRAG_GAIN = 0.09;
  var DRAG_MAX = 22;
  var BURST_AMP = 54;      // peak amplitude of the slide-change sweep
  var CHROMA_MAX = 9;      // peak r/b separation, px
  var TRANS_DUR = 0.72;    // seconds
  var PHASE_SPEED = 2.1;   // rad per second
  var RUBBER = 0.22;       // drag follow ratio of the plate
  var SWIPE_PX = 68;       // distance that commits a swipe
  var AXIS_PX = 10;        // horizontal travel before we claim the gesture

  /* Strip height in CSS px. Lower = smoother wave, more drawImage calls.
     tune() walks this up if frames start costing too much. */
  var STRIP_BASE = 6;
  var STRIP_MAX = 18;
  /* Peak of |sin(a) + 0.42*sin(b)|, i.e. the largest multiplier waveAt() can
     apply to an amplitude. The overscan is derived from it, so the two can
     never drift apart. */
  var WAVE_PEAK = 1.45;
  var CHAN_W = 720;        // channel-canvas width cap — only ever seen mid-burst
  var DPR_MAX = 2;         // the reference clamps to 1.5; 2 keeps text-sharp edges

  /* UI strings. Visible copy always lives in the markup as twin
     data-es/data-en spans; these are for attributes (aria-label,
     aria-roledescription) and the live region, which cannot hold spans. */
  var UI = {
    es: {
      role: "carrusel", slideRole: "diapositiva",
      label: "Proceso de reserva en cuatro pasos",
      prev: "Paso anterior", next: "Paso siguiente",
      go: "Ir al paso ", step: "Paso ", of: " de "
    },
    en: {
      role: "carousel", slideRole: "slide",
      label: "Four-step booking process",
      prev: "Previous step", next: "Next step",
      go: "Go to step ", step: "Step ", of: " of "
    }
  };

  var SVG_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var SVG_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

  /* ---------- module state (all reset by destroy()) ---------- */
  var root = null, stage = null, plate = null, cursor = null;
  var canvas = null, ctx = null, scratch = null, sctx = null;
  var liveEl = null, counterEl = null, prevBtn = null, nextBtn = null;
  var slides = [];              // {img, num, copy, dot, title:{es,en}}
  var index = 0, count = 0;

  var raf = null, running = false, lastT = 0, idle = 0;
  var inView = false, docVisible = true;
  var W = 0, H = 0, dpr = 1;
  var canvasLive = false;

  var phase = 0, hoverAmp = 0, velAmp = 0, dragAmp = 0;
  var hovering = false, pointerY = -1;
  var trans = null;             // {from, to, t}
  var strip = STRIP_BASE, frameEMA = 16, frames = 0, chromaOK = true;

  var drag = null;              // {id, x0, y0, x, t, vx, active, decided}
  var offs = [], io = null, ro = null, mo = null, mqs = [];
  var rt = null;                // resize debounce, no-ResizeObserver branch only
  var mqReduce = null, mqSmall = null;
  var lowCap = false;

  /* ================================================================
     small helpers
     ================================================================ */
  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lang() { return document.documentElement.lang === "en" ? "en" : "es"; }
  function t() { return UI[lang()]; }

  /* Every listener goes through here so destroy() can be exhaustive — this
     component outlives its own DOM when transitions.js swaps #page-root. */
  function on(target, type, fn, opt) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(type, fn, opt);
    offs.push(function () { target.removeEventListener(type, fn, opt); });
  }

  function mq(query) {
    if (!window.matchMedia) return { matches: false };
    return window.matchMedia(query);
  }
  /* Safari <14 only has the deprecated addListener/removeListener pair. */
  function mqOn(m, fn) {
    if (!m) return;
    if (m.addEventListener) { m.addEventListener("change", fn); mqs.push([m, fn, 1]); }
    else if (m.addListener) { m.addListener(fn); mqs.push([m, fn, 0]); }
  }

  function reduce() { return !!(mqReduce && mqReduce.matches); }
  function small() { return !!(mqSmall && mqSmall.matches); }

  /* The engine is optional in five independent ways. Anything false here and
     the plain <img> cross-fade is the whole experience — which is fine. */
  function engineOn() {
    return !!ctx && !reduce() && !small() && !lowCap;
  }

  function imgReady(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  }

  /* ================================================================
     split text — per word, per language span
     ================================================================ */
  /* The title holds TWO sibling spans ([data-es] / [data-en]) and the whole
     bilingual system is CSS driven off those attributes. So we split each
     language span's own text separately and never touch the parents: the
     markup that makes ES/EN work survives the split untouched. */
  function splitTitle(titleEl) {
    if (!titleEl || titleEl.getAttribute("data-wp-split") === "1") return;
    var langSpans = titleEl.querySelectorAll("[data-es],[data-en]");
    var targets = langSpans.length ? langSpans : [titleEl];
    for (var i = 0; i < targets.length; i++) splitNode(targets[i]);
    titleEl.setAttribute("data-wp-split", "1");
  }

  function splitNode(node) {
    // Only ever split a leaf of pure text. Anything with element children
    // (an inline .gold-text, a <br>) is left alone rather than flattened.
    if (!node || node.children.length) return;
    var text = node.textContent || "";
    if (!text.replace(/\s+/g, "")) return;

    var words = text.split(/\s+/);
    var frag = document.createDocumentFragment();
    var n = 0;
    for (var i = 0; i < words.length; i++) {
      if (!words[i]) continue;
      var mask = el("span", "wp-w");
      var mover = el("span", "wp-wi");
      mover.textContent = words[i];
      mask.appendChild(mover);
      // Consumed by animation-delay in css — the stagger lives in CSS so a
      // reduced-motion media query can kill it outright.
      mask.style.setProperty("--wp-i", String(n));
      frag.appendChild(mask);
      // A real space, not a margin: keeps wrapping and copy/paste honest.
      frag.appendChild(document.createTextNode(" "));
      n++;
    }
    node.innerHTML = "";
    node.appendChild(frag);
  }

  function playTitle(copy) {
    if (!copy || reduce()) return;
    var titleEl = copy.querySelector(".wp-title");
    if (!titleEl) return;
    titleEl.classList.remove("wp-play");
    // Force a reflow between remove and add, otherwise the browser coalesces
    // both mutations and the keyframes never restart.
    void titleEl.offsetWidth;
    titleEl.classList.add("wp-play");
  }

  /* ================================================================
     canvas geometry
     ================================================================ */
  function resize() {
    if (!canvas || !stage) return;
    var b = stage.getBoundingClientRect();
    if (!b.width || !b.height) return;
    dpr = clamp(window.devicePixelRatio || 1, 1, DPR_MAX);
    W = b.width; H = b.height;
    var bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw; canvas.height = bh;
    }
    // Work in CSS pixels everywhere downstream; dpr only lives here.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (scratch) {
      scratch.width = bw; scratch.height = bh;
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /* object-fit:cover, inflated by `over` so a strip shifted along x always has
     material to show instead of baring the background.

     `over` is computed per frame from the amplitude actually in play rather
     than fixed, for two reasons. A fixed value big enough for the transition
     burst (~150px) would permanently crop 14% off every photograph; and at
     rest the overscan collapses to ~2px, so the canvas frames the image
     identically to the object-fit:cover <img> underneath it — which is what
     stops a visible jump when the canvas fades in over it. */
  function coverRect(iw, ih, over) {
    var bw = W + over * 2, bh = H + over * 2;
    var s = Math.max(bw / iw, bh / ih);
    var w = iw * s, h = ih * s;
    return { dx: (W - w) / 2, dy: (H - h) / 2, dw: w, dh: h };
  }

  /* ================================================================
     channel isolation for the RGB split
     ================================================================ */
  /* Drawing the image then multiplying by pure red/green/blue leaves exactly
     that channel. Re-adding the three with 'lighter' at different x offsets
     reproduces the reference's per-channel sampling offsets, and reconstructs
     the original image exactly when the offset is zero.

     Built lazily (only when a transition first needs it), capped at CHAN_W,
     and cached on the <img>. The resolution loss is invisible: the channels
     are only ever on screen for ~0.4s in the middle of a violent wave. */
  function channels(img) {
    var cw = Math.min(CHAN_W, Math.max(1, img.naturalWidth));
    var cached = img.__wpChan;
    if (cached && Math.abs(cached.w - cw) < 2) return cached;

    var ch = Math.max(1, Math.round(cw * img.naturalHeight / img.naturalWidth));
    var made = { w: cw, h: ch };
    var keys = ["r", "g", "b"];
    var fills = { r: "#ff0000", g: "#00ff00", b: "#0000ff" };
    for (var i = 0; i < keys.length; i++) {
      var cv = el("canvas");
      cv.width = cw; cv.height = ch;
      var x = cv.getContext && cv.getContext("2d");
      if (!x) return null;
      x.drawImage(img, 0, 0, cw, ch);
      x.globalCompositeOperation = "multiply";
      x.fillStyle = fills[keys[i]];
      x.fillRect(0, 0, cw, ch);
      made[keys[i]] = cv;
    }
    img.__wpChan = made;
    return made;
  }

  /* ================================================================
     the wave itself
     ================================================================ */
  /* Two out-of-phase harmonics so the ripple reads as water rather than a
     test pattern. envY (pointer y) biases the amplitude towards the cursor;
     sweepY is the travelling packet fired on a slide change. */
  function waveAt(y, amp, envY, burst, sweepY) {
    var v = Math.sin(y * FREQ + phase) + 0.42 * Math.sin(y * FREQ * 2.3 - phase * 1.7);
    var e = 1;
    if (envY >= 0) {
      var d = (y - envY) / (H * 0.42);
      e = 0.5 + 0.5 * Math.exp(-d * d);
    }
    var b = 0;
    if (burst > 0.01) {
      var ds = (y - sweepY) / (H * 0.3);
      b = burst * Math.exp(-ds * ds);
    }
    return v * (amp * e + b);
  }

  /* One image, drawn as horizontal strips. `src` is either the <img> or one
     of its channel canvases — the source mapping is identical, which is why
     both go through this single function. */
  function drawLayer(target, src, sw, sh, r, amp, envY, burst, sweepY, xShift, alpha, comp) {
    target.globalAlpha = alpha;
    target.globalCompositeOperation = comp || "source-over";

    // Nothing to displace: one blit instead of H/strip of them.
    if (amp < 0.12 && burst < 0.12 && Math.abs(xShift) < 0.12) {
      target.drawImage(src, 0, 0, sw, sh, r.dx, r.dy, r.dw, r.dh);
      return;
    }

    var ky = sh / r.dh;                 // dest px -> source px, vertically
    for (var y = 0; y < H; y += strip) {
      var h = Math.min(strip, H - y);
      var sy = (y - r.dy) * ky;
      var sHt = h * ky;
      // The cover rect always encloses the stage, so these clamps are pure
      // float-drift insurance — drawImage throws on a zero-width source rect.
      if (sy < 0) { sHt += sy; sy = 0; }
      if (sy + sHt > sh) sHt = sh - sy;
      if (sHt <= 0) continue;
      var off = waveAt(y + h * 0.5, amp, envY, burst, sweepY) + xShift;
      target.drawImage(src, 0, sy, sw, sHt, r.dx + off, y, r.dw, h);
    }
  }

  function ensureScratch() {
    if (scratch) return sctx;
    scratch = el("canvas");
    scratch.width = canvas.width; scratch.height = canvas.height;
    sctx = scratch.getContext && scratch.getContext("2d");
    if (!sctx) { scratch = null; return null; }
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return sctx;
  }

  function easeInOut(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function draw() {
    if (!ctx || !W || !H) return false;
    var cur = slides[index];
    /* Nothing paintable yet (lazy or still-decoding photograph). Bailing while
       the canvas keeps .is-live would leave the PREVIOUS frame sitting at
       opacity:1 over a plate that has already cross-faded to the new step —
       "02 / 04" captioned over step 1's photo. Drop the canvas and let the
       <img> layer, which handles its own load state, show through. frame()
       puts .is-live back on the first successful draw. */
    if (!cur || !imgReady(cur.img)) {
      if (canvasLive) { canvas.classList.remove("is-live"); canvasLive = false; }
      return false;
    }

    var amp = clamp(hoverAmp + velAmp + dragAmp, 0, 46);
    var envY = hovering ? pointerY : -1;
    var burst = 0, sweepY = 0, te = 0, chroma = 0;
    var outImg = null;

    if (trans) {
      te = easeInOut(clamp(trans.t / TRANS_DUR, 0, 1));
      var p = clamp(trans.t / TRANS_DUR, 0, 1);
      burst = BURST_AMP * Math.sin(Math.PI * p);
      // The packet enters above the frame and leaves below it.
      sweepY = (-0.25 + 1.5 * p) * H;
      // Chroma only in the middle of the burst: the first and last frames of
      // the transition are then the crisp, full-resolution image.
      chroma = (p > 0.12 && p < 0.78)
        ? CHROMA_MAX * Math.sin(Math.PI * (p - 0.12) / 0.66)
        : 0;
      var from = slides[trans.from];
      if (from && imgReady(from.img)) outImg = from.img;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);

    // Largest offset any strip can take this frame — see coverRect().
    var over = WAVE_PEAK * (amp + burst) + Math.abs(chroma) + 2;

    // Outgoing image, fading out under the incoming one.
    if (outImg) {
      var ro2 = coverRect(outImg.naturalWidth, outImg.naturalHeight, over);
      drawLayer(ctx, outImg, outImg.naturalWidth, outImg.naturalHeight, ro2,
        amp, envY, burst, sweepY, 0, 1 - te, "source-over");
    }

    var rc = coverRect(cur.img.naturalWidth, cur.img.naturalHeight, over);
    var alpha = outImg ? te : 1;

    if (chroma > 0.6 && chromaOK) {
      // Channels must be summed with 'lighter' on their OWN surface: doing it
      // straight onto the main canvas would add them to the outgoing image
      // still sitting there and blow the highlights out.
      var s = ensureScratch();
      var chn = s ? channels(cur.img) : null;
      if (s && chn) {
        s.setTransform(dpr, 0, 0, dpr, 0, 0);
        s.globalAlpha = 1;
        s.globalCompositeOperation = "source-over";
        s.clearRect(0, 0, W, H);
        drawLayer(s, chn.r, chn.w, chn.h, rc, amp, envY, burst, sweepY, chroma, 1, "lighter");
        drawLayer(s, chn.g, chn.w, chn.h, rc, amp, envY, burst, sweepY, 0, 1, "lighter");
        drawLayer(s, chn.b, chn.w, chn.h, rc, amp, envY, burst, sweepY, -chroma, 1, "lighter");
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(scratch, 0, 0, scratch.width, scratch.height, 0, 0, W, H);
      } else {
        chromaOK = false;   // no scratch context on this device — stop trying
        drawLayer(ctx, cur.img, cur.img.naturalWidth, cur.img.naturalHeight, rc,
          amp, envY, burst, sweepY, 0, alpha, "source-over");
      }
    } else {
      drawLayer(ctx, cur.img, cur.img.naturalWidth, cur.img.naturalHeight, rc,
        amp, envY, burst, sweepY, 0, alpha, "source-over");
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    return true;
  }

  /* Strip size adapts to what the device can actually sustain. A phone that
     cannot hold 60fps gets a coarser wave and loses the chroma pass rather
     than dropping frames across the whole page. */
  function tune(dt) {
    frameEMA = frameEMA * 0.9 + (dt * 1000) * 0.1;
    frames++;
    if (frames < 24) return;
    if (frameEMA > 26 && strip < STRIP_MAX) { strip += 2; chromaOK = false; frames = 0; }
    else if (frameEMA < 13 && strip > STRIP_BASE) { strip -= 1; frames = 0; }
  }

  /* ================================================================
     rAF loop — only alive when it has something to do
     ================================================================ */
  function busy() {
    return !!trans || hovering || !!(drag && drag.active) ||
      (hoverAmp + velAmp + dragAmp) > 0.2;
  }

  function step(dt) {
    phase += dt * PHASE_SPEED;
    if (phase > 1e6) phase = 0;                 // keep float precision sane

    var target = hovering ? HOVER_AMP : 0;
    hoverAmp += (target - hoverAmp) * clamp(dt * 6, 0, 1);

    var decay = Math.exp(-dt * 4.5);
    velAmp *= decay;
    dragAmp *= decay;
    if (velAmp < 0.02) velAmp = 0;
    if (dragAmp < 0.02) dragAmp = 0;
    if (hoverAmp < 0.02 && !hovering) hoverAmp = 0;

    if (trans) {
      trans.t += dt;
      if (trans.t >= TRANS_DUR) trans = null;
    }
  }

  function frame(now) {
    raf = null;
    if (!running) return;
    var dt = lastT ? clamp((now - lastT) / 1000, 0.001, 0.05) : 0.016;
    lastT = now;
    tune(dt);
    step(dt);
    var ok = draw();
    if (ok && !canvasLive) { canvasLive = true; canvas.classList.add("is-live"); }

    if (busy()) { idle = 0; raf = requestAnimationFrame(frame); }
    else if (idle++ < 2) { raf = requestAnimationFrame(frame); }   // settle
    else { running = false; lastT = 0; }
  }

  /* Start (or nudge) the loop. Silently does nothing when the section is off
     screen, the tab is hidden, or the engine is switched off — the two
     conditions that stop this from ever being a battery drain. */
  function kick() {
    if (!engineOn() || !inView || !docVisible) return;
    /* dpr is re-read here, not just on a geometry change: dragging the window
       from a 1x monitor to a 2x one flips devicePixelRatio without moving a
       single CSS pixel, so neither observer fires and the canvas would keep
       painting a 1x backing store into a 2x box — visibly soft over a crisp
       <img> until the next window resize. */
    if (!W || !H || clamp(window.devicePixelRatio || 1, 1, DPR_MAX) !== dpr) resize();
    idle = 0;
    if (running) return;
    running = true; lastT = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function halt() {
    running = false; lastT = 0;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* Engine turned off at runtime (reduced motion toggled, viewport shrank).
     Hide the canvas so the untouched <img> underneath takes over cleanly. */
  function engineOff() {
    halt();
    trans = null;
    if (canvas) { canvas.classList.remove("is-live"); canvasLive = false; }
  }

  /* ================================================================
     slide state
     ================================================================ */
  function announce() {
    if (!liveEl) return;
    var s = slides[index];
    var u = t();
    liveEl.textContent = u.step + (index + 1) + u.of + count +
      (s && s.title ? ": " + s.title[lang()] : "");
  }

  function syncAria() {
    var u = t();
    if (stage) {
      stage.setAttribute("aria-roledescription", u.role);
      stage.setAttribute("aria-label", u.label);
    }
    if (prevBtn) prevBtn.setAttribute("aria-label", u.prev);
    if (nextBtn) nextBtn.setAttribute("aria-label", u.next);
    for (var i = 0; i < slides.length; i++) {
      var s = slides[i];
      if (s.copy) {
        s.copy.setAttribute("aria-roledescription", u.slideRole);
        s.copy.setAttribute("aria-label",
          u.step + (i + 1) + u.of + count + ": " + s.title[lang()]);
      }
      if (s.dot) s.dot.setAttribute("aria-label", u.go + (i + 1));
    }
    announce();
  }

  function syncDom(animate) {
    for (var i = 0; i < slides.length; i++) {
      var s = slides[i], cur = (i === index);
      if (s.img) {
        s.img.classList.toggle("is-current", cur);
        // The alt text stays in the markup for SEO, but only the visible
        // photograph should be announced — the other three are decoration.
        s.img.setAttribute("aria-hidden", cur ? "false" : "true");
      }
      if (s.num) s.num.classList.toggle("is-current", cur);
      if (s.copy) {
        s.copy.classList.toggle("is-current", cur);
        // Out of the a11y tree entirely — the copy is visually hidden and
        // holds no focusable descendants.
        s.copy.setAttribute("aria-hidden", cur ? "false" : "true");
      }
      if (s.dot) s.dot.setAttribute("aria-current", cur ? "true" : "false");
    }
    if (counterEl) counterEl.innerHTML = "<b>" + pad2(index + 1) + "</b> / " + pad2(count);

    // Disabling the button the visitor just pressed would drop focus to
    // <body> and lose their place, so hand it to the stage first.
    var active = document.activeElement;
    if ((index === 0 && active === prevBtn) || (index === count - 1 && active === nextBtn)) {
      try { stage.focus({ preventScroll: true }); } catch (e) { stage.focus(); }
    }
    if (prevBtn) prevBtn.disabled = (index === 0);
    if (nextBtn) nextBtn.disabled = (index === count - 1);
    if (animate) playTitle(slides[index].copy);
    announce();
  }

  /* Clamped, not wrapping: this is a linear four-step process, so jumping
     from "Conduce" back to "Elige tu coche" would misrepresent it. The two
     end buttons disable instead. */
  function goTo(i, animate) {
    i = clamp(i | 0, 0, count - 1);
    if (i === index) return;
    var from = index;
    index = i;
    syncDom(animate !== false);
    if (engineOn()) {
      trans = { from: from, to: i, t: 0 };
      kick();
    }
  }
  function move(d) { goTo(index + d, true); }

  /* ================================================================
     pointer, drag, keyboard
     ================================================================ */
  function localPoint(e) {
    var b = stage.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }

  function onEnter() {
    hovering = true;
    if (cursor) cursor.classList.add("is-on");
    root.classList.add("wp-ring");
    kick();
  }

  function onLeave() {
    hovering = false;
    pointerY = -1;
    if (cursor) cursor.classList.remove("is-on", "is-grab");
    root.classList.remove("wp-ring");
    kick();   // let the ripple decay out rather than snapping flat
  }

  var lastMove = 0, lastMX = 0, lastMY = 0;
  function onMove(e) {
    var p = localPoint(e);
    if (cursor) {
      cursor.style.setProperty("--wp-cx", p.x + "px");
      cursor.style.setProperty("--wp-cy", p.y + "px");
    }
    pointerY = p.y;

    var now = e.timeStamp || Date.now();
    var dt = lastMove ? (now - lastMove) : 0;
    if (dt > 0 && dt < 250) {
      var dist = Math.sqrt((p.x - lastMX) * (p.x - lastMX) + (p.y - lastMY) * (p.y - lastMY));
      velAmp = clamp(velAmp + (dist / dt) * 1000 * VEL_GAIN * 0.001, 0, VEL_MAX);
    }
    lastMove = now; lastMX = p.x; lastMY = p.y;

    if (drag) trackDrag(e, p);
    if (!hovering) onEnter();
    kick();
  }

  function trackDrag(e, p) {
    var dx = p.x - drag.x0, dy = p.y - drag.y0;

    if (!drag.decided) {
      // Vertical intent wins: hand the gesture back to the page. touch-action
      // is already pan-y in CSS, so the browser is scrolling regardless —
      // this just stops us from also treating it as a swipe.
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > AXIS_PX) { endDrag(false); return; }
      if (Math.abs(dx) < AXIS_PX) return;
      drag.decided = true;
      drag.active = true;
      root.classList.add("is-dragging");
      if (cursor) cursor.classList.add("is-grab");
      if (stage.setPointerCapture && e.pointerId != null) {
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      }
    }

    var now = e.timeStamp || Date.now();
    var dt2 = now - drag.t;
    if (dt2 > 0) {
      drag.vx = (p.x - drag.x) / dt2;                  // px per ms
      dragAmp = clamp(dragAmp + Math.abs(drag.vx) * DRAG_GAIN * 8, 0, DRAG_MAX);
    }
    drag.x = p.x; drag.t = now;

    // Rubber-band harder at the ends so the boundary is felt, not just seen.
    var atEnd = (dx > 0 && index === 0) || (dx < 0 && index === count - 1);
    var shift = dx * RUBBER * (atEnd ? 0.35 : 1);
    stage.style.setProperty("--wp-drag", shift.toFixed(1) + "px");
    drag.dx = dx;
  }

  function endDrag(commit) {
    if (!drag) return;
    var d = drag;
    drag = null;
    root.classList.remove("is-dragging");
    if (cursor) cursor.classList.remove("is-grab");
    stage.style.setProperty("--wp-drag", "0px");
    if (commit && d.active) {
      var flick = Math.abs(d.vx) > 0.45;
      if (d.dx <= -SWIPE_PX || (flick && d.vx < 0)) move(1);
      else if (d.dx >= SWIPE_PX || (flick && d.vx > 0)) move(-1);
    }
    kick();
  }

  function onDown(e) {
    if (e.isPrimary === false) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    var p = localPoint(e);
    drag = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, dx: 0,
             t: e.timeStamp || Date.now(), vx: 0, active: false, decided: false };
    // No preventDefault: touch-action:pan-y has already split the gesture with
    // the browser, and cancelling here is what previously killed page scroll.
  }

  function onUp() { endDrag(true); }
  function onCancel() { endDrag(false); }

  function onKey(e) {
    var k = e.key;
    if (k === "ArrowLeft" || k === "Left") { e.preventDefault(); move(-1); }
    else if (k === "ArrowRight" || k === "Right") { e.preventDefault(); move(1); }
    else if (k === "Home") { e.preventDefault(); goTo(0, true); }
    else if (k === "End") { e.preventDefault(); goTo(count - 1, true); }
  }

  /* ================================================================
     build
     ================================================================ */
  function build() {
    root = document.getElementById(ROOT_ID);
    if (!root || root.classList.contains("is-enhanced")) return;

    var list = root.querySelector(".wp-fallback");
    var items = root.querySelectorAll(".wp-item");
    if (!list || items.length < 2) return;

    /* Validate EVERY item before touching the DOM. A half-migrated fallback
       would be worse than no slider at all, so a missing part means we leave
       the readable stacked markup exactly as the server sent it. */
    var parts = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var img = it.querySelector("img");
      var copy = it.querySelector(".wp-copy");
      var num = it.querySelector(".wp-num");
      var titleEl = it.querySelector(".wp-title");
      if (!img || !copy || !num || !titleEl) return;
      parts.push({ img: img, copy: copy, num: num, title: titleEl });
    }
    count = parts.length;
    index = 0;

    var shell = el("div", "wp-shell");
    stage = el("div", "wp-stage");
    stage.setAttribute("role", "group");
    stage.setAttribute("tabindex", "0");
    plate = el("div", "wp-plate");
    var numwrap = el("div", "wp-numwrap");
    var copywrap = el("div", "wp-copywrap");
    var below = el("div", "wp-below");
    var ui = el("div", "wp-ui");
    var dots = el("div", "wp-dots");

    slides = [];
    for (i = 0; i < parts.length; i++) {
      var pt = parts[i];

      // Read both titles BEFORE splitting: afterwards the text is spread over
      // word spans, and these strings drive aria-label and the live region.
      var esNode = pt.title.querySelector("[data-es]");
      var enNode = pt.title.querySelector("[data-en]");
      /* Never fall back to the parent once EITHER span exists: on a bilingual
         <h3> the parent's textContent is both languages run together, so a
         step written with only a data-es span would have fed
         "Elige tu cochePick your car" into aria-label and the live region —
         invisible on screen, gibberish read aloud. The parent is only the
         right answer when the title carries no language spans at all. */
      var hasSpans = !!(esNode || enNode);
      var whole = (pt.title.textContent || "").replace(/\s+/g, " ").trim();
      var titles = {
        es: esNode ? esNode.textContent.replace(/\s+/g, " ").trim() : (hasSpans ? "" : whole),
        en: enNode ? enNode.textContent.replace(/\s+/g, " ").trim() : (hasSpans ? "" : whole)
      };
      titles.es = titles.es || titles.en;
      titles.en = titles.en || titles.es;

      pt.img.classList.add("wp-img");
      plate.appendChild(pt.img);            // moves it out of the fallback
      numwrap.appendChild(pt.num);
      pt.copy.setAttribute("role", "group");
      copywrap.appendChild(pt.copy);
      splitTitle(pt.title);

      var dot = el("button", "wp-dot");
      dot.type = "button";
      dot.setAttribute("data-wp-go", String(i));
      dots.appendChild(dot);

      slides.push({ img: pt.img, num: pt.num, copy: pt.copy, dot: dot, title: titles });
    }

    canvas = el("canvas", "wp-canvas");
    canvas.setAttribute("aria-hidden", "true");
    try {
      // alpha:true is required — the transition cross-fades over the outgoing
      // frame, and desynchronized avoids a compositor stall on Chrome.
      ctx = canvas.getContext ? canvas.getContext("2d", { alpha: true, desynchronized: true }) : null;
    } catch (err) { ctx = null; }
    if (!ctx && canvas.getContext) {
      try { ctx = canvas.getContext("2d"); } catch (err2) { ctx = null; }
    }

    cursor = el("div", "wp-cursor");
    cursor.setAttribute("aria-hidden", "true");

    plate.appendChild(canvas);
    stage.appendChild(plate);
    stage.appendChild(numwrap);
    stage.appendChild(cursor);

    prevBtn = el("button", "wp-btn wp-prev");
    prevBtn.type = "button";
    prevBtn.innerHTML = SVG_PREV;
    nextBtn = el("button", "wp-btn wp-next");
    nextBtn.type = "button";
    nextBtn.innerHTML = SVG_NEXT;
    ui.appendChild(prevBtn);
    ui.appendChild(dots);
    ui.appendChild(nextBtn);

    liveEl = el("p", "wp-sr");
    liveEl.setAttribute("role", "status");
    liveEl.setAttribute("aria-live", "polite");

    below.appendChild(copywrap);
    below.appendChild(ui);
    shell.appendChild(stage);
    shell.appendChild(below);
    shell.appendChild(liveEl);

    counterEl = el("span", "wp-counter");
    var headRight = root.querySelector(".wp-head-right") || root.querySelector(".wp-head");
    if (headRight) headRight.insertBefore(counterEl, headRight.firstChild);

    root.appendChild(shell);
    /* Sync BEFORE the point of no return. .wp-img is opacity:0 unconditionally,
       so nothing in the new shell is visible until syncDom() has flagged the
       current slide — and .wp-shell is display:none until is-enhanced. Running
       both syncs while the readable fallback list is still in the document
       means a future edit that throws in here degrades to the stacked markup
       instead of a permanently blank stage, which is exactly what the contract
       at the top of this file promises. */
    syncDom(false);
    syncAria();

    list.parentNode.removeChild(list);     // emptied by the moves above
    root.classList.add("is-enhanced");

    /* ---- capability gates ---- */
    mqReduce = mq("(prefers-reduced-motion:reduce)");
    mqSmall = mq("(max-width:620px)");
    // Coarse proxies, but the only ones the platform offers. A 2-core or
    // 2 GB device gets the still photograph and loses nothing it can read.
    lowCap = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
             (navigator.deviceMemory && navigator.deviceMemory <= 2) || false;

    /* ---- events ---- */
    on(prevBtn, "click", function () { move(-1); });
    on(nextBtn, "click", function () { move(1); });
    on(dots, "click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-wp-go]") : null;
      if (b) goTo(parseInt(b.getAttribute("data-wp-go"), 10) || 0, true);
    });
    on(stage, "keydown", onKey);

    if (window.PointerEvent) {
      on(stage, "pointerenter", onEnter);
      on(stage, "pointerleave", onLeave);
      on(stage, "pointermove", onMove);
      on(stage, "pointerdown", onDown);
      on(stage, "pointerup", onUp);
      on(stage, "pointercancel", onCancel);
      // A pointerup outside the stage still ends the gesture.
      on(window, "pointerup", function () { if (drag) endDrag(true); });
    }

    // Late-loading photographs: the canvas cannot paint until one is decoded.
    for (i = 0; i < slides.length; i++) {
      (function (img) {
        if (imgReady(img)) return;
        on(img, "load", function () { kick(); });
      })(slides[i].img);
    }

    if (window.IntersectionObserver) {
      io = new IntersectionObserver(function (entries) {
        for (var j = 0; j < entries.length; j++) {
          inView = entries[j].isIntersecting;
        }
        /* Scrolling the stage away does not reliably fire pointerleave when the
           pointer itself never moves (Safari historically does not), so the
           hover state is retired by hand. Left set, scrolling back would
           restart the loop with a resting ripple, cursor:none and a ghost ring
           frozen where the pointer used to be. */
        if (inView) { resize(); kick(); }
        else { halt(); if (hovering) onLeave(); }
      }, { rootMargin: "150px 0px" });
      io.observe(root);
    } else {
      inView = true;      // no IO: assume visible, the loop still self-idles
    }

    on(document, "visibilitychange", function () {
      docVisible = !document.hidden;
      if (docVisible) kick(); else halt();
    });
    docVisible = !document.hidden;

    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { resize(); kick(); });
      ro.observe(stage);
    } else {
      // rt is module-level so destroy() can cancel a pending debounce — this
      // component is torn down mid-flight on every page swap.
      on(window, "resize", function () {
        clearTimeout(rt);
        rt = setTimeout(function () { resize(); kick(); }, 140);
      }, { passive: true });
    }

    var onMq = function () {
      if (engineOn()) { resize(); kick(); } else engineOff();
    };
    mqOn(mqReduce, onMq);
    mqOn(mqSmall, onMq);

    // app.js flips html[lang] whenever the visitor switches ES/EN; every
    // aria-label and the live region have to follow it.
    if (window.MutationObserver) {
      mo = new MutationObserver(syncAria);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }

    resize();
    // First paint is deferred to the IntersectionObserver callback, so an
    // off-screen slider costs nothing until it is actually approached.
    if (!io) { inView = true; kick(); }
  }

  /* ================================================================
     teardown / re-init
     ================================================================ */
  function destroy() {
    halt();
    if (rt) { clearTimeout(rt); rt = null; }
    for (var i = 0; i < offs.length; i++) { try { offs[i](); } catch (e) { } }
    offs = [];
    for (i = 0; i < mqs.length; i++) {
      var m = mqs[i];
      try { m[2] ? m[0].removeEventListener("change", m[1]) : m[0].removeListener(m[1]); }
      catch (e2) { }
    }
    mqs = [];
    if (io) { io.disconnect(); io = null; }
    if (ro) { ro.disconnect(); ro = null; }
    if (mo) { mo.disconnect(); mo = null; }
    /* The channel cache is three full canvases per image (~15 MB over four
       slides) hung off the <img>, which survives us if it is reused. Cut it
       loose so reclamation is deterministic rather than up to the GC. */
    for (i = 0; i < slides.length; i++) {
      if (slides[i] && slides[i].img) slides[i].img.__wpChan = null;
    }
    root = stage = plate = cursor = canvas = scratch = null;
    ctx = sctx = liveEl = counterEl = prevBtn = nextBtn = null;
    slides = []; count = 0; index = 0; drag = null; trans = null;
    canvasLive = false; inView = false; running = false;
    strip = STRIP_BASE; frameEMA = 16; frames = 0; chromaOK = true;
    hoverAmp = velAmp = dragAmp = 0; hovering = false; pointerY = -1;
  }

  function initPage() {
    var next = document.getElementById(ROOT_ID);
    /* Already built, still in the document, still wired: leave it alone.
       transitions.js fires serres:pageswap for EVERY navigation, and a swap
       that leaves this page's markup in place would otherwise be torn down by
       destroy() and then refused by build()'s is-enhanced guard — killing the
       slider outright. */
    if (next && next === root && next.isConnected !== false && slides.length) return;
    destroy();
    try { build(); }
    catch (err) {
      // Any failure leaves whatever survived on screen; the fallback list is
      // only removed on the very last line of a successful build.
      if (window.console && console.warn) console.warn("wave-process:", err);
    }
  }

  window.SerresWaveProcess = { initPage: initPage };

  /* transitions.js injects a page's scripts only once, so on a SECOND visit
     to how.html nothing re-runs. It calls initPage() on a fixed list of
     globals that does not include this one, so — exactly as nav-ink.js does —
     we listen for the swap event ourselves. */
  document.addEventListener("serres:pageswap", initPage);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPage);
  else initPage();
})();
