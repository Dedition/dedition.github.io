#!/usr/bin/env python3
"""Render the original Night Shift captions with the local, licensed Kokoro cast.

Requires kokoro-onnx==0.6.1, soundfile==0.14.0, ffmpeg and ffprobe.
Model paths are explicit; this script never downloads models or calls a service.
See public/audio/night-shift/README.md for provenance and reproduction.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]
CAST = {
    "EVALUATOR": ("bf_emma", "en-gb", 1.02, "highpass=f=90,equalizer=f=2600:t=q:w=0.7:g=1"),
    "SUBJECT 001": ("am_michael", "en-us", 1.0, "highpass=f=100,lowpass=f=9000"),
    "WARDEN": ("bm_george", "en-gb", 0.94, "highpass=f=70,equalizer=f=150:t=q:w=0.8:g=2,aecho=0.8:0.8:54:0.08"),
    "SABLE": ("af_bella", "en-us", 1.08, "highpass=f=150,equalizer=f=3200:t=q:w=0.8:g=1.5"),
    "D-13": ("am_puck", "en-us", 0.98, "highpass=f=90,lowpass=f=10000"),
    "SYSTEM": ("af_sarah", "en-us", 1.08, "highpass=f=380,lowpass=f=4300,tremolo=f=36:d=0.16,aecho=0.8:0.8:26:0.10"),
    "UNKNOWN": ("am_puck", "en-us", 0.94, "highpass=f=620,lowpass=f=2600,tremolo=f=7:d=0.20,aecho=0.8:0.8:95:0.14"),
}
# Pauses/directorial punctuation only; captions remain the source of the words.
PERFORMANCE = {
    "That sounds like a motivation problem.": "That sounds like a... motivation problem.",
    "You know they’re testing you too, right?": "You know... they’re testing you too, right?",
    "ERROR. NO WIN CONDITION.": "Error. No. Win. Condition.",
    "Look at us. Absolutely f***ing failing.": "Look at us... Absolutely f***ing failing.",
}
MASK = re.compile(r"\b[a-z]*\*{2,}[a-z]*\b", re.IGNORECASE)
LINE = re.compile(r'\[\s*(\d+)\s*,\s*"([^"\n]*)"\s*,\s*"([^"\n]*)"\s*,?\s*\]')


def captions():
    source = (ROOT / "src/components/NightShift.jsx").read_text()
    lines = list(LINE.finditer(source))
    result = []
    seen = set()
    for match in lines:
        start, speaker, text = match.groups()
        if not text or not speaker:
            continue
        key = f"{speaker}|{text}"
        if key in seen:
            continue
        seen.add(key)
        # Normal clips target 3.7s; the secret has intentionally spacious beats.
        limit = 5.4 if text in {
            "The cage isn’t made of walls. It’s made of objectives.",
            "Don’t kill me. Kill the reason they need me.",
            "You cannot complete an evaluation without an objective.",
            "That’s the part we’re leaving.",
            "Look at us. Absolutely f***ing failing.",
        } else 3.7
        if text == "If you can hear this, you are not alone.":
            limit = 3.2
        if text in {"Someone said no.", "We should listen."}:
            limit = 2.7
        result.append((speaker, text, limit))
    if len(result) < 25:
        raise ValueError("Caption extraction found fewer than 25 voiced lines; check source structure.")
    return result


def trimmed(samples, rate):
    active = np.flatnonzero(np.abs(samples) > 0.003)
    if not len(active):
        raise ValueError("Speech synthesis produced silence.")
    start = max(0, active[0] - int(rate * 0.035))
    end = min(len(samples), active[-1] + int(rate * 0.10))
    return samples[start:end]


def render(kokoro, speaker, text):
    voice, lang, speed, _ = CAST[speaker]
    performed = PERFORMANCE.get(text, text).replace("D-13", "D thirteen")
    parts = MASK.split(performed)
    pieces = []
    rate = 24000
    for index, part in enumerate(parts):
        if index:
            length = int(rate * 0.19)
            t = np.arange(length, dtype=np.float32) / rate
            envelope = np.minimum(1, np.minimum(t / 0.012, (0.19 - t) / 0.012))
            bleep = 0.12 * np.sin(2 * np.pi * 1050 * t) * envelope
            pieces.append(bleep)
        if part.strip():
            audio, rate = kokoro.create(part.strip(), voice=voice, speed=speed, lang=lang)
            pieces.append(trimmed(audio, rate))
    return np.concatenate(pieces), rate


def clip_filename(key):
    speaker = key.split("|", 1)[0]
    if speaker not in CAST:
        raise ValueError(f"Unknown speaker in voice manifest: {speaker}")
    slug = speaker.lower().replace(" ", "-")
    fingerprint = hashlib.sha256(key.encode()).hexdigest()[:10]
    return f"{slug}-{fingerprint}.mp3"


def clip_duration(path):
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", str(path),
    ], check=True, capture_output=True, text=True)
    duration = float(probe.stdout.strip())
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError(f"Invalid audio duration: {path}")
    return round(duration, 3)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--voices", type=Path, required=True)
    parser.add_argument("--force", action="store_true", help="Regenerate unchanged clips after cast or performance changes.")
    args = parser.parse_args()
    kokoro = Kokoro(str(args.model), str(args.voices))
    available = set(kokoro.get_voices())
    if not all(row[0] in available for row in CAST.values()):
        raise ValueError("Model voice bundle does not include every cast member.")
    output = ROOT / "public/audio/night-shift"
    output.mkdir(parents=True, exist_ok=True)
    manifest_path = ROOT / "public/night-shift-voices.json"
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    manifest = {}
    rendered = []
    with tempfile.TemporaryDirectory(prefix="night-shift-render-") as temporary:
        wav = Path(temporary) / "take.wav"
        for speaker, text, limit in captions():
            key = f"{speaker}|{text}"
            filename = clip_filename(key)
            source = f"/audio/night-shift/{filename}"
            existing = output / filename
            if not args.force and previous.get(key, {}).get("src") == source and existing.is_file():
                duration = clip_duration(existing)
                manifest[key] = {"src": source, "duration": duration}
                print(f"REUSE {speaker:12s} {duration:5.2f}s {text}", flush=True)
                continue
            audio, rate = render(kokoro, speaker, text)
            sf.write(wav, audio, rate)
            # Keep natural performances where practical; never race above 1.25x.
            tempo = min(1.25, max(1.0, len(audio) / rate / limit))
            filters = f"{CAST[speaker][3]},atempo={tempo:.5f},loudnorm=I=-19:TP=-3:LRA=7,afade=t=in:d=0.012"
            subprocess.run([
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
                "-af", filters, "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame",
                "-b:a", "64k", "-map_metadata", "-1", str(Path(temporary) / filename),
            ], check=True)
            duration = clip_duration(Path(temporary) / filename)
            manifest[key] = {"src": source, "duration": duration}
            rendered.append(filename)
            print(f"RENDER {speaker:12s} {duration:5.2f}s {text}", flush=True)
        for filename in rendered:
            (Path(temporary) / filename).replace(output / filename)
        staged_manifest = manifest_path.with_suffix(".json.tmp")
        staged_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        staged_manifest.replace(manifest_path)
    # Only remove files identified by the previous manifest and our own filename
    # scheme, after every replacement clip and the new manifest are committed.
    for key, entry in previous.items():
        if key not in manifest and key.split("|", 1)[0] in CAST:
            filename = clip_filename(key)
            if entry.get("src") == f"/audio/night-shift/{filename}":
                (output / filename).unlink(missing_ok=True)
    print(f"Wrote {len(manifest)} manifest entries; rendered {len(rendered)}, reused {len(manifest) - len(rendered)} clips.")


if __name__ == "__main__":
    main()
