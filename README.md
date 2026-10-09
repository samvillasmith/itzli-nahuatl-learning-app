# Itzli — Eastern Huasteca Nahuatl Learning App

A structured learning app for **Eastern Huasteca Nahuatl** (EHN, ISO 639-3:
`nhe`), anchored in the living Nahuatl variety taught by the native-authored
Chicontepec, Veracruz source course. Regional speech is not interchangeable
solely because it shares a Huasteca label.

**INALI's published Nahuatl alphabet governs the teaching orthography** across
lessons, conversations, sentence building, review, listening, and offline
practice. The teaching goal is contemporary EHN communication, with regional
source evidence for vocabulary and grammar. Original source spellings remain
in labeled references and audio metadata.

> **Version 3.0 local review** — A daily learning hub, scheduled skill review,
> six guided conversations, seven sentence patterns, a personal expression
> notebook, source listening, private record-and-compare practice, and offline
> text/audio packs. The existing 43-unit path and learner identities are preserved.

The October 2026 audit and **Version 3.0** conversation system are
documented in [the accuracy report](docs/curriculum-audit.md) and
[the development plan](docs/version-3-plan.md). Production has not been updated;
linguistic and audio limitations remain explicit.

---

## Why This Exists

The Mexica and the broader Nahua peoples have endured centuries of colonization, forced assimilation, and cultural erasure. The Spanish conquest didn't just topple an empire — it systematically dismantled the languages, writing systems, calendars, and oral traditions that held Nahua civilization together. Generations of indigenous Mexicans were made to feel ashamed of their mother tongue. Many stopped speaking it. Many more never had the chance to learn it.

Nahuatl was once the *lingua franca* of Mesoamerica — spoken from the Valley of Mexico to Nicaragua, the language of diplomats, poets, healers, and astronomers. It gave the world words like *chocolate*, *tomato*, *avocado*, *chili*, and *coyote*. And yet today, most people with Nahua ancestry have no way to access it.

**Itzli is an attempt to change that.**

This project was created by **Sam Villa-Smith, PhD**, a person of indigenous Mexican ancestry, for whom this is not an academic exercise but a personal act of cultural recovery. The goal is straightforward: make Nahuatl learnable — really learnable, with the same structured scaffolding and digital infrastructure that exists for French, Spanish, or Mandarin. To make it a global language again. To give people like Sam — and the millions of others in the Mexican diaspora who feel the pull of something they were never given — a way back in.

Language revitalization is one of the most powerful forms of resistance. When a language lives, a people's way of seeing the world lives with it. This app is a small part of that work.

---

## What's Inside

**Version 3.0 currently includes 324 guided lessons and 1,724 distinct words and written forms, covering 1,806 meaning entries.** These October 9, 2026 learner totals exclude the removed content. Repeated placements and multiple meanings of the same written form do not increase the advertised word count.

The **original 43 units from A1 foundations through A2, with B1-oriented extension modules** form the course foundation, organized around communicative goals:

| Stage | Units | Focus |
|-------|------:|-------|
| A1 | 16 | Greetings, identity, family, numbers, food, daily life |
| A2 | 18 | Description, narration, home, market, community, nature, health |
| B1-oriented | 9 | Advanced narration, conditionals, object marking, modifiers |

- The original foundation inventory contains **460 distinct stored-spelling vocabulary cards**, represented by **473 learner-visible placements**, plus 63 grammar focus forms. These baseline totals include sounds and grammatical forms; they are not the current V3 course total or a count of distinct lexical lemmas.
- **5–15 standalone cards per guided unit**, with oversized source lists reassigned or trimmed so required vocabulary matches the unit topic
- **75 curated word-first cards** ensure months, animals, description, food, household tools, nature, community, visiting, and action units teach standalone vocabulary before sentence practice
- **77 learner-visible source-course additions**, selected from **240 source-course candidates**, with original COERLL audio, practical display spelling, source provenance, Spanish glosses, and image references
- **32 imported Nāhuatlahtolli source lessons** from COERLL under CC BY-SA,
  with source URLs, attribution, text sections, media links, and audio-backed
  vocabulary preserved in `src/data/nahuatlahtolli-course.json`
