# Audio provenance and local comparison

Historical census verified: 2026-10-04. Diagnostic storage and learner import
boundaries updated: 2026-10-07. The user's audio policy is original external-course
recordings first, then the established Spanish Google voice with Nahuatl
pronunciation exceptions. The Google synthesis recipe has been restored;
INALI remains the teaching orthography. MMS diagnostic players were removed
from learner practice. All 54 legacy recording holds remain intact; four exact
original-source alternatives now provide playback without releasing stale files.
This leaves 50 main-course items without matching audio. No paid TTS calls or
image generation were made. See [the current media audit](media-integrity-audit.md).

## Historical course and media census (2026-10-04)

The main course export contains 649 stable identities: 473 vocabulary cards and
176 dialogue lines. It uses the same corrected runtime content as the app,
including visibility gates and variant collapse. IDs were not renumbered.

| Main-course playback at this snapshot | Count |
| --- | ---: |
| Vocabulary placements linked to native COERLL source recordings | 122 |
| Vocabulary placements using local legacy synthetic recordings | 308 |
| Vocabulary placements using S3 legacy synthetic recordings | 37 |
| Vocabulary audio holds | 6 |
| Dialogue lines with enabled legacy synthetic recordings | 128 |
| Held dialogue identities now using exact native source alternatives | 4 |
| Dialogue lines still without matching audio | 44 |

Of the 48 held dialogue lines, 41 have old local recordings and seven have no
local recording. A file with the old stable ID does not establish that it says
the corrected text. Explicit unavailable/null audio must continue to prevent
fallback to that file. These are the original 48 dialogue-file holds; current
playback unavailability is 44 after the four exact source alternatives.

The legacy local library contains 2,043 vocabulary and 378 dialogue WAVs:
2,421 files totaling 183,537,070 bytes, plus seven test WAVs. Checked legacy WAV
headers are nonempty 24 kHz mono 16-bit PCM. These checks establish file structure,
not pronunciation.

The offline manifest identifies 216 possible exact source-recording matches.
This is a discovery count, not a change to the 122 native playback placements.
It permits 266 source-supported inputs for local comparison and excludes 383
unknown or sound-only inputs from synthesis. The 73 new version 3 expansion words
are separate from this main-course census and already link their exact isolated
source recordings; they do not need replacement synthetic word audio.

## Exact text before synthesis

`scripts/lib/course-audio-inputs.js` reads an existing local database through the
runtime course APIs. It never downloads the database, reads secret env files,
authenticates, or invokes a provider. Raw SQLite text and the older
`src/data/reviewed-audio.json` are not generation inputs.

Each exported row includes its stable ID, exact learner text and translation,
source spelling used for synthesis, source references, text SHA-256 hashes,
review scope, original audio hold, and candidate eligibility. The manifest also
hashes the database and relevant correction/source files. Unknown inputs remain
in the census with `generation_allowed: false`; generators exclude them.

```powershell
# Offline preview: no writes or authentication.
node scripts/export-audio-manifest.js

# Freeze corrected current inputs in ignored local data/audio-v3/.
node scripts/export-audio-manifest.js --write

# Refresh the small benchmark metadata from exact source vocabulary rows.
node scripts/export-audio-benchmark.js --write
```

`--db PATH` selects another already-present SQLite snapshot. Missing local input
fails instead of fetching a deployment database. Regeneration must follow a new
export whenever corrected learner text changes. Manifest readers reject duplicate
IDs, mismatched text hashes, and unsupported review/source metadata.

Source orthography is used where it is attested. For the three corrected held
vocabulary candidates, the source examples are `Nipanoyaya` in Lesson 28 and
`Tiitztoc`/`Niitztoc` in Lesson 24. The export verifies the original quoted source
lines before using them; it does not invent inflection from a lemma.

## Source benchmark and archived MMS comparison candidates

`src/data/audio-source-benchmark.json` contains 19 exact COERLL vocabulary
references with native recording URLs, source lesson/index, attribution and
feature tags. The source clips remain linked at COERLL; they were not downloaded,
rehosted, or used for training. Examples cover `tl`, `tz`, `ch`, `x`, `hu`, final
`uh`, double `ll`, written vowel length, commands, questions and a singular
future. Tags identify comparison targets; they are not phonetic certification or
claims that the examples form minimal pairs.

| Indexed local candidates at the October 4 snapshot | Count |
| --- | ---: |
| Source benchmark comparisons | 19 |
| Corrected held dialogue comparisons | 48 |
| Corrected held vocabulary comparisons | 3 |
| Total | 70 |

The current 70 clips total 3,767,304 WAV bytes and 117.632 seconds. All are 16 kHz
mono 16-bit PCM, with matching saved SHA-256 hashes and successful technical
waveform checks. Fifty explicitly use the vowel-length diagnostic described
below. No candidate has passed linguistic review. The other three vocabulary
holds (IDs 35, 661 and 680) did not receive archived MMS candidates. Current
source-supported Google input for ID 35 is the same corrected utterance as held
dialogue FCN-LDG-000313; one future reviewed recording can cover both. IDs 661
and 680 still require exact-form evidence before synthesis.

