// Inyecta la lista de precache en dist/sw.js y crea redirecciones /admin y /dashboard
import fs from 'node:fs';
import path from 'node:path';
const dist = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../dist');
const walk = (d, out = []) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, out) : out.push(path.relative(dist, p)); } return out; };
const files = walk(dist).filter(f => f !== 'sw.js' && !f.endsWith('.map')).map(f => './' + f.split(path.sep).join('/'));
const shell = ['./', ...files.filter(f => !f.startsWith('./img/') && !f.startsWith('./descargas/') && !f.startsWith('./guiones/') && !f.startsWith('./media/'))];
const imgs = files.filter(f => f.startsWith('./img/'));
const version = 'sd-v3-' + Date.now().toString(36);
let sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
sw = sw.replace('__VERSION__', version).replace('self.__PRECACHE__', JSON.stringify(shell)).replace('self.__IMAGES__', JSON.stringify(imgs));
fs.writeFileSync(path.join(dist, 'sw.js'), sw);
for (const r of ['admin', 'dashboard', 'perfil', 'feed', 'guiones', 'tienda', 'vip']) {
  fs.mkdirSync(path.join(dist, r), { recursive: true });
  fs.writeFileSync(path.join(dist, r, 'index.html'), `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../#/${r}"><script>location.replace('../#/${r}')</script>`);
}
fs.writeFileSync(path.join(dist, '404.html'), `<!doctype html><meta charset="utf-8"><script>var p=location.pathname.split('/').filter(Boolean).pop()||'';location.replace((location.pathname.replace(/[^/]*\\/?$/,''))+'#/'+p)</script>`);
console.log(`[postbuild] sw ${version}: ${shell.length} shell + ${imgs.length} imágenes precache`);
