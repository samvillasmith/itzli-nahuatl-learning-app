"""Typed data structures for analyses."""

from dataclasses import dataclass, field
from typing import Literal, Optional

MorphRole = Literal[
    "past",
    "subject",
    "directional",
    "object",
    "possessor",
    "stem",
    "absolutive",
    "plural",
    "tense",
    "aspect",
    "reverential",
    "unknown",
]


@dataclass(frozen=True)
class Morpheme:
    surface: str   # literal segment as it appeared (post-normalization)
    form: str      # canonical IDIEZ morpheme (e.g., "ni-", "-tl")
    role: MorphRole
    gloss: str     # short English label


@dataclass
class Analysis:
    input: str                                   # original (raw) input token
    normalized: str                              # IDIEZ-normalized token
    morphemes: list[Morpheme] = field(default_factory=list)
    stem: Optional[str] = None                   # canonical stem form
    stem_gloss: Optional[str] = None             # English gloss from lexicon
    part_of_speech: Optional[str] = None
    confidence: float = 0.0                      # 0.0 - 1.0, naive heuristic
    analyzable: bool = False                     # whether the stem was resolved

    def gloss_chain(self) -> str:
        """Return a human-readable gloss chain like 'I + to work'."""
        return " + ".join(m.gloss for m in self.morphemes)

    def morpheme_chain(self) -> str:
        """Return a segmented form like 'ni·tequiti'."""
        return "·".join(m.surface for m in self.morphemes)
