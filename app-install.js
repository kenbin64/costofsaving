// app-install.js
// Cost of Saving as an app you can install (Ken, 2026-10-25). On every page:
//   - registers the service worker (sw.js), so the calculators open and work with no connection
//   - shows a small "Install the app" button where the browser offers installing (Android, Windows, Mac,
//     Chromebook), and on iPhone and iPad, a one-line note on how to add it to the home screen
//   - shows nothing once it is installed, or after the person closes the note
// Nothing here sends anything anywhere; the calculators still work entirely on the device.
(function () {
  'use strict';
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () { /* the site still works without it */ }); });
  }

  var installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (installed) return;
  var KEY = 'cos-install-closed';
  var closed = false;
  try { closed = localStorage.getItem(KEY) === '1'; } catch (e) { /* private window: show it */ }
  if (closed) return;

  var css = '.cos-install{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:50;display:flex;align-items:center;gap:8px;'
    + 'padding:8px 8px 8px 14px;border-radius:999px;background:#0f172a;color:#f8fafc;font:600 15px/1.2 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35);max-width:calc(100vw - 28px)}'
    + '.cos-install button{font:inherit;border:0;border-radius:999px;cursor:pointer}'
    + '.cos-install .go{background:#14b8a6;color:#0f172a;padding:8px 14px}'
    + '.cos-install .x{background:transparent;color:#94a3b8;padding:6px 9px;font-size:16px}'
    + '.cos-install .go:focus-visible,.cos-install .x:focus-visible{outline:2px solid #f8fafc;outline-offset:2px}'
    + '.cos-install span{font-weight:500}';

  function show(content) {
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    var bar = document.createElement('div'); bar.className = 'cos-install'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Install the app');
    bar.appendChild(content);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.setAttribute('aria-label', 'Close'); x.textContent = '✕';
    x.onclick = function () { bar.remove(); try { localStorage.setItem(KEY, '1'); } catch (e) { /* fine */ } };
    bar.appendChild(x);
    document.body.appendChild(bar);
    return bar;
  }

  // Android, Windows, Mac and Chromebook browsers offer installing; the button asks for that offer.
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    var offer = e;
    var go = document.createElement('button'); go.type = 'button'; go.className = 'go'; go.textContent = 'Install the app';
    var bar = show(go);
    go.onclick = function () {
      offer.prompt();
      offer.userChoice.then(function (choice) { if (choice.outcome === 'accepted') bar.remove(); });
    };
  });
  window.addEventListener('appinstalled', function () { var bar = document.querySelector('.cos-install'); if (bar) bar.remove(); });

  // iPhone and iPad have no install offer: say how to add it to the home screen instead.
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) {
    window.addEventListener('load', function () {
      var note = document.createElement('span');
      note.textContent = 'Use it as an app: tap Share, then Add to Home Screen';
      show(note);
    });
  }
})();
