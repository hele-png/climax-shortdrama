import sharp from 'sharp';
import fs from 'node:fs';
// Icono v2: plano, color de marca y "C" condensada (sin degradados)
const svg = (pad = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#f2304b"/>
<g transform="translate(256 256) scale(${1 - pad}) translate(-256 -256)">
 <path d="M334 178v-22q0-44-44-44h-68q-44 0-44 44v200q0 44 44 44h68q44 0 44-44v-22" fill="none" stroke="#fff" stroke-width="60" stroke-linecap="butt" stroke-linejoin="round"/>
</g>
</svg>`;
fs.mkdirSync('public/icons', { recursive: true });
fs.writeFileSync('public/icons/icon.svg', svg());
const jobs = [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['maskable-512.png', 512, 0.22], ['apple-touch-icon.png', 180, 0], ['favicon-32.png', 32, 0]];
for (const [f, s, p] of jobs) await sharp(Buffer.from(svg(p))).resize(s, s).png().toFile('public/icons/' + f);
console.log('icons ok');
