#!/usr/bin/env python3
"""Pinned offline MMS comparisons. Never writes trusted course audio or releases holds."""
import argparse
import hashlib
import json
import os
import platform
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = ROOT / "data/audio-v3/current-course.json"
DEFAULT_OUTPUT = ROOT / "data/audio-v3/diagnostics/mms/candidates"
DEFAULT_INDEX = ROOT / "data/audio-v3/diagnostics/mms/candidate-index.private.json"
MODEL_ID = "facebook/mms-tts-nhe"
REVISION = "48cc378b4c7bc869e2282e6170a39f10930f20bf"
MODEL_CARD = "https://huggingface.co/facebook/mms-tts-nhe"
LICENSE = "CC-BY-NC-4.0"
SEED = 555
SETTINGS = {"speaking_rate": 1.0, "noise_scale": 0.667, "noise_scale_duration": 0.8}
MACRONS = str.maketrans({"ā": "a", "ē": "e", "ī": "i", "ō": "o", "ū": "u"})
# The pinned model's vocab.json, verified before inference. w/macrons are absent.
MODEL_SYMBOLS = set(" abcdefghijklmnopqrstuvxyz'-")
VERSION = "source-input-v3.1"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def digest(value):
    return hashlib.sha256(value.encode("utf-8") if isinstance(value, str) else value).hexdigest()

def diagnostic_location(filename):
    """Diagnostics have filesystem provenance, never an address in learner public/."""
    resolved = Path(filename).resolve()
    private_root = (ROOT / "data/audio-v3/diagnostics").resolve()
    if not resolved.is_relative_to(private_root) or resolved.is_relative_to((ROOT / "public").resolve()):
        raise ValueError("MMS diagnostic output must remain in private data/audio-v3/diagnostics")
    return {"audio_url": None, "private_audio_path": resolved.relative_to(ROOT.resolve()).as_posix(),
            "release_status": "private-diagnostic-only"}

def prepare_text(source, *, length_diagnostic=False, practical_w=False):
    """Keep every phonemic symbol or fail; no guessed cluster-space insertion."""
    text = unicodedata.normalize("NFC", str(source)).lower()
    limitations = []
    # Sentence punctuation is not a sound; retain its boundary as whitespace.
    text = re.sub(r"[¿¡?!.,;:]", " ", text)
    text = text.replace("’", "'").replace("ʼ", "'")
    if "w" in text:
        if not practical_w:
            raise ValueError("Model vocabulary lacks w; supply source orthography or explicit practical-w diagnostic")
        # Source hu before vowels, uh syllable-final: explicit, recorded /w/ mapping.
        text = re.sub(r"w(?=[aeioāēīōuū])", "hu", text)
        text = text.replace("w", "uh")
        limitations.append("Explicit diagnostic practical w→source hu/uh mapping; pronunciation unverified.")
    if any(ch in "āēīōū" for ch in text):
        if not length_diagnostic:
            raise ValueError("Model vocabulary lacks macrons; vowel length cannot be preserved by this tokenizer")
        text = text.translate(MACRONS)
        limitations.append("Diagnostic only: written vowel length folded explicitly; no claim of preserved length.")
    unknown = sorted(set(text) - MODEL_SYMBOLS)
    if unknown:
        raise ValueError("Unsupported input symbols (never silently deleted): " + repr(unknown))
    text = " ".join(text.split())
    if not text or not any(ch in "aeiou" for ch in text):
        raise ValueError("Empty or non-word synthesis input")
    return text, limitations

def load_records(filename):
    manifest = json.loads(Path(filename).read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1:
        raise ValueError("Unsupported manifest version")
    records = manifest.get("records", [])
    seen = set()
    for row in records:
        identity = (row["kind"], str(row["id"]))
        if identity in seen or row["kind"] not in {"vocab", "dialogue", "benchmark"}:
            raise ValueError("Invalid or duplicate stable identity: " + repr(identity))
        seen.add(identity)
        if digest(row["runtime_text"]) != row["text_sha256"] or digest(row["synthesis_text"]) != row["synthesis_text_sha256"]:
            raise ValueError("Changed text without matching provenance hash: " + repr(identity))
        if row.get("generation_allowed") and not source_supported(row):
            raise ValueError("Unknown/quarantined input cannot be synthesized: " + repr(identity))
    return records

def source_supported(row):
    return (row.get("content_review") in {"source-form", "source-supported-adaptation"}
            and bool(row.get("source_refs"))
            and all(re.match(r"^https://tlahtolli\.coerll\.utexas\.edu/", ref.get("source_url", ""))
                    for ref in row["source_refs"]))

def validate_waveform(waveform, rate):
    import numpy as np
    samples = np.asarray(waveform, dtype=np.float32)
    if samples.ndim != 1 or not len(samples) or not np.isfinite(samples).all():
        raise ValueError("Invalid/non-finite/empty waveform")
    duration = len(samples) / rate
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(samples ** 2)))
    clipped = float(np.mean(np.abs(samples) >= 1))
    if duration < 0.08 or duration > 90 or peak < 0.001 or rms < 0.0001 or clipped > 0.01:
        raise ValueError(f"Technical audio QA failed: duration={duration},peak={peak},rms={rms},clipped={clipped}")
    return {"duration_seconds": round(duration, 5), "peak": peak, "rms": rms,
            "clipped_sample_fraction": clipped, "technical_qa": "passed; no linguistic certification"}

