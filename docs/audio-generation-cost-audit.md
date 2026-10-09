# GCP audio generation cost audit

## Current full-replacement audit — frozen 8 October 2026

**The final approved plan contains 5,756 distinct synthesis requests, costing $2.764988 before free allowance, or $3.317986 with a 20% retry-character reserve.** This supersedes the earlier missing-only estimate below. The user approved replacing all currently taught project synthetic audio and adding missing fixed cues, preserving original external recordings, with the Spanish Google voice and the Air B approximation of `tl`. The subsequent approved song correction uses attested `huicatl` / INALI `wikatl` and adds one 74-character request.

The private backend plan is `data/audio-v3/all-course-air-b-plan.private.json`, SHA256 `624ab640a6249dba258fb47e0ad311759411017fa5efe2f9dae3d384c7be4fe5`. It is not a browser payload. The runtime receives compact assets, exact bindings, source bindings, explicit held references and lesson asset groups.

| Final frozen measure | Count |
| --- | ---: |
| Fixed learner pronunciation references | 14,014 |
| References assigned to fresh synthesis | 11,526 |
| Distinct exact SSML/settings requests | 5,756 |
| References preserving external recordings | 2,488 |
| References replacing an assigned project recording | 383 |
| Content accuracy holds | 0 |
| Pronunciation parser or request-size holds | 0 |
| Explicit component pronunciation cues | 534 |
| Stable course-path lesson groups | 324 |
| Synthetic plan asset groups | 392 |
| Complete SSML input characters | 691,247 |

References are placements, not unique vocabulary. The inventory includes original vocabulary/dialogues; verified vocabulary; all original and supplemental phrases; complete mapped answer forms; every sentence-builder tile and conversation gap answer; grammar-lab examples, supported inputs and answers; table forms, reference examples and all 22 structured Nahuatl headings; constructions; conversation models/choices; fixed sentence-pattern examples/choices; source-course vocabulary and conservatively identified Nahuatl body/sound cues. The 1,551 written-item target and all 324 course-path identities are unchanged. Original-recording preparation covers **644 distinct external assets**: **545 exact-utterance URLs** associated with native text bindings, plus **99 additional passage/audio-link assets** represented by 701 source-media link placements. These remain external originals.

