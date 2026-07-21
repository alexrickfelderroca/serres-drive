/* =====================================================================
   SERRES DRIVE — experience.js
   Home hero, two continuous acts on ONE fixed three.js stage:

   ACT A · TUMBLE (scroll)  — the GT3 RS is fixed centre-screen, bobbing
     and tumbling end-over-end as you smooth-scroll the intro + collection.

   ACT B · TUBE (scroll → interactive)  — as the collection ends the car
     settles at centre and the fleet appears as a see-through 3D CYLINDER
     of car photos around it (re-creating the "Scroll-Driven Image Tube"
     reference). Scroll flows the tube vertically (infinite loop); it
     rotates gently; drag spins it; the Porsche turns slowly with it.
     Hover a photo for its name and price — the ring is spin-only; tiles
     do not navigate. Plain dark Serres backdrop — no grid.

   three.js (module) + GSAP ScrollTrigger + Lenis (globals).

   Degradation:
     · no JS          → module never loads; static GT3 poster + the
                        .oa-choose fallback grid of car links stay (CSS/inline).
     · no WebGL       → caught below; poster + fallback grid stay; copy readable.
     · reduced-motion → WebGL/scroll effects skipped; poster + grid stay.
   ===================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

(function () {
  "use strict";

  const mount = document.querySelector(".sd-model");
  const exp = document.querySelector(".oa-exp");
  if (!mount || !exp) return; // not the home page

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Lenis = window.Lenis;
  const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  function hasWebGL() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }
  if (reduce || !hasWebGL() || !gsap || !ScrollTrigger || !Lenis) return; // graceful static hero
  document.body.classList.add("sd-home");

  /* choose-act DOM (created in index.html) */
  const chooseEl = document.querySelector(".oa-choose");
  const chooseUI = document.querySelector(".sd-choose-ui");
  const tooltipEl = document.querySelector(".sd-tooltip");
  const cursorEl = document.querySelector(".sd-cursor");

  /* fleet list for the tube (from fleet.js; falls back to a short list) */
  // Cheapest published tier + its unit, so the four cars without a daily rate
  // still price in the tooltip instead of silently showing a bare name.
  function tubePrice(c) {
    const p = (c && c.prices) || {};
    const en = document.documentElement.lang === "en";
    if (p.d1 != null) return { v: p.d1, u: en ? "/d" : "/d" };
    if (p.w1 != null) return { v: p.w1, u: en ? "/wk" : "/sem" };
    if (p.d15 != null) return { v: p.d15, u: en ? "/15d" : "/15d" };
    if (p.m1 != null) return { v: p.m1, u: en ? "/mo" : "/mes" };
    return { v: 0, u: "" };
  }
  const CARS = (window.SERRES_FLEET && window.SERRES_FLEET.length
    ? window.SERRES_FLEET.map(function (c) {
        const tp = tubePrice(c);
        return { slug: c.slug, name: c.name, price: tp.v, unit: tp.u };
      })
    : [{ slug: "porsche-911-targa-gts", name: "Porsche 911 Targa GTS", price: 800, unit: "/d" }]);

  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const wrapPi = function (a) { return a - Math.PI * 2 * Math.round(a / (Math.PI * 2)); };

  /* ------------------------------------------------------------------ *
   * 1 · Smooth scroll (Lenis) → GSAP / ScrollTrigger                   *
   * ------------------------------------------------------------------ */
  const lenis = new Lenis({ lerp: 0.1 });
  // Published so other modules can cooperate with smooth scroll — js/nav-ink.js
  // stops it while the mobile menu is open, otherwise the page keeps gliding
  // underneath the overlay.
  window.lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  /* Seeded, not left at 0: history scroll restoration lands before this deferred
     module runs and fires no scroll event of its own, so an unseeded mirror parks
     the car at the p=0 pose on every mid-page reload. Same expression as below. */
  let currentScroll = window.scrollY || window.pageYOffset || 0;
  lenis.on("scroll", function (e) { currentScroll = e.scroll; });
  window.addEventListener("scroll", function () {
    currentScroll = window.scrollY || window.pageYOffset || currentScroll;
  }, { passive: true });

  /* ------------------------------------------------------------------ *
   * 2 · three.js scene (transparent — dark CSS backdrop shows through) *
   * ------------------------------------------------------------------ */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 3.0); key.position.set(4, 9, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe4ec, 2.0); rim.position.set(-7, 3, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xbfd0ff, 0.7); fill.position.set(0, 2, 7); scene.add(fill);

  /* ------------------------------------------------------------------ *
   * 3 · The image tube (Act B) — a see-through cylinder of car photos  *
   *     Rows repeat vertically for an infinite scroll loop; each row    *
   *     spins at its own speed for organic parallax (reference look).   *
   * ------------------------------------------------------------------ */
  const texLoader = new THREE.TextureLoader();
  const TUBE_COLS = 9, TUBE_ROWS = 6, TUBE_REPEAT = 3;
  const TOTAL_ROWS = TUBE_ROWS * TUBE_REPEAT;
  let tubeGroup = null;                 // holds the row groups; position.y = -scroll
  let rowGroups = [];                   // per-row group (rotates at rowSpeed)
  let rowSpeed = [];
  let tiles = [];                       // flat: { mesh, slug, name, price }
  const tileMeshes = [];                // for raycasting
  const meshToTile = new Map();
  let tubeRadius = 6, tileH = 1.8, ySpacing = 3, loopHeight = 15;
  let tubeAngle = 0, tubeSpinVel = 0;   // horizontal rotation (+ drag momentum)
  let carAngle = 0;                     // the Porsche's own slow, smooth spin
  let carYaw = 0, carYawSynced = false; // rendered yaw — follows the pose, rate-capped
  let tubeScrollCurrent = 0, tubeScrollTarget = 0, lastTubeScroll = 0;
  let VSCROLL = 0.02;                   // world units of tube travel per px scrolled
  const BASE_SPIN = 0.14;               // tube idle spin (rad/s) — gentle
  const CAR_SPIN = 0.11;                // Porsche idle spin (rad/s) — slower/smoother

  /* The car's yaw is never written straight from the scroll: it eases toward the
     scroll-derived pose (time constant ~0.084 s) and may never turn faster than
     CAR_YAW_MAX_RATE. The easing is what stops a fling reading as a blur; the
     ceiling exists only to bound outright discontinuities. Sizing it matters
     more than it looks — the approach maps 4π onto 2.2 viewports, i.e. 5.712 rad
     per viewport-height/second, so a 6 rad/s ceiling would already bite at
     1.05 vh/s (ordinary reading-pace scrolling) and leave the car a full
     revolution behind the page, still spinning a second after you stopped.
     18 clears any real continuous scroll — lag stays under π up to ~3.6 vh/s —
     so the two-revolution reveal stays genuinely mapped to the scroll, and π
     remains a reliable "this was a teleport" signal for the wrap below. */
  const CAR_YAW_FOLLOW = 0.18;          // ease toward the pose, per 60fps frame
  const CAR_YAW_MAX_RATE = 18.0;        // rad/s — bounds jumps, not normal scroll
  const DRAG_TO_ANGLE = 0.006;          // rad per px (horizontal drag → tube spin)
  const WHEEL_TO_ANGLE = 0.0016;        // rad per px of sideways wheel/trackpad

  /* Fast-scroll safety. The tube travels ~1.1 loop per viewport scrolled, so a
     fling can hand us several loops in one frame; unclamped that reads as the
     cylinder teleporting through the whole sequence. */
  const MAX_LOOPS_PER_FRAME = 0.16;     // ceiling on tube travel per frame
  const FRAME_GAP_MAX = 0.12;           // s — above this the frame is a stall, not motion

  /* While the tube owns the screen we damp the page scroll itself, so a hard
     flick glides instead of skipping the section. Restored on the way out. */
  const LENIS_DEFAULTS = { lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1 };
  const LENIS_INTUBE = { lerp: 0.055, wheelMultiplier: 0.42, touchMultiplier: 0.6 };
  let dampBlend = 0;                    // 0 = normal page, 1 = fully inside the tube
  function applyScrollDamping(reveal) {
    // ease toward the target so the change in feel is never abrupt
    const want = clamp((reveal - 0.06) / 0.22, 0, 1);
    dampBlend += (want - dampBlend) * 0.08;
    if (!lenis || !lenis.options) return;
    const o = lenis.options;
    o.lerp = lerp(LENIS_DEFAULTS.lerp, LENIS_INTUBE.lerp, dampBlend);
    o.wheelMultiplier = lerp(LENIS_DEFAULTS.wheelMultiplier, LENIS_INTUBE.wheelMultiplier, dampBlend);
    o.touchMultiplier = lerp(LENIS_DEFAULTS.touchMultiplier, LENIS_INTUBE.touchMultiplier, dampBlend);
  }

  function buildTube(dim) {
    tubeRadius = dim * 2.2;
    tileH = dim * 0.34;
    ySpacing = dim * 0.56;
    loopHeight = TUBE_ROWS * ySpacing;
    VSCROLL = loopHeight / (window.innerHeight * 0.9);

    rowSpeed = [];
    for (let r = 0; r < TUBE_ROWS; r++) rowSpeed.push(0.78 + (TUBE_ROWS <= 1 ? 0 : r / (TUBE_ROWS - 1)) * 0.5); // 0.78..1.28

    tubeGroup = new THREE.Group();
    scene.add(tubeGroup);

    for (let rowIndex = 0; rowIndex < TOTAL_ROWS; rowIndex++) {
      const baseRow = rowIndex % TUBE_ROWS;
      const rowOffset = baseRow % 2 === 0 ? 0 : 0.5;               // brick-stagger the columns
      const rg = new THREE.Group();
      rg.position.y = (rowIndex - (TOTAL_ROWS - 1) / 2) * ySpacing;
      rg.userData.baseRow = baseRow;
      tubeGroup.add(rg);
      rowGroups.push(rg);

      for (let col = 0; col < TUBE_COLS; col++) {
        const theta = ((col + rowOffset) / TUBE_COLS) * Math.PI * 2;
        const x = Math.cos(theta) * tubeRadius;
        const z = Math.sin(theta) * tubeRadius;
        const ry = -(theta + Math.PI / 2);                          // face radially outward
        const texIndex = (baseRow * TUBE_COLS + col) % CARS.length; // cycle the fleet (photos repeat)
        const car = CARS[texIndex];

        const mat = new THREE.MeshBasicMaterial({ color: 0x14151a, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.position.set(x, 0, z);
        mesh.rotation.y = ry;
        mesh.scale.set(tileH * 1.5, tileH, 1);
        mesh.visible = false;
        rg.add(mesh);

        const tile = { mesh: mesh, slug: car.slug, name: car.name, price: car.price, lx: x, lz: z, baseRow: baseRow };
        tiles.push(tile); tileMeshes.push(mesh); meshToTile.set(mesh, tile);

        texLoader.load("assets/img/cars/ring/" + car.slug + ".jpg", function (tex) {
          if ("colorSpace" in tex) tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
          const img = tex.image;
          const aspect = (img && img.width && img.height) ? clamp(img.width / img.height, 1.15, 1.9) : 1.5;
          mesh.scale.set(tileH * aspect, tileH, 1);
          mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
        }, undefined, function () {});
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * 4 · Render during load                                            *
   * ------------------------------------------------------------------ */
  let basicRAF = 0;
  function basicAnimate() { renderer.render(scene, camera); basicRAF = requestAnimationFrame(basicAnimate); }
  basicAnimate();

  /* ------------------------------------------------------------------ *
   * 5 · Load the GT3 RS                                                *
   * ------------------------------------------------------------------ */
  const BASE_YAW = -0.6, BASE_TILT = 0.20, BASE_ROLL = 0.05;
  const FLOAT_AMP = 0.09, FLOAT_SPEED = 1.35, SPINS = Math.PI * 4;
  let model = null, ready = false, running = true, carMaxDim = 0;
  let baseCamY = 0, baseCamZ = 6;
  const popState = { v: 0 };

  function frameCamera() {
    if (!carMaxDim) return;
    const a = window.innerWidth / window.innerHeight;
    const f = a < 0.8 ? 3.2 : a < 1.3 ? 2.55 : 2.05;
    baseCamY = carMaxDim * 0.16;
    baseCamZ = carMaxDim * f;
    camera.position.set(0, baseCamY, baseCamZ);
    camera.lookAt(0, 0, 0);
  }

  const draco = new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  const loader = new GLTFLoader().setDRACOLoader(draco);

  loader.load("assets/models/gt3.glb", function (gltf) {
    const inner = gltf.scene;
    inner.traverse(function (n) {
      if (n.isMesh && n.material) {
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach(function (m) { m.envMapIntensity = 1.35; });
      }
    });

    const box = new THREE.Box3().setFromObject(inner);
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);

    const wrap = new THREE.Group();
    wrap.add(inner);
    scene.add(wrap);
    model = wrap;

    const size = box.getSize(new THREE.Vector3());
    carMaxDim = Math.max(size.x, size.y, size.z);
    frameCamera();

    buildTube(carMaxDim);

    model.scale.set(0, 0, 0);
    gsap.to(popState, { v: 1, duration: 1.1, ease: "power2.out" });

    ready = true;
    mount.classList.add("is-live");
    document.body.classList.add("car-loaded");

    cancelAnimationFrame(basicRAF);
    animate();
  }, undefined, function (err) {
    console.warn("[Serres] GT3 model failed:", err);
    // The Draco decoder is a third-party CDN fetch, so this path is reachable on
    // any flaky connection. Removing the canvas alone was not enough: body still
    // carried .sd-home (added up at init), and home.css hides .oa-choose-grid and
    // .oa-choose-head under it — leaving a fixed full-screen Porsche JPEG over an
    // empty 200vh section with no heading and no links out. Give the real grid
    // back and stop the placeholder loop, which only ever got cancelled on the
    // success path.
    running = false;
    if (typeof basicRAF !== "undefined" && basicRAF) cancelAnimationFrame(basicRAF);
    setInteractive(false);
    document.body.classList.remove("sd-home");
    mount.remove();
  });

  /* ------------------------------------------------------------------ *
   * 6 · Outro — staggered line reveal + car fade                       *
   * ------------------------------------------------------------------ */
  const movers = gsap.utils.toArray(".oa-outro .oa-line-in");
  if (movers.length) {
    gsap.set(movers, { yPercent: 120 });
    ScrollTrigger.create({
      trigger: ".oa-outro", start: "top 62%",
      onEnter: function () { gsap.to(movers, { yPercent: 0, duration: 1, stagger: 0.12, ease: "power3.out" }); },
      onLeaveBack: function () { gsap.to(movers, { yPercent: 120, duration: 0.6, stagger: 0.06, ease: "power3.in" }); }
    });
  }
  ScrollTrigger.create({
    trigger: ".oa-outro", start: "top 52%",
    // Hand interaction back BEFORE parking the render loop — once running is
    // false animate() returns early and can no longer do it itself.
    onEnter: function () { setInteractive(false); mount.classList.remove("is-live"); running = false; },
    onLeaveBack: function () { if (ready) { mount.classList.add("is-live"); running = true; } }
  });

  /* The featured carousel owns the screen between the intro and the ring:
     the Porsche fades out while it plays and fades back in for the ring.
     Only the .is-live class is toggled (an 0.8s opacity transition in CSS) —
     `running` stays true, so unlike the outro parking above there is no
     early-return state to get wrong; the car keeps rendering behind the
     opaque slides and is simply invisible. */
  if (document.querySelector(".fc-sec")) {
    ScrollTrigger.create({
      trigger: ".fc-sec", start: "top 55%", end: "bottom 45%",
      onEnter:     function () { mount.classList.remove("is-live"); },
      onEnterBack: function () { mount.classList.remove("is-live"); },
      onLeave:     function () { if (ready && running) mount.classList.add("is-live"); },
      onLeaveBack: function () { if (ready && running) mount.classList.add("is-live"); }
    });
  }

  /* ------------------------------------------------------------------ *
   * 7 · Scroll measurements                                            *
   * ------------------------------------------------------------------ */
  let tumbleEnd = 1;
  function measure() {
    const vh = window.innerHeight;
    const chooseTop = chooseEl ? chooseEl.offsetTop : exp.offsetHeight;
    tumbleEnd = Math.max(chooseTop - vh, 1);   // car finishes its spins as the tube section arrives
  }
  measure();

  // Tube-reveal progress from the .oa-choose section's position (0 → 1 → 0)
  function computeReveal() {
    if (!chooseEl) return 0;
    const rect = chooseEl.getBoundingClientRect();
    const vh = window.innerHeight;
    const scrolled = -rect.top;
    const total = rect.height - vh;
    if (total <= 0) return clamp(1 - Math.abs(rect.top) / vh, 0, 1);
    /* Shorter ramps = longer plateau. The old 34%-per-ramp split left only
       ~a third of the section fully revealed, and interactivity is gated on
       the reveal — on phones that read as "sometimes it won't let me spin".
       With ~22% ramps the middle ~56% of a much taller section holds at
       reveal 1, so the spin window more than tripled. */
    const inLen = Math.min(vh * 0.65, total * 0.22);
    const outLen = Math.min(vh * 0.65, total * 0.22);
    const rin = clamp(scrolled / inLen, 0, 1);
    const rout = clamp((scrolled - (total - outLen)) / outLen, 0, 1);
    return smooth(rin) * (1 - smooth(rout));
  }

  /* ------------------------------------------------------------------ *
   * 8 · Interaction (Act B) — drag to spin, hover for the tooltip      *
   * ------------------------------------------------------------------ */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-2, -2);
  let interactive = false;
  let dragAxis = null, dragId = null, lastX = 0, startX = 0, startY = 0, dragging = false;
  let hoverTile = null;
  const cursor = { x: 0, y: 0, tx: 0, ty: 0 };

  function setNdcFromEvent(e) {
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }
  // pick the nearest tile under the cursor, unless the (opaque) car is in front of it
  function pickTile() {
    if (!tileMeshes.length) return null;
    camera.updateMatrixWorld();
    if (tubeGroup) tubeGroup.updateWorldMatrix(false, true);
    raycaster.setFromCamera(ndc, camera);
    // only the tiles you can clearly see are pickable (faded near-camera ghosts are see-through)
    const visible = tileMeshes.filter(function (m) { return m.material.opacity > 0.5; });
    const hits = raycaster.intersectObjects(visible, false);
    if (!hits.length) return null;
    const nearest = hits[0];
    if (model) {
      const hc = raycaster.intersectObject(model, true);
      if (hc.length && hc[0].distance < nearest.distance) return null; // hidden behind the Porsche
    }
    return meshToTile.get(nearest.object) || null;
  }

  function onDown(e) {
    if (!interactive) return;
    startX = lastX = e.clientX; startY = e.clientY;
    dragAxis = null; dragId = e.pointerId; dragging = false;
    setNdcFromEvent(e);
  }
  function onMove(e) {
    cursor.tx = e.clientX; cursor.ty = e.clientY;
    if (!interactive) return;
    setNdcFromEvent(e);
    if (dragId === e.pointerId && dragAxis !== "v" && (e.buttons & 1 || dragging)) {
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (dragAxis === null && Math.hypot(dx, dy) > 6) {
        dragAxis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (dragAxis === "h") { dragging = true; try { mount.setPointerCapture(e.pointerId); } catch (x) {} }
      }
      if (dragAxis === "h") {
        if (e.cancelable) e.preventDefault();
        const step = e.clientX - lastX;
        tubeAngle += step * DRAG_TO_ANGLE;
        tubeSpinVel = step * DRAG_TO_ANGLE * 60;
        lastX = e.clientX;
      }
    }
  }
  function endDrag(e) {
    if (dragId !== null && e && e.pointerId === dragId) {
      try { mount.releasePointerCapture(e.pointerId); } catch (x) {}
    }

    // The ring is spin-only. Taps used to navigate to the tapped car's page,
    // which on touch misfired constantly (pointercancel during a scroll flick
    // read as a tap and sent the visitor to a random car). Rather than keep
    // patching tap heuristics, tiles no longer navigate at all — the tooltip
    // still names the car and shows its price on hover, and the fleet pages
    // remain one click away everywhere else.

    // Touch has no hover. Park the ray off-screen when a touch gesture ends, or
    // ndc keeps pointing at the last touched pixel and the render loop raycasts
    // ~160 tiles plus the whole un-BVH'd GLB every frame, forever — the "one
    // subtle touch and it goes slow" half of the bug. Mouse keeps its hover.
    if (!e || e.pointerType !== "mouse") { ndc.set(-2, -2); hoverTile = null; }

    dragging = false; dragAxis = null; dragId = null;
  }
  mount.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // Single owner of the interactive state, so it can be torn down from outside
  // the render loop. It used to live inline in animate(), which meant that when
  // `running` went false at the outro the loop returned before ever reaching it:
  // the canvas kept .is-interactive (pointer-events:auto, fixed, full viewport,
  // z-index 3) while fading to opacity 0, so an invisible sheet sat over the CTA
  // band and the footer and swallowed every tap. That was the "freeze".
  function setInteractive(next) {
    interactive = next;
    mount.classList.toggle("is-interactive", next);
    document.body.classList.toggle("ring-active", next);
    if (chooseUI) chooseUI.classList.toggle("is-on", next);
    if (cursorEl) cursorEl.classList.toggle("is-on", next);
    if (!next) {
      hoverTile = null;
      ndc.set(-2, -2);
      dragging = false; dragAxis = null; dragId = null;
      if (tooltipEl) tooltipEl.classList.remove("is-on");
      if (cursorEl) cursorEl.classList.remove("is-over");
    }
  }

  /* Sideways wheel / two-finger trackpad swipe spins the cylinder.
     The idle spin keeps running underneath; this just adds momentum.
     Only while the tube actually owns the screen, so we never hijack the
     wheel anywhere else on the page. */
  let lastReveal = 0;
  function onWheel(e) {
    if (lastReveal < 0.35) return;
    // Shift+wheel is how a plain mouse does "horizontal"; some browsers report
    // it as deltaX, others leave it on deltaY — accept either.
    const dx = e.shiftKey && Math.abs(e.deltaX) < 1 ? e.deltaY : e.deltaX;
    if (Math.abs(dx) <= Math.abs(e.deltaY) && !e.shiftKey) return;  // a vertical gesture: let the page scroll
    if (!dx) return;
    e.preventDefault();                       // stop the browser scrolling sideways
    tubeSpinVel = clamp(tubeSpinVel + dx * WHEEL_TO_ANGLE * 60, -3, 3);
  }
  window.addEventListener("wheel", onWheel, { passive: false });

  (function cursorTick() {
    cursor.x = lerp(cursor.x, cursor.tx, 0.2);
    cursor.y = lerp(cursor.y, cursor.ty, 0.2);
    if (cursorEl) cursorEl.style.transform = "translate3d(" + cursor.x + "px," + cursor.y + "px,0) translate(-50%,-50%)";
    if (tooltipEl && hoverTile) tooltipEl.style.transform = "translate3d(" + cursor.tx + "px," + cursor.ty + "px,0) translate(-50%,-150%)";
    requestAnimationFrame(cursorTick);
  })();

  /* ------------------------------------------------------------------ *
   * 9 · Render loop                                                    *
   * ------------------------------------------------------------------ */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    if (!ready || !model) { renderer.render(scene, camera); return; }

    // getDelta() must come FIRST: getElapsedTime() calls it internally, so the
    // reverse order would always report dt ≈ 0. rawDt is kept unclamped to
    // detect a stalled frame; dt is clamped for safe integration.
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    /* A degenerate tumble window (the ring section sitting one viewport
       from the top leaves tumbleEnd at ~1px) would turn p into a step
       function: an 18% scale pop on the first scrolled pixel and a twitch
       every time Lenis decays across scrollY 0–1. Treat anything without
       real runway as "already settled". */
    const p = tumbleEnd > 4 ? clamp(currentScroll / tumbleEnd, 0, 1) : 1;
    const reveal = computeReveal();
    lastReveal = reveal;                 // read by the sideways-wheel handler
    applyScrollDamping(reveal);

    /* -- car: blend tumble pose → settled slow-spin pose by reveal --
       The two poses MUST agree wherever reveal is actually blending, or the lerp
       becomes a whip. They now do, for two reasons:
         · settledY carries the same SPINS term the tumble ends on. It used to be
           omitted, so the blend had to drag the car through |carAngle - 4π| rad —
           two full revolutions at the very least — across the ~477px reveal ramp,
           once on the way in and again on the way out. That was the violent spin.
         · carAngle is added to BOTH poses and only accumulates while the tube owns
           the screen. Adding it to both means the idle spin never has to unwind at
           the exit; gating it on reveal means it can't drift while the page sits
           idle. It used to be a free-running clock from model load, which is why
           the whip's size depended on how long you'd been on the page.
       Since p is pinned at 1 for the whole reveal window (reveal only leaves 0
       past chooseTop, and tumbleEnd is a viewport short of it), the two poses are
       algebraically identical there and the blend has nothing left to travel. */
    const rest = 1 - Math.min(p * 8, 1);
    carAngle += CAR_SPIN * dt * reveal;
    let ry = BASE_YAW + p * SPINS + carAngle + Math.sin(t * 0.35) * 0.05 * rest;
    let rx = BASE_TILT + (1 - Math.cos(p * Math.PI * 2)) * 0.28;
    let rz = BASE_ROLL;
    let sc = popState.v * (1 + p * 0.18);

    const settledY = BASE_YAW + SPINS + carAngle;       // slow, smooth, independent of drag
    const settledX = BASE_TILT * 0.55;
    const settledSc = popState.v * 1.5;                 // clear centrepiece inside the tube
    ry = lerp(ry, settledY, reveal);
    rx = lerp(rx, settledX, reveal);
    rz = lerp(rz, 0, reveal);
    sc = lerp(sc, settledSc, reveal);

    /* Ease the rendered yaw toward that pose rather than snapping to it, with the
       rad/s ceiling on top. The error is wrapped into (-π, π] first, because yaw
       is modular: a jump that changes p by 1 moves the pose by exactly 4π, which
       is the SAME orientation. Followed unwrapped, a Home key, a find-in-page hit
       or a back-restore would spin the car two full turns to arrive where it
       already was. Wrapping is only safe because the ceiling clears normal
       scrolling — with a lower one, honest approach lag could exceed π and the
       wrap would reverse the car mid-reveal.
       Deliberately no stalled-frame snap: ry is constant across both a hidden tab
       and the outro's running=false gate (reveal is 0 and p is 1 in each), so
       carYaw already matches on the way back. Snapping on a merely janky frame
       would instead discard the ceiling at the exact moment a fast scroll needs
       it — a 130 ms hitch at speed lands ~98° in a single frame. */
    if (!carYawSynced) {
      carYaw = ry;
      carYawSynced = true;
    } else {
      const follow = 1 - Math.pow(1 - CAR_YAW_FOLLOW, dt * 60);
      const maxStep = CAR_YAW_MAX_RATE * dt;
      carYaw += clamp(wrapPi(ry - carYaw) * follow, -maxStep, maxStep);
    }

    model.rotation.set(rx, carYaw, rz);
    model.position.y = Math.sin(t * FLOAT_SPEED) * FLOAT_AMP;
    model.scale.setScalar(sc);

    /* -- camera eases back so the whole cylinder fits -- */
    camera.position.z = baseCamZ * (1 + reveal * 0.85);
    camera.position.y = baseCamY + reveal * carMaxDim * 0.05;
    /* Portrait phones: the canvas draws above the page copy, and the hero
       CTAs live in the intro — aiming slightly above the car renders it
       below the buttons. The offset fades with the ring reveal so the
       cylinder still forms dead centre. ONE lookAt, here, before the
       hover raycast below: pickTile() must test against the same camera
       orientation the frame is rendered with, or the tooltip hit-test is
       vertically offset from what's on screen. */
    const aimY = (window.innerWidth < window.innerHeight && carMaxDim)
      ? carMaxDim * 0.24 * (1 - reveal) : 0;
    camera.lookAt(0, aimY, 0);

    /* -- tube: vertical scroll flow (infinite loop) + gentle rotation -- */
    if (tubeGroup) {
      let dScroll = currentScroll - lastTubeScroll;
      lastTubeScroll = currentScroll;

      // A long frame (tab switch, GC pause, a fling that janks) reports a huge
      // delta that would teleport the tube. Treat it as "no movement" rather
      // than trying to apply it.
      if (rawDt > FRAME_GAP_MAX) dScroll = 0;

      // Hard ceiling on how far the tube may travel in a single frame. Without
      // this, one fast flick pushes the target several loops ahead and the tube
      // visibly rockets through the whole sequence.
      const maxStep = loopHeight * MAX_LOOPS_PER_FRAME;
      const step = clamp(dScroll * VSCROLL, -maxStep, maxStep);
      tubeScrollTarget += step;

      // Never let more than half a loop of travel queue up: a big fling would
      // otherwise keep the tube spinning for a second after the scroll stopped.
      tubeScrollTarget = tubeScrollCurrent +
        clamp(tubeScrollTarget - tubeScrollCurrent, -loopHeight * 0.5, loopHeight * 0.5);

      tubeScrollCurrent += (tubeScrollTarget - tubeScrollCurrent) * 0.12;

      // Modulo wrap — survives ANY magnitude. The old if/else-if subtracted at
      // most one loop per frame, so a fast scroll left the tube far outside the
      // valid range and the whole cylinder jumped off-screen. Shift target by
      // the same amount so their difference (the easing) is preserved.
      const wrapped = tubeScrollCurrent - loopHeight * Math.floor((tubeScrollCurrent + loopHeight * 0.5) / loopHeight);
      tubeScrollTarget += wrapped - tubeScrollCurrent;
      tubeScrollCurrent = wrapped;

      tubeGroup.position.y = -tubeScrollCurrent;

      // frame-rate independent decay (was tied to a fixed 60fps step)
      tubeSpinVel *= Math.pow(0.94, dt * 60);
      tubeSpinVel = clamp(tubeSpinVel, -3, 3);
      tubeAngle += (BASE_SPIN + tubeSpinVel) * dt;
      for (let r = 0; r < rowGroups.length; r++) {
        rowGroups[r].rotation.y = tubeAngle * rowSpeed[rowGroups[r].userData.baseRow];
      }

      const op = smooth(clamp(reveal * 1.15, 0, 1));
      const nearStart = tubeRadius * 0.5, nearSpan = tubeRadius * 0.65;
      for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i], m = tile.mesh;
        // analytic world-Z (tube only translates in Y; rows rotate about Y)
        const ra = tubeAngle * rowSpeed[tile.baseRow];
        const wz = -tile.lx * Math.sin(ra) + tile.lz * Math.cos(ra);
        // fade the tiles closest to the camera so they never fully hide the Porsche
        const near = clamp((wz - nearStart) / nearSpan, 0, 1);
        const o = op * (1 - near * 0.85);
        m.visible = o > 0.02;
        m.material.opacity = o;
      }
    }

    /* -- interactive state + hover -- */
    /* 0.55, not 0.72: the ring is clearly formed well before full reveal,
       and every frame above the threshold is a frame the visitor can spin.
       Earlier engagement is what makes the cylinder feel responsive on
       phones instead of refusing the gesture near its edges. */
    const wantInteractive = reveal > 0.55;
    if (wantInteractive !== interactive) setInteractive(wantInteractive);

    if (interactive && !dragging) {
      const t2 = pickTile();
      if (t2 !== hoverTile) {
        hoverTile = t2;
        if (tooltipEl) {
          if (t2) {
            const en = document.documentElement.lang === "en";
            const px = t2.price
              ? '<span class="tt-px">' + String(t2.price).replace(/\B(?=(\d{3})+(?!\d))/g, en ? "," : ".") + " €" + (t2.unit || "/d") + "</span>"
              : '<span class="tt-px">' + (en ? "On request" : "Consúltanos") + "</span>";
            tooltipEl.innerHTML = t2.name + px;
            tooltipEl.classList.add("is-on");
          } else {
            tooltipEl.classList.remove("is-on");
          }
        }
        if (cursorEl) cursorEl.classList.toggle("is-over", !!t2);
      }
    } else if (dragging && tooltipEl) {
      tooltipEl.classList.remove("is-on"); hoverTile = null;
      if (cursorEl) cursorEl.classList.remove("is-over");
    }

    renderer.render(scene, camera);
  }

  /* ------------------------------------------------------------------ *
   * 10 · Resize + refresh                                             *
   * ------------------------------------------------------------------ */
  // Don't let ScrollTrigger re-measure on the mobile URL-bar show/hide either.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // On phones, scrolling shows/hides the URL bar, which fires `resize` over and
  // over with an unchanged WIDTH. The old handler ran the full path on every one
  // of those: reallocate the WebGL back buffer at DPR 2, reframe, re-measure and
  // force a synchronous ScrollTrigger.refresh(). That is the jank/freeze, and the
  // repeated buffer churn is the usual way to lose the GL context outright.
  //
  // So: debounce, and on a coarse pointer ignore height-only changes. A real
  // rotation or window resize always changes the width, and a height change with
  // the same width on touch is only ever browser chrome.
  var lastW = window.innerWidth, lastH = window.innerHeight, resizeTimer = null;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  function applyResize() {
    resizeTimer = null;
    var w = window.innerWidth, h = window.innerHeight;
    lastW = w; lastH = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    frameCamera();
    if (carMaxDim && loopHeight) VSCROLL = loopHeight / (h * 0.9);
    measure();
    ScrollTrigger.refresh();
  }

  window.addEventListener("resize", function () {
    var w = window.innerWidth, h = window.innerHeight;
    if (coarse && w === lastW && h !== lastH) { lastH = h; return; }  // URL bar only
    if (w === lastW && h === lastH) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyResize, 180);
  });

  // A lost context leaves a permanently blank canvas with no way back. Stop the
  // loop, show the still fallback, and rebuild when the GPU hands the context
  // back rather than stranding the visitor on an empty dark screen.
  const canvasEl = renderer.domElement;
  canvasEl.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    running = false;
    setInteractive(false);
    document.body.classList.remove("car-loaded");
    mount.classList.remove("is-live");
  }, false);
  canvasEl.addEventListener("webglcontextrestored", function () {
    try {
      renderer.setSize(window.innerWidth, window.innerHeight);
      frameCamera();
      if (ready) { document.body.classList.add("car-loaded"); mount.classList.add("is-live"); running = true; }
    } catch (x) { /* stay on the fallback */ }
  }, false);

  window.addEventListener("load", function () { measure(); ScrollTrigger.refresh(); });
})();
