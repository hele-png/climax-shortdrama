/* Service worker de CLÍMAX. postbuild.mjs reemplaza VERSION y las listas de precache. */
const VERSION = '__VERSION__';
const PRECACHE = self.__PRECACHE__ || ['./', './index.html'];
const IMAGES = self.__IMAGES__ || [];
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
