// Genera src/icons.js con los iconos de Tabler Icons (MIT) que usa la app
import fs from 'node:fs';
const base = new URL('../node_modules/@tabler/icons/icons/', import.meta.url);
const names = 'home player-play player-pause heart heart:f bookmark bookmark:f list-numbers share-3 user search chevron-left chevron-right chevron-down lock lock-open crown crown:f coin gift player-skip-forward player-track-next rotate-clockwise x check flame sparkles star:f eye clock file-text download settings layout-dashboard chart-bar trash plus edit device-mobile-down logout history receipt arrow-up-right ad-2 credit-card brand-apple brand-google movie users photo layout-grid list refresh alert-triangle circle-check info-circle calendar-event bolt dots-vertical arrow-left adjustments script book-2 trending-up player-play:f home:f user:f bookmarks circle-check:f flame:f player-pause:f'.split(' ');
const out = {};
for (const n of names) {
  const [name, f] = n.split(':');
  const svg = fs.readFileSync(new URL(`${f ? 'filled' : 'outline'}/${name}.svg`, base), 'utf8');
  const inner = svg.replace(/^[\s\S]*?>\s*/, '').replace(/<\/svg>\s*$/, '').replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none" \/>/, '').replace(/\s+/g, ' ').trim();
  out[f ? name + '-f' : name] = (f ? 'F' : 'O') + inner;
}
fs.writeFileSync(new URL('../src/icons.js', import.meta.url), `// Iconos: Tabler Icons v3 (MIT) · https://tabler.io/icons · generado por scripts/gen-icons-js.mjs
const I = ${JSON.stringify(out)};
export function ic(name, size = 20, cls = '') {
  const v = I[name]; if (!v) return '';
  const filled = v[0] === 'F';
  return \`<svg class="ic \${cls}" width="\${size}" height="\${size}" viewBox="0 0 24 24" \${filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">\${v.slice(1)}</svg>\`;
}
/** Moneda propia de la app (SVG plano) */
export const coinIc = (size = 16) => \`<svg class="ic coin" width="\${size}" height="\${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#E8B43A"/><circle cx="12" cy="12" r="7" fill="none" stroke="#B7841C" stroke-width="1.5"/><path d="M13.9 9.3a3 3 0 1 0 0 5.4" fill="none" stroke="#7A5510" stroke-width="1.8" stroke-linecap="round"/></svg>\`;
`);
console.log('icons:', Object.keys(out).length);
