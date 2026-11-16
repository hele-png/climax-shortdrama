#!/usr/bin/env python3
"""Genera audio (TTS edge-tts es-ES + música/SFX sintetizados) y cues JSON para los episodios con guion.
Uso: python3 scripts/gen_audio.py [slug[:ep]] ...   (sin args = todos)"""
import asyncio, json, re, os, sys, subprocess, hashlib, unicodedata, math, wave
import numpy as np
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, '..', 'content', 'data.json')
OUT = os.path.join(ROOT, 'public', 'media')
CACHE = '/workspace/shortdrama/audio/tts-cache'
WORK = '/workspace/shortdrama/audio/work'
SR = 24000
os.makedirs(CACHE, exist_ok=True); os.makedirs(WORK, exist_ok=True)

def norm(s): return unicodedata.normalize('NFD', str(s or '').lower()).encode('ascii', 'ignore').decode().strip()

# ---------------- reparto de voces ----------------
ALV, ELV, XIM = 'es-ES-AlvaroNeural', 'es-ES-ElviraNeural', 'es-ES-XimenaNeural'
V = lambda v, p=0, r=0: {'voice': v, 'pitch': f'{p:+d}Hz', 'rate': f'{r:+d}%'}
NARRATOR = V(XIM, -10, -6)
F_SLOTS = [V(ELV), V(XIM, 8, 5), V(ELV, 14, 7), V(XIM, -4, 0)]
M_SLOTS = [V(ALV), V(ALV, -18, -6), V(ALV, 12, 7), V(ALV, -8, 4)]
F_OLD = [V(ELV, -14, -10), V(XIM, -18, -10)]
M_OLD = [V(ALV, -28, -14), V(ALV, -22, -8)]
CHILD = V(XIM, 40, 5)
F_MINOR = [V(ELV, 6, 9), V(XIM, 2, 8), V(ELV, -6, 3)]
M_MINOR = [V(ALV, 6, 10), V(ALV, -10, 2), V(ALV, 18, 4)]
FEM_WORDS = {'invitada', 'recepcionista', 'doctora', 'enfermera', 'criada', 'elena', 'abuela', 'locutora'}

def age_of(c):
    m = re.match(r'\d+', str(c.get('age', ''))); return int(m.group()) if m else 30
def gender_of(c):
    d = ' ' + norm(c.get('description', '')) + ' '
    if re.search(r'\b(woman|girl|mujer|chica|nina|abuela|madre)\b', d): return 'F'
    return 'M'

def speaker_counts(s):
    cnt = {}
    for e in s['episodes']:
        for m in re.finditer(r'^\*\*([^*:]+):\*\*', e.get('script') or '', re.M): cnt[m.group(1)] = cnt.get(m.group(1), 0) + 1
    return cnt

def match_char(s, label):
    toks = [t for t in re.split(r'[\s/."()]+', norm(re.sub(r'\(.*?\)', '', label))) if t]
    if not toks: return None
    for c in s['characters']:
        ntoks = set(t for t in re.split(r'[\s/."()]+', norm(c['name'])) if t) | {norm(c['id']).split('-')[0]}
        if toks[-1] in ntoks or (toks[0] in ntoks and toks[0] not in ('don', 'dr', 'sr', 'abuela')): return c
    return None

