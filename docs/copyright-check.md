# V3 copyright check

Initial audit checked October 7, 2026 against the **actual working tree at that time**, the local research/course SQLite opened read-only, and all **91 available Git commits**. HEAD: `37b5fced542236daaf8ff7a3e4cf533529952e8f`. V3 includes uncommitted and untracked work; this report does not pretend HEAD alone contains the launch course. Earlier conversation summaries and audit conclusions were not accepted as evidence. The separately authorized remediation below records subsequent local changes; the initial findings and integrity statement remain a dated audit baseline.

## Blockers and resolution plan

**No demonstrated BLOCKER under the requested seven rules.** This result covers the inspected, fixed learner course and the repository's actual media bindings. It is not a certification of every possible close paraphrase, an uninspected production retrieval store, or every historical asset's rights.

An initial finding treated the inherited Kaikki corpus as a blocker because it is bundled on the server without complete redistribution notices. The final review corrects that classification to **NOTE**: the license permits internal reproduction, backend inclusion alone does not establish public distribution, and the current vocabulary routes expose filtered short course facts instead of full imported definitions. The production S3 object was not accessed to settle its current contents or public availability. **If the full corpus is publicly distributed without the required notices, that becomes a BLOCKER.** Its actual presence and the notice gap are documented below, not declared cleared.

Recommended follow-up plan, with **no fixes executed in this read-only audit**:

1. Before distributing a full database/download, supply the Kaikki/Wiktionary attribution, source-entry links, applicable license and change notices, or prepare a course-only release database preserving existing IDs and progress compatibility.
2. Review the 18 short glossary-label origins listed below directly against their independent sources before making a comprehensive originality claim. No confirmed copied book explanation/exercise was located; two short factual labels match the printed book.
3. Clarify the exact INALI poster and date, distinguish its alphabet from a finalized full writing norm, and distinguish the source's unversioned CC BY-SA listing from Itzli's CC BY-SA 4.0 contributions.
4. Check external photo candidates against their item-specific rights separately from the historical S3 mapping issue. Investigate those project images' URLs and meaning bindings without treating missing generation receipts as a copyright block. Keep diagnostic MMS files out of ordinary learner media packaging unless their separate terms and notices are addressed.

## Authorized follow-up status — October 7, 2026

The user subsequently authorized these four follow-ups and expressly excluded
Itzli's own AI-generated images from unknown-provenance withholding. The
initial findings below describe the pre-remediation tree; this table records
the current local changes and their separate verification.

| Area | Status | Evidence | Suggested fix |
| --- | --- | --- | --- |
| Course-only distribution alternative | PASS | Created `fcn_course_release.sqlite` (217,088 bytes) and `course-release-manifest.json`. Seven runtime course tables, 381 selected raw cards and a numeric-ID/unit/rank-only ledger for 1,662 retired cards; all 2,043 historical IDs preserved. The ledger contains no source headwords or word-list strings. No `lexicon_entries`, 8,437-entry Kaikki corpus, 28,709-entry Siméon corpus or unused research prose. Fresh-process snapshots of every getter across 43 legacy units are identical to the unchanged master. All 324 path IDs retain their hash. See [course-only release scope](course-only-release.md). | Use this checked subset for app releases. A full research-database download still requires complete attribution, source-entry links, applicable licenses and change notices; no existing remote object was inspected or cleared. |
| Eighteen glossary-label reviews | PASS | All 18 records were read directly against their cited Chicontepec/COERLL evidence and received fresh English/Spanish labels. Exact runtime overlays update seven contextual translations and named task cues/prompts without changing Nahuatl answers, IDs or evidence. Source locators and frozen lexical/instructional packets remain unchanged. See [per-record source review](gloss-origin-review.md). | Describe these current labels as independently reviewed/redrafted. Do not claim that historical wording origins are conclusively known or that all course text is original: attributed licensed adaptations remain. |
| INALI alphabet and license precision | PASS | Credits, source lesson pages, shared source notices, EULA/Terms/legal modal, tutor seed metadata, offline practice, notebook exports and written notices distinguish the undated **Alfabeto del idioma Nawatlahtolli (náhuatl)** Spanish poster, PDF modification January 31, 2025, and official listing May 28, 2025. The published poster is not marked draft and does not establish a finalized full writing norm. Publisher CC BY-SA is unversioned; Itzli's original contributions use CC BY-SA 4.0. Existing offline packs receive corrected known-source notices at display time without rewriting saved data, audio URLs or attempt identities. Frozen historical import metadata is retained as evidence, not independent license confirmation. | Preserve this distinction on any new exports or teaching surfaces. |
| MMS diagnostic release exclusion | PASS | 77 WAVs and 77 sidecars (4,178,549 bytes) moved to an ignored private archive with all 154 SHA-256 values verified and a reversible rollback manifest. The three public diagnostic prefixes now contain zero files. New MMS/Google/OpenAI experiments default to private storage. Listening imports source-only benchmarks, without the MMS candidate index. See [diagnostic storage](diagnostic-audio-storage.md). | Keep release preparation/check guards in place. Private MMS archives retain their CC BY-NC 4.0 notices; archiving does not license them for learner use. |
| Existing images | PASS | The initial image audit selected 342 placements / 323 distinct image URLs with the same meaning/depiction guards. The 350 historical S3 bindings refer to 179 assets that the owner explicitly confirmed on October 7, 2026 are their own AI-generated images. The same-day unauthenticated public check returned **HTTP200 and image/webp for all 179 original Mero URLs**, totaling 19,909,550 bytes; zero failed. The initial runtime skipped these keys through a preexisting availability fallback, not a copyright determination. Some associated words already display newer OpenAI illustrations; these bindings are not 350 additional missing pictures. No images were generated in this remediation. | All 350 historical bindings now have their exact original Mero URLs and owner-confirmed AI provenance; the blanket WebP availability exclusion is removed. Current core selection remains 342 placements / 323 distinct pictures because newer illustrations and existing specific holds keep priority. Future imports preserve these owner-confirmed records. Continue separate meaning/depiction checks. Historical provider/model settings and generation receipts remain undocumented locally. Owner-confirmed origin is distinct from visual/meaning approval and does not assert a public reuse license. |
| Actual release packaging and compatibility | PASS | Final optimized local build succeeded, including the automatic post-build package guard. Inspected all 44 generated tracing files: zero private master/research/credential/MMS-index paths; course-only SQLite present. Public diagnostic-media guard passes. Full 1,131-test suite, typecheck, lint, localization and content/media audits passed, including all 281 contextual lesson payloads in both languages and progress preservation. Seven frozen source/master hashes remain unchanged. The completion audit remains 1,286 contextual entries / 23 accuracy holds / zero errors; wording equivalence is narrowly pinned to individual source proof and does not waive accuracy requirements. | Keep `npm run release:check` and the automatic post-build `npm run release:package:check` in release review. No deployment, account access, production-data access or media generation occurred. |

The verdict remains **GO under the requested blocker rule** for the checked
local course. This follow-up does not clear a full dictionary export, prove
every historical generation receipt, or certify arbitrary future tutor/generated content.

## Findings

