/* =====================================================================
   SERRES DRIVE — how.js
   La película de /como-funciona: cuatro escenas que avanzan con el scroll.

   Mismo vocabulario que la portada (GSAP + ScrollTrigger + Lenis, por CDN)
   y el mismo contrato que featured.js: el CSS pinta por defecto el
   fotograma FINAL de cada escena, quieto y completo; este archivo, y solo
   si hay GSAP, no hay prefers-reduced-motion y la pantalla tiene altura
   para una escena, añade .film-on a #film, estira cada escena con su pista
   de scroll y convierte el progreso de ScrollTrigger en la animación. El
   escenario se pega con position:sticky (CSS), no con pin de
   ScrollTrigger: menos piezas móviles con Lenis.

   La condición va en gsap.matchMedia, que es VIVA: si el usuario gira el
   móvil a apaisado, amplía al 400 % o activa reduced-motion, GSAP revierte
   los tweens y triggers, cleanup() quita las clases y la página vuelve a
   ser cuatro bloques quietos y completos.

   Escenas (data-kind en cada .scene):
     pick    · desfile de la flota, termina con un coche elegido
     book    · conversación de WhatsApp que se teclea sola
     deliver · mapa del área metropolitana con la ruta y el pin
     drive   · el coche arranca y sale de plano

   Cada escena devuelve un timeline de duración 1 con las posiciones en
   fracciones; ScrollTrigger lo frota (scrub) contra el recorrido de la
   sección. Todo lo discreto (texto tecleado, estado «escribiendo…», la
   aguja) sale de un objeto de estado que se pinta en onUpdate, para que
   ir hacia atrás con el scroll deshaga exactamente lo que hizo ir hacia
   delante.

   No carga ningún asset por su cuenta: las fotos y el mapa vienen en el
   HTML con su ?v= del generador, así que no hay rutas relativas que se
   rompan en /en/ o /ru/.
   ===================================================================== */
