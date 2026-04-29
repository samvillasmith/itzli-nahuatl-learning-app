# Voice and Audio Generation

This app serves learner audio from a static audio prefix. In normal use,
`src/lib/audio.ts` points to the S3-backed production prefix:

```ts
https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app
```

Vocabulary clips are expected at `vocab/{lesson_vocab.id}.wav`, and dialogue
clips are expected at `dialogue/{lesson_dialogue_id}.wav`.

## Source Model

The Nahuatl-specific generation path is `facebook/mms-tts-nhe`, Meta's public
MMS TTS checkpoint for Eastern Huasteca Nahuatl (`nhe`). It is the preferred
source in this repo because it is language-specific. General Spanish or English
TTS can sound smoother, but in testing it produced worse Nahuatl phonology:
`ll` drifted toward Spanish `y`, short `a` picked up off-glides, and words like
`chilli` were read as if they were Spanish or English-looking text.

The current generator is:

```text
scripts/generate-audio.py
```

The npm wrapper is:

```text
scripts/run-audio-python.js
```

## How We Generate Clips

Install the audio dependencies into a local Python environment:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --no-cache-dir -r scripts\requirements-audio.txt
```

Generate a small listening set first:

```powershell
npm run audio:mms:test
```

The default hard-case test words are `na`, `ta`, `calli`, `chilli`, `tlahtoa`,
`xochitl`, and `quema`. These catch the most obvious regressions before a full
run.

Generate all missing vocabulary and dialogue files:

```powershell
npm run audio:mms:generate
```

The generator reads `lesson_vocab` and `lesson_dialogues` from the curriculum
SQLite database and writes:

```text
public/audio/vocab/{id}.wav
public/audio/dialogue/{lesson_dialogue_id}.wav
```

The script is resumable. Existing WAV files are skipped unless `--regen` is
used.

## Local Playback

The app defaults to S3. To test freshly generated local files, create
`.env.local` with:

```env
NEXT_PUBLIC_AUDIO_BASE_URL=/audio
```

Then restart the dev server. Remove that override to return playback to the S3
voice set.

## Recent MMS Test Run

A full local MMS run generated:

```text
2,043 vocabulary WAVs
372 dialogue WAVs
2,415 total files
about 87 MB
```

That local run was useful for testing `facebook/mms-tts-nhe`, but it is not the
active voice set unless `NEXT_PUBLIC_AUDIO_BASE_URL=/audio` is present and the
files exist under `public/audio`.

## Production Publish Path

After listening and rejecting bad clips, upload the selected WAV files to:

```text
s3://nahuatl-language/itzli-app/vocab/
s3://nahuatl-language/itzli-app/dialogue/
```

The public URLs must keep the same shape consumed by `src/lib/audio.ts`:

```text
https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/vocab/{id}.wav
https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/dialogue/{id}.wav
```

## Experiments We Do Not Use For Production

`scripts/generate-openai-audio.js` is kept only as an experiment for comparing
prompt-controlled TTS. It is not the production source because it did not hold
Nahuatl pronunciation reliably enough.

`scripts/colab_xtts.py` is deprecated for production. It uses a Spanish
phonemizer, which causes Nahuatl-specific pronunciation errors.

## Notes

- This is for a free learning app.
- Do not assume smoother is better. Prioritize Eastern Huasteca Nahuatl
  phonology over studio-polished voice quality.
- Do not commit a full `public/audio` generation run unless repo size and
  hosting strategy have been checked first.