| Area | Status | Evidence | Suggested fix |
| --- | --- | --- | --- |
| 1. Yan García book: citations and learner expression | PASS | One public bibliography record, `GARCIA_BOOK_REFERENCE`, is rendered as reference/inspiration. **Zero lexical, phrase or grammar-rule source citations identify his book/decks as their source.** Compared 94 supplied-source OCR drafts against current JSON/TS; manually inspected all 15 supplemental photographs. All 2,432 supplementary Nahuatl phrases have zero normalized five-word matches against the OCR. Distinctive book explanation, dialogue, exercise and lesson arrangement were not located. Brief ordinary language/factual matches are discussed separately, not used to claim perfect paraphrase detection. See the complete citation register below. | Preserve fact-only reference use and original course arrangement. Do not copy the book's authored expression; attribution is not permission. |
| 1. García flashcard decks | PASS | No García/Tlahtoltapazolli deck file, `.apkg`/Anki import, deck importer, deck URL or SQLite source record found in the current source or history. `FlashcardDeck.tsx` is Itzli's own interface. The author-site link is `/books/`. | Keep decks outside future imports unless separately licensed. |
| 1. García glossary wording origins | NOTE | Eighteen brief app labels match normalized **private research summaries**, which are not necessarily book quotations. Actual page checks show several labels differ from the printed English. `nechpaktia` and `senkwa` have short printed-label matches. Builders pass manual `en`/`es` fields rather than importing book `meaning_en`; independent Chicontepec evidence checks the senses but is monolingual and cannot prove English wording origins. Untracked drafts cannot conclusively settle how each constant was composed. | Review/redraft these labels from primary evidence before claiming all wording origins are proved. Any subsequently established copying or close paraphrase of book wording is a BLOCKER under the requested rule. |
| 1. García permission status | NOTE | The [author's book page](https://tlahtoltapazolli.com/books/) identifies the second edition and sales links. No permissive book/deck reuse grant was found. The supplied title page is not a copyright-permission page. Ownership and access were not treated as a license. | Claim reference/inspiration only; do not imply permission, endorsement or open licensing. |
| 2. Wycliffe/eBible EHN text comparison | PASS | Downloaded the **entire EHN New Testament HTML archive**, including all 27 books. Compared all five-word windows against **435,333 candidate string placements / 54,226 distinct strings**, a superset of fixed learner text including actual runtime payloads. **Zero exact matches**, both raw and normalized for case, punctuation, diacritics, INALI spelling and Bible `j`/course `h`. A one-word substitution/insertion/omission screen yielded 140 flags in 22 distinct strings; all were independently reviewed. They share only four ordinary grammatical words and differ in content noun/verb; one crosses a sentence boundary. No Bible-derived altered fragment was established. Exact archive/hash/method below. | Retain the fact-only boundary and rerun this comparison after new content. Do not equate a generic four-word grammatical overlap with a copied five-word verse. |
| 2. Bible factual use and CC BY-SA boundary | PASS | Explicit V3 corpus facts are only `word-v3corpus-acdd58a8169076d0` **ipampa**, Philippians 3:9/10, and `word-v3corpus-9de48cbc1183f0a4` **nopona**, Titus 1:5. Their published notices expressly reserve the underlying translation's rights and assert no verse/media license. `scripts/lib/ehn-public-corpus-fact.js` bounds these individual tokens; the text comparison independently checks the no-verse claim. `grammar-labs.ts:1098` also refers to a single attested form, not a verse. No scripture text was found to which Itzli's CC BY-SA notice could attach. [eBible's copyright page](https://ebible.org/nheNT/copyright.htm) carries both CC BY-NC-ND 3.0 and 4.0 notices, ©2009 Wycliffe; they are not converted to BY-SA. The downloaded archive remains private audit evidence outside the app and Git. | Keep corpus attribution and translation-rights exclusion. Do not publish the audit archive or Bible extracts as Itzli course material. |
| 3. COERLL / Nāhuatlahtolli attribution, license and changes | PASS | The [publisher listing](https://coerll.utexas.edu/coerll/oer/nahuatlahtolli/) identifies five authors and CC BY-SA. **1,346 directly licensed V3 phrase records and 426 directly licensed lexical records** resolve to all five authors, a license notice and adaptation/change metadata; zero missing-source failures. The 73 earlier selected vocabulary records inherit the same source metadata. `NOTICE.md:3–33`, `LICENSE:5–19`, central Sources and linked lesson notices identify extraction/adaptation, selected source reuse, and INALI display changes. Original source transcription is separately labeled. | Retain notices with future exports. Existing linked central notices plus distributed record metadata satisfy this check; all five names need not be repeated on every card. |
| 3. COERLL source license version | NOTE | The live publisher labels the source **CC BY-SA without a version**. The historical importer and raw source JSON hardcoded 4.0. Central credits accurately disclose this uncertainty; some individual source pages still display the inherited 4.0 label. This is unconfirmed version metadata, not proof the source is proprietary. | Consistently label the verified source license as version unspecified, separately from Itzli contributions licensed BY-SA 4.0. |
| 4. IDIEZ / University of Oregon Online Nahuatl Dictionary | PASS | [Published dictionary](https://nahuatl.wired-humanities.org/) records University of Oregon copyright and named IDIEZ contributors; no blanket bulk-republication grant was located. Actual V3 has **173 primary-source lexical facts** with individual modern-field locators, short labels and bounded senses. No full-entry/definition/example collection was found imported as learner text. | Preserve individual citations and limits. Do not treat online access or the copyright footer as permission to reproduce the dictionary. |
| 4. Chicontepec / IDIEZ / Warsaw, 2016 | PASS | *Tlahtolxitlauhcayotl: Chicontepec, Veracruz*, ISBN978-83-63636-51-7: copyright pages name the authors, IDIEZ and University of Warsaw; no open grant. **732 primary lexical facts** and **1,529 supplementary phrase citations** consult heads, senses, stems or minimal linguistic frames rather than importing entire entries. The saved-page comparison found two ordinary frequency-frame matches, with different initial verbs, and no complete copied example in that scan. [Consulted edition](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf). | Continue individual factual use; keep authored dictionary prose, full examples, layout and collection outside publication. This and the online IDIEZ contributions are one source family, not independent consensus. |
| 4. Marcos Hilario Cruz dictionary, 2018 | PASS | The [published PDF](https://www.huastecamexico.com/data/ediciones/diccionario_biligue_nahuatl_esp.pdf#page=2) states ©Marcos Hilario Cruz2018 and reserved reproduction rights. Exactly six primary facts: **koltik, koskatl, koyotl, tliltik, weltiw, wiptla**, with Puebla/regional limits. No bulk authored entries or examples were imported. | Preserve regional qualification; the accessible PDF is not an open reuse grant. |
| 4. Mecayapan/Tatahuicapan / SIL / UNAM GDN | PASS | Exactly one primary record, `word-v3composed-5c64d8ad122dd9e8` **sasaka**, uses the [GDN head](https://gdn.iib.unam.mx/diccionario/zazaca/27080). The [official SIL catalogue](https://mexico.sil.org/es/resources/archives/54404) identifies the 2002 second electronic dictionary and its compilers. Current reuse is the individual regional form/sense fact, not copied entries or illustrative sentences. | Retain individual factual scope. |
| 4. SIL work-specific terms retrieval | NOTE | The official dictionary PDF link returned HTTP403; no account or access-control bypass was attempted. Catalogue copyright and authorship were verified, but a dictionary-specific open grant was not. Software/font licenses were not applied to dictionary content. | Obtain exact work-specific terms from an accessible authoritative edition before reusing any authored expression. Current fact use does not require assuming such a grant. |
| 4. Zongolica *Tlahtolnechikolli* | PASS | [Author publication](https://xochitlahtolli.wordpress.com/wp-content/uploads/2012/04/diccionario-completo.pdf) names Eutiquio Gerónimo Sánchez, Ezequiel Jimenez Romero, Ramón Tepole González, Andrés Hasler Hangert, Aquiles Quiahua Macuixtle and Jorge Luis Hernandez. No explicit open/reproduction grant was found in its full text. Exactly one primary record, `word-v3reference-07d9c0ed484d9e1b` **xikipilli**, consults the 8,000-number fact on PDF126; no entry collection is republished. | Treat it as a factual reference, not licensed dictionary text. |
| 4. Kaikki/Wiktionary inherited raw corpus and distribution notices | NOTE | Actual SQLite contains **8,437 Kaikki entries**; historical commit `1478f6a` confirms bulk gloss extraction/truncation. Full definitions remain in the private server database. Sources table records CC BY-SA3.0/GFDL with no retrieval version/date, author-entry URLs or license URI. Current [Wikimedia terms §7](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/en#7._Licensing_of_Content) permit reuse under CC BY-SA4.0/GFDL with attribution, license and change requirements; historical versions need their own provenance. `next.config.ts:42–55` bundles the database; **that alone is not public distribution**. [CC BY-SA3.0 §§3(a),4](https://creativecommons.org/licenses/by-sa/3.0/legalcode) distinguish internal reproduction from distributed copies. No raw-definition serving route was found. Current S3 contents/access were not checked because production is off limits. | Before public database distribution, add compliant attribution/source/license/change notices and compatible scope, or release only needed course data. Missing notices on an actually distributed protected corpus would change this to BLOCKER; this audit does not infer that event from server tracing alone. |
| 4. Seventeen currently active Kaikki-linked course cards | PASS | Runtime `getAllPrimerVocab()` returns 460 core records; **17** retain Kaikki-linked IDs, listed below. Their current labels are separately course-checked short facts; nine differ from the original imported labels. `src/lib/db.ts:475` searches filtered course vocabulary, not the 37,146-row imported lexicon. No complete copyrighted definition is served by that route. | Credit the inherited lineage when adding corpus notices; preserve IDs and the checked meanings. Do not describe the entire private repository as having no historical bulk imports. |
| 4. Siméon inherited corpus | NOTE | **28,709** private reference rows cite *Dictionnaire de la langue nahuatl ou mexicaine* (1885) and original OCR/derived parse layers. Rémi Siméon1827–1890 and the original edition are identified in [library catalogue](https://bvpb.mcu.es/es/consulta/registro.do?id=469734). No active course card joins to this source. Original nineteenth-century expression is a public-domain basis; this does not prove rights in an unidentified modern translation or parser layer. | Document the exact source edition/parse before distributing the whole database. Do not extend the original edition's public-domain status to later authored translations by assumption. |
| 5. Own Google-generated audio | NOTE | **2,428 local WAVs**: 2,043 vocabulary, 378 dialogue, seven tests; 2,421 vocabulary/dialogue files tracked. Git `622c483` introduced the Google family; current scripts preserve the Spanish/custom-Nahuatl pipeline. Filenames/history do not prove each clip's exact historical settings. | Retain synthetic labels and per-asset provider/text/settings/output receipts during media review. Audio is not a BLOCKER under the requested rule. |
| 5. Own hosted synthetic audio / OpenAI history | NOTE | **37 active project S3 synthetic URLs**, exhaustively listed below. Git `e92a15b` moved curated output to the Google `vocab-reviewed-v2` family. Experimental OpenAI `gpt-4o-mini-tts`/`marin` code and older output paths exist, but no current OpenAI candidate files or immutable provider receipts establish a per-asset OpenAI count. | Describe these as project-created synthetic audio with per-asset provider provenance unconfirmed, rather than asserting settings from a path alone. |
| 5. Meta MMS audio | NOTE | **77 diagnostic WAVs/sidecars**, **70 indexed** and hash-verified: 19 benchmark,48 dialogue,3 vocabulary. Model `facebook/mms-tts-nhe`, revision `48cc378b4c7bc869e2282e6170a39f10930f20bf`; [official Meta model card](https://huggingface.co/facebook/mms-tts-nhe) gives **CC BY-NC4.0**. No learner component consumes the candidate index/path. Physically present `public/audio-v3` diagnostics could nevertheless be served if included in deployment. | Keep diagnostics out of launch packaging or preserve model/noncommercial notices and separately review applicable output terms. Do not silently cover them with a BY-SA course notice. NOTE only, as requested. |
| 5. Third-party/native audio | NOTE | **644 distinct COERLL recording URLs**,1,308 raw-source placements, linked directly to `tlahtolli.coerll.utexas.edu`. `<audio src>` and source-browser anchors retain external URLs; no copied source WAV/MP3 or proxy route found. Source authors and publisher are credited. Four native dialogue bindings retain original clip links. No rehosted Bible/dictionary/museum recording found. | Retain original attribution and asset-specific notices; linked use does not grant a right to mirror recordings. |
| 6. Imported COERLL media and institutional marks | PASS | Raw source `mediaLinks`: **807 remote URLs**,701 audio and106 images,zero local paths. Source browser renders outbound image/media links. No UT Austin, COERLL, AILLA, LLILAS, INAH or INPI media/logo assets were found rehosted in `public`. The source notice's linked-media claim is scoped to this Nāhuatlahtolli section. | Optional clarity: explicitly say “Imported Nāhuatlahtolli media remain linked.” |
| 6. Two locally rehosted Met photographs | PASS | `public/culture/mexica-coiled-serpent.jpg`, object [307635](https://www.metmuseum.org/art/collection/search/307635), and `nahua-sun-warrior-altar.jpg`, object [318674](https://www.metmuseum.org/art/collection/search/318674), are **byte-identical** to the official assets. Both official API objects report public domain; [Met Open Access](https://www.metmuseum.org/hubs/open-access) supplies CC0. Git `c3761f7` introduced files with credit/rights metadata, rendered in culture captions. | Retain CC0/object credits. These are authorized local copies; do not describe all Itzli media globally as linked-only. |
| 6. Existing generated word images | NOTE | Manifest has **946 records /940 URLs**:932 name `gpt-image-1`,one names OpenAI generation,13 original typography. Current runtime selects342 placements/323 URLs:329 generated illustration placements and13 typography,zero legacy third-party selections. Historic receipts/prompts are not complete for every generated record. | Retain available generation receipts and separate rights evidence from visual/meaning approval. |
| 6. Historical project-image mappings | OWNER-CONFIRMED AI | **350 historical headword bindings /179 distinct `.webp` assets** trace to the original Mero image import. On October 7, 2026, the owner explicitly confirmed that all these assets are their own AI-generated images. Git does not contain their per-asset generation receipts or establish the exact provider/model. The initial runtime skipped these keys through the availability fallback introduced by `6d29cd6`, after `2c42ac6` changed their bucket/prefix; this is not a copyright hold. Some words have newer OpenAI images already selected. See the exact history and exhaustive binding table below. | Restore usable original URLs with exact meaning/depiction review and existing guards. Preserve owner-confirmed origin separately from undocumented model/settings. **Zero confirmed unauthorized third-party rehosts were found.** |
| 6. Two external image candidates | NOTE | `texolotl` and `lalaxcuahuitl` have an unknown creator and recorded Rawpixel/CC0 metadata not independently reverified. The owner's confirmation concerns the historical project AI images, not these external records. | Revalidate these separate candidates' item-specific rights before enabling them. |
| 6. Legacy linked photographs and starter SVGs | NOTE | 537 external image records:408 Pexels,104 Flickr,20 Wikimedia,4 Rawpixel,1 StockSnap; all currently fail exact fallback approval and none is selected. Recorded individual licenses vary, including ND. Five unused local starter SVGs are hash-identical to official Next.js15.3.0 MIT template assets, with upstream notice in the installed package; no current learner reference found. | Recheck exact item rights before enabling legacy links. Preserve upstream MIT notice in any shipped template-asset notice, or remove unused starter assets later. |
| 7. Sources and credits claims | PASS | Current central page acknowledges original Itzli arrangements **and licensed COERLL reuse**, names source authors/rights, discloses the unversioned publisher license, distinguishes source transcription and INALI display, and expressly qualifies unresolved legacy media provenance. The linked-not-rehosted statement is within the named COERLL subsection, not a blanket denial of CC0 Met copies or own synthetic media. No affirmative false claim was established in these checked passages. Source-list omissions/unknown wording origins remain NOTES and are not a claim everything is cleared. | Do not strengthen the current qualified wording to “all wording/media is original,” “all dictionary data is cleared,” or “full final INALI norm.” Address the notes before making broader claims. |
| 7. Exact INALI document, date and status | NOTE | `src/lib/teaching-standard.ts:4` points to [**Alfabeto del idioma Nawatlahtolli (náhuatl)**, Spanish alphabet poster](https://site.inali.gob.mx/INALIDhuchlab/assets/files/cartel_alfabeto_Nawatlatolli-espanol.pdf). The one-page artifact is **undated in print**, PDF created2025-01-29/modified2025-01-31, officially listed on INALI's [2025-05-28 language page](https://www.inali.gob.mx/detalle/lengua-nawatlahtolli-nahuatl). Its19graphemes match the app's declared alphabet. **Published poster, not marked draft; it does not establish a finalized full writing norm.** The metadata title's `29_ENE_24` is not a reliable publication date. | Name this exact poster and date qualification. A full final writing norm requires its own authoritative edition/status verification; do not infer finalization from the alphabet poster. |

## Bible comparison: reproducible scope

Public download: [eBible EHN New Testament HTML archive](https://ebible.org/Scriptures/nheNT_html.zip), SHA256 **14687ab098375ba4a14cd0af2deb254f3ef2fbfc94feb77ccb95773ab7e20c03**. Its324 files include287 Scripture HTML files: all27 books,7,952 verse segments and287 introductory segments. The scanner indexed174,938 consecutive five-word placements /166,889 distinct windows. The comparison is across words rather than punctuation or verse-number markup.

The candidate superset includes all current `src` JSON strings and TS/TSX literal text, local course SQLite lesson/dialogue/block/construction/assessment/lexicon text, resolved **281 instructional lessons in English and Spanish**, all **43 legacy unit getter outputs**, six fixed conversation scenarios, seven sentence patterns/default names, and22 fixed tutor seed items. Including unused legacy and source metadata makes this larger than the learner course; it is not a word/lesson count. Runtime transforms and default-name substitutions were actually resolved, rather than assuming raw JSON equals display text.

Raw/normalized scans found **zero exact five-word matches**. The near scan tested one-word substitution, insertion and omission;140 substitution flags,zero insertion/omission flags. All22 distinct flagged strings and39 referenced Bible contexts received an independent context/provenance review. Eight of nine distinct candidate windows occur in Git's actual licensed COERLL import `2c42ac6`; the ninth is a spelling variant of the same corn paragraph. Common grammar, different predicates and a cross-sentence window explain these flags; no five-word scripture reuse or Bible-derived altered passage was found.

No production retrieval store, learner notebook, user-inserted arbitrary name/text, external account or arbitrary future tutor response was inspected or certified. The current repo's fixed tutor seed content was included; no embedding or provider calls were made.

## Every record citing or mentioning García

There is **one public book bibliography record**, not a collection of García-sourced teaching records:

| Record or surface | Exact location | Use |
| --- | --- | --- |
| `GARCIA_BOOK_REFERENCE` | `src/lib/source-credits.ts:19–27` | Title, author, community book page, purchase listing, `use:book-reference`, `license:null`; reference/inspiration. |
| English and Spanish introduction | `src/components/CourseSourceCredits.tsx:10–11` | Reference/inspiration and no endorsement. |
| Book card/byline/purchase | `src/components/CourseSourceCredits.tsx:13–15` | Renders the same bibliography record. |
| Group heading | `src/lib/source-credits.ts:101` | Groups that bibliography record. |
| Written acknowledgements/policy | `NOTICE.md:36–49`; `README.md:91`; `docs/version-3-plan.md` | Reference/inspiration and limits; not book-derived learner expression. |

**No deck citation/import records. No book/deck lexical, phrase or grammar source citations.** Private target/grammar ledgers retain coverage anchors but are Git-ignored and not runtime source modules. The audit does not publish their book text or images.

Seventy-two supplementary phrase `adaptationNote` fields mention García only to state that his prose/exercises/order were not copied. These statements are **metadata claims, not independent proof of originality or book-source citations**. The exhaustive IDs appear in the appendix below.

## Eighteen glossary labels with unresolved authoring origins

All are `src/data/v3-verified-lexicon.json`, `entries[id].meaningEn`. The labels below are **actual app labels**, not a republication of a book glossary. Each has independent form/sense evidence. Manual literal assignments and absence of a book-field exporter do not conclusively prove how English wording was composed; the monolingual dictionary cannot resolve that question. Matching a private research summary is different from matching the printed book. This is a NOTE, not a detected book-expression BLOCKER.

| Record / form | Current app label | Exact independent fact / creation trace |
| --- | --- | --- |
| `word-v3rf-88efbeb4cda71e0c` / **ganchohwia** | hang clothing on a hook | [GANCHOHHUIĀ, PDF204](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=204); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-07.cjs:24`. |
| `word-v3rf-d1ea3b4a1d88f1ed` / **ikpowia** | carry something on one’s head | [ICPOHUIĀ, PDF232](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=232); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-07.cjs:33`. |
| `word-v3rf-b964019f637b7a18` / **kakapaka** | make the sound of shoes or hooves | [CACAPACA, PDF59](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=59); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-07.cjs:55`. |
| `word-v3rf-47daa0ff24687c24` / **kapani** | make the sound of shoes or hooves | [CAPĀNI, PDF79](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=79); `data/research/yan-garcia-nhe-20261004/verification/build-target-facts-batch-58.cjs:9; data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-07.cjs:55; data/research/yan-garcia-nhe-20261004/verification/grammar/review-practice-batch-58.cjs:23`. |
| `word-v3rf-f199cd4318294dcc` / **kochteka** | settle a baby to sleep | [COCHTĒCA, PDF124](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=124); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-07.cjs:69`. |
| `word-v3rf-15d91cdc66a1dab0` / **kotona** | break a cord or rope | [COTŌNA, PDF138](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=138); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-06.cjs:31`. |
| `word-v3i-89915e3940af3346` / **mama** | to carry something on the back | [COERLL lesson16; selected licensed head/form](https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-16-lesson-16-tlachihualiztli-tlen-panoc-part-3-past-tense-verts-part-3/); `data/research/yan-garcia-nhe-20261004/verification/body-only-manual-decisions.cjs:69`. |
| `word-v3rf-57157e6fedf7a8d8` / **monti** | live with one’s father-in-law after marriage | [MŌNTI, PDF333](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=333); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-08.cjs:30`. |
| `word-v3rf-aa6c47a122d5cdd9` / **nawa** | carry something in one’s arms | [NAHUĀ, PDF341](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=341); `data/research/yan-garcia-nhe-20261004/verification/build-target-facts-batch-58.cjs:12; data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-08.cjs:37; data/research/yan-garcia-nhe-20261004/verification/grammar/review-practice-batch-58.cjs:26`. |
| `word-v3form-79754ab7fcfb4ef4` / **nechpaktia** | it pleases me; I like it | [PĀCTIĀ1, PDF367](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=367); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-13.cjs:6`. |
| `word-v3f-0c7171b3193215b1` / **nepa** | over there, at a visible distance | [NĒPA, PDF350](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=350); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-bounded-partial-contrasts-proposal.private.cjs:55; data/research/yan-garcia-nhe-20261004/verification/instructional-v3/build-current-place-cohorts.private.cjs:36; data/research/yan-garcia-nhe-20261004/verification/review-target-facts-batch-25.cjs:21; data/research/yan-garcia-nhe-20261004/verification/target-facts-batch-25-manual.cjs:3`. |
| `word-v3pv-9abc1a952706fc66` / **nisokimiki** | I cannot bear being dirty | [ZOQUIMIQUI, PDF640](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=640); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-16.cjs:13`. |
| `word-v3rf-b64a5cb29c0e65be` / **senkwa** | eat something all at once | [CENCUĀ, PDF89](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=89); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-09.cjs:9`. |
| `word-v3rf-5cf5b5767c7b1b41` / **sentiya** | a place fills with people | [CENTIYA, PDF90](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=90); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-09.cjs:11`. |
| `word-v3pn-fc5d1162107714e3` / **tepeikxitlan** | at the hill’s foot | [TEPĒTL, PDF456](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=456); `data/research/yan-garcia-nhe-20261004/verification/grammar/prepare-residual-nominal-proofs.cjs:26; data/research/yan-garcia-nhe-20261004/verification/instructional-v3/build-current-body-cohorts.private.cjs:59`. |
| `word-v3pn-f6dcfd90577b3140` / **tepetsintlan** | at the hill’s base | [TEPĒTL, PDF456](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=456); `data/research/yan-garcia-nhe-20261004/verification/grammar/prepare-residual-nominal-proofs.cjs:27; data/research/yan-garcia-nhe-20261004/verification/instructional-v3/build-current-noun-cohorts.private.cjs:91`. |
| `word-v3rf-90c166d5e8a48936` / **witeki** | strike something with a stick | [HUĪTEQUI, PDF227](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=227); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-10.cjs:36`. |
| `word-v3rf-60aec1e2ebb48bcf` / **xotla** | crush with a foot or vehicle | [XOTLA, PDF613](https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=613); `data/research/yan-garcia-nhe-20261004/verification/grammar/build-target-facts-batch-10.cjs:47`. |

## Active legacy dictionary lineage

These are the17 current core records retaining Kaikki-linked IDs. Labels are minimal checked facts, not the raw corpus's full definitions. Nine differ from the original imported labels. The much larger8437-entry raw corpus is a separate, private backend/data-export concern, as explained above.

| Core record ID | Source entry identity | Current course label |
| --- | --- | --- |
| `7418` | `kw::cempohualli::1` | twenty |
| `6989` | `kw::chichiltic::2` | red |
| `6967` | `kw::cecec::2` | cold |
| `6110` | `kw::tecciztli::4` | egg |
| `6199` | `kw::cintli::3` | corn |
| `6304` | `kw::tlacua::2` | to eat |
| `6963` | `kw::caxitl::2` | grinding-stone pot |
| `6219` | `kw::huitztli::3` | thorn |
| `7037` | `kw::cuahuitl::3` | wood; tree |
| `7133` | `kw::macehualli::3` | Indigenous person |
| `6227` | `kw::itztoc::1` | to be located or present; to be here |
| `7527` | `kw::ihza::1` | to wake up |
| `7611` | `kw::pixca::1` | to harvest |
| `7638` | `kw::temiqui::1` | to dream |
| `6160` | `kw::miac::1` | much; a lot |
| `6164` | `kw::zampa::1` | again |
| `6958` | `kw::canin::2` | where |

## Audio source IDs and separate notices

Own hosted synthetic vocabulary IDs using the project `vocab-reviewed-v2/{id}.wav` family:

`903301`, `903302`, `903303`, `903304`, `903305`, `903306`, `903307`, `903308`, `903309`, `903310`, `903311`, `903312`, `903501`, `903503`, `903504`, `903602`, `903603`, `903604`, `903605`, `903606`, `903607`, `903608`, `903609`, `903703`, `903704`, `903801`, `903802`, `903901`, `903902`, `903903`, `904001`, `904003`, `904101`, `904102`, `902801`, `904201`, `904204`

Four native recording bindings: `CUR-11-005` and `CUR-11-006` link to `Moztlayoc.mp3`; `CUR-19-001` links to `ximoquetza-1.mp3`; `CUR-19-002` links to `quena.mp3`, all on the original COERLL host. The644 distinct source recording URLs are inventoried in the private evidence JSON. They are linked, not rehosted. Google/other own synthetic outputs and Meta MMS diagnostics are separate asset families; the course-text license does not assert rights over the underlying model or source recordings.

## Exhaustive historical project-image mappings

**OWNER-CONFIRMED AI — historical mappings, not a blanket copyright hold.** These are **350 headword bindings to 179 distinct assets**, not 350 distinct images or 350 necessarily missing learner pictures. Some associated words already use newer OpenAI illustrations. On **October 7, 2026**, the owner expressly confirmed: “yeah these are all just my AI images.” Their origin is recorded as owner-confirmed AI generation. The exact provider/model, prompts and per-asset receipts remain undocumented locally; the images are not classified as unknown third-party works. **Zero confirmed unauthorized third-party rehosts were found.**

The exact repository history establishes the following:

- `7dad76c` (April 29, 2026) introduced `scripts/import-s3-word-images.js` and 360 bindings to 182 keys from **`https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/`**. All 179 current keys are present in that original import. Original URL examples are [10001-cabeza.webp](https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/10001-cabeza.webp) and [5008-agua.webp](https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/5008-agua.webp).
- `2c42ac6` (May 21, 2026) changed both the importer and runtime base to **`https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/`**, retained the current 179 filenames, relabeled the generic author from “Itzli / Mero Mero S3” to “Itzli / Nahuatl Language S3,” and reduced the map to 350 bindings. The saved listing preserves original **`word-images/`** full paths for all 179 keys. Git contains no proof that those objects were copied to the new destination.
- `6d29cd6` (May 21, 2026, “Fix production image fallbacks”) added `isUnavailableLegacyS3Entry()`, which rejects every `.webp` key. This predates V3 and records an availability workaround, not an individual rights or depiction verdict.

On **October 7, 2026**, a separate unauthenticated public HEAD check verified **179/179 original Mero asset URLs: HTTP200, image/webp, zero failures**, totaling **19,909,550 bytes** (approximately 19MiB). The per-URL proof is retained privately in `data/media-audit/owner-ai-image-availability.private.json`. The images were not copied or regenerated; no S3 mutation or account login occurred. Reachability and owner-confirmed origin do not certify that every historical association passes the course's meaning/depiction guards. Restored metadata identifies the owner-confirmed AI origin without inventing a model, prompt or generation date or asserting a public reuse license.

The nine historical OpenAI-manifest versions inspected contain no exact asset-key overlap with these 179 files, and none of the files is tracked in Git. This limits reconstruction of the provider/model; it does not override the owner's confirmation of AI-generated origin. An owner-created image still needs the correct meaning and depiction review. For example, the historical map binds several past-action verbs to `801003-el.webp` and both “morning” and “tomorrow” to `813004-manana.webp`; a shared translated fragment does not establish that the image teaches each entry. The table preserves the exact historical associations and owner-confirmed origin without endorsing every meaning binding.

| Historical image key | Every associated headword / record | Status |
| --- | --- | --- |
| `822001-no.webp` | `axtle` | OWNER-CONFIRMED AI — historical binding |
| `813004-manana.webp` | `moztla`, `ihnalpa`, `ihnaloc`, `kualkan`, `ihciuh` | OWNER-CONFIRMED AI — historical binding |
| `2002-cuanto.webp` | `quezqui` | OWNER-CONFIRMED AI — historical binding |
| `813005-ayer.webp` | `yalhuaya`, `yalhua` | OWNER-CONFIRMED AI — historical binding |
| `1005-como-esta.webp` | `quehatza tiitztoc` | OWNER-CONFIRMED AI — historical binding |
| `813003-hoy.webp` | `axcan`, `āxān` | OWNER-CONFIRMED AI — historical binding |
| `801002-tu.webp` | `ta`, `tehuatl`, `teh`, `amehuantin`, `amehhuan`, `tehhuatl` | OWNER-CONFIRMED AI — historical binding |
| `801001-yo.webp` | `na`, `nehhuatl` | OWNER-CONFIRMED AI — historical binding |
| `801003-el.webp` | `ya`, `xiuhtlahcuiloh`, `otlacuac`, `oquicac`, `oahcic`, `oquichihuac`, `otequitic`, `otlahtoc`, `yeh` | OWNER-CONFIRMED AI — historical binding |
| `801006-nosotros.webp` | `tohuanti`, `tehhuan`, `tehhuantin` | OWNER-CONFIRMED AI — historical binding |
| `801009-ellos.webp` | `yahuanti`, `yehhuan` | OWNER-CONFIRMED AI — historical binding |
| `801008-ustedes.webp` | `imohuanti`, `amohuanti` | OWNER-CONFIRMED AI — historical binding |
| `803002-uno-una.webp` | `ce` | OWNER-CONFIRMED AI — historical binding |
| `803003-dos.webp` | `ome` | OWNER-CONFIRMED AI — historical binding |
| `803004-tres.webp` | `eyi`, `yeyi` | OWNER-CONFIRMED AI — historical binding |
| `803005-cuatro.webp` | `nahui` | OWNER-CONFIRMED AI — historical binding |
| `812005-grande.webp` | `hueyi`, `ueyak`, `ueyi` | OWNER-CONFIRMED AI — historical binding |
| `804004-cien.webp` | `ciento` | OWNER-CONFIRMED AI — historical binding |
| `803006-cinco.webp` | `macuilli`, `makuil` | OWNER-CONFIRMED AI — historical binding |
| `803008-quince.webp` | `caxtolli`, `kaxtoli` | OWNER-CONFIRMED AI — historical binding |
| `8009-negro.webp` | `yayahuic`, `yayauik`, `tliltic`, `cacatzac` | OWNER-CONFIRMED AI — historical binding |
| `8008-blanco.webp` | `chipahuac`, `chipauak`, `istak` | OWNER-CONFIRMED AI — historical binding |
| `803007-diez.webp` | `mahtlactli`, `mahtlahtli` | OWNER-CONFIRMED AI — historical binding |
| `8010-rojo.webp` | `chichiltik`, `chichiltic` | OWNER-CONFIRMED AI — historical binding |
| `15007-chiquito.webp` | `siltik`, `achi`, `quentzi` | OWNER-CONFIRMED AI — historical binding |
| `11006-padre.webp` | `tahtzi`, `motata`, `itata`, `tahtli`, `tatahtzi` | OWNER-CONFIRMED AI — historical binding |
| `200002-maestro.webp` | `tlamachtihquetl`, `temachtijk` | OWNER-CONFIRMED AI — historical binding |
| `230003-alumno.webp` | `momachtiani` | OWNER-CONFIRMED AI — historical binding |
| `110001-doctor.webp` | `ticitl`, `médico`, `tepahtihquetl` | OWNER-CONFIRMED AI — historical binding |
| `210010-salir.webp` | `ehua`, `cahua`, `quiza` | OWNER-CONFIRMED AI — historical binding |
| `809010-llegar.webp` | `ahsi`, `ehco`, `ahci` | OWNER-CONFIRMED AI — historical binding |
| `190005-entrada.webp` | `aqui`, `calaqui` | OWNER-CONFIRMED AI — historical binding |
| `816009-dormir.webp` | `cochi`, `kochi`, `cochiliztli` | OWNER-CONFIRMED AI — historical binding |
| `811008-ir.webp` | `yahua` | OWNER-CONFIRMED AI — historical binding |
| `360004-caminar.webp` | `nehnemi` | OWNER-CONFIRMED AI — historical binding |
| `818001-vivir.webp` | `nemi` | OWNER-CONFIRMED AI — historical binding |
| `817004-come.webp` | `huala`, `hualla`, `huitz` | OWNER-CONFIRMED AI — historical binding |
| `6005-sol.webp` | `tonatih` | OWNER-CONFIRMED AI — historical binding |
| `1002-buenos-dias.webp` | `tonalti`, `tlanextia` | OWNER-CONFIRMED AI — historical binding |
| `1003-buenas-tardes.webp` | `tiotlaquilti`, `pannotoc` | OWNER-CONFIRMED AI — historical binding |
| `1004-buenas-noches.webp` | `tlapoyahualti` | OWNER-CONFIRMED AI — historical binding |
| `814007-aqui.webp` | `nica`, `nicani` | OWNER-CONFIRMED AI — historical binding |
| `814008-ahi.webp` | `neca`, `nopano`, `nepa`, `oncan` | OWNER-CONFIRMED AI — historical binding |
| `801004-ella.webp` | `iaxca`, `ihuaya` | OWNER-CONFIRMED AI — historical binding |
| `4001-casa.webp` | `tochan`, `calli`, `chantli`, `icha`, `tenamaztetl`, `-pan`, `kali`, `kal` | OWNER-CONFIRMED AI — historical binding |
| `3004-hermano.webp` | `icni`, `iicni`, `ikni` | OWNER-CONFIRMED AI — historical binding |
| `3002-mama.webp` | `inana`, `nantli` | OWNER-CONFIRMED AI — historical binding |
| `3007-abuelo.webp` | `hueyitata`, `colli` | OWNER-CONFIRMED AI — historical binding |
| `3005-hijo.webp` | `conetl`, `konetl`, `pilconetzi`, `pilli` | OWNER-CONFIRMED AI — historical binding |
| `3008-tio.webp` | `tlatsi` | OWNER-CONFIRMED AI — historical binding |
| `3001-familia.webp` | `familia` | OWNER-CONFIRMED AI — historical binding |
| `370002-cancion.webp` | `kuikatl`, `huicatl` | OWNER-CONFIRMED AI — historical binding |
| `3009-primo.webp` | `machkonetl` | OWNER-CONFIRMED AI — historical binding |
| `200010-albanil.webp` | `calchiuhquetl` | OWNER-CONFIRMED AI — historical binding |
| `409001-bueno.webp` | `cualli`, `kualli`, `kuali` | OWNER-CONFIRMED AI — historical binding |
| `706007-sucio.webp` | `zoquiyo` | OWNER-CONFIRMED AI — historical binding |
| `6002-calor.webp` | `totonic` | OWNER-CONFIRMED AI — historical binding |
| `508010-rapido.webp` | `isocapa` | OWNER-CONFIRMED AI — historical binding |
| `502001-fuerte.webp` | `chicahuac` | OWNER-CONFIRMED AI — historical binding |
| `603002-bonita.webp` | `yehyectzi` | OWNER-CONFIRMED AI — historical binding |
| `260001-feliz.webp` | `yolpactoc` | OWNER-CONFIRMED AI — historical binding |
| `260003-enojado.webp` | `cualantoc`, `mohquetl` | OWNER-CONFIRMED AI — historical binding |
| `110006-gripe.webp` | `cecic`, `cecuiliztli`, `yacatzompilli`, `sejsek` | OWNER-CONFIRMED AI — historical binding |
| `502002-leve.webp` | `ahcoqui`, `tlahuilli` | OWNER-CONFIRMED AI — historical binding |
| `10002-ojo.webp` | `iixtiyol`, `ixteyol`, `ixtioli` | OWNER-CONFIRMED AI — historical binding |
| `10004-mano.webp` | `mayitl`, `mahposteki` | OWNER-CONFIRMED AI — historical binding |
| `10006-brazo.webp` | `ajkoli` | OWNER-CONFIRMED AI — historical binding |
| `10003-boca.webp` | `kamaktli` | OWNER-CONFIRMED AI — historical binding |
| `10007-pierna.webp` | `cotztamalli`, `catzana` | OWNER-CONFIRMED AI — historical binding |
| `10005-pie.webp` | `icxitl` | OWNER-CONFIRMED AI — historical binding |
| `10001-cabeza.webp` | `kwaitl`, `payo`, `cuaitl`, `tsonteko` | OWNER-CONFIRMED AI — historical binding |
| `120001-farmacia.webp` | `pahcalli` | OWNER-CONFIRMED AI — historical binding |
| `1001-hola.webp` | `pialli`, `nicca`, `niltze` | OWNER-CONFIRMED AI — historical binding |
| `23006-saludos.webp` | `tlahpalolli` | OWNER-CONFIRMED AI — historical binding |
| `811001-tener.webp` | `piya` | OWNER-CONFIRMED AI — historical binding |
| `809001-hablar.webp` | `camati`, `tlahtohua`, `xitlahto`, `camanalohua`, `kamati`, `tlahtoa` | OWNER-CONFIRMED AI — historical binding |
| `818007-escribir.webp` | `tlahcuilohua`, `amapohua`, `amoxmachi`, `xitlahcuilo` | OWNER-CONFIRMED AI — historical binding |
| `250006-leer.webp` | `pohua`, `xitlapohua`, `tlapohua` | OWNER-CONFIRMED AI — historical binding |
| `250007-mandar.webp` | `tlanahuatía` | OWNER-CONFIRMED AI — historical binding |
| `811005-hacer.webp` | `chihua`, `ayi`, `chīhua` | OWNER-CONFIRMED AI — historical binding |
| `817007-beber.webp` | `ī` | OWNER-CONFIRMED AI — historical binding |
| `817001-comer.webp` | `cua`, `xitlacua`, `tlacua`, `kua` | OWNER-CONFIRMED AI — historical binding |
| `340004-lavar.webp` | `paca` | OWNER-CONFIRMED AI — historical binding |
| `818009-recibir.webp` | `celia` | OWNER-CONFIRMED AI — historical binding |
| `210008-nadar.webp` | `ahqui` | OWNER-CONFIRMED AI — historical binding |
| `7010-cerca.webp` | `tzacui` | OWNER-CONFIRMED AI — historical binding |
| `818008-abrir.webp` | `tlapoa` | OWNER-CONFIRMED AI — historical binding |
| `360007-sudar.webp` | `mitoniya` | OWNER-CONFIRMED AI — historical binding |
| `370009-cantar.webp` | `cuica`, `kuika` | OWNER-CONFIRMED AI — historical binding |
| `17004-chamba.webp` | `tequiti`, `tequitl`, `tekiti` | OWNER-CONFIRMED AI — historical binding |
| `370010-bailar.webp` | `macehua` | OWNER-CONFIRMED AI — historical binding |
| `340001-limpiar.webp` | `mapohpohua` | OWNER-CONFIRMED AI — historical binding |
| `350008-robar.webp` | `ichtequi` | OWNER-CONFIRMED AI — historical binding |
| `8002-playera.webp` | `coto` | OWNER-CONFIRMED AI — historical binding |
| `4008-silla.webp` | `siya`, `icpalli` | OWNER-CONFIRMED AI — historical binding |
| `170004-olla.webp` | `comitl`, `chachapali`, `chachapale`, `komitl` | OWNER-CONFIRMED AI — historical binding |
| `4010-puerta.webp` | `puerta`, `caltentli`, `calaquiyan` | OWNER-CONFIRMED AI — historical binding |
| `22004-companero.webp` | `acahya` | OWNER-CONFIRMED AI — historical binding |
| `4007-mesa.webp` | `huapalli`, `mesa`, `ahcopechtli` | OWNER-CONFIRMED AI — historical binding |
| `4009-cama.webp` | `tlapechtli`, `cochpanhuaztli` | OWNER-CONFIRMED AI — historical binding |
| `5007-picante.webp` | `cococ` | OWNER-CONFIRMED AI — historical binding |
| `130009-puesto.webp` | `ihca` | OWNER-CONFIRMED AI — historical binding |
| `401006-senora.webp` | `siwatl`, `sihuat` | OWNER-CONFIRMED AI — historical binding |
| `401005-senor.webp` | `tlacatl`, `oquichtli`, `tate` | OWNER-CONFIRMED AI — historical binding |
| `190002-joven.webp` | `telpokatl` | OWNER-CONFIRMED AI — historical binding |
| `220005-pollo.webp` | `piyo`, `pio` | OWNER-CONFIRMED AI — historical binding |
| `17009-elote.webp` | `elotl`, `sintli`, `cimolotl`, `centli` | OWNER-CONFIRMED AI — historical binding |
| `220001-perro.webp` | `chichi` | OWNER-CONFIRMED AI — historical binding |
| `220003-vaca.webp` | `huacax`, `uakax` | OWNER-CONFIRMED AI — historical binding |
| `220002-gato.webp` | `mistli`, `cihuamizto`, `misto` | OWNER-CONFIRMED AI — historical binding |
| `220004-caballo.webp` | `kawayoh`, `kauayo` | OWNER-CONFIRMED AI — historical binding |
| `5008-agua.webp` | `atl`, `atzintli` | OWNER-CONFIRMED AI — historical binding |
| `5001-comida.webp` | `tixtli`, `tlacualli`, `tlacualiztli`, `tlakuali`, `tlakualistli` | OWNER-CONFIRMED AI — historical binding |
| `5004-tortilla.webp` | `tlaxcalli`, `tlaxkal`, `tlaxkali` | OWNER-CONFIRMED AI — historical binding |
| `160006-bolsa.webp` | `folsah`, `xikipili` | OWNER-CONFIRMED AI — historical binding |
| `703004-el-mapa.webp` | `amacamanalli` | OWNER-CONFIRMED AI — historical binding |
| `340007-escoba.webp` | `popotl` | OWNER-CONFIRMED AI — historical binding |
| `230009-libro.webp` | `amoxtli`, `amox`, `libro`, `amochtli`, `cartilla` | OWNER-CONFIRMED AI — historical binding |
| `814001-hay.webp` | `pachtli` | OWNER-CONFIRMED AI — historical binding |
| `230001-escuela.webp` | `escuela`, `caltemachtiloyan` | OWNER-CONFIRMED AI — historical binding |
| `140003-plaza.webp` | `tianquiz`, `tiankistli`, `tiyanquiztli` | OWNER-CONFIRMED AI — historical binding |
| `130008-iglesia.webp` | `teopan`, `tiopa`, `teokali`, `tiopan` | OWNER-CONFIRMED AI — historical binding |
| `2001-peso.webp` | `peso`, `tomin`, `tomi` | OWNER-CONFIRMED AI — historical binding |
| `170003-comal.webp` | `comalli`, `komali` | OWNER-CONFIRMED AI — historical binding |
| `180005-cafe.webp` | `cafe`, `cafetzin`, `kafej` | OWNER-CONFIRMED AI — historical binding |
| `220008-pez.webp` | `michi`, `michtlacualli`, `michij` | OWNER-CONFIRMED AI — historical binding |
| `180007-refresco.webp` | `tzopelatl` | OWNER-CONFIRMED AI — historical binding |
| `509004-el-azucar.webp` | `tzopelictli`, `chankaka`, `chanchaka` | OWNER-CONFIRMED AI — historical binding |
| `2009-caro.webp` | `patiyoj`, `patiyo` | OWNER-CONFIRMED AI — historical binding |
| `200009-vendedor.webp` | `tlanamacac` | OWNER-CONFIRMED AI — historical binding |
| `822004-nunca.webp` | `aic`, `aik` | OWNER-CONFIRMED AI — historical binding |
| `230007-cuaderno.webp` | `amatlajkuilol` | OWNER-CONFIRMED AI — historical binding |
| `380008-mar.webp` | `weyiatl` | OWNER-CONFIRMED AI — historical binding |
| `9004-abril.webp` | `abril` | OWNER-CONFIRMED AI — historical binding |
| `9008-agosto.webp` | `agosto` | OWNER-CONFIRMED AI — historical binding |
| `9001-enero.webp` | `enero` | OWNER-CONFIRMED AI — historical binding |
| `9002-febrero.webp` | `febrero` | OWNER-CONFIRMED AI — historical binding |
| `9007-julio.webp` | `julio` | OWNER-CONFIRMED AI — historical binding |
| `9006-junio.webp` | `junio` | OWNER-CONFIRMED AI — historical binding |
| `9003-marzo.webp` | `marzo` | OWNER-CONFIRMED AI — historical binding |
| `9005-mayo.webp` | `mayo` | OWNER-CONFIRMED AI — historical binding |
| `9010-octubre.webp` | `octubre` | OWNER-CONFIRMED AI — historical binding |
| `9009-septiembre.webp` | `septiembre` | OWNER-CONFIRMED AI — historical binding |
| `6001-tiempo.webp` | `cahuitl` | OWNER-CONFIRMED AI — historical binding |
| `6007-semana.webp` | `semana` | OWNER-CONFIRMED AI — historical binding |
| `803009-veinte.webp` | `sempoali`, `cempohualli` | OWNER-CONFIRMED AI — historical binding |
| `405002-el-color.webp` | `chilkostik` | OWNER-CONFIRMED AI — historical binding |
| `7001-carro.webp` | `carro`, `teposkauayo`, `cuacarro` | OWNER-CONFIRMED AI — historical binding |
| `110010-pastilla.webp` | `pastiya` | OWNER-CONFIRMED AI — historical binding |
| `180010-vino.webp` | `oktli`, `octli`, `uino` | OWNER-CONFIRMED AI — historical binding |
| `380005-avion.webp` | `tepostototl`, `tepoztototl` | OWNER-CONFIRMED AI — historical binding |
| `7002-camion.webp` | `calmimilolli`, `tepozcahuayo` | OWNER-CONFIRMED AI — historical binding |
| `380003-hotel.webp` | `cochihualoyan` | OWNER-CONFIRMED AI — historical binding |
| `290007-copal.webp` | `copalli` | OWNER-CONFIRMED AI — historical binding |
| `220007-pajaro.webp` | `ketsaltototl` | OWNER-CONFIRMED AI — historical binding |
| `220006-cerdo.webp` | `pitzo`, `pitsotl` | OWNER-CONFIRMED AI — historical binding |
| `220010-arana.webp` | `tokatl` | OWNER-CONFIRMED AI — historical binding |
| `130006-papeleria.webp` | `amakalko` | OWNER-CONFIRMED AI — historical binding |
| `111009-raton.webp` | `kimichi` | OWNER-CONFIRMED AI — historical binding |
| `30005-bug.webp` | `okuili` | OWNER-CONFIRMED AI — historical binding |
| `180004-leche.webp` | `lechi` | OWNER-CONFIRMED AI — historical binding |
| `120004-caja.webp` | `amacalli` | OWNER-CONFIRMED AI — historical binding |
| `170009-plato.webp` | `apaztli`, `caxitl`, `pelkaxitl` | OWNER-CONFIRMED AI — historical binding |
| `4003-recamara.webp` | `cochihuayan` | OWNER-CONFIRMED AI — historical binding |
| `170007-cuchara.webp` | `matlacualxopiloni`, `tlakualteka` | OWNER-CONFIRMED AI — historical binding |
| `120005-jarabe.webp` | `necpahtli` | OWNER-CONFIRMED AI — historical binding |
| `170001-estufa.webp` | `tepoztlecuilli` | OWNER-CONFIRMED AI — historical binding |
| `4005-cocina.webp` | `tlacualnemacoyan` | OWNER-CONFIRMED AI — historical binding |
| `170006-cuchillo.webp` | `tlatequini` | OWNER-CONFIRMED AI — historical binding |
| `380007-arena.webp` | `xali`, `challi` | OWNER-CONFIRMED AI — historical binding |
| `6004-lluvia.webp` | `kiyauitl` | OWNER-CONFIRMED AI — historical binding |
| `180002-agua-fresca.webp` | `acecec` | OWNER-CONFIRMED AI — historical binding |
| `270002-fiesta.webp` | `ilhuitl` | OWNER-CONFIRMED AI — historical binding |
| `140006-hospital.webp` | `tepajtiloya` | OWNER-CONFIRMED AI — historical binding |
| `250008-foto.webp` | `ixcopinalli` | OWNER-CONFIRMED AI — historical binding |
| `250004-contestar.webp` | `tlanaquiliztli` | OWNER-CONFIRMED AI — historical binding |
| `2007-cambio.webp` | `mocuepa` | OWNER-CONFIRMED AI — historical binding |
| `804002-cuarenta.webp` | `ompohualli` | OWNER-CONFIRMED AI — historical binding |
| `827009-siempre.webp` | `nochipa` | OWNER-CONFIRMED AI — historical binding |

Additional unknown-creator external candidates: **texolotl, lalaxcuahuitl**. Both have a recorded Rawpixel/CC0 label without independently revalidated item documentation; both remain withheld.

## Exhaustive García-negative metadata IDs

Each ID below is a `supplementPhrases[id].adaptationNote` in `src/data/instructional-lesson-blueprints.json`; none is a book/deck source citation. Their existing evidence points to other sources.

`audit-mechanic-role-study-action`, `audit-mechanic-role-student`, `audit-mechanic-role-students`, `audit-mechanic-role-sweep-action`, `audit-mechanic-role-sweeper`, `audit-mechanic-role-sweepers`, `audit-mechanic-role-worker-answer`, `audit-mechanic-role-work-question`, `audit-mechanic-command-go-one`, `audit-mechanic-command-go-group`, `audit-mechanic-command-come-one`, `audit-mechanic-command-come-group`, `tense-person-drank-i`, `tense-person-drank-you`, `tense-person-drank-we`, `tense-person-drank-you-all`, `tense-person-buy-present-i`, `tense-person-bought-i`, `tense-person-bought-you`, `tense-person-bought-we`, `tense-person-bought-you-all`, `tense-person-taught-h`, `tense-person-taught-hki`, `tense-person-taught-you`, `tense-person-taught-we`, `tense-person-taught-you-all`, `tense-person-said-h`, `tense-person-said-hki`, `tense-person-said-you`, `tense-person-said-we`, `tense-person-said-they`, `tense-person-ate-i`, `tense-person-ate-you`, `tense-person-ate-we`, `tense-person-ate-you-all`, `tense-person-back-carried-i`, `tense-person-back-carried-you`, `tense-person-back-carried-we`, `tense-person-back-carried-you-all`, `tense-person-sees-me`, `tense-person-sees-you`, `tense-person-sees-us`, `tense-person-sees-you-all`, `tense-person-sees-one-object`, `tense-person-sees-them`, `tense-person-go-i`, `tense-person-go-you`, `tense-person-go-third-one`, `tense-person-go-we`, `tense-person-go-you-all`, `tense-person-go-third-group`, `tense-person-come-i`, `tense-person-come-you`, `tense-person-come-third-one`, `tense-person-come-we`, `tense-person-come-you-all`, `tense-person-come-third-group`, `partial-contrast-command-say`, `partial-contrast-say-base`, `partial-contrast-ma-let-me-eat`, `partial-contrast-ma-let-person-eat`, `partial-contrast-ma-let-us-eat`, `partial-contrast-ma-let-group-eat`, `partial-contrast-direct-eat-one`, `partial-contrast-happy-state`, `partial-contrast-angry-state`, `partial-contrast-whole-day`, `partial-contrast-begins-all-day-work`, `partial-contrast-group-not-all-day-work`, `partial-contrast-study-present`, `partial-contrast-come-to-study`, `partial-contrast-you-go-to-study`

## History, integrity and evidence retention

Actual history checked includes `2c42ac6` (licensed public COERLL import,2026-05-21), `c60e8f3` (source/learner INALI display,2026-06-05), `1478f6a` (inherited lexicon bulk mining), `622c483` (Google audio family), `e92a15b` (curated Spanish audio path), and `c3761f7` (Met CC0 images and notices). Author/deck searches across local history did not find a García deck/book importer. V3's uncommitted creation scripts cannot supply a complete chronology of authoring decisions.

Private reproducibility evidence is retained under **`data/copyright-audit-20261007/`**, excluded by the existing `/data/` Git ignore. It includes the archive/hash, exact and near-match outputs, runtime export, per-record source censuses, glossary-origin traces, rights comparisons and independent review. It is **not imported into the app or licensed as Itzli course content**. Existing private source text stays private; no media was generated, no outreach/account/Drive access occurred, and no production data or deployment was touched.

**Read-only integrity check:** all 295 baseline-hashed existing source/script/license/culture files and the local course SQLite remained byte-identical. The audit created only this report and private evidence. Current instructional JSON SHA256: `7baaba161367e2ea0326f819f70368dca2769b8050999765c22fbdab951ee3c5`; verified lexicon: `4cc134c2a2034afd750df324607ef9b80cd29deff2dbd47c7d6bb44aab1de4e4`; local SQLite: `e924e3fa8ad4c9b2a304ae63ad95e80056af8a3239ef973b88fea7ccac94e861`. No application build, provider generation, production fetch, deployment or database mutation was run for this audit.

The final verdict applies the requested rule: any demonstrated BLOCKER yields NO-GO; unknown provenance, audio and the explicitly bounded matters above remain NOTES. This is a repository-based release check, not a guarantee of immunity or a claim every possible future output has been cleared.

GO