def build_cast(s):
    cnt = speaker_counts(s)
    lines = {c['id']: 0 for c in s['characters']}
    for lab, n in cnt.items():
        c = match_char(s, lab)
        if c: lines[c['id']] += n
    cast = {}; fi = mi = fo = mo = 0
    for c in sorted(s['characters'], key=lambda c: -lines[c['id']]):
        a, g = age_of(c), gender_of(c)
        if a <= 13: v = CHILD
        elif a >= 50 and g == 'F': v = F_OLD[fo % 2]; fo += 1
        elif a >= 50: v = M_OLD[mo % 2]; mo += 1
        elif g == 'F': v = F_SLOTS[fi % 4]; fi += 1
        else: v = M_SLOTS[mi % 4]; mi += 1
        cast[c['id']] = {'name': c['name'], **v}
    minor = {}; fk = mk = 0
    for lab in sorted(cnt):
        if lab.lower().startswith(('duraci', 'hook')) or match_char(s, lab): continue
        base = norm(re.sub(r'\(.*?\)', '', lab)).strip()
        if base in minor: continue
        if base == 'nino': minor[base] = CHILD; continue
        fem = base.split()[0] in FEM_WORDS
        if fem: minor[base] = F_MINOR[fk % 3]; fk += 1
        else: minor[base] = M_MINOR[mk % 3]; mk += 1
    return cast, minor

def voice_for(s, cast, minor, label):
    c = match_char(s, label)
    if c: return cast[c['id']], c
    base = norm(re.sub(r'\(.*?\)', '', label)).strip()
    return minor.get(base, M_MINOR[0]), None

# ---------------- parser (equivalente a src/script.js) ----------------
DIALOGUE = re.compile(r"^\s*(?:[-–—]\s*)?\**\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9 .'’\-]{0,40}?)\s*(\([^)]*\))?\s*\**\s*:\s*\**\s*(.+)$")
def clean(s): return re.sub(r'^_(.*)_$', r'\1', re.sub(r'^\*(.*)\*$', r'\1', re.sub(r'\*\*|__|`', '', s))).strip()
def parse(md):
    cues = []
    for raw in md.replace('\r', '').split('\n'):
        line = raw.strip()
        if not line or re.match(r'^-{3,}$', line) or re.match(r'^#\s', line): continue
        plain = line.replace('**', '')
        if re.match(r'^(Duraci[oó]n|Duration)\b', plain, re.I): continue
        hk = re.match(r'^Hook[^:]*:\s*(.+)$', plain, re.I)
        if hk: cues.append({'type': 'hook', 'text': hk.group(1).strip()}); continue
        scr = re.match(r'^(EN PANTALLA|TEXTO EN PANTALLA|ON SCREEN|R[ÓO]TULO)\s*(\([^)]*\))?\s*:\s*(.+)$', re.sub(r'^>\s*', '', plain), re.I)
        if scr: cues.append({'type': 'screen', 'text': re.sub(r'^["“](.*)["”]$', r'\1', scr.group(3).strip())}); continue
        if re.match(r'^#{1,6}\s', line) or re.match(r'^(ESCENA|INT\.|EXT\.|INT |EXT )', line.replace('*', ''), re.I):
            cues.append({'type': 'scene', 'text': clean(re.sub(r'^#+\s*', '', line))}); continue
        m = DIALOGUE.match(line)
        if m and not re.match(r'^(https?|nota del)', m.group(1), re.I) and m.group(1) == m.group(1).upper():
            text = clean(m.group(3)); paren = m.group(2)[1:-1] if m.group(2) else ''
            p2 = re.match(r'^\(([^)]*)\)\s*(.*)$', text)
            if p2: paren = paren or p2.group(1); text = p2.group(2)
            if text: cues.append({'type': 'dialogue', 'speaker': clean(m.group(1)), 'paren': paren, 'text': text}); continue
        line = clean(re.sub(r'^\((.*)\)$', r'\1', re.sub(r'^\[(.*)\]$', r'\1', re.sub(r'^[>*\-]\s+', '', line))))
        if line: cues.append({'type': 'action', 'text': line})
    return cues

def speakable(t):
    t = re.sub(r'\([^)]*\)', '', t)
    t = re.sub(r'\b([A-ZÁÉÍÓÚÑÜ]{4,})\b', lambda m: m.group(1).capitalize(), t)
    t = re.sub(r'\s+', ' ', t).replace('...', '…').strip()
    return t
