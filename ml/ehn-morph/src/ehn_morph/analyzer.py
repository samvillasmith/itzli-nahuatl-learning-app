"""Greedy rule-based morphological analyzer.

Parses a single EHN token by:
1. Normalizing to IDIEZ orthography.
2. Greedily stripping a verb prefix chain (past · subject · directional · object).
3. Greedily stripping verb TAM/plural suffixes.
4. Looking up the residue in the lexicon.
5. If that fails, repeating with the noun prefix (possessive) and noun suffix
   (absolutive · plural · reverential) pipeline.
6. If neither works, trying the bare normalized token as a lookup.

This is deliberately simple — it does not handle stem-changing verbs,
derivation, reduplication, or ambiguity resolution beyond try-in-order.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from .lexicon import Lexicon
from .normalize import normalize
from .prefixes import (
    DIRECTIONAL_PREFIXES,
    OBJECT_PREFIXES,
    PAST_PREFIXES,
    POSSESSIVE_PREFIXES,
    SUBJECT_PREFIXES,
)
from .suffixes import NOUN_SUFFIXES, VERB_SUFFIXES
from .types import Analysis, Morpheme

MIN_STEM_LEN = 2
ROLE_TENSE = "tense"
ROLE_ABS = "absolutive"


def _try_strip_prefix(
    remaining: str,
    table: list[tuple[str, str, str]],
    role: str,
) -> tuple[Optional[Morpheme], str]:
    """Try to match ANY entry in `table` at the start of `remaining`.

    Returns (morpheme, new_remaining) on success, (None, remaining) on miss.
    Requires the residue to be at least MIN_STEM_LEN characters.
    """
    for surface, form, gloss in table:
        if remaining.startswith(surface):
            rest = remaining[len(surface):]
            if len(rest) >= MIN_STEM_LEN:
                return (Morpheme(surface, form, role, gloss), rest)  # type: ignore[arg-type]
    return (None, remaining)


def _verb_suffix_candidates(remaining: str) -> list[tuple[list[Morpheme], str]]:
    """All suffix-strip depths from 0 up, each as (suffixes, residue).

    Returns candidates in shallow-to-deep order. Callers typically iterate
    deepest-first (reversed) and pick the first whose residue resolves.
    """
    candidates: list[tuple[list[Morpheme], str]] = [([], remaining)]
    picked: list[Morpheme] = []
    current = remaining
    while len(current) > MIN_STEM_LEN:
        matched = False
        for surface, form, gloss in VERB_SUFFIXES:
            if current.endswith(surface):
                core = current[: -len(surface)]
                if len(core) >= MIN_STEM_LEN:
                    picked = [Morpheme(surface, form, ROLE_TENSE, gloss)] + picked  # type: ignore[arg-type]
                    current = core
                    candidates.append((list(picked), current))
                    matched = True
                    break
        if not matched:
            break
    return candidates


def _noun_suffix_candidates(remaining: str) -> list[tuple[list[Morpheme], str]]:
    """All single-suffix-strip options for a noun (0 or 1 suffix)."""
    candidates: list[tuple[list[Morpheme], str]] = [([], remaining)]
    for surface, form, gloss in NOUN_SUFFIXES:
        if remaining.endswith(surface):
            core = remaining[: -len(surface)]
            if len(core) >= MIN_STEM_LEN:
                candidates.append(
                    ([Morpheme(surface, form, ROLE_ABS, gloss)], core)  # type: ignore[arg-type]
                )
    return candidates


def _prefix_chain_candidates(
    token: str,
    layers: list[tuple[list[tuple[str, str, str]], str]],
) -> list[tuple[list[Morpheme], str]]:
    """Greedy prefix-strip, capturing every intermediate state.

    Each layer is ONE optional slot (past, subject, etc.); within a slot we
    take the first table entry that matches. The returned list begins with
    the no-strip state and grows as each layer consumes something.
    """
    candidates: list[tuple[list[Morpheme], str]] = [([], token)]
    prefixes: list[Morpheme] = []
    remaining = token
    for table, role in layers:
        morph, rest = _try_strip_prefix(remaining, table, role)
        if morph is not None:
            prefixes = prefixes + [morph]
            remaining = rest
            candidates.append((list(prefixes), remaining))
    return candidates


class Analyzer:
    """Rule-based EHN morphological analyzer.

    Instances hold an open SQLite connection to the lexicon; use as a context
    manager or remember to close().
    """

    def __init__(self, db_path: Path):
        self.lex = Lexicon(db_path)

    def close(self) -> None:
        self.lex.close()

    def __enter__(self) -> "Analyzer":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def analyze(self, token: str) -> Analysis:
        original = token
        normalized = normalize(token)

        for attempt in (self._try_verb, self._try_noun, self._try_bare):
            result = attempt(normalized)
            if result is not None:
                return Analysis(
                    input=original,
                    normalized=normalized,
                    analyzable=True,
                    **result,
                )

        return Analysis(
            input=original,
            normalized=normalized,
            morphemes=[],
            stem=None,
            stem_gloss=None,
            part_of_speech=None,
            confidence=0.0,
            analyzable=False,
        )

    # --- pipelines ------------------------------------------------------

    def _search(
        self,
        s: str,
        prefix_layers: list[tuple[list[tuple[str, str, str]], str]],
        suffix_fn,
        confidence_base: float,
        confidence_step: float,
    ) -> Optional[dict]:
        """Common logic for verb and noun pipelines.

        Builds prefix-strip candidates (most aggressive at the tail), then
        for each tries suffix-strip candidates (most aggressive at the tail).
        Iterates most-stripped first; the first candidate whose stem resolves
        in the lexicon wins.
        """
        prefix_cands = _prefix_chain_candidates(s, prefix_layers)

        for prefix_state, rem in reversed(prefix_cands):
            for suffix_state, core in reversed(suffix_fn(rem)):
                entry = self.lex.lookup(core)
                if entry is None:
                    continue
                stem_morph = Morpheme(
                    core, core, "stem", entry.get("gloss_en") or ""  # type: ignore[arg-type]
                )
                morphemes = prefix_state + [stem_morph] + suffix_state
                extra = len(prefix_state) + len(suffix_state)
                confidence = confidence_base + min(extra, 3) * confidence_step
                return {
                    "morphemes": morphemes,
                    "stem": core,
                    "stem_gloss": entry.get("gloss_en"),
                    "part_of_speech": entry.get("part_of_speech"),
                    "confidence": round(confidence, 2),
                }
        return None

    def _try_verb(self, s: str) -> Optional[dict]:
        return self._search(
            s,
            prefix_layers=[
                (PAST_PREFIXES, "past"),
                (SUBJECT_PREFIXES, "subject"),
                (DIRECTIONAL_PREFIXES, "directional"),
                (OBJECT_PREFIXES, "object"),
            ],
            suffix_fn=_verb_suffix_candidates,
            confidence_base=0.55,
            confidence_step=0.15,
        )

    def _try_noun(self, s: str) -> Optional[dict]:
        return self._search(
            s,
            prefix_layers=[(POSSESSIVE_PREFIXES, "possessor")],
            suffix_fn=_noun_suffix_candidates,
            confidence_base=0.55,
            confidence_step=0.2,
        )

    def _try_bare(self, s: str) -> Optional[dict]:
        entry = self.lex.lookup(s)
        if entry is None:
            return None
        morph = Morpheme(s, s, "stem", entry.get("gloss_en") or "")  # type: ignore[arg-type]
        return {
            "morphemes": [morph],
            "stem": s,
            "stem_gloss": entry.get("gloss_en"),
            "part_of_speech": entry.get("part_of_speech"),
            "confidence": 0.9,
        }
