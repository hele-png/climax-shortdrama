import { monetization } from '../monetization.js';
import { coverHTML, getCatalog, genre } from '../data.js';
import { seriesProgress } from '../store.js';
import { esc, hashStr, num } from '../util.js';
import { ic, coinIc } from '../icons.js';
export const go = (p) => { location.hash = '#' + p; };
export const back = () => (history.length > 1 ? history.back() : (location.hash = '#/'));
window.__back = back;

/** Barra superior. Sin título = logotipo (pantallas principales); con título = navegación interna. */
export function topbar(title = '', { over = false, right = '' } = {}) {
  const w = monetization.syncWallet, vip = monetization.hasSubscription();
  return `<header class="topbar ${over ? 'over' : ''} ${title ? 'tb-sub' : ''}">
    ${title ? `<button class="tb-back" onclick="__back()" aria-label="Atrás">${ic('chevron-left', 24)}</button><h1 class="tb-title">${esc(title)}</h1>`
            : `<a class="logo" href="#/" aria-label="CLÍMAX inicio">CLÍMAX</a>`}
    <span class="spacer"></span>
    ${right}
    ${vip ? `<a class="tb-vip" href="#/vip" aria-label="VIP activo">${ic('crown-f', 16)}VIP</a>` : ''}
    <a class="tb-coins" href="#/tienda" aria-label="Mis coins">${coinIc(16)}<b data-coins>${num(w.coins)}</b></a>
  </header>`;
}
/** Visualizaciones simuladas deterministas */
export const fakeViews = (s) => 0.4e6 + (hashStr(s.id) % 9e6);
export const fmtViews = (n) => n >= 1e6 ? num(n / 1e6, 1) + ' M' : num(n / 1e3, 0) + ' K';
export const rating = (s) => num(4.5 + (hashStr(s.id + 'r') % 5) / 10, 1);
/** Etiqueta editorial (Popular / Nuevo / Exclusivo) */
export function tagOf(s) {
  const cat = getCatalog(); const i = cat.indexOf(s);
  const top = [...cat].sort((a, b) => fakeViews(b) - fakeViews(a))[0];
  if (s === top) return 'Popular';
  if (i >= cat.length - 2) return 'Nuevo';
  if (hashStr(s.id) % 2) return 'Exclusivo';
  return '';
}
export const tagHTML = (t) => t ? `<span class="tag tag-${t.toLowerCase()}">${esc(t)}</span>` : '';

export function card(s, { reason = '', showProgress = false, rank = 0, size = '' } = {}) {
  const p = seriesProgress(s);
  const prog = showProgress && p.lastEp;
  return `<a class="card ${rank ? 'ranked' : ''} ${size}" href="#/serie/${s.slug}">
    ${rank ? `<span class="rank" aria-hidden="true">${rank}</span>` : ''}
    <div class="card-art">${coverHTML(s)}
      ${!rank ? tagHTML(tagOf(s)) : ''}
      <span class="card-views">${ic('player-play-f', 10)}${fmtViews(fakeViews(s))}</span>
      ${prog ? `<div class="card-prog"><i style="width:${Math.max(4, (p.lastEp / s.totalEpisodes) * 100)}%"></i></div>` : ''}
    </div>
    <div class="card-t">${esc(s.title)}</div>
    <div class="card-s">${prog ? `Ep. ${p.resumeEp} de ${s.totalEpisodes}` : esc(reason || `${genre(s.niche)} · ${s.totalEpisodes} ep.`)}</div>
  </a>`;
}
export const row = (title, items, extra = '') => items.length ? `<section class="row"><div class="row-h"><h2>${title}</h2>${extra}</div><div class="hscroll">${items.join('')}</div></section>` : '';
export const empty = (icon, title, text = '', cta = '') => `<div class="empty">${ic(icon, 28)}<b>${title}</b>${text ? `<p>${text}</p>` : ''}${cta}</div>`;
/** Cabecera del panel interno (estilo Tabler) */
export function adminbar(title, active) {
  return `<header class="adm-top">
    <div class="adm-top-r"><button class="tb-back" onclick="location.hash='#/perfil'" aria-label="Salir">${ic('chevron-left', 22)}</button><span class="adm-brand">CLÍMAX <em>Studio</em></span><span class="spacer"></span><a class="adm-exit" href="#/">Ver app${ic('arrow-up-right', 14)}</a></div>
    <nav class="adm-nav"><a href="#/dashboard" class="${active === 'dash' ? 'on' : ''}">${ic('layout-dashboard', 18)}Dashboard</a><a href="#/admin" class="${active === 'admin' ? 'on' : ''}">${ic('settings', 18)}Contenido y precios</a></nav>
    <h1 class="tb-title adm-h1">${esc(title)}</h1>
  </header>`;
}
