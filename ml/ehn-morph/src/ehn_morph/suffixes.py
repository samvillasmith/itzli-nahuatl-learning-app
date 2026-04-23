"""EHN suffix inventories.

Each entry: (surface, canonical-form, gloss).
Order longest-first so greedy matching doesn't strip the wrong suffix.
"""

from __future__ import annotations


# Verb suffixes (TAM + plural). Stripped from the right, longest first.
# Multiple may stack (e.g., -ya-h "were doing", -z-queh "they will").
VERB_SUFFIXES: list[tuple[str, str, str]] = [
    ("queh", "-queh", "3PL.PRET"),
    ("quiz", "-quiz", "FUT"),
    ("toc", "-toc", "PROG"),
    ("tok", "-toc", "PROG"),
    ("qui", "-qui", "PRET"),
    ("ya", "-ya", "IMPF"),
    ("z", "-z", "FUT"),
    ("c", "-c", "PRET"),
    ("h", "-h", "PL"),
    ("j", "-j", "PL"),
]

# Noun suffixes. Absolutive and plural markers.
NOUN_SUFFIXES: list[tuple[str, str, str]] = [
    ("tzintli", "-tzintli", "REV"),
    ("tzin", "-tzin", "DIM/REV"),
    ("meh", "-meh", "PL"),
    ("tin", "-tin", "PL"),
    ("tli", "-tli", "ABS"),
    ("tl", "-tl", "ABS"),
    ("li", "-li", "ABS"),
    ("in", "-in", "ABS"),
]
