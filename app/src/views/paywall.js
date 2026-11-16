// Paywall con las 3 opciones: VIP, coins y anuncio rewarded. Devuelve Promise<boolean> (true = desbloqueado)
import { monetization } from '../monetization.js';
import { openModal } from '../modal.js';
import { coverHTML } from '../data.js';
import { esc, eur, toast, num } from '../util.js';
import { ic, coinIc } from '../icons.js';

export const packHTML = (p) => `<button class="pack ${/mejor/i.test(p.badge || '') ? 'hot' : ''}" data-pack="${p.id}">${p.badge ? `<span class="pack-badge">${esc(p.badge)}</span>` : ''}<span class="pack-c">${coinIc(18)}<b>${num(p.coins)}</b></span><small>${p.bonus ? `+${num(p.bonus)} de regalo` : 'Sin bonus'}</small><span class="pack-p">${eur(p.price)}</span></button>`;
export function openPaywall(series, n) {
  return new Promise((resolve) => {
    monetization.trackPaywall('view', { seriesId: series.id, n });
    const ep = series.episodes.find(e => e.n === n) || { title: '', hook: '' };
    let done = false;
    const m = openModal('', { cls: 'paywall', onClose: () => { if (!done) { monetization.trackPaywall('dismiss', { seriesId: series.id, n }); resolve(false); } } });
    const finish = (msg) => { done = true; toast(msg, 'ok'); m.close(); resolve(true); };
    const render = () => {
      const c = monetization.config, w = monetization.syncWallet, plan = c.plans[0];
      const enough = w.coins >= c.coinCost, ads = monetization.adsLeft();
      m.body.innerHTML = `
        <div class="pw-head">${coverHTML(series, 'pw-cover')}<div class="pw-head-t">
          <small>${esc(series.title)}</small>
          <h2>Episodio ${n} · ${esc(ep.title)}</h2>
          <p>${esc(ep.hook)}</p></div></div>
        <div class="pw-bal"><span>Precio del episodio <b>${coinIc(14)} ${c.coinCost}</b></span><span>Tu saldo <b class="${enough ? '' : 'neg'}">${coinIc(14)} ${num(w.coins)}</b></span></div>
        <button class="pw-opt coins ${enough ? 'primary' : 'dim'}" data-a="coins">
          <span class="pw-txt"><b>${enough ? `Desbloquear por ${c.coinCost} coins` : `Te faltan ${c.coinCost - w.coins} coins`}</b><small>${enough ? `Te quedarán ${w.coins - c.coinCost} coins` : 'Recarga para seguir viendo'}</small></span>
          <span class="pw-cta">${enough ? ic('lock-open', 20) : 'Recargar'}</span>
        </button>
        <button class="pw-opt vip" data-a="sub">
          <span class="pw-ico">${ic('crown-f', 20)}</span>
          <span class="pw-txt"><b>${esc(plan.name)} <em>${eur(plan.price)}/${plan.period}</em></b><small>Todas las series sin esperas ni anuncios. Cancela cuando quieras.</small></span>
          ${plan.badge ? `<span class="pw-badge">${esc(plan.badge)}</span>` : ''}${ic('chevron-right', 18, 'pw-go')}
        </button>
        <button class="pw-opt ad ${ads ? '' : 'dim'}" data-a="ad" ${ads ? '' : 'disabled'}>
          <span class="pw-ico">${ic('ad-2', 20)}</span>
          <span class="pw-txt"><b>Ver un anuncio de ${c.adDurationSec} s</b><small>${ads ? `Desbloqueo gratis · ${ads} de ${c.adsPerDay} disponibles hoy` : 'Has usado todos los anuncios de hoy'}</small></span>${ic('chevron-right', 18, 'pw-go')}
        </button>
        <div class="pw-packs">
          <div class="pw-sec">Recargar coins</div>
          <div class="packs">${c.coinPacks.map(packHTML).join('')}</div>
        </div>
        <p class="fine center">Pagos simulados en este prototipo. No se realiza ningún cargo.</p>`;
      m.body.querySelector('[data-a=sub]').onclick = async () => { if (await checkout(`${plan.name}`, plan.price, `Renovación automática cada ${plan.period}. Cancela cuando quieras.`)) { await monetization.startSubscription(plan.id); finish('Ya eres VIP. Todo desbloqueado'); } };
      m.body.querySelector('[data-a=coins]').onclick = async () => {
        const r = await monetization.unlockWithCoins(series, n);
        if (r.ok) finish(`Episodio desbloqueado · saldo ${r.balance} coins`);
        else { m.body.querySelector('.pw-packs').scrollIntoView({ behavior: 'smooth' }); m.body.querySelector('.pw-packs').classList.add('flash'); toast('No tienes coins suficientes', 'warn'); }
      };
      m.body.querySelector('[data-a=ad]').onclick = async () => { if (await watchAd(series, n)) finish('Episodio desbloqueado con el anuncio'); };
      m.body.querySelectorAll('[data-pack]').forEach(b => b.onclick = async () => {
        const p = c.coinPacks.find(x => x.id === b.dataset.pack);
        if (await checkout(`${p.coins + p.bonus} coins`, p.price, 'Compra única dentro de la app.')) { await monetization.purchaseCoinPack(p.id); toast(`+${p.coins + p.bonus} coins añadidos`, 'ok'); render(); }
      });
    };
    render();
  });
}

