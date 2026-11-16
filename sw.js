/* Service worker de CLÍMAX. postbuild.mjs reemplaza VERSION y las listas de precache. */
const VERSION = 'sd-v3-mwitmlq9';
const PRECACHE = ["./","./assets/barlow-condensed-latin-600-normal-BFJEwTuo.woff","./assets/barlow-condensed-latin-600-normal-DepVgxBB.woff2","./assets/barlow-condensed-latin-700-normal-Dmwat-ge.woff","./assets/barlow-condensed-latin-700-normal-v1xN8_Wq.woff2","./assets/index-De1oRJ36.js","./assets/index-yajoZwAh.css","./assets/inter-cyrillic-ext-wght-normal-BOeWTOD4.woff2","./assets/inter-cyrillic-wght-normal-DqGufNeO.woff2","./assets/inter-greek-ext-wght-normal-DlzME5K_.woff2","./assets/inter-greek-wght-normal-CkhJZR-_.woff2","./assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2","./assets/inter-latin-wght-normal-Dx4kXJAl.woff2","./assets/inter-vietnamese-wght-normal-CBcvBZtf.woff2","./data.json","./icons/apple-touch-icon.png","./icons/favicon-32.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon.svg","./icons/maskable-512.png","./index.html","./manifest.json","./manifest.webmanifest"] || ['./', './index.html'];
const IMAGES = ["./img/cien-dias/char-adrian-montenegro.webp","./img/cien-dias/char-bianca-duarte.webp","./img/cien-dias/char-elena-robles.webp","./img/cien-dias/char-iker-montenegro.webp","./img/cien-dias/char-pablo-robles.webp","./img/cien-dias/cover.webp","./img/cien-dias/scene-1.webp","./img/cien-dias/scene-2.webp","./img/cien-dias/scene-3.webp","./img/cien-dias/scene-4.webp","./img/cien-dias/scene-5.webp","./img/esposa-del-mar/char-alvaro-saavedra.webp","./img/esposa-del-mar/char-carla-ferrer.webp","./img/esposa-del-mar/char-elvira-saavedra.webp","./img/esposa-del-mar/char-lucia-ferrer.webp","./img/esposa-del-mar/char-mateo-rios.webp","./img/esposa-del-mar/cover.webp","./img/esposa-del-mar/scene-1.webp","./img/esposa-del-mar/scene-2.webp","./img/esposa-del-mar/scene-3.webp","./img/esposa-del-mar/scene-4.webp","./img/esposa-del-mar/scene-5.webp","./img/loba-rechazada/char-abuela-remedios.webp","./img/loba-rechazada/char-alba-rivas.webp","./img/loba-rechazada/char-dario-valcarcel.webp","./img/loba-rechazada/char-leo-navarro.webp","./img/loba-rechazada/char-rodrigo-navarro.webp","./img/loba-rechazada/char-vanesa-mora.webp","./img/loba-rechazada/cover.webp","./img/loba-rechazada/scene-1.webp","./img/loba-rechazada/scene-2.webp","./img/loba-rechazada/scene-3.webp","./img/loba-rechazada/scene-4.webp","./img/loba-rechazada/scene-5.webp","./img/renaci/char-gabriel-ferran.webp","./img/renaci/char-hugo-lazaro.webp","./img/renaci/char-martina-olmedo.webp","./img/renaci/char-noelia-prats.webp","./img/renaci/char-ramon-olmedo.webp","./img/renaci/cover.webp","./img/renaci/scene-1.webp","./img/renaci/scene-2.webp","./img/renaci/scene-3.webp","./img/renaci/scene-4.webp","./img/renaci/scene-5.webp","./img/repartidor-heredero/char-bruno-castell.webp","./img/repartidor-heredero/char-daniel-cruz.webp","./img/repartidor-heredero/char-don-ernesto-altamira.webp","./img/repartidor-heredero/char-irene-salas.webp","./img/repartidor-heredero/char-marina-velasco.webp","./img/repartidor-heredero/char-rosa-velasco.webp","./img/repartidor-heredero/cover.webp","./img/repartidor-heredero/scene-1.webp","./img/repartidor-heredero/scene-2.webp","./img/repartidor-heredero/scene-3.webp","./img/repartidor-heredero/scene-4.webp","./img/repartidor-heredero/scene-5.webp"] || [];
const SHELL = 'shell-' + VERSION, IMG = 'img-' + VERSION, DATA = 'data-' + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(PRECACHE).catch(() => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {}))));
    // imágenes: best-effort, sin bloquear la instalación si alguna falla
    const ic = await caches.open(IMG);
    await Promise.all(IMAGES.map(u => ic.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![SHELL, IMG, DATA].includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // audio/vídeo: streaming directo (sin caché, respeta Range); los cues JSON sí van con SWR
  if (/\/media\/.*\.(mp4|m4a|webm|mp3|opus)$/.test(url.pathname) || req.headers.has('range') || req.destination === 'video' || req.destination === 'audio') return;
  // datos: network-first (para ver contenido nuevo), con fallback offline
  if (/\/(data|manifest)\.json$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(DATA).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req)));
    return;
  }
  // imágenes: cache-first
  if (url.pathname.includes('/img/') || req.destination === 'image') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(IMG).then(c => c.put(req, cp)); } return r; })));
    return;
  }
  // navegación: app shell
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  // resto: stale-while-revalidate
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
