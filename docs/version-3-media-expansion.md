# Version 3 media inventory and revised plan

**Current learner vocabulary, October 9, 2026: 1,724 distinct words and written forms, covering 1,806 meaning entries across 324 guided lessons.** Advertised totals exclude removed learner content. The following October 6 media census is a historical planning snapshot; its archive and pre-generation figures are not the current learner or media totals.

Audited locally on 2026-10-06 with `node scripts/audit-v3-media-expansion.js --write`. The reproducible script combines existing audio/image audits, the verified vocabulary, the frozen original course and additional instructional phrases. Detailed placements, candidate jobs and source hashes are saved privately in `data/media-audit/v3-expansion-media.json`. All 170 vocabulary cohorts now have context activities: 156 cover every assigned entry and 14 retain explicit production holds for 23 entries. Together with 111 grammar lessons, the 281 added contextual lessons contain 2,432 supplementary phrase records. Media preparation must preserve the remaining source, sense and pronunciation limits.

At the October 6 checkpoint, the **1,551-item original written inventory was represented in full**, including 25 individually reviewed reference spellings. No written target items were absent; **75 intended meanings remained held** while practice taught independently supported, scoped meanings. The archive contained **1,760 distinct written forms**, including 1,236 additions and 234 additions outside the original target, before the later learner-content exclusions. The verification catalog had 1,359 records, including 123 existing anchors. These are written-item counts, including documented inflected forms and building blocks, rather than certified unique dictionary lemmas. The 219 course expression records were a separate, overlapping inventory; 46 units contained 37 grammar cards and 379 practice tasks. Media generation had not started at that checkpoint.

## Audio currently available and missing

| Surface | Records or placements | Assigned source/approved audio | Unavailable audio |
| --- | ---: | ---: | ---: |
| Main vocabulary | 473 | 467 | 6 |
| Main dialogue | 176 | 124 | 52 |
| Previous conversation/sentence practice | — | — | 40 |
| Earlier additional vocabulary packs | 73 | 73 | 0 |
| New verified vocabulary catalog | 1,359 | 156 | 1,203 |
| New original course expression inventory | 219 | 98 | 121 |
| Additional instructional phrases/models | 2,432 | 0 | 2,432 |

Among the 1,236 new written forms, **72 have source recording links and 1,164 lack audio**. The course uses 318 phrase references, 163 without audio; repeated placements do not add unique words. Bare building blocks need complete-form teaching and separate media decisions.

Across the existing course and expansion surfaces, **3,854 unavailable recording references reduce to 3,185 distinct written texts**. **3,108 prospective jobs** pass input-recipe checks; this does not certify pronunciation or authorize production. Seventy-five bare building-block references remain deferred, alongside one input-recipe hold. **891 candidate jobs contain `tl`**, and **135 have exact-text recording leads** that require individual rights, meaning and pronunciation review. The additional model sentences have no assigned recording; source word audio is not reused as audio for a new complete sentence.

The current image census finds **1,284 distinct missing concepts** and a **1,059-concept policy ceiling**, including 120 candidates needing precise interface-cue review. This is not an image order or approval. The separate [OpenAI image cost audit](image-generation-cost-audit.md) quotes $49.03 for one pass at the current configured settings and a $65 planning budget with its stated retry/input cushions. The exact approved generation count remains pending meaning, reuse and cue review.

The 54 held legacy audio identities remain held. Four documented source alternatives remain available. No held recording was restored, and no source recording was regenerated. The census checks assignments and local metadata; it does not establish that every remote URL currently plays or that a listener has reviewed every pronunciation.

## Audio production sequence

Before the media pilot, reset the separate ConversationStudio repeat trigger when moving to a new turn or starting a new scene. Its current nonzero replay token can replay a later available recording after Repeat has been used once. This follow-up is separate from the GuidedPathLesson card-key collision, which was fixed and checked in the current local browser review. No source binding or pronunciation recipe needs to change for either behavior.

