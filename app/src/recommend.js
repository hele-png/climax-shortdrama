// Recomendación basada en contenido: afinidad por nicho y por serie, ponderada por % completado y recencia.
import { user } from './store.js';
export function affinity(catalog) {
  const u = user(), niche = {}, series = {};
  const now = Date.now();
  for (const s of catalog) {
    const p = u.progress[s.id]; if (!p) continue;
    let score = 0;
    for (const e of Object.values(p.eps)) { const rec = Math.exp(-(now - e.at) / (7 * 864e5)); score += (0.3 + e.completion) * (0.5 + 0.5 * rec); }
    if (u.favorites.includes(s.id)) score += 2;
    series[s.id] = score; niche[s.niche] = (niche[s.niche] || 0) + score;
  }
  return { niche, series };
}
/** Devuelve [{s, score, reason}] excluyendo series ya muy avanzadas */
export function recommend(catalog, limit = 10) {
  const { niche, series } = affinity(catalog);
  const totalN = Object.values(niche).reduce((a, b) => a + b, 0) || 1;
  const cold = !Object.keys(series).length;
  return catalog.map((s, i) => {
    const seen = series[s.id] || 0, nicheW = (niche[s.niche] || 0) / totalN;
    const popularity = 1 - i / (catalog.length + 1);
    const watchedEps = Object.keys(user().progress[s.id]?.eps || {}).length;
    const novelty = watchedEps ? Math.max(0, 1 - watchedEps / Math.max(1, s.episodes.length)) * 0.4 : 1;
    const score = cold ? popularity : nicheW * 3 + novelty + popularity * 0.3 + Math.min(seen, 2) * 0.1;
    const reason = cold ? 'Tendencia ahora' : nicheW > 0.2 && !watchedEps ? `Porque te gusta «${s.niche}»` : watchedEps ? 'Sigue donde lo dejaste' : 'Descubre algo nuevo';
    return { s, score, reason };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
}
