@AGENTS.md

# Itzli — Project Context for Claude

## What This Is

**Itzli** is a structured Eastern Huasteca Nahuatl (EHN) language learning app. EHN is ISO 639-3 `nhe`, spoken in the Huasteca region of Mexico. The curriculum covers A1–B1 (43 units, ~101 sub-lessons, ~703 vocabulary words). The app is built with Next.js App Router, TypeScript, Tailwind CSS v4, and a SQLite database.

The user (Sam) is building this as a serious language education tool. He cares deeply about linguistic accuracy (EHN, not Classical Nahuatl — these differ). The standard reference is IDIEZ (Instituto de Docencia e Investigación Etnológica de Zacatecas).

---

## Tech Stack

- **Next.js 16.2.1** with App Router, static generation (`generateStaticParams`)
- **React 19** — server components by default; client components need `"use client"`
- **Tailwind CSS v4** — no `tailwind.config.js`; uses CSS variables in `globals.css`
- **better-sqlite3** — synchronous SQLite driver; DB is read-only in the app
- **TypeScript 5** — strict types throughout
- **No external state management** — `useState`/`useEffect` only; progress in `localStorage`

---

## Database

### Locations
- **Original (authoritative)**: `../molina/curriculum/fcn_master_lexicon_phase8_6_primer.sqlite` (relative to project root — i.e., one directory up)
- **Project copy**: `./fcn_master_lexicon_phase8_6_primer.sqlite` (in project root — excluded from git via `.gitignore`)
- **App reads from**: the original path by default (`src/lib/db.ts` uses `DATABASE_PATH` env var with fallback to `../molina/curriculum/...`)

Both copies are in sync as of the last session. If you need to run DB fix scripts, use the original path (the scripts hardcode `../../molina/curriculum/...`).

### Key Tables

| Table | Purpose |
|---|---|
| `phase82_unit_plan` | 43 unit metadata rows: `lesson_number`, `unit_code`, `target_band` (A1/A2/B1), `theme_en`, `communicative_goal`, `english_lesson_unit_id` |
| `lesson_vocab` | ~703 vocab entries: `id`, `display_form` (headword), `gloss_en`, `part_of_speech`, `lesson_number`, `rank` |
| `lesson_dialogues` | AI-generated + real dialogue lines: `lesson_dialogue_id`, `lesson_unit_id` (FK to `phase82_unit_plan.english_lesson_unit_id`), `speaker_label`, `utterance_normalized`, `translation_en`, `attestation_tier` |
| `primer_dialogues` | Different table from `lesson_dialogues` — not currently used in the main lesson flow |
| `primer_constructions` | Grammar pattern examples used for fill-in-the-blank exercises |
| `lexicon_entries` | ~37,000 entry full lexicon (for the `/vocabulary` search page) |

### DB Modifications Applied (all permanent, already committed)

All scripts in `scripts/` have already been run against the DB. **Do not run them again.**

1. **`scripts/generate-dialogues.js`** — Generated 113 AI dialogue rows (FCN-LDG-000216 → FCN-LDG-000328) for 28 units that had no real dialogue data. These are marked `attestation_tier = 'AI_generated'`. Units 33–43 were skipped (null `english_lesson_unit_id`).

2. **`scripts/fix-vocab-errors.js`** — Fixed 28 vocab entries: wrong definitions (❌), misplaced country names, and significant gloss errors. Key fixes include: `quema` ("yes" not "when?"), `yankuik` ("new" not "bad"), `huehue` ("old man" not "husband"), `acalli` ("canoe" not "stilt house"), `huica` ("to carry" not "to sing").

3. **`scripts/audit-fix-all.js`** — Fixed 22 more vocab entries (significant ⚠️ items) and 7 dialogue lines. Key fixes: `chicahua` ("strong" not "grow old"), `koto` ("shirt" not "blanket"), `petlani` ("lightning flash" not "to spill").

4. **Direct DB updates (applied in-session, not in scripts)**:
   - `cui` (id=296): was "To have sex with" → now "to take; to receive; to get"
   - `teca` (id=297): was "To have sex with" → now "to lay; to set down; to pour; to place"
   - `firmaroa` (id=310): flagged as heavily Hispanicized
   - `camati` (id=280): "to open the mouth; to speak" (not just "to speak")
   - `tlakahtli` (id=575): annotated as non-standard for "afternoon"
   - `achiyok` (id=6157): "a little more" (not "I want anymore")
   - `maua` (id=6149): "to frighten; to cause fear" (not "to infect")
   - `imin` (id=190): annotated as non-standard (use `inin`)

### IDIEZ-orthography cleanup pass (NEW — run in order once, against a fresh DB)

