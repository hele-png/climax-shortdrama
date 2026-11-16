import { getSeries, getEpisode, episodePoster } from '../data.js';
import { monetization } from '../monetization.js';
import { mountPlayer } from '../player.js';
import { openPaywall, ensureAccess } from './paywall.js';
import { openModal } from '../modal.js';
import { esc } from '../util.js';
import { go } from './common.js';

export async function renderWatch(view, slug, nStr) {
  const s = getSeries(slug), n = +nStr, ep = getEpisode(s, n);
  if (!s || !ep) { go(s ? `/serie/${slug}` : '/'); return; }
  view.classList.add('watch');
  if (monetization.accessSync(s, n) === 'locked') {
    const po = episodePoster(s, ep);
    view.innerHTML = `<div class="locked-screen">${po?.url ? `<img class="locked-bg" src="${po.url}" alt="">` : ''}<div class="lock-big">🔒</div><p>Episodio ${n} bloqueado</p></div>`;
    const ok = await openPaywall(s, n);
    if (!ok) { go(`/serie/${slug}`); return; }
  }
  view.innerHTML = `<div class="watch-top"><button class="icon-btn" id="back">‹</button><div class="wt-t"><b>${esc(s.title)}</b><small>Episodio ${n} · ${esc(ep.title)}</small></div><button class="icon-btn" id="eps">☰</button></div><div class="watch-stage"></div>`;
  const player = mountPlayer(view.querySelector('.watch-stage'), {
    series: s, ep, mode: 'full',
    onNext: async (nx) => { if (await ensureAccess(s, nx)) go(`/ver/${slug}/${nx}`); },
  });
  view.querySelector('#back').onclick = () => go(`/serie/${slug}`);
  view.querySelector('#eps').onclick = () => {
    player.pause(false);
    const m = openModal(`<h3>${esc(s.title)}</h3><div class="ep-grid compact">${s.episodes.map(e => { const a = monetization.accessSync(s, e.n); return `<button class="ep ${a} ${e.n === n ? 'current' : ''}" data-n="${e.n}"><b>${e.n}</b>${a === 'locked' ? '<i class="lk">🔒</i>' : ''}</button>`; }).join('')}</div>`, { cls: 'sheet', onClose: () => player.play() });
    m.body.querySelectorAll('[data-n]').forEach(b => b.onclick = async () => { const k = +b.dataset.n; m.close(); if (await ensureAccess(s, k)) go(`/ver/${slug}/${k}`); });
  };
  return () => player.destroy();
}
