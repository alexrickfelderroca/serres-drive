/* =====================================================================
   SERRES DRIVE — site behaviour
   One file, no dependencies. It replaces the eleven scripts that drove
   the deleted experiences (three.js tube, GSAP preloader, page
   transitions, drag sliders, marquee, ink menu), so there is no dead JS
   and nothing animates content into view.

   Four jobs:
     1. mobile menu
     2. car gallery (click a thumbnail, swap the main photo)
     3. contact form -> prefilled WhatsApp message, with inline validation
     4. keep gclid / utm_* on every internal link (ETAPA 3)
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
