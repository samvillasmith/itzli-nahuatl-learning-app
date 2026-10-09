"use strict";

// Offline only: no env-file loading, database downloads, provider SDK, or auth.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const Module = require("node:module");
const ts = require("typescript");
const { resolveReadonlyCourseDbPath } = require("./readonly-course-db.cjs");

const ROOT = path.resolve(__dirname, "../..");
const DEFAULT_MANIFEST = path.join(ROOT, "data/audio-v3/current-course.json");
const MMS_MODEL = {
  id: "facebook/mms-tts-nhe",
  revision: "48cc378b4c7bc869e2282e6170a39f10930f20bf",
  license: "CC-BY-NC-4.0",
  model_card: "https://huggingface.co/facebook/mms-tts-nhe",
  language: "nhe",
  sample_rate_hz: 16000,
  seed: 555,
  speaking_rate: 1,
  noise_scale: 0.667,
  noise_scale_duration: 0.8,
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

let installed = false;
function loadTs(relative) {
  if (!installed) {
    installed = true;
    const resolve = Module._resolveFilename;
    Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
      if (request === "server-only") request = path.join(__dirname, "server-only-offline.cjs");
      if (request.startsWith("@/")) {
        request = path.join(ROOT, "src", request.slice(2));
        if (fs.existsSync(request + ".ts")) request += ".ts";
      }
      return resolve.call(this, request, parent, isMain, options);
    };
    require.extensions[".ts"] = function compile(mod, filename) {
      mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
          esModuleInterop: true, resolveJsonModule: true }, fileName: filename,
      }).outputText, filename);
    };
  }
  return require(path.join(ROOT, relative));
}

function sourceRows(course) {
  return course.lessons.flatMap((lesson) => lesson.vocabulary.map((item, index) => ({
    source_id: `source-${lesson.number}-${index + 1}`,
    source_lesson: lesson.number, source_index: index + 1,
    text: item.headword, translation: item.gloss,
    source_url: lesson.originalUrl, audio_url: item.audioUrl,
    attribution: "Nāhuatlahtolli, COERLL / University of Texas at Austin",
    license: "CC BY-SA (publisher listing; version unspecified); retain source and asset-specific notices",
    license_listing_url: course.source.oerListingUrl,
    license_version_confirmed: false,
  })));
}

