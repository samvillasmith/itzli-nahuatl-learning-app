#!/usr/bin/env node
"use strict";

/**
 * EXPERIMENTAL: prompt-controlled machine audio generator for Eastern Huasteca Nahuatl.
 *
 * This is not recommended as the production source for Nahuatl audio. General TTS
 * models can ignore phonology cues and fall back to Spanish/English habits.
 * Prefer scripts/generate-audio.py with facebook/mms-tts-nhe for production.
 */

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");
const {
  buildTtsInput,
  buildTtsInstructions,
  cueForText,
  normalizeNahuatlText,
} = require("./lib/nahuatl-pronunciation");

const DEFAULTS = {
  model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
  voice: process.env.OPENAI_TTS_VOICE || "marin",
  format: process.env.OPENAI_TTS_FORMAT || "wav",
  speed: Number(process.env.OPENAI_TTS_SPEED || "0.86"),
  outDir: process.env.AUDIO_OUT_DIR || path.resolve(__dirname, "..", "public", "audio"),
  inputMode: process.env.NAHUATL_TTS_INPUT_MODE || "orthography",
  concurrency: Number(process.env.TTS_CONCURRENCY || "2"),
};

function parseArgs(argv) {
  const args = {
    execute: false,
    force: false,
    kind: "all",
    limit: 0,
    ids: new Set(),
    test: [],
    ...DEFAULTS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];

    if (arg === "--execute") args.execute = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--dry-run") args.execute = false;
    else if (arg === "--kind") {
      args.kind = value;
      i += 1;
    } else if (arg === "--limit") {
      args.limit = Number(value);
      i += 1;
    } else if (arg === "--ids") {
      for (const id of String(value || "").split(",")) {
        if (id.trim()) args.ids.add(id.trim());
      }
      i += 1;
    } else if (arg === "--model") {
      args.model = value;
      i += 1;
    } else if (arg === "--voice") {
      args.voice = value;
      i += 1;
    } else if (arg === "--format") {
      args.format = value;
      i += 1;
    } else if (arg === "--speed") {
      args.speed = Number(value);
      i += 1;
    } else if (arg === "--out") {
      args.outDir = path.resolve(value);
      i += 1;
    } else if (arg === "--input-mode") {
      args.inputMode = value;
      i += 1;
    } else if (arg === "--concurrency") {
      args.concurrency = Number(value);
      i += 1;
    } else if (arg === "--test") {
      args.test = argv.slice(i + 1);
      break;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (!["all", "vocab", "dialogue"].includes(args.kind)) {
    console.error("--kind must be all, vocab, or dialogue");
    process.exit(1);
  }
  if (!["wav", "mp3", "opus", "aac", "flac", "pcm"].includes(args.format)) {
    console.error("--format must be wav, mp3, opus, aac, flac, or pcm");
    process.exit(1);
  }
  if (!["orthography", "cue"].includes(args.inputMode)) {
    console.error("--input-mode must be orthography or cue");
    process.exit(1);
  }
  if (!Number.isFinite(args.speed) || args.speed <= 0) {
    console.error("--speed must be a positive number");
    process.exit(1);
  }
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) {
    console.error("--concurrency must be at least 1");
    process.exit(1);
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/generate-openai-audio.js --dry-run --limit 12
  node scripts/generate-openai-audio.js --test na ta calli tlahtoa xochitl
  CONFIRM_TTS_SPEND=YES node scripts/generate-openai-audio.js --execute --kind vocab --limit 25
  CONFIRM_TTS_SPEND=YES node scripts/generate-openai-audio.js --execute --force

Options:
  --kind vocab|dialogue|all       Which rows to generate. Default: all
  --limit N                       Cap rows for testing. Default: no cap
  --ids a,b,c                     Only generate selected row ids
  --force                         Overwrite existing files
  --out DIR                       Output root. Default: public/audio
  --format wav|mp3|opus|aac|flac  Audio format. Default: wav
  --model MODEL                   Default: ${DEFAULTS.model}
  --voice VOICE                   Default: ${DEFAULTS.voice}
  --speed N                       Default: ${DEFAULTS.speed}
  --input-mode orthography|cue    Default: orthography
  --concurrency N                 Default: ${DEFAULTS.concurrency}
  --execute                       Actually call the TTS API
`);
}

function loadRows(args) {
  if (args.test.length) {
    return args.test.map((text, index) => ({
      kind: "test",
      id: slugify(text) || `test-${index + 1}`,
      text,
    }));
  }

  const db = new Database(resolveDbPath(), { readonly: true });
  const rows = [];

  if (args.kind === "all" || args.kind === "vocab") {
    const vocab = db
      .prepare("SELECT id, display_form AS text FROM lesson_vocab ORDER BY lesson_number, rank, id")
      .all();
    for (const row of vocab) rows.push({ kind: "vocab", id: String(row.id), text: row.text });
  }

  if (args.kind === "all" || args.kind === "dialogue") {
    const dialogue = db
      .prepare(
        "SELECT lesson_dialogue_id AS id, utterance_normalized AS text " +
          "FROM lesson_dialogues " +
          "WHERE utterance_normalized IS NOT NULL AND length(trim(utterance_normalized)) > 1 " +
          "ORDER BY lesson_dialogue_id"
      )
      .all();
    for (const row of dialogue) rows.push({ kind: "dialogue", id: String(row.id), text: row.text });
  }

  db.close();

  let filtered = rows;
  if (args.ids.size) filtered = filtered.filter((row) => args.ids.has(row.id));
  if (args.limit > 0) filtered = filtered.slice(0, args.limit);
  return filtered;
}

function slugify(text) {
  return normalizeNahuatlText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function outputPath(args, row) {
  const folder = row.kind === "test" ? "_tests" : row.kind;
  return path.join(args.outDir, folder, `${row.id}.${args.format}`);
}

function previewRows(args, rows) {
  const totalChars = rows.reduce((sum, row) => sum + buildTtsInput(row.text, args).length, 0);
  console.log(`Rows: ${rows.length}`);
  console.log(`Model: ${args.model}`);
  console.log(`Voice: ${args.voice}`);
  console.log(`Format: ${args.format}`);
  console.log(`Input mode: ${args.inputMode}`);
  console.log(`Approx input characters: ${totalChars}`);
  console.log("");

  for (const row of rows.slice(0, 24)) {
    console.log(`[${row.kind}] ${row.id}`);
    console.log(`  text:  ${row.text}`);
    console.log(`  cue:   ${cueForText(row.text)}`);
    console.log(`  input: ${buildTtsInput(row.text, args)}`);
  }
  if (rows.length > 24) console.log(`... ${rows.length - 24} more rows`);
}

async function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(1);
  }
  const { default: OpenAI } = await import("openai");
  return new OpenAI();
}

async function generateOne(client, args, row) {
  const out = outputPath(args, row);
  if (fs.existsSync(out) && !args.force) {
    return { status: "skipped", row, out };
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  const response = await client.audio.speech.create({
    model: args.model,
    voice: args.voice,
    input: buildTtsInput(row.text, args),
    instructions: buildTtsInstructions(row.text, { kind: row.kind }),
    response_format: args.format,
    speed: args.speed,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(out, buffer);
  return { status: "generated", row, out, bytes: buffer.length };
}

async function runPool(items, concurrency, worker) {
  const results = [];
  let index = 0;

  async function next() {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      results.push(await worker(item));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = loadRows(args);

  if (!rows.length) {
    console.log("No rows matched.");
    return;
  }

  previewRows(args, rows);

  if (!args.execute) {
    console.log("");
    console.log("Dry run only. Add --execute and set CONFIRM_TTS_SPEND=YES to generate files.");
    return;
  }

  if (process.env.CONFIRM_TTS_SPEND !== "YES") {
    console.error("Refusing to call paid TTS without CONFIRM_TTS_SPEND=YES.");
    process.exit(1);
  }

  const client = await getOpenAIClient();
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  await runPool(rows, args.concurrency, async (row) => {
    try {
      const result = await generateOne(client, args, row);
      if (result.status === "generated") {
        generated += 1;
        console.log(`OK   [${row.kind}] ${row.id} -> ${result.out}`);
      } else {
        skipped += 1;
        console.log(`SKIP [${row.kind}] ${row.id}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`FAIL [${row.kind}] ${row.id}: ${error.message}`);
    }
  });

  console.log("");
  console.log(`Generated: ${generated}`);
  console.log(`Skipped:   ${skipped}`);
  console.log(`Failed:    ${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
