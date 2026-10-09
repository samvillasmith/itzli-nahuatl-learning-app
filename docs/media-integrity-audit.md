# Media integrity audit and revised delivery plan

Audit date: 2026-10-04. This supersedes the earlier image URL-coverage census.
An assigned URL is not proof that a picture matches the current lesson, or that
a recording says the corrected text. Work is local; no media was generated,
no paid provider calls were made, and no production learner data was accessed.

## Repairs completed

- `Kenihki tiitstok?` now uses the existing greeting illustration instead of
  the German `DANKE` photograph. INALI teaching text remains unchanged. Its
  old recording remains withheld; it does not yet have corrected audio.
- Six image bindings were corrected: IDs 35, 411, 902803, 902804, 902806 and
  904001. Reuse is tied to the current headword and meaning, so another text
  correction cannot silently inherit approval for an obsolete concept.
- Images with wrong meanings, quantities, or embedded non-INALI spellings are
  withheld by exact asset URL. Unreviewed legacy stock fallback is blocked.
- Fourteen number cards and twelve month cards now use precise HTML cues.
  Seven previously showed eight dots, eight showed six flowers, and twenty
  showed sixteen dots. The replacement cues show the exact quantity; month
  cues show the correct position among twelve months. No image files were made.
- Four held dialogue identities now play exact original COERLL alternatives:
  CUR-11-005, CUR-11-006, CUR-19-001 and CUR-19-002. Their stale synthetic files
  remain held. Three unchanged Unit 3 synthetic phrases were reused in the
  V3 tools with their synthetic provenance retained.
- Missing recordings have visible statuses. Playback failures offer retry.
  Exercises without a recording no longer instruct learners to listen.
  Listening reviews without audio are deferred while their history is kept.
  Implicit fallback to an unverified same-ID S3 recording was removed.

## Current remaining gaps

| Area | Current state |
| --- | --- |
| Main-course vocabulary audio | 6 of 473 placements unavailable |
| Main-course dialogue audio | 44 of 176 lines unavailable |
| Main-course total audio | 50 placements; 49 distinct texts |
| V3 conversations and sentence choices | 25 distinct phrases unavailable across 40 placements |
| Additional vocabulary packs | All 73 words have original source audio |
| Listening benchmark | All 19 examples have original source audio |
| Main-course visual coverage | 344 picture placements and 26 exact concept cues |
| Main-course illustrations awaiting resolution | 103 card placements, representing 100 distinct concepts |
| Additional vocabulary illustrations | 73 unillustrated; 43 existing reuse candidates and 30 missing/held candidates |

The 54 original legacy recording holds are preserved. Four now have source
playback alternatives; this explains the difference between 54 held legacy
files and 50 unavailable current items. Vocabulary ID 35 and dialogue
FCN-LDG-000313 share the same corrected utterance and can later share one
reviewed replacement. Vocabulary forms 661 and 680 still need exact evidence.

The 103 illustration holds comprise five card-specific meaning holds, four
unreviewed legacy photographs, and 94 card placements affected by asset-review
holds. There are no unexplained missing bindings. That does **not** mean zero
missing illustrations: the 103 held placements remain real gaps.

The 43 expansion reuse candidates are not assigned or newly approved by this
inventory. One, `mixxamia`, still needs a clearer concept review because its
picture shows washing objects rather than the face-washing action. The other
candidate images also need required safety/rights records before release.

## What the re-audit establishes

The visual pass inspected 468 main-course selected, former, and alternate assets,
plus 54 expansion candidates, through browser contact sheets at thumbnail size.
Per-asset findings record the exact URL, inspected scope, reviewer and date.
This supports identified meaning, count and spelling corrections. It does not
certify full-resolution safety, cultural interpretation, every image's rights,
or community consensus. Among the 325 distinct retained main-course pictures,
127 lack the historical exact published-image approval metadata required for a
complete approval trail; thumbnail inspection does not replace that trail.

The audio transport audit checked 439 routed local URLs backed by 436 distinct
valid WAV files, and 681 public URLs with successful audio-header responses.
It did not listen to and certify every recording. Existing original source
recordings remain intact. Synthetic speech is explicitly identified.

The audits and regression checks cover current runtime content and stable
identities. They do not erase previously earned progress or claim that a
technical test establishes natural EHN pronunciation.