Seven earlier candidates were superseded after source spelling/reference
refinement. The snapshot counted 77 WAVs and 77 JSON sidecars, including those
superseded files. Their immutable bytes and provenance are retained when the
release guard archives the former public diagnostic directories into ignored
private storage. The rollback manifest records each original path and hash;
archiving does not approve a clip for learner playback. See
[private diagnostic audio storage](diagnostic-audio-storage.md).

Four held dialogue identities also have exact native source alternatives in the
manifest: `CUR-11-005` and `CUR-11-006` match `Mōztlayoc` (Lesson 11, vocabulary
10); `CUR-19-001` matches `Ximoquētza` (Lesson 2, vocabulary 17);
`CUR-19-002` matches `quēna` (Lesson 2, vocabulary 1). These are reviewable source
recordings now used for current playback, while the old synthetic files stay held.

The media re-audit also restored three exact, unchanged synthetic Unit 3 phrases
in the V3 tools, with their provenance and synthetic label retained. There are
25 distinct V3 phrases without audio across 40 placements. Twenty-four have
validated synthesis inputs; the remaining market phrase needs an attested
spoken-number recipe. Together with 47 distinct eligible main-course texts,
there are 71 candidate recording jobs. The 73 expansion words and 19 listening
benchmarks already have source recordings and are excluded from this batch.

The current transport audit checked 439 routed local URLs backed by 436 distinct
valid WAV files, and 681 distinct public audio URLs with successful audio-header
responses. These checks establish availability and file structure, not heard
pronunciation. An unavailable recording now has a visible status; playback
failure has a retry message; listening reviews without audio are deferred without
deleting stored learner history. Silent fallback to an unverified same-ID S3 file
has been removed.

`src/data/audio-source-benchmarks.ts` exposes the source-only
`AUDIO_SOURCE_BENCHMARKS`. The listening page imports that module directly,
without importing the diagnostic MMS candidate index. `src/data/audio-review.ts`
retains the historical `LOCAL_AUDIO_CANDIDATES` and
`getLocalAudioCandidates(kind, id, currentText)` diagnostic API, plus a benchmark
re-export for compatibility. Its lookup checks exact text, unreviewed status,
historical candidate URL format and provenance hashes; it never releases audio
holds or establishes that a former URL is still served. New MMS diagnostic
indexes remain private under `data/audio-v3/diagnostics/mms/`. Diagnostic
candidates are not sent to the listening UI.
New scenarios use exact utterance audio only; their whole-passage
source recordings are separate context. Personalized name/place substitutions
cannot inherit a fixed phrase's recording.

## Explicit diagnostic MMS comparison path

