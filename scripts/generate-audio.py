#!/usr/bin/env python3
"""
Generates EHN pronunciation audio using facebook/mms-tts-nhe
(Meta Massively Multilingual Speech - Eastern Huasteca Nahuatl).

This model was trained on native EHN speaker recordings (New Testament,
Chicontepec, Veracruz). It is the only publicly available TTS model
specifically trained on Eastern Huasteca Nahuatl (ISO 639-3: nhe).

Usage:
    pip install -r scripts/requirements-audio.txt
    python scripts/generate-audio.py                  # generate all missing
    python scripts/generate-audio.py --regen          # delete all & regenerate
    python scripts/generate-audio.py --test intla nelia ax  # test specific words

Tuning parameters (edit SYNTH_PARAMS below if output is mumbled):
    noise_scale         lower -> fewer dropped phonemes (default 0.667, try 0.3)
    noise_scale_duration lower -> more even timing (default 0.8, try 0.6)
    speaking_rate       lower -> slower, clearer (default 1.0, try 0.85)

Output:
    public/audio/vocab/{id}.wav        - one file per lesson_vocab row
    public/audio/dialogue/{id}.wav     - one file per lesson_dialogues row

The script is resumable: existing files are skipped.
Add public/audio/ to .gitignore if the files are too large to commit.
"""

import sys
import sqlite3
import argparse
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_CANDIDATES = [
    PROJECT_ROOT / "fcn_master_lexicon_phase8_6_primer.sqlite",
    PROJECT_ROOT.parent / "molina" / "curriculum" / "fcn_master_lexicon_phase8_6_primer.sqlite",
]
DB_PATH = next((path for path in DB_CANDIDATES if path.exists()), DB_CANDIDATES[0])
VOCAB_DIR = PROJECT_ROOT / "public" / "audio" / "vocab"
DIALOGUE_DIR = PROJECT_ROOT / "public" / "audio" / "dialogue"
MODEL_ID = "facebook/mms-tts-nhe"

# Synthesis quality parameters
# Use model defaults. Quality issues are addressed via text preprocessing below.
SYNTH_PARAMS = {}


def safe_text(text: str) -> str:
    """
    Normalise text for the EHN VITS tokenizer.
    Keep: lowercase Latin letters and spaces.
    Strip: punctuation (¿ ? ! . ,), digits, everything else.
    Fold: macron/accent vowels to plain vowels because the MMS tokenizer is
    trained on a plain Latin character inventory.

    Also applies Nahuatl-specific syllabification hints:
    - Inserts a space before tl/tz/ch when immediately preceded by a consonant,
      so the affricate lands at syllable onset (e.g. intla -> in tla).
    - This prevents consonant-cluster compression that causes phoneme dropping.
    """
    import unicodedata

    folded = unicodedata.normalize("NFD", text.lower())
    folded = "".join(c for c in folded if unicodedata.category(c) != "Mn")

    keep = set("abcdefghijklmnopqrstuvwxyz ")
    cleaned = "".join(c for c in folded if c in keep)
    cleaned = " ".join(cleaned.split()).strip()

    # Protect digraphs, insert syllable-boundary space before them after a consonant,
    # then restore. Consonants = anything that's not a vowel or space.
    vowels = set("aeiou")
    for digraph, placeholder in [("tl", "\x00"), ("tz", "\x01"), ("ch", "\x02")]:
        cleaned = cleaned.replace(digraph, placeholder)

    result = []
    for i, ch in enumerate(cleaned):
        if ch in "\x00\x01\x02" and i > 0 and cleaned[i - 1] not in vowels and cleaned[i - 1] != " ":
            result.append(" ")
        result.append(ch)
    cleaned = "".join(result)

    cleaned = cleaned.replace("\x00", "tl").replace("\x01", "tz").replace("\x02", "ch")
    return " ".join(cleaned.split()).strip()


def synth(text: str, tokenizer, model, seed: int = 555):
    """Synthesise text -> int16 numpy waveform, or None on failure."""
    import torch
    import numpy as np
    from transformers import set_seed

    cleaned = safe_text(text)
    if not cleaned:
        return None
    try:
        inputs = tokenizer(text=cleaned, return_tensors="pt")
        set_seed(seed)
        with torch.no_grad():
            outputs = model(**inputs)
        wav = outputs.waveform[0].numpy()
        return (wav * 32767).clip(-32768, 32767).astype(np.int16)
    except Exception as exc:
        print(f"    FAIL ({exc})")
        return None


def write_wav(path: Path, wav, sample_rate: int) -> None:
    import scipy.io.wavfile
    scipy.io.wavfile.write(str(path), sample_rate, wav)


def process_batch(rows, out_dir: Path, label: str, tokenizer, model, sample_rate: int, regen: bool = False):
    gen = skip = fail = 0
    total = len(rows)
    for i, (file_id, text) in enumerate(rows, 1):
        out = out_dir / f"{file_id}.wav"
        if out.exists() and not regen:
            skip += 1
            continue
        if out.exists() and regen:
            out.unlink()
        short = text[:50].replace("\n", " ")
        print(f"  [{i:>4}/{total}] {short!r} ...", end=" ", flush=True)
        wav = synth(text, tokenizer, model)
        if wav is not None:
            write_wav(out, wav, sample_rate)
            print("OK")
            gen += 1
        else:
            fail += 1
    print(f"\n  {label}: {gen} generated, {skip} skipped, {fail} failed")
    return gen, skip, fail