Final verification passed: 219 application tests across 32 files, type checking,
lint, localization, content, course and media audits, and the optimized build
with 176 generated pages. Browser review confirmed the repaired greeting image
and explicit unavailable-audio status in English and Spanish, all fourteen exact
quantities, and all twelve month positions. The Spanish check caught and fixed
a translated-gloss image-binding regression before handoff.

## Revised plan, in order

1. **Freeze exact media inputs.** Retain stable learner IDs, INALI display text,
   source text, meaning, source references, hashes and placement mappings.
   Extend the frozen audio export to V3 phrases: the current Google generator
   accepts core rows only, so its `--held` command covers 47 texts, not all 71.
2. **Review a small audio pilot before a batch.** Preserve exact original
   external-course audio. Use the restored Spanish Google recipe for synthetic
   practice, including `x` → `sh`, `hu/uh` → `w` and the other established
   exceptions. Compare source examples with candidate normal/slower playback.
   Include `tl` early: 38 candidate texts contain it. Spanish `t+l` remains an
   approximation; do not promise the EHN lateral affricate or approve it merely
   because synthesis succeeds. Keep failures held and retain source examples
   as pronunciation anchors.
3. **Fill supported audio gaps.** There are 71 distinct supported inputs:
   47 core and 24 V3 texts. Resolve forms 661/680 and the one market utterance
   containing prices 15/30/10 separately; its spoken-number recipe must be
   attested before synthesis. Store replacements at immutable candidate paths,
   review their exact content, and attach them through explicit manifests.
   Then audit retained synthetic recordings in manageable batches.
4. **Finish visual approval and reuse before generation.** Review retained
   pictures at full resolution for safety, rights, cultural depiction and
   current meaning. Approve compatible expansion reuse separately. Preserve
   the app's stricter content rules; substitute text or precise interface cues
   for concepts that cannot be illustrated appropriately.
5. **Generate images last, after the count and budget are settled.** The offline
   pool has 88 eligible core concepts and 24 eligible expansion concepts:
   **112 distinct candidates**, with **18 policy-excluded concepts** outside it.
   This is a candidate ceiling, not 112 authorized or necessary image jobs;
   reuse and non-image cues can reduce it. Generate no embedded words or labels:
   render INALI text in the interface. Require safety, meaning and cultural
   review tied to exact output hashes before an asset becomes active.
6. **Re-audit the complete local experience before rollout.** Check meaning,
   playback and failure states in English and Spanish, listening eligibility,
   source attribution, progress preservation and rollback. Rehearse deployment
   against protected learner backups before changing production. The current
   29 learners' histories must remain intact.

## Cost basis; no spending authorized

The 71 audio texts total 16,720 SSML characters: 11,701 core and 5,019 V3.
At Google's published Standard rate of $4 per million characters, one pass is
$0.06688 (about $0.07), excluding retries, storage and review and without assuming
an unused free allowance. [Google's current pricing](https://cloud.google.com/text-to-speech/pricing).

For comparison only, 112 GPT Image 2 medium 1024-square outputs at the published
$0.053 rate total about $5.94 before input tokens, rejected attempts, visual
review, storage and delivery. This is not an all-in quote. Select and validate
a supported model and reviewer, run a small measured pilot, and set a firm
batch budget against the final accepted count before generation.
[Official image cost table](https://developers.openai.com/api/docs/guides/image-generation#calculating-costs).

## Reproducible evidence

- `node scripts/audit-image-integrity.js` prints current image coverage without
  generating or downloading images.
- `node scripts/audit-audio-integrity.js` inventories local files and recording
  bindings without synthesis. `--check-remote` additionally checks public URLs.
- `node scripts/audit-course-quality.js` distinguishes deliberate holds,
  structured cues, restored source audio and current unavailable playback.
- Ignored local reports: `data/media-audit/course-image-integrity-final.json`,
  `data/media-audit/combined-image-candidate-plan.json`,
  `data/media-integrity/audio.json`, and `data/media-integrity/audio-live.json`.
- Saved inspection evidence includes `data/media-audit/number-images-inspection.jpg`
  and `data/media-audit/expansion-inspection-1.jpg` through `-3.jpg`.

Run the optimized local review with `npm run build` and `npm run review:local`.
The local guard keeps progress requests away from the production database.
