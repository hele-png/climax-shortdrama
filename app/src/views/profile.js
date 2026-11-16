import { getCatalog, getSeries, coverHTML } from '../data.js';
import { user, seriesProgress, resetUser } from '../store.js';
import { monetization } from '../monetization.js';
import { esc, eur, toast, num } from '../util.js';
import { ic, coinIc } from '../icons.js';
import { topbar } from './common.js';

const ago = (t) => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
export function renderProfile(view) {
  const draw = () => {
    const u = user(), w = monetization.syncWallet, cfg = monetization.config, vip = monetization.hasSubscription();
    const cat = getCatalog();
    const started = cat.map(s => ({ s, p: seriesProgress(s) })).filter(x => x.p.lastEp);
    const allEps = Object.values(u.progress).flatMap(p => Object.values(p.eps));
    const watched = allEps.filter(e => e.completion >= 0.9).length;
    const minutes = Math.round(cat.reduce((acc, s) => acc + Object.entries(u.progress[s.id]?.eps || {}).reduce((a, [n, e]) => a + e.completion * (s.episodes.find(x => x.n === +n)?.durationSec || 90), 0), 0) / 60);
    const ci = monetization.checkInStatus();
    const day = ci.done ? (ci.streak - 1) % 7 : ci.streak % 7;
    view.innerHTML = `${topbar()}
    <div class="page profile">
      <div class="pf-head"><div class="pf-av">${esc(u.name[0])}</div><div class="pf-id"><b>${esc(u.name)}</b><small>ID ${u.createdAt.toString(36).toUpperCase()}</small></div>${vip ? `<span class="tag tag-vip">${ic('crown-f', 12)}VIP</span>` : ''}</div>
      <div class="pf-stats"><div><b>${watched}</b><small>Episodios</small></div><div><b>${minutes}</b><small>Minutos</small></div><div><b>${started.length}</b><small>Series</small></div></div>

      <div class="pf-cards">
        <a class="pf-card" href="#/tienda"><small>Mis coins</small><span class="pf-v">${coinIc(18)}<b data-coins>${num(w.coins)}</b></span><span class="pf-link">Recargar${ic('chevron-right', 14)}</span></a>
        <a class="pf-card ${vip ? 'vip' : ''}" href="#/vip"><small>Suscripción</small><span class="pf-v">${ic('crown-f', 18, 'gold')}<b>${vip ? 'VIP' : 'Gratis'}</b></span><span class="pf-link">${vip ? 'Gestionar' : `${eur(cfg.plans[0].price)}/mes`}${ic('chevron-right', 14)}</span></a>
      </div>

      <section class="checkin">
        <div class="ci-h"><b>Recompensa diaria</b><small>Racha de ${ci.streak} ${ci.streak === 1 ? 'día' : 'días'}</small></div>
        <div class="ci-days">${cfg.checkInRewards.map((r, i) => `<div class="ci-d ${i < day || (ci.done && i === day) ? 'done' : ''} ${!ci.done && i === day ? 'next' : ''}">${i < day || (ci.done && i === day) ? ic('check', 14) : coinIc(14)}<b>+${r}</b><small>Día ${i + 1}</small></div>`).join('')}</div>
        <button class="btn block ${ci.done ? 'secondary' : 'primary'}" id="ci" ${ci.done ? 'disabled' : ''}>${ci.done ? 'Recogida hoy · vuelve mañana' : `Recoger ${ci.next} coins`}</button>
      </section>

      ${started.length ? `<h2 class="section-title">Seguir viendo</h2><div class="list boxed">${started.map(({ s, p }) => `<a class="list-item prog" href="#/serie/${s.slug}">${coverHTML(s, 'li-thumb')}<span class="li-t"><b>${esc(s.title)}</b><small>Episodio ${p.lastEp} de ${s.totalEpisodes}</small><span class="bar"><i style="width:${Math.max(3, p.pct * 100)}%"></i></span></span>${ic('chevron-right', 18, 'li-go')}</a>`).join('')}</div>` : ''}

      ${u.history.length ? `<h2 class="section-title">Historial</h2><div class="list boxed">${u.history.slice(0, 6).map(hh => { const s = getSeries(hh.seriesId); return s ? `<a class="list-item" href="#/ver/${s.slug}/${hh.n}"><span class="li-t"><b>${esc(s.title)}</b><small>Episodio ${hh.n} · ${Math.round(hh.completion * 100)} % · ${ago(hh.at)}</small></span>${ic('player-play', 18, 'li-go')}</a>` : ''; }).join('')}</div>` : ''}

      <h2 class="section-title">Más</h2>
      <div class="list boxed">
        <a class="list-item" href="#/lista"><span class="li-ic">${ic('bookmark', 20)}</span><span class="li-t"><b>Mi lista</b></span>${ic('chevron-right', 18, 'li-go')}</a>
        <a class="list-item" href="#/tienda"><span class="li-ic">${ic('receipt', 20)}</span><span class="li-t"><b>Movimientos de coins</b></span>${ic('chevron-right', 18, 'li-go')}</a>
        <a class="list-item" href="#/guiones"><span class="li-ic">${ic('script', 20)}</span><span class="li-t"><b>Guiones y biblias</b></span>${ic('chevron-right', 18, 'li-go')}</a>
        <button class="list-item" onclick="__promptInstall()"><span class="li-ic">${ic('device-mobile-down', 20)}</span><span class="li-t"><b>Instalar la app</b></span>${ic('chevron-right', 18, 'li-go')}</button>
      </div>
      <h2 class="section-title">Equipo</h2>
      <div class="list boxed">
        <a class="list-item" href="#/dashboard"><span class="li-ic">${ic('chart-bar', 20)}</span><span class="li-t"><b>Dashboard</b><small>Contenido, retención e ingresos</small></span>${ic('chevron-right', 18, 'li-go')}</a>
        <a class="list-item" href="#/admin"><span class="li-ic">${ic('settings', 20)}</span><span class="li-t"><b>Administración</b><small>Series, episodios y precios</small></span>${ic('chevron-right', 18, 'li-go')}</a>
        <button class="list-item danger" id="reset"><span class="li-ic">${ic('refresh', 20)}</span><span class="li-t"><b>Reiniciar demo</b><small>Borra progreso, coins y suscripción</small></span></button>
      </div>
      <p class="fine center">Prototipo · los datos se guardan en este dispositivo · pagos simulados</p>
    </div>`;
    view.querySelector('#ci')?.addEventListener('click', async () => { const r = await monetization.dailyCheckIn(); if (r.ok) toast(`+${r.reward} coins`, 'ok'); draw(); });
    view.querySelector('#reset').onclick = async () => { if (!confirm('¿Reiniciar la demo? Se borrarán progreso, coins y suscripción.')) return; resetUser(); await monetization.reset(); toast('Demo reiniciada'); draw(); };
  };
  draw();
}
