// Panel de administración básico: CRUD de series/episodios (overlay en localStorage) + configuración de monetización
import { getCatalog, getSeries, getOverlay, saveOverlay, clearOverlay, coverHTML, getBase } from '../data.js';
import { monetization, DEFAULT_CONFIG } from '../monetization.js';
import { esc, toast } from '../util.js';
import { topbar } from './common.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
function putSeries(s) { const o = getOverlay(); o.series[s.id] = s; o.deleted = o.deleted.filter(d => d !== s.id); saveOverlay(o); }

export function renderAdmin(view) {
  let tab = 'series', sel = null, epSel = null;
  const draw = () => {
    const cat = getCatalog(), cfg = monetization.config, ov = getOverlay();
    const s = sel && getSeries(sel);
    view.innerHTML = `${topbar('Panel de administración')}
    <div class="pad admin">
      <div class="seg">${[['series', 'Series'], ['money', 'Monetización'], ['data', 'Datos']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      ${tab === 'series' && !s ? `
        <div class="adm-bar"><b>${cat.length} series</b><button class="btn sm red" id="new">+ Nueva serie</button></div>
        ${cat.map(x => `<div class="adm-row">${coverHTML(x, 'thumb')}<div class="grow"><b>${esc(x.title)}</b><small class="muted">${esc(x.niche)} · ${x.episodes.length}/${x.totalEpisodes} ep. · ${x.episodes.filter(e => e.script).length} guiones ${ov.series[x.id] ? '· <span class="gold-t">editada</span>' : ''}</small></div><button class="btn sm ghost" data-edit="${x.id}">Editar</button></div>`).join('')}` : ''}
      ${tab === 'series' && s ? `
        <button class="link" id="backlist">‹ Todas las series</button>
        <form class="form" id="sf">
          <label>Título<input name="title" value="${esc(s.title)}" required></label>
          <div class="two"><label>Slug<input name="slug" value="${esc(s.slug)}" ${s._custom ? '' : 'readonly'}></label><label>Nicho<input name="niche" value="${esc(s.niche)}"></label></div>
          <label>Logline<input name="logline" value="${esc(s.logline)}"></label>
          <label>Sinopsis<textarea name="synopsis" rows="4">${esc(s.synopsis)}</textarea></label>
          <div class="two"><label>Episodios planificados<input name="totalEpisodes" type="number" min="1" value="${s.totalEpisodes}"></label><label>Estilo visual<input name="style" value="${esc(s.style)}"></label></div>
          <div class="row-btns"><button class="btn red">Guardar serie</button><button type="button" class="btn ghost danger-t" id="del">Eliminar</button></div>
        </form>
        <div class="adm-bar"><b>Episodios (${s.episodes.length})</b><button class="btn sm ghost" id="addep">+ Episodio</button></div>
        <div class="ep-admin">${s.episodes.map(e => `<button class="adm-ep ${epSel === e.n ? 'on' : ''}" data-ep="${e.n}"><span>${e.n}</span><div><b>${esc(e.title)}</b><small class="muted">${e.durationSec}s · ${e.script ? '✓ guion' : '— sin guion'} ${monetization.isFree(s, e.n) ? '· gratis' : ''}</small></div></button>`).join('')}</div>
        ${epSel ? (() => { const e = s.episodes.find(x => x.n === epSel); return e ? `
          <form class="form ep-form" id="ef"><h4>Episodio ${e.n}</h4>
            <label>Título<input name="title" value="${esc(e.title)}"></label>
            <label>Hook viral<input name="hook" value="${esc(e.hook)}"></label>
            <div class="two"><label>Duración (s)<input name="durationSec" type="number" min="20" max="600" value="${e.durationSec}"></label><label class="check"><input type="checkbox" name="freeEpisode" ${e.freeEpisode ? 'checked' : ''}> Marcado gratis (freeEpisode)</label></div>
            <label>Guion (markdown: <code>**NOMBRE:** diálogo</code>, <code>## ESCENA</code>, <code>*acción*</code>)<textarea name="script" rows="12">${esc(e.script || '')}</textarea></label>
            <div class="row-btns"><button class="btn red">Guardar episodio</button><a class="btn ghost" href="#/ver/${s.slug}/${e.n}">▶ Previsualizar</a><button type="button" class="btn ghost danger-t" id="delep">Borrar</button></div>
          </form>` : ''; })() : ''}` : ''}
      ${tab === 'money' ? `
        <form class="form" id="mf">
          <div class="two"><label>Episodios gratis (1..N)<input name="freeEpisodes" type="number" min="0" max="50" value="${cfg.freeEpisodes}"></label><label>Precio por episodio (coins)<input name="coinCost" type="number" min="1" value="${cfg.coinCost}"></label></div>
          <div class="two"><label>Coins de bienvenida<input name="startCoins" type="number" min="0" value="${cfg.startCoins}"></label><label>Anuncios rewarded / día<input name="adsPerDay" type="number" min="0" value="${cfg.adsPerDay}"></label></div>
          <div class="two"><label>Duración anuncio (s)<input name="adDurationSec" type="number" min="5" max="60" value="${cfg.adDurationSec}"></label><label>Precio VIP mensual (€)<input name="price" type="number" step="0.01" value="${cfg.plans[0].price}"></label></div>
          <label class="check"><input type="checkbox" name="useEpisodeFlags" ${cfg.useEpisodeFlags ? 'checked' : ''}> Respetar también <code>freeEpisode</code> de cada episodio</label>
          <div class="row-btns"><button class="btn red">Guardar configuración</button><button type="button" class="btn ghost" id="defcfg">Valores por defecto</button></div>
        </form>
        <p class="tiny muted">Los cambios se aplican al instante en esta demo (candados, paywall y precios).</p>` : ''}
      ${tab === 'data' ? `
        <div class="card-box"><b>Origen:</b> data.json (${getBase().length} series) + ${Object.keys(ov.series).length} ediciones locales, ${ov.deleted.length} eliminadas.</div>
        <div class="row-btns"><button class="btn ghost" id="export">⬇ Exportar data.json fusionado</button><button class="btn ghost danger-t" id="clear">Descartar ediciones locales</button></div>
        <p class="tiny muted">Para publicar cambios: exporta el JSON y sustitúyelo en <code>content/data.json</code>, luego <code>npm run build</code>.</p>` : ''}
    </div>`;
    const q = (x) => view.querySelector(x);
    view.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; sel = null; epSel = null; draw(); });
    view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { sel = b.dataset.edit; epSel = null; draw(); });
    q('#backlist')?.addEventListener('click', () => { sel = null; draw(); });
    q('#new')?.addEventListener('click', () => {
      const id = 'c' + Date.now().toString(36);
      putSeries({ id, slug: 'nueva-serie-' + id, title: 'Nueva serie', niche: 'Romance', logline: '', synopsis: '', totalEpisodes: 20, style: '', characters: [], episodes: [{ n: 1, title: 'Episodio 1', hook: '', durationSec: 90, script: null, freeEpisode: true }], _custom: true });
      sel = id; draw(); toast('Serie creada');
    });
    q('#sf')?.addEventListener('submit', (e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); const n = clone(s); Object.assign(n, f, { totalEpisodes: +f.totalEpisodes }); putSeries(n); sel = n.id; toast('Serie guardada', 'ok'); draw(); });
    q('#del')?.addEventListener('click', () => { if (!confirm('¿Eliminar esta serie?')) return; const o = getOverlay(); if (s._custom) delete o.series[s.id]; else o.deleted.push(s.id); saveOverlay(o); sel = null; draw(); });
    view.querySelectorAll('[data-ep]').forEach(b => b.onclick = () => { epSel = +b.dataset.ep; draw(); q('#ef')?.scrollIntoView({ behavior: 'smooth' }); });
    q('#addep')?.addEventListener('click', () => { const n = clone(s); const k = (n.episodes.at(-1)?.n || 0) + 1; n.episodes.push({ n: k, title: `Episodio ${k}`, hook: '', durationSec: 90, script: null, freeEpisode: false }); n.totalEpisodes = Math.max(n.totalEpisodes, k); putSeries(n); epSel = k; draw(); });
    q('#ef')?.addEventListener('submit', (e) => { e.preventDefault(); const f = new FormData(e.target); const n = clone(s); const ep = n.episodes.find(x => x.n === epSel); Object.assign(ep, { title: f.get('title'), hook: f.get('hook'), durationSec: +f.get('durationSec'), script: f.get('script').trim() || null, freeEpisode: f.get('freeEpisode') === 'on' }); putSeries(n); toast('Episodio guardado', 'ok'); draw(); });
    q('#delep')?.addEventListener('click', () => { const n = clone(s); n.episodes = n.episodes.filter(x => x.n !== epSel); putSeries(n); epSel = null; draw(); });
    q('#mf')?.addEventListener('submit', async (e) => { e.preventDefault(); const f = new FormData(e.target); const plans = clone(cfg.plans); plans[0].price = +f.get('price');
      await monetization.setConfig({ freeEpisodes: +f.get('freeEpisodes'), coinCost: +f.get('coinCost'), startCoins: +f.get('startCoins'), adsPerDay: +f.get('adsPerDay'), adDurationSec: +f.get('adDurationSec'), useEpisodeFlags: f.get('useEpisodeFlags') === 'on', plans }); toast('Configuración guardada', 'ok'); draw(); });
    q('#defcfg')?.addEventListener('click', async () => { await monetization.setConfig(clone(DEFAULT_CONFIG)); toast('Valores por defecto'); draw(); });
    q('#export')?.addEventListener('click', () => { const out = getCatalog().map(({ _custom, ...x }) => x); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })); a.download = 'data.json'; a.click(); });
    q('#clear')?.addEventListener('click', () => { if (confirm('¿Descartar todas las ediciones locales?')) { clearOverlay(); toast('Ediciones descartadas'); draw(); } });
  };
  draw();
}