def test_words(words: list[str], tokenizer, model, sample_rate: int, seeds: list[int] | None = None):
    """
    Synthesise words to temp WAV files for quick listening.
    If seeds is given, generates one file per seed per word so you can compare.
    """
    import tempfile
    seeds = seeds or [555]
    print(f"\nTesting {len(words)} word(s), {len(seeds)} seed(s) each\n")
    for word in words:
        cleaned = safe_text(word)
        print(f"  {word!r} (normalised: {cleaned!r})")
        for seed in seeds:
            wav = synth(word, tokenizer, model, seed=seed)
            if wav is not None:
                with tempfile.NamedTemporaryFile(
                    suffix=".wav", delete=False,
                    prefix=f"itzli_{word}_seed{seed}_"
                ) as f:
                    out_path = Path(f.name)
                write_wav(out_path, wav, sample_rate)
                print(f"    seed={seed:>6}  -> {out_path}")
            else:
                print(f"    seed={seed:>6}  -> FAILED")


def load_model():
    from transformers import VitsTokenizer, VitsModel
    print(f"Loading {MODEL_ID} ...")
    print("(First run downloads model weights; subsequent runs use cache)\n")
    try:
        tokenizer = VitsTokenizer.from_pretrained(MODEL_ID, local_files_only=True)
        model = VitsModel.from_pretrained(MODEL_ID, local_files_only=True)
    except OSError:
        tokenizer = VitsTokenizer.from_pretrained(MODEL_ID)
        model = VitsModel.from_pretrained(MODEL_ID)
    model.eval()
    return tokenizer, model


def main():
    parser = argparse.ArgumentParser(description="Generate EHN TTS audio")
    parser.add_argument("--regen", action="store_true", help="Delete and regenerate all files")
    parser.add_argument("--test", nargs="+", metavar="WORD", help="Test specific words (writes temp WAVs)")
    parser.add_argument("--seeds", nargs="+", type=int, metavar="N",
                        default=[555],
                        help="Seeds to try with --test (default: 555). "
                             "E.g. --seeds 42 555 1337 7 99 to compare 5 versions.")
    args = parser.parse_args()

    if not DB_PATH.exists():
        sys.exit(f"ERROR: database not found at {DB_PATH}\n"
                 "Run this script from the itzli-app directory.")

    VOCAB_DIR.mkdir(parents=True, exist_ok=True)
    DIALOGUE_DIR.mkdir(parents=True, exist_ok=True)

    tokenizer, model = load_model()
    # Apply synthesis params via config (forward() doesn't accept them as kwargs)
    for k, v in SYNTH_PARAMS.items():
        setattr(model.config, k, v)
    sample_rate = model.config.sampling_rate
    print(f"Model loaded. Output sample rate: {sample_rate} Hz")
    print(f"Synthesis params: {SYNTH_PARAMS}\n")

    if args.test:
        test_words(args.test, tokenizer, model, sample_rate, seeds=args.seeds)
        return

    if args.regen:
        print("--regen: will delete and regenerate all existing files\n")

    conn = sqlite3.connect(str(DB_PATH))

    # Vocabulary
    vocab_rows = conn.execute(
        "SELECT id, display_form FROM lesson_vocab ORDER BY id"
    ).fetchall()
    print(f"=== Vocabulary: {len(vocab_rows)} words ===")
    process_batch(vocab_rows, VOCAB_DIR, "Vocab", tokenizer, model, sample_rate, regen=args.regen)

    # Dialogues
    dialogue_rows = conn.execute(
        "SELECT lesson_dialogue_id, utterance_normalized "
        "FROM lesson_dialogues "
        "WHERE utterance_normalized IS NOT NULL "
        "  AND length(trim(utterance_normalized)) > 2 "
        "ORDER BY lesson_dialogue_id"
    ).fetchall()
    print(f"\n=== Dialogues: {len(dialogue_rows)} lines ===")
    process_batch(dialogue_rows, DIALOGUE_DIR, "Dialogue", tokenizer, model, sample_rate, regen=args.regen)

    conn.close()

    # Summary
    vocab_files = list(VOCAB_DIR.glob("*.wav"))
    dialogue_files = list(DIALOGUE_DIR.glob("*.wav"))
    total_bytes = sum(f.stat().st_size for f in vocab_files + dialogue_files)
    print(f"\n{'='*50}")
    print(f"  Vocab files:    {len(vocab_files):>4}  ->  {VOCAB_DIR}")
    print(f"  Dialogue files: {len(dialogue_files):>4}  ->  {DIALOGUE_DIR}")
    print(f"  Total size:     {total_bytes / 1_000_000:.1f} MB")
    print(f"\nAudio served at /audio/vocab/{{id}}.wav and /audio/dialogue/{{id}}.wav")
    print("Add public/audio/ to .gitignore if it exceeds your repo size budget.")


if __name__ == "__main__":
    main()
