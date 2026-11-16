// Tienda de coins y página VIP
import { monetization } from '../monetization.js';
import { checkout, packHTML } from './paywall.js';
import { esc, eur, toast, num } from '../util.js';
import { ic, coinIc } from '../icons.js';
import { topbar } from './common.js';

const ago = (t) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
export function renderShop(view) {
  const draw = () => {
    const w = monetization.syncWallet, cfg = monetization.config, ci = monetization.checkInStatus();
    view.innerHTML = `${topbar('Coins')}
    <div class="page">
      <div class="balance">
        <small>Saldo disponible</small>
        <div class="balance-v">${coinIc(28)}<b data-coins>${num(w.coins)}</b></div>
        <p>1 episodio = ${cfg.coinCost} coins · los coins no caducan</p>
      </div>
      <h2 class="section-title">Recargar</h2>
      <div class="packs">${cfg.coinPacks.map(packHTML).join('')}</div>
      <h2 class="section-title">Consigue coins gratis</h2>
      <div class="list boxed">
        <div class="list-item"><span class="li-ic">${ic('gift', 20)}</span><span class="li-t"><b>Recompensa diaria</b><small>${ci.done ? 'Recogida hoy. Vuelve mañana.' : `Día ${ci.streak % 7 + 1} de 7 · +${ci.next} coins`}</small></span><button class="btn sm ${ci.done ? 'secondary' : 'primary'}" id="ci" ${ci.done ? 'disabled' : ''}>${ci.done ? 'Hecho' : 'Recoger'}</button></div>
        <a class="list-item" href="#/vip"><span class="li-ic gold">${ic('crown', 20)}</span><span class="li-t"><b>Hazte VIP</b><small>Todo desbloqueado por ${eur(cfg.plans[0].price)}/mes</small></span>${ic('chevron-right', 18, 'li-go')}</a>
      </div>
      <h2 class="section-title">Movimientos</h2>
      <div class="list boxed">${w.transactions.slice(0, 12).map(t => `<div class="list-item tx"><span class="li-t"><b>${esc(t.label)}</b><small>${ago(t.at)}</small></span><span class="tx-v ${t.coins > 0 ? 'pos' : t.coins < 0 ? 'neg' : ''}">${t.coins ? (t.coins > 0 ? '+' : '') + num(t.coins) : ''}${t.eur ? ` <em>${eur(t.eur)}</em>` : ''}</span></div>`).join('')}</div>
      <p class="fine center">Compras simuladas en este prototipo.</p>
    </div>`;
    view.querySelectorAll('[data-pack]').forEach(b => b.onclick = async () => { const p = cfg.coinPacks.find(x => x.id === b.dataset.pack); if (await checkout(`${p.coins + p.bonus} coins`, p.price, 'Compra única dentro de la app.')) { await monetization.purchaseCoinPack(p.id); toast(`+${p.coins + p.bonus} coins añadidos`, 'ok'); draw(); } });
    view.querySelector('#ci')?.addEventListener('click', async () => { const r = await monetization.dailyCheckIn(); if (r.ok) toast(`+${r.reward} coins`, 'ok'); draw(); });
  };
  draw();
}

export function renderVip(view) {
  const draw = () => {
    const w = monetization.syncWallet, cfg = monetization.config, plan = cfg.plans[0], sub = w.subscription, vip = monetization.hasSubscription();
    const perks = [['lock-open', 'Todos los episodios', 'Sin esperas, sin coins y sin anuncios en todas las series.'], ['flame', 'Estrenos antes que nadie', 'Los episodios nuevos te llegan 48 horas antes.'], ['ad-2', 'Sin anuncios', 'Ni antes ni entre episodios.'], ['device-mobile-down', 'En todos tus dispositivos', 'Tu progreso y tu lista sincronizados.']];
    view.innerHTML = `${topbar('VIP')}
    <div class="page vip-page">
      <div class="vip-hero">
        <span class="vip-mark">${ic('crown-f', 22)}CLÍMAX VIP</span>
        <h1>${vip ? 'Eres miembro VIP' : 'Mira todo, sin esperar'}</h1>
        <p>${vip ? (sub.status === 'canceled' ? `Cancelada. Mantienes el acceso hasta el ${new Date(sub.renewsAt).toLocaleDateString('es-ES')}.` : `Tu plan se renueva el ${new Date(sub.renewsAt).toLocaleDateString('es-ES')}.`) : 'Un solo plan con todas las series y todos los episodios incluidos.'}</p>
      </div>
      <div class="plan ${vip ? 'active' : ''}">
        <div class="plan-h"><b>${esc(plan.name)}</b>${plan.badge && !vip ? `<span class="tag tag-solid">${esc(plan.badge)}</span>` : ''}${vip ? '<span class="tag tag-ok">Activo</span>' : ''}</div>
        <div class="plan-p"><b>${eur(plan.price)}</b><span>/${plan.period}</span></div>
        <small>Renovación automática. Cancela cuando quieras.</small>
      </div>
      <ul class="perks">${perks.map(([i, t, d]) => `<li>${ic(i, 20)}<span><b>${t}</b><small>${d}</small></span></li>`).join('')}</ul>
      ${vip ? (sub.status === 'canceled' ? '' : '<button class="btn block secondary" id="cancel">Cancelar suscripción</button>') : `<button class="btn block primary lg" id="sub">Suscribirme por ${eur(plan.price)}/${plan.period}</button>`}
      <p class="fine center">Pago simulado. En producción se cobra con App Store, Google Play o Stripe.</p>
    </div>`;
    view.querySelector('#sub')?.addEventListener('click', async () => { if (await checkout(plan.name, plan.price, 'Renovación mensual. Cancela cuando quieras.')) { await monetization.startSubscription(plan.id); toast('Bienvenida a VIP', 'ok'); draw(); } });
    view.querySelector('#cancel')?.addEventListener('click', async () => { await monetization.cancelSubscription(); toast('Suscripción cancelada. Seguirá activa hasta fin de periodo.'); draw(); });
  };
  draw();
}
