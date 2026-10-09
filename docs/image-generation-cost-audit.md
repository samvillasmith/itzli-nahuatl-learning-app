# OpenAI image generation cost audit

Checked **October 6, 2026**, after the stronger depiction rules. The refreshed local census includes **281 contextual lesson blueprints and 2,432 additional phrase records**, with the verified vocabulary unchanged. The vocabulary-image census remains 1,284 missing concepts and a 1,059-concept policy ceiling; adding sentence practice does not automatically add a picture request for every sentence. At the existing generator's checked-in settings, the full policy ceiling costs approximately **$49.03 for one pass**. A **$65 API budget** allows 25% extra attempts plus a 50% cushion on estimated input-token charges. A heavy-retry scenario with one additional complete attempt for every item is approximately **$98.07**, before the input-estimate cushion. These are planning estimates, not fixed-price guarantees or an approved generation order.

**No image was generated, no paid request was made, and no account or credential was accessed.** The quotation helper does not read environment files. The current request authorizes an audit; the new batch has **zero approved generation jobs**. Existing approved pictures remain separate from this new batch.

## Inventory and guardrails

| Current inventory | Count |
| --- | ---: |
| Distinct missing word-and-sense concepts | 1,284 |
| Policy exclusions or dependent-component deferrals | 225 |
| Concepts passing current policy checks | 1,059 |
| Of those, concepts needing precise interface-cue review | 120 |
| Potential illustrations after reserving all 120 for cues | 939 |

The 225 excluded/deferred concepts comprise 168 policy exclusions and 73 dependent components, with 16 overlapping. None is priced as a generated picture. The 1,059 ceiling applies the generator's target-headword rules, stronger runtime exclusions, app exclusions and exact reviewed exceptions. Every non-overridable category is checked against original fields before approved wording can be stripped. Approval of educational text, a source-spelling alias or an earlier image cannot waive these rules. Passing them does not establish that the meaning is unambiguous, that art teaches it well, or that an existing asset cannot be reused.

The census conservatively retains different English senses: its 1,059 concepts represent 1,046 normalized headwords. The existing generator merges by headword, so a reviewed adapter must preserve distinct senses before consuming this expanded inventory. It currently loads the core course, the source-course vocabulary or the earlier vocabulary pack; it does not yet load the full verified V3 catalog.

The **105 unavailable core picture placements are already included** in the combined missing-concept inventory: five meaning mismatches, four legacy-review holds, 92 asset-review holds and four explicit policy holds. Do not add them again. Two new policy holds concern the “die” and “death” placements whose earlier metadata exceptions could waive the death category. Two further explicit holds preserve the already-unavailable wound and property candidates after active-manifest quarantine. Five conflicting image metadata records were quarantined with their original records retained privately; no image file was deleted, and this is not a finding that their actual pixels are inappropriate. The unclothed-person concept is also now policy-excluded. Compared with the prior census, missing concepts increase by two, while the generation ceiling decreases by one. Another **127 retained distinct pictures lack historical review tied to the exact asset**; reviewing them may produce further replacement work, but this audit does not presume they are wrong or charge for replacing them. Existing reuse candidates, semantic consolidation and HTML cues can reduce the final generation count. Twenty-six core number/month cards already use HTML cues with no OpenAI image charge.

The existing prompts retain the warm cream, terracotta and emerald illustration style, with no generated labels or pseudo-writing. They exclude minors by default, exposure, sexual content, bodily waste, injuries, weapons, political or sacred imagery, and other blocked subjects. **No nude people or exposed genitals, breasts or buttocks. Bathing scenes may use only empty showers, tubs or appropriate bodies of water, with no people of any age, body parts, human silhouettes or human reflections. Children must never appear in bathing, nudity, changing or exposure.** No new bathing exception was added. The previous swaddled-child composition is existing-only for generation planning because the strict new-output reviewer rejects minors; the census is not a promise to produce that card. Each output must pass provider moderation, a separate visual meaning/safety review and exact-asset publication review. Missing hard verdicts or contradictory people/clothing/composition verdicts stop publication. An automated pass does not replace human review.

## Settings and price calculation