def load_model(allow_download=False):
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    import torch
    from transformers import VitsModel, VitsTokenizer
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    tokenizer = VitsTokenizer.from_pretrained(MODEL_ID, revision=REVISION,
        local_files_only=not allow_download, token=False)
    model = VitsModel.from_pretrained(MODEL_ID, revision=REVISION,
        local_files_only=not allow_download, token=False, use_safetensors=True)
    tokenizer.normalize = False  # Never let the tokenizer silently filter unknown symbols.
    if set(MODEL_SYMBOLS) - set(tokenizer.get_vocab()):
        raise ValueError("Pinned tokenizer inventory differs from verified input profile")
    for key, value in SETTINGS.items():
        setattr(model.config, key, value)
    model.eval()
    return tokenizer, model

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", default=str(DEFAULT_INPUT))
    parser.add_argument("--benchmark", action="store_true")
    parser.add_argument("--held", action="store_true", help="Only source-supported current holds, candidate output only")
    parser.add_argument("--ids", default="")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--allow-download", action="store_true")
    parser.add_argument("--allow-length-diagnostic", action="store_true")
    parser.add_argument("--practical-w-diagnostic", action="store_true")
    args = parser.parse_args(argv)
    if args.limit < 0 or (args.dry_run and args.execute):
        parser.error("Invalid limit or conflicting execution flags")
    filename = ROOT / "src/data/audio-source-benchmark.json" if args.benchmark else Path(args.manifest)
    all_rows = load_records(filename)
    selected_ids = set(filter(None, args.ids.split(",")))
    rows = [r for r in all_rows if r.get("generation_allowed") is True and source_supported(r)]
    if args.held:
        rows = [r for r in rows if r.get("legacy_hold") is True]
    if selected_ids:
        rows = [r for r in rows if str(r["id"]) in selected_ids or f'{r["kind"]}:{r["id"]}' in selected_ids]
        found = {str(r["id"]) for r in rows} | {f'{r["kind"]}:{r["id"]}' for r in rows}
        if selected_ids - found:
            raise ValueError("Selected identities missing or quarantined: " + repr(sorted(selected_ids - found)))
    if args.limit:
        rows = rows[:args.limit]
    prepared, rejected = [], []
    for row in rows:
        try:
            text, limitations = prepare_text(row["synthesis_text"], length_diagnostic=args.allow_length_diagnostic,
                                            practical_w=args.practical_w_diagnostic)
            prepared.append((row, text, limitations))
        except ValueError as exc:
            rejected.append({"kind": row["kind"], "id": row["id"], "reason": str(exc)})
    print(json.dumps({"selected": len(rows), "ready": len(prepared), "rejected": rejected}, ensure_ascii=False, indent=2))
    if not args.execute:
        print("Dry run: no model loading, credential access, authentication, downloads, inference, or writes.")
        return 0
    if rejected:
        print("Refusing inference: unsupported inputs must be resolved or explicitly excluded first.")
        return 1
    diagnostic_location(DEFAULT_OUTPUT / "preflight.wav")
    tokenizer, model = load_model(args.allow_download)
    import torch
    import transformers
    import numpy as np
    import scipy
    import scipy.io.wavfile
    from transformers import set_seed
    rate = int(model.config.sampling_rate)
    if rate != 16000:
        raise ValueError("Unexpected pinned model sample rate")
    versions = {"python": platform.python_version(), "torch": torch.__version__,
                "transformers": transformers.__version__, "numpy": np.__version__, "scipy": scipy.__version__}
    from huggingface_hub import try_to_load_from_cache
    weights = try_to_load_from_cache(MODEL_ID, "model.safetensors", revision=REVISION)
    if not isinstance(weights, str) or not Path(weights).is_file():
        raise ValueError("Pinned model weights missing from cache after loading")
    recipe = {"model_id": MODEL_ID, "model_revision": REVISION, "seed": SEED,
              "model_weights_sha256": digest(Path(weights).read_bytes()),
              "input_manifest_sha256": digest(Path(filename).read_bytes()),
              "settings": SETTINGS, "preprocessing_version": VERSION,
              "length_diagnostic": args.allow_length_diagnostic, "practical_w_diagnostic": args.practical_w_diagnostic,
              "versions": versions, "generator_sha256": digest(Path(__file__).read_bytes())}
    recipe_hash = digest(json.dumps(recipe, sort_keys=True))
    out_root = DEFAULT_OUTPUT
    index_path = DEFAULT_INDEX
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {"schema_version": 1, "candidates": []}
    generated, failures = [], []
    for row, text, limitations in prepared:
        try:
            if not re.fullmatch(r"[A-Za-z0-9_-]+", str(row["id"])):
                raise ValueError("Unsafe output identity")
            unknown = set(text) - set(tokenizer.get_vocab())
            if unknown:
                raise ValueError("Unsupported tokenizer characters: " + repr(sorted(unknown)))
            tokens = tokenizer(text, return_tensors="pt")
            if tokens["input_ids"].numel() < 2:
                raise ValueError("Insufficient encoded input")
            set_seed(SEED)
            with torch.no_grad():
                waveform = model(**tokens).waveform[0].cpu().numpy()
            metrics = validate_waveform(waveform, rate)
            encoded = (waveform * 32767).clip(-32768, 32767).astype(np.int16)
            name = f'{row["id"]}--{row["text_sha256"][:12]}--{recipe_hash[:12]}.wav'
            out = out_root / row["kind"] / name
            out.parent.mkdir(parents=True, exist_ok=True)
            # Versioned, reproducible candidates; never overwrite a prior artifact.
            if not out.exists():
                scipy.io.wavfile.write(str(out), rate, encoded)
            else:
                existing_rate, existing = scipy.io.wavfile.read(str(out))
                if existing_rate != rate or not np.array_equal(existing, encoded):
                    raise ValueError("Existing immutable candidate differs; refuse overwrite")
            asset = {**row, **metrics, **recipe, "recipe_sha256": recipe_hash,
                     "synthesis_text": text, "synthesis_text_sha256": digest(text),
                     "source_synthesis_text": row["synthesis_text"],
                     "source_synthesis_text_sha256": row["synthesis_text_sha256"],
                     "audio_sha256": digest(out.read_bytes()), "sample_rate_hz": rate,
                     **diagnostic_location(out),
                     "model_license": LICENSE, "model_card": MODEL_CARD,
                     "review_status": "unreviewed", "limitations": limitations + [
                         "Synthetic EHN-model candidate; Chicontepec accent and phonemes unverified.",
                         "Technical waveform checks do not establish linguistic accuracy.",
                         "Candidate output never releases legacy audio holds."]}
            sidecar = out.with_suffix(".json")
            if not sidecar.exists():
                sidecar.write_text(json.dumps(asset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            # Retain prior files/sidecars, but surface only the latest recipe for
            # this exact identity/text. Different historical texts stay archived.
            index["candidates"] = [a for a in index["candidates"] if not (
                a["kind"] == asset["kind"] and str(a["id"]) == str(asset["id"])
                and a["runtime_text"] == asset["runtime_text"])] + [asset]
            generated.append(asset["private_audio_path"])
            print(f'Candidate {row["kind"]}:{row["id"]} ({metrics["duration_seconds"]}s)')
        except Exception as exc:
            failures.append({"kind": row["kind"], "id": row["id"], "reason": str(exc)})
    index["model"] = recipe
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {"schema_version": 1, "recipe": recipe, "selected": len(rows), "generated": generated,
              "unsupported_input": rejected, "technical_failures": failures, "release_status": "private diagnostic candidates; never learner release assets"}
    report_dir = ROOT / "data/audio-v3"
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / ("benchmark-generation.json" if args.benchmark else "candidate-generation.json")).write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"generated": len(generated), "unsupported": len(rejected), "failed": failures}, ensure_ascii=False))
    return 1 if failures else 0

if __name__ == "__main__":
    sys.exit(main())