/** Checkout simulado (en producción: StoreKit / Google Play Billing / Stripe Checkout) */
export function checkout(product, price, note = '') {
  return new Promise((resolve) => {
    let paid = false;
    const m = openModal(`
      <div class="checkout">
        <div class="ck-head"><small>Confirmar compra</small><h3>${esc(product)}</h3><div class="ck-price">${eur(price)}</div>${note ? `<p>${esc(note)}</p>` : ''}</div>
        <button class="btn block pay-apple" data-m="apple">${ic('brand-apple', 18)}Pagar con Apple Pay</button>
        <button class="btn block pay-google" data-m="gpay">${ic('brand-google', 18)}Pagar con Google Pay</button>
        <button class="btn block secondary" data-m="card">${ic('credit-card', 18)}Tarjeta terminada en 4242</button>
        <p class="fine center">Entorno de pruebas: no se realiza ningún cargo real.</p>
      </div>`, { cls: 'ck', onClose: () => resolve(paid) });
    m.body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      m.body.innerHTML = '<div class="ck-state"><div class="spinner"></div><p>Procesando pago…</p></div>';
      setTimeout(() => { m.body.innerHTML = `<div class="ck-state ok"><span class="ck-ok">${ic('check', 28)}</span><p>Pago completado</p></div>`; paid = true; setTimeout(() => m.close(), 750); }, 1200);
    });
  });
}

/** Anuncio rewarded simulado con cuenta atrás no saltable */
export async function watchAd(series, n) {
  const r = await monetization.requestRewardedAd(series, n);
  if (!r.ok) { toast(r.error === 'ad_limit' ? 'Has alcanzado el límite de anuncios de hoy' : 'Anuncio no disponible', 'warn'); return false; }
  return new Promise((resolve) => {
    let ok = false;
    const m = openModal(`
      <div class="ad-screen">
        <div class="ad-top"><span class="ad-label">Anuncio</span><span class="ad-timer"><span class="ad-count">${r.durationSec}</span> s</span></div>
        <div class="ad-creative"><div class="ad-logo">LUMIÈRE</div><h2>Sérum facial de noche</h2><p>Envío gratis y 30 % de descuento esta semana</p><span class="ad-fake-cta">Más información</span></div>
        <div class="ad-bar"><i></i></div>
        <button class="btn block primary" disabled>Recompensa en <span class="ad-count2">${r.durationSec}</span> s</button>
      </div>`, { cls: 'adm', dismissible: false, onClose: () => resolve(ok) });
    const t0 = Date.now(), D = r.durationSec * 1000;
    const bar = m.body.querySelector('.ad-bar i'), btn = m.body.querySelector('button');
    const tick = setInterval(async () => {
      const el = Date.now() - t0, left = Math.max(0, Math.ceil((D - el) / 1000));
      bar.style.width = Math.min(100, el / D * 100) + '%';
      m.body.querySelector('.ad-count').textContent = left; const c2 = m.body.querySelector('.ad-count2'); if (c2) c2.textContent = left;
      if (el >= D) {
        clearInterval(tick);
        const res = await monetization.completeRewardedAd(r.adSessionId);
        ok = res.ok; btn.disabled = false; btn.textContent = ok ? 'Recompensa obtenida · Continuar' : 'No se pudo verificar el anuncio';
        btn.onclick = () => m.close();
      }
    }, 200);
  });
}

/** Garantiza acceso: devuelve true si se puede ver (directamente o tras el paywall) */
export async function ensureAccess(series, n) {
  const { allowed } = await monetization.canWatch(series, n);
  return allowed || openPaywall(series, n);
}
