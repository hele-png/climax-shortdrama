/**
 * Módulo de monetización (simulado en cliente).
 *
 * Interfaz pública (todas async, para poder sustituir por un backend sin tocar la UI):
 *   getConfig() / setConfig(patch)
 *   getWallet()                                -> { coins, subscription, unlocked, ... }
 *   canWatch(series, n)                        -> { allowed, reason: 'free'|'subscription'|'unlocked'|'locked' }
 *   unlockWithCoins(series, n)                 -> { ok, error?, balance }
 *   startSubscription(planId)                  -> { ok, subscription }
 *   cancelSubscription()
 *   purchaseCoinPack(packId)                   -> { ok, balance }
 *   requestRewardedAd(series, n)               -> { adSessionId, durationSec }
 *   completeRewardedAd(adSessionId)            -> { ok }   (en producción: callback S2S de la red publicitaria)
 *   dailyCheckIn()                             -> { ok, reward, streak }
 *   trackPaywall(event, meta)
 *
 * En producción, LocalEntitlementProvider se sustituye por RemoteEntitlementProvider
 * (fetch a /api/entitlements, /api/wallet/unlock, /api/iap/verify, /api/ads/ssv ...).
 */
import { today } from './util.js';

export const DEFAULT_CONFIG = {
  freeEpisodes: 9,          // episodios 1..9 gratis
  useEpisodeFlags: false,   // si true, también son gratis los episodios con freeEpisode=true en data.json
  coinCost: 30,             // coins por episodio
  startCoins: 50,           // saldo de bienvenida
  adsPerDay: 5,             // límite de anuncios rewarded/día
  adDurationSec: 15,
  checkInRewards: [10, 10, 15, 15, 20, 25, 40], // racha de 7 días
  plans: [
    { id: 'monthly', name: 'VIP Mensual', price: 9.99, period: 'mes', badge: 'Más popular', trialDays: 0 },
  ],
  coinPacks: [
    { id: 'p100', coins: 100, bonus: 0, price: 1.99 },
    { id: 'p300', coins: 300, bonus: 30, price: 4.99, badge: '+10 %' },
    { id: 'p700', coins: 700, bonus: 140, price: 9.99, badge: 'Mejor valor' },
    { id: 'p1500', coins: 1500, bonus: 450, price: 19.99, badge: '+30 %' },
  ],
};
const CFG_KEY = 'sd_config_v1', WALLET_KEY = 'sd_wallet_v1';
const listeners = new Set();
const uid = () => Math.random().toString(36).slice(2, 10);