These scripts use `scripts/_db-path.js` to auto-locate the DB (checks `DATABASE_PATH` env var → project-local SQLite → legacy `../molina/curriculum/` path). Unless otherwise noted they are **idempotent** and support `--apply` (omit the flag for a dry run).

1. **`scripts/delete-misplaced-country-names.js`** — Deletes 8 rows (Roma, Malta, Rusia, Japon, Suiza, Oman, Chile, Palestina) that were mis-slotted into household/food units. No `--apply` flag; deletion is the only mode. Skips already-absent IDs.
2. **`scripts/delete-variant-duplicates.js [--apply]`** — Deletes `lesson_vocab` rows whose IDs appear in `variantIds` of any group in `src/data/variant-groups.ts`. The canonical row is kept; the "Also written: …" hint on learn cards comes from the static metadata, so no spelling information is lost. Re-read `variant-groups.ts` if you add new groups.
3. **`scripts/apply-remaining-gloss-fixes.js [--apply]`** — Matches by `(lesson_number, display_form)` and applies the ~25 remaining ⚠️ gloss corrections from `EHN_Vocabulary_Exhaustive_Revisions.md`. Skips rows whose gloss already contains `[⚠️` or `[❌` (i.e. a prior fix script handled them).
4. **`scripts/regenerate-dialogues-33-43.js [--apply]`** — Replacement for `generate-dialogues-33-43.js`. Deletes the old AI-generated rows for lesson_units 33–43 and inserts IDIEZ-consistent dialogues. Keep `generate-dialogues-33-43.js` for history; do not run both.

After running the four scripts, commit the DB if you ship the `.sqlite` file; otherwise trust `scripts/fetch-db.js` + S3 upload.

### Gloss Annotation Format

Many `gloss_en` values have audit notes appended:
```
"to carry, to bring along [⚠️ CORRECTED: was 'to sing'; 'to sing' = cuica]"
"yes [❌ CORRECTED: was 'when?'; 'when' = queman]"
"[❌ CORRECTED: was 'butter' — not attested]"
```

**Never display raw `gloss_en` in the UI.** Always run it through `displayGloss()` from `src/lib/gloss.ts`, which strips the annotation suffix. Entries whose entire gloss is an annotation will display as "—".

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              Nav: Itzli | Units | Vocabulary | Progress
│   ├── page.tsx                Home: hero + unit cards grouped by band
│   ├── units/
│   │   ├── page.tsx            All-units list (server) → UnitsListWithProgress (client)
│   │   ├── UnitsListWithProgress.tsx  Client component; shows ✓/◑ badges from localStorage
│   │   └── [unitId]/
│   │       ├── page.tsx        Server: fetches data, passes to LessonFlow
│   │       └── LessonFlow.tsx  Client: the entire lesson state machine
│   ├── practice/[unitId]/
│   │   ├── page.tsx            Server: fetches vocab, passes to FlashcardDeck
│   │   └── FlashcardDeck.tsx   Client: flip-card vocab review
│   ├── progress/
│   │   ├── page.tsx            Server: fetches units, passes to ProgressDashboard
│   │   └── ProgressDashboard.tsx  Client: full progress UI with reset
│   └── vocabulary/
│       └── page.tsx            Vocabulary search (uses lexicon_entries table)
├── lib/
│   ├── db.ts                   All SQLite queries + exported types
│   ├── gloss.ts                displayGloss() — strips [❌...]/[⚠️...] annotations
│   └── progress.ts             localStorage progress: markChunkDone(), resetProgress()
scripts/
├── _db-path.js                        Shared DB path resolver
├── fetch-db.js                        Pulls .sqlite from S3 on dev/build
├── generate-dialogues.js              (already run — do not re-run)
├── generate-dialogues-33-43.js        (superseded — use regenerate-*)
├── fix-vocab-errors.js                (already run — do not re-run)
├── audit-fix-all.js                   (already run — do not re-run)
├── delete-misplaced-country-names.js  IDIEZ cleanup (new)
├── delete-variant-duplicates.js       IDIEZ cleanup (new)
├── apply-remaining-gloss-fixes.js     IDIEZ cleanup (new)
└── regenerate-dialogues-33-43.js      IDIEZ cleanup (new)
```

---

## Lesson Flow (LessonFlow.tsx)

The lesson is a state machine. For a unit with N vocab words (split into chunks of 10):

```
[intro] → [learn word 1..10] → [quizFwd 1..10] → [quizRev 1..10]
        → [fillBlank 0..3] → [dialogue 0..N] → [chunkDone | done]
        → (repeat for next chunk)
