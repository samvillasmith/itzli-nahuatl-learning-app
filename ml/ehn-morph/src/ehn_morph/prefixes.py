"""EHN prefix inventories.

Each entry: (surface, canonical-form, gloss).
Order matters within a group — the analyzer tries entries top-to-bottom and
breaks on the first match, so place longer / less-ambiguous forms first.
"""

from __future__ import annotations


# Preterit past marker (slot before subject prefix).
PAST_PREFIXES: list[tuple[str, str, str]] = [
    ("o", "o-", "PAST"),
]

# Subject prefixes. ti- is ambiguous (2sg or 1pl); disambiguation requires
# checking whether a plural -h/-j is present on the suffix side.
SUBJECT_PREFIXES: list[tuple[str, str, str]] = [
    ("ni", "ni-", "I"),
    ("ti", "ti-", "you/we"),
    ("an", "an-", "you-all"),
]

# Directional (optional, between subject and object).
DIRECTIONAL_PREFIXES: list[tuple[str, str, str]] = [
    ("hual", "hual-", "hither"),
    ("on", "on-", "thither"),
]

# Object prefixes — longest forms first so we don't short-circuit on prefixes
# of prefixes (e.g., "qui" before "c").
OBJECT_PREFIXES: list[tuple[str, str, str]] = [
    ("amech", "amēch-", "you-all (obj)"),
    ("nech", "nēch-", "me"),
    ("mitz", "mitz-", "you (sg obj)"),
    ("tech", "tēch-", "us"),
    ("quin", "quin-", "them"),
    ("qui", "qui-", "him/her/it"),
    ("tla", "tla-", "something"),
    ("te", "tē-", "someone"),
    ("c", "c-", "him/her/it"),
]

# Possessive prefixes (on nouns). 'i-' is a single letter and high-false-positive;
# keep it last.
POSSESSIVE_PREFIXES: list[tuple[str, str, str]] = [
    ("amo", "amo-", "your (pl)"),
    ("no", "no-", "my"),
    ("mo", "mo-", "your (sg)"),
    ("to", "to-", "our"),
    ("in", "in-", "their"),
    ("i", "i-", "his/her"),
]
