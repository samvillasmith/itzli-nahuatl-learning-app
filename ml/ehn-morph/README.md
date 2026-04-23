# ehn-morph

Morphological analyzer for **Eastern Huasteca Nahuatl** (EHN, ISO 639-3: `nhe`).

Given an EHN token, this tool attempts to parse it into morphemes (prefixes, stem, suffixes) and resolve the stem against the Itzli curriculum lexicon. It is a **first-pass, rule-based, greedy analyzer** — not a full finite-state morphology. It handles most common regular conjugations and noun forms; it will miss irregulars, compounds, and heavy derivation.

The goal is to provide grounded morphological context to the AI tutor so that instead of guessing at prefix grammar, the tutor can be told: *"the student wrote `nitequiti`, which parses as `ni-` (1sg) + `tequiti` (to work). Respond accordingly."*

## Install

```bash
cd ml/ehn-morph
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -e ".[dev]"
```

## Use

```bash
# Analyze one or more tokens
ehn-morph analyze nitequiti                 # human-readable
ehn-morph analyze nitequiti --json          # JSON output

# Multiple tokens at once
ehn-morph analyze nitequiti ticchihua nichan tlahcuiloa

# Batch-cache: parse every vocab headword and every dialogue utterance,
# write a JSON cache for downstream consumers (e.g., RAG indexing).
ehn-morph build-cache --out ../../data/morphology_cache.json
```

## What it parses

| Slot | Examples |
|---|---|
| Past prefix | o- |
| Subject | ni- (1s), ti- (2s/1pl), an- (2pl), ∅ (3s/3pl) |
| Directional | on- (thither), hual- (hither) |
| Object | nēch-, mitz-, c-/qui-, tēch-, amēch-, quin-, tē-, tla- |
| Possessive | no-, mo-, i-, to-, amo-, in- |
| Verb suffixes | -z, -quiz (FUT) · -ya (IMPF) · -c, -qui (PRET) · -toc (PROG) · -h/-j (PL) |
| Noun suffixes | -tl/-tli/-li/-in (ABS) · -meh/-tin (PL) · -tzin (REV/DIM) |

## What it doesn't handle yet

- Irregular stem-changing verbs (yahua/tiyauh, etc.)
- Compound words
- Derivational morphology (-tihquetl "doer", -yotl abstract, etc.)
- Reduplication
- Honorific / reverential morphology beyond the basic -tzin
- Reflexive prefix disambiguation from possessives on polyvalent stems

## Orthography normalization

Accepts common student spellings and normalizes to IDIEZ before analysis:

- `k` → `c` (or `qu` before i/e)
- `j` → `h`
- `w` → `hu`
- Plus explicit table for frequent forms (`kuali`→`cualli`, `nijchiua`→`nicchihua`, `tekiti`→`tequiti`, etc.)

## Output shape

```json
{
  "input": "nitequiti",
  "normalized": "nitequiti",
  "morphemes": [
    {"surface": "ni", "form": "ni-", "role": "subject", "gloss": "I"},
    {"surface": "tequiti", "form": "tequiti", "role": "stem", "gloss": "to work"}
  ],
  "stem": "tequiti",
  "stem_gloss": "to work",
  "part_of_speech": "verb",
  "confidence": 0.8,
  "analyzable": true
}
```
