// Copia ../content/data.json -> public/data.json (si existe) y genera public/manifest.json con las imágenes de public/img
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pub = path.join(root, 'public');
const contentFile = path.resolve(root, '../content/data.json');
const mockFile = path.join(root, 'src/mock-data.json');
let src = mockFile, label = 'mock';
if (fs.existsSync(contentFile)) {
  try { const d = JSON.parse(fs.readFileSync(contentFile, 'utf8')); if (Array.isArray(d) && d.length) { src = contentFile; label = 'content'; } }
  catch (e) { console.warn('[sync] content/data.json inválido, uso mock:', e.message); }
}
if (process.env.USE_MOCK) { src = mockFile; label = 'mock (forzado)'; }
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
// media (audio/vídeo generados): public/media/<slug>/epNN.{m4a,json,mp4}
let nAudio = 0, nVideo = 0;
for (const ser of data) for (const ep of (ser.episodes || [])) {
  const b = `media/${ser.slug}/ep${String(ep.n).padStart(2, '0')}`;
  if (fs.existsSync(path.join(pub, b + '.json')) && fs.existsSync(path.join(pub, b + '.m4a'))) { ep.audio = b + '.m4a'; ep.cues = b + '.json'; nAudio++; }
  if (fs.existsSync(path.join(pub, b + '.mp4'))) { ep.video = b + '.mp4'; nVideo++; }
}
fs.writeFileSync(path.join(pub, 'data.json'), JSON.stringify(data));
console.log(`[sync] media: ${nAudio} episodios con audio, ${nVideo} con vídeo`);
// manifest de imágenes
const imgDir = path.join(pub, 'img');
const images = [];
if (fs.existsSync(imgDir)) {
  for (const slug of fs.readdirSync(imgDir)) {
    const d = path.join(imgDir, slug);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d).sort()) {
      if (!/\.(png|jpe?g|webp|avif)$/i.test(f)) continue;
      const base = f.replace(/\.[^.]+$/, '');
      const type = base === 'cover' ? 'cover' : base.startsWith('char-') ? 'character' : base.startsWith('scene-') ? 'scene' : 'other';
      const st = fs.statSync(path.join(d, f));
      images.push({ slug, file: f, path: `img/${slug}/${f}`, type, key: base, bytes: st.size });
    }
  }
}
// episodio de cada escena (data.json -> images[].label "Ep. N — ...")
const sceneEp = {};
for (const ser of data) for (const im of (ser.images || [])) {
  const m = /scene-0*(\d+)/.exec(im.file || ''); const e = /Ep\.?\s*(\d+)/i.exec(im.label || '');
  if (m) sceneEp[`${ser.slug}/scene-${m[1]}`] = { episode: e ? +e[1] : null, label: im.label || null };
}
for (const im of images) if (im.type === 'scene') Object.assign(im, sceneEp[`${im.slug}/${im.key}`] || {});
// guiones markdown -> public/guiones/<slug>/*.md + índice
const contentDir = path.resolve(root, '../content');
const gDir = path.join(pub, 'guiones'); fs.rmSync(gDir, { recursive: true, force: true });
const gIndex = [];
if (fs.existsSync(contentDir)) {
  for (const d of fs.readdirSync(contentDir).sort()) {
    const full = path.join(contentDir, d); if (!d.startsWith('serie-') || !fs.statSync(full).isDirectory()) continue;
    const slug = d.replace(/^serie-/, ''); const ser = data.find(x => x.slug === slug);
    const docs = fs.readdirSync(full).filter(f => f.endsWith('.md') && f !== 'imagenes.md').sort();
    fs.mkdirSync(path.join(gDir, slug), { recursive: true });
    for (const f of docs) fs.copyFileSync(path.join(full, f), path.join(gDir, slug, f));
    gIndex.push({ slug, title: ser?.title || slug, docs: docs.map(f => f.replace(/\.md$/, '')) });
  }
  if (fs.existsSync(path.join(contentDir, 'concepto.md'))) fs.copyFileSync(path.join(contentDir, 'concepto.md'), path.join(gDir, 'concepto.md'));
}
fs.mkdirSync(gDir, { recursive: true });
fs.writeFileSync(path.join(gDir, 'index.json'), JSON.stringify(gIndex, null, 2));
const manifest = { generatedAt: new Date().toISOString(), dataSource: label, seriesCount: data.length, imageCount: images.length, images };
fs.writeFileSync(path.join(pub, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[sync] data: ${label} (${data.length} series) · imágenes: ${images.length}`);
