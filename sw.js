/* VELLURE · service worker: abre rápido e funciona com sinal fraco */
const V = 'vellure-v8';
const CORE = ['./', './index.html', './conta.html', './css/v3d.css', './css/conta.css', './js/config.js', './js/data.js', './js/catalog.js',
  './js/v3d/main.js', './js/v3d/scene.js', './js/v3d/shop.js', './js/v3d/common.js', './js/v3d/atelier.js', './js/v3d/sound.js', './js/v3d/conta.js', './js/v3d/vip.js', './js/v3d/vipbox.js', './assinatura.html', './css/vip.css', './js/theme.js', './js/lgpd.js', './js/v3d/pix.js', './js/v3d/reviews.js', './rastreio.html', './js/v3d/rastreio.js', './politicas.html',
  './assets/vendor/three.module.js', './assets/vendor/gsap.min.js', './assets/vendor/lenis.min.js', './assets/icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const isMedia = /\/assets\/(modelos|vendor|icons|email)\//.test(u.pathname);
  if (isMedia) {
    // fotos e bibliotecas: do cache primeiro, rede em segundo plano
    e.respondWith(caches.open(V).then(async (c) => { const hit = await c.match(e.request); const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit); return hit || net; }));
  } else {
    // páginas e código: rede primeiro (sempre a versão nova), cache se offline
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
  }
});