```

### Key design decisions
- **CHUNK_SIZE = 10** words per sub-lesson
- **Dialogue runs after every chunk** (not just the last). All dialogue lines from the unit are shown after each chunk — repetition is intentional for language learning.
- **Dialogue distribution**: If `Math.floor(dialogues.length / chunks.length) >= 2`, lines are distributed evenly; otherwise all lines show after the last chunk.
- **`displayGloss()`** is applied everywhere `gloss_en` is rendered — in learn cards, quiz options, hints, and feedback banners.
- **`markChunkDone()`** is called inside `finishChunk()` to save progress to localStorage before the dialogue phase.
- **Morphological matching** (`buildMatch`): strips diacritics, checks if a dialogue token contains a vocab stem (≥3 chars). Fails for irregular verbs (e.g., `yahua`/`tiyāuh`) — this is a known limitation.
- **Passive lines**: dialogue lines where `buildMatch` returns null are shown with a "Continue →" button only (no tiles). Translation is always visible (not gated on `checked`).

### Known limitations
- Morphological matching fails for highly irregular EHN verbs where the conjugated form doesn't contain the citation-form stem.
- Units 33–43 have no dialogue (their `english_lesson_unit_id` is null so AI dialogue couldn't be inserted).
- The `fillBlank` phase often produces 0 exercises for units where vocab headwords don't appear in `primer_constructions` examples.

---

## Progress Tracking

- **Storage**: `localStorage` key `itzli_progress_v1`
- **Shape**: `{ version: 1, units: { "1": { status, completedChunks, totalChunks, lastCorrect, lastTotal, completedAt } } }`
- **Written**: in `LessonFlow.tsx` → `finishChunk()` → `markChunkDone()`
- **Read**: `ProgressDashboard.tsx`, `UnitsListWithProgress.tsx` (both hydrate on mount via `useEffect`)
- **Reset**: two-step confirm on `/progress` page

---

## `src/lib/db.ts` — Important Queries

- `getAllUnits()` — 43 units ordered by `lesson_number`
- `getUnitVocab(n)` — vocab for unit n, ordered by `rank`
- `getAllPrimerVocab()` — full vocab pool for distractor generation; **filters out `MISPLACED` entries** (`WHERE gloss_en NOT LIKE '%MISPLACED%'`)
- `getUnitDialogueContent(n)` — joins `lesson_dialogues` → `phase82_unit_plan` via `english_lesson_unit_id`; filters to lines with macron vowels or `¿` (excludes English translation rows); includes Rufina/Martha/Angela (unit 19 three-way conversation)
- `getUnitConstructions(n)` — uses `first_lesson_number <= ?` (not `=`) to pull in cumulative grammar patterns

---

## Vocabulary Source Document

`EHN_Vocabulary_Exhaustive_Revisions.md` (in project root) is a full audit of all 837 vocab entries against IDIEZ, Karttunen, and attested EHN texts. Codes: ✅ correct · ⚠️ minor issue · ❌ wrong · 🔄 duplicate · 📝 orthographic variant.

**The ❌ and significant ⚠️ items have already been applied to the DB.** Minor ⚠️ items (loanword notes, dialectal variants, obscure compounds) were intentionally left as-is since they're linguistically informative.

---

## What Still Needs Work (known issues)

1. **Units 33–43 have no dialogue** — `english_lesson_unit_id` is null for these units. A different join strategy or a manual mapping table would be needed to add dialogue for them.
2. **fillBlank exercises are sparse** — `primer_constructions` examples don't overlap well with unit vocab headwords. Could improve by writing custom example sentences per unit.
3. **Morphological matching** — `buildMatch()` does simple substring matching after stripping diacritics. Fails for verbs with stem-changing conjugations. A proper morphological analyzer would fix this but is complex.
4. **Home page has no progress indicators** — `/units` has progress badges, `/progress` has full details, but the home page unit cards show no progress state.
5. **No spaced repetition** — quiz order is always the same. A proper SRS (Leitner-style) would improve retention.

---

## Running the App

```bash
npm run dev      # development server at localhost:3000
npm run build    # static build (runs all generateStaticParams at build time)
npm start        # serve the built output
```

The DB must be accessible at build time (`npm run build`) since all data fetching happens server-side at build time (SSG). If the DB path is wrong, the build fails.

---

## Git / GitHub Notes

- Repo: `https://github.com/samvillasmith/itzli-nahuatl-learning-app`
- The SQLite DB (`*.sqlite`, `*.db`) is in `.gitignore` — it exceeds GitHub's 100MB limit.
- The DB lives at `../molina/curriculum/fcn_master_lexicon_phase8_6_primer.sqlite` (original) and `./fcn_master_lexicon_phase8_6_primer.sqlite` (project root copy). Neither is committed to git.
