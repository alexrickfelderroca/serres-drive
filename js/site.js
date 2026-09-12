/* =====================================================================
   SERRES DRIVE — site behaviour
   One file, no dependencies. It replaces the eleven scripts that drove
   the deleted experiences (three.js tube, GSAP preloader, page
   transitions, drag sliders, marquee, ink menu), so there is no dead JS
   and nothing animates content into view.

   Six jobs:
     1. mobile menu
     2. car gallery (click a thumbnail, swap the main photo)
     3. contact form -> prefilled WhatsApp message, with inline validation
     4. keep gclid / utm_* on every internal link (ETAPA 3)
     5. consentimiento: el aviso de cookies y gtag('consent','update')
     6. eventos y conversiones (TZ-tracking seccion 4)
   ===================================================================== */
(function () {
  'use strict';

  /* ---- 1. mobile menu ------------------------------------------------ */
  var menuBtn = document.getElementById('menuBtn');
  var menu = document.getElementById('mobileMenu');
  if (menuBtn && menu) {
    var setMenu = function (open) {
      menuBtn.setAttribute('aria-expanded', String(open));
      /* Las dos etiquetas vienen en data-* porque cambian con el idioma. */
      menuBtn.setAttribute('aria-label', open ? (menuBtn.dataset.close || 'Close') : (menuBtn.dataset.open || 'Menu'));
      menu.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    });
    // A resize past the breakpoint must not leave the overlay stuck open.
    window.addEventListener('resize', function () {
      /* 1150 es el mismo punto en el que serres.css devuelve el nav de
         escritorio. Si los dos números no coinciden, al ensanchar la ventana
         el menú se queda abierto tapando la página. */
      if (window.innerWidth > 1150 && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  }

  /* ---- 2. car gallery ------------------------------------------------- */
  var thumbs = document.querySelector('.thumbs');
  var mainImg = document.getElementById('gMainImg');
  var mainWebp = document.getElementById('gMainWebp');
  if (thumbs && mainImg) {
    thumbs.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || !btn.dataset.jpg) return;
      mainImg.src = btn.dataset.jpg;
      if (mainWebp) mainWebp.srcset = btn.dataset.webp;
      Array.prototype.forEach.call(thumbs.querySelectorAll('button'), function (b) {
        b.removeAttribute('aria-current');
      });
      btn.setAttribute('aria-current', 'true');
    });
  }

  /* ---- 4b. la ciudad del titular, rotando ----------------------------- */
  /* Barcelona · Marbella · Ibiza · Madrid. El HTML se queda SIEMPRE con la
     primera, que es la que lee Google y la que coincide con el h1 de
     seo-meta: esto es un adorno visual encima, no la fuente del titular.

     Sin JS, con prefers-reduced-motion o con una sola ciudad en la lista no
     pasa nada y el titular se lee completo igual.

     Sin aria-live a proposito: es parte del H1, y un lector de pantalla lo
     lee una vez al llegar. Anunciar un cambio de ciudad cada cuatro
     segundos seria ruido, no informacion. */
  var geoWrap = document.querySelector('.geo-flip');
  var geo = geoWrap && geoWrap.querySelector('.geo-city');
  if (geo && !window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
    var ciudades = [];
    try { ciudades = JSON.parse(geoWrap.getAttribute('data-cities') || '[]'); } catch (e) {}
    if (ciudades.length > 1) {
      /* Reserva el ancho de la ciudad mas larga para que el titular no baile
         al cambiar de palabra: se mide una vez, con la fuente ya cargada. */
      var fijarAncho = function () {
        var previo = geo.style.getPropertyValue('--geo-city'), max = 0;
        geo.style.width = 'auto';
        for (var i = 0; i < ciudades.length; i++) {
          geo.style.setProperty('--geo-city', JSON.stringify(ciudades[i]));
          max = Math.max(max, geo.getBoundingClientRect().width);
        }
        geo.style.setProperty('--geo-city', previo);
        geo.style.width = Math.ceil(max) + 'px';
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fijarAncho);
      else fijarAncho();
      window.addEventListener('resize', function () {
        clearTimeout(geo._t); geo._t = setTimeout(fijarAncho, 200);
      }, { passive: true });

      var n = 0;
      setInterval(function () {
        /* Con la pestana de fondo el navegador ya frena los timers, pero
           ademas no tiene sentido gastar repintados sin nadie mirando. */
        if (document.hidden) return;
        geo.style.opacity = '0';
        setTimeout(function () {
          n = (n + 1) % ciudades.length;
          geo.style.setProperty('--geo-city', JSON.stringify(ciudades[n]));
          geo.style.opacity = '1';
        }, 320);
      }, 3200);
    }
  }

  /* ---- 5. consentimiento ---------------------------------------------- */
  /* El estado por defecto (todo denegado) ya lo declaro el bloque del <head>,
     que tambien reaplica la decision guardada. Aqui solo se gestiona el
     aviso y el 'update' cuando el usuario decide.

     La clave 'sd_consent' vive en localStorage, no en una cookie: guardar la
     decision sobre cookies EN una cookie es justo lo que no se puede hacer
     antes de tener la decision.                                          */
  var CONSENT_KEY = 'sd_consent';
  var card = document.getElementById('cookieCard');

  var readConsent = function () {
    try {
      var v = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
      return (v && v.v === 1) ? v : null;
    } catch (e) { return null; }        // modo privado, o almacenamiento bloqueado
  };

  function sdSaveConsent(analytics, ads) {
    var state = {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: ads ? 'granted' : 'denied',
      ad_user_data: ads ? 'granted' : 'denied',
      ad_personalization: ads ? 'granted' : 'denied'
    };
    if (typeof gtag === 'function') gtag('consent', 'update', state);
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: 1, state: state, t: Date.now() })); } catch (e) {}
    closeCard();
  }

  var lastTrigger = null;
  function openCard(fromFooter) {
    if (!card) return;
    lastTrigger = fromFooter || null;
    card.hidden = false;
    /* Al reabrirlo desde el pie se muestran ya los interruptores con lo que
       habia elegido: reabrirlo sirve para CAMBIAR, no para volver a empezar. */
    if (fromFooter) {
      var c = readConsent();
      if (c) {
        var a = document.getElementById('ccAnalytics'), d = document.getElementById('ccAds');
        if (a) a.checked = c.state.analytics_storage === 'granted';
        if (d) d.checked = c.state.ad_storage === 'granted';
      }
      showOptions();
      var first = card.querySelector('button, input:not([disabled])');
      if (first) first.focus();
    }
  }
  function closeCard() {
    if (!card) return;
    card.hidden = true;
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    lastTrigger = null;
  }
  function showOptions() {
    var opts = document.getElementById('ccOpts');
    if (opts) opts.hidden = false;
    var save = card.querySelector('[data-cc="save"]');
    var conf = card.querySelector('[data-cc="config"]');
    if (save) save.hidden = false;
    if (conf) conf.hidden = true;
  }

  if (card) {
    if (!readConsent()) card.hidden = false;      // primera visita
    card.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-cc]') : null;
      if (!b) return;
      var what = b.getAttribute('data-cc');
      if (what === 'accept') sdSaveConsent(true, true);
      else if (what === 'reject') sdSaveConsent(false, false);
      else if (what === 'config') showOptions();
      else if (what === 'save') {
        var a = document.getElementById('ccAnalytics'), d = document.getElementById('ccAds');
        sdSaveConsent(!!(a && a.checked), !!(d && d.checked));
      }
    });
    /* Escape solo cierra si YA hay una decision guardada: si no la hay, cerrar
       sin decidir dejaria el aviso sin respuesta y sin forma de volver a el. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !card.hidden && readConsent()) closeCard();
    });
  }
  /* Enlace del pie, en las 215 paginas y en las cinco 404. */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-cookie-prefs]') : null;
    if (!t) return;
    e.preventDefault();
    openCard(t);
  });

  /* ---- 6. eventos y conversiones -------------------------------------- */
  /* TZ-tracking seccion 4. Funciona aunque gtag no exista (bloqueador de
     anuncios, red caida): track() se va de vacio en lugar de romper el clic. */
  var P = window.SD_PAGE || {};
  var ADS = (window.SD_ADS && window.SD_ADS.id) || '';
  var LABELS = (window.SD_ADS && window.SD_ADS.labels) || {};

  function base() {
    return {
      page_type: P.page_type || null, car_slug: P.car_slug || null,
      car_name: P.car_name || null, car_brand: P.car_brand || null,
      price_1d: P.price_1d || null, lang: P.lang || null,
      page_path: location.pathname + location.search
    };
  }
  function track(name, extra) {
    if (typeof gtag !== 'function') return;
    var params = base();
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) params[k] = extra[k];
    gtag('event', name, params);                                  // GA4
    if (ADS && LABELS[name]) {                                    // Google Ads
      gtag('event', 'conversion', {
        send_to: ADS + '/' + LABELS[name],
        value: P.price_1d || 0, currency: 'EUR'
      });
    }
  }
  window.SD = window.SD || {};
  window.SD.track = track;

  /* Normaliza a +34XXXXXXXXX para las enhanced conversions. */
  function sdE164(v) {
    var d = String(v || '').replace(/[^\d+]/g, '');
    if (d.indexOf('+') === 0) return d;
    if (d.length === 9) return '+34' + d;
    if (d.indexOf('34') === 0 && d.length === 11) return '+' + d;
    return d ? '+' + d : '';
  }

  /* Delegacion en captura: cubre cualquier enlace, incluidos los que el
     propio site.js reescribe al propagar gclid. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a || !a.href) return;
    var h = a.href;
    var place = a.getAttribute('data-placement') || null;
    if (h.indexOf('wa.me') !== -1 || h.indexOf('api.whatsapp.com') !== -1) {
      track('whatsapp_click', { link_url: h, placement: place });
    } else if (h.indexOf('tel:') === 0) {
      track('phone_click', { link_url: h, placement: place });
    } else if (h.indexOf('mailto:') === 0) {
      track('email_click', { link_url: h, placement: place });
    } else if (a.hasAttribute('data-brand')) {
      /* Sin preventDefault: el enlace navega, y el evento sale antes. */
      track('filter_brand', { brand: a.getAttribute('data-brand') });
    }
  }, true);

  if (P.page_type === 'coche') track('view_car');
  if (P.page_type === 'tarifas') track('view_tarifas');

  /* ---- 3. contact form ------------------------------------------------ */
  var form = document.getElementById('bookForm');
  if (form) {
    /* Los textos del formulario los inyecta el generador en el idioma de la
       página: con cinco idiomas no pueden vivir aquí en español. Si por lo
       que sea faltara el bloque, se cae a un objeto vacío y los mensajes
       salen genéricos en vez de romper el envío. */
    var S = {};
    try { S = JSON.parse(document.getElementById('formI18n').textContent); } catch (e) {}
    // /coches/<slug>/ links here with ?coche=<slug>; preselect that car.
    var wanted = new URLSearchParams(location.search).get('coche');
    var select = form.querySelector('#f-car');
    if (wanted && select) {
      Array.prototype.forEach.call(select.options, function (o) {
        if (o.dataset.slug === wanted) select.value = o.value;
      });
    }

    var fail = function (id, msg) {
      var field = form.querySelector('#f-' + id).closest('.field');
      field.dataset.invalid = 'true';
      form.querySelector('#e-' + id).textContent = msg;
    };
    var clear = function (id) {
      var field = form.querySelector('#f-' + id).closest('.field');
      delete field.dataset.invalid;
      form.querySelector('#e-' + id).textContent = '';
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (id) { return form.querySelector('#f-' + id).value.trim(); };
      var ok = true;
      ['name', 'phone', 'car', 'dates'].forEach(function (id) { clear(id); });

      if (v('name').length < 2) { fail('name', S.errName || 'Required'); ok = false; }
      if (v('phone').replace(/[^0-9]/g, '').length < 9) { fail('phone', S.errPhone || 'Required'); ok = false; }
      if (!v('car')) { fail('car', S.errCar || 'Required'); ok = false; }
      if (v('dates').length < 3) { fail('dates', S.errDates || 'Required'); ok = false; }

      if (!ok) {
        var first = form.querySelector('[data-invalid="true"] input, [data-invalid="true"] select');
        if (first) first.focus();
        return;
      }

      var lines = [
        S.waIntro || 'Serres Drive',
        '',
        (S.waName || 'Name') + ': ' + v('name'),
        (S.waPhone || 'Phone') + ': ' + v('phone'),
        (S.waCar || 'Car') + ': ' + v('car'),
        (S.waDates || 'Dates') + ': ' + v('dates'),
      ];
      if (v('msg')) lines.push((S.waMessage || 'Message') + ': ' + v('msg'));

      /* form_submit va AQUI: con la validacion pasada y ANTES de abrir
         WhatsApp. No hay backend, asi que no existe la "respuesta OK del
         servidor" que pedia el TZ original — el delta del 08-09 lo reescribe
         asi a proposito.

         Y esto NO cuenta ademas como whatsapp_click: window.open no es un
         clic en un <a>, asi que el delegado de la seccion 6 no lo ve. Si
         algun dia este envio pasa a ser un enlace, hay que excluirlo alli o
         la conversion se contara dos veces.                              */
      if (typeof gtag === 'function') {
        /* Enhanced conversions: Google lo hashea en el navegador. No hay
           campo de correo en el formulario; si se añade, va aqui tambien. */
        gtag('set', 'user_data', { phone_number: sdE164(v('phone')) });
      }
      var opt = select && select.selectedOptions && select.selectedOptions[0];
      track('form_submit', {
        car_slug: (opt && opt.dataset.slug) || null,
        car_name: v('car') || null,
        dates: v('dates') || null,
        source_page: document.referrer || null,
        placement: 'form'
      });

      window.open('https://wa.me/' + form.dataset.wa + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
    });
  }

  /* ---- 4. keep ad tracking across internal navigation ------------------ */
  /* An SPA-style filter that drops gclid/utm_* zeroes out ad attribution.
     The brand filter here is a plain link, so the params are copied onto
     every internal link instead — including /flota -> /flota/<marca>. */
  var incoming = new URLSearchParams(location.search);
  ['coche'].forEach(function (k) { incoming.delete(k); });   // page-local, not tracking
  if (incoming.toString()) {
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      var href = a.getAttribute('href');
      if (!href || /^(#|mailto:|tel:|https?:\/\/(?!serresdrive\.com))/i.test(href)) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      incoming.forEach(function (val, key) {
        if (!url.searchParams.has(key)) url.searchParams.set(key, val);
      });
      a.setAttribute('href', url.pathname + url.search + url.hash);
    });
  }
})();