class LocalEntitlementProvider {
  constructor() { this.config = this._loadConfig(); this.wallet = this._loadWallet(); this._ads = new Map(); }
  _loadConfig() { try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CFG_KEY)) }; } catch { return { ...DEFAULT_CONFIG }; } }
  _freshWallet() { return { coins: this.config.startCoins, subscription: null, unlocked: {}, transactions: [{ id: uid(), type: 'bonus', label: 'Regalo de bienvenida', coins: this.config.startCoins, at: Date.now() }], ads: { date: today(), count: 0 }, checkIn: { last: null, streak: 0 }, paywall: [] }; }
  _loadWallet() { try { const w = JSON.parse(localStorage.getItem(WALLET_KEY)); if (w) return w; } catch {} const w = this._freshWallet(); localStorage.setItem(WALLET_KEY, JSON.stringify(w)); return w; }
  _save() { this._expire(); localStorage.setItem(WALLET_KEY, JSON.stringify(this.wallet)); listeners.forEach(f => f(this.wallet)); }
  _expire() { const s = this.wallet.subscription; if (s && s.status === 'canceled' && s.renewsAt < Date.now()) this.wallet.subscription = null; }
  _tx(type, label, coins = 0, eur = 0, meta = {}) { this.wallet.transactions.unshift({ id: uid(), type, label, coins, eur, at: Date.now(), ...meta }); this.wallet.transactions = this.wallet.transactions.slice(0, 200); }

  async getConfig() { return this.config; }
  async setConfig(patch) { this.config = { ...this.config, ...patch }; const { plans, coinPacks, checkInRewards, ...rest } = this.config; localStorage.setItem(CFG_KEY, JSON.stringify({ ...rest, plans, coinPacks, checkInRewards })); listeners.forEach(f => f(this.wallet)); return this.config; }
  async getWallet() { this._expire(); return this.wallet; }
  get syncWallet() { return this.wallet; }

  hasSubscription() { const s = this.wallet.subscription; return !!s && s.renewsAt > Date.now(); }
  isFree(series, n) { const e = series.episodes.find(x => x.n === n); return n <= this.config.freeEpisodes || (this.config.useEpisodeFlags && !!e?.freeEpisode); }
  isUnlocked(series, n) { return (this.wallet.unlocked[series.id] || []).includes(n); }
  /** Versión síncrona para pintar candados en la UI */
  accessSync(series, n) {
    if (this.isFree(series, n)) return 'free';
    if (this.hasSubscription()) return 'subscription';
    if (this.isUnlocked(series, n)) return 'unlocked';
    return 'locked';
  }
  async canWatch(series, n) { const reason = this.accessSync(series, n); return { allowed: reason !== 'locked', reason }; }

  async unlockWithCoins(series, n) {
    const cost = this.config.coinCost;
    if (this.accessSync(series, n) !== 'locked') return { ok: true, balance: this.wallet.coins };
    if (this.wallet.coins < cost) return { ok: false, error: 'insufficient_coins', balance: this.wallet.coins, needed: cost - this.wallet.coins };
    this.wallet.coins -= cost;
    (this.wallet.unlocked[series.id] ||= []).push(n);
    this._tx('spend', `${series.title} · Ep. ${n}`, -cost, 0, { seriesId: series.id, n });
    this.trackPaywall('unlock_coins', { seriesId: series.id, n });
    this._save(); return { ok: true, balance: this.wallet.coins };
  }
  async startSubscription(planId = 'monthly') {
    const plan = this.config.plans.find(p => p.id === planId) || this.config.plans[0];
    const now = Date.now(), renewsAt = now + 30 * 864e5;
    this.wallet.subscription = { planId: plan.id, name: plan.name, price: plan.price, status: 'active', startedAt: now, renewsAt, receipt: 'SIM-' + uid().toUpperCase() };
    this._tx('subscription', `${plan.name} (${plan.price.toFixed(2).replace('.', ',')} €/${plan.period})`, 0, plan.price);
    this.trackPaywall('subscribe', { planId });
    this._save(); return { ok: true, subscription: this.wallet.subscription };
  }
  async cancelSubscription() { if (this.wallet.subscription) { this.wallet.subscription.status = 'canceled'; this._tx('cancel', 'Suscripción cancelada (activa hasta fin de periodo)'); this._save(); } return { ok: true }; }
  async purchaseCoinPack(packId) {
    const p = this.config.coinPacks.find(x => x.id === packId); if (!p) return { ok: false, error: 'unknown_pack' };
    this.wallet.coins += p.coins + p.bonus;
    this._tx('purchase', `Pack ${p.coins}${p.bonus ? ' + ' + p.bonus : ''} coins`, p.coins + p.bonus, p.price, { receipt: 'SIM-' + uid().toUpperCase() });
    this.trackPaywall('buy_coins', { packId });
    this._save(); return { ok: true, balance: this.wallet.coins };
  }
  adsLeft() { if (this.wallet.ads.date !== today()) this.wallet.ads = { date: today(), count: 0 }; return Math.max(0, this.config.adsPerDay - this.wallet.ads.count); }
  async requestRewardedAd(series, n) {
    if (this.adsLeft() <= 0) return { ok: false, error: 'ad_limit' };
    const id = uid(); this._ads.set(id, { seriesId: series.id, n, title: series.title, startedAt: Date.now() });
    return { ok: true, adSessionId: id, durationSec: this.config.adDurationSec };
  }
  async completeRewardedAd(adSessionId) {
    const s = this._ads.get(adSessionId); if (!s) return { ok: false, error: 'invalid_session' };
    // anti-trampas básico: la sesión debe haber durado al menos la duración del anuncio
    if (Date.now() - s.startedAt < (this.config.adDurationSec - 1) * 1000) return { ok: false, error: 'too_fast' };
    this._ads.delete(adSessionId); this.wallet.ads.count++;
    (this.wallet.unlocked[s.seriesId] ||= []).push(s.n);
    this._tx('ad', `Anuncio visto · ${s.title} Ep. ${s.n}`, 0, 0, { seriesId: s.seriesId, n: s.n });
    this.trackPaywall('unlock_ad', { seriesId: s.seriesId, n: s.n });
    this._save(); return { ok: true };
  }
  checkInStatus() { const c = this.wallet.checkIn; const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10); const streak = c.last === today() || c.last === yest ? c.streak : 0; return { done: c.last === today(), streak, next: this.config.checkInRewards[streak % 7] }; }
  async dailyCheckIn() {
    const st = this.checkInStatus(); if (st.done) return { ok: false, error: 'already' };
    const reward = st.next; this.wallet.checkIn = { last: today(), streak: st.streak + 1 };
    this.wallet.coins += reward; this._tx('bonus', `Check-in diario · día ${st.streak + 1}`, reward);
    this._save(); return { ok: true, reward, streak: st.streak + 1 };
  }
  trackPaywall(event, meta = {}) { this.wallet.paywall.push({ event, at: Date.now(), ...meta }); this.wallet.paywall = this.wallet.paywall.slice(-300); localStorage.setItem(WALLET_KEY, JSON.stringify(this.wallet)); }
  async reset() { localStorage.removeItem(CFG_KEY); this.config = { ...DEFAULT_CONFIG }; this.wallet = this._freshWallet(); this._save(); }
}

export const monetization = new LocalEntitlementProvider();
export const onWallet = (f) => (listeners.add(f), () => listeners.delete(f));
