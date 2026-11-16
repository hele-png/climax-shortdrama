// Parser tolerante de guiones markdown -> cues temporizados
const clean = (s) => s.replace(/\*\*|__|`/g, '').replace(/^\*(.*)\*$/, '$1').replace(/^_(.*)_$/, '$1').trim();
const DIALOGUE = /^\s*(?:[-–—]\s*)?\**\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9 .'’\-]{0,40}?)\s*(\([^)]*\))?\s*\**\s*:\s*\**\s*(.+)$/;
export function parseScript(md) {
  if (!md) return [];
  const cues = [];
  for (let raw of String(md).replace(/\r/g, '').split('\n')) {
    let line = raw.trim(); if (!line || /^-{3,}$/.test(line)) continue;
    if (/^#\s/.test(line)) continue; // título del episodio (ya está en la UI)
    const plain = line.replace(/\*\*/g, '');
    if (/^(Duraci[oó]n|Duration)\b/i.test(plain)) continue;
    const hk = plain.match(/^Hook[^:]*:\s*(.+)$/i); if (hk) { cues.push({ type: 'action', text: hk[1].trim() }); continue; }
    const scr = plain.replace(/^>\s*/, '').match(/^(EN PANTALLA|TEXTO EN PANTALLA|ON SCREEN|R[ÓO]TULO)\s*:\s*(.+)$/i); if (scr) { cues.push({ type: 'screen', text: scr[2].replace(/^["“](.*)["”]$/, '$1').trim() }); continue; }
    if (/^#{1,6}\s/.test(line) || /^(ESCENA|INT\.|EXT\.|INT |EXT )/i.test(line.replace(/\*/g, ''))) { cues.push({ type: 'scene', text: clean(line.replace(/^#+\s*/, '')) }); continue; }
    const m = line.match(DIALOGUE);
    if (m && !/^(https?|nota del)/i.test(m[1]) && m[1] === m[1].toUpperCase()) {
      let text = clean(m[3]); let paren = m[2] ? m[2].slice(1, -1) : '';
      const p2 = text.match(/^\(([^)]*)\)\s*(.*)$/); if (p2) { paren = paren || p2[1]; text = p2[2]; }
      if (text) { cues.push({ type: 'dialogue', speaker: clean(m[1]), paren, text }); continue; }
    }
    line = clean(line.replace(/^[>*\-]\s+/, '').replace(/^\[(.*)\]$/, '$1').replace(/^\((.*)\)$/, '$1'));
    if (line) cues.push({ type: 'action', text: line });
  }
  return cues;
}
/** Asigna start/end a cada cue repartiendo durationSec según longitud de texto (las escenas pesan poco) */
export function timeline(cues, durationSec) {
  const w = cues.map(c => c.type === 'scene' ? 1.2 : Math.max(2, c.text.length / 14) + (c.type === 'dialogue' ? 0.8 : 0.4));
  const total = w.reduce((a, b) => a + b, 0) || 1;
  const usable = durationSec * 0.94; let t = durationSec * 0.02;
  return cues.map((c, i) => { const d = (w[i] / total) * usable; const r = { ...c, start: t, end: t + d }; t += d; return r; });
}
export function fallbackCues(series, ep) {
  return [
    { type: 'scene', text: `${series.title} — Episodio ${ep.n}` },
    { type: 'action', text: ep.title },
    { type: 'action', text: ep.hook || series.logline },
    { type: 'action', text: 'Guion en producción por la IA… mientras tanto, disfruta del avance.' },
  ];
}