def narr_short(t):
    t = speakable(re.sub(r'^(Plano [^:]*|Primer[a-z]* plano[^:]*|Fundido[^:]*|Negro total)\s*[:.]\s*', '', t, flags=re.I))
    first = re.split(r'(?<=[.!?…])\s+', t)[0]
    w = first.split()
    if len(w) > 18:
        cut = ' '.join(w[:18]); k = cut.rfind(',')
        first = (cut[:k] if k > 40 else cut).rstrip(',;:') + '.'
    return first

def prosody(paren, base):
    p = norm(paren); v = dict(base); vol = 0
    r = int(v['rate'][:-1]); pi = int(v['pitch'][:-2])
    if re.search(r'susurr|baja la voz|en voz baja|al oido', p): r -= 8; vol = -25
    elif re.search(r'grit|furios|rabia|explota|ruge', p): r += 6; vol = 15; pi += 3
    elif re.search(r'llor|sollo|rota|temblor|debil', p): r -= 10; pi -= 2
    elif re.search(r'fri[ao]|helad|seca|sonrisa', p): r -= 4
    v['rate'] = f'{r:+d}%'; v['pitch'] = f'{pi:+d}Hz'; v['volume'] = f'{vol:+d}%'
    return v

# ---------------- TTS ----------------
SEM = None
async def tts(text, v):
    key = hashlib.md5(json.dumps([text, v], sort_keys=True).encode()).hexdigest()
    mp3 = os.path.join(CACHE, key + '.mp3')
    if not os.path.exists(mp3) or os.path.getsize(mp3) < 500:
        async with SEM:
            for attempt in range(4):
                try:
                    await edge_tts.Communicate(text, v['voice'], rate=v['rate'], pitch=v['pitch'], volume=v.get('volume', '+0%')).save(mp3 + '.tmp')
                    os.replace(mp3 + '.tmp', mp3); break
                except Exception as ex:
                    if attempt == 3: raise
                    await asyncio.sleep(2 + attempt * 3)
    return mp3

def load_pcm(path, filt=None):
    cmd = ['ffmpeg', '-v', 'error', '-i', path] + (['-af', filt] if filt else []) + ['-f', 's16le', '-ac', '1', '-ar', str(SR), '-']
    b = subprocess.run(cmd, capture_output=True, check=True).stdout
    a = np.frombuffer(b, np.int16).astype(np.float32) / 32768
    # recorta silencios de los extremos
    idx = np.where(np.abs(a) > 0.01)[0]
    if len(idx): a = a[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.08 * SR)]
    return a

# ---------------- música / SFX sintetizados ----------------
MOODS = {
    'esposa-del-mar':      {'root': 55.0,  'amb': 'waves', 'prog': [0, -4, 3, -2]},
    'repartidor-heredero': {'root': 61.74, 'amb': 'city',  'prog': [0, 3, -4, -2]},
    'cien-dias':           {'root': 58.27, 'amb': 'clock', 'prog': [0, -4, -2, 3]},
    'renaci':              {'root': 49.0,  'amb': 'fire',  'prog': [0, 5, -4, -2]},
    'loba-rechazada':      {'root': 51.91, 'amb': 'wind',  'prog': [0, -2, -4, -5]},
}
def onepole(x, a):
    y = np.empty_like(x); acc = 0.0
    # vectorizado por bloques con lfilter manual
    from itertools import accumulate
    y = np.array(list(accumulate(x, lambda p, v: p + a * (v - p))), dtype=np.float32)
    return y
def lowpass(x, fc):
    # FFT brick-ish lowpass suave
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / fc) ** 4); return np.fft.irfft(X, len(x)).astype(np.float32)
def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / (1 + (f / hi) ** 4)) * (1 / (1 + (lo / np.maximum(f, 1)) ** 4)); return np.fft.irfft(X, len(x)).astype(np.float32)

