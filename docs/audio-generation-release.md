# V3 audio generation release

Prepared **8 October 2026** from the frozen course-audio plan, generation journal, delivery manifest, upload record, public verification record and current runtime/public manifests. This report describes the published audio assets and local integration; it is not a deployment or native-speaker certification.

## Release result

The release contains **5,756 unique synthetic practice clips**, totaling **105,028,128 bytes** (105.03 MB / 100.16 MiB). All final clips have delivery hashes and a successful public byte/HTTP verification record. The course inventory has **14,014 fixed pronunciation placements** across all **324 stable path lessons**. These placement counts do not add vocabulary or change the 1,551 written-item target.

| Current manifest measure | Count |
| --- | ---: |
| Unique released synthetic clips | 5,756 |
| Fixed pronunciation reference records | 14,014 |
| References assigned to fresh synthesis | 11,526 |
| Exact generated text/reference alias bindings | 12,568 |
| References preserving external recordings | 2,488 |
| Exact native text/reference alias bindings | 3,532 |
| Distinct original exact-utterance recording URLs | 545 |
| Additional original passage/audio-link assets | 99 |
| All distinct original assets prepared for playback | 644 |
| Stable path lesson groups | 324 |
| Content accuracy holds | 0 |
| Pronunciation-parser or request-size holds | 0 |

The inventory covers words, full lesson phrases, complete answer forms, sentence-builder tiles, matching/grammar forms, dialogue gaps, conversation models and choices, grammar tables/examples/headings, fixed sentence-pattern examples, source-course vocabulary and identified Nahuatl body/sound cues. Repeated placements reuse an asset only when their complete SSML and voice settings agree. English instructions and meaning labels are excluded. Arbitrary learner names and unbounded future sentences are outside this fixed inventory.

Exact external originals retain playback priority. All **644 original COERLL assets** remain external, with their source notices; they were not re-recorded, edited, uploaded into this synthetic release or used for voice cloning by this pipeline. The 545 exact-utterance URLs have native text bindings; 99 additional passage/audio-link assets expand preparation of the retained source course, whose source-media links have 701 placements. Explicit reference/text bindings preserve punctuation and source/display aliases. A known reference with changed wording cannot borrow another context's clip.

## Voice, delivery and accounts

The immutable recipe is **`spanish-air-b-2026-10-07`**. Google Cloud Text-to-Speech uses **`es-US-Standard-A`**, language **`es-US`**, speaking rate **0.82**, pitch **0**, inline X-SAMPA pronunciation control and **mono 24 kHz LINEAR16** masters. The masters total **403,811,820 bytes**. Delivery files are **96 kbps mono 24 kHz MP3**, encoded from the matching immutable masters without extra provider synthesis. The unique clips sum to approximately **140.1 minutes**; that is not the duration of a full course or learner session.

The approved **Air B** treatment maps `tl` to X-SAMPA **`tx`**, a t followed by Spanish /x/ frication. Other established Nahuatl pronunciation adjustments remain in the recipe. This is a Spanish-voice practice approximation, not certified native /tɬ/ pronunciation or a guarantee of phonemic vowel length.

Generation sidecars identify GCP project **`mero-mero-494501`**. The upload record identifies the owner-authorized AWS account **`709184586125`**, bucket **`nahuatl-language`**, region **`us-east-1`**, under `itzli-app/audio-v3/spanish-air-b-2026-10-07/`. Only the final inventory's MP3 files were uploaded. These are account/project identifiers, not credentials; no secrets or private book/scripture excerpts appear in this report.

## Actual synthesis usage

The recipe's generation journal records **5,767 successful requests**, **692,734 submitted billable characters** and **zero failed or retry entries**. At the published Standard rate of **$4 per million characters**, their gross synthesis value is **$2.770936**, before any available free allowance. Google lists a four-million-character monthly Standard allowance and counts complete SSML input, including punctuation, spaces and tags except `<mark>`. Remaining account allowance and the final invoice were not inspected for this report. [Google pricing](https://cloud.google.com/text-to-speech/pricing).

Eleven successful candidates were superseded while finishing the reviewed inventory. They remain outside the final release and have no uploaded asset or runtime binding. The final **5,756-job** plan itself totals **691,247 characters / $2.764988**; the journal correctly includes the additional **1,487 characters / $0.005948** already submitted for those superseded candidates. Separate earlier pronunciation pilots outside this recipe's bulk journal are not included in these totals. Storage, network delivery and listening review are separate costs.

