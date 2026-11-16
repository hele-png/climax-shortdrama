import './styles.css';
import '@fontsource-variable/inter/wght.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import { loadData } from './data.js';
import { monetization, onWallet } from './monetization.js';
import { $, h } from './util.js';
import { openModal } from './modal.js';
import { renderHome } from './views/home.js';
import { renderFeed } from './views/feed.js';
import { renderSeries } from './views/series.js';
import { renderWatch } from './views/watch.js';
import { renderProfile } from './views/profile.js';
import { renderAdmin } from './views/admin.js';
import { renderDashboard } from './views/dashboard.js';
import { renderList } from './views/list.js';
import { renderGuiones } from './views/guiones.js';
import { renderShop, renderVip } from './views/shop.js';
import { ic } from './icons.js';

const routes = [
  [/^\/?$/, renderHome, 'home'],
  [/^\/feed$/, renderFeed, 'feed'],
  [/^\/lista$/, renderList, 'list'],
  [/^\/serie\/([^/]+)$/, renderSeries, 'home'],
  [/^\/ver\/([^/]+)\/(\d+)$/, renderWatch, null],
  [/^\/perfil$/, renderProfile, 'profile'],
  [/^\/tienda$/, renderShop, null],
  [/^\/vip$/, renderVip, null],
  [/^\/admin$/, renderAdmin, null],
  [/^\/dashboard$/, renderDashboard, null],
  [/^\/guiones$/, renderGuiones, 'profile'],
  [/^\/guiones\/([^/]+)\/([^/]+)$/, renderGuiones, 'profile'],
];
let cleanup = null;
const app = () => $('#app');

function shell(tab) {
  app().innerHTML = `
    <main id="view" class="view ${tab ? '' : 'no-nav'} ${/^\/(admin|dashboard)/.test(location.hash.slice(1)) ? 'theme-admin' : ''}"></main>
    ${tab ? `<nav class="tabbar">
      <a href="#/" data-t="home">${ic('home', 24, 'o')}${ic('home-f', 24, 'f')}<span>Inicio</span></a>
      <a href="#/feed" data-t="feed">${ic('player-play', 24, 'o')}${ic('player-play-f', 24, 'f')}<span>Para ti</span></a>
      <a href="#/lista" data-t="list">${ic('bookmark', 24, 'o')}${ic('bookmark-f', 24, 'f')}<span>Mi lista</span></a>
      <a href="#/perfil" data-t="profile">${ic('user', 24, 'o')}${ic('user-f', 24, 'f')}<span>Perfil</span></a>
    </nav>` : ''}`;
  app().querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.t === tab));
  return $('#view');
}
async function router() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  try { cleanup?.(); } catch {} cleanup = null;
  document.getElementById('modal-root').innerHTML = '';
  for (const [re, fn, tab] of routes) {
    const m = path.match(re);
    if (m) { const view = shell(tab); view.scrollTop = 0; window.scrollTo(0, 0); cleanup = (await fn(view, ...m.slice(1).map(decodeURIComponent))) || null; return; }
  }
  location.hash = '#/';
}
export const navigate = (p) => { location.hash = '#' + p; };
window.addEventListener('hashchange', router);
onWallet(() => document.querySelectorAll('[data-coins]').forEach(e => e.textContent = monetization.syncWallet.coins));

(async () => {
  await loadData();
  router();
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !import.meta.env.DEV) {
    const hadSW = !!navigator.serviceWorker.controller; let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
    navigator.serviceWorker.register('./sw.js').then(r => r.update?.()).catch(() => {});
  }
})();

// Instalación PWA (Android: beforeinstallprompt; iOS: instrucciones)
let deferred = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; document.body.classList.add('can-install'); });
export async function promptInstall() {
  if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; document.body.classList.remove('can-install'); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openModal(`<div class="install-help"><img src="./icons/icon-192.png" width="72" height="72" alt=""><h3>Instala CLÍMAX en tu móvil</h3>
    ${ios ? `<ol><li>Abre esta página en <b>Safari</b>.</li><li>Pulsa <b>Compartir</b> <span class="kbd">${ic('share-3', 14)}</span>.</li><li>Elige <b>«Añadir a pantalla de inicio»</b>.</li></ol>`
          : `<ol><li>Abre el menú del navegador <span class="kbd">${ic('dots-vertical', 14)}</span>.</li><li>Pulsa <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</li></ol>`}
    <p class="muted tiny">Se abrirá a pantalla completa, como una app nativa, y funciona sin conexión.</p></div>`);
}
window.__promptInstall = promptInstall;
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
