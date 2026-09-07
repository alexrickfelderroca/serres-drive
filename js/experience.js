/* =====================================================================
   SERRES DRIVE — experience.js
   Hero de la portada: el GT3 RS en un lienzo three.js FIJO, detras del
   titular. Flota y gira sobre si mismo mientras haces scroll por el hero;
   cuando la seccion de marcas (.brands) llega a media pantalla, aparca
   (se funde) y la pagina sigue en flujo normal.

   Hasta el 07-09-2026 habia un segundo acto —el anillo 3D de fotos de la
   flota ("Toda la flota, en movimiento")— y el carrusel "Destacados" entre
   medias. Los dos se quitaron a peticion del propietario; lo que queda es
   solo el primer acto, con su misma maquinaria (yaw suavizado con tope de
   velocidad, resize con debounce, recuperacion del contexto WebGL).

   three.js (modulo) + GSAP ScrollTrigger + Lenis (globales).

   Degradacion:
     · sin JS          → el modulo no carga; el hero es el titular sobre el
                         fondo del taller (css/home.css), sin coche.
     · sin WebGL       → se detecta abajo; igual.
     · reduced-motion  → nada de WebGL ni de scroll suave; igual.
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

  /* La seccion sobre la que el coche termina de girar y aparca. Si algun
     dia no esta, el final del <main> hace de tope. */
  const parkEl = document.querySelector(".brands");

  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const smooth = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const wrapPi = function (a) { return a - Math.PI * 2 * Math.round(a / (Math.PI * 2)); };

  /* ------------------------------------------------------------------ *
   * 1 · Smooth scroll (Lenis) → GSAP / ScrollTrigger                   *
   * ------------------------------------------------------------------ */
  const lenis = new Lenis({ lerp: 0.1 });
  // Published so other modules can cooperate with smooth scroll — the mobile
  // menu stops it while open, otherwise the page keeps gliding underneath.
  window.lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  /* Seeded, not left at 0: history scroll restoration lands before this deferred
     module runs and fires no scroll event of its own, so an unseeded mirror parks
     the car at the p=0 pose on every mid-page reload. */
  let currentScroll = window.scrollY || window.pageYOffset || 0;
  lenis.on("scroll", function (e) { currentScroll = e.scroll; });
  window.addEventListener("scroll", function () {
    currentScroll = window.scrollY || window.pageYOffset || currentScroll;
  }, { passive: true });

  /* ------------------------------------------------------------------ *
   * 2 · three.js scene (transparent — the CSS backdrop shows through)  *
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
  /* La luz principal cae desde arriba, fria, como el techo de LED del
     fondo; el rim azulado recorta la silueta contra el negro. */
  const key = new THREE.DirectionalLight(0xf2f6ff, 3.2); key.position.set(3, 10, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xcdd8ee, 2.2); rim.position.set(-7, 3, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xbfd0ff, 0.7); fill.position.set(0, 2, 7); scene.add(fill);

  /* ------------------------------------------------------------------ *
   * 3 · Render during load                                            *
   * ------------------------------------------------------------------ */
  let basicRAF = 0;
  function basicAnimate() { renderer.render(scene, camera); basicRAF = requestAnimationFrame(basicAnimate); }
  basicAnimate();

  /* ------------------------------------------------------------------ *
   * 4 · Load the GT3 RS                                                *
   * ------------------------------------------------------------------ */
  const BASE_YAW = -0.6, BASE_TILT = 0.20, BASE_ROLL = 0.05;
  const FLOAT_AMP = 0.09, FLOAT_SPEED = 1.35;
  /* Una vuelta entera a lo largo del hero. Antes eran dos (4π) porque el
     recorrido llegaba hasta el anillo; ahora el coche aparca en cuanto la
     seccion de marcas llega a media pantalla, y con dos vueltas en ese
     tramo giraba como una peonza. */
  const SPINS = Math.PI * 2;
  let model = null, ready = false, running = true, carMaxDim = 0;
  let baseCamY = 0, baseCamZ = 6;
  const popState = { v: 0 };

  function frameCamera() {
    if (!carMaxDim) return;
    const a = window.innerWidth / window.innerHeight;
    // ~8% closer than the original 3.2 / 2.55 / 2.05 so the car reads a
    // touch larger behind the headline on every breakpoint.
    const f = a < 0.8 ? 2.95 : a < 1.3 ? 2.36 : 1.9;
    baseCamY = carMaxDim * 0.16;
    baseCamZ = carMaxDim * f;
    camera.position.set(0, baseCamY, baseCamZ);
    camera.lookAt(0, 0, 0);
  }

  const draco = new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  const loader = new GLTFLoader().setDRACOLoader(draco);

  loader.load("/assets/models/gt3.glb", function (gltf) {
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

    model.scale.set(0, 0, 0);
    gsap.to(popState, { v: 1, duration: 1.1, ease: "power2.out" });

    ready = true;
    /* NOT unconditional. The GLB takes seconds on a phone network, and by the
       time it lands the visitor may already be past the brands section
       (running false). An unconditional add would paint the car over the
       tiles until the next trigger edge. */
    if (running) mount.classList.add("is-live");
    document.body.classList.add("car-loaded");

    cancelAnimationFrame(basicRAF);
    animate();
  }, undefined, function (err) {
    console.warn("[Serres] GT3 model failed:", err);
    // The Draco decoder is a third-party CDN fetch, so this path is reachable
    // on any flaky connection. Stop the placeholder loop and drop the canvas:
    // the hero stays as the titular over the workshop backdrop.
    running = false;
    if (basicRAF) cancelAnimationFrame(basicRAF);
    document.body.classList.remove("sd-home");
    mount.remove();
  });

  /* ------------------------------------------------------------------ *
   * 5 · Aparcar: el coche se funde cuando llegan las marcas            *
   * ------------------------------------------------------------------ */
  ScrollTrigger.create({
    trigger: parkEl || exp, start: parkEl ? "top 52%" : "bottom 52%",
    onEnter: function () { mount.classList.remove("is-live"); running = false; },
    onLeaveBack: function () { if (ready) { mount.classList.add("is-live"); running = true; } }
  });

  /* ------------------------------------------------------------------ *
   * 6 · Scroll measurements                                            *
   * ------------------------------------------------------------------ */
  let tumbleEnd = 1;
  function measure() {
    const vh = window.innerHeight;
    /* La vuelta termina justo donde el coche aparca (el trigger de arriba):
       la seccion de marcas al 52% de la pantalla. */
    const end = parkEl ? parkEl.offsetTop - vh * 0.52 : exp.offsetHeight - vh;
    tumbleEnd = Math.max(end, 1);
  }
  measure();

  /* ------------------------------------------------------------------ *
   * 7 · Render loop                                                    *
   * ------------------------------------------------------------------ */
  /* The car's yaw is never written straight from the scroll: it eases toward
     the scroll-derived pose and may never turn faster than CAR_YAW_MAX_RATE.
     The easing is what stops a fling reading as a blur; the ceiling exists
     only to bound outright discontinuities (a Home key, a back-restore). */
  const CAR_YAW_FOLLOW = 0.18;          // ease toward the pose, per 60fps frame
  const CAR_YAW_MAX_RATE = 18.0;        // rad/s — bounds jumps, not normal scroll
  let carYaw = 0, carYawSynced = false;

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    if (!ready || !model) { renderer.render(scene, camera); return; }

    // getDelta() must come FIRST: getElapsedTime() calls it internally, so the
    // reverse order would always report dt ≈ 0.
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    /* A degenerate runway (brands section sitting one viewport from the top)
       would turn p into a step function; treat anything without real runway
       as "already settled". */
    const p = tumbleEnd > 4 ? clamp(currentScroll / tumbleEnd, 0, 1) : 1;
    const pe = smooth(p);               // arranca y termina la vuelta con suavidad

    const rest = 1 - Math.min(p * 8, 1);
    const ry = BASE_YAW + pe * SPINS + Math.sin(t * 0.35) * 0.05 * rest;
    const rx = BASE_TILT + (1 - Math.cos(pe * Math.PI * 2)) * 0.22;
    const rz = BASE_ROLL;
    const sc = popState.v * (1 + pe * 0.14);

    /* Ease the rendered yaw toward the pose rather than snapping to it, with
       the rad/s ceiling on top. The error is wrapped into (-π, π] first,
       because yaw is modular: a jump that changes p by 1 moves the pose by
       exactly 2π, which is the SAME orientation. */
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

    /* Portrait phones: the hero CTAs live in the intro, right under the
       headline — aiming slightly above the car renders it below the buttons
       instead of behind them. */
    const aimY = (window.innerWidth < window.innerHeight && carMaxDim) ? carMaxDim * 0.34 : 0;
    camera.position.set(0, baseCamY, baseCamZ);
    camera.lookAt(0, aimY, 0);

    renderer.render(scene, camera);
  }

  /* ------------------------------------------------------------------ *
   * 8 · Resize + refresh                                               *
   * ------------------------------------------------------------------ */
  // Don't let ScrollTrigger re-measure on the mobile URL-bar show/hide either.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // On phones, scrolling shows/hides the URL bar, which fires `resize` over and
  // over with an unchanged WIDTH. Running the full path on every one of those
  // (reallocate the WebGL back buffer at DPR 2, reframe, re-measure, force a
  // synchronous ScrollTrigger.refresh()) is jank, and the repeated buffer churn
  // is the usual way to lose the GL context outright. So: debounce, and on a
  // coarse pointer ignore height-only changes.
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
  // loop, show the still backdrop, and rebuild when the GPU hands the context
  // back rather than stranding the visitor on an empty dark screen.
  const canvasEl = renderer.domElement;
  canvasEl.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    running = false;
    document.body.classList.remove("car-loaded");
    mount.classList.remove("is-live");
  }, false);
  canvasEl.addEventListener("webglcontextrestored", function () {
    try {
      renderer.setSize(window.innerWidth, window.innerHeight);
      frameCamera();
      if (ready) {
        document.body.classList.add("car-loaded");
        running = true;
        mount.classList.add("is-live");
      }
    } catch (x) { /* stay on the backdrop */ }
  }, false);

  window.addEventListener("load", function () { measure(); ScrollTrigger.refresh(); });
})();
