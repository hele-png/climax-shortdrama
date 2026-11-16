// Importa imágenes generadas: originales -> /workspace/shortdrama/images/<slug>/, comprimidas webp -> app/public/img/<slug>/
import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';
const root = '/workspace/shortdrama';
const data = JSON.parse(fs.readFileSync(`${root}/content/data.json`, 'utf8'));
const rows = fs.readFileSync(`${root}/images/map.tsv`, 'utf8').trim().split('\n').map(l => l.split('\t'));
let n = 0, total = 0;
for (const [slug, key, src] of rows) {
  const s = data.find(x => x.slug === slug); if (!s) throw new Error('slug ' + slug);
  let appKey = key, origName = key;
  if (key.startsWith('char-')) {
    const tok = key.slice(5);
    const c = s.characters.find(c => c.id === tok || c.id.startsWith(tok + '-') || c.id.endsWith('-' + tok) || c.id.includes('-' + tok + '-'));
    if (!c) throw new Error(`no char for ${slug}/${key}`);
    appKey = 'char-' + c.id;
  }
  if (key.startsWith('scene-')) origName = 'scene-' + key.slice(6).padStart(2, '0');
  fs.mkdirSync(`${root}/images/${slug}`, { recursive: true });
  fs.copyFileSync(src, `${root}/images/${slug}/${origName}.jpg`);
  const outDir = `${root}/app/public/img/${slug}`; fs.mkdirSync(outDir, { recursive: true });
  const out = `${outDir}/${appKey}.webp`;
  await sharp(src).resize({ width: 720, height: 1280, fit: 'cover' }).webp({ quality: 76 }).toFile(out);
  total += fs.statSync(out).size; n++;
}
console.log(`importadas ${n} imágenes · media ${(total / n / 1024).toFixed(0)} KB · total ${(total / 1048576).toFixed(1)} MB`);
