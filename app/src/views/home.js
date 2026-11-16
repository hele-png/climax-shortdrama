import { getCatalog, niches, keyArt, genre, scenes, artHTML } from '../data.js';
import { continueWatching, toggleFav, isFav, seriesProgress } from '../store.js';
import { recommend } from '../recommend.js';
import { monetization } from '../monetization.js';
import { esc, toast } from '../util.js';
import { ic, coinIc } from '../icons.js';
import { topbar, card, row, fakeViews, fmtViews, rating, tagOf, empty } from './common.js';

const more = (href) => `<a class="row-more" href="${href}">Ver todo${ic('chevron-right', 16)}</a>`;

export function renderHome(view, filter = 'Todo') {
  const cat = getCatalog();
  if (!cat.length) { view.innerHTML = topbar() + empty('movie', 'No hay series todavía', 'Añádelas desde el panel de administración.', '<a class="btn sm" href="#/admin">Abrir admin</a>'); return; }
  const cont = continueWatching(cat);
  const recs = recommend(cat, 10);
  const featured = recs.slice(0, Math.min(5, cat.length)).map(r => r.s);
  const top = [...cat].sort((a, b) => fakeViews(b) - fakeViews(a));
  const ci = monetization.checkInStatus();
  const free = monetization.config.freeEpisodes;
  // escenas clave intercaladas por serie (una de cada serie por turno)
  const pools = cat.map(s => scenes(s).slice(1).map(x => ({ ...x, s }))); const clips = [];
  for (let k = 0; clips.length < 10 && pools.some(p => p.length); k++) for (const p of pools) if (p.length && clips.length < 10) clips.push(p.shift());
  view.innerHTML = `${topbar('', { over: true })}
    <section class="hero" aria-roledescription="carrusel">
      <div class="hero-track">${featured.map((s, i) => { const p = seriesProgress(s); const t = i === 0 ? 'Nº 1 en España hoy' : tagOf(s); return `
        <article class="hero-slide">
          <a class="hero-link" href="#/serie/${s.slug}" aria-label="${esc(s.title)}"></a>
          <img class="hero-img" src="${keyArt(s)}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>
          <div class="hero-scrim"></div>
          <div class="hero-info">
            <div class="hero-kicker">${t ? `<span class="tag tag-solid">${esc(t)}</span>` : ''}<span>${esc(genre(s.niche))}</span><i></i><span>${s.totalEpisodes} episodios</span></div>
            <h2 class="hero-title">${esc(s.title)}</h2>
            <p class="hero-sub">${esc(s.logline)}</p>
            <div class="hero-cta">
              <a class="btn primary" href="#/ver/${s.slug}/${p.resumeEp || 1}">${ic('player-play-f', 18)}${p.lastEp ? `Continuar · Ep. ${p.resumeEp}` : 'Ver episodio 1'}</a>
              <button class="btn secondary icon-only" data-fav="${s.id}" aria-label="Mi lista">${ic(isFav(s.id) ? 'bookmark-f' : 'bookmark', 20)}</button>
            </div>
          </div>
        </article>`; }).join('')}</div>
      <div class="hero-dots">${featured.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
    </section>
    <nav class="chips" aria-label="Géneros">${['Todo', ...niches()].map(n => `<button class="chip ${n === filter ? 'on' : ''}" data-n="${esc(n)}">${esc(n === 'Todo' ? 'Todo' : genre(n))}</button>`).join('')}</nav>
    <div id="rows">${filter !== 'Todo' ? `<div class="grid pad">${cat.filter(s => s.niche === filter).map(s => card(s)).join('')}</div>` : `
      ${row('Continuar viendo', cont.map(x => card(x.s, { showProgress: true })))}
      ${!ci.done ? `<button class="reward-row" id="ci"><span class="rr-ic">${ic('gift', 20)}</span><span class="rr-t"><b>Recompensa diaria</b><small>Día ${ci.streak % 7 + 1} de 7 · no pierdas la racha</small></span><span class="rr-v">${coinIc(14)}+${ci.next}</span></button>` : ''}
      ${row('Recomendado para ti', recs.map(r => card(r.s, { reason: r.reason })))}
      ${row(`Top ${Math.min(10, top.length)} en España`, top.slice(0, 10).map((s, i) => card(s, { rank: i + 1 })))}
      ${row('Escenas que están arrasando', clips.map(c => `<a class="clip" href="#/ver/${c.s.slug}/${c.episode || 1}">${artHTML({ url: c.url, key: c.s.slug, cls: 'clip-art' })}<span class="clip-ep">${ic('player-play-f', 10)}Ep. ${c.episode || 1}</span><span class="clip-t"><b>${esc(c.s.title)}</b><small>${esc((c.label || '').replace(/^Ep\.\s*\d+\s*[—-]\s*/, ''))}</small></span></a>`))}
      ${row('Estrenos de la semana', [...cat].reverse().map(s => card(s, { reason: `Estreno · ${free} ep. gratis` })))}
      <section class="row"><div class="row-h"><h2>Todas las series</h2><span class="row-more">${cat.length} títulos</span></div><div class="grid pad">${cat.map(s => card(s)).join('')}</div></section>
      <section class="row"><div class="row-h"><h2>Detrás de las series</h2></div>
        <a class="list-item boxed" href="#/guiones"><span class="li-ic">${ic('script', 20)}</span><span class="li-t"><b>Guiones y biblias</b><small>Lee los ${cat.reduce((a, s) => a + s.episodes.filter(e => e.script).length, 0)} guiones completos o descárgalos</small></span>${ic('chevron-right', 18, 'li-go')}</a>
      </section>`}
    </div>
    <footer class="foot"><span>CLÍMAX · prototipo</span><a href="#/dashboard">Dashboard</a><a href="#/admin">Admin</a><a href="#/guiones">Guiones</a></footer>`;
  const track = view.querySelector('.hero-track'), dots = [...view.querySelectorAll('.hero-dots i')];
  track.addEventListener('scroll', () => { const i = Math.round(track.scrollLeft / track.clientWidth); dots.forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
  const timer = setInterval(() => { if (!document.body.contains(track) || document.hidden) return; const i = (Math.round(track.scrollLeft / track.clientWidth) + 1) % featured.length; track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); }, 6000);
  view.querySelectorAll('[data-fav]').forEach(b => b.onclick = (e) => { e.preventDefault(); const on = toggleFav(b.dataset.fav); b.innerHTML = ic(on ? 'bookmark-f' : 'bookmark', 20); toast(on ? 'Añadida a Mi lista' : 'Quitada de Mi lista'); });
  view.querySelector('#ci')?.addEventListener('click', async () => { const r = await monetization.dailyCheckIn(); if (r.ok) { toast(`+${r.reward} coins · racha de ${r.streak} días`, 'ok'); view.querySelector('#ci')?.remove(); } });
  view.querySelectorAll('.chip').forEach(c => c.onclick = () => { clearInterval(timer); const y = view.querySelector('.chips').offsetTop; renderHome(view, c.dataset.n); window.scrollTo(0, y - 56); });
  return () => clearInterval(timer);
}
