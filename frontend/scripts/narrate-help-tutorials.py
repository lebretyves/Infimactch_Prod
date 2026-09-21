"""Prepare offline French narration, then mix it into all recorded help videos.
Requires Windows System.Speech, Python and FFmpeg (FFMPEG_BINARY or PATH).
Run --prepare BEFORE record-help-tutorials.mjs, then --mix AFTER recording.
"""
from pathlib import Path
import argparse, json, os, re, shutil, subprocess, wave
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('PROOF_DIR', str(ROOT / 'audits/help-videos-current')))
MEDIA = ROOT / 'frontend/public/guides/tutorials'
parser = argparse.ArgumentParser()
parser.add_argument('--prepare', action='store_true')
parser.add_argument('--mix', action='store_true')
args = parser.parse_args()
OUT.mkdir(parents=True, exist_ok=True)
if args.prepare:
    source = (ROOT / 'frontend/scripts/record-help-tutorials.mjs').read_text(encoding='utf-8')
    texts = list(dict.fromkeys(re.findall(r"hold\('([^'\n]*)'", source)))
    entries = [{'text': text, 'file': str(OUT / f'voice-{i:02}.wav')} for i, text in enumerate(texts)]
    catalog = OUT / 'voice-texts.json'
    catalog.write_text(json.dumps(entries, ensure_ascii=False), encoding='utf-8')
    ps = OUT / 'synthesize.ps1'
    ps.write_text("""param([string]$Catalog)
Add-Type -AssemblyName System.Speech
$speaker=New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
 $speaker.SelectVoice('Microsoft Hortense Desktop')
 $speaker.Rate=0
 foreach($entry in (Get-Content -Raw -Encoding UTF8 -LiteralPath $Catalog | ConvertFrom-Json)) {
  $speaker.SetOutputToWaveFile($entry.file)
  $speaker.Speak($entry.text)
  $speaker.SetOutputToNull()
 }
} finally { $speaker.Dispose() }
""", encoding='utf-8-sig')
    subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-File', str(ps), '-Catalog', str(catalog)], check=True)
    durations = {}
    for entry in entries:
        with wave.open(entry['file']) as wav:
            durations[entry['text']] = {'file': entry['file'], 'duration': wav.getnframes() / wav.getframerate()}
    (OUT / 'voice-durations.json').write_text(json.dumps(durations, ensure_ascii=False), encoding='utf-8')
    print(f'{len(durations)} French voice segments prepared')
if args.mix:
    ffmpeg = os.environ.get('FFMPEG_BINARY') or shutil.which('ffmpeg')
    if not ffmpeg:
        raise SystemExit('Set FFMPEG_BINARY to an FFmpeg build with libopus')
    voices = json.loads((OUT / 'voice-durations.json').read_text(encoding='utf-8'))
    reports = json.loads((OUT / 'recording-results.json').read_text(encoding='utf-8'))
    assert len(reports) == 6 and all(not r.get('error') for r in reports), 'All six recordings must pass first'
    results = []
    for report in reports:
        name = report['id']
        cues = report['captions']
        with wave.open(voices[cues[0]['text']]['file']) as wav:
            channels, width, rate = wav.getnchannels(), wav.getsampwidth(), wav.getframerate()
        stride = channels * width
        pcm = bytearray(round((report['duration'] + .3) * rate) * stride)
        for cue in cues:
            entry = voices[cue['text']]
            assert entry['duration'] + .15 <= cue['end'] - cue['start'], 'Narration exceeds chapter'
            with wave.open(entry['file']) as wav:
                assert (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) == (channels, width, rate)
                audio = wav.readframes(wav.getnframes())
            assert any(audio), 'Silent narration'
            start = round((cue['start'] + .15) * rate) * stride
            pcm[start:start + len(audio)] = audio
        track = OUT / f'{name}-fr.wav'
        with wave.open(str(track), 'wb') as wav:
            wav.setnchannels(channels); wav.setsampwidth(width); wav.setframerate(rate); wav.writeframes(pcm)
        original = MEDIA / f'{name}.webm'
        raw = OUT / f'{name}-silent.webm'
        shutil.copy2(original, raw)
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(raw), '-i', str(track), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '64k', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-metadata:s:a:0', 'language=fra', '-shortest', str(original)], check=True)
        decoded = subprocess.run([ffmpeg, '-hide_banner', '-i', str(original), '-f', 'null', '-'], capture_output=True, text=True)
        assert decoded.returncode == 0 and 'Audio: opus' in decoded.stderr and 'Video: vp8' in decoded.stderr, decoded.stderr
        results.append({'id': name, 'status': 'PASS', 'seconds': report['duration'], 'voice': 'Microsoft Hortense Desktop / fr-FR', 'audio': 'Opus 64 kbit/s', 'captions': len(cues), 'bytes': original.stat().st_size, 'decodedAllFramesAndAudio': True})
        print(name, 'voice and full decode PASS')
    (OUT / 'audio-validation.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
