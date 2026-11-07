// Tabellino Auxilium: funziona offline. Cambia VERSION a ogni aggiornamento dell'app.
const VERSION = 'tabellino-v12';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
// lettore liste R (OCR): scaricato all'installazione per funzionare offline
const OCR = ['./ocr/tesseract.min.js', './ocr/worker.min.js', './ocr/core/tesseract-core-simd-lstm.wasm.js', './ocr/core/tesseract-core-lstm.wasm.js', './ocr/lang/ita.traineddata.gz'];
// "reload" salta la cache HTTP del browser: si scaricano sempre i file appena pubblicati
const fresh = urls => urls.map(u => new Request(u, {cache: 'reload'}));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(fresh(CORE)).then(() => c.addAll(fresh(OCR)).catch(() => {})))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;
  // la pagina: prima la rete (versione più recente), la copia salvata solo se offline
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(fetch(new Request(req.url, {cache: 'no-store'})).then(res => {
      if (res && res.ok) caches.open(VERSION).then(c => c.put('./index.html', res.clone()));
      return res;
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  // tutto il resto: copia salvata, aggiornata in background
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, {ignoreSearch: true});
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