def bed(slug, dur, seed=0):
    m = MOODS.get(slug, MOODS['esposa-del-mar']); rng = np.random.default_rng(seed)
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n, np.float32)
    seg = 8.0
    for k in range(int(dur // seg) + 1):
        semi = m['prog'][k % 4]; f0 = m['root'] * 2 ** (semi / 12)
        a0, a1 = int(k * seg * SR), min(n, int((k + 1) * seg * SR + 2 * SR))
        if a0 >= n: break
        tt = t[a0:a1] - k * seg; env = np.minimum(1, tt / 2.0) * np.minimum(1, np.maximum(0, (seg + 2 - tt) / 2.0))
        chord = [1, 2 ** (3 / 12), 2 ** (7 / 12), 2, 2 * 2 ** (7 / 12)]
        sig = np.zeros(a1 - a0, np.float32)
        for j, r in enumerate(chord):
            for det in (-0.4, 0.4):
                sig += (0.5 / (j + 1.5)) * np.sin(2 * np.pi * (f0 * 2 * r + det) * tt + rng.uniform(0, 6))
        out[a0:a1] += sig * env * 0.18
    out = lowpass(out, 900)
    # sub drone
    out += 0.10 * np.sin(2 * np.pi * m['root'] * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.05 * t))
    # pulso de tensión que crece hacia el final
    beat = 60 / 72; ph = np.mod(t, beat); ph2 = np.mod(t - 0.28, beat)
    thump = np.sin(2 * np.pi * 52 * t) * (np.exp(-ph * 14) + 0.6 * np.exp(-np.maximum(ph2, 0) * 14) * (t > 0.28))
    out += thump * 0.22 * np.clip((t / dur - 0.35) / 0.5, 0, 1)
    # ambiente
    noise = rng.standard_normal(n).astype(np.float32)
    amb = m['amb']
    if amb == 'waves': a = lowpass(noise, 500) * (0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7.5)) ** 2) * 0.5
    elif amb == 'city': a = lowpass(noise, 250) * 0.45 + bandpass(noise, 900, 1400) * 0.02
    elif amb == 'wind': a = bandpass(noise, 300, 1200) * (0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 11 + 1)) ** 3) * 0.35
    elif amb == 'fire':
        cr = (rng.random(n) > 0.9993).astype(np.float32) * rng.uniform(0.2, 1, n).astype(np.float32)
        a = bandpass(cr, 800, 5000) * 1.5 + lowpass(noise, 200) * 0.25
    else:  # clock
        tick = np.zeros(n, np.float32)
        for s0 in np.arange(0.5, dur, 1.0):
            i0 = int(s0 * SR); L = min(int(0.03 * SR), n - i0)
            if L > 0: tick[i0:i0 + L] += np.sin(2 * np.pi * 2400 * np.arange(L) / SR) * np.exp(-np.arange(L) / SR * 180) * 0.25
        a = tick + lowpass(noise, 200) * 0.15
    out += a.astype(np.float32)
    fade = np.minimum(1, t / 2.5) * np.minimum(1, (dur - t) / 2.0)
    out *= fade; out /= (np.max(np.abs(out)) + 1e-6); return (out * 0.5).astype(np.float32)

def whoosh(rng):
    L = int(0.7 * SR); t = np.arange(L) / SR; x = rng.standard_normal(L).astype(np.float32)
    x = bandpass(x, 400, 3000) * np.sin(np.pi * t / 0.7) ** 2
    return (x / (np.max(np.abs(x)) + 1e-6) * 0.25).astype(np.float32)
