# Voice and Audio Generation

This app serves learner audio from a static audio prefix. In normal use,
`src/lib/audio.ts` points to the checked-in Google audio directory first:

```ts
/audio-google
```

If a local file is missing, playback falls back to the S3-backed legacy prefix:

```ts
https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app
```

Vocabulary clips are expected at `vocab/{lesson_vocab.id}.wav`, and dialogue
clips are expected at `dialogue/{lesson_dialogue_id}.wav`.

## Production Voice

The active voice set uses Google's neutral `es-US` Spanish voice with explicit
Eastern Huasteca Nahuatl phoneme instructions. The generator emits X-SAMPA in
SSML instead of sending untreated Nahuatl-looking text to a Spanish normalizer.
This protects initial consonants, pure vowels, `x = sh`, crisp `tl/tz/ch`,
`kw/w`, and glottal `h`.

The production generator is:

```text
scripts/generate-google-audio.js
```

Exact learner-form corrections and curated dialogue lines live in:

```text
src/data/reviewed-audio.json
```

## How We Generate Clips

Preview the transformed pronunciation before making an API request:

```powershell
npm run audio:google:test
```

Generate only the reviewed correction set:

```powershell
CONFIRM_TTS_SPEND=YES node scripts/generate-google-audio.js --reviewed --execute --force
```

The generator writes:

```text
public/audio-google/vocab/{id}.wav
public/audio-google/dialogue/{lesson_dialogue_id}.wav
```

Existing WAV files are skipped unless `--force` is used.

## Local Playback

The app defaults to `/audio-google` and falls back to the S3 voice prefix when
a local static file is unavailable.

## Coverage

The checked-in Spanish-voice set contains:

```text
2,043 vocabulary WAVs
372 dialogue WAVs
2,415 total files
about 169 MB
```

The course audit verifies every visible vocabulary card and dialogue line has a
matching WAV, including curated dialogue IDs.

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

## Authentication

The Google generator uses a local service-account JSON from `secrets/` or
`GOOGLE_APPLICATION_CREDENTIALS`. The `secrets/` folder must stay uncommitted.

```powershell
npm run audio:google:test
$env:CONFIRM_TTS_SPEND='YES'; npm run audio:google:test -- --execute --force
```

It writes to `public/audio-google` by default. The app uses that directory by
default. To override locally, set:

```env
NEXT_PUBLIC_AUDIO_BASE_URL=/audio-google
NEXT_PUBLIC_AUDIO_FALLBACK_BASE_URL=https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app
```

With that setup, the app tries local Google files first and falls back to the
S3-backed production voice set when a Google file has not been generated yet.

## Comparison Pipelines

`scripts/generate-audio.py` can generate `facebook/mms-tts-nhe` comparison
clips. It is not the active voice selected for the app.

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
