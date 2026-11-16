// Gráficas SVG ligeras sin dependencias
import { esc, num } from './util.js';
export const COLORS = ['#e50914', '#e0a83a', '#4fc3f7', '#ba68c8', '#81c784', '#ff8a65', '#f06292'];
export function lineChart(series, { w = 340, h = 180, yMax, yFmt = (v) => v, xLabels = [], area = false } = {}) {
  const P = { l: 34, r: 8, t: 10, b: 22 }, iw = w - P.l - P.r, ih = h - P.t - P.b;
  const maxLen = Math.max(...series.map(s => s.data.length));
  const max = yMax ?? Math.max(...series.flatMap(s => s.data)) * 1.1;
  const x = (i) => P.l + (maxLen <= 1 ? 0 : (i / (maxLen - 1)) * iw), y = (v) => P.t + ih - (v / max) * ih;
  const grid = [0, .25, .5, .75, 1].map(f => `<line x1="${P.l}" x2="${w - P.r}" y1="${y(max * f)}" y2="${y(max * f)}" class="grid"/><text x="${P.l - 4}" y="${y(max * f) + 3}" text-anchor="end" class="ax">${yFmt(max * f)}</text>`).join('');
  const step = Math.ceil(maxLen / 8);
  const xl = xLabels.map((l, i) => i % step === 0 ? `<text x="${x(i)}" y="${h - 6}" text-anchor="middle" class="ax">${esc(l)}</text>` : '').join('');
  const lines = series.map((s, k) => { const c = s.color || COLORS[k % COLORS.length]; const d = s.data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(''); return `${area ? `<path d="${d}L${x(s.data.length - 1)},${y(0)}L${x(0)},${y(0)}Z" fill="${c}" opacity=".15"/>` : ''}<path d="${d}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"/>`; }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="chart">${grid}${xl}${lines}</svg>${legend(series)}`;
}
export function stackedBars(groups, keys, { w = 340, h = 180, yFmt = (v) => v, xLabels = [] } = {}) {
  const P = { l: 40, r: 6, t: 10, b: 22 }, iw = w - P.l - P.r, ih = h - P.t - P.b;
  const tot = groups.map(g => keys.reduce((a, k) => a + g[k.key], 0)), max = Math.max(...tot) * 1.1;
  const bw = iw / groups.length;
  const grid = [0, .5, 1].map(f => `<line x1="${P.l}" x2="${w - P.r}" y1="${P.t + ih - f * ih}" y2="${P.t + ih - f * ih}" class="grid"/><text x="${P.l - 4}" y="${P.t + ih - f * ih + 3}" text-anchor="end" class="ax">${yFmt(max * f)}</text>`).join('');
  const bars = groups.map((g, i) => { let acc = 0; return keys.map((k, j) => { const v = g[k.key], hh = (v / max) * ih; const r = `<rect x="${P.l + i * bw + 1}" y="${P.t + ih - acc - hh}" width="${Math.max(1, bw - 2)}" height="${hh}" fill="${k.color || COLORS[j]}" rx="1"/>`; acc += hh; return r; }).join(''); }).join('');
  const step = Math.ceil(groups.length / 6);
  const xl = xLabels.map((l, i) => i % step === 0 ? `<text x="${P.l + i * bw + bw / 2}" y="${h - 6}" text-anchor="middle" class="ax">${esc(l)}</text>` : '').join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="chart">${grid}${bars}${xl}</svg>${legend(keys.map(k => ({ name: k.name, color: k.color })))}`;
}
export function hbars(items, { fmt = (v) => num(v) } = {}) {
  const max = Math.max(...items.map(i => i.value)) || 1;
  return `<div class="hbars">${items.map((it, k) => `<div class="hb"><span class="hb-l">${esc(it.label)}</span><div class="hb-t"><i style="width:${(it.value / max) * 100}%;background:${it.color || COLORS[k % 2]}"></i></div><b>${fmt(it.value)}</b></div>`).join('')}</div>`;
}
export function donut(items, { size = 140, center = '' } = {}) {
  const tot = items.reduce((a, b) => a + b.value, 0) || 1, R = 52, C = 2 * Math.PI * R; let off = 0;
  const arcs = items.map((it, k) => { const len = (it.value / tot) * C; const s = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${it.color || COLORS[k]}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`; off += len; return s; }).join('');
  return `<div class="donut"><svg viewBox="0 0 140 140" width="${size}" height="${size}">${arcs}<text x="70" y="76" text-anchor="middle" class="donut-c">${esc(center)}</text></svg>${legend(items.map((i, k) => ({ name: `${i.name} · ${Math.round(i.value / tot * 100)} %`, color: i.color || COLORS[k] })))}</div>`;
}
export function funnel(steps) {
  const max = steps[0].value || 1;
  return `<div class="funnel">${steps.map((s, k) => `<div class="fn"><div class="fn-bar" style="width:${Math.max(6, s.value / max * 100)}%;background:${s.color || COLORS[k % COLORS.length]}"></div><span>${esc(s.label)}</span><b>${num(s.value)}${k ? ` · ${num(s.value / max * 100, 1)} %` : ''}</b></div>`).join('')}</div>`;
}
const legend = (series) => `<div class="legend-c">${series.map((s, k) => `<span><i style="background:${s.color || COLORS[k % COLORS.length]}"></i>${esc(s.name)}</span>`).join('')}</div>`;
