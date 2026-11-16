export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
export const num = (n, d = 0) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
export const fmtTime = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const today = () => new Date().toISOString().slice(0, 10);
export function hashStr(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) { let a = typeof seed === 'number' ? seed : hashStr(seed); return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PALETTES = [['#3a0610', '#8c1022', '#e0a83a'], ['#05122b', '#1f3f7a', '#d4af37'], ['#1a0b2e', '#6b1e5c', '#ff6b6b'], ['#0b1f1a', '#1d5c4a', '#e8c07d'], ['#2b1205', '#8a3b12', '#ffd27a'], ['#14061f', '#4b1577', '#f2b84b']];
/** Gradiente cinematográfico determinista para placeholders */
export function gradient(key, variant = 0) {
  const r = rng(hashStr(key) + variant * 7919);
  const p = PALETTES[hashStr(key) % PALETTES.length];
  const a = Math.floor(r() * 360), x = 20 + r() * 60, y = 15 + r() * 50;
  return `radial-gradient(120% 80% at ${x}% ${y}%, ${p[1]}cc 0%, transparent 60%), radial-gradient(90% 60% at ${100 - x}% ${100 - y}%, ${p[2]}55 0%, transparent 55%), linear-gradient(${a}deg, ${p[0]} 0%, #050505 85%)`;
}
export function toast(msg, type = '') {
  const root = document.getElementById('toast-root');
  const el = h(`<div class="toast ${type}">${msg}</div>`);
  root.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 2600);
}
export const initials = (name) => String(name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
