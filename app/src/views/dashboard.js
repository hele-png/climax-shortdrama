// Dashboard de control: contenido real (data.json + manifest.json) + métricas simuladas deterministas
import { getCatalog, getManifest, coverHTML } from '../data.js';
import { monetization } from '../monetization.js';
import { lineChart, stackedBars, hbars, donut, funnel, COLORS } from '../charts.js';
import { rng, eur, num, esc } from '../util.js';
import { topbar } from './common.js';

export function simulate(cat, cfg) {
  const r = rng('climax-metrics-v1:' + cat.map(s => s.id).join(','));
  const MAU = 184000 + Math.floor(r() * 20000), DAU = Math.round(MAU * 0.31);
  const retention = cat.map((s, k) => {
    const n = Math.min(s.totalEpisodes, 30), base = 0.9 + r() * 0.05, data = [100];
    for (let i = 2; i <= n; i++) { let v = data[i - 2] * (base + (i < 4 ? -0.05 : 0.025) + (r() - 0.5) * 0.02); if (i === cfg.freeEpisodes + 1) v *= 0.42 + r() * 0.1; data.push(Math.max(1, v)); }
    return { name: s.title, data, color: COLORS[k % COLORS.length] };
  });
  const views = [];
  cat.forEach((s, k) => s.episodes.slice(0, 30).forEach(e => views.push({ label: `${s.title.slice(0, 18)}… Ep.${e.n}`, value: Math.round((retention[k].data[e.n - 1] || 1) / 100 * (520000 + r() * 400000) * (1 + (e.n === 1 ? 0.3 : 0))), color: COLORS[k % COLORS.length] })));
  views.sort((a, b) => b.value - a.value);
  const pwViews = Math.round(DAU * 0.38 * 30), subs = Math.round(pwViews * 0.034), coinBuy = Math.round(pwViews * 0.061), adUnl = Math.round(pwViews * 0.27);
  const days = Array.from({ length: 30 }, (_, i) => { const t = 1 + i / 60 + (i % 7 >= 5 ? 0.18 : 0); return { sub: (1900 + r() * 500) * t, coins: (1400 + r() * 600) * t, ads: (420 + r() * 160) * t }; });
  const activeSubs = 11200 + Math.floor(r() * 1500), MRR = activeSubs * cfg.plans[0].price;
  const rev30 = days.reduce((a, d) => a + d.sub + d.coins + d.ads, 0);
  const coinRev = days.reduce((a, d) => a + d.coins, 0), adRev = days.reduce((a, d) => a + d.ads, 0);
  const payers = activeSubs + Math.round(coinBuy * 0.6);
  return { MAU, DAU, retention, views: views.slice(0, 10), pwViews, subs, coinBuy, adUnl, days, activeSubs, MRR, rev30, coinRev, adRev, ARPU: rev30 / MAU, ARPPU: rev30 / payers, payers, avgWatch: 11.4 + r() * 3, completion: 0.71 + r() * 0.08, d1: 0.42 + r() * 0.05, d7: 0.21 + r() * 0.04, d30: 0.09 + r() * 0.03 };
}

