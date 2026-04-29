#!/usr/bin/env node
"use strict";

/**
 * EXPERIMENTAL: Google Cloud TTS generator with Nahuatl pronunciation rules.
 *
 * This intentionally uses Google's REST API directly so the repo does not need
 * another dependency just to test a few voices. It signs a service-account JWT
 * locally, exchanges it for an access token, and sends SSML with X-SAMPA
 * phoneme tags to Cloud Text-to-Speech.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");
const {
  cueForText,
  normalizeNahuatlText,
  splitSyllables,
  tokenizeWord,
} = require("./lib/nahuatl-pronunciation");

loadEnvFile(path.resolve(__dirname, "..", ".env.local"));
loadEnvFile(path.resolve(__dirname, "..", ".env"));

const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORD_RE = /[A-Za-z\u0101\u0113\u012b\u014d\u016b\u02bc']+/g;

const DEFAULTS = {
  credentials: process.env.GOOGLE_TTS_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
  languageCode: process.env.GOOGLE_TTS_LANGUAGE_CODE || "es-US",
  voiceName: process.env.GOOGLE_TTS_VOICE_NAME || process.env.GOOGLE_TTS_VOICE || "es-US-Standard-A",
  audioEncoding: process.env.GOOGLE_TTS_AUDIO_ENCODING || "LINEAR16",
  extension: process.env.GOOGLE_TTS_FORMAT || "wav",
  speakingRate: Number(process.env.GOOGLE_TTS_SPEAKING_RATE || "0.82"),
  pitch: Number(process.env.GOOGLE_TTS_PITCH || "0"),
  sampleRateHertz: Number(process.env.GOOGLE_TTS_SAMPLE_RATE_HERTZ || "0"),
  outDir: process.env.AUDIO_OUT_DIR || path.resolve(PROJECT_ROOT, "public", "audio-google"),
  inputMode: process.env.NAHUATL_GOOGLE_INPUT_MODE || "phoneme",
  concurrency: Number(process.env.TTS_CONCURRENCY || "2"),
};

const ENCODING_TO_EXTENSION = {
  LINEAR16: "wav",
  MP3: "mp3",
  OGG_OPUS: "ogg",
  MULAW: "wav",
  ALAW: "wav",
};

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {
    execute: false,
    force: false,
    listVoices: false,
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
    else if (arg === "--list-voices") args.listVoices = true;
    else if (arg === "--credentials") {
      args.credentials = value;
      i += 1;
    } else if (arg === "--kind") {
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
    } else if (arg === "--language-code") {
      args.languageCode = value;
      i += 1;
    } else if (arg === "--voice") {
      args.voiceName = value;
      i += 1;
    } else if (arg === "--encoding") {
      args.audioEncoding = String(value || "").toUpperCase();
      args.extension = ENCODING_TO_EXTENSION[args.audioEncoding] || args.extension;
      i += 1;
    } else if (arg === "--format") {
      args.extension = value;
      i += 1;
    } else if (arg === "--speaking-rate") {
      args.speakingRate = Number(value);
      i += 1;
    } else if (arg === "--pitch") {
      args.pitch = Number(value);
      i += 1;
    } else if (arg === "--sample-rate") {
      args.sampleRateHertz = Number(value);
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
      while (argv[i + 1] && !argv[i + 1].startsWith("--")) {
        args.test.push(argv[i + 1]);
        i += 1;
      }
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
  if (!["phoneme", "cue", "orthography"].includes(args.inputMode)) {
    console.error("--input-mode must be phoneme, cue, or orthography");
    process.exit(1);
  }
  if (!["LINEAR16", "MP3", "OGG_OPUS", "MULAW", "ALAW"].includes(args.audioEncoding)) {
    console.error("--encoding must be LINEAR16, MP3, OGG_OPUS, MULAW, or ALAW");
    process.exit(1);
  }
  if (!Number.isFinite(args.speakingRate) || args.speakingRate < 0.25 || args.speakingRate > 4) {
    console.error("--speaking-rate must be between 0.25 and 4");
    process.exit(1);
  }
  if (!Number.isFinite(args.pitch) || args.pitch < -20 || args.pitch > 20) {
    console.error("--pitch must be between -20 and 20");
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
  node scripts/generate-google-audio.js --dry-run --limit 12
  node scripts/generate-google-audio.js --list-voices --language-code es-US
  node scripts/generate-google-audio.js --test na ta calli tlahtoa xochitl
  CONFIRM_TTS_SPEND=YES node scripts/generate-google-audio.js --test na ta calli --execute --force
  CONFIRM_TTS_SPEND=YES node scripts/generate-google-audio.js --execute --kind vocab --limit 25

Options:
  --credentials PATH              Service-account JSON. Default: env or secrets/*.json
  --kind vocab|dialogue|all       Which rows to generate. Default: all
  --limit N                       Cap rows for testing. Default: no cap
  --ids a,b,c                     Only generate selected row ids
  --force                         Overwrite existing files
  --out DIR                       Output root. Default: public/audio-google
  --language-code CODE            Default: ${DEFAULTS.languageCode}
  --voice NAME                    Default: ${DEFAULTS.voiceName}
  --encoding LINEAR16|MP3|OGG_OPUS|MULAW|ALAW
                                  Default: ${DEFAULTS.audioEncoding}
  --format EXT                    File extension. Default: ${DEFAULTS.extension}
  --speaking-rate N               Default: ${DEFAULTS.speakingRate}
  --pitch N                       Semitones, -20 to 20. Default: ${DEFAULTS.pitch}
  --sample-rate N                 Optional hertz override
  --input-mode phoneme|cue|orthography
                                  Default: ${DEFAULTS.inputMode}
  --concurrency N                 Default: ${DEFAULTS.concurrency}
  --execute                       Actually call the TTS API
`);
}

function resolveCredentialsPath(args) {
  const candidates = [];
  if (args.credentials) candidates.push(path.resolve(args.credentials));

  for (const dir of ["secrets", "secret"]) {
    const abs = path.resolve(PROJECT_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (name.toLowerCase().endsWith(".json")) candidates.push(path.join(abs, name));
    }
  }

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    console.error("No Google service-account JSON found. Set GOOGLE_APPLICATION_CREDENTIALS or put one in secrets/.");
    process.exit(1);
  }
  return found;
}

function loadServiceAccount(credentialsPath) {
  const data = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
  if (!data.client_email || !data.private_key) {
    console.error("Google credentials JSON is missing client_email or private_key.");
    process.exit(1);
  }
  return data;
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(serviceAccount.private_key);
  return `${unsigned}.${base64url(signature)}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.error || response.statusText;
    throw new Error(`${response.status} ${message}`);
  }
  return data;
}

async function getAccessToken(serviceAccount) {
  const assertion = signJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const data = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return data.access_token;
}

async function listVoices(token, args) {
  const url = new URL("https://texttospeech.googleapis.com/v1/voices");
  if (args.languageCode) url.searchParams.set("languageCode", args.languageCode);
  const data = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  for (const voice of data.voices || []) {
    console.log(
      [
        voice.name,
        `languages=${(voice.languageCodes || []).join(",")}`,
        `gender=${voice.ssmlGender}`,
        `sampleRate=${voice.naturalSampleRateHertz}`,
      ].join("  ")
    );
  }
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
  return path.join(args.outDir, folder, `${row.id}.${args.extension}`);
}

function tokenToXsampa(token) {
  if (token.kind === "vowel") return token.base;

  const cue = token.cue || token.orth;
  if (cue === "sh") return "S";
  if (cue === "ch") return "tS";
  if (cue === "tz") return "ts";
  if (cue === "tl") return "tl";
  if (cue === "kw") return "kw";
  if (cue === "y") return "j";
  if (cue === "h") return "x";
  if (cue === "k") return "k";
  if (/^[a-z]$/.test(cue)) return cue;
  return "";
}

function wordToXsampa(word) {
  const tokens = tokenizeWord(word);
  if (!tokens.length) return "";
  const syllables = splitSyllables(tokens);
  const stressIndex = syllables.length <= 1 ? 0 : syllables.length - 2;
  const parts = syllables
    .map((syllable, index) => {
      const phones = syllable.map(tokenToXsampa).join("");
      return index === stressIndex ? `"${phones}` : phones;
    })
    .filter(Boolean);
  return parts.join(".");
}

function escapeXmlText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXmlSingleAttr(value) {
  return escapeXmlText(value).replace(/'/g, "&apos;");
}

function buildSsml(text, args) {
  const source = String(text || "").toLowerCase();
  let out = "";
  let last = 0;

  for (const match of source.matchAll(WORD_RE)) {
    const word = match[0];
    out += escapeXmlText(source.slice(last, match.index));

    if (args.inputMode === "orthography") {
      out += escapeXmlText(normalizeNahuatlText(word));
    } else if (args.inputMode === "cue") {
      out += escapeXmlText(cueForText(word, { markStress: false, separator: " " }));
    } else {
      const ph = wordToXsampa(word);
      const label = escapeXmlText(normalizeNahuatlText(word));
      out += ph
        ? `<phoneme alphabet="x-sampa" ph='${escapeXmlSingleAttr(ph)}'>${label}</phoneme>`
        : label;
    }

    last = match.index + word.length;
  }

  out += escapeXmlText(source.slice(last));
  return `<speak>${out.replace(/\s+/g, " ").trim()}</speak>`;
}

function xsampaForText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(WORD_RE, (word) => wordToXsampa(word) || word);
}

function previewRows(args, rows, credentialsPath) {
  const relCreds = path.relative(PROJECT_ROOT, credentialsPath) || credentialsPath;
  console.log(`Rows: ${rows.length}`);
  console.log(`Credentials: ${relCreds}`);
  console.log(`Language: ${args.languageCode}`);
  console.log(`Voice: ${args.voiceName || "(Google default for language)"}`);
  console.log(`Encoding: ${args.audioEncoding}`);
  console.log(`Speaking rate: ${args.speakingRate}`);
  console.log(`Input mode: ${args.inputMode}`);
  console.log(`Output: ${args.outDir}`);
  console.log("");

  for (const row of rows.slice(0, 24)) {
    console.log(`[${row.kind}] ${row.id}`);
    console.log(`  text:    ${row.text}`);
    console.log(`  cue:     ${cueForText(row.text)}`);
    console.log(`  xsampa:  ${xsampaForText(row.text)}`);
    console.log(`  ssml:    ${buildSsml(row.text, args)}`);
  }
  if (rows.length > 24) console.log(`... ${rows.length - 24} more rows`);
}

async function synthesizeOne(token, args, row) {
  const out = outputPath(args, row);
  if (fs.existsSync(out) && !args.force) {
    return { status: "skipped", row, out };
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });

  const audioConfig = {
    audioEncoding: args.audioEncoding,
    speakingRate: args.speakingRate,
    pitch: args.pitch,
  };
  if (args.sampleRateHertz > 0) audioConfig.sampleRateHertz = args.sampleRateHertz;

  const request = {
    input: { ssml: buildSsml(row.text, args) },
    voice: {
      languageCode: args.languageCode,
      name: args.voiceName || undefined,
    },
    audioConfig,
  };

  const data = await fetchJson("https://texttospeech.googleapis.com/v1/text:synthesize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const buffer = Buffer.from(data.audioContent || "", "base64");
  fs.writeFileSync(out, buffer);
  return { status: "generated", row, out, bytes: buffer.length };
}

async function runPool(items, concurrency, worker) {
  let index = 0;

  async function next() {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const credentialsPath = resolveCredentialsPath(args);
  const serviceAccount = loadServiceAccount(credentialsPath);

  if (args.listVoices) {
    const token = await getAccessToken(serviceAccount);
    await listVoices(token, args);
    return;
  }

  const rows = loadRows(args);
  if (!rows.length) {
    console.log("No rows matched.");
    return;
  }

  previewRows(args, rows, credentialsPath);

  if (!args.execute) {
    console.log("");
    console.log("Dry run only. Add --execute and set CONFIRM_TTS_SPEND=YES to generate files.");
    return;
  }

  if (process.env.CONFIRM_TTS_SPEND !== "YES") {
    console.error("Refusing to call paid Google TTS without CONFIRM_TTS_SPEND=YES.");
    process.exit(1);
  }

  const token = await getAccessToken(serviceAccount);
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  await runPool(rows, args.concurrency, async (row) => {
    try {
      const result = await synthesizeOne(token, args, row);
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

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
