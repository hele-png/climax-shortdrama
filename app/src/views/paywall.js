// Paywall con las 3 opciones: VIP, coins y anuncio rewarded. Devuelve Promise<boolean> (true = desbloqueado)
import { monetization } from '../monetization.js';
import { openModal } from '../modal.js';
import { coverHTML } from '../data.js';
import { esc, eur, toast } from '../util.js';

const coin = '<span class="coin-ic">◉</span>';
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
        <div class="pw-hero">${coverHTML(series, 'pw-cover')}<div class="pw-hero-txt">
          <div class="pill gold">🔒 Episodio ${n} bloqueado</div>
          <h2>${esc(ep.title)}</h2><p class="muted">${esc(ep.hook)}</p></div></div>
        <button class="pw-opt vip" data-a="sub">
          <div class="pw-badge">${esc(plan.badge || 'VIP')}</div>
          <div class="pw-ico">👑</div>
          <div class="pw-txt"><b>${esc(plan.name)} · ${eur(plan.price)}/${plan.period}</b><span>Todos los episodios de todas las series · sin anuncios · estrenos antes que nadie</span></div>
          <div class="pw-cta">Suscribirme</div>
        </button>
        <button class="pw-opt coins ${enough ? '' : 'dim'}" data-a="coins">
          <div class="pw-ico">${coin}</div>
          <div class="pw-txt"><b>Desbloquear por ${c.coinCost} coins</b><span>Tu saldo: <b class="gold-t">${w.coins}</b> coins${enough ? '' : ` · te faltan ${c.coinCost - w.coins}`}</span></div>
          <div class="pw-cta">${enough ? 'Usar coins' : 'Recargar'}</div>
        </button>
        <button class="pw-opt ad ${ads ? '' : 'dim'}" data-a="ad" ${ads ? '' : 'disabled'}>
          <div class="pw-ico">▶</div>
          <div class="pw-txt"><b>Ver un anuncio (${c.adDurationSec} s)</b><span>Desbloquea este episodio gratis · te quedan ${ads} hoy</span></div>
          <div class="pw-cta">Ver gratis</div>
        </button>
        <div class="pw-packs" ${enough ? 'hidden' : ''}>
          <h4>Recargar coins</h4>
          <div class="packs">${c.coinPacks.map(p => `<button class="pack" data-pack="${p.id}">${p.badge ? `<i>${p.badge}</i>` : ''}<b>${coin} ${p.coins}</b>${p.bonus ? `<small>+${p.bonus} extra</small>` : '<small>&nbsp;</small>'}<span>${eur(p.price)}</span></button>`).join('')}</div>
        </div>
        <p class="tiny muted center">Pagos simulados en este prototipo · no se cobra nada</p>`;
      m.body.querySelector('[data-a=sub]').onclick = async () => { if (await checkout(`${plan.name}`, plan.price, `Renovación automática cada ${plan.period}. Cancela cuando quieras.`)) { await monetization.startSubscription(plan.id); finish('👑 ¡Ya eres VIP! Todo desbloqueado'); } };
      m.body.querySelector('[data-a=coins]').onclick = async () => {
        const r = await monetization.unlockWithCoins(series, n);
        if (r.ok) finish(`Episodio desbloqueado · saldo ${r.balance} coins`);
        else { m.body.querySelector('.pw-packs').hidden = false; m.body.querySelector('.pw-packs').scrollIntoView({ behavior: 'smooth' }); toast('No tienes coins suficientes', 'warn'); }
      };
      m.body.querySelector('[data-a=ad]').onclick = async () => { if (await watchAd(series, n)) finish('🎁 Episodio desbloqueado gracias al anuncio'); };
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
        <div class="ck-head"><span class="pill">Pago seguro · SIMULADO</span><h3>${esc(product)}</h3><div class="ck-price">${eur(price)}</div><p class="muted tiny">${esc(note)}</p></div>
        <button class="btn block apple" data-m="apple"> Pay</button>
        <button class="btn block gpay" data-m="gpay">G Pay</button>
        <button class="btn block ghost" data-m="card">💳 Tarjeta •••• 4242</button>
        <p class="tiny muted center">Al confirmar aceptas los Términos. Prototipo: no se realiza ningún cargo real.</p>
      </div>`, { cls: 'ck', onClose: () => resolve(paid) });
    m.body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      m.body.innerHTML = '<div class="ck-loading"><div class="spinner"></div><p>Procesando pago…</p></div>';
      setTimeout(() => { m.body.innerHTML = '<div class="ck-loading ok"><div class="check">✓</div><p>Pago completado</p></div>'; paid = true; setTimeout(() => m.close(), 750); }, 1200);
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
        <div class="ad-top"><span class="pill">Anuncio · simulado</span><span class="ad-count">${r.durationSec}</span></div>
        <div class="ad-creative"><div class="ad-logo">✦ LUMIÈRE</div><h2>La crema que tu piel estaba esperando</h2><p>-30 % solo hoy</p><div class="ad-shine"></div></div>
        <div class="ad-bar"><i></i></div>
        <button class="btn block gold" disabled>Recompensa en <span class="ad-count2">${r.durationSec}</span> s</button>
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
        ok = res.ok; btn.disabled = false; btn.textContent = ok ? '🎁 Recompensa obtenida · Continuar' : 'Error al verificar el anuncio';
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
