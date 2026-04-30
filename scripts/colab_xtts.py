"""
DEPRECATED FOR NAHUATL AUDIO: Kokoro Spanish phonemization causes known Nahuatl
errors, including Spanish ll -> y and a/e/o vowel glide artifacts. Use
scripts/generate-openai-audio.js for pronunciation-controlled machine audio.

EHN Audio Generation via Kokoro TTS (Spanish voice)
====================================================
Python 3.12 compatible. Runs on Google Colab free T4 GPU.

Why Kokoro instead of F5-TTS / Coqui XTTS:
  - F5-TTS is English-only — gives garbage output for non-English text
  - Coqui TTS 0.22.0 requires Python <3.12 (Colab is 3.12)
  - Kokoro is MIT licensed, Python 3.12 native, high-quality, has Spanish

Why Spanish voice:
  - EHN and Spanish share the same 5-vowel system (a e i o u)
  - Spanish handles tl, tz, nasal clusters much better than English
  - EHN x = /ʃ/ → we write "sh" which Spanish phonemizes correctly

Setup:
  1. colab.research.google.com → new notebook
  2. Runtime → Change runtime type → T4 GPU
  3. Paste each CELL section into its own Colab cell, run in order
  4. Upload your .sqlite DB when Cell 2 prompts
  5. Listen to the test word in Cell 4 before committing to all 1200 files
  6. Download audio_output.zip at the end → unzip into public/audio/
"""


# ── CELL 1: Install ───────────────────────────────────────────────────────────

import subprocess, sys

result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "-q",
     "kokoro>=0.9.2", "soundfile", "transformers", "torch", "scipy", "numpy"],
    capture_output=True, text=True
)
if result.returncode != 0:
    print(result.stderr[-2000:])
    raise RuntimeError("Install failed.")

print("Packages installed.")

# Verify
import torch
import soundfile as sf
import numpy as np
from kokoro import KPipeline
print(f"PyTorch {torch.__version__} | CUDA: {torch.cuda.is_available()}")
print("Kokoro imported OK.")


# ── CELL 2: Upload SQLite database ────────────────────────────────────────────

from google.colab import files as colab_files
import sqlite3

print("Upload fcn_master_lexicon_phase8_6_primer.sqlite now...")
uploaded = colab_files.upload()
DB_PATH = list(uploaded.keys())[0]

conn = sqlite3.connect(DB_PATH)
n_vocab = conn.execute("SELECT COUNT(*) FROM lesson_vocab").fetchone()[0]
n_dlg   = conn.execute("SELECT COUNT(*) FROM lesson_dialogues WHERE utterance_normalized IS NOT NULL").fetchone()[0]
conn.close()
print(f"DB OK — {n_vocab} vocab rows, {n_dlg} dialogue rows")


# ── CELL 3: Load Kokoro with Spanish voice ────────────────────────────────────

# Kokoro uses eSpeak-ng under the hood for Spanish phonemization,
# which correctly handles Spanish phonemes — close to EHN.
pipeline = KPipeline(lang_code='es')

# List available Spanish voices so you can choose
print("Available voices:")
import os
from pathlib import Path

# Kokoro downloads voice files on first use; list what's available
# after pipeline init
try:
    voice_path = Path(pipeline.repo_dir) / "voices"
    voices = sorted(f.stem for f in voice_path.glob("*.pt"))
    spanish = [v for v in voices if v.startswith("e")]
    print("  Spanish voices:", spanish if spanish else "(will download on first use)")
    print("  All voices:", voices[:20])
except:
    print("  (voice list unavailable before first use — continuing)")

# Default Spanish voice — will be confirmed in the test cell below
VOICE = 'ef_dora'   # female Spanish; change if this doesn't exist
SPEED = 1.0


# ── CELL 4: Test — listen before running 1200 files ──────────────────────────

import re
from IPython.display import Audio, display

PARENTHETICAL_DIRECTIONS = re.compile(r"\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\}")
OPEN_PARENTHETICAL_DIRECTION = re.compile(r"[\(\[\{][^()\[\]{}]*$")

def strip_parenthetical_directions(text: str) -> str:
    cleaned = str(text or "")
    previous = None
    while previous != cleaned:
        previous = cleaned
        cleaned = PARENTHETICAL_DIRECTIONS.sub(" ", cleaned)
    cleaned = OPEN_PARENTHETICAL_DIRECTION.sub(" ", cleaned)
    cleaned = re.sub(r"\s+([,.;:?!])", r"\1", cleaned)
    cleaned = re.sub(r"([¿¡])\s+", r"\1", cleaned)
    return " ".join(cleaned.split()).strip()

