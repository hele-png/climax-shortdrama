// Reproductor de episodio: slideshow Ken Burns + subtítulos/diálogos temporizados + barra de progreso
import { sceneFrames, charHTML, getEpisode } from './data.js';
import { parseScript, timeline, fallbackCues } from './script.js';
import { recordProgress, epCompletion } from './store.js';
import { monetization } from './monetization.js';
import { esc, fmtTime, h } from './util.js';
import { ic } from './icons.js';
const PAUSE = ic('player-pause-f', 22), PLAY = ic('player-play-f', 22);
const VOL = ic('volume', 20), MUTE = ic('volume-off', 20);
const cueCache = new Map();
const loadCues = (u) => { if (!cueCache.has(u)) cueCache.set(u, fetch(u).then(r => r.ok ? r.json() : null).catch(() => null)); return cueCache.get(u); };
let userMuted = false;

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
  let D = ep.durationSec || 90;
  let cues = timeline(ep.script ? parseScript(ep.script) : fallbackCues(series, ep), D);
  const fr = sceneFrames(series, ep);
  const el = h(`<div class="player ${mode}">
    <div class="kb-stage">${fr.map((f, i) => `<div class="kb-frame kb-${i % 4}">${f.url ? `<img src="${f.url}" alt="" onerror="this.remove()">` : ''}</div>`).join('')}</div>
    ${ep.video ? `<video class="pl-video" playsinline webkit-playsinline preload="metadata" poster="${fr[fr.length - 1]?.url || ''}"></video>` : ''}
    <div class="pl-shade"></div>
    ${ep.video ? '<span class="pl-tag">' + ic('movie', 13) + 'Vídeo</span>' : ''}
    <button class="pl-unmute" hidden>${MUTE}Toca para activar el sonido</button>
    <div class="pl-scene-chip" hidden></div>
    <div class="pl-subs"></div>
    <div class="pl-tapzones"><div data-z="prev"></div><div data-z="toggle"></div><div data-z="next"></div></div>
    <div class="pl-paused" hidden>${ic('player-play-f', 34)}</div>
    <div class="pl-bottom">
      <div class="pl-progress"><div class="pl-buffer"></div><div class="pl-fill"></div><div class="pl-knob"></div></div>
      <div class="pl-controls">
        <button class="pl-btn" data-c="play" aria-label="Reproducir o pausar">${PAUSE}</button>
        <span class="pl-time">0:00 / ${fmtTime(D)}</span>
        <span class="spacer"></span>
        ${ep.audio || ep.video ? `<button class="pl-btn" data-c="mute" aria-label="Silenciar">${VOL}</button>` : ''}
        <button class="pl-btn pill-btn" data-c="speed">1x</button>
        <button class="pl-btn" data-c="skip" aria-label="Saltar al final">${ic('player-skip-forward', 22)}</button>
      </div>
    </div>
    <div class="pl-end" hidden></div>
  </div>`);
  host.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const frameEls = [...el.querySelectorAll('.kb-frame')];
  let t = 0, playing = false, speed = 1, raf = 0, last = 0, curCue = -1, curFrame = -1, ended = false, lastSave = 0;
  // ---- audio / vídeo: el medio manda el reloj cuando está listo; si falla, sigue el reloj interno (mudo)
  let media = null, mediaOk = false, frameOf = null, destroyed = false;
  if (ep.video) media = el.querySelector('.pl-video');
  else if (ep.audio) { media = new Audio(); media.preload = 'auto'; }
  const setMuteIcon = () => { const b = $('[data-c=mute]'); if (b && media) b.innerHTML = media.muted ? MUTE : VOL; $('.pl-unmute').hidden = !(media && media.muted && !userMuted && playing); };
  function tryPlayMedia() {
    if (!media || !mediaOk) return;
    media.muted = userMuted || media.muted && !navigator.userActivation?.hasBeenActive;
    const p = media.play(); setMuteIcon();
    if (p && p.catch) p.catch((err) => { if (err?.name === 'NotAllowedError' && !media.muted) { media.muted = true; media.play().catch(() => {}); setMuteIcon(); } });
  }
  if (media) {
    media.addEventListener('loadedmetadata', () => {
      if (destroyed) return; mediaOk = true; if (isFinite(media.duration) && media.duration > 1) D = media.duration;
      if (t > 0.5) media.currentTime = Math.min(t, D - 0.5);
      if (playing) tryPlayMedia(); update();
    });
    media.addEventListener('error', () => { mediaOk = false; });
    media.addEventListener('ended', () => { if (!ended) { t = D; update(); finish(); } });
    media.addEventListener('volumechange', setMuteIcon);
    if (ep.video) el.classList.add('has-video');
  }
  if (ep.cues) loadCues(ep.cues).then(meta => {
    if (!meta || destroyed || !meta.cues?.length) return;
    const frac = t / D; cues = meta.cues; D = media && mediaOk && isFinite(media.duration) ? media.duration : meta.duration;
    // un fotograma por escena del guion (sincronizado con el audio)
    let k = 0; frameOf = cues.map((c, i) => { if (c.type === 'scene' && i > 0) k = (k + 1) % fr.length; return k; });
    if (!mediaOk) t = frac * D; curCue = -1; update();
    if (media && !media.src) { media.src = ep.video || ep.audio; media.load(); }
  });
  else if (media) { media.src = ep.video || ep.audio; }
  const startAt = epCompletion(series.id, ep.n); if (startAt > 0.05 && startAt < 0.9 && mode === 'full') t = startAt * D;

  function renderCue(i) {
    if (i === curCue) return; curCue = i;
    const subs = $('.pl-subs'); const c = cues[i];
    // chip de escena: la última escena anterior al cue actual
    let sc = null; for (let j = i; j >= 0; j--) if (cues[j]?.type === 'scene') { sc = cues[j]; break; }
    const chip = $('.pl-scene-chip'); chip.hidden = !sc || c === sc; if (sc) chip.textContent = sc.text.replace(/^ESC\.\s*\d+\s*[—-]\s*/i, '');
    if (!c) { subs.innerHTML = ''; return; }
    let html;
    if (c.type === 'dialogue') {
      const ch = findChar(series, c.speaker);
      const who = ch ? ch.name.split(/[\s/]+/)[0] : c.speaker.replace(/\s*\(.*$/, '');
      html = `<div class="sub"><span class="sub-who">${esc(who)}${c.paren ? ` <em>${esc(c.paren)}</em>` : ''}</span><p>${esc(c.text)}</p></div>`;
    } else if (c.type === 'scene') html = `<div class="slate ${/cliffhanger/i.test(c.text) ? 'cliff' : ''}">${esc(c.text.replace(/^ESC\.\s*\d+\s*[—-]\s*/i, ''))}</div>`;
    else if (c.type === 'screen') html = `<div class="screen-text">${esc(c.text)}</div>`;
    else html = `<div class="sub action"><p>${esc(c.text)}</p></div>`;
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
    renderFrame(frameOf ? frameOf[Math.max(0, i)] : Math.min(fr.length - 1, Math.floor(p * fr.length)));
    if (Date.now() - lastSave > 2500 && t > 1) { lastSave = Date.now(); recordProgress(series.id, ep.n, p); }
  }
  function loop(now) {
    if (!playing) return;
    const dt = (now - last) / 1000; last = now;
    if (media && mediaOk && !media.paused && media.readyState >= 2) t = media.currentTime;
    else t += Math.min(dt, 0.25) * speed;
    if (t >= D - (media && mediaOk ? 0.05 : 0)) { t = D; update(); return finish(); }
    update(); raf = requestAnimationFrame(loop);
  }
  function play() { if (ended) return; playing = true; tryPlayMedia(); el.classList.remove('paused'); $('.pl-paused').hidden = true; $('[data-c=play]').innerHTML = PAUSE; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
  function pause(show = true) { playing = false; media?.pause(); setMuteIcon(); cancelAnimationFrame(raf); el.classList.add('paused'); $('[data-c=play]').innerHTML = PLAY; if (show) $('.pl-paused').hidden = false; }
  function seek(nt) { t = Math.max(0, Math.min(D - 0.01, nt)); if (media && mediaOk) { try { media.currentTime = t; } catch {} } if (ended) { ended = false; $('.pl-end').hidden = true; } update(); }
  function finish() {
    playing = false; ended = true; media?.pause(); setMuteIcon(); recordProgress(series.id, ep.n, 1);
    const next = getEpisode(series, ep.n + 1);
    const box = $('.pl-end'); box.hidden = false;
    const locked = next && monetization.accessSync(series, next.n) === 'locked';
    const nf = next ? sceneFrames(series, next) : [];
    box.innerHTML = `<div class="end-card">
      <div class="end-kicker">Continuará</div>
      <h3>${esc(ep.hook || ep.title)}</h3>
      ${next ? `<div class="end-next"><div class="end-thumb">${nf[0]?.url ? `<img src="${nf[0].url}" alt="">` : ''}${locked ? `<span class="end-lock">${ic('lock', 16)}</span>` : ''}</div><div><small>Siguiente · Episodio ${next.n} de ${series.totalEpisodes}</small><b>${esc(next.title)}</b><p>${esc(next.hook)}</p></div></div>
        <button class="btn block primary lg" data-e="next">${locked ? ic('lock', 18) + 'Desbloquear episodio ' + next.n : ic('player-play-f', 18) + 'Ver episodio ' + next.n}</button>
        ${!locked && mode === 'full' ? '<div class="end-auto">Empieza en <b>6</b> s</div>' : ''}`
        : `<div class="end-next solo"><div><b>Has llegado al último episodio disponible</b><p>${series.totalEpisodes > series.episodes.length ? `Próximos episodios en producción (${series.episodes.length} de ${series.totalEpisodes}).` : 'Fin de la serie.'}</p></div></div>`}
      <button class="btn block ghost" data-e="replay">${ic('rotate-clockwise', 18)}Volver a ver</button>
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
  $('[data-c=speed]').onclick = (e) => { e.stopPropagation(); speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; e.currentTarget.textContent = speed + 'x'; if (media) media.playbackRate = speed; };
  const toggleMute = (e) => { e.stopPropagation(); if (!media) return; media.muted = !media.muted; userMuted = media.muted; if (!media.muted && playing && media.paused) tryPlayMedia(); setMuteIcon(); };
  el.querySelector('[data-c=mute]')?.addEventListener('click', toggleMute);
  $('.pl-unmute').onclick = (e) => { e.stopPropagation(); if (media) { media.muted = false; userMuted = false; if (playing) tryPlayMedia(); setMuteIcon(); } };
  $('[data-c=skip]').onclick = (e) => { e.stopPropagation(); seek(D - 0.3); if (!playing) play(); };
  const prog = $('.pl-progress');
  const seekFromEvent = (ev) => { const r = prog.getBoundingClientRect(); const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left; seek((x / r.width) * D); };
  prog.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); seekFromEvent(ev); const mv = (e2) => seekFromEvent(e2); const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
  const onVis = () => { if (document.hidden && playing) pause(); };
  document.addEventListener('visibilitychange', onVis);
  update(); if (autoplay) play(); else pause(false);
  return {
    play, pause, el,
    destroy() { if (t > 1 && !ended) recordProgress(series.id, ep.n, t / D); playing = false; destroyed = true; if (media) { media.pause(); media.removeAttribute('src'); media.load(); } cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); el.remove(); },
  };
}