function loadCurrentAudioManifest(dbPath) {
  const localDb = resolveReadonlyCourseDbPath({ explicitPath: dbPath });
  process.env.DATABASE_PATH = localDb;
  const db = loadTs("src/lib/db.ts");
  const { collapseVariants } = loadTs("src/data/variant-groups.ts");
  const { toInaliOrthography } = loadTs("src/lib/orthography.ts");
  const { getLegacyCardIdentity } = loadTs("src/data/lexical-registry.ts");
  const { DIALOGUE_LINE_CORRECTIONS } = loadTs("src/data/dialogue-overrides.ts");
  const { dialogueAudioUrl } = loadTs("src/lib/audio.ts");
  const heldBaseline = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/audio-held-baseline.json"), "utf8"));
  const legacyHolds = new Set(heldBaseline.records.map((row) => `${row.kind}:${row.id}`));
  const course = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/nahuatlahtolli-course.json"), "utf8"));
  const coreFacts = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/core-vocabulary-facts.json"), "utf8")).facts;
  const sources = sourceRows(course);
  const formKey = (text) => toInaliOrthography(text).toLowerCase().replace(/[¿¡?!.,]/g, "").replace(/\s+/g, " ").trim();
  const heldSourceExamples = {
    "902802": { lesson: 28, text: "Nipanoyaya", quotedLine: "Nipanoyaya “I was passing”" },
    "902805": { lesson: 24, text: "Tiitztoc", quotedLine: "Tiitztoc “You are”" },
    "902807": { lesson: 24, text: "Niitztoc", quotedLine: "Niitztoc “I am”" },
  };
  const records = new Map();
  const add = (record, unit) => {
    const key = `${record.kind}:${record.id}`;
    const previous = records.get(key);
    if (previous) {
      if (previous.runtime_text !== record.runtime_text || previous.translation !== record.translation) {
        throw new Error(`Stable audio identity has different content: ${key}`);
      }
      previous.units.push(unit);
      return;
    }
    records.set(key, { ...record, units: [unit], text_sha256: sha256(record.runtime_text),
      synthesis_text_sha256: sha256(record.synthesis_text), review_status: "unreviewed" });
  };
  for (const unit of db.getAllUnits()) {
    const { cards } = collapseVariants(db.getUnitVocab(unit.lesson_number), unit.lesson_number);
    for (const card of cards) {
      const identity = getLegacyCardIdentity(card.id);
      const fact = coreFacts.find((candidate) => candidate.cardId === card.id);
      if (fact && (card.headword !== fact.sourceSpelling || card.gloss_en !== fact.meaningEn || unit.lesson_number !== fact.lessonNumber)) {
        throw new Error(`Changed reviewed core vocabulary fact ${card.id}`);
      }
      const example = heldSourceExamples[String(card.id)];
      const exampleLesson = example && course.lessons.find((lesson) => lesson.number === example.lesson);
      if (example && (!exampleLesson.sections.some((section) => section.body.includes(example.quotedLine)) ||
        formKey(example.text) !== formKey(card.headword))) {
        throw new Error(`Changed source example for held identity ${card.id}`);
      }
      const exact = sources.find((source) => source.source_id === card.entry_id)
        || sources.find((source) => source.audio_url === card.audioSrc && formKey(source.text) === formKey(card.headword))
        || sources.find((source) => formKey(source.text) === formKey(card.headword));
      const sourceUrl = card.sourceUrl || identity.source?.url || exact?.source_url;
      const held = legacyHolds.has(`vocab:${card.id}`) || card.audioSrc === null;
      add({ kind: "vocab", id: String(card.id), runtime_text: card.headword, translation: card.gloss_en,
        synthesis_text: fact?.sourceSpelling || example?.text || exact?.text || identity.sourceSpelling || card.headword,
        stable_entry_id: identity.entryId,
        content_review: fact ? fact.sourceType : exact ? "source-form" : sourceUrl ? "source-supported-adaptation" : "unknown",
        source_refs: fact ? [fact.sourceUrl, ...fact.supplementalSourceUrls].map(url => ({ source_url: url,
          title: fact.sourceTitle, authors: fact.authors, copyright_url: fact.copyrightUrl,
          selected_form: fact.sourceSpelling, scope: fact.evidence.scope,
          rights: fact.sourceRights, verse_text_reused: false, media_reuse_license_claimed: false }))
          : example ? [{ source_lesson: example.lesson, source_url: exampleLesson.originalUrl,
          text: example.text, excerpt: example.quotedLine, scope: "exact grammatical example; no isolated recording" }]
          : exact ? [exact] : sourceUrl ? [{ source_url: sourceUrl, scope: "supporting lesson; no exact recording" }] : [],
        legacy_hold: held, hold_reason: held ? "corrected or unverified legacy recording" : null,
        existing_audio_url: card.audioSrc || null,
        recording_available: card.audioSrc !== null,
        generation_allowed: card.part_of_speech !== "letter" && Boolean(exact || sourceUrl),
        native_source_audio_url: exact && formKey(exact.text) === formKey(card.headword) ? exact.audio_url : null,
      }, unit.lesson_number);
    }
    for (const line of db.getUnitDialogueContent(unit.lesson_number)) {
      const correction = DIALOGUE_LINE_CORRECTIONS[line.lesson_dialogue_id];
      const curated = line.lesson_dialogue_id.startsWith("CUR-");
      const sourceLessons = correction?.source_lesson_numbers || (curated ? [unit.lesson_number, 2] : []);
      const source_refs = sourceLessons.map((number) => ({ source_lesson: number,
        source_url: course.lessons.find((lesson) => lesson.number === number)?.originalUrl,
        scope: "editorial adaptation; supporting forms, not a verbatim recording" }));
      const native = sources.find((source) => formKey(source.text) === formKey(line.utterance_normalized));
      add({ kind: "dialogue", id: line.lesson_dialogue_id, runtime_text: line.utterance_normalized,
        synthesis_text: native?.text || line.utterance_normalized, translation: line.translation_en,
        content_review: native ? "source-form" : correction || curated ? "source-supported-adaptation" : "unknown",
        source_refs: native ? [native] : source_refs, generation_allowed: Boolean(native || correction || curated),
        legacy_hold: legacyHolds.has(`dialogue:${line.lesson_dialogue_id}`) || line.audio_available === false,
        hold_reason: legacyHolds.has(`dialogue:${line.lesson_dialogue_id}`) || line.audio_available === false
          ? "corrected text or unavailable legacy recording" : null,
        recording_available: line.audio_available !== false,
        existing_audio_url: line.audio_available !== false ? dialogueAudioUrl(line.lesson_dialogue_id) : null,
        native_source_audio_url: native?.audio_url || null,
      }, unit.lesson_number);
    }
  }
  const inputs = ["src/data/nahuatlahtolli-course.json", "src/data/dialogue-overrides.ts",
    "src/data/source-vocab-promotions.ts", "src/data/curated-unit-vocab.json",
    "src/data/course-vocab-selection.ts", "src/data/lexical-registry.ts",
    "src/data/source-vocab-identity.json", "src/data/core-vocabulary-facts.json", "src/data/audio-recording-reuse.json", "src/lib/audio.ts", "src/lib/db.ts"];
  return { schema_version: 1, scope: "corrected current runtime; candidates never release legacy holds",
    synthesis_policy: {
      source_recordings: "preserve original exact-form external-course audio",
      default_provider: "google-cloud-text-to-speech",
      default_language: "es-US", default_voice: "es-US-Standard-A",
      default_speaking_rate: 0.82,
      pronunciation_recipe: "Spanish approximation with Nahuatl exceptions",
    },
    diagnostic_model: MMS_MODEL, database_sha256: sha256(fs.readFileSync(localDb)),
    source_files: Object.fromEntries(inputs.map((name) => [name, sha256(fs.readFileSync(path.join(ROOT, name)))])),
    records: [...records.values()], summary: summarize([...records.values()]) };
}