See the [full-replacement cost audit](audio-generation-cost-audit.md) for the frozen estimate and retry reserve. No additional audio was generated to write this report.

## Public files, integrity and notices

The completed public verification record, dated **8 October 2026 at 05:49 UTC**, reports **5,756 of 5,756 passing** files and **zero failures**: the new song clip was freshly checked, and recent verification of the 5,755 unchanged assets was retained after matching their identities and hashes. Every row has HTTP 200, matching byte length and SHA256, audio/mpeg, immutable one-year cache headers and the expected local review CORS origin. All 644 original asset URLs also passed the recorded public HEAD checks; that establishes online availability, not native offline retention or a new license. These are delivery/integrity checks, not linguistic certification.

This report independently recomputed every original release MP3 SHA256 and length and checked the newly added song clip against its matching final metadata. All final IDs reconcile with the refreshed frozen plan, delivery manifest, upload record, public verification record and current runtime manifest. The **12,568 generated** and **3,532 native** alias bindings match their exact approved reference records. Runtime and public manifests carry matching content and zero held references.

The accompanying [published audio rights notice](https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/audio-v3/spanish-air-b-2026-10-07/audio-notices-9c3c4e4be703b17baee107ac8360df6225968329981898a8b4933c5d46b05ac2.json) is attached through `rights_notice_url` in both `src/data/generated-course-audio.json` and `public/generated-course-audio.json`. Its local bytes match the publication record. It credits Itzli contributions, attributed licensed adaptations and individual fact references while retaining separate third-party rights. See [audio media notices](audio-media-notices.md) and the [source register](https://www.itzli.app/en/source-course).

| Evidence | SHA256 |
| --- | --- |
| Frozen private audio plan | `624ab640a6249dba258fb47e0ad311759411017fa5efe2f9dae3d384c7be4fe5` |
| Recipe attempt journal | `c5584460042a2275c9f5f60255d2663e3096bf6f36929d5ad89b9e531d27edc0` |
| Delivery manifest | `b151adfdbb4e545027d81bf195b6d094adeb349aa1aab7af9b173ca0aed93b17` |
| Upload record | `fccb2facb826ddbf566e28e1404ad0d3d75a56f17840265668bfbafcd099f447` |
| Public verification record | `95d07e7d6da2851f42ec08f2a199e6009a3c9ed36ed7c089fcd2d129c26fc066` |
| Original-source header availability record | `397543905e5de96717c6d7f84d16534d226b958fdf86ffdc20deaf0a2d316788` |
| Current runtime audio manifest | `a6ddb31f6413d97dbabe93320f7bd101d390b974fa548cde05d88972189178bb` |
| Published rights-notice bytes | `9c3c4e4be703b17baee107ac8360df6225968329981898a8b4933c5d46b05ac2` |

The private plan, source research, request journal and file sidecars remain backend review evidence. The public manifest and accompanying rights notice contain the information required for playback and attribution.

## Device caching and its limits

On a lesson route, the app prepares that lesson's assets first, followed by the **actual next lesson in the existing path**. Grammar and sentence routes use their own groups. The all-course background pass begins after the learning page settles and may be paused/resumed. Automatic background preparation skips offline, data-saver and reported slow mobile connections; explicit download remains available. Generated and original recordings have separate queues and honest status messages.

Generated practice clips use a recipe-specific validated device cache, three concurrent fetches and small resumable batches. The cache verifies readable audio, expected size and SHA256 where supported. It preserves approximately 20 MB of free device storage beyond the next clip when quota estimates are available. Storage errors, incomplete downloads and unavailable caching pause preparation or fall back to ordinary playback. Browser storage can be evicted; private mode, platform limits, device quota and network conditions can prevent completion. The generated release requires about **100.16 MiB plus cache overhead**, excluding other app/browser data.

Original COERLL recordings are prepared through normal media preloading with two concurrent requests. Their host does not provide the readable cross-origin responses needed for this app's validated CacheStorage pack. Native preparation warms the browser's **HTTP cache only**; the browser controls retention and offline availability. No proxy, opaque-storage workaround or substitution is used. “Prepared” originals are not a promise that all native audio is durably saved offline.

The service worker serves saved generated clips, including audio byte-range seeking, only from the validated generated manifest. Cache behavior should be checked on the intended devices and network conditions. Final local browser and offline-playback observations can be added below after review.

## Accuracy, review and progress compatibility

The owner approved the independently attested **huicatl / INALI wikatl** form for the existing “song” card, **ID 680 in lesson 31**. Its source fact and meaning are credited to the modern Eastern Huasteca corpus; no verse, explanation or media is reused. The new matching practice clip resolves the last fixed pronunciation-reference content hold. The old kwikatl cue is not an accepted alias, and its stale recording remains withheld. The correction preserves the gloss, lesson placement and progress ID. Twenty-three lexical items retain their existing productive-context limits; a supported lemma cue is not approval to invent a conjugation or sentence. [NHE Matthew 11:17](https://ebible.org/nheNT/MAT11.htm#V17), [NHE Colossians 3:16](https://ebible.org/nheNT/COL03.htm#V16).

The [audio review sample](audio-review-sample.md) covers **33 of 324 lessons (10.2%)**, associated with **739 of 5,756 unique synthetic clips (12.8%)**. These are review selections, not a claim that every associated clip has been listened to or approved. Review words, completed sentences, grammar/construction activities and conversation turns, plus cache/offline replay and seeking. Software delivery checks and a sample review do not establish universal pronunciation accuracy.

The read-only course release check passed: **2,043 historical vocabulary identities**, **43 legacy units**, the **324 stable path IDs** and the reviewed course-only SQLite remain intact. The historical ledger includes retired numeric IDs so existing progress references stay meaningful. This report's local checks required no learner account or production progress access and made no progress-schema, database, content or audio-plan edits.

| Compatibility fingerprint | SHA256 |
| --- | --- |
| Course-only release SQLite | `00b90c3e6f3879253e169de18901e199bf16cd1da4b31fc6bb1fd677c642fec0` |
| Unchanged private research SQLite | `e924e3fa8ad4c9b2a304ae63ad95e80056af8a3239ef973b88fea7ccac94e861` |
| Stable course-path IDs | `751a3ae34f1bfcd3448711a3c3ec5f0ebbfaf1d1c6ac1bdf9a619f33b818c8cd` |
| Preserved historical vocabulary IDs | `68183ec294d0b3722781ed38be777779bf36460f4aea7d29f7381ff6d0847eb7` |

The final full verification gate passed **104 test files / 1,226 tests**, TypeScript, ESLint, localization, content, course and media audits. The optimized local build and all 44 release-package trace checks passed; private research, credential and diagnostic paths remain excluded. The local review server runs at http://127.0.0.1:3000 with cloud progress writes disabled. The app has not been deployed to production.

## Local browser observations

- In lesson 44, the rebuilt app played a generated question from the approved S3 recipe folder: the media element reached readyState 4, advanced its playback time and had no media error. Vocabulary and full-sentence stages exposed matching audio controls.
- Playing a second recall-option cue stopped the first, restored its button and did not select an answer. The grammar spelling-comparison table exposed controls in all explicitly inventoried Nahuatl columns, including the INALI `tlahtoa` form.
- Source lesson 3 retained its original COERLL word links and played its original `na` recording. Conversation questions and reply choices exposed their corresponding players and source/synthetic labels.
- The review browser reported **all 5,756 practice clips saved on this device**, including the final song clip, and replayed a generated conversation question successfully. This confirms completion on this review device; it does not promise that another device has already downloaded the pack.
- An anonymous S3 byte-range request returned HTTP 206, the correct 512 bytes and the approved localhost CORS origin. Service-worker tests cover saved full and ranged playback with network failures. The browser's system network was not disabled during this review, so this is not a claim of a physical offline-device test.
- A browser review found that a failed batch of original-recording preloads could prevent later originals from being attempted. The corrected queue continues after individual failures, with two concurrent requests and a 20-second per-file limit, and pauses for cancellation, unavailable media support or an offline browser. Regression coverage proves six timed-out originals cannot block a seventh valid original. Original buffering and retention remain controlled by the browser and source host; a timeout does not authorize substituting a synthetic clip.

These checks establish delivery, routing and playback behavior. They do not certify native pronunciation or replace the 33-lesson listening review.
