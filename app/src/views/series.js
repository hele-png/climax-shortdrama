import { getSeries, coverHTML, charHTML, charUrl, scenes, artHTML, coverUrl } from '../data.js';
import { seriesProgress, epCompletion, toggleFav, isFav } from '../store.js';
import { monetization } from '../monetization.js';
import { ensureAccess } from './paywall.js';
import { esc, toast, fmtTime } from '../util.js';
import { topbar, go, fakeViews, fmtViews } from './common.js';

export function renderSeries(view, slug) {
  const s = getSeries(slug); if (!s) { go('/'); return; }
  const draw = () => {
    const p = seriesProgress(s), cfg = monetization.config;
    const sc = scenes(s);
    const planned = Array.from({ length: s.totalEpisodes }, (_, i) => s.episodes.find(e => e.n === i + 1) || { n: i + 1, planned: true });
    view.innerHTML = `${topbar(s.title)}
    <section class="sd-hero">
      <div class="sd-bg" style="${coverUrl(s) ? `background-image:url('${coverUrl(s)}')` : ''}"></div>
      <div class="sd-top">
        ${coverHTML(s, 'sd-cover')}
        <div class="sd-info">
          <span class="pill red">${esc(s.niche)}</span>
          <h1>${esc(s.title)}</h1>
          <div class="sd-meta">▶ ${fmtViews(fakeViews(s))} · ${s.totalEpisodes} ep. · ${cfg.freeEpisodes} gratis</div>
          <div class="sd-prog"><i style="width:${p.pct * 100}%"></i></div>
          <small class="muted">${p.watched ? `${p.watched} de ${s.totalEpisodes} vistos` : 'Sin empezar'}</small>
        </div>
      </div>
      <p class="sd-logline">${esc(s.logline)}</p>
      <div class="sd-actions">
        <button class="btn red big grow" data-play="${p.resumeEp || 1}">▶ ${p.lastEp ? `Continuar Ep. ${p.resumeEp}` : 'Ver Ep. 1 gratis'}</button>
        <button class="btn ghost" id="fav">${isFav(s.id) ? '♥ En mi lista' : '♡ Mi lista'}</button>
      </div>
    </section>
    <section class="pad">
      <details class="synopsis"><summary>Sinopsis</summary><p>${esc(s.synopsis)}</p>${s.style ? `<p class="tiny muted">Estilo visual: ${esc(s.style)}</p>` : ''}</details>
      ${s.characters.length ? `<h3 class="h3">Personajes</h3><div class="hscroll chars">${s.characters.map(c => `<div class="char-card">${artHTML({ url: charUrl(s, c), key: s.slug + c.id, label: c.name.split(/\s*\/\s*/)[0], sub: c.role || '', variant: 2, cls: 'char-art' })}<div class="char-info"><span class="pill ${/protagonista/i.test(c.role || '') ? 'gold' : /antagonista|villan/i.test(c.role || '') ? 'red' : ''}">${esc(c.role || 'Personaje')}</span><b>${esc(c.name)}</b>${c.age ? `<small class="muted">${esc(c.age)} años</small>` : ''}<p>${esc(c.summary || c.personality || '')}</p></div></div>`).join('')}</div>` : ''}
      <div class="ep-head"><h3 class="h3">Episodios</h3><span class="tiny muted">${s.episodes.length} disponibles · ${s.totalEpisodes} en total</span></div>
      <div class="legend tiny"><span><i class="lg free"></i>Gratis</span><span><i class="lg unl"></i>Desbloqueado</span><span><i class="lg lock"></i>Bloqueado</span>${monetization.hasSubscription() ? '<span>👑 VIP activo</span>' : ''}</div>
      <div class="ep-grid">${planned.map(e => {
        if (e.planned) return `<button class="ep planned" disabled title="En producción"><b>${e.n}</b><small>pronto</small></button>`;
        const a = monetization.accessSync(s, e.n), c = epCompletion(s.id, e.n);
        return `<button class="ep ${a} ${p.lastEp === e.n ? 'current' : ''}" data-play="${e.n}" title="${esc(e.title)}">
          <b>${e.n}</b>${a === 'locked' ? '<i class="lk">🔒</i>' : a === 'free' && e.n <= cfg.freeEpisodes ? '<i class="fr">GRATIS</i>' : a === 'subscription' ? '<i class="vp">VIP</i>' : ''}
          ${c ? `<span class="epbar"><i style="width:${c * 100}%"></i></span>` : ''}</button>`;
      }).join('')}</div>
      <div class="ep-list">${s.episodes.slice(0, 60).map(e => {
        const a = monetization.accessSync(s, e.n);
        return `<button class="ep-row" data-play="${e.n}"><span class="ep-n">${e.n}</span><div><b>${esc(e.title)}</b><p>${esc(e.hook)}</p><small class="muted">${fmtTime(e.durationSec)} · ${e.script ? 'Guion completo' : 'Avance'}</small></div><span class="ep-st">${a === 'locked' ? '🔒' : '▶'}</span></button>`;
      }).join('')}</div>
      ${sc.length ? `<h3 class="h3">Momentos clave</h3><div class="hscroll scenes">${sc.map((x, i) => `<button class="scene-card" data-play="${x.episode || 1}">${artHTML({ url: x.url, key: s.slug, variant: i + 1, cls: 'scene-th' })}<span>${esc(x.label || 'Escena')}</span></button>`).join('')}</div>` : ''}
      <a class="btn ghost block" href="#/guiones/${s.slug}/biblia">📜 Leer la biblia y los guiones</a>
    </section>`;
    view.querySelectorAll('[data-play]').forEach(b => b.onclick = async () => { const n = +b.dataset.play; if (await ensureAccess(s, n)) go(`/ver/${s.slug}/${n}`); else draw(); });
    view.querySelector('#fav').onclick = () => { const on = toggleFav(s.id); toast(on ? 'Añadida a Mi lista' : 'Quitada de Mi lista'); draw(); };
  };
  draw();
}