def sting(root, rng):
    L = int(5.0 * SR); t = np.arange(L) / SR; out = np.zeros(L, np.float32)
    rise = int(1.6 * SR); nz = rng.standard_normal(rise).astype(np.float32)
    out[:rise] += bandpass(nz, 1500, 8000) * (np.arange(rise) / rise) ** 3 * 0.5
    th = t[rise:] - t[rise]
    boom = np.sin(2 * np.pi * (70 * th - 18 * th ** 2 / 1.0).clip(0) ) * np.exp(-th * 1.6)
    boom = np.sin(2 * np.pi * np.cumsum(np.maximum(30, 75 - 40 * th)) / SR) * np.exp(-th * 1.4)
    cluster = sum(np.sin(2 * np.pi * root * 4 * r * th) for r in (1, 2 ** (1 / 12), 2 ** (6 / 12), 2 ** (11 / 12))) * np.exp(-th * 0.9) * 0.18
    out[rise:] += (boom * 0.9 + cluster).astype(np.float32)
    out /= np.max(np.abs(out)) + 1e-6; return (out * 0.8).astype(np.float32)

def write_wav(path, a, sr=SR):
    a = np.clip(a, -1, 1); b = (a * 32767).astype(np.int16).tobytes()
    with wave.open(path, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(b)

def dur_display(text, spoken):
    return max(spoken, min(5.5, 1.2 + len(text) / 22))

# ---------------- episodio ----------------
async def episode(s, e, cast, minor):
    cues = parse(e['script']); slug = s['slug']
    dialogs = [c for c in cues if c['type'] == 'dialogue']
    jobs = []  # (cue, [(text, voice, filt)])
    for c in cues:
        segs = []
        if c['type'] == 'hook':
            parts = re.split(r'["“”]', c['text']); quotes = parts[1::2]
            if quotes:
                for i, q in enumerate(quotes):
                    before = parts[2 * i]
                    sp = next((d for d in dialogs if norm(q)[:25] in norm(d['text'])), None)
                    if sp: v, _ = voice_for(s, cast, minor, sp['speaker'])
                    else:
                        ch = next((x for x in s['characters'] for tok in [norm(x['name']).split()[0]] if tok and tok in norm(before)[-60:]), None)
                        v = cast[ch['id']] if ch else NARRATOR
                    segs.append((speakable(q), {**v, 'volume': '+0%'}, None))
            else:
                segs.append((narr_short(c['text']), {**NARRATOR, 'volume': '-8%'}, None))
        elif c['type'] == 'dialogue':
            v, ch = voice_for(s, cast, minor, c['speaker'])
            filt = 'highpass=f=320,lowpass=f=3200,volume=1.4' if re.search(r'tel[eé]fono|^voz \(o\.s\.\)', c['speaker'], re.I) or re.search(r'tel[eé]fono|altavoz', c.get('paren', ''), re.I) else None
            if re.search(r'V\.O\.', c['speaker']): filt = 'aecho=0.8:0.6:40:0.25'
            segs.append((speakable(c['text']), prosody(c.get('paren', ''), v), filt))
        elif c['type'] == 'action':
            segs.append((narr_short(c['text']), {**NARRATOR, 'volume': '-8%'}, None))
        elif c['type'] == 'screen':
            segs.append((speakable(c['text']).capitalize() if c['text'].isupper() else speakable(c['text']), {**NARRATOR, 'volume': '+0%'}, None))
        jobs.append((c, segs))
    files = await asyncio.gather(*[asyncio.gather(*[tts(t, v) for (t, v, f) in segs if t]) for c, segs in jobs])
    # línea de tiempo
    rng = np.random.default_rng(int(hashlib.md5((slug + str(e['n'])).encode()).hexdigest()[:8], 16))
    voice_parts, sfx_parts, out_cues = [], [], []
    t = 0.35; last_scene_t = None; cliff_t = None
    for (c, segs), fl in zip(jobs, files):
        segs = [s_ for s_ in segs if s_[0]]
        if c['type'] == 'scene':
            if out_cues: t += 0.25
            sfx_parts.append((max(0, t - 0.35), whoosh(rng)))
            is_cliff = bool(re.search(r'cliffhanger', c['text'], re.I))
            if is_cliff: cliff_t = t
            out_cues.append({'type': 'scene', 'text': c['text'], 'start': round(t, 2), 'end': round(t + 1.1, 2)}); t += 1.1; continue
        start = t; spoken = 0
        for (txt, v, filt), f in zip(segs, fl):
            a = load_pcm(f, filt); voice_parts.append((t + spoken, a)); spoken += len(a) / SR + 0.18
        d = dur_display(c['text'], spoken) if c['type'] != 'dialogue' else spoken
        cue = {'type': 'action' if c['type'] == 'hook' else c['type'], 'text': c['text'], 'start': round(start, 2), 'end': round(start + d, 2)}
        if c['type'] == 'dialogue': cue['speaker'] = c['speaker']; cue['paren'] = c.get('paren', '')
        out_cues.append(cue); t = start + d + (0.22 if c['type'] == 'dialogue' else 0.3)
    last_end = t
    total = last_end + 4.2
    n = int(total * SR) + SR
    voice = np.zeros(n, np.float32); sfx = np.zeros(n, np.float32)
    for st, a in voice_parts: i = int(st * SR); voice[i:i + len(a)] += a[: n - i]
    for st, a in sfx_parts: i = int(st * SR); sfx[i:i + len(a)] += a[: n - i]
    root = MOODS.get(slug, MOODS['esposa-del-mar'])['root']
    sg = sting(root, rng); i = int(max(0, last_end - 1.4) * SR); sfx[i:i + len(sg)] += sg[: n - i]
    b = bed(slug, n / SR, seed=e['n'])
    base = os.path.join(WORK, f"{slug}-ep{e['n']:02d}")
    write_wav(base + '-voice.wav', voice); write_wav(base + '-bed.wav', b); write_wav(base + '-sfx.wav', sfx)
    os.makedirs(os.path.join(OUT, slug), exist_ok=True)
    m4a = os.path.join(OUT, slug, f"ep{e['n']:02d}.m4a")
    fc = ('[1:a]volume=0.55[bed];[0:a]asplit=2[v][key];[bed][key]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=450:makeup=1[duck];'
          '[2:a]volume=0.7[fx];[v][duck][fx]amix=inputs=3:normalize=0:duration=longest,loudnorm=I=-15.3:TP=-1.5:LRA=11,aresample=44100[o]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', base + '-voice.wav', '-i', base + '-bed.wav', '-i', base + '-sfx.wav', '-filter_complex', fc,
                    '-map', '[o]', '-t', f'{total:.2f}', '-ac', '1', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', m4a], check=True)
    # wav maestro (para el piloto de vídeo)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', m4a, base + '-mix.wav'], check=True)
    meta = {'slug': slug, 'ep': e['n'], 'duration': round(total, 2), 'audio': f"media/{slug}/ep{e['n']:02d}.m4a", 'cliff': round(cliff_t, 2) if cliff_t else None, 'cues': out_cues}
    json.dump(meta, open(os.path.join(OUT, slug, f"ep{e['n']:02d}.json"), 'w'), ensure_ascii=False, indent=0)
    print(f"{slug} ep{e['n']:02d} {total:.1f}s {os.path.getsize(m4a)//1024}KB cues={len(out_cues)}", flush=True)
    return meta

async def main():
    global SEM; SEM = asyncio.Semaphore(6)
    data = json.load(open(CONTENT)); want = sys.argv[1:]
    casts = {}
    for s in data:
        cast, minor = build_cast(s); casts[s['slug']] = {'narrador': NARRATOR, 'personajes': cast, 'secundarios': minor}
    json.dump(casts, open(os.path.join(ROOT, '..', 'content', 'voces.json'), 'w'), ensure_ascii=False, indent=2)
    for s in data:
        cast, minor = casts[s['slug']]['personajes'], casts[s['slug']]['secundarios']
        for e in s['episodes']:
            if not e.get('script'): continue
            if want and not any(w == s['slug'] or w == f"{s['slug']}:{e['n']}" for w in want): continue
            await episode(s, e, cast, minor)
asyncio.run(main())
