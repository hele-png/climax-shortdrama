// Feed vertical tipo TikTok/Reels con scroll-snap; solo el ítem visible monta el reproductor
import { getCatalog, getEpisode, episodePoster } from '../data.js';
import { seriesProgress, toggleLike, isLiked, toggleFav, isFav } from '../store.js';
import { recommend } from '../recommend.js';
import { monetization } from '../monetization.js';
import { mountPlayer } from '../player.js';
import { ensureAccess, openPaywall } from './paywall.js';
import { esc, hashStr, toast, num } from '../util.js';
import { go, fakeViews, fmtViews } from './common.js';
import { ic, coinIc } from '../icons.js';
import { charHTML, coverHTML } from '../data.js';

export function renderFeed(view) {
  const cat = getCatalog();
  const order = recommend(cat, cat.length).map(r => r.s);
  const items = [];
  for (let r = 0; r < 3; r++) for (const s of order) { const start = seriesProgress(s).resumeEp || 1; const ep = getEpisode(s, start + r); if (ep) items.push({ s, ep }); }
  view.classList.add('feed-view');
  view.innerHTML = `<div class="feed-top"><a href="#/" class="ft-tab">Inicio</a><b class="ft-tab on">Para ti</b><a href="#/tienda" class="tb-coins">${coinIc(16)}<b data-coins>${num(monetization.syncWallet.coins)}</b></a></div>
    <div class="feed">${items.map(({ s, ep }, i) => {
      const f = episodePoster(s, ep);
      const likes = 12e3 + (hashStr(s.id + ep.n) % 380e3);
      const locked = monetization.accessSync(s, ep.n) === 'locked';
      return `<section class="feed-item" data-i="${i}">
        <div class="fi-stage"><div class="fi-poster">${f.url ? `<img src="${f.url}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div></div>
        ${locked ? `<div class="fi-lock">${ic('lock', 28)}<b>Episodio ${ep.n} bloqueado</b><button class="btn primary" data-unlock>Desbloquear</button></div>` : ''}
        <aside class="rail">
          <a href="#/serie/${s.slug}" class="rail-av">${coverHTML(s, 'mini')}</a>
          <button data-like class="${isLiked(s.id + ':' + ep.n) ? 'on' : ''}" aria-label="Me gusta">${ic('heart-f', 30)}<small>${fmtViews(likes)}</small></button>
          <button data-fav class="${isFav(s.id) ? 'on' : ''}" aria-label="Mi lista">${ic('bookmark-f', 28)}<small>Mi lista</small></button>
          <button data-eps aria-label="Episodios">${ic('list-numbers', 28)}<small>${s.totalEpisodes} ep.</small></button>
          <button data-share aria-label="Compartir">${ic('share-3', 28)}<small>Compartir</small></button>
        </aside>
        <div class="fi-info">
          <a href="#/serie/${s.slug}" class="fi-title">${esc(s.title)}</a>
          <div class="fi-ep">Episodio ${ep.n} · ${esc(ep.title)}</div>
          <p class="fi-hook">${esc(ep.hook)}</p>
        </div>
        <button class="fi-cta" data-full>${ic('movie', 16)}<span>Ver serie completa · ${s.totalEpisodes} episodios</span>${ic('chevron-right', 16)}</button>
      </section>`;
    }).join('')}</div>`;
  const feed = view.querySelector('.feed');
  let active = -1, player = null;
  const activate = (i) => {
    if (i === active) return; active = i; player?.destroy(); player = null;
    const it = items[i], sec = feed.children[i];
    if (!it || monetization.accessSync(it.s, it.ep.n) === 'locked') return;
    player = mountPlayer(sec.querySelector('.fi-stage'), { series: it.s, ep: it.ep, mode: 'feed',
      onNext: async (nx) => { if (await ensureAccess(it.s, nx)) go(`/ver/${it.s.slug}/${nx}`); } });
  };
  const io = new IntersectionObserver((ents) => { for (const e of ents) if (e.isIntersecting && e.intersectionRatio > 0.6) activate(+e.target.dataset.i); }, { root: feed, threshold: [0.6] });
  [...feed.children].forEach(c => io.observe(c));
  feed.addEventListener('click', async (ev) => {
    const sec = ev.target.closest('.feed-item'); if (!sec) return; const it = items[+sec.dataset.i];
    const b = ev.target.closest('button'); if (!b) return; ev.stopPropagation();
    if (b.hasAttribute('data-like')) { b.classList.toggle('on', toggleLike(it.s.id + ':' + it.ep.n)); }
    else if (b.hasAttribute('data-fav')) { const on = toggleFav(it.s.id); b.classList.toggle('on', on); toast(on ? 'Añadida a Mi lista' : 'Quitada de Mi lista'); }
    else if (b.hasAttribute('data-eps') || b.hasAttribute('data-full')) go(`/serie/${it.s.slug}`);
    else if (b.hasAttribute('data-share')) { const url = location.href.split('#')[0] + `#/serie/${it.s.slug}`; try { await navigator.share({ title: it.s.title, text: it.ep.hook, url }); } catch { navigator.clipboard?.writeText(url); toast('Enlace copiado'); } }
    else if (b.hasAttribute('data-unlock')) { if (await openPaywall(it.s, it.ep.n)) { sec.querySelector('.fi-lock')?.remove(); active = -1; activate(+sec.dataset.i); } }
  });
  // teclado (escritorio)
  const key = (e) => { if (e.key === 'ArrowDown') feed.scrollBy({ top: feed.clientHeight, behavior: 'smooth' }); if (e.key === 'ArrowUp') feed.scrollBy({ top: -feed.clientHeight, behavior: 'smooth' }); };
  addEventListener('keydown', key);
  setTimeout(() => activate(0), 50);
  return () => { io.disconnect(); player?.destroy(); removeEventListener('keydown', key); };
}
