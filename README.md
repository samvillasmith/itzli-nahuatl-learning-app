# Itzli — Eastern Huasteca Nahuatl Learning App

A structured, linguistically rigorous language learning app for **Eastern Huasteca Nahuatl** (EHN, ISO 639-3: `nhe`) — a living Uto-Aztecan language spoken by approximately 200,000 people in the Huasteca region of Veracruz, Hidalgo, and San Luis Potosí, Mexico.

This is not a Classical Nahuatl app. EHN is a distinct, modern, spoken language with its own orthography, grammar, and vocabulary — and until now, almost no digital learning infrastructure.

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
- **Synthesized audio** for all vocabulary and dialogue lines using [facebook/mms-tts-nhe](https://huggingface.co/facebook/mms-tts-nhe) — the only publicly available TTS model trained on EHN speech (Meta Massively Multilingual Speech project, trained on native Chicontepec, Veracruz recordings)
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

## Tech Stack

- **Next.js 16** with App Router and full static generation (`generateStaticParams`)
- **React 19** — server components by default
- **Tailwind CSS v4** — CSS variable-based theming, no config file
- **better-sqlite3** — synchronous SQLite, all data fetched at build time
- **TypeScript 5** — strict throughout
- No external state management — `useState`/`useEffect` + `localStorage`

---

## Getting Started

### Prerequisites

- Node.js 18+
- The SQLite database at `../molina/curriculum/fcn_master_lexicon_phase8_6_primer.sqlite` (or set `DATABASE_PATH` env var to your path)

### Run

```bash
npm install
npm run dev       # development at localhost:3000
npm run build     # static build (DB must be accessible)
npm start         # serve built output
```

### Audio

Audio files are not committed to the repository (54+ MB). To generate them:

```bash
pip install -r scripts/requirements-audio.txt
python scripts/generate-audio.py
```

This uses `facebook/mms-tts-nhe` to synthesize all vocabulary and dialogue audio into `public/audio/vocab/` and `public/audio/dialogue/`. The script is resumable — existing files are skipped.

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
│   ├── gloss.ts             displayGloss() — strips audit annotations
│   └── progress.ts          localStorage progress tracking
scripts/
├── generate-audio.py        MMS-NHE audio generation (local CPU)
└── colab_xtts.py            Kokoro TTS audio generation (Colab GPU)
```

---

## Acknowledgments

- **IDIEZ** — Instituto de Docencia e Investigación Etnológica de Zacatecas, for their foundational EHN reference materials
- **Meta AI / MMS Project** — for `facebook/mms-tts-nhe`, the only open TTS model trained on EHN speech
- **hexgrad / Kokoro** — for the open-source neural TTS model used in high-quality audio generation
- The speakers and communities of the Huasteca region whose language this is

---

## What's Next

- User authentication and cloud progress sync
- Spaced repetition (Leitner-style quiz scheduling)
- Progress indicators on the home page
- Dialogue audio for units 33–43 (currently no dialogue data)
- Native speaker audio contributions

---

*Itzli (obsidian) — sharp, clear, enduring.*
