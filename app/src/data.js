// Carga del catálogo (data.json) + capa de edición del admin (localStorage) + resolución de imágenes (manifest.json)
import { gradient, esc, initials } from './util.js';
const OVERLAY_KEY = 'sd_admin_overlay_v1';
let base = [], catalog = [], manifest = { images: [] }, imageSet = new Set();

export async function loadData() {
  const [d, m] = await Promise.all([
    fetch('./data.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => []),
    fetch('./manifest.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({ images: [] })),
  ]);
  base = Array.isArray(d) ? d : (d.series || []);
  manifest = m || { images: [] };
  imageSet = new Set((manifest.images || []).map(i => i.path));
  rebuild();
}
export const getManifest = () => manifest;
export const getBase = () => base;
export function getOverlay() { try { return JSON.parse(localStorage.getItem(OVERLAY_KEY)) || { series: {}, deleted: [] }; } catch { return { series: {}, deleted: [] }; } }
export function saveOverlay(o) { localStorage.setItem(OVERLAY_KEY, JSON.stringify(o)); rebuild(); }
export function clearOverlay() { localStorage.removeItem(OVERLAY_KEY); rebuild(); }

function normalize(s, i) {
  const slug = s.slug || String(s.title || 'serie-' + i).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const episodes = (s.episodes || []).map((e, j) => ({ n: e.n ?? j + 1, title: e.title || `Episodio ${j + 1}`, hook: e.hook || '', durationSec: +e.durationSec || 90, script: e.script ?? null, freeEpisode: !!e.freeEpisode, audio: e.audio || null, cues: e.cues || null, video: e.video || null })).sort((a, b) => a.n - b.n);
  return { id: s.id || slug, slug, title: s.title || 'Sin título', niche: s.niche || 'Drama', logline: s.logline || '', synopsis: s.synopsis || '', totalEpisodes: Math.max(+s.totalEpisodes || 0, episodes.length), style: s.style || '', characters: s.characters || [], images: s.images || [], episodes, _custom: !!s._custom };
}
function rebuild() {
  const o = getOverlay();
  const merged = base.filter(s => !o.deleted.includes(s.id)).map(s => o.series[s.id] ? { ...s, ...o.series[s.id] } : s);
  for (const [id, s] of Object.entries(o.series)) if (s._custom && !o.deleted.includes(id)) merged.push(s);
  catalog = merged.map(normalize);
}
export const getCatalog = () => catalog;
export const getSeries = (slugOrId) => catalog.find(s => s.slug === slugOrId || s.id === slugOrId);
export const getEpisode = (s, n) => s?.episodes.find(e => e.n === +n);
export const niches = () => [...new Set(catalog.map(s => s.niche))];

// ---- Imágenes ----
const EXT = ['png', 'jpg', 'webp'];
function findImg(slug, key) { for (const x of EXT) { const p = `img/${slug}/${key}.${x}`; if (imageSet.has(p)) return './' + p; } return null; }
/** URL de la imagen si existe en manifest; si no hay manifest, intenta la ruta convencional .png */
export function imgUrl(slug, key) { return findImg(slug, key) || (imageSet.size ? null : `./img/${slug}/${key}.png`); }
export const coverUrl = (s) => imgUrl(s.slug, 'cover');
export const charUrl = (s, c) => imgUrl(s.slug, 'char-' + c.id);
export function sceneUrls(s) { const out = []; for (let i = 1; i <= 8; i++) { const u = findImg(s.slug, 'scene-' + i); if (u) out.push(u); } if (!out.length && !imageSet.size) for (let i = 1; i <= 5; i++) out.push(`./img/${s.slug}/scene-${i}.png`); return out; }
/** Escenas con su episodio (manifest.json) */
export function scenes(s) {
  return (manifest.images || []).filter(i => i.slug === s.slug && i.type === 'scene').map(i => ({ url: './' + i.path, episode: i.episode ?? null, label: i.label || '' })).sort((a, b) => (a.episode ?? 99) - (b.episode ?? 99));
}
const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/** Personajes que hablan en el guion del episodio (por orden de aparición) */
export function speakingChars(s, ep) {
  if (!ep?.script) return [];
  const txt = norm(ep.script); const found = [];
  for (const c of s.characters) { const first = norm(c.name).split(/[\s/"]+/)[0]; const i = txt.indexOf('**' + first); if (first && i >= 0) found.push([i, c]); }
  return found.sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
/**
 * Fotogramas del reproductor para un episodio concreto:
 *   apertura (escena anterior más cercana o portada) -> retratos de quien habla -> escena(s) de ESTE episodio al final (clímax)
 */
export function sceneFrames(s, ep) {
  const bg = (v) => gradient(s.slug, v);
  const sc = scenes(s), cover = coverUrl(s);
  if (!ep) { const list = sc.length ? sc.map(x => x.url) : (cover ? [cover] : []); return list.length ? list.map((url, i) => ({ url, bg: bg(i + 1) })) : [1, 2, 3, 4].map(v => ({ url: null, bg: bg(v) })); }
  const exact = sc.filter(x => x.episode === ep.n);
  const prev = sc.filter(x => x.episode != null && x.episode < ep.n).pop();
  const next = sc.find(x => x.episode != null && x.episode > ep.n);
  const frames = [];
  const push = (url) => { if (url && !frames.includes(url)) frames.push(url); };
  const lead = s.characters.map(c => charUrl(s, c)).find(Boolean);
  push(prev ? prev.url : lead || cover);
  for (const c of speakingChars(s, ep).slice(0, 2)) push(charUrl(s, c));
  if (exact.length) exact.forEach(x => push(x.url)); else if (next && next.episode - ep.n <= 1) push(next.url); else if (prev) push(prev.url);
  for (const c of s.characters) { if (frames.length >= 3) break; push(charUrl(s, c)); }
  if (frames.length < 3) push(cover);
  if (!frames.length) return [1, 2, 3, 4].map(v => ({ url: null, bg: bg(v) }));
  return frames.slice(0, 5).map((url, i) => ({ url, bg: bg(i + 1) }));
}
/** Imagen representativa de un episodio (para el feed) */
export function episodePoster(s, ep) { const f = sceneFrames(s, ep); return f[f.length - 1]; }
/** HTML de imagen con placeholder degradado elegante (si falta o falla la imagen) */
export function artHTML({ url, key, label = '', sub = '', cls = '', variant = 0 }) {
  return `<div class="art sk ${cls}">
    ${label ? `<div class="art-ph"><span class="art-ph-title">${esc(label)}</span>${sub ? `<span class="art-ph-sub">${esc(sub)}</span>` : ''}</div>` : ''}
    ${url ? `<img loading="lazy" decoding="async" src="${url}" alt="" onload="this.parentElement.classList.add('loaded')" onerror="this.parentElement.classList.add('loaded');this.remove()">` : ''}
  </div>`;
}
export const coverHTML = (s, cls = '') => artHTML({ url: coverUrl(s), key: s.slug, label: s.title, sub: s.niche, cls: 'cover ' + cls });
export const charHTML = (s, c, cls = '') => `<div class="avatar ${cls}"><span>${initials(c.name)}</span>${charUrl(s, c) ? `<img loading="lazy" src="${charUrl(s, c)}" alt="${esc(c.name)}" onerror="this.remove()">` : ''}</div>`;

/** Imagen de cabecera sin texto (escena clave) para hero y ficha */
export function keyArt(s, i = 0) { const sc = scenes(s); return (sc[i] || sc[0])?.url || coverUrl(s); }
/** Nombre corto del género para chips y metadatos */
export function genre(niche) {
  const n = String(niche || '').toLowerCase();
  if (/lobo|alfa/.test(n)) return 'Hombres lobo';
  if (/contrato/.test(n)) return 'Matrimonio por contrato';
  if (/oculta|secreto/.test(n)) return 'Millonario secreto';
  if (/renac|segunda/.test(n)) return 'Renacer';
  if (/venganza/.test(n)) return 'Venganza';
  return String(niche || 'Drama').split(/[\/(]/)[0].trim();
}
