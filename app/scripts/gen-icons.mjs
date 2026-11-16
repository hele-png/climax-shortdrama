import sharp from 'sharp';
import fs from 'node:fs';
const svg = (pad = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
 <radialGradient id="bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#5a0a14"/><stop offset=".6" stop-color="#1a0306"/><stop offset="1" stop-color="#050505"/></radialGradient>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe29a"/><stop offset=".5" stop-color="#e0a83a"/><stop offset="1" stop-color="#9c6a14"/></linearGradient>
 <linearGradient id="red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3b4e"/><stop offset="1" stop-color="#a3081c"/></linearGradient>
</defs>
<rect width="512" height="512" fill="url(#bg)"/>
<g transform="translate(256 240) scale(${1 - pad})">
 <circle r="150" fill="none" stroke="url(#gold)" stroke-width="18"/>
 <path d="M-45 -80 L90 0 L-45 80 Z" fill="url(#red)" stroke="url(#gold)" stroke-width="8" stroke-linejoin="round"/>
</g>
<text x="256" y="${pad ? 440 : 462}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="${pad ? 48 : 60}" letter-spacing="10" fill="url(#gold)">CLÍMAX</text>
</svg>`;
fs.mkdirSync('public/icons', { recursive: true });
fs.writeFileSync('public/icons/icon.svg', svg());
const jobs = [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['maskable-512.png', 512, 0.22], ['apple-touch-icon.png', 180, 0], ['favicon-32.png', 32, 0]];
for (const [f, s, p] of jobs) await sharp(Buffer.from(svg(p))).resize(s, s).png().toFile('public/icons/' + f);
console.log('icons ok');
