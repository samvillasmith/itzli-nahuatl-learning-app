#!/usr/bin/env node
"use strict";

/**
 * Google Spanish approximation with the course's Nahuatl pronunciation recipe.
 *
 * This intentionally uses Google's REST API directly so the repo does not need
 * another dependency just to test a few voices. It signs a service-account JWT
 * locally, exchanges it for an access token, and sends SSML with X-SAMPA
 * phoneme tags to Cloud Text-to-Speech.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { privateDiagnosticDirectory, assertPrivateDiagnosticDirectory } = require("./lib/audio-diagnostic-storage.cjs");
const { paidProviderRows, DEFAULT_MANIFEST } = require("./lib/course-audio-inputs");
const {
  cueForText,
  normalizeNahuatlText,
  spanishLoanSpokenForm,
  speakableNahuatlText,
  splitSyllables,
  tokenizeWord,
} = require("./lib/nahuatl-pronunciation");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORD_RE = /[A-Za-záéíóúüñ\u0101\u0113\u012b\u014d\u016b\u02bc']+/g;
const GOOGLE_RECIPE_VERSION = "spanish-air-b-2026-10-07";
// Attested personal names in the course use the Spanish voice's natural stress.
// This pronunciation-only allowlist never changes learner-visible written forms.
const SPANISH_PERSONAL_NAMES = new Set(["maría", "ramón", "tomás"]);
const SPANISH_ACCENTED_LOANS = new Set(["café"]);
const NON_SECRET_SETTINGS = new Set([
  "GOOGLE_TTS_LANGUAGE_CODE", "GOOGLE_TTS_VOICE_NAME", "GOOGLE_TTS_VOICE",
  "GOOGLE_TTS_AUDIO_ENCODING", "GOOGLE_TTS_FORMAT", "GOOGLE_TTS_SPEAKING_RATE",
  "GOOGLE_TTS_PITCH", "GOOGLE_TTS_SAMPLE_RATE_HERTZ", "AUDIO_OUT_DIR",
  "NAHUATL_GOOGLE_INPUT_MODE", "TTS_CONCURRENCY", "GOOGLE_CLOUD_QUOTA_PROJECT",
]);

function googleDefaults(settings = process.env) {
  return {
    // Credentials and access tokens are resolved only after the execute/spend gate.
    credentials: "",
    languageCode: settings.GOOGLE_TTS_LANGUAGE_CODE || "es-US",
    voiceName: settings.GOOGLE_TTS_VOICE_NAME || settings.GOOGLE_TTS_VOICE || "es-US-Standard-A",
    audioEncoding: settings.GOOGLE_TTS_AUDIO_ENCODING || "LINEAR16",
    extension: settings.GOOGLE_TTS_FORMAT || "wav",
    speakingRate: Number(settings.GOOGLE_TTS_SPEAKING_RATE || "0.82"),
    pitch: Number(settings.GOOGLE_TTS_PITCH || "0"),
    sampleRateHertz: Number(settings.GOOGLE_TTS_SAMPLE_RATE_HERTZ || "0"),
    outDir: settings.AUDIO_OUT_DIR || privateDiagnosticDirectory(PROJECT_ROOT, "google"),
    inputMode: settings.NAHUATL_GOOGLE_INPUT_MODE || "phoneme",
    concurrency: Number(settings.TTS_CONCURRENCY || "2"),
    accessToken: "",
    quotaProject: settings.GOOGLE_CLOUD_QUOTA_PROJECT || "",
  };
}

function loadGoogleNonSecretSettings(files, environment = process.env) {
  const settings = {};
  for (const key of NON_SECRET_SETTINGS) {
    if (typeof environment[key] === "string") settings[key] = environment[key];
  }
  const pinVoiceAlias = () => {
    if (!("GOOGLE_TTS_VOICE_NAME" in settings) && "GOOGLE_TTS_VOICE" in settings) {
      settings.GOOGLE_TTS_VOICE_NAME = settings.GOOGLE_TTS_VOICE;
    }
  };
  pinVoiceAlias();
  // Caller supplies .env.local before .env; existing process settings win.
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      // Ignore credential/token and unrelated keys before parsing their values.
      if (!NON_SECRET_SETTINGS.has(key) || key in settings) continue;
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      settings[key] = value;
    }
    pinVoiceAlias();
  }
  return settings;
}

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

function parseArgs(argv, settings = process.env) {
  const defaults = googleDefaults(settings);
  const args = {
    execute: false,
    force: false,
    listVoices: false,
    reviewed: false,
    held: false,
    manifest: DEFAULT_MANIFEST,
    kind: "all",
    limit: 0,
    ids: new Set(),
    test: [],
    ...defaults,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];

    if (arg === "--execute") args.execute = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--dry-run") args.execute = false;
    else if (arg === "--list-voices") args.listVoices = true;
    else if (arg === "--reviewed") args.reviewed = true;
    else if (arg === "--held") args.held = true;
    else if (arg === "--manifest") { args.manifest = value; i += 1; }
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
    } else if (arg === "--quota-project") {
      args.quotaProject = value;
      i += 1;
    } else if (arg === "--test") {
      while (argv[i + 1] && !argv[i + 1].startsWith("--")) {
        args.test.push(argv[i + 1]);
        i += 1;
      }
    } else if (arg === "--help" || arg === "-h") {
      printHelp(defaults);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp(defaults);
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

  args.outDir = assertPrivateDiagnosticDirectory(PROJECT_ROOT, args.outDir);
  return args;
}

function printHelp(defaults = googleDefaults()) {
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
  --manifest FILE                 Frozen corrected runtime inputs; no raw database rows
  --reviewed                      Deprecated; uses the frozen manifest, never stale review text
  --held                          Only source-supported corrected held candidates; native clips remain excluded
  --force                         Overwrite existing files
  --out DIR                       Private output root. Default: data/audio-v3/diagnostics/google/candidates
  --language-code CODE            Default: ${defaults.languageCode}
  --voice NAME                    Default: ${defaults.voiceName}
  --encoding LINEAR16|MP3|OGG_OPUS|MULAW|ALAW
                                  Default: ${defaults.audioEncoding}
  --format EXT                    File extension. Default: ${defaults.extension}
  --speaking-rate N               Default: ${defaults.speakingRate}
  --pitch N                       Semitones, -20 to 20. Default: ${defaults.pitch}
  --sample-rate N                 Optional hertz override
  --input-mode phoneme|cue|orthography
                                  Default: ${defaults.inputMode}
  --concurrency N                 Default: ${defaults.concurrency}
  --quota-project PROJECT         Quota project for GOOGLE_TTS_ACCESS_TOKEN
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

function googleHeaders(token, args, contentType) {
  return {
    Authorization: `Bearer ${token}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
    ...(args.quotaProject ? { "x-goog-user-project": args.quotaProject } : {}),
  };
}

async function listVoices(token, args) {
  const url = new URL("https://texttospeech.googleapis.com/v1/voices");
  if (args.languageCode) url.searchParams.set("languageCode", args.languageCode);
  const data = await fetchJson(url, {
    headers: googleHeaders(token, args),
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
    return args.test.map((text, index) => ({ kind: "test", id: slugify(text) || `test-${index + 1}`, text }));
  }
  return paidProviderRows(args);
}

function slugify(text) {
  return normalizeNahuatlText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function outputPath(args, row) {
  const folder = row.kind === "test" ? "_tests" : row.kind;
  const textHash = row.text_sha256 || crypto.createHash("sha256").update(row.text).digest("hex");
  const recipeHash = crypto.createHash("sha256").update(JSON.stringify({ text: row.text,
    recipe: GOOGLE_RECIPE_VERSION, ssml: buildSsml(row.text, args),
    voice: args.voiceName, language: args.languageCode, rate: args.speakingRate,
    pitch: args.pitch, mode: args.inputMode, sampleRate: args.sampleRateHertz,
    encoding: args.audioEncoding, extension: args.extension,
  })).digest("hex");
  return path.join(args.outDir, folder, `${row.id}--${textHash.slice(0, 12)}--${recipeHash.slice(0, 12)}.${args.extension}`);
}

function tokenToXsampa(token) {
  // This is the earlier Spanish synthesis approximation, not an EHN transcription.
  if (token.kind === "vowel") return token.base;

  const cue = token.cue || token.orth;
  if (cue === "sh") return "S";
  if (cue === "ch") return "tS";
  if (cue === "tz" || cue === "ts") return "ts";
  // Owner-approved Air approximation B from pilot candidate 12: t + Spanish x.
  // This is an air/frication cue, not a claim to reproduce the native lateral tl.
  if (cue === "tl") return "tx";
  if (cue === "kw") return "kw";
  if (cue === "y") return "j";
  if (cue === "h") return "x";
  if (cue === "k") return "k";
  if (/^[a-z]$/.test(cue)) return cue;
  throw new Error(`Unsupported pronunciation token: ${JSON.stringify(token)}`);
}

function assertGoogleInputCharacters(text) {
  const source = speakableNahuatlText(text).normalize("NFC").toLowerCase()
    .replace(/\u2019|\u2018|\u02bc/g, "'");
  const unrecognized = source.replace(WORD_RE, "").replace(/[\s¿¡?!.,;:'"-]/g, "");
  if (unrecognized) throw new Error(`Unsupported pronunciation input: ${JSON.stringify(unrecognized)}`);
  // Character/token validation prevents silent deletion; it does not certify pronunciation.
  for (const match of source.matchAll(WORD_RE)) {
    if (SPANISH_PERSONAL_NAMES.has(match[0]) || SPANISH_ACCENTED_LOANS.has(match[0])) continue;
    if (/[áéíóúüñ]/.test(match[0])) throw new Error(`Unsupported pronunciation input: ${JSON.stringify(match[0])}`);
    tokenizeWord(match[0]);
  }
}

function googlePronunciationText(text) {
  // Pronunciation aliases belong only to this synthesis recipe. The source text,
  // its manifest hashes, and the shared descriptive tokenizer remain unchanged.
  return normalizeNahuatlText(text)
    .replace(/\bqu[eē]niuhqui\b/g, "kenihki")
    .replace(/\bkeniuhki\b/g, "kenihki")
    .replace(/\bkeniwki\b/g, "kenihki");
}

function wordToXsampa(word) {
  const tokens = tokenizeWord(googlePronunciationText(word));
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
  assertGoogleInputCharacters(text);
  const source = speakableNahuatlText(text).normalize("NFC").toLowerCase()
    .replace(/\u2019|\u2018|\u02bc/g, "'");
  let out = "";
  let last = 0;

  for (const match of source.matchAll(WORD_RE)) {
    const word = match[0];
    out += escapeXmlText(source.slice(last, match.index));
    const spanishLoan = SPANISH_PERSONAL_NAMES.has(word) || SPANISH_ACCENTED_LOANS.has(word) ? word : spanishLoanSpokenForm(word);

    if (spanishLoan) {
      out += escapeXmlText(spanishLoan);
    } else if (args.inputMode === "orthography") {
      out += escapeXmlText(googlePronunciationText(word));
    } else if (args.inputMode === "cue") {
      out += escapeXmlText(cueForText(googlePronunciationText(word), { markStress: false, separator: " " }));
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
  return speakableNahuatlText(text)
    .normalize("NFC")
    .toLowerCase()
    .replace(/\u2019|\u2018|\u02bc/g, "'")
    .replace(WORD_RE, (word) => SPANISH_PERSONAL_NAMES.has(word) || SPANISH_ACCENTED_LOANS.has(word)
      ? word : spanishLoanSpokenForm(word) || wordToXsampa(word) || word);
}

function previewRows(args, rows, authLabel) {
  console.log(`Rows: ${rows.length}`);
  console.log(`Credentials: ${authLabel}`);
  console.log(`Language: ${args.languageCode}`);
  console.log(`Voice: ${args.voiceName || "(Google default for language)"}`);
  console.log(`Encoding: ${args.audioEncoding}`);
  console.log(`Speaking rate: ${args.speakingRate}`);
  console.log(`Input mode: ${args.inputMode}`);
  console.log(`Recipe: ${GOOGLE_RECIPE_VERSION} (Spanish approximation; unreviewed)`);
  console.log(`Output: ${args.outDir}`);
  console.log("");

  for (const row of rows.slice(0, 24)) {
    console.log(`[${row.kind}] ${row.id}`);
    console.log(`  text:    ${row.text}`);
    console.log(`  cue:     ${cueForText(googlePronunciationText(row.text))}`);
    console.log(`  xsampa:  ${xsampaForText(row.text)}`);
    try { console.log(`  ssml:    ${buildSsml(row.text, args)}`); }
    catch (error) { console.log(`  unsupported: ${error.message}`); }
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
    headers: googleHeaders(token, args, "application/json"),
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
  const settings = loadGoogleNonSecretSettings([
    path.resolve(PROJECT_ROOT, ".env.local"), path.resolve(PROJECT_ROOT, ".env"),
  ]);
  const args = parseArgs(process.argv.slice(2), settings);
  const rows = args.listVoices ? [] : loadRows(args);
  if (!rows.length && !args.listVoices) {
    console.log("No rows matched.");
    return;
  }

  if (!args.listVoices) previewRows(args, rows, "not accessed for offline preview");

  if (!args.execute && !args.listVoices) {
    console.log("");
    console.log("Dry run only. Add --execute and set CONFIRM_TTS_SPEND=YES to generate files.");
    return;
  }

  if (process.env.CONFIRM_TTS_SPEND !== "YES") {
    console.error("Refusing to call paid Google TTS without CONFIRM_TTS_SPEND=YES.");
    process.exit(1);
  }

  // Preflight every input before any credential read or authentication request.
  for (const row of rows) assertGoogleInputCharacters(row.text);
  loadEnvFile(path.resolve(PROJECT_ROOT, ".env.local"));
  loadEnvFile(path.resolve(PROJECT_ROOT, ".env"));
  args.credentials ||= process.env.GOOGLE_TTS_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
  args.accessToken ||= process.env.GOOGLE_TTS_ACCESS_TOKEN || "";
  const credentialsPath = args.accessToken ? "" : resolveCredentialsPath(args);
  const serviceAccount = credentialsPath ? loadServiceAccount(credentialsPath) : null;
  const token = args.accessToken || await getAccessToken(serviceAccount);
  if (args.listVoices) { await listVoices(token, args); return; }

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

if (require.main === module) main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
module.exports = { tokenToXsampa, wordToXsampa, xsampaForText, buildSsml,
  assertGoogleInputCharacters, googlePronunciationText, googleDefaults,
  loadGoogleNonSecretSettings, outputPath, parseArgs, loadRows, GOOGLE_RECIPE_VERSION,
  loadServiceAccount, getAccessToken, googleHeaders, fetchJson };
