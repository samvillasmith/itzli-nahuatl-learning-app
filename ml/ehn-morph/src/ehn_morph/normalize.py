"""IDIEZ orthography normalization.

Students and field recordings use varied spellings. This module reduces
common-variant spellings to a single IDIEZ-like canonical form so downstream
lookup can match.
"""

from __future__ import annotations

import re
import unicodedata


# Explicit whole-word mappings — applied before letter-level rewrites so
# that idiosyncratic forms don't get mangled by the general rules.
FIXED_SUBS: dict[str, str] = {
    "tlajtoli": "tlahtolli",
    "tlajkuiloa": "tlahcuiloa",
    "tlajkuilojtok": "tlahcuilohtoc",
    "tlajkuilojketl": "tlahcuilohqueh",
    "tlachke": "tlen",
    "tlaque": "tlen",
    "san": "zan",
    "eua": "ehua",
    "kej": "quen",
    "kampa": "campa",
    "kanke": "campa",
    "mocha": "mochan",
    "nicha": "nichan",
    "kinekij": "quinequih",
    "maseualmej": "macehualmeh",
    "tiankistli": "tianquiztli",
    "tlanamakalistli": "tlanamacaliztli",
    "nijchiua": "nicchihua",
    "nijchihua": "nicchihua",
    "tekiti": "tequiti",
    "kuali": "cualli",
    "catli": "catli",  # not a variant of cualli — keep as-is
}


def strip_diacritics(s: str) -> str:
    """Drop macrons and other combining marks (ā → a, ē → e, ...)."""
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c)
    )


def _remap_k(s: str) -> str:
    """k → qu before i/e, k → c elsewhere."""
    out: list[str] = []
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        if ch == "k":
            nxt = s[i + 1] if i + 1 < n else ""
            out.append("qu" if nxt in ("i", "e") else "c")
        else:
            out.append(ch)
        i += 1
    return "".join(out)


def _remap_w(s: str) -> str:
    """w → hu before a vowel, w → uh after a vowel, else hu."""
    out: list[str] = []
    n = len(s)
    for i, ch in enumerate(s):
        if ch == "w":
            prev = s[i - 1] if i > 0 else ""
            nxt = s[i + 1] if i + 1 < n else ""
            if nxt in "aeiou":
                out.append("hu")
            elif prev in "aeiou":
                out.append("uh")
            else:
                out.append("hu")
        else:
            out.append(ch)
    return "".join(out)


_WORD_BOUNDARY = re.compile(r"\b")


def normalize(text: str) -> str:
    """Reduce a single token to IDIEZ-ish form.

    - lowercases and strips combining diacritics (macrons)
    - applies the explicit substitution table
    - applies k → c/qu, j → h, w → hu/uh
    """
    s = text.strip().lower()
    if not s:
        return s
    s = strip_diacritics(s)

    # Whole-word substitutions
    mapped = FIXED_SUBS.get(s)
    if mapped is not None:
        return mapped

    # Letter-level rewrites
    s = _remap_k(s)
    s = s.replace("j", "h")
    s = _remap_w(s)
    return s
