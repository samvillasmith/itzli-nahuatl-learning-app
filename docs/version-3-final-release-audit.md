# Version 3.0 final safety and copyright audit

Checked October 9, 2026, against the current local release build.

The checked V3 learner content passes the agreed safety exclusions and the audited source and copyright boundaries. The sweep found and fixed several distribution gaps, including raw excluded text in browser data, one threatening legacy illustration, missing software notices, and public access to the old full research database. The production build and final release checks now pass.

The advertised course remains **324 guided lessons, 1,724 words and written forms, and 5,608 generated practice audio assets**. This audit did not publish V3 or approve pending images on the owner's behalf.

## Learner content

The audit scanned 100,557 runtime string fields, including lesson payloads, vocabulary meanings, grammar, culture, conversations and listening material. It found no prohibited selected learner content under the agreed rules covering sexual acts and violence, explicit bodily functions, killing people and other specifically rejected meanings. The filters retain 36 excluded meanings and 70 excluded context phrases outside learner instruction.

Raw authoring history previously contained rejected text that was filtered from the screen but still shipped in browser data. Twelve physically selected learner catalogs now separate that history from the public course. Server-only boundaries and exhaustive parity checks protect the separation. A fresh scan of 84 production browser and prerendered response files found no full excluded glosses or graphic source paragraphs. Minimal rejection identifiers may remain in safety metadata.

## Images and audio

All 495 currently selected image URLs have visual review evidence: 218 historical reviews and 277 additional browser observations. One legacy knife-threat image is blocked. Five other images are withheld for mismatched meanings. Some retained legacy family illustrations include ordinarily clothed children; no nudity or compromising child scene was observed in the retained collection.

All **1,032 pending images** have exact local file hashes, current meaning and source checks, and saved visual review evidence. Generation safeguards require fully clothed adults aged 25 or older when depicting people, and prohibit nudity, sexual scenes, bathing, bodily waste and graphic violence. Approved ordinary care and target-practice compositions remain supported. These audit records are separate from final owner publication approval.

Audio bindings, content eligibility and online/offline consistency passed. The fixed-course inventory has 13,707 playable references and 271 explicitly held references; required playback checks reported zero unavailable items. The sweep did not newly listen to every recording. A separate quality audit retains 101 cards with imagery intentionally withheld for recorded issues.

## Sources, copyright and access

Source links and distinct source licenses remain attached to selected content. Text comparisons against the supplied Bible, INALI and García source material found no established distinctive copied explanations, exercises or dialogue in the checked course. Exact and near-match searches cannot rule out every possible paraphrase. Individual-word facts and protected expression require different treatment; attribution alone is not a reuse grant. See the [U.S. Copyright Office guidance](https://www.copyright.gov/circs/circ33.pdf).

Tutor retrieval now accepts only exact matches to 632 locally reviewed seeds, including their provenance. Public software notices preserve the licenses for 87 installed production packages and 131 bundled Next.js notice texts, with bilingual Terms links.

With the owner's explicit approval, the exact old full research database in S3 is now private: anonymous access returns **403**, while authenticated owner access preserves its original bytes. Sampled published images and audio still return **200** with their existing cache headers. Complete corpus notices remain necessary before any future redistribution of that full database.

## Final verification and release status

- **1,443 tests in 131 files passed**, alongside type checking, course, media, source and translation checks.
- The optimized build generated 458 routes. All 45 production package traces passed: no private research or diagnostic media files are included, and the course-only database is present.
- English and Spanish homepages, source information, Terms and public software notices responded successfully. Protected lessons and pending previews denied unauthenticated access; production preview boundaries also passed focused tests.
- The release scan found no exposed credentials or removed personal contact links. The production dependency audit reports zero known vulnerabilities after security updates.

One existing locale-navigation lint warning remains. Five development-only dependency entries inherit one currently unpatched glob-parser advisory; no learner-facing exposure was established. Remote image observations are URL-bound, rather than new immutable hashes of every published file. These are recorded limits of the audit.

**Status at this audit's completion:** final owner review and publication of the 1,032 pending images remained outstanding. No image upload, live email or deployment was performed during that sweep.

**Subsequent release update, October 9:** the owner approved the complete Desktop review folder, all 1,032 new images were published and verified, and application/storage hardening passed. The research database folder now also protects three older backups. See the [security and media release audit](version-3-security-release-audit.md) for the current release status. V3 deployment remains outstanding.
