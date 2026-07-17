# Itzli — Eastern Huasteca Nahuatl Learning App

A structured, linguistically rigorous language learning app for **Eastern Huasteca Nahuatl** (EHN, ISO 639-3: `nhe`) — a living Uto-Aztecan language spoken by approximately 200,000 people in the Huasteca region of Veracruz, Hidalgo, and San Luis Potosí, Mexico.

This is not a Classical Nahuatl app. EHN is a distinct, modern, spoken language with its own orthography, grammar, and vocabulary — and until now, almost no digital learning infrastructure.

> **Version 2.0** — Vocabulary is restricted to reviewed course material, audio pronunciations are machine-generated or linked to credited source-course recordings where available, and generated visual assets remain quarantined until human approval.

---

## Why This Exists

The Mexica and the broader Nahua peoples have endured centuries of colonization, forced assimilation, and cultural erasure. The Spanish conquest didn't just topple an empire — it systematically dismantled the languages, writing systems, calendars, and oral traditions that held Nahua civilization together. Generations of indigenous Mexicans were made to feel ashamed of their mother tongue. Many stopped speaking it. Many more never had the chance to learn it.

Nahuatl was once the *lingua franca* of Mesoamerica — spoken from the Valley of Mexico to Nicaragua, the language of diplomats, poets, healers, and astronomers. It gave the world words like *chocolate*, *tomato*, *avocado*, *chili*, and *coyote*. And yet today, most people with Nahua ancestry have no way to access it.

**Itzli is an attempt to change that.**

This project was created by **Sam Villa-Smith, PhD**, a person of indigenous Mexican ancestry, for whom this is not an academic exercise but a personal act of cultural recovery. The goal is straightforward: make Nahuatl learnable — really learnable, with the same structured scaffolding and digital infrastructure that exists for French, Spanish, or Mandarin. To make it a global language again. To give people like Sam — and the millions of others in the Mexican diaspora who feel the pull of something they were never given — a way back in.

Language revitalization is one of the most powerful forms of resistance. When a language lives, a people's way of seeing the world lives with it. This app is a small part of that work.

---

## What's Inside

**43 units from A1 foundations through A2, with B1-oriented extension modules**, organized around communicative goals:

| Stage | Units | New reviewed cards | Focus |
|-------|------:|-------------------:|-------|
| A1 | 16 | 181 | Greetings, identity, family, numbers, food, daily life |
| A2 | 18 | 146 | Description, narration, home, market, community, nature, health |
| B1-oriented | 9 | 54 | Advanced narration, conditionals, object marking, modifiers |

- **381 reviewed lesson cards after source filtering and variant collapse**, plus 63 grammar-derived focus cards
- **32 imported Nāhuatlahtolli source lessons** from COERLL under CC BY-SA,
  with source URLs, attribution, text sections, media links, and audio-backed
  vocabulary preserved in `src/data/nahuatlahtolli-course.json`
- **113 AI-assisted dialogues** — generated for units without attested dialogue data, marked `AI_generated`
- **Grammar sections** with fill-in-the-blank exercises drawn from `primer_constructions`
- **Language-specific machine audio** for vocabulary and dialogue lines (see [Audio generation](#audio-generation))
- **Progress tracking** via a local browser mirror and signed-in Neon cloud sync
- **Vocabulary search** restricted to the reviewed Eastern Huasteca course inventory

CEFR labels describe the orientation of the material, not a certification or guaranteed exit level. Completion of the app alone should be understood as an upper-A1 to emerging-A2 foundation; the final nine modules introduce B1-oriented grammar and narrative work without claiming that learners attain B1 proficiency.

---

## Lesson Flow

Each unit is a state machine that walks learners through spaced, contextualized practice:

```
Intro → Learn single words → Quiz (EHN → EN) → Quiz (EN → EHN)
      → Learn short forms and phrases → Grammar practice
      → short, vocabulary-gated dialogue → Chunk complete
```

Dialogue lines are capped by level and require at least 60% coverage from words already introduced in the unit. Every gloss in the UI is passed through `displayGloss()` to strip audit annotations before display.

---

## Linguistic Accuracy

Vocabulary was systematically audited against:
- **IDIEZ** (Instituto de Docencia e Investigación Etnológica de Zacatecas) — primary reference
- **Karttunen's Analytical Dictionary of Nahuatl**
- Attested EHN texts and field recordings

28 entries were corrected for outright errors (wrong definitions, misidentified words). Another 22 were corrected for significant issues. Annotations are preserved in the database for transparency.

Notable corrections: `quema` ("yes", not "when?"), `yankuik` ("new", not "bad"), `acalli` ("canoe", not "stilt house"), `huica` ("to carry", not "to sing").

---

## Audio Generation

Audio pronunciations are machine-generated with a neutral `es-US` Spanish voice
and explicit Eastern Huasteca Nahuatl pronunciation instructions. The Google
pipeline emits X-SAMPA phoneme tags so initial consonants are retained, vowels
stay pure, `x` is pronounced `sh`, and `tl`, `tz`, `ch`, `kw`, and glottal `h`
are not left to a Spanish text normalizer to guess.

The full voice pipeline is documented in [`docs/voices.md`](docs/voices.md).

Recommended workflow:

1. Preview the exact text, pronunciation cue, X-SAMPA, and SSML before synthesis.
2. Listen for initial consonants, short vowels, `ll`, `x`, `tl`, `tz`, and glottal `h`.
3. Put corrected learner forms and curated dialogue lines in
   `src/data/reviewed-audio.json`.
4. Regenerate only that reviewed set and verify every visible card resolves to a WAV.

```bash
npm run audio:google:test
CONFIRM_TTS_SPEND=YES node scripts/generate-google-audio.js --reviewed --execute --force
```

`scripts/generate-audio.py` remains available for MMS comparison clips.
`scripts/generate-openai-audio.js` and `scripts/colab_xtts.py` remain comparison
tools, not the active production voice path.

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
- The SQLite database is auto-downloaded from S3 at `npm run dev` / `npm run build` via `scripts/fetch-db.js`

### Run

```bash
npm install
npm run dev       # development at localhost:3000 (downloads DB automatically)
npm run build     # static build
npm start         # serve built output
npm run verify    # typecheck, lint, tests, and content/course audits
```

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
├── generate-audio.py        MMS-NHE comparison generation
├── generate-openai-audio.js Experimental prompt-controlled OpenAI TTS
├── colab_xtts.py            Deprecated Kokoro Spanish-phonemizer script
├── fetch-db.js              Auto-downloads SQLite DB from S3
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
