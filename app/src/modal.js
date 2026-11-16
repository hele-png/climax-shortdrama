import { h } from './util.js';
export function openModal(html, { cls = '', dismissible = true, onClose } = {}) {
  const root = document.getElementById('modal-root');
  const el = h(`<div class="modal-wrap ${cls}"><div class="modal-backdrop"></div><div class="modal-sheet" role="dialog" aria-modal="true">${dismissible ? '<button class="modal-x" aria-label="Cerrar">✕</button>' : ''}<div class="modal-body">${html}</div></div></div>`);
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  let closed = false;
  const close = (v) => { if (closed) return; closed = true; el.classList.remove('in'); setTimeout(() => el.remove(), 300); onClose?.(v); };
  if (dismissible) { el.querySelector('.modal-backdrop').onclick = () => close(); el.querySelector('.modal-x').onclick = () => close(); }
  return { el, body: el.querySelector('.modal-body'), close };
}