- **176 visible dialogue lines**, including 157 AI-assisted lines and 19 source or curated lines. Thirty-eight synthetic lines received source-based text corrections; remaining authored lines need further review.
- **Grammar sections** with fill-in-the-blank exercises drawn from `primer_constructions`
- **Mixed source recordings and synthetic audio**, with six vocabulary/44 dialogue playback gaps and all 54 legacy file holds preserved (see [Audio generation](#audio-generation) and the [current media audit](docs/media-integrity-audit.md))
- **Progress tracking** via a local browser mirror and signed-in Neon cloud sync,
  including V3 lesson completions, vocabulary practice, vocabulary bookmarks and
  vocabulary notes. Existing course IDs and earned progress are preserved.
- **73 additional source-attested forms** in six separate bilingual packs, with
  source spelling, stable lemma/sense/form identities, provenance, reuse notices,
  and original vocabulary recording links. None reorder the existing units.
- **Six source-based conversation scenarios with 26 turns**, including repetition,
  branching replies, written recall, speaking practice, explanatory support,
  and account-scoped device-local resume checkpoints.
- **Seven sentence patterns**, with bounded proper-name/place substitutions and
  a device-local exportable expression notebook. Personal substitutions have no
  fabricated recording or unrestricted conjugation engine.
- **Scheduled recognition, listening, production, and self-reported oral practice**
  with per-device counters, account-scoped storage, retryable cloud merges, and
  completion preservation. Local review never requests a production progress write.
- **Offline practice** with source attribution, optional original audio downloads,
  recognition and written recall, and dated, duplicate-safe deferred practice
  import; personal API responses and pages are never cached.
- **Vocabulary search** restricted to the selected learner course inventory

CEFR labels describe the orientation of the material, not a certification or guaranteed exit level. Completion of the app alone should be understood as an upper-A1 to emerging-A2 foundation; the final nine modules introduce B1-oriented grammar and narrative work without claiming that learners attain B1 proficiency.

The V3 path adds per-lesson communication goals mapped to the Council of Europe's
[CEFR Companion volume (2020)](https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4).
The mapping names skill families and the actual practice available. Word-only
cohorts remain vocabulary foundations; partial contextual coverage is identified.
Sentence tiles and guided conversations rehearse communication without claiming
to assess unprompted speaking, listening comprehension or pronunciation.

The in-app **Sources and credits** page (`/source-course`) gathers the published
lexical, grammatical and cultural references and artwork notices. Itzli authors
the course path, bilingual teaching notes, scene arrangements and practice tasks;
licensed Nāhuatlahtolli material is also reused and adapted with credit and
changes identified. Yan García's *Learn Nahuatl, Second Edition* is acknowledged
as a reference and inspiration. Itzli develops its own explanations and learning
activities. Source-linked verification is specific
to the published form and sense, with unresolved claims held. See [NOTICE.md](NOTICE.md)
for the license distinction and bibliography.

---

## Lesson Flow

Each unit is a state machine that walks learners through contextualized practice:

```
Intro → Learn single words → Quiz (EHN → EN) → Quiz (EN → EHN)
      → Learn short forms and phrases → Grammar practice
      → short, vocabulary-gated dialogue → Chunk complete
```

Dialogue lines are capped by level and require at least 60% coverage from words already introduced in the unit. Every gloss in the UI is passed through `displayGloss()` to strip audit annotations before display.

The standalone review queue uses dated attempts and separate skill schedules.
Historical v2 accuracy is preserved without invented review dates. Speaking
practice is self-reported; the app does not certify pronunciation or fluency.

---

## Linguistic Accuracy

Writing follows [INALI's published Nahuatl alphabet](https://site.inali.gob.mx/INALIDhuchlab/assets/files/cartel_alfabeto_Nawatlatolli-espanol.pdf):
`a, ch, e, i, h, k, kw, l, m, n, o, p, s, t, tl, ts, w, x, y`.
Online and offline practice use one shared display converter. It preserves
double `ll` and personal names/places, while original transcriptions and
vowel-length information remain available as source evidence. The alphabet
poster does not establish every pronunciation rule or certify this app.

The October vocabulary and grammar review uses the native-authored COERLL
Chicontepec course and specific IDIEZ and scholarly references. Classical or other regional
attestation alone does not establish an EHN form. Corrections cover person
and possession markers, kinship, affectionate forms, past/directional grammar,
conditionals, vocabulary meanings, dialogues, and source exercises.

Unsupported grammar drafts and unresolved production forms are held. The
construction gate rejects unknown or changed source pairs. Source matches and
software checks do not certify every utterance or retained recording; see
[the audit report](docs/curriculum-audit.md) for exact scope and remaining work.

---

## Audio Generation

The course preserves original external-course recordings where matched and
uses the established Spanish Google voice with Nahuatl pronunciation exceptions
for synthetic audio. INALI governs displayed spelling; the separate spoken-input
recipe handles `x`, `hu`/`uh`, `ll`, `tl`, `ts/tz`, and the `kenihki` exception.
The default is `es-US-Standard-A` at rate 0.82. MMS diagnostic clips are no longer
shown in learner practice.

Regeneration uses a corrected exact-text manifest, keeps original source audio,
and writes separately versioned candidates. Existing playback files and audio
holds remain intact. The current coverage and recording workflow are documented in
[`docs/voices.md`](docs/voices.md) and [the version 3 plan](docs/version-3-plan.md).

---

## Tech Stack

- **Next.js 16** with App Router and pre-generated unit parameters
- **React 19** — server components by default
- **Tailwind CSS v4** — CSS variable-based theming, no config file
- **better-sqlite3** — synchronous SQLite, all data fetched at build time
- **TypeScript 5** — strict throughout
- **OpenAI SDK** — retained for an experimental TTS comparison path; the paid tutor is hard-disabled
- **Clerk** — authentication at both the Next.js proxy and protected resource boundaries
- **Neon Postgres** — cloud progress sync and chat audit log
- No external state management — `useState`/`useEffect` + `localStorage`

---

## Dormant AI Tutor Guardrails

The paid tutor is currently hard-disabled in code. Its navigation is hidden and `/api/chat` returns before authentication, moderation, retrieval, or any paid model call. The guardrail implementation remains in the repository for review and for any future, deliberate reactivation.

### Request pipeline

```
Clerk auth → payload validation → per-user rate limit
         → prompt-injection heuristics (local regex)
         → OpenAI input moderation (omni-moderation-latest)
         → hardened system prompt + <user_input> spotlight
         → OpenAI completion (non-streamed)
         → OpenAI output moderation
         → clean response released to client
```

Guardrail events write a row to `chat_audit` in Neon using a **secret-keyed HMAC-SHA-256 digest of the content, never the content itself**, so recurring attack patterns can surface without retaining user text or exposing short messages to dictionary lookup.

### What each layer does

| Layer | Defends against | Failure mode |
|---|---|---|
| Clerk auth (proxy + resource checks) | Anonymous abuse, cost scraping | Signed-out requests are blocked before protected work runs |
| Payload validation | Malformed requests, oversize inputs | 400 / 413 |
| Rate limit (shared fixed windows, per-user) | Brute-force probing, bill explosions | 429 with `Retry-After` |
| Prompt-injection heuristics | Known jailbreak templates, instruction overrides, fake system tokens, "reveal your prompt", DAN/STAN/DevMode personas | Canned refusal |
| Input moderation | Sexual/minors, harassment/threatening, hate/threatening, self-harm, violence, illicit | Canned refusal, **fails closed** if the moderation API is unreachable |
| Hardened system prompt | Off-topic drift, role hijack, prompt leakage | Model-level refusal |
| `<user_input>` spotlighting | Instruction-in-data attacks | Structural separation: user content framed as data inside a tag |
| Output moderation | Jailbreaks that slipped past earlier layers | Response replaced with refusal before any bytes reach the client |
| Audit log | Invisible abuse, pattern recurrence | Awaited, keyed-hash events in Neon |

### Design decisions and tradeoffs

- **Buffer-then-stream, not token-by-token streaming.** The chat route deliberately disables OpenAI streaming and moderates the full response before releasing it to the client. This costs ~3–8s of perceived latency on a 800-token reply, but it's the only way to guarantee nothing harmful reaches the browser. The existing loading UX (bouncing dots) covers the wait.
- **Fail closed on moderation errors.** If the moderation API is unreachable, the wrapper treats the request as flagged rather than letting unmoderated text through. Availability of the tutor is less important than safety.
- **Rate limits are shared in Neon.** Atomic fixed-window counters enforce 20 requests per 10 minutes and 100 per hour across serverless instances.
- **Canned refusal, never a reason.** Blocked responses return a single fixed sentence regardless of which layer tripped, so attackers can't binary-search their way to a bypass by observing differential error text.
- **Env-var tuning for the parts that benefit from obscurity.** The exact refusal wording (`GUARDRAIL_REFUSAL_TEXT`) and any deploy-specific extra hard-block patterns (`GUARDRAIL_EXTRA_PATTERNS`, a JSON array) are loaded from environment at startup, so the public source shows the architecture without handing attackers a literal cheat sheet. See `.env.example`.
- **No raw chat text in audit rows.** Rows store `(user_id, kind, categories, keyed_sha256, meta, timestamp)`. The pseudonymous Clerk user ID is still personal data and is removed by the verified account-deletion webhook.

### Files

```
src/app/api/chat/route.ts    orchestrator; implements the pipeline above
src/lib/rate-limit.ts        shared per-user Neon counters
src/lib/moderation.ts        OpenAI moderation wrapper, fails closed
src/lib/prompt-injection.ts  public heuristics + env-loaded private patterns
src/lib/audit.ts             secret-keyed HMAC-SHA-256 event logger
scripts/audit-setup.js       one-shot migration for the chat_audit Neon table
```

### Threat model — what this does NOT cover

Honest limits are part of the design:

- **Image-based CSAM / abuse vectors.** The tutor is text-only. Adding image upload would require a separate pipeline (PhotoDNA / Thorn / NCMEC reporting), not just another moderation call.
- **Sophisticated obfuscation.** Base64, homoglyph, and token-smuggled attacks that survive both the heuristic layer and OpenAI's moderation will reach the model. The hardened system prompt and output moderation are the backstop.
- **Distributed abuse across accounts.** Rate limits are per-user; a motivated attacker signing up many Clerk accounts isn't stopped by this layer. Clerk's own abuse controls (email verification, anomaly detection) handle that tier.
- **Model regressions.** If a future OpenAI model update weakens moderation or increases jailbreak susceptibility, the heuristic and audit layers provide detection but not full prevention.

---

## Getting Started

### Prerequisites

- Node.js 22+
- The checked course-only SQLite database and manifest are included locally.
  Startup/build hooks prepare or validate them offline; no database is downloaded.
  The full research database is private and excluded from release packaging.

### Run

```bash
npm install
npm run dev       # development at localhost:3000 (offline course preparation)
npm run dev:local # review at 127.0.0.1:3000, no login or live progress writes
npm run build     # optimized build
npm start         # serve built output
npm run review:local # open development review on 127.0.0.1:3000 without live progress writes
npm run verify    # typecheck, lint, tests, and content/course audits
npm run verify:v3 # same core verification, with image work deferred
npm run release:check # database identities, scope and public diagnostic-media guard
```

Local review uses a separate browser identity and never reads or writes the
production progress store. The October 4 verification passed 158 automated
application tests, 10 audio-generator tests, typecheck, lint, localization,
content and course audits, and the optimized build. English/Spanish browser
checks covered conversation completion and refresh/resume, personal sentence
recall, word packs, offline recognition/written recall and re-import, and mobile
layout. Source matching and technical audio checks do not certify pronunciation.

### Audio

Audio prefers the checked-in Spanish-voice set with Nahuatl X-SAMPA instructions and falls back to the S3 audio prefix. To preview the pronunciation transformation:

```bash
npm run audio:google:test
```

Avoid using `scripts/colab_xtts.py` for production because its Spanish phonemizer causes Nahuatl-specific pronunciation errors. Avoid using the OpenAI prompt-controlled generator for production unless a fresh sample proves it is better on the hard cases.

---

## Repository Structure

```
src/
├── app/
│   ├── units/[unitId]/      Lesson flow (LessonFlow.tsx)
│   ├── practice/[unitId]/   Flashcard vocabulary review
│   ├── grammar/[topic]/     Grammar reference with examples
│   ├── progress/            Full progress dashboard
│   └── vocabulary/          Reviewed course-vocabulary search
├── lib/
│   ├── db.ts                All SQLite queries and types
│   ├── audio.ts             Audio URL helpers (S3-backed)
│   ├── gloss.ts             displayGloss() — strips audit annotations
│   ├── progress.ts          local browser progress tracking
│   └── progress-schema.ts   validated cloud/local progress contract
scripts/
├── generate-google-audio.js Spanish voice + Nahuatl X-SAMPA production audio
├── generate-audio.py        Compatibility launcher for Google pronunciation audio
├── generate-openai-audio.js Experimental prompt-controlled OpenAI TTS
├── colab_xtts.py            Deprecated Kokoro Spanish-phonemizer script
├── fetch-db.js              Compatibility entry point for offline course preparation
├── prepare-course-release.cjs Course-only SQLite and progress-identity checks
├── prepare-release-media.cjs Reversible private diagnostic-media archive guard
└── fetch-images.js          Pexels image metadata fetcher
```

---

## Acknowledgments

- **IDIEZ** — Instituto de Docencia e Investigación Etnológica de Zacatecas, for their foundational EHN reference materials
- **Meta AI / MMS Project** — for `facebook/mms-tts-nhe`, the open TTS model trained on EHN speech
- **OpenAI** — for an experimental TTS comparison path; the paid tutor is currently disabled
- **hexgrad / Kokoro** — retained as a reference experiment, no longer recommended for production Nahuatl audio
- **Pexels, Wikimedia Commons, Flickr, Rawpixel, and StockSnap** — for legacy vocabulary images; required credit is shown with the card
- **COERLL / The University of Texas at Austin** — for publishing the open
  Nāhuatlahtolli course by Sabina de la Cruz, Catalina de la Cruz, Josefrayn
  Sánchez-Perry, Kelly McDonough, and Sergio Romero under CC BY-SA
- The speakers and communities of the Huasteca region whose language this is, and who have kept it alive

---

## Ongoing Work

- Community review and replacement of machine-generated pronunciation
- Human review of remaining safe image candidates
- Continued conversational EHN curriculum review with transparent source notes
- Expansion toward a genuinely assessed B1 outcome with broader vocabulary, native-speaker listening, connected production, and calibrated exit tasks

---

*Itzli (obsidian) — sharp, clear, enduring.*
