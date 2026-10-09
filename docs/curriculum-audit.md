# Curriculum Audit Notes

Last updated: 2026-10-04

## October Accuracy Review

GitHub `main` was pulled from `36b5006` to `37b5fce`. The deployed database was
downloaded afresh; the old April copy is preserved locally as `.sqlite.bak`.
The new database's SHA-256 is
`E924E3FA8AD4C9B2A304AE63AD95E80056AF8A3239EF973B88FEA7CCAC94E861`.
Corrections are local runtime overrides and source-file changes. The remote
database and deployed application were not changed.

### Evidence standard

**INALI governs teaching orthography.** Its
[published Nahuatl alphabet](https://site.inali.gob.mx/INALIDhuchlab/assets/files/cartel_alfabeto_Nawatlatolli-espanol.pdf)
is the writing reference. Primary teaching text uses the shared INALI display
converter, including conversations, personal sentence frames, review, listening,
and offline practice. Original source text remains explicitly labeled in
references; display changes do not rewrite progress IDs, notebook hashes,
source recordings, or source attribution.

The regional vocabulary and grammar baseline is
[COERLL's native-authored Chicontepec, Veracruz course](https://coerll.utexas.edu/coerll/oer/nahuatlahtolli/).
[The source course](https://tlahtolli.coerll.utexas.edu/) follows IDIEZ spelling
and grammatical analysis. [INALI distinguishes Huasteca varieties](https://www.inali.gob.mx/sitios/clin-inali/html/l_nahuatl.html);
Classical or other regional attestation does not automatically establish a
core Chicontepec form. Source matching is evidence, not universal consensus.
The source itself contains some typos and conflicting English glosses. Its
browser view preserves the original imported transcription.

### Applied corrections

| Area | Corrections | Evidence |
| --- | --- | --- |
| Persons and family | `in-` second-person plural, `inin-` possessive, complete pronouns/kinship forms, sibling versus brother, and possessive `motokah`. Source replacements use matching native recordings. | Source lessons 3, 6, 8, 9 |
| Affection | `pil-` is a prefix. Removed invented `calpil`/`tlahtolpil` practice and blanket verb `-tzin` advice. | [Lesson 20](https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-19-lesson-19-topilcinhuan-tlahuel-cualtzin-our-little-corn-is-very-beautiful/) |
| Past and direction | Removed Classical past augments; source-backed directional forms and ongoing-past `-yaya`; learned state forms treated separately. | Source lessons 14–16, 26, 28 |
| Conditionals | Unit 30 practices `-zquia`; Unit 31 practices `-tozquia`. Replaced the `intla` card with source `tlan` and removed invented religious dialogue. | [Lesson 30](https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-30-lesson-30-zquia-tozquia-the-condicional-part-1/) |
| Words and dialogues | Corrected carry/sing confusion, song `cuīcatl`, greeting tense, sitting/entering, like/want, take/buy, object/subject markers, and inanimate `eltoc`. | Source lesson URLs and IDIEZ dictionary references in correction metadata |
| Exercises | Removed English instructions, captions, headings, blanks, corrupted OCR, and incomplete translations. Corrected eggs/seashells, blue, guavas, older brothers/sisters, and possessor/plural meanings. | Source lessons 3–9, recorded per construction |
| Culture | Distinguished historical Mexica from living Nahua communities; narrowed population/spelling claims, corrected cleansing context, qualified the Met altar origin, and repaired UNAM citations. | COERLL, INALI, INAH, UNAM, Met references in culture data |

Three unsupported grammar drafts—applicatives/causatives, compounds, and
locatives—are held outside the 22 active lesson exports. The grammar engine
requires learned noun plural/possessed stems rather than inventing them.
Disputed authored plural-future production was replaced with source-backed
singular practice; review notes retain the unresolved spelling question.
Construction review checks stable ID, lesson, original Nahuatl, and original
English; unknown or changed imports fail closed. Of 168 nonblank translated
imports, 79 fail that review gate, 89 have reviewed pairs, and 88 survive the
existing app exclusions. Unit metadata uses the filtered count.

### Audio, tutor, and localization

The inventory contains 43 units, 473 vocabulary placements after variant
collapse, 460 distinct vocabulary cards, 63 focus forms, and 176 dialogue
lines. Coverage counts do not certify accuracy. Corrected or missing
recordings are withheld: 6 vocabulary cards and 48 dialogue lines. Explicit
null audio cannot fall back to an old
clip. No replacement audio was generated or published. Media checks inspect
local presence or URL structure; they do not verify remote availability or
pronunciation by listening.

The tutor remains disabled. Local prompts and retrieval population inputs now
use bounded source evidence and calibrated uncertainty. The remote retrieval
index was not repopulated. Thirty-eight synthetic dialogue rows have source
corrections; remaining synthetic rows still need speaker review. Historical
one-off database scripts still contain
some superseded suggestions; broad audio generators read raw database text
and must respect runtime corrections before future regeneration.

New learner prose and corrected meanings have Mexican Spanish translations.
Regression tests cover source forms, audio holds, upstream changes, and a
macron-related filter bug that incorrectly split a Nahuatl word into an English
substring.

### Reuse

[COERLL identifies the course as CC BY-SA](https://coerll.utexas.edu/coerll/oer/nahuatlahtolli/).
Attribution, source links, changes, and ShareAlike terms are retained in
`LICENSE`, `NOTICE.md`, and the app's Terms/EULA. The project's default
NonCommercial condition does not apply to source-derived adaptations.
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) requires
attribution, ShareAlike, and no additional restrictions on that material.

Yan García's books and Tlahtoltapazolli collections are external references.
No book text, compiled vocabulary collection, flashcards, exercises,
illustrations, or recordings were imported. [Brainscape's terms](https://www.brainscape.com/terms)
do not grant a general right to republish another creator's public decks.
Importing these collections requires permission or an applicable reuse
license. Checking individual facts does not authorize copying a collection.
References do not imply endorsement. Complete rights clearance for existing
third-party photographs, dictionary imports, and synthesized media remains
outside this audit's verified scope.

### Remaining review

- Resolve source `-zceh` versus authored `-zqueh` through recordings and a
  Chicontepec speaker. Do not assume either is universally correct.
- Obtain speaker review of honorific commands, optative generalizations,
  authored Nahuatl headings, and remaining synthetic/adapted utterances.
- Review simplified spelling's pronunciation effects, especially `kenihki`,
  `hu/uh` conversions, consonant retention, and omitted vowel length.
- Listen to retained synthetic clips and obtain matching recordings for held
  cards/lines. A known-error filter passing is not speaker review.
- Treat A1/A2/B1 labels as curriculum organization, not assessed CEFR exit
  certification. Review third-party asset rights individually before making a
  blanket legal claim.

### Validation

Final checks passed:

- `npm run verify`: type checking, lint, 100 tests across 16 files, Spanish
  localization, app-content exclusions, course-content checks, and image
  manifest checks.
- `npm run build`: successful production compilation and 169 generated pages.
- `node scripts/rag-populate.js --dry-run`: local-only preparation succeeded;
  no service calls, embeddings, or remote writes.
- `git diff --check`: no whitespace errors.

The course audit reports the intentional 6 vocabulary/48 dialogue audio holds
as warnings. Remote media availability, pronunciation, and full linguistic or
legal clearance are not established by these automated checks.

## Earlier Curation Notes

## Goal

Keep the learner-facing path CEFR-style and progressive: A1 survival language,
A2 daily interaction, and B1 narrative/control. The full lexicon can stay broad,
but lesson cards should teach a coherent core rather than every mined entry.

## Findings

- Unit 11 included off-theme words such as `achtontli` ("great-grandfather") in a greetings lesson.
- Several early units had individual off-topic or corrected entries still available to lesson cards.
- Expansion units 33-43 had too many fallback lexicon rows. Some rows matched only by part of speech, not by lesson theme, so the learner path became noisy.
- Some units exceeded a practical CEFR-style load. A lesson with 100+ new cards is useful as a reference list, but not as a core learning step.

## Curation Policy

- Core lessons keep high-signal vocabulary for the communicative task.
- Off-theme, unsuitable, or corrected-as-unattested rows are suppressed from lesson cards and flashcards.
- Large expansion units are capped for the core path and filtered by focused lesson themes.
- Reference data preserves the broader lexicon; learner search uses the curated course inventory. Suppressed items are not deleted from the underlying data.

## Current Core Path

- A1: sound, greetings, identity, questions, numbers, descriptions, present/future actions, possession, family, food, field, and house.
- A2: work, routines, descriptions, past narration, town travel, market exchange, preferences, nature, tools, and community.
- B1: longer narration, commands, imperfect/habitual past, health, conditionals, culturally situated reading, object-marker control, precise verbs, and modifiers.

## Remaining Work

- Add B2/C1 modules before claiming full independent fluency: extended conversation, narrative repair, argumentation, oral history, domain reading, and dialect comparison.
- Add teacher-reviewed minimum vocabulary lists per unit once a human Nahuatl instructor is available.
- Keep expansion scripts conservative: no fallback assignment without a theme match.
