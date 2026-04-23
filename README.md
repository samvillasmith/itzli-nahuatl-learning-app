# Itzli — Eastern Huasteca Nahuatl Learning App

A structured, linguistically rigorous language learning app for **Eastern Huasteca Nahuatl** (EHN, ISO 639-3: `nhe`) — a living Uto-Aztecan language spoken by approximately 200,000 people in the Huasteca region of Veracruz, Hidalgo, and San Luis Potosí, Mexico.

This is not a Classical Nahuatl app. EHN is a distinct, modern, spoken language with its own orthography, grammar, and vocabulary — and until now, almost no digital learning infrastructure.

> **Work in progress** — Audio pronunciations are machine-generated and have known limitations (see [Audio disclaimer](#audio-disclaimer) below). Not all vocabulary words have images yet. More features are coming.

---

## Why This Exists

The Mexica and the broader Nahua peoples have endured centuries of colonization, forced assimilation, and cultural erasure. The Spanish conquest didn't just topple an empire — it systematically dismantled the languages, writing systems, calendars, and oral traditions that held Nahua civilization together. Generations of indigenous Mexicans were made to feel ashamed of their mother tongue. Many stopped speaking it. Many more never had the chance to learn it.

Nahuatl was once the *lingua franca* of Mesoamerica — spoken from the Valley of Mexico to Nicaragua, the language of diplomats, poets, healers, and astronomers. It gave the world words like *chocolate*, *tomato*, *avocado*, *chili*, and *coyote*. And yet today, most people with Nahua ancestry have no way to access it.

**Itzli is an attempt to change that.**

This project was created by **Sam Villa-Smith, PhD**, a person of indigenous Mexican ancestry, for whom this is not an academic exercise but a personal act of cultural recovery. The goal is straightforward: make Nahuatl learnable — really learnable, with the same structured scaffolding and digital infrastructure that exists for French, Spanish, or Mandarin. To make it a global language again. To give people like Sam — and the millions of others in the Mexican diaspora who feel the pull of something they were never given — a way back in.

Language revitalization is one of the most powerful forms of resistance. When a language lives, a people's way of seeing the world lives with it. This app is a small part of that work.

---

## What's Inside

**43 units covering A1–B1**, organized around communicative goals:

| Band | Units | Focus |
|------|-------|-------|
| A1 | 1–15 | Greetings, family, numbers, food, daily life |
| A2 | 16–30 | Home, community, nature, time, health |
| B1 | 31–43 | Abstract concepts, narratives, cultural topics |

- **703 vocabulary words** — audited against IDIEZ, Karttunen, and attested EHN texts
- **113 AI-assisted dialogues** — generated for units without attested dialogue data, marked `AI_generated`
- **Grammar sections** with fill-in-the-blank exercises drawn from `primer_constructions`
- **Synthesized audio** for all vocabulary and dialogue lines (see [Audio disclaimer](#audio-disclaimer))
- **Progress tracking** via localStorage — completions, accuracy, streaks
- **Vocabulary search** across a 37,000-entry EHN lexicon

---

## Lesson Flow

Each unit is a state machine that walks learners through spaced, contextualized practice:

```
Intro → Learn words → Quiz (EHN → EN) → Quiz (EN → EHN)
      → Fill-in-the-blank → Dialogue → Chunk complete
      → (repeat for next chunk of 10 words)
```

Dialogue lines use morphological matching to highlight vocabulary in context. Every gloss in the UI is passed through `displayGloss()` to strip audit annotations before display.

---

## Linguistic Accuracy

Vocabulary was systematically audited against:
- **IDIEZ** (Instituto de Docencia e Investigación Etnológica de Zacatecas) — primary reference
- **Karttunen's Analytical Dictionary of Nahuatl**
- Attested EHN texts and field recordings

28 entries were corrected for outright errors (wrong definitions, misidentified words). Another 22 were corrected for significant issues. Annotations are preserved in the database for transparency.

Notable corrections: `quema` ("yes", not "when?"), `yankuik` ("new", not "bad"), `acalli` ("canoe", not "stilt house"), `huica` ("to carry", not "to sing").

---

## Audio Disclaimer

Audio pronunciations are machine-generated using two models:

1. **[facebook/mms-tts-nhe](https://huggingface.co/facebook/mms-tts-nhe)** — Meta's Massively Multilingual Speech TTS, the only publicly available model trained directly on EHN speech (native Chicontepec, Veracruz recordings). Used for local generation.

2. **[Kokoro TTS](https://huggingface.co/hexgrad/Kokoro-82M)** with Spanish phoneme approximation — used for higher-quality synthesis on Colab GPUs, since EHN shares a 5-vowel system and similar consonant inventory with Spanish.

### Known pronunciation issues

Machine synthesis has real limitations for EHN, and learners should be aware of them:

- **"ll"** — In EHN, *ll* is pronounced as a true double-L (e.g., *tlahtoa* is not like Spanish *ll*). However, the Spanish-based phonemizer renders it as /j/ (the "y" sound in *yo*), following Spanish convention. This is **incorrect for Nahuatl** and a known limitation of the current synthesis pipeline.
- **Phoneme dropping** — The MMS model was trained on connected speech (Bible recordings). Isolated words occasionally suffer dropped or blurred phonemes (e.g., *intla*, *nelia*).
- **Macron vowels** — Long vowels (ā, ē, ī, ō, ū) are stripped before synthesis; vowel length distinctions are not preserved in the audio.
- **Saltillo (glottal stop)** — The glottal stop marker (ʼ or h in some EHN orthographies) may not be consistently rendered.

These are the best machine approximations currently possible without a large corpus of studio-recorded EHN audio. Native speaker audio contributions are a long-term goal of this project.

---

## Tech Stack

- **Next.js 16** with App Router and full static generation (`generateStaticParams`)
- **React 19** — server components by default
- **Tailwind CSS v4** — CSS variable-based theming, no config file
- **better-sqlite3** — synchronous SQLite, all data fetched at build time
- **TypeScript 5** — strict throughout
- **OpenAI `gpt-4o-mini`** — drives the Nahuatl tutor (`/tutor`)
- **Clerk** — authentication (middleware-gated)
- **Neon Postgres** — cloud progress sync and chat audit log
- No external state management — `useState`/`useEffect` + `localStorage`

---

## AI Tutor Guardrails

The `/tutor` route exposes an LLM to signed-in users. Because that's a real abuse and cost surface, every request to `/api/chat` goes through a layered defense. Each layer is independently useful — no single layer is load-bearing, and transparency about the architecture (this section) is treated as compatible with security, per Kerckhoffs's principle.

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

Flagged events at any layer write a row to `chat_audit` in Neon — **sha256 of the content, never the content itself** — so recurring attack patterns and repeat offenders surface without retaining user text.

### What each layer does

| Layer | Defends against | Failure mode |
|---|---|---|
| Clerk auth (middleware) | Anonymous abuse, cost scraping | 401 before the route even runs |
| Payload validation | Malformed requests, oversize inputs | 400 / 413 |
| Rate limit (sliding window, per-user) | Brute-force probing, bill explosions | 429 with `Retry-After` |
| Prompt-injection heuristics | Known jailbreak templates, instruction overrides, fake system tokens, "reveal your prompt", DAN/STAN/DevMode personas | Canned refusal |
| Input moderation | Sexual/minors, harassment/threatening, hate/threatening, self-harm, violence, illicit | Canned refusal, **fails closed** if the moderation API is unreachable |
| Hardened system prompt | Off-topic drift, role hijack, prompt leakage | Model-level refusal |
| `<user_input>` spotlighting | Instruction-in-data attacks | Structural separation: user content framed as data inside a tag |
| Output moderation | Jailbreaks that slipped past earlier layers | Response replaced with refusal before any bytes reach the client |
| Audit log | Invisible abuse, pattern recurrence | Hashed events in Neon, fire-and-forget |

### Design decisions and tradeoffs

- **Buffer-then-stream, not token-by-token streaming.** The chat route deliberately disables OpenAI streaming and moderates the full response before releasing it to the client. This costs ~3–8s of perceived latency on a 800-token reply, but it's the only way to guarantee nothing harmful reaches the browser. The existing loading UX (bouncing dots) covers the wait.
- **Fail closed on moderation errors.** If the moderation API is unreachable, the wrapper treats the request as flagged rather than letting unmoderated text through. Availability of the tutor is less important than safety.
- **Rate limits are in-process memory.** A sliding-window limiter per Clerk `userId` (20/10min burst + 100/hour ceiling). Good enough for a single-instance deploy; swap to Upstash/Redis when horizontal scaling matters.
- **Canned refusal, never a reason.** Blocked responses return a single fixed sentence regardless of which layer tripped, so attackers can't binary-search their way to a bypass by observing differential error text.
- **Env-var tuning for the parts that benefit from obscurity.** The exact refusal wording (`GUARDRAIL_REFUSAL_TEXT`) and any deploy-specific extra hard-block patterns (`GUARDRAIL_EXTRA_PATTERNS`, a JSON array) are loaded from environment at startup, so the public source shows the architecture without handing attackers a literal cheat sheet. See `.env.example`.
- **No PII in audit rows.** Rows store `(user_id, kind, categories, sha256, meta, timestamp)` — enough to detect patterns and repeat offenders, nothing reconstructable back to the user's actual message.

### Files

```
src/app/api/chat/route.ts    orchestrator; implements the pipeline above
src/lib/rate-limit.ts        per-user sliding window
src/lib/moderation.ts        OpenAI moderation wrapper, fails closed
src/lib/prompt-injection.ts  public heuristics + env-loaded private patterns
src/lib/audit.ts             sha256-hashed event logger (write-only)
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

- Node.js 18+
- The SQLite database is auto-downloaded from S3 at `npm run dev` / `npm run build` via `scripts/fetch-db.js`

### Run

```bash
npm install
npm run dev       # development at localhost:3000 (downloads DB automatically)
npm run build     # static build
npm start         # serve built output
```

### Audio

Audio files are served from S3 and do not need to be generated locally. If you want to regenerate them:

```bash
pip install -r scripts/requirements-audio.txt
python scripts/generate-audio.py   # local CPU, MMS-NHE model
```

For higher-quality audio generation using Kokoro TTS on a free Colab GPU, see `scripts/colab_xtts.py`.

---

## Repository Structure

```
src/
├── app/
│   ├── units/[unitId]/      Lesson flow (LessonFlow.tsx)
│   ├── practice/[unitId]/   Flashcard vocabulary review
│   ├── grammar/[topic]/     Grammar reference with examples
│   ├── progress/            Full progress dashboard
│   └── vocabulary/          Full lexicon search
├── lib/
│   ├── db.ts                All SQLite queries and types
│   ├── audio.ts             Audio URL helpers (S3-backed)
│   ├── gloss.ts             displayGloss() — strips audit annotations
│   └── progress.ts          localStorage progress tracking
scripts/
├── generate-audio.py        MMS-NHE audio generation (local CPU)
├── colab_xtts.py            Kokoro TTS audio generation (Colab GPU)
├── fetch-db.js              Auto-downloads SQLite DB from S3
└── fetch-images.js          Pexels image metadata fetcher
```

---

## Acknowledgments

- **IDIEZ** — Instituto de Docencia e Investigación Etnológica de Zacatecas, for their foundational EHN reference materials
- **Meta AI / MMS Project** — for `facebook/mms-tts-nhe`, the only open TTS model trained on EHN speech
- **hexgrad / Kokoro** — for the open-source neural TTS model used in high-quality audio generation
- **Pexels** — for the image API used to illustrate vocabulary (photos served from Pexels CDN with required attribution)
- The speakers and communities of the Huasteca region whose language this is, and who have kept it alive

---

## What's Next

- User authentication and cloud progress sync
- Spaced repetition (Leitner-style quiz scheduling)
- Native speaker audio contributions
- Images for remaining vocabulary words
- Dialogue audio and content for units 33–43
- Progress indicators on the home page

---

*Itzli (obsidian) — sharp, clear, enduring.*
