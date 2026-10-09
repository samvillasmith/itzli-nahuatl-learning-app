# Course-only release database

Prepared October 7, 2026, entirely offline. No production, account, Drive,
remote database or learner-progress data was accessed.

The release uses `fcn_course_release.sqlite` and
`course-release-manifest.json`. The original
`fcn_master_lexicon_phase8_6_primer.sqlite` stays private and unchanged
(SHA-256 `e924e3fa8ad4c9b2a304ae63ad95e80056af8a3239ef973b88fea7ccac94e861`).
The smaller file is a course subset, not a license-cleared full dictionary export.

## Included and excluded

Only seven runtime course tables are retained, with queried columns and
selected records. The release contains 381 eligible raw core cards; licensed
source promotions and original curated cards in the application bring the
displayed deduplicated core vocabulary to 460. These numbers are the legacy
SQLite layer, not the entire V3 written inventory.

| Table | Records | Scope |
| --- | ---: | --- |
| `phase82_unit_plan` | 43 | Stable legacy unit identities and queried teaching metadata |
| `lesson_vocab` | 381 | Core facts accepted by the current course filters; original ID/unit/rank |
| `lesson_dialogues` | 163 | Source rows used by the selected runtime dialogues |
| `lesson_blocks` | 233 | Runtime conversation fallbacks |
| `primer_dialogues` | 22 | Existing queried dialogue records |
| `primer_constructions` | 88 | Reviewed runtime construction source rows |
| `unit_assessment_manifest` | 160 | Existing course prompts and identities |
| `retired_vocab_ids` | 1,662 | Numeric ID and original unit/rank only; no forms, source headwords, definitions or examples |
| `release_metadata` | 1 | Course-only scope marker |

The **8,437-entry Kaikki/Wiktionary corpus**, **28,709-entry Siméon corpus**,
`lexicon_entries`, other research tables, unused prose, held construction
rows, book photographs, Bible audit archive, credentials and account/progress
records are excluded. Seventeen displayed cards retain Kaikki-linked IDs for
individual checked facts. The release's pre-filter core rows contain 19 such
identities, including two subsequently replaced/merged by the runtime; their
isolated English labels are at most 36 characters. They do not publish full dictionary entries or the
dictionary's selection/arrangement. Existing source credits and licensed
COERLL adaptations still apply; the subset is not a claim that all text is
newly authored or public domain.

Before publishing any **full** research-database download, supply complete
Kaikki/Wiktionary attribution, exact source-entry links, applicable licenses
and change notices. This remediation chooses the course-only alternative;
it does not clear that separate full export or any existing remote object.

## Compatibility evidence

The offline builder opens the original read-only and compares JSON snapshots
from separate fresh runtime processes. The snapshots include every unit,
unit vocabulary, all deduplicated vocabulary, selected/raw dialogues, grammar
dialogues, lesson blocks, constructions, assessments and counts for all 43
units. They are byte-for-byte equal. Every one of the 2,043 historical core
IDs appears exactly once in either `lesson_vocab` or the ID-only ledger.
All 324 path IDs are hashed in the manifest and remain unchanged. Stable
source-promoted/curated IDs and V3 IDs remain in their existing source files.
No progress keys or progress schema were changed.

The release file is 217,088 bytes. Its SQLite integrity, table allowlist,
row counts, historical IDs, selection dependencies and file hash are checked
before use. The original database's hash is checked after preparation.
Selection/preparation text fingerprints normalize Git checkout line endings
so Windows authoring and Linux deployment check the same reviewed code.
Retired identities include no source headwords or word-list strings. Previous
generated course release files are retained privately before
replacement, rather than overwriting the research database.

## Reproduction and packaging

```text
npm run release:prepare
npm run release:check
npm run release:package:check
```

Preparation never downloads anything. With the private master present, it
regenerates and requires runtime parity. Without it, it verifies the shipped
course file and manifest. Changed selection dependencies require a fresh
local preparation; failed parity leaves the candidate private and does not
replace the release. `scripts/fetch-db.js` is now an offline compatibility
entry point. Normal build/development hooks no longer fetch the master.

Next.js tracing includes only the course release and explicitly excludes
the master, ignored research storage, credentials and MMS candidate index.
Vercel runtime requires the release filename and scope marker and rejects
a raw `lexicon_entries` table. Experimental public audio is separately
archived by the media guard because tracing exclusions do not prevent
Next.js from serving files in `public/`.
