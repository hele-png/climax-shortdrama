// Progreso del usuario (visto, % completado, historial, favoritos). Persistido en localStorage.
const KEY = 'sd_user_v1';
const listeners = new Set();
const fresh = () => ({ name: 'Invitada', createdAt: Date.now(), progress: {}, history: [], favorites: [], likes: [] });
let state = load();
function load() { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return fresh(); } }
function save() { localStorage.setItem(KEY, JSON.stringify(state)); listeners.forEach(f => f(state)); }
export const user = () => state;
export const onUser = (f) => (listeners.add(f), () => listeners.delete(f));
export function resetUser() { state = fresh(); save(); }

/** Registrar progreso de visionado (0..1). Se guarda el máximo alcanzado. */
export function recordProgress(seriesId, n, completion) {
  const p = state.progress[seriesId] ||= { eps: {}, lastEp: n, updatedAt: 0 };
  const prev = p.eps[n]?.completion || 0;
  p.eps[n] = { completion: Math.max(prev, Math.min(1, completion)), at: Date.now() };
  p.lastEp = n; p.updatedAt = Date.now();
  const last = state.history[0];
  if (last && last.seriesId === seriesId && last.n === n) { last.completion = p.eps[n].completion; last.at = Date.now(); }
  else state.history.unshift({ seriesId, n, at: Date.now(), completion: p.eps[n].completion });
  state.history = state.history.slice(0, 100);
  save();
}
export const epCompletion = (seriesId, n) => state.progress[seriesId]?.eps[n]?.completion || 0;
export function seriesProgress(s) {
  const p = state.progress[s.id]; if (!p) return { watched: 0, pct: 0, lastEp: 0, resumeEp: 1 };
  const watched = Object.values(p.eps).filter(e => e.completion >= 0.9).length;
  const lastC = p.eps[p.lastEp]?.completion || 0;
  const resumeEp = lastC >= 0.9 && p.lastEp < s.episodes.length ? p.lastEp + 1 : p.lastEp;
  return { watched, pct: watched / Math.max(1, s.totalEpisodes), lastEp: p.lastEp, resumeEp, updatedAt: p.updatedAt, lastC };
}
export function continueWatching(catalog) {
  return catalog.map(s => ({ s, p: seriesProgress(s) })).filter(x => x.p.lastEp && !(x.p.resumeEp === x.p.lastEp && x.p.lastC >= 0.9 && x.p.lastEp >= x.s.episodes.length)).sort((a, b) => b.p.updatedAt - a.p.updatedAt);
}
export function toggleFav(id) { const i = state.favorites.indexOf(id); i >= 0 ? state.favorites.splice(i, 1) : state.favorites.unshift(id); save(); return i < 0; }
export function toggleLike(key) { const i = state.likes.indexOf(key); i >= 0 ? state.likes.splice(i, 1) : state.likes.unshift(key); save(); return i < 0; }
export const isFav = (id) => state.favorites.includes(id);
export const isLiked = (k) => state.likes.includes(k);