The immutable recipe is `spanish-air-b-2026-10-07`: `es-US-Standard-A`, `es-US`, rate 0.82, pitch 0, LINEAR16 at 24,000 Hz, inline X-SAMPA phonemes. Established Nahuatl exceptions remain. Air B uses `tx` for `tl`; it is the approved Spanish-voice approximation, not certification of the native lateral affricate. [Google SSML](https://docs.cloud.google.com/text-to-speech/docs/ssml), [Google phonemes](https://docs.cloud.google.com/text-to-speech/docs/phonemes).

Google's Standard price, checked **8 October 2026**, is **$4 per million characters**, with a **4-million-character monthly free allowance**. SSML markup except `<mark>`, spaces and punctuation count. No account allowance was inspected. [Google pricing](https://cloud.google.com/text-to-speech/pricing).

| Final-plan scenario | Billable characters | Gross synthesis charge |
| --- | ---: | ---: |
| One pass | 691,247 | $2.764988 |
| One pass plus 20% extra retry characters | about 829,496 | $3.317986 |
| Two complete passes | 1,382,494 | $5.529976 |

These figures price the frozen release plan. Earlier pilots and superseded candidates add submitted usage; the separate generator request ledger supplies actual totals. Storage, delivery and human pronunciation review are separate. Adequate remaining allowance may reduce the synthesis invoice to $0. Every final request passes the separate 5,000-byte input check. Exact SSML plus ordered settings and recipe ID determines each full SHA256 job identity; question punctuation and explicit source/display aliases are preserved.

There are **zero fixed pronunciation-reference content holds** after the owner approved `huicatl` / INALI `wikatl` for the existing song card, ID 680 in lesson 31. Its noun form and song meaning are independently attested in the modern Eastern Huasteca corpus; only that individual fact is used, with no verse or media reuse. The old `kwikatl` cue is not an accepted audio alias. [NHE Matthew 11:17](https://ebible.org/nheNT/MAT11.htm#V17), [NHE Colossians 3:16](https://ebible.org/nheNT/COL03.htm#V16). Fresh matched audio for `core-vocab:35` (`Kenihki tiitstok?`) and the bounded embedded-question `core-vocab:661` (`tlan`, “if/whether”) also has independent source support. All old mismatching clips remain held. Twenty-three lexical items still have incomplete productive-context coverage. Supported lemmas may be pronounced, while unsupported conjugations or sentences remain unconstructed. Components are explicitly taught sound/stem/affix cues, not newly claimed standalone words.

Written source forms, names and digits remain intact. The documented natural Spanish allowlist handles María, Ramón, Tomás and the café loan. One exact market utterance has pinned independently supported Nahuatl readings for displayed 15, 30 and 10; there is no generic number interpreter. The possession heading keeps its written em dash and uses a comma pause only in spoken input. English instructions, meaning labels and mixed explanatory prose are excluded. Arbitrary learner names and unbounded future sentences are outside this fixed inventory.

Five focused inventory tests, type checking, owned-file lint and syntax checks passed. They verify original recording priority, punctuation distinction, held-context isolation, immutable hashing, oversized-request reporting, current phrases, every gap, all stable lesson groups, structured headings and exclusion of English task labels. Separate private `data/audio-v3/all-course-air-b-qa33.private.json` selects 33 actual path lessons across the 324 positions for playback review. Inventory generation is offline; this subtask did not authenticate, make provider calls, synthesize audio, upload media or access learner records.

`node scripts/export-all-course-audio.cjs` recounts in memory. Use `--write` only to deliberately create a new plan; do not rewrite the frozen plan during publication merely to refresh its timestamp. The legacy helper and the following historical figures do not represent the current replacement scope.

## Archived missing-only audit — 6 October 2026

The figures and unresolved recipe limitations below describe the earlier scope before full replacement, Air B approval, explicit component cues, fresh source support and the final inventory adapter. They are retained as history, not current release guidance.

Recounted offline **6 October 2026** against the then-published V3 lesson snapshot: 281 lesson blueprints, 2,432 additional phrase records and 324 stable course-path identities. The blueprint file SHA256 is `7baaba161367e2ea0326f819f70368dca2769b8050999765c22fbdab951ee3c5`. That audit was an estimate only. No audio was generated, no billing account or credentials were inspected, and no learner records or audio bindings were changed by that audit.

**Budget approximately $1.80 for one pass over the current fixed audio candidates, or $2.16 with 20% extra synthesis characters for retries.** Including the separately inventoried text-only grammar examples raises those figures to approximately **$1.93 and $2.32**, subject to content and binding review. These are synthesis charges before any available free allowance; hosting, delivery and linguistic review are separate.

## Inventory

| Current fixed record pool | Missing audio references |
| --- | ---: |
| Original vocabulary and dialogue records | 58 |
| Conversation practice and sentence-choice records | 40 |
| Independently verified vocabulary catalog | 1,203 |
| Original V3 phrase catalog | 121 |
| Additional contextual lesson phrases | 2,432 |
| **Total before deduplication** | **3,854** |

Those references represent **3,185 normalized text groups**, including records that should remain withheld. A reused word or sentence is counted once in a normalized group even when several screens use it. Existing source recordings remain source recordings; the 607 source-course vocabulary records and 701 source audio-link placements already have assigned URLs. Assignment is not a fresh transport or heard-pronunciation check.

**80 fixed references remain outside the candidate batch:**

- 75 bare dependent components need documented complete forms rather than isolated stem/suffix recordings.
- Three original vocabulary records still have content-review holds: `Kenihki tiitstok?`, `tlan` with the meaning “if,” and `cuīcatl` in that original record. This does not invalidate a separately supported record with similar text.
- One market utterance contains written digits whose spoken reading is not approved.
- One additional sentence contains the source proper name `Tomás`; its acute-accent character is rejected by the current recipe. The audit preserves that hold instead of silently changing the name.

The remaining **3,774 fixed placements** become **3,397 distinct exact SSML requests**. This stricter count preserves punctuation, question/statement prosody cues and different source-input recipes. The existing broad media census groups away some of these differences and reports 3,108 recipe-valid candidates. Use the larger exact-request figure for budgeting until intentional reuse has been reviewed. Recipe validity alone does not approve a word or sentence for release; outstanding linguistic and pronunciation reviews still apply.

## Voice, pronunciation and billing basis

The estimate uses the established code defaults: **`es-US-Standard-A`, Spanish (US), rate 0.82, pitch 0, LINEAR16 WAV, inline X-SAMPA phonemes**, recipe `spanish-approximation-2026-10-04`. No local environment overrides were read. Google currently lists this voice. [Google supported voices](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types).

The existing recipe retains `x → sh`, `hu/final uh → w`, `qu → k`, `cu/kw → kw`, doubled `ll`, and the earlier `h`, `ts/tz` and stress treatment. `queniuhqui` receives the separately established `kenihki` pronunciation alias. Main learner text remains INALI; spoken-input aliases do not rewrite the source evidence.

Google's Standard rate is **$4 per million characters**, with a **4-million-character monthly free allowance**. Billing includes spaces, punctuation and SSML markup except `<mark>` tags. This recipe uses no `<mark>` tags, so the audit counts every Unicode character in the complete `<speak>…</speak>` input, rather than counting only Nahuatl letters or UTF-8 bytes. Actual remaining allowance is unknown. [Google pricing](https://cloud.google.com/text-to-speech/pricing).

| Fixed candidate scope | Billable input characters | Gross synthesis charge |
| --- | ---: | ---: |
| One pass, 3,397 exact SSML jobs | 449,528 | $1.798112 |
| One pass plus 20% retry-character allowance | about 539,434 | $2.157734 |
| Two complete passes | 899,056 | $3.596224 |

The 20% allowance measures **extra characters submitted**, not exactly 20% of files: retrying a long dialogue costs more than retrying a short word. Extra voices or speaking-rate versions require additional requests. If sufficient monthly allowance remains, the synthesis invoice for these requests could be $0. Changing the voice class requires a new estimate.

There are **147 recording leads** for these exact-request candidates. They are normalized text matches to currently assigned recordings, not approved replacements. If every lead passes exact wording, scope, licensing and prosody review, the fixed synthesis batch could fall to 3,250 jobs / 437,031 characters: **$1.75 one pass, $2.10 with 20% retries**. The main budget assumes no such saving.

## Text-only grammar and construction scope

The fixed-media schema does not bind every sentence in older grammar labs, grammar-reference tables and original lesson construction examples. This audit separately inspects those surfaces instead of treating their absence from the audio schema as completion.

It selects 560 written references from examples, complete answer forms, explicitly labeled form columns and source-reviewed constructions. After removing text already represented in the fixed inventory, **280 references remain**, yielding **204 additional exact SSML candidates / 33,757 characters**. Nine references containing accented `María` or `Ramón` remain recipe holds. Dependent stem answers, letter-conversion cells, segmentation exercises and English meaning columns are excluded from spoken-word candidates.

These extra candidates are **not an approved batch**. A successful pronunciation parser does not prove their grammar, meaning or complete-form status; they need individual review and an audio binding before generation.

| Planning scope | Exact SSML candidates | Characters, one pass | One pass | With 20% retries |
| --- | ---: | ---: | ---: | ---: |
| Current fixed candidate inventory | 3,397 | 449,528 | $1.80 | $2.16 |
| Additional unbound written examples | 204 | 33,757 | $0.14 | $0.16 |
| **Fixed plus optional written-example scope** | **3,601** | **483,285** | **$1.93** | **$2.32** |

This covers existing static texts, not every future learner name, dynamically constructed sentence or user-generated conversation. The withheld items cannot honestly be presented as a fully priced, approved generation batch. Resolving them changes the inventory and requires another offline count. Two full passes over the currently countable fixed-plus-optional scope cost approximately **$3.87**. A **$5 synthesis-only reserve** leaves room for a small pilot; it is not an all-in production or review quote.

## Pronunciation and release limits

Google documents inline IPA/X-SAMPA custom pronunciations. Its Spanish-US inventory includes `sh` and `w`, but lists `t` and `l` individually without the Nahuatl lateral affricate. Therefore the recipe's `tl → t+l` is an approximation, not evidence of authentic EHN `tl`. **982 fixed exact-request jobs contain `tl`** and require explicit review. Vowel macrons are folded by the established Spanish recipe, so it does not certify phonemic length. [Google SSML](https://docs.cloud.google.com/text-to-speech/docs/ssml), [Spanish-US phoneme inventory](https://docs.cloud.google.com/text-to-speech/docs/phonemes).

Generate a small reviewed pilot first, retain source recordings, use immutable candidate paths and preserve text/recipe hashes. Listen for the requested Nahuatl exceptions, stress, syllable count, final glides and whole-utterance meaning before binding a candidate. New synthetic files must remain visibly labeled, and existing holds must not disappear merely because a file exists. The current generator accepts its core manifest; the expanded candidate inventory needs a reviewed export adapter before a bulk run.

## Reproduction of this estimate

Run `node scripts/audit-google-audio-cost.cjs --write` for an offline recount. The independent inventory reconciles its fixed reference and normalized-group counts against the existing media census, then deduplicates complete SSML separately. The result is saved in `data/media-audit/google-audio-cost-audit.json`, including source hashes, individual job hashes, exclusions and arithmetic. It performs no authentication, provider requests, media generation or playback assignment.