The [Meta MMS model card](https://huggingface.co/facebook/mms-tts-nhe) identifies
`facebook/mms-tts-nhe` as an Eastern Huasteca Nahuatl checkpoint, describes its
VITS architecture and stochastic duration model, and gives a CC BY-NC 4.0
license. This makes it a comparison candidate. The card does not certify
Chicontepec pronunciation or this course's individual sounds and words.

The existing local cache was used with no download or account token:

```text
Revision: 48cc378b4c7bc869e2282e6170a39f10930f20bf
Weights SHA-256: 044b928dd1d2fb50f9b5d37a8e55fabced9ec32d511c1bfe5bd9d56b12b2e9a3
Seed: 555
Speaking rate: 1.0
Noise scale: 0.667
Duration noise scale: 0.8
Sample rate: 16000 Hz
CPU threads: 1
Preprocessing: source-input-v3.1
```

The pinned tokenizer accepts source `hu`/`uh`, but lacks practical `w` and
macron characters. Tokenizer normalization is disabled so unsupported symbols
cannot disappear silently. Strict processing fails on either limitation.
`--practical-w-diagnostic` permits an explicitly recorded `w` to `hu`/`uh`
mapping; source spelling is preferred. `--allow-length-diagnostic` explicitly
folds written macrons for comparison and labels the clip as unable to claim
preserved vowel length. Neither flag qualifies a recording for trusted course
use. Arbitrary unsupported characters still fail.

```powershell
# Strict offline preview: no model import, inference, credentials or writes.
.venv/Scripts/python.exe scripts/generate-audio-v3.py --benchmark --dry-run

# Explicit diagnostic preview for the source benchmark.
.venv/Scripts/python.exe scripts/generate-audio-v3.py --benchmark --allow-length-diagnostic --dry-run

# Local unreviewed comparison generation from the existing pinned cache.
.venv/Scripts/python.exe scripts/generate-audio-v3.py --benchmark --allow-length-diagnostic --execute
.venv/Scripts/python.exe scripts/generate-audio-v3.py --held --allow-length-diagnostic --practical-w-diagnostic --execute
```

The Python generator defaults to dry run and local cache only. `--allow-download`
is an explicit separate option. Execute refuses inference if any selected input
has unsupported symbols. Fixed seed/settings, actual library versions, model
weights, input manifest, generator file, transformed text and output WAV are
hashed into the saved provenance. `scripts/requirements-audio.txt` pins the
tested local dependencies. `audio:mms:*` commands explicitly select this
diagnostic pipeline. The generic `scripts/generate-audio.py` entry point now
delegates to Google; its old raw-database bulk/overwrite path remains retired.

New diagnostic output uses immutable private filesystem paths:

```text
data/audio-v3/diagnostics/mms/candidates/{kind}/{id}--{text-hash}--{recipe-hash}.wav
data/audio-v3/diagnostics/mms/candidate-index.private.json
```

The generator refuses to overwrite an existing candidate with different bytes.
New candidate WAVs, sidecars, reports and the MMS index are ignored local
artifacts with private paths, not learner audio URLs. Historical compact
diagnostic metadata, source benchmark references and hold-baseline metadata
remain separate; the listening page loads only source references. Provider
scripts reject output under `public/`, including links that resolve there.

Before a release build, `node scripts/prepare-release-media.cjs --archive`
archives old files in the three former public diagnostic prefixes into
`data/audio-v3/release-archives/`, preserving filenames, hashes and a rollback
manifest. `--check` verifies those public prefixes are empty. This guard does
not move learner recordings elsewhere or alter existing holds. The full
archive/check/restore procedure is documented in
[private diagnostic audio storage](diagnostic-audio-storage.md).

## Default Spanish Google pronunciation recipe

The restored Google default is `es-US-Standard-A`, rate 0.82, pitch 0, LINEAR16
WAV. Existing recordings have no manifest proving their original settings.
Google's separate Spanish approximation recipe uses `x` as `sh`, `hu` and final
`uh` as `w`, `ll` as two `l` sounds, `qu` as `k`, `cu/kw` as `kw`, `ts/tz` as
`ts`, and `tl` as `t+l`. The earlier `h` approximation is retained. Written
macrons are folded for this Spanish voice, with no claim of phonemic length.
The `queniuhqui` pronunciation aliases are rendered as `kenihki` only in the
Google spoken-input recipe; source text, hashes, and INALI display are unchanged.

The descriptive shared tokenizer still distinguishes written long vowels and
retains the final-`uh` and `ts` corrections. Spanish synthesis validates input
characters without blocking ordinary Nahuatl words solely because they contain
`h`, `tl`, `ts/tz`, or source macrons. Synthetic recordings retain their label.

Both provider scripts default to an offline preview using the frozen manifest.
They exclude unknown inputs and existing native-source matches. Held rows are
excluded by default; Google's explicit `--held` option selects only corrected,
source-supported held texts for candidate generation and never releases a hold.
Google previews resolve only whitelisted non-secret voice/rate settings from
local env files; dry run never loads credentials/tokens or authenticates.
Default Google and OpenAI outputs are separate hashed candidate directories
under ignored `data/audio-v3/diagnostics/google/candidates/` and
`data/audio-v3/diagnostics/openai/candidates/`. Their scripts reject a public
output root; a successful experiment does not publish learner audio.
`--reviewed` is deprecated and no longer reads
the stale reviewed-text list. Paid execution requires an explicit execute flag
and `CONFIRM_TTS_SPEND=YES`; no paid execution occurred in this work.

```powershell
node scripts/generate-google-audio.js --dry-run --limit 2
node scripts/generate-google-audio.js --held --dry-run --limit 2
node scripts/generate-openai-audio.js --dry-run --limit 2
```

The OpenAI path remains a prompt-controlled experiment with no pronunciation
guarantee. `scripts/colab_xtts.py` remains deprecated for production because its
Spanish phonemizer cannot establish Nahuatl sound fidelity.

## Review and release criteria

1. Confirm the exact stable ID, current text hash, source excerpt and scope.
   Reject unknown text and a passage recording presented as an isolated word.
2. Compare each candidate with its exact source recording where available. Check
   all consonants, `tl`/`ts` affricates, final glides, double `ll`, vowel quality,
   source-supported length, stress, syllable count and whole-utterance content.
3. Record specific outcomes and remaining uncertainty. Duration/peak/RMS/hash
   checks detect technical failures, not missing phonemes or accent errors.
   Without native-speaker review, comparisons remain explicitly provisional.
4. Keep vowel-length diagnostic clips and source-supported editorial adaptations
   labelled synthetic/unverified. A smooth voice, an EHN language tag or an
   automated score cannot establish universal consensus or community approval.
5. Any future trusted release needs a review record tied to immutable text/audio
   hashes, licensing/attribution checks, a versioned hosting path and an explicit
   change to the relevant hold. Never clear all holds merely because files exist.

COERLL references retain the Nāhuatlahtolli / University of Texas at Austin
attribution and source/asset notices. The MMS model's noncommercial license must
be retained and checked for any future deployment use. Any later fine-tuning or
voice reuse needs proof that the exact recordings are permitted for that use,
plus appropriate speaker consent and voice-rights authorization; a public audio
URL or a course redistribution license alone is not proof of voice-reuse rights.
