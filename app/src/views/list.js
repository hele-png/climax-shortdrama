import { getCatalog } from '../data.js';
import { user, continueWatching } from '../store.js';
import { topbar, card } from './common.js';
export function renderList(view) {
  const cat = getCatalog(), favs = user().favorites.map(id => cat.find(s => s.id === id)).filter(Boolean);
  const cont = continueWatching(cat).map(x => x.s);
  view.innerHTML = `${topbar()}<div class="pad"><h2 class="h2">Mi lista</h2>
    ${favs.length ? `<div class="grid">${favs.map(s => card(s, { showProgress: true })).join('')}</div>` : '<div class="empty">Aún no has guardado series. Pulsa <b>♡ Mi lista</b> en cualquier serie.</div>'}
    <h2 class="h2">En curso</h2>
    ${cont.length ? `<div class="grid">${cont.map(s => card(s, { showProgress: true })).join('')}</div>` : '<div class="empty">Empieza una serie y aparecerá aquí.</div>'}</div>`;
}
