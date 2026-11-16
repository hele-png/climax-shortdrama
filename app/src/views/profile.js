import { getCatalog, getSeries, coverHTML } from '../data.js';
import { user, seriesProgress, resetUser } from '../store.js';
import { monetization } from '../monetization.js';
import { checkout } from './paywall.js';
import { openModal } from '../modal.js';
import { esc, eur, toast, num } from '../util.js';
import { topbar } from './common.js';

const ago = (t) => { const m = Math.round((Date.now() - t) / 6e4); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
export function renderProfile(view) {
  const draw = () => {
    const u = user(), w = monetization.syncWallet, cfg = monetization.config, sub = w.subscription, vip = monetization.hasSubscription();
    const cat = getCatalog();
    const started = cat.map(s => ({ s, p: seriesProgress(s) })).filter(x => x.p.lastEp);
    const allEps = Object.values(u.progress).flatMap(p => Object.values(p.eps));
    const watched = allEps.filter(e => e.completion >= 0.9).length;
    const minutes = Math.round(cat.reduce((acc, s) => acc + Object.entries(u.progress[s.id]?.eps || {}).reduce((a, [n, e]) => a + e.completion * (s.episodes.find(x => x.n === +n)?.durationSec || 90), 0), 0) / 60);
    const ci = monetization.checkInStatus();
    view.innerHTML = `${topbar()}
    <div class="pad profile">
      <div class="pf-head"><div class="avatar xl"><span>${esc(u.name[0])}</span></div><div><h2>${esc(u.name)}</h2><small class="muted">ID ${u.createdAt.toString(36).toUpperCase()} · ${vip ? '👑 Miembro VIP' : 'Cuenta gratuita'}</small></div></div>
      <div class="stats3"><div><b>${watched}</b><small>Episodios vistos</small></div><div><b>${minutes}</b><small>Minutos</small></div><div><b>${started.length}</b><small>Series</small></div></div>

      <div class="vip-card ${vip ? 'on' : ''}">
        <div><div class="vip-t">👑 VIP Mensual</div>
        ${vip ? `<small>${sub.status === 'canceled' ? 'Cancelada · acceso hasta' : 'Se renueva el'} ${new Date(sub.renewsAt).toLocaleDateString('es-ES')}</small>` : `<small>Todo desbloqueado · sin anuncios · ${eur(cfg.plans[0].price)}/mes</small>`}</div>
        ${vip ? (sub.status === 'canceled' ? '<span class="pill">Cancelada</span>' : '<button class="btn sm ghost" id="cancel">Cancelar</button>') : '<button class="btn sm gold" id="sub">Hazte VIP</button>'}
      </div>

      <div class="wallet">
        <div class="wl-top"><div><small class="muted">Mis coins</small><div class="wl-bal"><span class="coin-ic">◉</span> <b data-coins>${w.coins}</b></div><small class="muted">1 episodio = ${cfg.coinCost} coins · anuncios hoy: ${monetization.adsLeft()}/${cfg.adsPerDay}</small></div><button class="btn sm red" id="topup">Recargar</button></div>
        <div class="checkin"><div class="ci-days">${cfg.checkInRewards.map((r, i) => `<div class="ci-d ${i < ci.streak % 7 || (ci.done && i < ci.streak) ? 'done' : ''} ${!ci.done && i === ci.streak % 7 ? 'next' : ''}"><small>D${i + 1}</small><b>+${r}</b></div>`).join('')}</div>
          <button class="btn block ${ci.done ? 'ghost' : 'gold'}" id="ci" ${ci.done ? 'disabled' : ''}>${ci.done ? '✓ Check-in hecho hoy · vuelve mañana' : `🎁 Check-in diario: +${ci.next} coins`}</button></div>
      </div>

      <h3 class="h3">Mi progreso</h3>
      ${started.length ? started.map(({ s, p }) => `<a class="prog-row" href="#/serie/${s.slug}">${coverHTML(s, 'thumb')}<div class="grow"><b>${esc(s.title)}</b><small class="muted">Ep. ${p.lastEp} de ${s.totalEpisodes} · ${p.watched} completados</small><div class="bar"><i style="width:${Math.max(3, p.pct * 100)}%"></i></div></div><span>›</span></a>`).join('') : '<div class="empty sm">Todavía no has empezado ninguna serie.</div>'}

      <h3 class="h3">Historial</h3>
      <div class="list">${u.history.slice(0, 15).map(hh => { const s = getSeries(hh.seriesId); return s ? `<a class="li" href="#/ver/${s.slug}/${hh.n}"><span>${esc(s.title)} · Ep. ${hh.n}</span><small class="muted">${Math.round(hh.completion * 100)} % · ${ago(hh.at)}</small></a>` : ''; }).join('') || '<div class="empty sm">Sin historial.</div>'}</div>

      <h3 class="h3">Movimientos</h3>
      <div class="list">${w.transactions.slice(0, 15).map(t => `<div class="li"><span>${esc(t.label)}</span><small class="${t.coins > 0 ? 'pos' : t.coins < 0 ? 'neg' : 'muted'}">${t.coins ? (t.coins > 0 ? '+' : '') + t.coins + ' ◉' : ''}${t.eur ? ' ' + eur(t.eur) : ''}</small></div>`).join('')}</div>

      <div class="pf-links"><a class="btn ghost" href="#/dashboard">📊 Dashboard</a><a class="btn ghost" href="#/admin">⚙️ Admin</a><a class="btn ghost" href="#/guiones">📜 Guiones</a><button class="btn ghost" onclick="__promptInstall()">⤓ Instalar app</button></div>
      <button class="btn block danger" id="reset">Reiniciar demo</button>
      <p class="tiny muted center">Prototipo · datos guardados en este dispositivo (localStorage) · pagos simulados</p>
    </div>`;
    view.querySelector('#sub')?.addEventListener('click', async () => { const p = cfg.plans[0]; if (await checkout(p.name, p.price, 'Renovación mensual. Cancela cuando quieras.')) { await monetization.startSubscription(p.id); toast('👑 ¡Bienvenida a VIP!', 'ok'); draw(); } });
    view.querySelector('#cancel')?.addEventListener('click', async () => { await monetization.cancelSubscription(); toast('Suscripción cancelada. Seguirá activa hasta fin de periodo.'); draw(); });
    view.querySelector('#ci')?.addEventListener('click', async () => { const r = await monetization.dailyCheckIn(); if (r.ok) toast(`🎁 +${r.reward} coins`, 'ok'); draw(); });
    view.querySelector('#topup').onclick = () => {
      const m = openModal(`<h3>Recargar coins</h3><div class="packs big">${cfg.coinPacks.map(p => `<button class="pack" data-pack="${p.id}">${p.badge ? `<i>${p.badge}</i>` : ''}<b>◉ ${p.coins}</b>${p.bonus ? `<small>+${p.bonus} extra</small>` : '<small>&nbsp;</small>'}<span>${eur(p.price)}</span></button>`).join('')}</div><p class="tiny muted center">Compras simuladas</p>`, { cls: 'sheet' });
      m.body.querySelectorAll('[data-pack]').forEach(b => b.onclick = async () => { const p = cfg.coinPacks.find(x => x.id === b.dataset.pack); if (await checkout(`${p.coins + p.bonus} coins`, p.price)) { await monetization.purchaseCoinPack(p.id); toast(`+${p.coins + p.bonus} coins`, 'ok'); m.close(); draw(); } });
    };
    view.querySelector('#reset').onclick = async () => { if (!confirm('¿Reiniciar la demo? Se borrarán progreso, coins y suscripción.')) return; resetUser(); await monetization.reset(); toast('Demo reiniciada'); draw(); };
  };
  draw();
}