1. Review the 135 existing recording leads and prefer a suitable, licensed source recording. Keep its original pronunciation and attribution. Dictionary fact access does not grant recording reuse rights.
2. Export the remaining candidates with exact source spelling, INALI display spelling, meaning, provenance, recipe version and stable placement IDs. The existing Google generator currently accepts its core manifest; it needs a reviewed adapter before it can consume this larger census.
3. Produce a small, approved Spanish Google pilot with the existing Nahuatl phoneme exceptions. Include `x`, `w`/source `hu`, vowel sequences, consonant clusters and representative words from the 891-job `tl` group. Keep synthetic audio explicitly labeled as an approximation. Do not silently replace documented source recordings.
4. Listen to each pilot item and compare it with licensed EHN recordings. Reject ambiguous or misleading outputs. Google documents individual Spanish `t` and `l` sounds, but its Spanish-US table does not list an EHN lateral affricate; the current synthetic `tl` treatment needs its own review. This is an inference from the supported inventory, not evidence that the model can reproduce the EHN sound. [Google phoneme inventory](https://docs.cloud.google.com/text-to-speech/docs/phonemes), [Google SSML documentation](https://docs.cloud.google.com/text-to-speech/docs/ssml).
5. Generate the accepted remainder only after the pilot and budget are approved. Review the resulting audio against its exact text and meaning before binding it to the app. Keep failed items as visibly unavailable rather than supplying a misleading substitute. Preserve stable existing course IDs and progress.

The normalized candidate input recipes total **416,114 SSML characters**, or approximately **$1.66 for one pass** at the checked Standard rate. The separate [GCP audio cost audit](audio-generation-cost-audit.md) uses exact SSML requests, preserving question/statement recipes, and quotes the conservative batch plus a separate scope for unbound grammar examples. These estimates exclude hosting and linguistic review. No provider was charged.

## Images currently available and missing

The added lessons in the unified course currently display **no generated images**. Written body and bathing vocabulary remains available; no educational-text approval permits an image exception. Bathing visuals must contain no people of any age. Genitals, breasts, buttocks, nudity, and children in bathing or exposure are non-overridable prohibitions. The 1,359 verified records have 192 possible existing-image matches, including 54 with historical exact-asset review metadata. **1,167 records have no reuse candidate**. The catalog currently has 960 policy candidates, 159 excluded records, 73 deferred building-block image jobs and 140 precise-cue review candidates. These categories describe separate, overlapping review decisions and are not an approved image order. Every proposed reuse still needs its exact meaning, asset and rights checked.

The main course has **342 picture placements using 323 distinct images**. **26 additional cards use precise HTML cues** for numbers/months. **105 placements remain illustration holds**: five semantic mismatches, four legacy-review holds, 92 asset-review holds and four explicit policy holds. Of the retained 323 distinct pictures, **127 lack historical approval metadata tied to the exact published asset**. They require review; this count does not automatically establish that the pictures are incorrect. The earlier 73-word packs have 43 possible reuse matches and 30 entries without a match.

The combined census has **1,284 distinct missing concepts**, with a **1,059-concept policy ceiling**. The 225 policy-or-component holds include bare building blocks and modeled reference forms that need separate teaching decisions. This ceiling is not an approved generation count. Different meanings remain separate until a reviewer confirms a shared illustration teaches them accurately. Semantic consolidation and precise interface cues can reduce the final count.

## Image production sequence and cost gate

1. Review existing candidates at full resolution for the intended meaning and licensed use. Resolve mismatches such as an unrelated gratitude picture on a “how are you?” item. Bind an image only after approval of its exact published asset.
2. Consolidate the remaining concepts. Prefer a precise interface cue when a picture would confuse an abstract meaning, function word, number or grammatical distinction. Apply the generator's target-headword rules as well as the stronger runtime exclusions; a reviewed source-spelling alias must not automatically approve a new INALI target.
3. Write and review prompts for the final eligible concepts, including framing, cultural context and content safety. Keep excluded items out of the generation batch.
4. Select the provider, model, dimensions and quality. Verify its current official pricing and quote the **final reviewed concept count × expected attempts**, plus input charges where applicable, storage and delivery. **The image budget remains pending those choices; the current policy ceiling is not a purchase commitment.**
5. After authorization, generate a small pilot, review exact assets, then generate the approved remainder. Record prompt, model, rights basis, review decision and content hash for each published asset. Never reuse approval merely because a filename or word matches.

**No image or audio was generated for this census. No paid provider call, production database operation or learner-progress migration was performed.** The new recall, recognition and lesson stores are separately versioned and scoped to the browser's current account; existing learner stores remain intact. Missing media stays honest while the written course can be reviewed locally.
