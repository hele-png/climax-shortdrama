import { getSeries, charUrl, scenes, artHTML, keyArt, genre, coverHTML } from '../data.js';
import { seriesProgress, epCompletion, toggleFav, isFav } from '../store.js';
import { monetization } from '../monetization.js';
import { ensureAccess } from './paywall.js';
import { esc, toast, fmtTime } from '../util.js';
import { ic, coinIc } from '../icons.js';
import { go, back, fakeViews, fmtViews, rating, tagOf } from './common.js';

const RANGE = 30;
export function renderSeries(view, slug) {
  const s = getSeries(slug); if (!s) { go('/'); return; }
  let tab = 'eps', mode = 'grid', range = 0;
  const draw = () => {
    const p = seriesProgress(s), cfg = monetization.config, vip = monetization.hasSubscription();
    const sc = scenes(s);
    const planned = Array.from({ length: s.totalEpisodes }, (_, i) => s.episodes.find(e => e.n === i + 1) || { n: i + 1, planned: true });
    const ranges = Array.from({ length: Math.ceil(planned.length / RANGE) }, (_, i) => [i * RANGE + 1, Math.min(planned.length, (i + 1) * RANGE)]);
    const tag = tagOf(s);
    const resume = p.resumeEp || 1;
    view.innerHTML = `
    <header class="topbar over float" id="sdtop">
      <button class="tb-back round" onclick="__back()" aria-label="Atrás">${ic('chevron-left', 24)}</button><h1 class="tb-title float-t">${esc(s.title)}</h1><span class="spacer"></span>
      <button class="tb-back round" id="share" aria-label="Compartir">${ic('share-3', 20)}</button>
    </header>
    <section class="sd-hero">
      <img class="sd-img" src="${keyArt(s)}" alt="">
      <div class="sd-scrim"></div>
    </section>
    <section class="sd-body">
      <div class="sd-head">
        ${coverHTML(s, 'sd-poster')}
        <div class="sd-head-t">
          ${tag ? `<span class="tag tag-${tag.toLowerCase()}">${esc(tag)}</span>` : ''}
          <h1 class="sd-title">${esc(s.title)}</h1>
          <div class="meta"><span class="rating">${ic('star-f', 13)}${rating(s)}</span><i></i><span>${fmtViews(fakeViews(s))} vistas</span><i></i><span>16+</span></div>
          <div class="meta"><span>${esc(genre(s.niche))}</span><i></i><span>${s.totalEpisodes} episodios</span></div>
        </div>
      </div>
      <button class="btn primary block lg" data-play="${resume}">${ic('player-play-f', 20)}${p.lastEp ? `Continuar · Episodio ${resume}` : 'Ver episodio 1'}</button>
      ${p.lastEp ? `<div class="sd-prog"><div class="bar"><i style="width:${Math.max(2, p.pct * 100)}%"></i></div><small>${p.watched} de ${s.totalEpisodes} vistos</small></div>` : `<p class="sd-free">${ic('lock-open', 14)}Episodios 1–${cfg.freeEpisodes} gratis${vip ? ' · VIP activo: todo desbloqueado' : ''}</p>`}
      <div class="sd-actions">
        <button id="fav" class="act ${isFav(s.id) ? 'on' : ''}">${ic(isFav(s.id) ? 'bookmark-f' : 'bookmark', 22)}<span>Mi lista</span></button>
        <a class="act" href="#/guiones/${s.slug}/biblia">${ic('script', 22)}<span>Guion</span></a>
        <button class="act" id="share2">${ic('share-3', 22)}<span>Compartir</span></button>
      </div>
      <p class="sd-syn clamp" id="syn">${esc(s.synopsis || s.logline)}</p>
      ${s.synopsis ? '<button class="link" id="synmore">Leer más</button>' : ''}
    </section>
    <nav class="tabs" role="tablist">
      <button role="tab" class="${tab === 'eps' ? 'on' : ''}" data-tab="eps">Episodios</button>
      ${s.characters.length ? `<button role="tab" class="${tab === 'cast' ? 'on' : ''}" data-tab="cast">Reparto</button>` : ''}
      ${sc.length ? `<button role="tab" class="${tab === 'scenes' ? 'on' : ''}" data-tab="scenes">Momentos</button>` : ''}
    </nav>
    <section class="pad tabpanel" ${tab === 'eps' ? '' : 'hidden'}>
      <div class="eps-bar">
        <div class="ranges">${ranges.map(([a, b], i) => `<button class="${i === range ? 'on' : ''}" data-range="${i}">${a}–${b}</button>`).join('')}</div>
        <span class="spacer"></span>
        <button class="icon-btn ${mode === 'grid' ? 'on' : ''}" data-mode="grid" aria-label="Cuadrícula">${ic('layout-grid', 18)}</button>
        <button class="icon-btn ${mode === 'list' ? 'on' : ''}" data-mode="list" aria-label="Lista">${ic('list', 18)}</button>
      </div>
      <div class="ep-grid" ${mode === 'grid' ? '' : 'hidden'}>${planned.map((e, i) => {
        const hide = Math.floor(i / RANGE) !== range ? 'hidden' : '';
        if (e.planned) return `<button class="ep planned" disabled ${hide} title="En producción"><b>${e.n}</b></button>`;
        const a = monetization.accessSync(s, e.n), c = epCompletion(s.id, e.n);
        return `<button class="ep ${a} ${p.lastEp === e.n ? 'current' : ''}" data-play="${e.n}" ${hide} aria-label="Episodio ${e.n}${a === 'locked' ? ', bloqueado' : ''}">
          ${e.video ? `<i class="ep-vid" title="Vídeo">${ic('movie', 11)}</i>` : ''}<b>${e.n}</b>${a === 'locked' ? ic('lock', 12, 'ep-lk') : a === 'subscription' ? '<i class="ep-vip">VIP</i>' : ''}
          ${c ? `<span class="epbar"><i style="width:${c * 100}%"></i></span>` : ''}</button>`;
      }).join('')}</div>
      <div class="ep-list" ${mode === 'list' ? '' : 'hidden'}>${s.episodes.filter((e) => Math.floor((e.n - 1) / RANGE) === range).map(e => {
        const a = monetization.accessSync(s, e.n);
        return `<button class="ep-row" data-play="${e.n}"><span class="ep-n">${String(e.n).padStart(2, '0')}</span><span class="ep-txt"><b>${esc(e.title)}</b><small>${esc(e.hook)}</small><em>${e.video ? '<i class="tag-vid">Vídeo</i> ' : e.audio ? 'Con audio · ' : ''}${fmtTime(e.durationSec)}${a === 'locked' ? ` · ${coinIc(11)} ${cfg.coinCost}` : a === 'free' && e.n <= cfg.freeEpisodes ? ' · Gratis' : ''}</em></span>${a === 'locked' ? ic('lock', 16, 'ep-st') : ic('player-play', 16, 'ep-st')}</button>`;
      }).join('')}</div>
      <p class="fine">${s.episodes.length < s.totalEpisodes ? `${s.episodes.length} episodios publicados · ${s.totalEpisodes - s.episodes.length} en producción. ` : ''}Desbloquea los episodios con ${coinIc(11)} ${cfg.coinCost} coins, un anuncio o con VIP.</p>
    </section>
    <section class="pad tabpanel" ${tab === 'cast' ? '' : 'hidden'}>
      <div class="cast-grid">${s.characters.map(c => `<div class="person">${charUrl(s, c) ? artHTML({ url: charUrl(s, c), key: s.slug + c.id, cls: 'person-art' }) : `<div class="art person-art noimg">${ic('user', 32)}</div>`}<b>${esc(c.name.split(/\s*\/\s*/)[0])}</b><small>${esc(c.role || 'Personaje')}</small></div>`).join('')}</div>
      <div class="cast-notes">${s.characters.map(c => `<div class="cn"><b>${esc(c.name)}</b>${c.age ? `<span>${esc(c.age)} años</span>` : ''}<p>${esc(c.summary || c.personality || '')}</p></div>`).join('')}</div>
    </section>
    <section class="pad tabpanel" ${tab === 'scenes' ? '' : 'hidden'}>
      <div class="moments">${sc.map((x, i) => `<button class="moment" data-play="${x.episode || 1}">${artHTML({ url: x.url, key: s.slug, variant: i, cls: 'moment-art' })}<span class="moment-ep">Ep. ${x.episode || 1}</span><span class="moment-t">${esc((x.label || '').replace(/^Ep\.\s*\d+\s*[—-]\s*/, ''))}</span></button>`).join('')}</div>
    </section>
    <div class="bottom-gap"></div>`;
    const q = (x) => view.querySelector(x);
    view.querySelectorAll('[data-play]').forEach(b => b.onclick = async () => { const n = +b.dataset.play; if (await ensureAccess(s, n)) go(`/ver/${s.slug}/${n}`); else draw(); });
    q('#fav').onclick = () => { const on = toggleFav(s.id); toast(on ? 'Añadida a Mi lista' : 'Quitada de Mi lista'); draw(); };
    const share = async () => { const url = location.href.split('#')[0] + `#/serie/${s.slug}`; try { await navigator.share({ title: s.title, text: s.logline, url }); } catch { navigator.clipboard?.writeText(url); toast('Enlace copiado'); } };
    q('#share').onclick = share; q('#share2').onclick = share;
    q('#synmore')?.addEventListener('click', (e) => { q('#syn').classList.toggle('clamp'); e.target.textContent = q('#syn').classList.contains('clamp') ? 'Leer más' : 'Leer menos'; });
    view.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; draw(); });
    view.querySelectorAll('[data-range]').forEach(b => b.onclick = () => { range = +b.dataset.range; draw(); });
  };
  draw();
  const onScroll = () => view.querySelector('#sdtop')?.classList.toggle('solid', scrollY > 280);
  addEventListener('scroll', onScroll, { passive: true });
  return () => removeEventListener('scroll', onScroll);
}
