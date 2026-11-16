import { getSeries, getEpisode, episodePoster } from '../data.js';
import { monetization } from '../monetization.js';
import { mountPlayer } from '../player.js';
import { openPaywall, ensureAccess } from './paywall.js';
import { openModal } from '../modal.js';
import { esc, toast } from '../util.js';
import { ic } from '../icons.js';
import { toggleFav, isFav, toggleLike, isLiked } from '../store.js';
import { go } from './common.js';

export async function renderWatch(view, slug, nStr) {
  const s = getSeries(slug), n = +nStr, ep = getEpisode(s, n);
  if (!s || !ep) { go(s ? `/serie/${slug}` : '/'); return; }
  view.classList.add('watch');
  if (monetization.accessSync(s, n) === 'locked') {
    const po = episodePoster(s, ep);
    view.innerHTML = `<div class="locked-screen">${po?.url ? `<img class="locked-bg" src="${po.url}" alt="">` : ''}<div class="lock-big">${ic('lock', 32)}</div><p>Episodio ${n} bloqueado</p></div>`;
    const ok = await openPaywall(s, n);
    if (!ok) { go(`/serie/${slug}`); return; }
  }
  const lk = s.id + ':' + n;
  view.innerHTML = `<div class="watch-top"><button class="tb-back" id="back" aria-label="Atrás">${ic('chevron-left', 26)}</button><div class="wt-t"><b>${esc(s.title)}</b><small>EP. ${n} · ${esc(ep.title)}${ep.video ? ' <i class="tag-vid">Vídeo</i>' : ''}</small></div></div>
    <div class="watch-stage"></div>
    <aside class="rail watch-rail">
      <button id="like" class="${isLiked(lk) ? 'on' : ''}" aria-label="Me gusta">${ic('heart-f', 30)}<small>Me gusta</small></button>
      <button id="wfav" class="${isFav(s.id) ? 'on' : ''}" aria-label="Mi lista">${ic('bookmark-f', 28)}<small>Mi lista</small></button>
      <button id="eps" aria-label="Episodios">${ic('list-numbers', 28)}<small>Episodios</small></button>
    </aside>`;
  const player = mountPlayer(view.querySelector('.watch-stage'), {
    series: s, ep, mode: 'full',
    onNext: async (nx) => { if (await ensureAccess(s, nx)) go(`/ver/${slug}/${nx}`); },
  });
  view.querySelector('#back').onclick = () => go(`/serie/${slug}`);
  view.querySelector('#like').onclick = (e) => e.currentTarget.classList.toggle('on', toggleLike(lk));
  view.querySelector('#wfav').onclick = (e) => { const on = toggleFav(s.id); e.currentTarget.classList.toggle('on', on); toast(on ? 'Añadida a Mi lista' : 'Quitada de Mi lista'); };
  view.querySelector('#eps').onclick = () => {
    player.pause(false);
    const m = openModal(`<div class="sheet-h"><b>${esc(s.title)}</b><small>${s.episodes.length} episodios</small></div><div class="ep-grid compact">${s.episodes.map(e => { const a = monetization.accessSync(s, e.n); return `<button class="ep ${a} ${e.n === n ? 'current' : ''}" data-n="${e.n}"><b>${e.n}</b>${a === 'locked' ? ic('lock', 12, 'ep-lk') : ''}</button>`; }).join('')}</div>`, { cls: 'sheet', onClose: () => player.play() });
    m.body.querySelectorAll('[data-n]').forEach(b => b.onclick = async () => { const k = +b.dataset.n; m.close(); if (await ensureAccess(s, k)) go(`/ver/${slug}/${k}`); });
  };
  return () => player.destroy();
}
