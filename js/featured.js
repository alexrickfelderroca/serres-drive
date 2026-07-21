/* =====================================================================
   SERRES DRIVE — featured.js
   Scroll-driven split-reveal carousel for #featured on the home page.

   The reference this adapts is click-driven: each click wipes in a new
   fullscreen artwork via an expanding clip-path while the outgoing
   image slides away and the title cascades in per character. Here the
   ONLY driver is scroll position: the section is 320vh tall, .fc-pin
   is position:sticky (CSS pins — ScrollTrigger just reports progress),
   and progress through the section maps to slide 0→1→2 with hysteresis
   so a boundary crossed slowly can never flicker the same wipe twice.

   Progressive enhancement contract with featured.css:
   - Without this file (or without GSAP, or with prefers-reduced-motion)
     the markup stays a static stack of three readable photo links.
   - Everything "tall + sticky + hidden slides" only exists once this
     file adds .fc-on to .fc-sec.

   Clicks are untouched: the slides are real <a> links to car pages.
   ===================================================================== */
(function () {
  "use strict";

  var FULL   = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
  var FROM_R = "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)"; /* collapsed at right edge */
  var FROM_L = "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)";         /* collapsed at left edge  */
  var HYST   = 0.055;   /* ± dead band around each 1/N boundary (in section progress) */
  var WIPE_S = 1.1;     /* wipe duration, per the reference */

  /* The reference uses the premium CustomEase
       'M0,0 C0.071,0.505 0.192,0.726 0.318,0.852 0.45,0.984 0.504,1 1,1'
     — a fast attack that eases into a long soft landing ("hop").
     GSAP accepts a plain function as an ease, so we evaluate that exact
     two-segment cubic ourselves: pick the segment by x, binary-search
     the curve parameter (x(u) is monotonic — control xs are ordered),
     return y. ~24 iterations is exact to sub-pixel and costs nothing
     at 60fps for a handful of tweens. */
  var hopEase = (function () {
    var SEGS = [
      /* x0,y0, x1,y1, x2,y2, x3,y3 */
      [0, 0, 0.071, 0.505, 0.192, 0.726, 0.318, 0.852],
      [0.318, 0.852, 0.45, 0.984, 0.504, 1, 1, 1]
    ];
    function cubic(a, b, c, d, u) {
      var v = 1 - u;
      return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d;
    }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var s = x < SEGS[1][0] ? SEGS[0] : SEGS[1];
      var lo = 0, hi = 1, u = 0, i;
      for (i = 0; i < 24; i++) {
        u = (lo + hi) / 2;
        if (cubic(s[0], s[2], s[4], s[6], u) < x) lo = u; else hi = u;
      }
      return cubic(s[1], s[3], s[5], s[7], u);
    };
  })();

  /* Split a title into character <span>s so the cascade can stagger.
     The titles are plain text (no bilingual spans inside), so this is
     safe. The h2 keeps its HEADING role — aria-hidden here would delete
     all the car headings from the accessibility outline in enhanced mode.
     Instead the h2 gets an aria-label with the intact name, which
     supersedes the char-span soup, so heading navigation still announces
     "Urus", never "U r u s". Spaces become NBSP: inline-block spans would
     otherwise collapse them to zero width. */
  function splitChars(title) {
    var text = title.textContent || "";
    var frag = document.createDocumentFragment();
    var chars = [], i, s, ch;
    title.setAttribute("aria-label", text);
    title.textContent = "";
    for (i = 0; i < text.length; i++) {
      ch = text.charAt(i);
      s = document.createElement("span");
      s.className = "fc-ch";
      s.textContent = ch === " " ? "\u00A0" : ch;
      frag.appendChild(s);
      chars.push(s);
    }
    title.appendChild(frag);
    return chars;
  }

  var state = null; /* current live instance, for pageswap teardown */

  function init() {
    if (state) return;
    var sec = document.querySelector(".fc-sec");
    if (!sec || sec.classList.contains("fc-on")) return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    /* No GSAP → leave the static fallback exactly as CSS renders it. */
    if (!gsap || !ScrollTrigger) return;

    /* Reduced motion: do not enhance AT ALL — the stacked fallback is
       the reduced-motion experience. */
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    if (reduce) return;

    var slides = [].slice.call(sec.querySelectorAll(".fc-slide"));
    if (slides.length < 2) return;
    var dots = [].slice.call(sec.querySelectorAll(".fc-progress i"));
    var hint = sec.querySelector(".fc-hint");

    /* Per-slide handles + title split (done BEFORE .fc-on so the page
       never paints a half-built enhanced state). */
    var meta = [], i;
    for (i = 0; i < slides.length; i++) {
      var el = slides[i];
      var img = el.querySelector("img");
      var title = el.querySelector(".fc-title");
      var label = (img && img.getAttribute("alt")) || (title ? title.textContent : "");
      if (label && !el.getAttribute("aria-label")) el.setAttribute("aria-label", label);
      meta.push({ el: el, img: img, title: title, chars: title ? splitChars(title) : [] });
    }
    var N = meta.length;

    sec.classList.add("fc-on");

    /* Scroll runway scales with the slide count: one viewport on stage
       plus ~110vh of travel per wipe. The 320vh in featured.css is only
       the no-JS-never-happens fallback for this rule; with 5 slides the
       section is 540vh. Inline style so adding a slide in the HTML is the
       whole job — nothing else needs retuning. */
    sec.style.height = (100 + (N - 1) * 110) + "vh";

    var cur = 0;          /* active slide index */
    var tl = null;        /* running transition timeline */
    var booted = false;   /* first progress report applies instantly */
    var hintGone = false;

    /* Counter-translate distance for the parallax-style image slide.
       Read live (not cached) so a rotate/resize mid-session uses the
       right value on the next wipe. */
    function offset() { return window.innerWidth < 1000 ? 100 : 500; }

    /* Zoom slack: in landscape/desktop the imgs are object-fit:cover and
       oversized 4% so the ±offset counter-translate can never expose an
       edge. In portrait the photo is shown WHOLE (object-fit:contain,
       featured.css) — any scale would crop the very edges it exists to
       protect, and the slide's own background absorbs the translate. */
    function slack() { return window.innerWidth < window.innerHeight ? 1 : 1.04; }

    function setDots(idx) {
      for (var k = 0; k < dots.length; k++) dots[k].className = k === idx ? "is-on" : "";
    }

    /* Hidden slides leave the tab order + accessibility tree; otherwise
       a keyboard user would tab through two invisible fullscreen links. */
    function setA11y(idx) {
      for (var k = 0; k < N; k++) {
        if (k === idx) {
          meta[k].el.removeAttribute("aria-hidden");
          meta[k].el.removeAttribute("tabindex");
        } else {
          meta[k].el.setAttribute("aria-hidden", "true");
          meta[k].el.setAttribute("tabindex", "-1");
        }
      }
    }

    /* Instant, animation-free state: used at boot (including deep links
       that restore scroll mid-section — animating a catch-up wipe on
       load would look broken). scale 1.04 gives the imgs slack so the
       ±x counter-translate can never expose an edge. */
    function apply(idx) {
      for (var k = 0; k < N; k++) {
        var m = meta[k];
        gsap.set(m.el, { clipPath: k === idx ? FULL : FROM_R, autoAlpha: k === idx ? 1 : 0, zIndex: k === idx ? 2 : 1 });
        if (m.img) gsap.set(m.img, { x: 0, scale: slack() });
        if (m.title) gsap.set(m.title, { opacity: 1 });
        if (m.chars.length) gsap.set(m.chars, { y: 0, opacity: 1, filter: "blur(0px)" });
      }
      cur = idx;
      setDots(idx);
      setA11y(idx);
    }

    /* One split-reveal wipe. Down (index rising) reveals from the RIGHT,
       up reveals from the LEFT. Incoming img counter-translates against
       the wipe; outgoing img drifts the other way underneath. Both ride
       the same ease + duration as the clip, which is what guarantees the
       counter-translate never outruns the reveal edge (offset < viewport
       width, progress identical → no background sliver, ever). */
    function goTo(next) {
      var down = next > cur;
      var inn = meta[next];
      var out = meta[cur];
      var off = offset();

      /* A wipe may still be running (fast scrolling) — kill it and
         normalize EVERY slide so the new wipe starts from a clean,
         fully-determined state instead of a half-tweened one. */
      if (tl) { tl.kill(); tl = null; }
      for (var k = 0; k < N; k++) {
        if (k === next || k === cur) continue;
        gsap.set(meta[k].el, { autoAlpha: 0, zIndex: 1 });
      }
      gsap.set(out.el, { clipPath: FULL, autoAlpha: 1, zIndex: 1 });
      if (out.img) gsap.set(out.img, { x: 0, scale: slack() });
      gsap.set(inn.el, { clipPath: down ? FROM_R : FROM_L, autoAlpha: 1, zIndex: 2 });
      if (inn.title) gsap.set(inn.title, { opacity: 1 });

      cur = next;
      setDots(next);
      setA11y(next);

      if (!hintGone && hint) {
        hintGone = true;
        gsap.to(hint, { autoAlpha: 0, duration: 0.5, ease: "power1.out" });
      }

      tl = gsap.timeline({
        onComplete: function () {
          /* Park the outgoing slide clean so it is ready to be the
             incoming one next time. */
          gsap.set(out.el, { autoAlpha: 0 });
          if (out.img) gsap.set(out.img, { x: 0 });
          if (out.title) gsap.set(out.title, { opacity: 1 });
          tl = null;
        }
      });

      tl.fromTo(inn.el,
        { clipPath: down ? FROM_R : FROM_L },
        { clipPath: FULL, duration: WIPE_S, ease: hopEase }, 0);
      if (inn.img) {
        tl.fromTo(inn.img,
          { x: down ? off : -off, scale: slack() },
          { x: 0, scale: slack(), duration: WIPE_S, ease: hopEase }, 0);
      }
      if (out.img) {
        tl.to(out.img, { x: down ? -off * 0.6 : off * 0.6, duration: WIPE_S, ease: hopEase }, 0);
      }
      if (out.title) {
        tl.to(out.title, { opacity: 0, duration: 0.32, ease: "power1.out" }, 0);
      }
      if (inn.chars.length) {
        tl.fromTo(inn.chars,
          { y: "0.5em", opacity: 0, filter: "blur(10px)" },
          { y: "0em", opacity: 1, filter: "blur(0px)", duration: 0.72, ease: "power3.out", stagger: 0.045 },
          0.3);
      }
    }

    /* Progress → slide with hysteresis. Slide i nominally owns
       p ∈ [i/N, (i+1)/N]; to LEAVE the current slide, progress must
       travel HYST past the boundary in that direction. The while-loops
       (rather than a single step) absorb scrollbar drags that jump
       several boundaries in one scroll event. */
    function evaluate(p) {
      var t = cur;
      while (t < N - 1 && p > (t + 1) / N + HYST) t++;
      while (t > 0 && p < t / N - HYST) t--;
      if (!booted) {
        booted = true;
        if (t !== cur) apply(t);
        if (t > 0 && hint) { hintGone = true; gsap.set(hint, { autoAlpha: 0 }); }
        return;
      }
      if (t !== cur) goTo(t);
    }

    /* Everything past .fc-on hides slides — if any of it throws (a GSAP
       version conflict, a plugin gone missing), fall back HARD to the
       static stack rather than stranding two slides at visibility:hidden.
       Content is never allowed to be the casualty of an enhancement. */
    var st;
    try {
      apply(0);

      /* No pin here — position:sticky already pins; ScrollTrigger is only
         the progress meter (it also hears Lenis via the scrollerless
         lenis.on('scroll', ScrollTrigger.update) hookup in experience.js,
         and plain native scroll when Lenis never boots). */
      st = ScrollTrigger.create({
        trigger: sec,
        start: "top top",
        end: "bottom bottom",
        onUpdate: function (self) { evaluate(self.progress); },
        onRefresh: function (self) { evaluate(self.progress); }
      });
      evaluate(st.progress);
    } catch (err) {
      sec.classList.remove("fc-on");
      sec.style.height = "";
      for (i = 0; i < N; i++) {
        meta[i].el.removeAttribute("style");
        meta[i].el.removeAttribute("aria-hidden");
        meta[i].el.removeAttribute("tabindex");
        if (meta[i].img) meta[i].img.removeAttribute("style");
      }
      if (window.console && console.error) console.error("[featured] enhance failed, static fallback:", err);
      return;
    }

    state = {
      teardown: function () {
        try { st.kill(); } catch (e) {}
        if (tl) { tl.kill(); tl = null; }
        state = null;
      }
    };
  }

  /* transitions.js swaps the DOM in place and fires this for EVERY
     navigation: kill our ScrollTrigger/timeline so nothing runs against
     stale nodes, then re-init on the next frame in case the incoming
     page is the home page again (init() is a no-op elsewhere). */
  document.addEventListener("serres:pageswap", function () {
    if (state) state.teardown();
    window.requestAnimationFrame(function () { init(); });
  });

  init();
})();
