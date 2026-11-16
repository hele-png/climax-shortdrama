import json, subprocess, sys, os
V = '/workspace/shortdrama/video'; MEDIA = '/workspace/shortdrama/app/public/media'
WORK = '/workspace/shortdrama/audio/work'
XF = 0.35
EPS = {
 'esposa-del-mar': ('esposa', 'esp', [0, 6.4, 13.3, 22.2, 35.25, 49.6, 53.75, 64.6, 80.2, 87.5, 101.94]),
 'repartidor-heredero': ('repartidor', 'rep', [0, 6.4, 17.6, 29.7, 39.1, 50.7, 63.8, 71.8, 84.7, 91.8, 105.7, 121.3, 128.2]),
}
def dur(f): return float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)
def ass_time(t): h=int(t//3600); m=int(t%3600//60); s=t%60; return f"{h}:{m:02d}:{s:05.2f}"
def make_ass(meta, path):
    hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter,38,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,3,1,2,60,60,230,1
Style: Who,Barlow Condensed,30,&H004B30F2,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,1,0,1,3,1,2,60,60,290,1
Style: Big,Barlow Condensed,92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,4,2,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for c in meta['cues']:
        a, b = ass_time(c['start']), ass_time(c['end'] + 0.15)
        if c['type'] == 'dialogue':
            who = c['speaker'].split('(')[0].strip()
            lines.append(f"Dialogue: 0,{a},{b},Who,,0,0,0,,{who}")
            lines.append(f"Dialogue: 0,{a},{b},Sub,,0,0,0,,{c['text']}")
        elif c['type'] == 'screen':
            lines.append(f"Dialogue: 1,{a},{ass_time(meta['duration'])},Big,,0,0,0,,{{\\fad(400,0)}}{c['text']}")
    open(path, 'w').write(hdr + '\n'.join(lines) + '\n')

for slug, (folder, pre, cuts) in EPS.items():
    meta = json.load(open(f'{MEDIA}/{slug}/ep01.json')); D = meta['duration']
    bounds = cuts + [D]; n = len(cuts)
    inputs, filt = [], []
    for i in range(n):
        f = f'{V}/clips/{folder}/{pre}-{i+1:02d}.mp4'; C = dur(f) - 0.05
        L = bounds[i+1] - bounds[i] + (XF if i < n-1 else 0)
        k = max(1.0, L / C)
        inputs += ['-i', f]
        filt.append(f'[{i}:v]setpts={k:.4f}*(PTS-STARTPTS),trim=duration={L:.3f},setpts=PTS-STARTPTS,fps=24,scale=720:1280,setsar=1,format=yuv420p[v{i}]')
        print(slug, i+1, f'need {L:.2f} clip {C:.2f} speed x{1/k:.3f}')
    cur = 'v0'; acc = 0
    for i in range(1, n):
        acc = bounds[i]
        filt.append(f'[{cur}][v{i}]xfade=transition=fade:duration={XF}:offset={acc:.3f}[x{i}]'); cur = f'x{i}'
    filt.append(f'[{cur}]fade=t=in:st=0:d=0.4,fade=t=out:st={D-0.8:.2f}:d=0.8[vout]')
    os.makedirs(f'{V}/out', exist_ok=True)
    clean = f'{V}/out/{slug}-ep01.mp4'
    audio = f'{WORK}/{slug}-ep01-mix.wav'
    enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-maxrate', '1250k', '-bufsize', '2500k', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', '-shortest']
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + inputs + ['-i', audio, '-filter_complex', ';'.join(filt), '-map', '[vout]', '-map', f'{n}:a', '-t', f'{D:.2f}'] + enc + [clean], check=True)
    ass = f'{V}/out/{slug}-ep01.ass'; make_ass(meta, ass)
    subs = f'{V}/out/{slug}-ep01-subtitulado.mp4'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', clean, '-vf', f'ass={ass}', '-c:a', 'copy'] + enc[:12] + ['-movflags', '+faststart', subs], check=True)
    for f in (clean, subs): print(f, f'{dur(f):.1f}s', f'{os.path.getsize(f)/1e6:.1f}MB')