The quote explicitly assumes **`gpt-image-1`, medium quality, 1024 × 1024 PNG, one image per attempt**, through the direct Images API with **no reference-image input**. These are the checked-in defaults; runtime overrides were not inspected. The current model price is **$0.042 image output plus $5 per million prompt tokens**. [OpenAI GPT Image 1 pricing](https://developers.openai.com/api/docs/models/gpt-image-1).

The generator then calls `omni-moderation-latest`, which is free, and a paid **`gpt-4.1-mini`** visual reviewer at **$0.40 per million input tokens and $1.60 per million output tokens**. The existing dry-run estimate omits this reviewer. [OpenAI moderation model](https://developers.openai.com/api/docs/models/omni-moderation-latest), [GPT-4.1 Mini pricing](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

The reviewer receives the full 1024 × 1024 image after the label band is replaced with cream. At the documented 32-pixel patch calculation and 1.62 multiplier, this is **ceil(32 × 32 × 1.62) = 1,659 image input tokens per attempt**. The patch count remains unchanged by the crop-and-pad operation. [OpenAI image input calculation](https://developers.openai.com/api/docs/guides/images-vision#calculating-costs).

For all 1,059 concepts, the stronger local prompt template yields approximately **593,512 generation prompt tokens**. Captured reviewer instructions, card text and JSON schema add approximately 944,033 input tokens; the images add 1,756,881. We reserve **300 reviewer output tokens per attempt**, a planning allowance rather than an enforced limit. Text estimates use the generator's `ceil(characters / 4)` approximation. Actual provider usage may differ, especially for Nahuatl spellings and schema overhead.

| Full 1,059-concept ceiling, one pass | Estimated USD |
| --- | ---: |
| Image outputs | $44.48 |
| Generation prompt input | $2.97 |
| Visual-review text and image input | $1.08 |
| Visual-review output allowance | $0.51 |
| **Total before component rounding** | **$49.03** |

For the **939 potential illustrations**, the same calculation is **$43.48 one pass**, **$54.35 with 25% additional attempts**, or **$56.59** including the input-estimate cushion. For the full 1,059 ceiling, those figures are **$49.03**, **$61.29** and **$63.82**. “25% additional attempts” means approximately 265 extra attempts for 1,059 concepts; it is not a claim that the rejection rate will be 25%. A rejected generated output can still incur generation and review charges.

There are no previous-image input charges in this workflow. Adding reference images or switching to edits would require a new quotation. The totals exclude tax, storage, upload/delivery, manual review time, bespoke lesson/conversation artwork beyond this vocabulary-concept plan, and any later newly authored content. No caching, free credit or Batch discount is assumed.

## Model availability and optional comparison

**GPT Image 1 is scheduled to shut down October 23, 2026.** OpenAI lists GPT Image 2.5 Sunburst or Flare as replacements. The configured-model estimate therefore describes a short-term existing workflow; no model was changed. [OpenAI deprecation notice](https://developers.openai.com/api/docs/deprecations).

The public OpenAI calculator, explicitly set to **GPT Image 2.5, 1024 × 1024**, showed **439 output tokens / $0.01317 at medium** and **1,756 / $0.05268 at high**. Its text input rate is $5 per million tokens. These are calculator estimates; a pilot must establish actual usage, instruction following and retained style under our guardrails before selecting either successor. [OpenAI image generation cost calculator](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency).

| Optional successor scenario, same review pipeline | 939 concepts, one pass | 1,059 concepts, one pass | 1,059 with 25% extra attempts and input cushion |
| --- | ---: | ---: | ---: |
| GPT Image 2.5 medium | $16.41 | $18.50 | $25.66 |
| GPT Image 2.5 high | $53.51 | $60.34 | $77.96 |

A rounded **$30 medium** or **$80 high** API planning budget covers those stated cushions if the successor pilot validates the estimates and prompts. It does not approve generation, guarantee every item passes review, or alter the existing guardrails. The next image step is to finish reuse/meaning/cue review, export the final exact word-and-sense batch, and choose the validated model and capped budget.

## Reproducibility

The offline helper is `data/media-audit/image-cost-audit.private.cjs`; its refreshed results and source hashes are in `data/media-audit/image-cost-audit.private.json`. It parses only selected pure prompt/review functions instead of importing the generator, captures the review request with a local mock, and calls the existing offline census without rewriting its main output. Public calculator screenshots are saved in `data/media-audit/openai-image-pricing-medium-20261006.png` and `openai-image-pricing-high-20261006.png`. The temporary public documentation tab was closed after the lookup; no account was opened.