def ehn_to_spanish(text: str) -> str:
    """
    Converts EHN orthography into Spanish for Kokoro.

    x  → sh    EHN x = /ʃ/; eSpeak Spanish phonemizes 'sh' as /ʃ/
    āēīōū → aeiou   strip macrons (vowel length not phonemic in Spanish)
    tl, tz, ch → unchanged (eSpeak Spanish handles these)
    """
    text = strip_parenthetical_directions(text)
    text = text.translate(str.maketrans("āēīōū", "aeiou")).lower()
    text = re.sub(r"x", "sh", text)
    text = re.sub(r"[¿?!.,;:()\[\]\"']", "", text)
    return " ".join(text.split()).strip()

def synth(text: str) -> np.ndarray | None:
    """Synthesise one string, return float32 audio array at 24000 Hz."""
    processed = ehn_to_spanish(text)
    if not processed:
        return None
    chunks = []
    try:
        for _, _, audio in pipeline(processed, voice=VOICE, speed=SPEED):
            chunks.append(audio)
    except Exception as e:
        print(f"  synth FAIL {text!r}: {e}")
        return None
    return np.concatenate(chunks) if chunks else None

# Test a handful of words — listen before committing to the full run
test_words = ["ax quema", "intla", "nelia", "tlahtoa", "nimitztlahtoa"]
print("Preprocessing check:")
for w in test_words:
    print(f"  {w!r:25s} → {ehn_to_spanish(w)!r}")

print("\nSynthesising test words...")
test_audio = []
SR = 24000
silence = np.zeros(int(SR * 0.4))
for w in test_words:
    a = synth(w)
    if a is not None:
        test_audio.extend([a, silence])
        print(f"  {w!r} OK ({len(a)/SR:.2f}s)")
    else:
        print(f"  {w!r} FAILED")

if test_audio:
    combined = np.concatenate(test_audio)
    sf.write("test_output.wav", combined, SR)
    print("\nListening to test words:")
    display(Audio("test_output.wav"))
else:
    print("All test words failed — check VOICE name above.")


# ── CELL 4b: If wrong voice name, list and pick ───────────────────────────────
# Only run this cell if Cell 4 failed with a voice-not-found error.
# It will try a few common names and print which one works.

for candidate in ['ef_dora', 'ef_sarah', 'es_f_1', 'es_1']:
    try:
        chunks = list(pipeline("hola", voice=candidate, speed=1.0))
        print(f"Voice '{candidate}' works!")
        VOICE = candidate
        break
    except Exception as e:
        print(f"Voice '{candidate}': {e}")


# ── CELL 5: Generate vocab audio ─────────────────────────────────────────────

from pathlib import Path

conn = sqlite3.connect(DB_PATH)
vocab_rows = conn.execute(
    "SELECT id, display_form FROM lesson_vocab ORDER BY id"
).fetchall()
conn.close()

OUT_VOCAB = Path("output/vocab")
OUT_VOCAB.mkdir(parents=True, exist_ok=True)

print(f"Generating {len(vocab_rows)} vocab words...")
v_ok = v_fail = v_skip = 0

for vid, text in vocab_rows:
    out = OUT_VOCAB / f"{vid}.wav"
    if out.exists():
        v_skip += 1
        continue
    audio = synth(text)
    if audio is not None:
        sf.write(str(out), audio, SR)
        v_ok += 1
        if v_ok % 100 == 0:
            print(f"  {v_ok + v_skip}/{len(vocab_rows)}...")
    else:
        v_fail += 1

print(f"\nVocab: {v_ok} generated, {v_skip} skipped, {v_fail} failed")


# ── CELL 6: Generate dialogue audio ───────────────────────────────────────────

conn = sqlite3.connect(DB_PATH)
dlg_rows = conn.execute(
    "SELECT lesson_dialogue_id, utterance_normalized FROM lesson_dialogues "
    "WHERE utterance_normalized IS NOT NULL AND length(trim(utterance_normalized)) > 2 "
    "ORDER BY lesson_dialogue_id"
).fetchall()
conn.close()

OUT_DLG = Path("output/dialogue")
OUT_DLG.mkdir(parents=True, exist_ok=True)

print(f"Generating {len(dlg_rows)} dialogue lines...")
d_ok = d_fail = d_skip = 0

for did, text in dlg_rows:
    out = OUT_DLG / f"{did}.wav"
    if out.exists():
        d_skip += 1
        continue
    audio = synth(text)
    if audio is not None:
        sf.write(str(out), audio, SR)
        d_ok += 1
        if d_ok % 100 == 0:
            print(f"  {d_ok + d_skip}/{len(dlg_rows)}...")
    else:
        d_fail += 1

print(f"\nDialogue: {d_ok} generated, {d_skip} skipped, {d_fail} failed")


# ── CELL 7: Download ──────────────────────────────────────────────────────────

import shutil

shutil.make_archive("/content/audio_output", "zip", "/content/output")
colab_files.download("/content/audio_output.zip")
print("Done! Unzip audio_output.zip and copy vocab/ and dialogue/ into public/audio/")
