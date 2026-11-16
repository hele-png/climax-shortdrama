import { monetization } from '../monetization.js';
import { coverHTML } from '../data.js';
import { seriesProgress } from '../store.js';
import { esc, hashStr, num } from '../util.js';
export const go = (p) => { location.hash = '#' + p; };
export function topbar(title = '') {
  const w = monetization.syncWallet, vip = monetization.hasSubscription();
  return `<header class="topbar">
    ${title ? `<button class="icon-btn" onclick="history.length>1?history.back():location.hash='#/'">‹</button><h1 class="tb-title">${esc(title)}</h1>` : `<a class="logo" href="#/"><img src="./icons/icon-192.png" alt="" width="28" height="28"><span>CLÍMAX</span></a>`}
    <span class="spacer"></span>
    <button class="install-chip" onclick="__promptInstall()" title="Instalar app">⤓ Instalar</button>
    ${vip ? '<a class="vip-chip" href="#/perfil">👑 VIP</a>' : ''}
    <a class="coin-chip" href="#/perfil"><span class="coin-ic">◉</span><b data-coins>${w.coins}</b></a>
  </header>`;
}
/** Visualizaciones simuladas deterministas */
export const fakeViews = (s) => 0.4e6 + (hashStr(s.id) % 9e6);
export const fmtViews = (n) => n >= 1e6 ? num(n / 1e6, 1) + ' M' : num(n / 1e3, 0) + ' K';
export function card(s, { reason = '', showProgress = false, rank = 0 } = {}) {
  const p = seriesProgress(s);
  return `<a class="card ${rank ? 'ranked' : ''}" href="#/serie/${s.slug}">
    ${rank ? `<span class="rank">${rank}</span>` : ''}
    <div class="card-art">${coverHTML(s)}
      <span class="card-eps">${s.totalEpisodes} ep.</span>
      ${showProgress && p.lastEp ? `<div class="card-prog"><i style="width:${Math.max(4, (p.lastEp / s.totalEpisodes) * 100)}%"></i></div>` : ''}
    </div>
    <div class="card-t">${esc(s.title)}</div>
    <div class="card-s">${showProgress && p.lastEp ? `Ep. ${p.resumeEp} · ${Math.round(p.pct * 100)} %` : esc(reason || s.niche)}</div>
  </a>`;
}
export const row = (title, items, extra = '') => items.length ? `<section class="row"><div class="row-h"><h2>${title}</h2>${extra}</div><div class="hscroll">${items.join('')}</div></section>` : '';