(function () {
  "use strict";

  var film = document.getElementById("film");
  if (!film) return;

  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---- 0 · el rótulo del mapa se ajusta a su texto real -------------- *
   * El generador estima el ancho del globo por número de letras; aquí se
   * mide de verdad (getBBox). Corre siempre, con o sin película, y otra
   * vez cuando terminan de cargar las fuentes, que cambian la medida.    */
  function fitHereLabel() {
    var here = document.getElementById("howHere");
    if (!here || !here.querySelector) return;
    try {
      var t = here.querySelector("text"), r = here.querySelector("rect");
      var w = Math.ceil(t.getBBox().width + 30);
      r.setAttribute("x", String(-w / 2));
      r.setAttribute("width", String(w));
      var price = here.querySelector(".hm-price");
      if (price) {
        var pt = price.querySelector("text"), pr = price.querySelector("rect");
        var pw = Math.ceil(pt.getBBox().width + 24);
        pr.setAttribute("width", String(pw));
        pt.setAttribute("x", String(pw / 2));
        price.setAttribute("transform", "translate(" + (w / 2 + 8) + " -7)");
      }
    } catch (e) { /* un getBBox sobre algo no pintado tira; se queda la estimación */ }
  }
  fitHereLabel();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHereLabel);

  /* Sin GSAP o con reduced-motion: la película se queda en su fotograma
     final, que es exactamente lo que pinta el CSS. */
  if (reduce || !gsap || !ST) return;

  /* ---- 1 · Lenis → ScrollTrigger (igual que en experience.js) ------- */
  /* Se crea una sola vez, fuera del matchMedia: el scroll suave no depende
     de que quepa la película, y crearlo dos veces duplicaría el raf. */
  var lenis = null;
  if (window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.1 });
      window.lenis = lenis;
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
      /* Con el menú móvil abierto, site.js bloquea el overflow del body;
         Lenis seguiría deslizando la página por debajo. Se para y se
         reanuda leyendo el aria-expanded del botón, que es la verdad.
         data-lenis-prevent en el propio menú: Lenis parado cancela el
         wheel/touch de todo lo que no lo lleve, y el menú (5 enlaces +
         WhatsApp + 5 idiomas) tiene que poder desplazarse en un móvil bajo. */
      var mb = document.getElementById("menuBtn");
      var menu = document.getElementById("mobileMenu");
      if (menu) menu.setAttribute("data-lenis-prevent", "");
      if (mb && window.MutationObserver) {
        new MutationObserver(function () {
          if (mb.getAttribute("aria-expanded") === "true") lenis.stop(); else lenis.start();
        }).observe(mb, { attributes: true, attributeFilter: ["aria-expanded"] });
      }
    } catch (e) { lenis = null; }
  }

  /* ---- 2 · utilidades ------------------------------------------------ */
  var all = function (root, sel) { return [].slice.call(root.querySelectorAll(sel)); };

  /* ---- 3 · ESCENA 01 · el desfile ----------------------------------- */
  function buildPick(sec) {
    var stage = sec.querySelector(".stage-core");
    var rowA = sec.querySelector(".pick-row--a");
    var rowB = sec.querySelector(".pick-row--b");
    var chosen = sec.querySelector(".pick-tile[data-chosen]");
    /* Se atenúa la FOTO de los no elegidos, no la ficha entera: bajar la
       opacidad del texto lo dejaba por debajo de 4,5:1. */
    var otherShots = all(sec, ".pick-tile:not([data-chosen]) .pick-shot");
    var W = function () { return stage.clientWidth; };
    var tl = gsap.timeline({ defaults: { ease: "none" } });

    /* Fila delantera: entra por la derecha y acaba con el elegido justo en
       el centro del escenario. Los valores son funciones para que un
       cambio de tamaño (invalidateOnRefresh) los recalcule. */
    if (rowA && chosen) {
      tl.fromTo(rowA,
        { x: function () { return W() * 0.62; } },
        { x: function () { return -(chosen.offsetLeft + chosen.offsetWidth / 2 - W() / 2); }, duration: 0.84 }, 0);
    }
    /* Fila trasera: el carril contrario, más lento. */
    if (rowB) {
      tl.fromTo(rowB,
        { x: function () { return -(rowB.scrollWidth - W()) - 30; } },
        { x: function () { return -(rowB.scrollWidth - W()) * 0.3; }, duration: 0.84 }, 0);
    }
    /* La elección: el elegido se marca, las otras fotos bajan. */
    if (chosen) tl.to(chosen, { "--pick": 1, scale: 1.05, duration: 0.1, ease: "power2.out" }, 0.86);
    if (otherShots.length) tl.to(otherShots, { opacity: 0.45, duration: 0.1 }, 0.86);
    tl.to({}, { duration: 0.04 }, 0.96);
    return tl;
  }

  /* ---- 4 · ESCENA 02 · la conversación ------------------------------ */
  function buildBook(sec) {
    var phone = sec.querySelector(".phone");
    var msgs = all(sec, ".wa-msg");
    var typings = all(sec, ".wa-typing");
    var status = sec.querySelector(".wa-status");
    var draft = sec.querySelector(".wa-draft");
    var online = status ? status.getAttribute("data-online") || "" : "";
    var typingLabel = status ? status.getAttribute("data-typing") || "" : "";
    /* Los textos del cliente se leen del propio globo: así la escena está
       en el idioma de la página sin que este archivo sepa de idiomas. */
    var outs = msgs.filter(function (m) { return m.classList.contains("wa-msg--out"); });
    var texts = outs.map(function (m) {
      var t = m.querySelector(".wa-typed") || m.querySelector(".wa-text");
      return t ? t.textContent : "";
    });
    var s = { t0: 0, t1: 0, sent0: 0, sent1: 0, typing: 0 };

    function render() {
      if (draft) {
        var txt = "";
        if (!s.sent0) txt = (texts[0] || "").slice(0, Math.round(s.t0));
        else if (!s.sent1) txt = (texts[1] || "").slice(0, Math.round(s.t1));
        if (draft.textContent !== txt) {
          draft.textContent = txt;
          /* Como en WhatsApp: el campo se desplaza para que el cursor siga a
             la vista. overflow:hidden se puede desplazar desde script; en ruso
             o francés el mensaje mide el doble que la barra. */
          draft.scrollLeft = draft.scrollWidth;
        }
      }
      if (status) {
        var label = s.typing ? typingLabel : online;
        if (status.textContent !== label) status.textContent = label;
        status.classList.toggle("is-typing", !!s.typing);
      }
    }
    var tl = gsap.timeline({ defaults: { ease: "none" }, onUpdate: render });

    function show(el, at) {
      if (!el) return;
      tl.set(el, { display: "flex" }, at);
      tl.fromTo(el, { opacity: 0, y: 10, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.035, ease: "power2.out" }, at);
    }
    function typing(el, from, to) {
      if (el) tl.set(el, { display: "flex" }, from);
      tl.to(s, { typing: 1, duration: 0.001 }, from);
      if (el) tl.set(el, { display: "none" }, to);
      tl.to(s, { typing: 0, duration: 0.001 }, to);
    }

    if (phone) tl.fromTo(phone, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.07, ease: "power2.out" }, 0);
    /* 1 · el cliente teclea el primer mensaje en la barra de redacción */
    tl.to(s, { t0: (texts[0] || "").length, duration: 0.24, snap: "t0" }, 0.06);
    /* 2 · lo envía: la barra se vacía y el globo (con la tarjeta del coche) aparece */
    tl.to(s, { sent0: 1, duration: 0.001 }, 0.31);
    show(msgs[0], 0.31);
    /* 3 · Serres «escribiendo…» y contesta */
    typing(typings[0], 0.36, 0.46);
    show(msgs[1], 0.46);
    /* 4 · el cliente responde con las fechas */
    tl.to(s, { t1: (texts[1] || "").length, duration: 0.14, snap: "t1" }, 0.53);
    tl.to(s, { sent1: 1, duration: 0.001 }, 0.68);
    show(msgs[2], 0.68);
    /* 5 · Serres confirma */
    typing(typings[1], 0.72, 0.83);
    show(msgs[3], 0.83);
    tl.to({}, { duration: 0.05 }, 0.95);
    return tl;
  }

  /* ---- 5 · ESCENA 03 · el mapa -------------------------------------- */
  function buildDeliver(sec) {
    var svg = sec.querySelector("svg.hm");
    var route = sec.querySelector("#howRoute");
    var car = sec.querySelector("#howCar");
    var pin = sec.querySelector("#howPin");
    var ripple = sec.querySelector("#howRipple");
    var here = sec.querySelector("#howHere");
    var shadow = sec.querySelector(".hm-pin-shadow");
    var towns = all(sec, ".hm-town, .hm-area, .hm-area-label, .hm-airport");
    var tl = gsap.timeline({ defaults: { ease: "none" } });
    if (!svg || !route) return tl;

    var len = 0;
    try { len = route.getTotalLength(); } catch (e) { len = 0; }
    var s = { t: 0 };
    function place() {
      if (!car || !len) return;
      var p = route.getPointAtLength(s.t * len);
      car.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")");
    }
    tl.eventCallback("onUpdate", place);

    tl.fromTo(svg, { opacity: 0, scale: 1.05, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.1, ease: "power2.out" }, 0);
    if (towns.length) tl.fromTo(towns, { opacity: 0 }, { opacity: 1, duration: 0.1, stagger: 0.008 }, 0.04);
    /* la ruta se traza y el coche la recorre */
    tl.fromTo(route, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, ease: "power1.inOut" }, 0.12);
    if (car) tl.fromTo(car, { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.1);
    tl.to(s, { t: 1, duration: 0.5, ease: "power1.inOut" }, 0.12);
    if (car) tl.to(car, { opacity: 0, duration: 0.04 }, 0.63);
    /* el pin cae y rebota; la onda; el rótulo */
    if (pin) tl.fromTo(pin, { y: -70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.1, ease: "bounce.out" }, 0.62);
    if (shadow) tl.fromTo(shadow, { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.1 }, 0.62);
    if (ripple) tl.fromTo(ripple, { attr: { r: 8 }, opacity: 0.9 }, { attr: { r: 72 }, opacity: 0, duration: 0.16, ease: "power1.out" }, 0.7);
    if (here) tl.fromTo(here, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.08, ease: "power2.out" }, 0.76);
    tl.to({}, { duration: 0.1 }, 0.9);
    return tl;
  }

  /* ---- 6 · ESCENA 04 · arranca y se va ------------------------------ */
  function buildDrive(sec) {
    var car = sec.querySelector(".drive-car");
    var ghosts = all(sec, ".drive-ghost");
    var needle = sec.querySelector(".gauge .needle");
    var start = sec.querySelector(".drive-start");
    var dash = sec.querySelector(".drive-road .dash");
    var lines = sec.querySelector(".drive-lines");
    var speedEl = sec.querySelector(".drive-speed b");
    var s = { rpm: 0, speed: 0 };
    function render() {
      /* 0 rpm = -118°, 8.000 rpm = +118°: 29,5° por cada mil */
      if (needle) needle.style.transform = "rotate(" + (-118 + s.rpm * 29.5).toFixed(1) + "deg)";
      if (speedEl) {
        var v = String(Math.round(s.speed));
        if (speedEl.textContent !== v) speedEl.textContent = v;
      }
    }
    var tl = gsap.timeline({ defaults: { ease: "none" }, onUpdate: render });
    if (!car) return tl;

    /* x:0/y:0 explícitos: el CSS centra el coche con translate(-50%,-50%) y
       GSAP, al leer esa matriz, solo la reconoce como xPercent:-50 cuando el
       ancho es entero; con anchos fraccionarios (375, 412, 1280 px…) la
       guardaba como píxeles y la SUMABA al xPercent, dejando el coche medio
       fuera del escenario. how.css además quita ese translate con .film-on. */
    tl.fromTo(car, { opacity: 0, scale: 0.96, x: 0, y: 0, xPercent: -50, yPercent: -50 },
      { opacity: 1, scale: 1, x: 0, y: 0, xPercent: -50, yPercent: -50, duration: 0.08, ease: "power2.out" }, 0);
    /* contacto: se pulsa el botón y se enciende */
    if (start) {
      tl.to(start, { scale: 0.9, duration: 0.03, ease: "power2.in" }, 0.12);
      tl.to(start, { scale: 1, "--lit": 1, duration: 0.04, ease: "power2.out" }, 0.15);
    }
    /* la aguja sube con el arranque y baja al ralentí; el coche vibra */
    tl.to(s, { rpm: 3.2, duration: 0.1, ease: "power2.out" }, 0.16);
    tl.to(s, { rpm: 0.9, duration: 0.12, ease: "power2.inOut" }, 0.26);
    tl.to(car, { y: 1.6, duration: 0.012, repeat: 15, yoyo: true }, 0.18);
    /* acelera y se va hacia el horizonte: el coche (visto desde arriba)
       encoge hacia el punto de fuga de la carretera, con estelas detrás y
       trazos de velocidad que bajan por los arcenes. */
    var stage = sec.querySelector(".drive");
    /* Distancia vertical del centro del coche al punto de fuga. El SVG de la
       carretera va con preserveAspectRatio "xMidYMax slice": escala k =
       max(w/1000, h/600), anclado abajo; el horizonte está en y=330 de 600,
       o sea a 270·k del borde inferior. El centro del coche coincide con su
       offsetTop (top:74 % + translate(-50%,-50%)). Va como función para que
       invalidateOnRefresh la recalcule al redimensionar. */
    function toVanish() {
      if (!stage) return -260;
      var h = stage.clientHeight, w = stage.clientWidth;
      var k = Math.max(w / 1000, h / 600);
      return (h - 270 * k) - car.offsetTop;
    }
    tl.to(s, { rpm: 6.4, duration: 0.3, ease: "power2.in" }, 0.48);
    tl.to(s, { speed: 120, duration: 0.34, ease: "power2.in" }, 0.5);
    tl.to(car, { y: toVanish, scale: 0.05, duration: 0.36, ease: "power2.in" }, 0.5);
    ghosts.forEach(function (g, i) {
      tl.fromTo(g, { opacity: 0, yPercent: 0, scale: 1 }, { opacity: 0.34 - i * 0.09, yPercent: (i + 1) * 9, scale: 1 + (i + 1) * 0.05, duration: 0.2, ease: "power2.in" }, 0.56);
      tl.to(g, { opacity: 0, duration: 0.1 }, 0.78);
    });
    if (lines) {
      tl.fromTo(lines, { opacity: 0, y: -40 }, { opacity: 1, y: 260, duration: 0.3, ease: "power2.in" }, 0.56);
      tl.to(lines, { opacity: 0, duration: 0.08 }, 0.86);
    }
    /* las marcas del carril corren hacia la cámara: la carretera pasa bajo el coche */
    if (dash) tl.fromTo(dash, { strokeDashoffset: 0 }, { strokeDashoffset: 680, duration: 0.5, ease: "power2.in" }, 0.5);
    /* se ha ido: la aguja cae, el marcador se apaga */
    tl.to(s, { rpm: 0, duration: 0.08 }, 0.86);
    if (speedEl) tl.to(speedEl, { opacity: 0.35, duration: 0.06 }, 0.9);
    tl.to({}, { duration: 0.05 }, 0.95);
    return tl;
  }

  /* ---- 7 · montaje --------------------------------------------------- */
  var scenes = all(film, ".scene");
  var rail = document.querySelector(".film-rail");
  var railItems = rail ? [].slice.call(rail.children) : [];
  function setRail(i) {
    for (var k = 0; k < railItems.length; k++) railItems[k].classList.toggle("is-on", k === i);
  }
  var builders = { pick: buildPick, book: buildBook, deliver: buildDeliver, drive: buildDrive };

  /* invalidateOnRefresh borra los valores de partida de cada tween, y un
     fromTo no vuelve a aplicar su "from" hasta que la aguja llega a él: el
     pin de la escena 3 se veía puesto ANTES de caer. Un pase completo ida
     y vuelta deja la escena en su fotograma 0. */
  function prime(tl) { try { tl.progress(1, true); tl.progress(0, true); } catch (e) {} }

  /* Lo que prime() y los render() escriben fuera de GSAP (texto tecleado,
     estado, aguja, marcador) se limpia a mano al revertir; los estilos que
     puso GSAP los restaura GSAP. */
  function resetDom() {
    all(film, ".wa-draft").forEach(function (d) { d.textContent = ""; });
    all(film, ".wa-status").forEach(function (st) { st.textContent = st.getAttribute("data-online") || ""; st.classList.remove("is-typing"); });
    all(film, ".gauge .needle").forEach(function (n) { n.style.transform = ""; });
    all(film, ".drive-speed b").forEach(function (b) { b.textContent = "0"; });
    all(film, "#howCar").forEach(function (c) { c.removeAttribute("style"); });
    setRail(-1);
    if (rail) rail.classList.remove("is-on");
  }

  function start() {
    var built = [];
    film.classList.add("film-on");
    document.body.classList.add("how-film");
    try {
      scenes.forEach(function (sec, i) {
        var kind = sec.getAttribute("data-kind");
        var tl = builders[kind] ? builders[kind](sec) : gsap.timeline();
        tl.pause();
        var st = ST.create({
          trigger: sec,
          start: "top top",
          end: "bottom bottom",
          animation: tl,
          /* Con Lenis delante el scroll ya llega suavizado: un scrub largo
             encima dejaba la película moviéndose más de un segundo después
             de soltar la rueda. Sin Lenis (scroll nativo) sí conviene. */
          scrub: lenis ? 0.2 : 0.65,
          invalidateOnRefresh: true,
          onToggle: function (self) { if (self.isActive) setRail(i); },
          /* Tras el pase de prime(), la escena vuelve al punto que marca su
             trigger: ScrollTrigger solo re-conduce la animación si el
             progreso cambió, así que una escena ya pasada (progreso 1) se
             quedaba en el fotograma 0 tras girar el móvil o redimensionar y
             se veía avanzar al volver a subir. Con eventos, para que render()
             repinte el texto tecleado, la aguja y el marcador. */
          onRefresh: function (self) {
            prime(self.animation);
            self.animation.progress(self.progress);
          }
        });
        prime(tl);
        built.push({ tl: tl, st: st });
      });
      if (rail) {
        ST.create({
          trigger: film, start: "top 25%", end: "bottom 60%",
          onToggle: function (self) { rail.classList.toggle("is-on", self.isActive); }
        });
      }
    } catch (err) {
      /* Si algo revienta a medias (una versión de GSAP sin lo que se le
         pide, un id que no está…), la película vuelve a ser cuatro bloques
         quietos y completos, no cuatro escenarios a medio pintar. */
      built.forEach(function (b) { try { b.st.kill(); b.tl.kill(); } catch (e) {} });
      film.classList.remove("film-on");
      document.body.classList.remove("how-film");
      all(film, "[style]").forEach(function (el) { el.removeAttribute("style"); });
      resetDom();
      if (window.console && console.error) console.error("[how] la película no arranca; se queda quieta:", err);
      return null;
    }
    return function cleanup() {
      film.classList.remove("film-on");
      document.body.classList.remove("how-film");
      resetDom();
    };
  }

  /* La película solo cabe si hay una pantalla entera para cada escena: en
     un móvil apaisado (844×390) o al 400 % de zoom (320×256) el escenario
     medía 0 px y el texto se salía del pin. Por debajo de 560 px de alto,
     o con reduced-motion activado sobre la marcha, se revierte a los
     fotogramas quietos. gsap.matchMedia rehace todo al volver a caber. */
  if (gsap.matchMedia) {
    gsap.matchMedia().add("(prefers-reduced-motion: no-preference) and (min-height: 560px)", function () {
      var cleanup = start();
      return function () { if (cleanup) cleanup(); };
    });
  } else {
    /* GSAP anterior a 3.11: sin matchMedia, la condición se evalúa una vez. */
    var tall = true;
    try { tall = window.matchMedia("(min-height: 560px)").matches; } catch (e) {}
    if (tall) start();
  }
})();
