import { getCatalog, coverHTML, niches } from '../data.js';
import { continueWatching } from '../store.js';
import { recommend } from '../recommend.js';
import { monetization } from '../monetization.js';
import { esc, toast } from '../util.js';
import { topbar, card, row, fakeViews, fmtViews } from './common.js';

export function renderHome(view) {
  const cat = getCatalog();
  if (!cat.length) { view.innerHTML = topbar() + '<div class="empty">No hay series todavía. Añádelas en <a href="#/admin">Admin</a>.</div>'; return; }
  const cont = continueWatching(cat);
  const recs = recommend(cat, 10);
  const featured = recs.slice(0, Math.min(5, cat.length)).map(r => r.s);
  const top = [...cat].sort((a, b) => fakeViews(b) - fakeViews(a));
  const ci = monetization.checkInStatus();
  view.innerHTML = `${topbar()}
    <section class="hero-car">
      <div class="hero-track">${featured.map((s, i) => `
        <a class="hero-slide" href="#/serie/${s.slug}">
          ${coverHTML(s, 'hero-art')}
          <div class="hero-grad"></div>
          <div class="hero-info">
            <span class="pill red">${i === 0 ? '🔥 Nº1 hoy' : esc(s.niche)}</span>
            <h2>${esc(s.title)}</h2>
            <p>${esc(s.logline)}</p>
            <div class="hero-meta"><span>▶ ${fmtViews(fakeViews(s))}</span><span>${s.totalEpisodes} episodios</span><span>${monetization.config.freeEpisodes} gratis</span></div>
            <span class="btn red">▶ Ver ahora</span>
          </div>
        </a>`).join('')}</div>
      <div class="hero-dots">${featured.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
    </section>
    ${!ci.done ? `<button class="checkin-banner" id="ci"><span>🎁</span><div><b>Check-in diario</b><small>Recoge +${ci.next} coins · racha de ${ci.streak} días</small></div><span class="btn sm gold">Recoger</span></button>` : ''}
    <div class="chips">${['Todo', ...niches()].map((n, i) => `<button class="chip ${i ? '' : 'on'}" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>
    <div id="rows">
      ${row('Continuar viendo', cont.map(x => card(x.s, { showProgress: true })))}
      ${row('Recomendado para ti', recs.map(r => card(r.s, { reason: r.reason })), '<span class="tiny muted">según lo que ves</span>')}
      ${row('Top 10 en España hoy', top.slice(0, 10).map((s, i) => card(s, { rank: i + 1 })))}
      ${niches().map(n => row(esc(n), cat.filter(s => s.niche === n).map(s => card(s)))).join('')}
      ${row('Estrenos', [...cat].reverse().map(s => card(s, { reason: 'Nuevo' })))}
    </div>
    <a class="guiones-banner" href="#/guiones"><span>📜</span><div><b>Lee los guiones</b><small>Biblias, 166 episodios y 50 guiones completos · descarga en .zip</small></div><span>›</span></a>
    <footer class="foot tiny muted">CLÍMAX · prototipo · <a href="#/dashboard">Dashboard</a> · <a href="#/admin">Admin</a> · <a href="#/guiones">Guiones</a></footer>`;
  // carrusel
  const track = view.querySelector('.hero-track'), dots = [...view.querySelectorAll('.hero-dots i')];
  track.addEventListener('scroll', () => { const i = Math.round(track.scrollLeft / track.clientWidth); dots.forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
  const timer = setInterval(() => { if (!document.body.contains(track)) return; const i = (Math.round(track.scrollLeft / track.clientWidth) + 1) % featured.length; track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); }, 5000);
  view.querySelector('#ci')?.addEventListener('click', async (e) => { const r = await monetization.dailyCheckIn(); if (r.ok) { toast(`🎁 +${r.reward} coins · racha ${r.streak} días`, 'ok'); e.currentTarget?.remove?.(); view.querySelector('#ci')?.remove(); } });
  view.querySelectorAll('.chip').forEach(c => c.onclick = () => {
    view.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c));
    const n = c.dataset.n;
    view.querySelector('#rows').innerHTML = n === 'Todo' ? '' : `<div class="grid">${cat.filter(s => s.niche === n).map(s => card(s)).join('')}</div>`;
    if (n === 'Todo') renderHome(view);
  });
  return () => clearInterval(timer);
}
