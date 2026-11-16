// Reproductor de episodio: slideshow Ken Burns + subtítulos/diálogos temporizados + barra de progreso
import { sceneFrames, charHTML, getEpisode } from './data.js';
import { parseScript, timeline, fallbackCues } from './script.js';
import { recordProgress, epCompletion } from './store.js';
import { monetization } from './monetization.js';
import { esc, fmtTime, h } from './util.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
function findChar(series, speaker) {
  const sp = norm(speaker).replace(/\s*\(.*$/, ''); if (!sp) return null;
  return series.characters.find(c => { const n = norm(c.name); return n === sp || n.split(/[\s/]+/)[0] === sp.split(' ')[0] || norm(c.id).split('-')[0] === sp.split(' ')[0]; });
}
const SPEEDS = [1, 1.5, 2];

/**
 * @param {HTMLElement} host
 * @param {object} opts { series, ep, mode: 'full'|'feed', autoplay, onNext(n), onEnd() }
 */
export function mountPlayer(host, { series, ep, mode = 'full', autoplay = true, onNext, onEnd }) {
  const D = ep.durationSec || 90;
  const cues = timeline(ep.script ? parseScript(ep.script) : fallbackCues(series, ep), D);
  const fr = sceneFrames(series, ep);
  const el = h(`<div class="player ${mode}">
    <div class="kb-stage">${fr.map((f, i) => `<div class="kb-frame kb-${i % 4}" style="background-image:${f.bg}">${f.url ? `<img src="${f.url}" alt="" onerror="this.remove()">` : ''}</div>`).join('')}</div>
    <div class="pl-shade"></div>
    <div class="pl-scene-chip" hidden></div>
    <div class="pl-subs"></div>
    <div class="pl-tapzones"><div data-z="prev"></div><div data-z="toggle"></div><div data-z="next"></div></div>
    <div class="pl-paused" hidden>❚❚</div>
    <div class="pl-bottom">
      <div class="pl-progress"><div class="pl-buffer"></div><div class="pl-fill"></div><div class="pl-knob"></div></div>
      <div class="pl-controls">
        <button class="pl-btn" data-c="play" aria-label="Pausa">❚❚</button>
        <span class="pl-time">0:00 / ${fmtTime(D)}</span>
        <span class="spacer"></span>
        <button class="pl-btn pill-btn" data-c="speed">1x</button>
        <button class="pl-btn pill-btn" data-c="skip" title="Saltar al final">⏭</button>
      </div>
    </div>
    <div class="pl-end" hidden></div>
  </div>`);
  host.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const frameEls = [...el.querySelectorAll('.kb-frame')];
  let t = 0, playing = false, speed = 1, raf = 0, last = 0, curCue = -1, curFrame = -1, ended = false, lastSave = 0;
  const startAt = epCompletion(series.id, ep.n); if (startAt > 0.05 && startAt < 0.9 && mode === 'full') t = startAt * D;

  function renderCue(i) {
    if (i === curCue) return; curCue = i;
    const subs = $('.pl-subs'); const c = cues[i];
    // chip de escena: la última escena anterior al cue actual
    let sc = null; for (let j = i; j >= 0; j--) if (cues[j]?.type === 'scene') { sc = cues[j]; break; }
    const chip = $('.pl-scene-chip'); chip.hidden = !sc; if (sc) chip.textContent = sc.text;
    if (!c) { subs.innerHTML = ''; return; }
    let html;
    if (c.type === 'dialogue') {
      const ch = findChar(series, c.speaker);
      html = `<div class="bubble ${ch && ch === series.characters[0] ? 'lead' : ''}">${ch ? charHTML(series, ch, 'sm') : `<div class="avatar sm"><span>${esc(c.speaker[0])}</span></div>`}<div><b>${esc(ch ? ch.name.split(' ')[0] : c.speaker)}</b>${c.paren ? `<i> (${esc(c.paren)})</i>` : ''}<p>${esc(c.text)}</p></div></div>`;
    } else if (c.type === 'scene') html = `<div class="scene-title ${/cliffhanger/i.test(c.text) ? 'cliff' : ''}">${esc(c.text)}</div>`;
    else if (c.type === 'screen') html = `<div class="screen-text">${esc(c.text)}</div>`;
    else html = `<div class="action">${esc(c.text)}</div>`;
    subs.innerHTML = html;
  }
  function renderFrame(i) {
    if (i === curFrame) return; curFrame = i;
    frameEls.forEach((f, k) => f.classList.toggle('on', k === i));
  }
  function update() {
    const p = Math.min(1, t / D);
    $('.pl-fill').style.width = p * 100 + '%'; $('.pl-knob').style.left = p * 100 + '%';
    $('.pl-time').textContent = `${fmtTime(t)} / ${fmtTime(D)}`;
    let i = cues.findIndex(c => t >= c.start && t < c.end); if (i < 0) i = t >= D * 0.96 ? cues.length - 1 : 0;
    renderCue(i);
    renderFrame(Math.min(fr.length - 1, Math.floor(p * fr.length)));
    if (Date.now() - lastSave > 2500 && t > 1) { lastSave = Date.now(); recordProgress(series.id, ep.n, p); }
  }
  function loop(now) {
    if (!playing) return;
    const dt = (now - last) / 1000; last = now;
    t += Math.min(dt, 0.25) * speed;
    if (t >= D) { t = D; update(); return finish(); }
    update(); raf = requestAnimationFrame(loop);
  }
  function play() { if (ended) return; playing = true; el.classList.remove('paused'); $('.pl-paused').hidden = true; $('[data-c=play]').textContent = '❚❚'; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
  function pause(show = true) { playing = false; cancelAnimationFrame(raf); el.classList.add('paused'); $('[data-c=play]').textContent = '▶'; if (show) $('.pl-paused').hidden = false; }
  function seek(nt) { t = Math.max(0, Math.min(D - 0.01, nt)); if (ended) { ended = false; $('.pl-end').hidden = true; } update(); }
  function finish() {
    playing = false; ended = true; recordProgress(series.id, ep.n, 1);
    const next = getEpisode(series, ep.n + 1);
    const box = $('.pl-end'); box.hidden = false;
    const locked = next && monetization.accessSync(series, next.n) === 'locked';
    box.innerHTML = `<div class="end-card">
      <div class="end-kicker">CONTINUARÁ…</div>
      <h3>${esc(ep.hook || ep.title)}</h3>
      ${next ? `<div class="end-next"><span class="muted tiny">Episodio ${next.n} de ${series.totalEpisodes}</span><b>${esc(next.title)}</b><p>${esc(next.hook)}</p></div>
        <button class="btn block red big" data-e="next">${locked ? '🔒 ' : '▶ '}Siguiente episodio</button>
        ${!locked && mode === 'full' ? '<div class="end-auto tiny muted">Reproducción automática en <b>6</b> s</div>' : ''}`
        : `<div class="end-next"><b>Has llegado al último episodio disponible</b><p>${series.totalEpisodes > series.episodes.length ? `Próximos episodios en producción (${series.episodes.length}/${series.totalEpisodes}).` : '¡Fin de la serie!'}</p></div>`}
      <button class="btn block ghost" data-e="replay">↺ Volver a ver</button>
    </div>`;
    box.querySelector('[data-e=replay]').onclick = (e) => { e.stopPropagation(); clearInterval(auto); seek(0); play(); };
    let auto;
    if (next) {
      box.querySelector('[data-e=next]').onclick = (e) => { e.stopPropagation(); clearInterval(auto); onNext?.(next.n); };
      const a = box.querySelector('.end-auto b');
      if (a) { let k = 6; auto = setInterval(() => { k--; if (!document.body.contains(a)) return clearInterval(auto); a.textContent = k; if (k <= 0) { clearInterval(auto); onNext?.(next.n); } }, 1000); }
    }
    onEnd?.();
  }
  // controles
  el.querySelector('[data-z=toggle]').onclick = () => playing ? pause() : play();
  el.querySelector('[data-z=next]').onclick = () => { const nx = cues.find(c => c.start > t + 0.05); seek(nx ? nx.start : D - 0.05); if (!playing) play(); };
  el.querySelector('[data-z=prev]').onclick = () => { const cur = cues.findIndex(c => t >= c.start && t < c.end); const pv = cues[Math.max(0, cur - 1)]; seek(pv ? pv.start : 0); if (!playing) play(); };
  $('[data-c=play]').onclick = (e) => { e.stopPropagation(); playing ? pause() : play(); };
  $('[data-c=speed]').onclick = (e) => { e.stopPropagation(); speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; e.target.textContent = speed + 'x'; };
  $('[data-c=skip]').onclick = (e) => { e.stopPropagation(); seek(D - 0.3); if (!playing) play(); };
  const prog = $('.pl-progress');
  const seekFromEvent = (ev) => { const r = prog.getBoundingClientRect(); const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left; seek((x / r.width) * D); };
  prog.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); seekFromEvent(ev); const mv = (e2) => seekFromEvent(e2); const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
  const onVis = () => { if (document.hidden && playing) pause(); };
  document.addEventListener('visibilitychange', onVis);
  update(); if (autoplay) play(); else pause(false);
  return {
    play, pause, el,
    destroy() { if (t > 1 && !ended) recordProgress(series.id, ep.n, t / D); playing = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); el.remove(); },
  };
}