export function renderDashboard(view) {
  const cat = getCatalog(), man = getManifest(), cfg = monetization.config;
  const planned = cat.reduce((a, s) => a + s.totalEpisodes, 0), created = cat.reduce((a, s) => a + s.episodes.length, 0), scripts = cat.reduce((a, s) => a + s.episodes.filter(e => e.script).length, 0);
  const imgs = man.images || [], byType = (t) => imgs.filter(i => i.type === t).length;
  const plannedChars = (s) => s.images.length ? s.images.filter(i => i.kind === 'character').length : s.characters.length;
  const expectedImgs = cat.reduce((a, s) => a + (s.images.length || 1 + s.characters.length + 5), 0);
  const m = simulate(cat, cfg);
  const local = monetization.syncWallet.paywall || [];
  const lc = (ev) => local.filter(x => x.event === ev).length;
  const kpi = (l, v, sub = '') => `<div class="kpi"><small>${l}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
  view.innerHTML = `${topbar('Dashboard de control')}
  <div class="pad dash">
    <h2 class="h2">Contenido <span class="pill">datos reales</span></h2>
    <div class="kpis">
      ${kpi('Series creadas', cat.length, [...new Set(cat.map(s => s.niche))].length + ' nichos')}
      ${kpi('Episodios generados', created, `de ${planned} planificados`)}
      ${kpi('Guiones escritos', scripts, `${Math.round(scripts / Math.max(1, created) * 100)} % de episodios`)}
      ${kpi('Imágenes generadas', imgs.length, `de ${expectedImgs} previstas`)}
    </div>
    <div class="panel"><h3>Producción por serie</h3>
      <table class="tbl"><thead><tr><th>Serie</th><th>Ep.</th><th>Guiones</th><th>Portada</th><th>Pers.</th><th>Escenas</th></tr></thead><tbody>
      ${cat.map(s => { const si = imgs.filter(i => i.slug === s.slug); const sc = s.episodes.filter(e => e.script).length; return `<tr><td><a href="#/serie/${s.slug}">${esc(s.title)}</a><small class="muted"> ${esc(s.niche)}</small></td><td>${s.episodes.length}/${s.totalEpisodes}</td><td><div class="mini-bar"><i style="width:${sc / Math.max(1, s.totalEpisodes) * 100}%"></i></div>${sc}</td><td>${si.some(i => i.type === 'cover') ? '✅' : '—'}</td><td>${si.filter(i => i.type === 'character').length}/${plannedChars(s)}</td><td>${si.filter(i => i.type === 'scene').length}/5</td></tr>`; }).join('')}
      </tbody></table>
      <p class="tiny muted">Imágenes por tipo: ${byType('cover')} portadas · ${byType('character')} personajes · ${byType('scene')} escenas · manifest generado ${man.generatedAt ? new Date(man.generatedAt).toLocaleString('es-ES') : '—'} (fuente: ${esc(man.dataSource || '—')})</p>
      ${imgs.length ? `<div class="img-strip">${imgs.slice(0, 40).map(i => `<img loading="lazy" src="./${i.path}" title="${esc(i.path)}" alt="">`).join('')}</div>` : ''}
    </div>

    <h2 class="h2">Negocio <span class="pill red">datos simulados</span></h2>
    <div class="kpis">
      ${kpi('MAU', num(m.MAU), `DAU ${num(m.DAU)} · ${Math.round(m.DAU / m.MAU * 100)} % stickiness`)}
      ${kpi('MRR', eur(m.MRR), `${num(m.activeSubs)} suscriptores VIP`)}
      ${kpi('ARPU (30 d)', eur(m.ARPU), `ARPPU ${eur(m.ARPPU)}`)}
      ${kpi('Ingresos 30 d', eur(m.rev30), `coins ${eur(m.coinRev)} · ads ${eur(m.adRev)}`)}
      ${kpi('Retención D1/D7/D30', `${Math.round(m.d1 * 100)}/${Math.round(m.d7 * 100)}/${Math.round(m.d30 * 100)} %`)}
      ${kpi('Tiempo medio/día', `${num(m.avgWatch, 1)} min`, `${Math.round(m.completion * 100)} % episodios completados`)}
    </div>
    <div class="panel"><h3>Curva de retención por episodio <small class="muted">(% de espectadores del Ep.1 · caída en el paywall Ep.${cfg.freeEpisodes + 1})</small></h3>
      ${lineChart(m.retention, { yMax: 100, yFmt: v => Math.round(v) + '%', xLabels: Array.from({ length: 30 }, (_, i) => 'E' + (i + 1)) })}</div>
    <div class="panel"><h3>Episodios más vistos (30 d)</h3>${hbars(m.views, { fmt: v => num(v / 1000, 0) + 'K' })}</div>
    <div class="panel"><h3>Conversión del paywall (30 d)</h3>
      ${funnel([{ label: 'Vistas del paywall', value: m.pwViews, color: '#555' }, { label: 'Anuncio rewarded', value: m.adUnl, color: '#4fc3f7' }, { label: 'Compra de coins', value: m.coinBuy, color: '#e0a83a' }, { label: 'Suscripción VIP', value: m.subs, color: '#e50914' }])}
      ${donut([{ name: 'Suscripción', value: m.days.reduce((a, d) => a + d.sub, 0), color: '#e50914' }, { name: 'Coins', value: m.coinRev, color: '#e0a83a' }, { name: 'Anuncios', value: m.adRev, color: '#4fc3f7' }], { center: eur(m.rev30 / 1000).replace(/,\d+/, '') + 'K' })}
    </div>
    <div class="panel"><h3>Ingresos diarios por fuente</h3>
      ${stackedBars(m.days, [{ key: 'sub', name: 'VIP', color: '#e50914' }, { key: 'coins', name: 'Coins', color: '#e0a83a' }, { key: 'ads', name: 'Ads', color: '#4fc3f7' }], { yFmt: v => num(v / 1000, 1) + 'K€', xLabels: m.days.map((_, i) => 'D' + (i + 1)) })}</div>
    <div class="panel"><h3>Este dispositivo <span class="pill">datos reales locales</span></h3>
      <div class="kpis sm">${kpi('Paywalls vistos', lc('view'))}${kpi('Suscripciones', lc('subscribe'))}${kpi('Desbloqueos coins', lc('unlock_coins'))}${kpi('Desbloqueos anuncio', lc('unlock_ad'))}${kpi('Packs comprados', lc('buy_coins'))}${kpi('Paywall cerrado', lc('dismiss'))}</div></div>
    <p class="tiny muted center">Las métricas de negocio son datos simulados deterministas (semilla fija) para ilustrar el panel.</p>
  </div>`;
}
