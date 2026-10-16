/*
  Ardor Frames Lab — language switching (mockup)

  - English lives at the root, Korean under /ko/. Every page has a counterpart.
  - The globe menu links to the counterpart of the *current* page.
  - An explicit choice is remembered in localStorage (wrapped in try/catch:
    private windows and blocked storage must not break the page).
  - Only a visit to the root "/" honours a saved "ko" preference.
    The browser's language is never used to redirect.

  Load this file synchronously in <head> so the root redirect happens
  before the English page paints; the menu wiring waits for the DOM.
*/
(function () {
  'use strict';

  var KEY = 'ardorlabs.lang';
  var LANGS = ['en', 'ko'];

  function readPref() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writePref(lang) {
    try { window.localStorage.setItem(KEY, lang); } catch (e) { /* storage unavailable: choice just isn't remembered */ }
  }

  function isKoPath(p) { return p === '/ko' || p.indexOf('/ko/') === 0; }

  // "/launch-board/index.html" -> "/launch-board/"; keeps directory-style URLs
  // so the same mapping works on GitHub Pages / Astro output.
  function normalize(p) { return p.replace(/\/index\.html$/, '/'); }

  // Path of the same page in `target` language.
  function counterpart(pathname, target) {
    var p = normalize(pathname || '/');
    var en = isKoPath(p) ? (p.slice(3) || '/') : p;
    if (en.charAt(0) !== '/') en = '/' + en;
    return target === 'ko' ? '/ko' + en : en;
  }

  function currentLang() {
    var htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (htmlLang.indexOf('ko') === 0) return 'ko';
    return isKoPath(location.pathname) ? 'ko' : 'en';
  }

  // ---- 1. Root redirect (runs immediately) ----
  var path = location.pathname;
  if ((path === '/' || path === '/index.html') && readPref() === 'ko') {
    location.replace('/ko/' + location.search + location.hash);
    return;
  }

  // ---- 2. Globe menu ----
  function initMenu(root) {
    var button = root.querySelector('.lang-button');
    var menu = root.querySelector('.lang-menu');
    if (!button || !menu) return;

    var items = Array.prototype.slice.call(menu.querySelectorAll('[data-lang]'));
    var here = currentLang();

    // keep ?query (e.g. ?manual=1 on the download page) and #hash when switching.
    // Re-run on open too, so an in-page jump made after load (#install) is kept.
    function syncHrefs() {
      items.forEach(function (item) {
        item.setAttribute('href', counterpart(location.pathname, item.getAttribute('data-lang')) + location.search + location.hash);
      });
    }
    syncHrefs();
    items.forEach(function (item) {
      item.setAttribute('aria-checked', String(item.getAttribute('data-lang') === here));
      item.setAttribute('tabindex', '-1');
    });

    var code = button.querySelector('.lang-code');
    if (code) code.textContent = here.toUpperCase();

    function isOpen() { return button.getAttribute('aria-expanded') === 'true'; }

    function focusItem(index) {
      var n = items.length;
      items[((index % n) + n) % n].focus();
    }
    function checkedIndex() {
      for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute('aria-checked') === 'true') return i;
      }
      return 0;
    }

    function open(focusIndex) {
      syncHrefs();
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      // next frame so the opacity/transform transition runs
      window.requestAnimationFrame(function () { menu.classList.add('is-open'); });
      if (typeof focusIndex === 'number') focusItem(focusIndex);
    }
    function close(returnFocus) {
      if (!isOpen()) return;
      menu.classList.remove('is-open');
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (returnFocus) button.focus();
    }

    button.addEventListener('click', function (e) {
      if (isOpen()) { close(false); return; }
      // e.detail === 0: activated by keyboard (Enter/Space) -> move focus into the menu
      open(e.detail === 0 ? checkedIndex() : undefined);
    });

    button.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(isOpen() ? 0 : checkedIndex()); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); open(items.length - 1); }
      else if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(true); }
    });

    menu.addEventListener('keydown', function (e) {
      var i = items.indexOf(document.activeElement);
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); focusItem(i + 1); break;
        case 'ArrowUp': e.preventDefault(); focusItem(i - 1); break;
        case 'Home': e.preventDefault(); focusItem(0); break;
        case 'End': e.preventDefault(); focusItem(items.length - 1); break;
        case 'Escape': e.preventDefault(); close(true); break;
        case 'Tab': close(false); break;
        case ' ':
          // links don't activate on Space by default; menu items should
          e.preventDefault();
          if (i > -1) items[i].click();
          break;
      }
    });

    items.forEach(function (item) {
      item.addEventListener('click', function (e) {
        var lang = item.getAttribute('data-lang');
        if (LANGS.indexOf(lang) === -1) return;
        writePref(lang);
        if (lang === here) { e.preventDefault(); close(true); }
      });
    });

    document.addEventListener('click', function (e) {
      if (isOpen() && !root.contains(e.target)) close(false);
    });
    root.addEventListener('focusout', function (e) {
      if (isOpen() && e.relatedTarget && !root.contains(e.relatedTarget)) close(false);
    });
  }

  function init() {
    var roots = document.querySelectorAll('[data-lang-switch]');
    for (var i = 0; i < roots.length; i++) initMenu(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposed for the Astro port / tests; not used by the pages themselves.
  window.ArdorLang = { counterpart: counterpart, readPref: readPref };
})();
