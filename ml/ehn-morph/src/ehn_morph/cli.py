"""Command-line interface for ehn-morph."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Iterable

from .analyzer import Analyzer
from .db_path import resolve_db_path
from .types import Analysis


def _print_human(a: Analysis) -> None:
    print(f"\n{a.input}")
    print(f"  normalized: {a.normalized}")
    if not a.analyzable:
        print("  (not analyzable — stem not found in lexicon)")
        return
    print(f"  segmented:  {a.morpheme_chain()}")
    print(f"  gloss:      {a.gloss_chain()}")
    if a.part_of_speech:
        print(f"  POS:        {a.part_of_speech}")
    print(f"  confidence: {a.confidence:.2f}")


def _analysis_dict(a: Analysis) -> dict:
    """Dataclass → plain dict (for JSON serialization)."""
    return asdict(a)


def _cmd_analyze(args: argparse.Namespace, az: Analyzer) -> int:
    results: list[Analysis] = [az.analyze(tok) for tok in args.tokens]
    if args.json:
        print(json.dumps([_analysis_dict(a) for a in results], ensure_ascii=False, indent=2))
    else:
        for a in results:
            _print_human(a)
    return 0


_WORD_RE = re.compile(r"[A-Za-zĀāĒēĪīŌōŪū¿?]+", re.UNICODE)


def _tokenize(text: str) -> list[str]:
    """Split a line of EHN into word tokens (punctuation stripped)."""
    return [t for t in _WORD_RE.findall(text) if t]


def _cmd_build_cache(args: argparse.Namespace, az: Analyzer) -> int:
    """Parse every vocab headword + every dialogue utterance, write JSON cache."""
    out_path: Path = args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)

    entries: list[dict] = []
    seen: set[str] = set()

    def _add(token: str, source: str, meta: dict) -> None:
        key = token.strip().lower()
        if not key or key in seen:
            return
        seen.add(key)
        a = az.analyze(token)
        entries.append(
            {
                "source": source,
                "meta": meta,
                "analysis": _analysis_dict(a),
            }
        )

    for row in az.lex.iter_lesson_vocab():
        _add(
            row["headword"],
            "lesson_vocab",
            {"lesson_number": row.get("lesson_number"), "pos": row.get("part_of_speech")},
        )

    for row in az.lex.iter_dialogue_utterances():
        for tok in _tokenize(row["utterance"]):
            _add(tok, "lesson_dialogues", {"speaker": row.get("speaker_label")})

    payload = {
        "version": 1,
        "count": len(entries),
        "analyzable": sum(1 for e in entries if e["analysis"]["analyzable"]),
        "entries": entries,
    }

    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"wrote {len(entries)} entries "
        f"({payload['analyzable']} analyzable) → {out_path}",
        file=sys.stderr,
    )
    return 0


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="ehn-morph",
        description="Morphological analyzer for Eastern Huasteca Nahuatl.",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=None,
        help="Path to SQLite DB. Defaults to DATABASE_PATH env var or project root.",
    )

    sub = parser.add_subparsers(dest="cmd", required=True)

    p_analyze = sub.add_parser("analyze", help="Analyze one or more tokens.")
    p_analyze.add_argument("tokens", nargs="+")
    p_analyze.add_argument("--json", action="store_true", help="Emit JSON to stdout.")
    p_analyze.set_defaults(func=_cmd_analyze)

    p_cache = sub.add_parser(
        "build-cache",
        help="Batch-parse all vocab + dialogue utterances; write a JSON cache.",
    )
    p_cache.add_argument("--out", type=Path, required=True, help="Output JSON path.")
    p_cache.set_defaults(func=_cmd_build_cache)

    args = parser.parse_args(list(argv) if argv is not None else None)

    db_path = args.db or resolve_db_path()
    with Analyzer(db_path) as az:
        return int(args.func(args, az) or 0)


if __name__ == "__main__":
    sys.exit(main())
