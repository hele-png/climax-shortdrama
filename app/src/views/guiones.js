// Sección "Guiones": biblia, lista de episodios y guiones completos de cada serie (markdown)
import { marked } from 'marked';
import { getSeries, getCatalog, coverHTML, genre } from '../data.js';
marked.setOptions({ breaks: true, gfm: true });
import { esc } from '../util.js';
import { topbar } from './common.js';
import { ic } from '../icons.js';
const ZIP = './descargas/climax-guiones-e-imagenes.zip';
let idx = null;
const rank = (d) => d === 'biblia' ? 0 : d === 'episodios' ? 1 : /^ep\d/.test(d) ? 2 + +d.slice(2) : 99;
const getIndex = async () => {
  if (idx) return idx;
  const raw = await fetch('./guiones/index.json').then(r => r.json()).catch(() => []);
  const order = getCatalog().map(s => s.slug);
  raw.forEach(g => g.docs.sort((a, b) => rank(a) - rank(b)));
  return idx = raw.sort((a, b) => (order.indexOf(a.slug) + 1 || 99) - (order.indexOf(b.slug) + 1 || 99));
};
const docLabel = (d) => d === 'biblia' ? 'Biblia' : d === 'episodios' ? 'Episodios' : /^ep\d+/.test(d) ? 'Ep. ' + (+d.slice(2)) : d;

export async function renderGuiones(view, slug, doc) {
  const index = await getIndex();
  if (!slug) {
    view.innerHTML = `${topbar('Guiones')}<div class="pad">
      <p class="muted">Biblia de cada serie, lista completa de episodios con sus hooks y los 10 primeros guiones escritos (con diálogos y descripciones de escena).</p>
      <a class="btn primary block" href="${ZIP}" download>${ic('download', 18)}Descargar guiones e imágenes (.zip)</a>
      <a class="list-item boxed" href="#/guiones/_/concepto"><span class="li-ic">${ic('book-2', 20)}</span><span class="li-t"><b>Concepto editorial</b><small>Nichos, tono, estructura y cliffhangers</small></span>${ic('chevron-right', 18, 'li-go')}</a>
      ${index.map(g => { const s = getSeries(g.slug); return `<div class="g-row">${s ? coverHTML(s, 'thumb') : ''}<div class="grow"><b>${esc(g.title)}</b><small class="muted">${s ? esc(genre(s.niche)) + ' · ' : ''}${g.docs.filter(d => /^ep\d/.test(d)).length} guiones</small>
        <div class="g-docs">${g.docs.map(d => `<a href="#/guiones/${g.slug}/${d}">${docLabel(d)}</a>`).join('')}</div></div></div>`; }).join('')}
    </div>`;
    return;
  }
  const g = index.find(x => x.slug === slug);
  const url = slug === '_' ? './guiones/concepto.md' : `./guiones/${slug}/${doc}.md`;
  const md = await fetch(url).then(r => r.ok ? r.text() : '# No encontrado').catch(() => '# Sin conexión');
  const s = getSeries(slug);
  const docs = g?.docs || [];
  const i = docs.indexOf(doc);
  view.innerHTML = `${topbar(g ? g.title : 'Concepto')}<div class="pad">
    ${docs.length ? `<div class="chips g-tabs">${docs.map(d => `<a class="chip ${d === doc ? 'on' : ''}" href="#/guiones/${slug}/${d}">${docLabel(d)}</a>`).join('')}</div>` : ''}
    <article class="prose">${marked.parse(md)}</article>
    <div class="row-btns g-nav">${i > 0 ? `<a class="btn secondary" href="#/guiones/${slug}/${docs[i - 1]}">${ic('chevron-left', 16)}${docLabel(docs[i - 1])}</a>` : ''}<span class="spacer"></span>${i >= 0 && i < docs.length - 1 ? `<a class="btn secondary" href="#/guiones/${slug}/${docs[i + 1]}">${docLabel(docs[i + 1])}${ic('chevron-right', 16)}</a>` : ''}</div>
    ${s && /^ep\d+/.test(doc) ? `<a class="btn primary block" href="#/ver/${s.slug}/${+doc.slice(2)}">${ic('player-play-f', 18)}Ver este episodio en la app</a>` : ''}
    <a class="btn ghost block" href="#/guiones">Todos los guiones</a>
  </div>`;
  view.querySelector('.g-tabs .on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}
