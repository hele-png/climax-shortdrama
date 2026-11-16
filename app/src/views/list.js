import { getCatalog } from '../data.js';
import { user, continueWatching } from '../store.js';
import { topbar, card, empty } from './common.js';
export function renderList(view) {
  const cat = getCatalog(), favs = user().favorites.map(id => cat.find(s => s.id === id)).filter(Boolean);
  const cont = continueWatching(cat).map(x => x.s);
  view.innerHTML = `${topbar()}<div class="page">
    <h1 class="page-title">Mi lista</h1>
    ${favs.length ? `<div class="grid">${favs.map(s => card(s, { showProgress: true })).join('')}</div>` : empty('bookmark', 'Tu lista está vacía', 'Guarda series con el botón Mi lista para verlas más tarde.', '<a class="btn sm secondary" href="#/">Explorar series</a>')}
    <h2 class="section-title">En curso</h2>
    ${cont.length ? `<div class="grid">${cont.map(s => card(s, { showProgress: true })).join('')}</div>` : empty('player-play', 'Nada en curso', 'Las series que empieces aparecerán aquí.')}
    <h2 class="section-title">Todo el catálogo</h2>
    <div class="grid">${cat.map(s => card(s)).join('')}</div></div>`;
}