function summarize(records) {
  return { identities: records.length, placements: records.reduce((n, r) => n + r.units.length, 0),
    vocab: records.filter((r) => r.kind === "vocab").length,
    dialogue: records.filter((r) => r.kind === "dialogue").length,
    held_identities: records.filter((r) => r.legacy_hold).length,
    held_placements: records.filter((r) => r.legacy_hold).reduce((n, r) => n + r.units.length, 0),
    unavailable_identities: records.filter((r) => !r.recording_available).length,
    source_native_identities: records.filter((r) => r.native_source_audio_url).length,
    generation_allowed: records.filter((r) => r.generation_allowed).length,
    generation_excluded_unknown: records.filter((r) => !r.generation_allowed).length };
}

function readManifest(file = DEFAULT_MANIFEST) {
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  if (manifest.schema_version !== 1 || !Array.isArray(manifest.records)) throw new Error("Invalid audio input manifest");
  const ids = new Set();
  for (const row of manifest.records) {
    const id = `${row.kind}:${row.id}`;
    if (ids.has(id) || !["vocab", "dialogue", "benchmark"].includes(row.kind)) throw new Error(`Invalid/duplicate identity ${id}`);
    ids.add(id);
    if (sha256(row.runtime_text) !== row.text_sha256 || sha256(row.synthesis_text) !== row.synthesis_text_sha256) {
      throw new Error(`Changed audio text without matching hash: ${id}`);
    }
    if (row.generation_allowed && !isSourceSupported(row)) {
      throw new Error(`Unknown/quarantined input cannot be synthesized: ${id}`);
    }
  }
  return manifest;
}

function isSourceSupported(row) {
  return ["source-form", "source-supported-adaptation"].includes(row.content_review) &&
    Array.isArray(row.source_refs) && row.source_refs.length > 0 &&
    row.source_refs.every((ref) => /^https:\/\/tlahtolli\.coerll\.utexas\.edu\//.test(ref.source_url || ""));
}

function paidProviderRows(args) {
  const manifest = readManifest(args.manifest || DEFAULT_MANIFEST);
  let rows = manifest.records.filter((r) => r.generation_allowed &&
    (args.held ? r.legacy_hold : !r.legacy_hold) &&
    isSourceSupported(r) && !r.native_source_audio_url);
  if (args.kind !== "all") rows = rows.filter((r) => r.kind === args.kind);
  if (args.ids?.size) rows = rows.filter((r) => args.ids.has(String(r.id)));
  if (args.limit > 0) rows = rows.slice(0, args.limit);
  return rows.map((r) => ({ ...r, text: r.synthesis_text }));
}

module.exports = { ROOT, DEFAULT_MANIFEST, MMS_MODEL, sha256, loadTs, sourceRows, isSourceSupported,
  loadCurrentAudioManifest, summarize, readManifest, paidProviderRows };
