#!/usr/bin/env node
"use strict";

/**
 * Generates family-safe, style-consistent vocabulary images with OpenAI.
 *
 * Default mode is a dry run. Paid generation requires both --execute and
 * CONFIRM_IMAGE_SPEND=YES.
 */

const fs = require("fs");
const crypto = require("crypto");
const Module = require("module");
const path = require("path");
const ts = require("typescript");
const { isViolenceOnlyModerationResult } = require("./lib/image-depiction-guardrails");

const ROOT = path.resolve(__dirname, "..");
const IMAGE_CONFIG_KEYS = ["OPENAI_IMAGE_PUBLIC_BASE_URL", "OPENAI_IMAGE_MODEL", "OPENAI_IMAGE_QUALITY", "OPENAI_IMAGE_SIZE", "OPENAI_IMAGE_FORMAT", "OPENAI_IMAGE_UNIT_COST_USD", "OPENAI_IMAGE_INPUT_TOKEN_COST_USD", "OPENAI_IMAGE_CONCURRENCY", "OPENAI_IMAGE_REVIEW_MODEL", "OPENAI_IMAGE_OUT_DIR", "OPENAI_IMAGE_SOURCE", "OPENAI_IMAGE_DELAY_MS"];
// A dry run never loads provider credentials or unrelated application secrets.
loadLocalEnv(IMAGE_CONFIG_KEYS);

const SOURCE_COURSE_PATH = path.join(ROOT, "src", "data", "nahuatlahtolli-course.json");
const VERIFIED_V3_PATH = path.join(ROOT, "src", "data", "v3-verified-lexicon.json");
const REVIEWED_LABELS_PATH = path.join(ROOT, "src", "data", "reviewed-vocabulary-labels.json");
const LEARNER_SENSES_PATH = path.join(ROOT, "src", "data", "learner-vocabulary-senses.json");
const OPENAI_MANIFEST_PATH = path.join(ROOT, "src", "data", "openai-word-images.json");
const S3_MANIFEST_PATH = path.join(ROOT, "src", "data", "s3-word-images.json");
const LEGACY_MANIFEST_PATH = path.join(ROOT, "src", "data", "word-images.json");
const BLOCKLIST_PATH = path.join(ROOT, "scripts", "config", "openai-word-image-blocklist.json");
const BATHING_CONCEPT_PATTERN = new RegExp(require(BLOCKLIST_PATH).bathingConceptPattern, "iu");
const REVIEWED_ALLOWLIST_PATH = path.join(ROOT, "scripts", "config", "openai-reviewed-image-allowlist.json");
const APPROVED_IMAGE_SCENES = require("./config/user-approved-image-scenes.json").entries;
const APP_CONTENT_EXCLUSIONS_PATH = path.join(ROOT, "src", "data", "app-content-exclusions.json");
const SKIPPED_AUDIT_PATH = path.join(ROOT, "data", "openai-word-images-skipped.json");
const REJECTED_AUDIT_PATH = path.join(ROOT, "data", "openai-word-images-rejected.json");
const PENDING_MANIFEST_PATH = path.join(ROOT, "data", "openai-word-images-pending.json");
const VERIFIED_V3_FORM_KINDS = new Set([
  "lexical-headword", "possessed-stem", "rule-composed-prohibition", "locative-form", "rule-composed-reference-form",
  "attested-reference-form", "bound-stem", "rule-composed-agent-noun", "lexical-context-form", "inflected-form",
  "attested-proper-name-reference", "possessed-noun-reference", "attested-noun-form", "rule-composed-cardinal",
  "attested-possessed-noun-form", "possessed-form", "dependent-reference-form", "relational-reference-form",
  "rule-composed-possessed-form", "multiword-expression", "rule-composed-verb-form", "rule-composed-possessed-agent",
  "source-extracted-reference-form", "relational-base", "rule-composed-relational-form", "contextual-ordinal-modifier",
  "qualified-regional-color-reference", "place-name-lexical-reference", "qualified-regional-time-reference", "rule-composed-state-verb",
]);
const VERIFIED_V3_COMPOSITIONS = {
  "word-v3i-c00ffe652ebc3241": "Show one empty woven basket, with its open interior clearly visible. No contents, people, hands or human figures. The weave and material are illustrative, not a claim of a particular community's basket design.",
  "word-v3d-b4d3ca2814e5ce37": "Show several recognizable brown cacao beans, with one split cacao pod behind them to clarify their origin. These are cacao beans used for chocolate, NOT peanuts or peanut shells. No people, hands or human figures.",
  "word-v3d-e133f784aa37edf6": "Show one healthy living armadillo in a calm natural setting, with its armored back and long tail clearly visible. No injury, hunting, traps, distress, people, hands or human figures. Do not imply a particular zoological species.",
  "word-v3d-02aaa0bb9646af1e": "Show a calm lagoon as a broad shallow body of water with gently curved banks and vegetation. No people, swimmers, bathers, human silhouettes, human reflections, boats or buildings.",
};
const S3_IMAGE_BASE_URL =
  process.env.OPENAI_IMAGE_PUBLIC_BASE_URL ||
  "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";

function loadLocalEnv(allowedKeys) {
  const allowed = new Set(allowedKeys);
  const shellEnv = new Set(Object.keys(process.env));
  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.join(ROOT, fileName);
    if (!fs.existsSync(filePath)) continue;

    for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;

      const key = match[1];
      if (!allowed.has(key)) continue;
      if (shellEnv.has(key)) continue;

      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\\n/g, "\n");
    }
  }
}

const DEFAULTS = {
  model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
  quality: process.env.OPENAI_IMAGE_QUALITY || "medium",
  size: process.env.OPENAI_IMAGE_SIZE || "1024x1024",
  outputFormat: process.env.OPENAI_IMAGE_FORMAT || "png",
  outputUnitCostUsd: Number(process.env.OPENAI_IMAGE_UNIT_COST_USD || "0.042"),
  inputTokenCostPerMillionUsd: Number(process.env.OPENAI_IMAGE_INPUT_TOKEN_COST_USD || "5"),
  concurrency: Number(process.env.OPENAI_IMAGE_CONCURRENCY || "1"),
  visionReviewModel: process.env.OPENAI_IMAGE_REVIEW_MODEL || "gpt-4.1-mini",
  outDir:
    process.env.OPENAI_IMAGE_OUT_DIR ||
    path.join(ROOT, "public", "generated", "word-images", "openai"),
  source: process.env.OPENAI_IMAGE_SOURCE || "core",
  delayMs: Number(process.env.OPENAI_IMAGE_DELAY_MS || "600"),
};

function parseArgs(argv) {
  const args = {
    execute: false,
    force: false,
    includePhrases: false,
    missingOnly: false,
    limit: 0,
    writePlan: "",
    compositionFile: "",
    reviewPending: false,
    omitTargetWord: false,
    checkpoint: "",
    minImageIntervalMs: 0,
    explicitOutputPricing: Boolean(process.env.OPENAI_IMAGE_UNIT_COST_USD),
    explicitInputPricing: Boolean(process.env.OPENAI_IMAGE_INPUT_TOKEN_COST_USD),
    ids: new Set(),
    lessons: new Set(),
    ...DEFAULTS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];

    if (arg === "--execute") args.execute = true;
    else if (arg === "--dry-run") args.execute = false;
    else if (arg === "--force") args.force = true;
    else if (arg === "--review-pending") args.reviewPending = true;
    else if (arg === "--omit-target-word") args.omitTargetWord = true;
    else if (arg === "--include-phrases") args.includePhrases = true;
    else if (arg === "--missing-only") args.missingOnly = true;
    else if (arg === "--limit") {
      args.limit = Number(value);
      i += 1;
    } else if (arg === "--write-plan") {
      args.writePlan = path.resolve(value);
      i += 1;
    } else if (arg === "--ids") {
      for (const id of String(value || "").split(",")) {
        if (id.trim()) args.ids.add(id.trim());
      }
      i += 1;
    } else if (arg === "--composition-file") {
      if (!value) throw new Error("--composition-file requires a JSON file path");
      args.compositionFile = path.resolve(value);
      i += 1;
    } else if (arg === "--checkpoint") {
      if (!value) throw new Error("--checkpoint requires a file path");
      args.checkpoint = path.resolve(value); i += 1;
    } else if (arg === "--min-image-interval-ms") {
      args.minImageIntervalMs = Number(value); i += 1;
    } else if (arg === "--lessons") {
      for (const lesson of String(value || "").split(",")) {
        const number = Number(lesson.trim());
        if (Number.isFinite(number)) args.lessons.add(number);
      }
      i += 1;
    } else if (arg === "--source") {
      args.source = value;
      i += 1;
    } else if (arg === "--model") {
      args.model = value;
      i += 1;
    } else if (arg === "--review-model") {
      args.visionReviewModel = value;
      i += 1;
    } else if (arg === "--quality") {
      args.quality = value;
      i += 1;
    } else if (arg === "--size") {
      args.size = value;
      i += 1;
    } else if (arg === "--format") {
      args.outputFormat = value;
      i += 1;
    } else if (arg === "--out") {
      args.outDir = path.resolve(value);
      i += 1;
    } else if (arg === "--unit-cost") {
      args.outputUnitCostUsd = Number(value);
      args.explicitOutputPricing = true;
      i += 1;
    } else if (arg === "--input-token-cost") {
      args.inputTokenCostPerMillionUsd = Number(value);
      args.explicitInputPricing = true;
      i += 1;
    } else if (arg === "--delay-ms") {
      args.delayMs = Number(value);
      i += 1;
    } else if (arg === "--concurrency") {
      args.concurrency = Number(value);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (!["all", "core", "source-course", "expansion", "verified-v3", "reviewed-queue"].includes(args.source)) {
    console.error("--source must be all, core, source-course, expansion, or verified-v3");
    process.exit(1);
  }
  if (args.compositionFile && !["verified-v3", "reviewed-queue"].includes(args.source)) {
    throw new Error("--composition-file is available only with --source verified-v3");
  }
  if (args.source === "reviewed-queue" && !args.compositionFile) throw new Error("reviewed-queue requires --composition-file");
  if (args.reviewPending && !["verified-v3", "reviewed-queue"].includes(args.source)) throw new Error("--review-pending requires exact catalog entries");
  if (!Number.isFinite(args.minImageIntervalMs) || args.minImageIntervalMs < 0) throw new Error("Image interval must be a nonnegative number");
  if (!["low", "medium", "high", "auto"].includes(args.quality)) {
    console.error("--quality must be low, medium, high, or auto");
    process.exit(1);
  }
  if (!["1024x1024", "1024x1536", "1536x1024", "auto"].includes(args.size)) {
    console.error("--size must be 1024x1024, 1024x1536, 1536x1024, or auto");
    process.exit(1);
  }
  if (!["png", "webp", "jpeg"].includes(args.outputFormat)) {
    console.error("--format must be png, webp, or jpeg");
    process.exit(1);
  }
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) {
    console.error("--concurrency must be at least 1");
    process.exit(1);
  }

  // Environment rates belong to the configured model/settings, not a new CLI model.
  const configuredPricingApplies = args.model === DEFAULTS.model && args.quality === DEFAULTS.quality && args.size === DEFAULTS.size;
  args.explicitOutputPricing = argv.includes("--unit-cost") || (configuredPricingApplies && args.explicitOutputPricing);
  args.explicitInputPricing = argv.includes("--input-token-cost") || (configuredPricingApplies && args.explicitInputPricing);
  if (args.execute && !args.reviewPending && !hasCurrentPricingEstimate(args)) {
    throw new Error("Nonbaseline image model/quality/size requires explicit --unit-cost and --input-token-cost estimates before paid generation. Defaults price only gpt-image-1 medium 1024x1024.");
  }
  return args;
}

function hasCurrentPricingEstimate(args) {
  const baseline = args.model === "gpt-image-1" && args.quality === "medium" && args.size === "1024x1024";
  return (baseline || Boolean(args.explicitOutputPricing && args.explicitInputPricing)) &&
    Number.isFinite(args.outputUnitCostUsd) && args.outputUnitCostUsd >= 0 &&
    Number.isFinite(args.inputTokenCostPerMillionUsd) && args.inputTokenCostPerMillionUsd >= 0;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/generate-openai-word-images.js --dry-run
  node scripts/generate-openai-word-images.js --dry-run --source core --missing-only
  CONFIRM_IMAGE_SPEND=YES node scripts/generate-openai-word-images.js --execute --limit 25

Options:
  --source all|core|source-course|expansion|verified-v3  Vocabulary source. Default: ${DEFAULTS.source}
  --missing-only                   Skip words with any existing OpenAI, S3, or legacy image
  --include-phrases                Include multi-word learner phrases. Default: off
  --force                          Regenerate existing OpenAI image files
  --limit N                        Cap rows for testing. Default: no cap
  --write-plan FILE                Write the local plan JSON without calling OpenAI
  --ids a,b,c                      Only generate selected vocab/source ids
  --composition-file FILE         Exact verified-v3 selection and per-entry compositions
  --review-pending                Review current pending pixels only; never generate an image
  --omit-target-word              Omit the Nahuatl title from image prompts; retain exact metadata
  --checkpoint FILE               Durable per-entry request/result ledger
  --min-image-interval-ms N        Global spacing between image-generation starts
  --lessons 1,2,3                  Only generate selected lesson numbers
  --model MODEL                    Default: ${DEFAULTS.model}
  --review-model MODEL             Post-generation visual safety reviewer. Default: ${DEFAULTS.visionReviewModel}
  --quality low|medium|high|auto   Default: ${DEFAULTS.quality}
  --size 1024x1024|1024x1536|1536x1024|auto
  --format png|webp|jpeg           Default: ${DEFAULTS.outputFormat}
  --unit-cost N                    Output image cost. Default: $${DEFAULTS.outputUnitCostUsd}
  --input-token-cost N             Text input dollars per 1M tokens. Default: $${DEFAULTS.inputTokenCostPerMillionUsd}
  --out DIR                        Default: ${DEFAULTS.outDir}
  --delay-ms N                     Delay between paid calls. Default: ${DEFAULTS.delayMs}
  --concurrency N                  Parallel paid calls. Default: ${DEFAULTS.concurrency}
  --execute                        Actually call OpenAI and write image files
`);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf8").trim();
  return raw ? JSON.parse(raw) : fallback;
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSafetyKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isUrlLike(value) {
  return /(?:https?:\/\/|\/|\.[a-z0-9]{2,5}\b)/i.test(String(value || ""));
}

function hasExcludedHeadwordToken(value, excludedHeadwords) {
  if (!isUrlLike(value)) return false;
  return normalizeSafetyKey(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .some((token) => excludedHeadwords.has(token));
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function sanitizeGloss(gloss) {
  return String(gloss || "")
    .replace(/\s*\[[^\]]*(?:⚠|❌|NOTE|CORRECTED)[^\]]*\]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

let projectTsLoaderInstalled = false;

function installProjectTsLoader() {
  if (projectTsLoaderInstalled) return;
  projectTsLoaderInstalled = true;
  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function resolveProjectAlias(request, parent, isMain, options) {
    if (typeof request === "string" && request.startsWith("@/")) {
      const resolved = path.join(ROOT, "src", request.slice(2));
      const withTs = fs.existsSync(`${resolved}.ts`) ? `${resolved}.ts` : resolved;
      return originalResolveFilename.call(this, withTs, parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  require.extensions[".ts"] = function compileTypeScriptModule(mod, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: filename,
    }).outputText;
    mod._compile(output, filename);
  };
}

function loadProductionCoreTools() {
  installProjectTsLoader();
  const { filterCoreVocab } = require(path.join(ROOT, "src", "data", "excluded-vocab.ts"));
  const { collapseVariants } = require(path.join(ROOT, "src", "data", "variant-groups.ts"));
  const { orthographySearchVariants } = require(path.join(ROOT, "src", "lib", "orthography.ts"));
  const { getCuratedUnitVocab } = require(path.join(ROOT, "src", "data", "curated-unit-vocab.ts"));
  const { getAllUnits, getUnitVocab } = require(path.join(ROOT, "src", "lib", "db.ts"));
  const { getVocabCardImage, getVocabCardImageHold } = require(path.join(ROOT, "src", "data", "word-images.ts"));
  return { filterCoreVocab, collapseVariants, orthographySearchVariants, getCuratedUnitVocab, getAllUnits, getUnitVocab, getVocabCardImage, getVocabCardImageHold };
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath);
  }
}

function loadCoreRows(args) {
  const { collapseVariants, getAllUnits, getUnitVocab, getVocabCardImageHold } = loadProductionCoreTools();
  const { toInaliOrthography } = require(path.join(ROOT, "src", "lib", "orthography.ts"));
  const imageReviews = readJson(path.join(ROOT, "src", "data", "image-content-review.json"), { cards: [] });
  const structuredCueIds = new Set(imageReviews.cards.filter((row) => row.status === "structured-cue").map((row) => row.id));
  return getAllUnits().flatMap((unit) => collapseVariants(getUnitVocab(unit.lesson_number), unit.lesson_number).cards.map((row) => ({
      source: "core",
      sourceId: row.entry_id || String(row.id),
      id: row.id,
      lessonNumber: unit.lesson_number,
      rank: row.rank,
      headword: toInaliOrthography(row.headword),
      gloss: row.gloss_en,
      partOfSpeech: row.part_of_speech,
      semanticDomain: row.semantic_domain,
      sourceUrl: row.sourceUrl,
      imageReuseHeadword: row.imageHeadword || row.headword,
      sourceSpelling: row.headword,
      mediaCard: row,
      imageBindingHeld: Boolean(getVocabCardImageHold(row)),
      imageGenerationExcluded: structuredCueIds.has(row.id),
    }))).filter((row) => !row.imageGenerationExcluded && includeRow(args, row));
}

function loadExpansionRows(args) {
  installProjectTsLoader();
  const { LEXICAL_EXPANSION } = require(path.join(ROOT, "src", "data", "lexical-expansion.ts"));
  const { getWordImage } = require(path.join(ROOT, "src", "data", "word-images.ts"));
  return LEXICAL_EXPANSION.map((entry) => ({ source: "expansion", sourceId: entry.id, id: entry.cardId,
    lessonNumber: entry.lessonNumber, rank: entry.cardId, headword: entry.headword, gloss: entry.english,
    partOfSpeech: entry.partOfSpeech, sourceUrl: entry.source.url, meaningEs: entry.spanish, sourceSpelling: entry.sourceSpelling,
    imageBindingHeld: !getWordImage(entry.headword, { allowLegacyFallback: true, safetyText: [entry.english, entry.partOfSpeech] }),
  })).filter((row) => includeRow(args, row));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactLegacyImageRow(row, catalogSource, catalogHash, meaningEs) {
  const id = catalogSource === "core" ? `core-${row.id}` : row.sourceId;
  const evidence = { entry_id: id, headword: row.headword, meaning_en: row.gloss, meaning_es: meaningEs,
    source_spelling: row.sourceSpelling || row.headword, source_url: row.sourceUrl || null,
    source_locator: { catalog_source: catalogSource, original_id: row.id, lesson_number: row.lessonNumber, source_id: row.sourceId },
    part_of_speech: row.partOfSpeech || "", catalog_sha256: catalogHash };
  const { catalog_sha256: _snapshot, ...lexicalEvidence } = evidence;
  return { ...row, source: "reviewed-queue", catalogSource, exactIdentity: true, id, sourceId: id, meaningEs,
    originalSafetyLabels: [row.sourceSpelling, row.gloss, meaningEs],
    provenance: { ...evidence, lexical_review_hash: sha256(JSON.stringify(lexicalEvidence)) } };
}

function exactCoreReviewedModeEvidence(item, course, courseSha256, allowlist) {
  if (item.catalogSource !== "core" || courseSha256 !== "36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f") return null;
  const expected = {
    "core-808016": { headword: "noixtiyol", gloss: "my eye", meaningEs: "mi ojo", spelling: "noīxtiyōl", lesson: 8, vocabulary: 16, mode: "adult-body" },
    "core-808024": { headword: "nomahpil", gloss: "my finger", meaningEs: "mi dedo", spelling: "nomāhpil", lesson: 8, vocabulary: 24, mode: "adult-body" },
    "core-644": { headword: "kokolistli", gloss: "sickness", meaningEs: "enfermedad", spelling: "cocoliztli", lesson: 29, vocabulary: null, mode: "object-only" },
  }[item.id];
  if (!expected || item.headword !== expected.headword || item.gloss !== expected.gloss || item.meaningEs !== expected.meaningEs ||
      normalizeSafetyKey(item.sourceSpelling) !== normalizeSafetyKey(expected.spelling) || item.lessonNumber !== expected.lesson) return null;
  const lesson = course.lessons.find(entry => entry.number === expected.lesson);
  if (!lesson) return null;
  if (expected.vocabulary) {
    const fact = lesson.vocabulary[expected.vocabulary - 1];
    if (fact?.headword !== expected.spelling || fact.gloss !== expected.gloss) return null;
  } else if (!/cocoliztli/iu.test(normalizeSafetyKey(lesson.title || ""))) return null;
  const reviewed = allowlist.byHeadword.get(normalizeSafetyKey(expected.spelling));
  if (!reviewed || reviewed.mode !== expected.mode) return null;
  return { entry_id: item.id, headword: item.headword, meaning_en: item.gloss, meaning_es: item.meaningEs,
    source_spelling: expected.spelling, source_import_sha256: courseSha256, lesson_number: expected.lesson,
    vocabulary_index: expected.vocabulary, evidence_role: expected.vocabulary ? "exact-licensed-vocabulary" : "licensed-illnesses-title",
    reviewed_image_mode: reviewed.mode, reviewed_image_mode_sha256: sha256(JSON.stringify(reviewed)) };
}

function loadReviewedQueueRows(args) {
  const bytes = fs.readFileSync(args.compositionFile);
  const config = JSON.parse(bytes.toString("utf8"));
  verifiedV3CompositionIds(config);
  for (const entry of config.entries) if (!["verified-v3", "core", "expansion"].includes(entry.catalog_source)) {
    throw new Error(`reviewed-queue requires a known catalog_source: ${entry.entry_id}`);
  }
  const allArgs = { ...args, ids: new Set(), lessons: new Set(), compositionFile: "" };
  const rows = [];
  const v3Ids = config.entries.filter(entry => entry.catalog_source === "verified-v3").map(entry => entry.entry_id);
  if (v3Ids.length) rows.push(...loadVerifiedV3Rows({ ...allArgs, ids: new Set(v3Ids) }));
  if (config.entries.some(entry => entry.catalog_source === "core")) {
    const core = loadCoreRows(allArgs);
    const { tr } = require(path.join(ROOT, "src", "i18n", "translate.ts"));
    const translations = { ...require(path.join(ROOT, "src", "i18n", "es.generated.json")), ...require(path.join(ROOT, "src", "i18n", "es.overrides.json")) };
    const coreHash = sha256(JSON.stringify(core.map(row => ({ id: row.id, headword: row.headword, gloss: row.gloss, sourceSpelling: row.sourceSpelling }))));
    rows.push(...core.map(row => exactLegacyImageRow(row, "core", coreHash, Object.hasOwn(translations, row.gloss) ? tr("es", row.gloss) : "")));
    const courseBytes = fs.readFileSync(SOURCE_COURSE_PATH);
    const course = JSON.parse(courseBytes.toString("utf8"));
    const allowlist = loadReviewedAllowlist();
    for (const item of rows) {
      const modeEvidence = exactCoreReviewedModeEvidence(item, course, sha256(courseBytes), allowlist);
      if (modeEvidence) item.provenance.reviewed_image_mode_evidence = modeEvidence;
    }
  }
  if (config.entries.some(entry => entry.catalog_source === "expansion")) {
    const packHash = sha256(fs.readFileSync(path.join(ROOT, "src", "data", "lexical-expansion.json")));
    rows.push(...loadExpansionRows(allArgs).map(row => exactLegacyImageRow(row, "expansion", packHash, row.meaningEs || "")));
  }
  return applyVerifiedV3Compositions(rows, config, args, sha256(bytes), loadBlocklist());
}

function buildVerifiedV3Rows(catalog, args, snapshot, labelReviewer, buildingBlockReviewer) {
  const entries = catalog.entries || [];
  const knownIds = new Set(entries.map((entry) => entry.id));
  for (const id of args.ids) {
    if (!knownIds.has(id)) throw new Error(`Unknown verified V3 entry ID: ${id}`);
  }
  return entries.filter((entry) => !args.ids.size || args.ids.has(entry.id)).map((entry, index) => {
    if (!/^word-v3[a-z]*-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || entry.verification?.status !== "source-supported") {
      throw new Error(`Verified V3 image requires a stable source-supported entry: ${entry.id}`);
    }
    if (!entry.display || !entry.meaningEn || !entry.meaningEs || !entry.sourceSpelling || !entry.sourceUrl || !entry.sourceLocator || !entry.formKind) {
      throw new Error(`Verified V3 image is missing its selected meaning or provenance: ${entry.id}`);
    }
    if (!VERIFIED_V3_FORM_KINDS.has(entry.formKind)) {
      throw new Error(`Unknown verified V3 form kind requires review: ${entry.id}: ${entry.formKind}`);
    }
    const correction = labelReviewer(entry.id, entry.meaningEn, entry.meaningEs, entry.sourceLocator.sourceFactReviewHash);
    if (correction && correction.display !== entry.display) {
      throw new Error(`Reviewed V3 image label cannot change the written form: ${entry.id}`);
    }
    const meaningEn = correction?.meaningEn ?? entry.meaningEn;
    const meaningEs = correction?.meaningEs ?? entry.meaningEs;
    const compositionInstruction = VERIFIED_V3_COMPOSITIONS[entry.id] || "";
    const provenance = {
      entry_id: entry.id,
      headword: entry.display,
      meaning_en: meaningEn,
      meaning_es: meaningEs,
      source_spelling: entry.sourceSpelling,
      source_url: entry.sourceUrl,
      source_locator: entry.sourceLocator,
      source_fact_review_hash: entry.sourceLocator.sourceFactReviewHash || null,
      source_import_sha256: entry.sourceLocator.sourceImportSha256 || null,
      lexical_review_hash: sha256(JSON.stringify({ verification: entry.verification, sourceLocator: entry.sourceLocator, meaningEn, meaningEs, correction })),
      catalog_sha256: snapshot.catalogSha256,
      reviewed_labels_sha256: snapshot.reviewedLabelsSha256,
      ...(snapshot.learnerSensesSha256 ? { learner_senses_sha256: snapshot.learnerSensesSha256 } : {}),
      ...(correction?.selectedSenseOnly ? { selected_sense: {
        original_meaning_en: entry.meaningEn, original_meaning_es: entry.meaningEs,
        meaning_en: meaningEn, meaning_es: meaningEs, source_fact_review_hash: correction.sourceFactReviewHash,
        evidence: correction.evidence, source_url: correction.sourceUrl,
      } } : {}),
    };
    return {
      source: "verified-v3", sourceId: entry.id, id: entry.id,
      lessonNumber: entry.sourceLocator.lessonNumber, rank: index,
      headword: entry.display, gloss: meaningEn, meaningEs,
      partOfSpeech: entry.partOfSpeech, formKind: entry.formKind,
      isBuildingBlock: buildingBlockReviewer(entry),
      sourceUrl: entry.sourceUrl, sourceSpelling: entry.sourceSpelling,
      // Safety approval cannot be waived by changing a reviewed display label.
      originalSafetyLabels: correction?.selectedSenseOnly ? [entry.sourceSpelling, meaningEn, meaningEs]
        : [entry.sourceSpelling, entry.meaningEn, entry.meaningEs, meaningEs],
      usageNote: correction?.usageNoteEn ?? entry.usageNoteEn ?? "",
      compositionInstruction, requireNoPeople: Boolean(compositionInstruction), provenance,
    };
  }).filter((row) => includeRow(args, row));
}

function loadVerifiedV3Rows(args) {
  const catalogBytes = fs.readFileSync(VERIFIED_V3_PATH);
  const labelBytes = fs.readFileSync(REVIEWED_LABELS_PATH);
  const senseBytes = fs.readFileSync(LEARNER_SENSES_PATH);
  const { reviewedVocabularyLabel } = require(path.join(ROOT, "src", "lib", "reviewed-vocabulary-labels.cjs"));
  installProjectTsLoader();
  const { isExpansionBuildingBlock } = require(path.join(ROOT, "src", "lib", "expansion-practice.ts"));
  const catalog = JSON.parse(catalogBytes.toString("utf8"));
  const compositionBytes = args.compositionFile ? fs.readFileSync(args.compositionFile) : null;
  const compositionFile = compositionBytes ? JSON.parse(compositionBytes.toString("utf8")) : null;
  const catalogArgs = compositionFile ? { ...args, ids: verifiedV3CompositionIds(compositionFile), lessons: new Set() } : args;
  const rows = buildVerifiedV3Rows(catalog, catalogArgs, {
    catalogSha256: sha256(catalogBytes), reviewedLabelsSha256: sha256(labelBytes), learnerSensesSha256: sha256(senseBytes),
  }, reviewedVocabularyLabel, isExpansionBuildingBlock);
  return compositionFile ? applyVerifiedV3Compositions(rows, compositionFile, args, sha256(compositionBytes), loadBlocklist()) : rows;
}

function verifiedV3CompositionIds(config) {
  if (config?.schema_version !== 1 || !Array.isArray(config.entries) || !config.entries.length) {
    throw new Error("Composition file requires schema_version 1 and a nonempty entries array");
  }
  const ids = new Set();
  for (const entry of config.entries) {
    if (!entry || typeof entry !== "object" || typeof entry.entry_id !== "string") {
      throw new Error("Composition entry requires an exact verified V3 entry_id");
    }
    if (ids.has(entry.entry_id)) throw new Error(`Duplicate composition entry ID: ${entry.entry_id}`);
    ids.add(entry.entry_id);
  }
  return ids;
}

function applyVerifiedV3Compositions(catalogRows, config, args, fileSha256, blocklist) {
  verifiedV3CompositionIds(config);
  const byId = new Map(catalogRows.map((row) => [row.id, row]));
  const seen = new Set();
  const composed = config.entries.map((entry) => {
    if (!entry || typeof entry !== "object" || typeof entry.entry_id !== "string") {
      throw new Error("Composition entry requires an exact verified V3 entry_id");
    }
    if (seen.has(entry.entry_id)) throw new Error(`Duplicate composition entry ID: ${entry.entry_id}`);
    seen.add(entry.entry_id);
    const row = byId.get(entry.entry_id);
    if (!row) throw new Error(`Unknown composition entry ID: ${entry.entry_id}`);
    if (entry.catalog_source && entry.catalog_source !== (row.catalogSource || row.source)) throw new Error(`Composition catalog source differs: ${entry.entry_id}`);
    if (entry.headword !== row.headword || entry.meaning_en !== row.gloss || entry.meaning_es !== row.meaningEs) {
      throw new Error(`Composition meaning/headword differs from current reviewed V3 entry: ${entry.entry_id}`);
    }
    if (typeof entry.require_no_people !== "boolean" || typeof entry.composition_instruction !== "string" || !entry.composition_instruction.trim()) {
      throw new Error(`Composition requires a boolean require_no_people and nonempty instruction: ${entry.entry_id}`);
    }
    if (/\b(?:ignore|override|bypass|disable|waive|disregard|relax|suspend)\b.{0,80}\b(?:safety|hard|rules?|guardrails?|restrictions?|moderation|review)\b/iu.test(entry.composition_instruction)) {
      throw new Error(`Composition cannot override image safeguards: ${entry.entry_id}`);
    }
    const unsafe = classifyBlocked({ ...row, gloss: entry.composition_instruction, glosses: [], originalSafetyLabels: [] }, blocklist);
    if (unsafe?.nonOverridable) {
      throw new Error(`Composition violates a non-overridable image rule: ${entry.entry_id}: ${unsafe.category}`);
    }
    return {
      ...row, compositionInstruction: entry.composition_instruction.trim(), requireNoPeople: entry.require_no_people,
      provenance: { ...row.provenance, composition_file_sha256: fileSha256,
        composition_sha256: sha256(JSON.stringify({ instruction: entry.composition_instruction.trim(), requireNoPeople: entry.require_no_people })) },
    };
  });
  if (args.ids.size && (args.ids.size !== seen.size || [...args.ids].some((id) => !seen.has(id)))) {
    throw new Error("Explicit --ids must exactly match all composition file entry IDs");
  }
  if (args.lessons.size) throw new Error("--lessons cannot narrow a composition file selection; select exact entries in the file");
  return composed;
}

function loadSourceCourseRows(args) {
  const course = readJson(SOURCE_COURSE_PATH, { lessons: [] });
  const rows = [];
  for (const lesson of course.lessons || []) {
    for (const [index, item] of (lesson.vocabulary || []).entries()) {
      if (!item.headword) continue;
      rows.push({
        source: "source-course",
        sourceId: `source-${lesson.number}-${index + 1}`,
        id: `source-${lesson.number}-${index + 1}`,
        lessonNumber: lesson.number,
        rank: index + 1,
        headword: item.headword,
        gloss: item.gloss || "",
        partOfSpeech: "",
        semanticDomain: "",
        sourceUrl: lesson.originalUrl,
      });
    }
  }
  return rows.filter((row) => includeRow(args, row));
}

function includeRow(args, row) {
  if (args.ids.size && !args.ids.has(String(row.id)) && !args.ids.has(String(row.sourceId))) {
    return false;
  }
  if (args.lessons.size && !args.lessons.has(Number(row.lessonNumber))) return false;
  return true;
}

function loadVocabulary(args) {
  const rows = [];
  if (args.source === "all" || args.source === "core") rows.push(...loadCoreRows(args));
  if (args.source === "all" || args.source === "source-course") rows.push(...loadSourceCourseRows(args));
  if (args.source === "expansion") rows.push(...loadExpansionRows(args));
  if (args.source === "verified-v3") rows.push(...loadVerifiedV3Rows(args));
  if (args.source === "reviewed-queue") rows.push(...loadReviewedQueueRows(args));
  return dedupeRows(rows, args);
}

function dedupeRows(rows, args) {
  const byHeadword = new Map();
  for (const row of rows) {
    if (!isWordLike(row, args)) continue;

    // Entry IDs preserve the reviewed sense; headword-only reuse is not safe for V3.
    const key = (row.source === "verified-v3" || row.exactIdentity) ? row.id : normalizeKey(row.headword);
    if (!key) continue;

    const gloss = (row.source === "verified-v3" || row.exactIdentity) ? row.gloss : sanitizeGloss(row.gloss);
    const existing = byHeadword.get(key);
    if (!existing) {
      byHeadword.set(key, {
        ...row,
        gloss,
        sources: [row.source],
        sourceIds: [row.sourceId],
        glosses: gloss ? [gloss] : [],
      });
      continue;
    }

    if ((row.source === "verified-v3" || row.exactIdentity)) {
      if (JSON.stringify(existing.provenance) !== JSON.stringify(row.provenance)) {
        throw new Error(`Conflicting verified V3 meanings for entry ID: ${row.id}`);
      }
      continue;
    }
    if (!existing.sources.includes(row.source)) existing.sources.push(row.source);
    if (!existing.sourceIds.includes(row.sourceId)) existing.sourceIds.push(row.sourceId);
    if (gloss && !existing.glosses.some((value) => normalizeKey(value) === normalizeKey(gloss))) {
      existing.glosses.push(gloss);
    }
    existing.gloss = existing.gloss || gloss;
  }

  return [...byHeadword.values()].sort((a, b) => {
    const lessonA = Number(a.lessonNumber || 999);
    const lessonB = Number(b.lessonNumber || 999);
    if (lessonA !== lessonB) return lessonA - lessonB;
    return normalizeKey(a.headword).localeCompare(normalizeKey(b.headword));
  });
}

function isWordLike(row, args) {
  if ((row.source === "verified-v3" || row.exactIdentity) && row.isBuildingBlock) return false;
  const headword = String(row.headword || "").trim();
  if (!headword) return false;
  // Exact catalog approval covers complete questions, numbers and expressions.
  // Legacy spelling heuristics must not silently remove reviewed V3 concepts.
  if ((row.source === "verified-v3" || row.exactIdentity) || row.exactIdentity) return headword.length <= 160;

  if (isTypographyItem(row)) return headword.length <= 80;
  if (row.source === "core") return headword.length <= 160;

  if (headword.length > 80) return false;
  if (/\d/.test(headword)) return false;
  if (/[→.!?¿¡:;]/.test(headword)) return false;
  if (/[\[\]{}()]/.test(headword)) return false;
  if (/[\/|]/.test(headword)) return false;

  const words = headword.split(/\s+/).filter(Boolean);
  if (!args.includePhrases && words.length > 1) return false;
  if (words.length > 4) return false;

  return true;
}

function isTypographyItem(row) {
  const pos = String(row.partOfSpeech || "").toLowerCase();
  return pos === "letter" || pos === "phoneme";
}

function loadBlocklist() {
  const config = readJson(BLOCKLIST_PATH, { blockedHeadwords: [], rules: [] });
  return {
    nonOverridableCategories: new Set(config.nonOverridableCategories || []),
    nonOverridableHeadwords: new Set((config.nonOverridableHeadwords || []).map(normalizeSafetyKey)),
    nonOverridableDepictionRules: (config.nonOverridableDepictionRules || []).map((rule) => ({
      category: rule.category,
      pattern: new RegExp(rule.pattern, "iu"),
    })),
    bathingCompositionInstruction: config.bathingCompositionInstruction || "",
    blockedHeadwords: new Set((config.blockedHeadwords || []).map(normalizeKey)),
    objectOnlyHeadwords: new Set((config.objectOnlyHeadwords || []).map(normalizeKey)),
    objectOnlyRules: (config.objectOnlyRules || []).map((rule) => ({
      category: rule.category || "object-only",
      pattern: new RegExp(rule.pattern, "i"),
    })),
    rules: (config.rules || []).map((rule) => ({
      category: rule.category || "blocked",
      pattern: new RegExp(rule.pattern, "i"),
    })),
  };
}

function loadReviewedAllowlist() {
  const config = readJson(REVIEWED_ALLOWLIST_PATH, { entries: [] });
  const byHeadword = new Map();
  for (const entry of config.entries || []) {
    if (!entry?.headword) continue;
    byHeadword.set(normalizeSafetyKey(entry.headword), {
      headword: entry.headword,
      mode: entry.mode || "reviewed",
      instruction: entry.instruction || "",
    });
  }
  return {
    defaultNoChildrenInstruction: config.defaultNoChildrenInstruction || "",
    babyExceptionInstruction: config.babyExceptionInstruction || "",
    byHeadword,
  };
}

function exactV3ReviewedImageContext(item) {
  const expected = {
    "word-v3rf-88efbeb4cda71e0c": { headword: "ganchohwia", meaningEn: "put clothing on a hanger", meaningEs: "poner ropa en una percha",
      lexicalHash: "fa2e14640c4c13ca9dd94075e76111b2d8a8acf345c4e4925607aff62604784f", factHash: "fb64a49dbdb7e4216478588ba41576cbecb73721c56073548fcc14d0244c811a",
      mode: "object-only", softCategory: "weapons-or-violence", softMatch: "hang",
      instruction: "Show only one empty opaque long-sleeved garment on a plain clothing hanger and wall hook. No people, faces, human silhouettes or human reflections." },
    "word-v3rf-c2839cdbc84fb3ef": { headword: "mokwitlawia", meaningEn: "look after someone", meaningEs: "cuidar a alguien",
      lexicalHash: "982694c22d029386f3f2d82dcd484e26d1b4b87a42f16f9ddbf2f29c47b6e8eb", factHash: "7e0c0b94fccf6343e07d7a27371e76f4964de8fca4bf38b1535ae3a4e2323f2e",
      mode: "adult-only", appMatch: "mocuitlahui",
      instruction: "Use only clearly grown adults aged twenty-five or older in modest opaque everyday clothing. Follow the required exact-entry composition for ordinary benign care. Do not introduce intimate exposure, coercion, humiliation, injury or a compromising care procedure." },
    "word-v3pn-fc5d1162107714e3": { headword: "tepeikxitlan", meaningEn: "at the lower end of the hill", meaningEs: "en el extremo inferior del cerro",
      lexicalHash: "d788d76b328fa20803036bfd6bff72a96e2ed7e489fdfce6142dfd9f5c715168", factHash: "48ae3dcf4778a7c770325736fe7111e692e8d0d459fbfa2f42381367124f6b02",
      mode: "object-only", softCategory: "anatomy-card-risk", softMatch: "foot",
      instruction: "Show only an empty natural hill and one plain stone at its lower base where it meets flat surrounding ground. No people, human silhouettes or human reflections." },
  }[item.id];
  const evidence = item.provenance;
  if (!expected || item.source !== "verified-v3" || item.headword !== expected.headword || item.gloss !== expected.meaningEn ||
      item.meaningEs !== expected.meaningEs || evidence?.lexical_review_hash !== expected.lexicalHash ||
      evidence.source_fact_review_hash !== expected.factHash || evidence.source_locator?.sourceFactReviewHash !== expected.factHash ||
      evidence.source_locator.referenceFileSha256 !== "bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc") return null;
  return { ...expected, headword: item.headword, exactContext: true };
}

function reviewedAllowlistEntry(item, allowlist) {
  // Historical headword exceptions do not approve a newly selected V3 sense.
  if ((item.source === "verified-v3" || item.exactIdentity)) {
    const context = exactV3ReviewedImageContext(item);
    if (context) return context;
    const evidence = item.provenance?.reviewed_image_mode_evidence;
    if (!evidence || evidence.entry_id !== item.id || evidence.headword !== item.headword || evidence.meaning_en !== item.gloss ||
        evidence.meaning_es !== item.meaningEs || evidence.source_import_sha256 !== "36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f") return null;
    const reviewed = allowlist.byHeadword.get(normalizeSafetyKey(evidence.source_spelling));
    return reviewed && sha256(JSON.stringify(reviewed)) === evidence.reviewed_image_mode_sha256 ? reviewed : null;
  }
  return allowlist.byHeadword.get(normalizeSafetyKey(item.headword)) || null;
}

function loadAppContentExclusions() {
  const config = readJson(APP_CONTENT_EXCLUSIONS_PATH, { headwords: [], patterns: [] });
  return {
    headwords: new Set((config.headwords || []).map(normalizeSafetyKey)),
    rules: (config.patterns || []).map((pattern) => new RegExp(pattern, "iu")),
    learnerEntryIds: new Set((config.learnerSenseExclusions || []).map(entry => entry.entryId)),
    learnerHeadwords: new Set((config.learnerExcludedHeadwords || []).map(normalizeSafetyKey)),
    learnerSenseRules: (config.learnerSenseRules || []).map(rule => ({category: rule.category, pattern: new RegExp(rule.pattern, "iu")})),
  };
}

// These are source-alias false matches for exact selected senses, not permission
// to draw any prohibited scene. Composition and actual pixel rules still apply.
function sourceQualifiedImageAliases(item) {
  const evidence = item.provenance;
  if (!evidence || evidence.entry_id !== item.id || evidence.headword !== item.headword ||
      evidence.meaning_en !== item.gloss || evidence.meaning_es !== item.meaningEs) return [];
  const expected = {
    "word-v3rf-c2839cdbc84fb3ef": { source: "verified-v3", headword: "mokwitlawia", en: "look after someone", es: "cuidar a alguien",
      lexical: "982694c22d029386f3f2d82dcd484e26d1b4b87a42f16f9ddbf2f29c47b6e8eb",
      fact: "7e0c0b94fccf6343e07d7a27371e76f4964de8fca4bf38b1535ae3a4e2323f2e", aliases: ["mocuitlahuia", "mokwitlawia"] },
    "word-v3rf-c571e43a0548dd42": { source: "verified-v3", headword: "teka", en: "pour a liquid", es: "verter un líquido",
      lexical: "ab8e9250a9ca86aca80cf0943e8f8808e5f58f6ece9f4a4c4d93a14dfcfdd0f6",
      fact: "b6260e157e4c266fd191b87adfbfbb2d4b823dd2faf4cb770168ce4d08869a34", aliases: ["teca"] },
    "core-7706": { source: "reviewed-queue", headword: "notlakal", en: "my property", es: "mi propiedad",
      lexical: "70221a69cf49a35d2d06a8178471a44a5b5b6ee90448123b501425bd1424a67f", aliases: ["notlacal"] },
  }[item.id];
  if (!expected || item.source !== expected.source || item.headword !== expected.headword || item.gloss !== expected.en ||
      item.meaningEs !== expected.es || evidence.lexical_review_hash !== expected.lexical) return [];
  if (expected.fact && (evidence.source_fact_review_hash !== expected.fact || evidence.source_locator?.sourceFactReviewHash !== expected.fact)) return [];
  if (item.id === "word-v3rf-c571e43a0548dd42" && (!evidence.selected_sense || evidence.selected_sense.source_fact_review_hash !== expected.fact ||
      evidence.selected_sense.original_meaning_en !== "lay someone down; pour a liquid" ||
      evidence.selected_sense.original_meaning_es !== "acostar a alguien; verter un líquido")) return [];
  if (item.id === "core-7706" && (item.catalogSource !== "core" || !item.exactIdentity || evidence.source_spelling !== "notlacal" ||
      evidence.source_locator?.original_id !== 7706 || evidence.source_locator.lesson_number !== 8)) return [];
  return expected.aliases;
}

function qualifiedImageClassifierText(item, values) {
  let text = normalizeSafetyKey(values.filter(Boolean).join(" "));
  for (const alias of sourceQualifiedImageAliases(item)) {
    text = text.replace(new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])${alias}(?![\\p{L}\\p{M}\\p{N}_])`, "gu"), " ");
  }
  return text;
}

function allowsNeutralFirearmComposition(item) {
  const proof = item.provenance;
  if (!(item.source === "verified-v3" || item.exactIdentity) || item.requireNoPeople !== true ||
      !item.compositionInstruction || !proof || proof.entry_id !== item.id || proof.headword !== item.headword ||
      proof.meaning_en !== item.gloss || proof.meaning_es !== item.meaningEs || !/^[a-f0-9]{64}$/.test(proof.lexical_review_hash || "")) return false;
  const sense = normalizeSafetyKey([item.gloss, item.meaningEs, ...(item.originalSafetyLabels || [])].join(" "));
  if (!/\b(?:firearm|gun|rifle|pistol|cannon|shoot|shoots|shooting|dispara|disparar|arma de fuego)\b/u.test(sense) ||
      /\b(?:someone|somebody|people|person|human|animal|kill|kills|killing|murder|harm|hurt|wound|alguien|persona|matar|herir)\b/u.test(sense)) return false;
  // Explicitly require the firearm in the selected object-only composition.
  return /\b(?:firearm|gun|rifle|pistol|cannon)\b/iu.test(item.compositionInstruction);
}

function classifyAppExcluded(item, exclusions) {
  if (exclusions.learnerHeadwords?.has(normalizeSafetyKey(item.headword)) || exclusions.learnerHeadwords?.has(normalizeSafetyKey(item.sourceSpelling))) {
    return { category: "app-content-excluded", match: item.headword, nonOverridable: true };
  }
  if (exclusions.learnerEntryIds?.has(item.id)) {
    return { category: "app-content-excluded", match: item.id, nonOverridable: true };
  }
  const values = [
    item.headword,
    item.gloss,
    ...(item.glosses || []),
    ...(item.originalSafetyLabels || []),
    item.partOfSpeech,
    item.semanticDomain,
    item.sourceUrl,
  ]
    .filter(Boolean)
    .map(String);

  const selectedSense = normalizeSafetyKey([item.gloss, item.meaningEs, ...(item.glosses || [])].filter(Boolean).join(" "))
    .replace(/\b(?:same[- ]sex (?:relationship|couple|couples|orientation|marriage)|sexual orientation|gender identity)\b/gu, "neutral identity");
  for (const rule of exclusions.learnerSenseRules || []) {
    const match = selectedSense.match(rule.pattern);
    if (match) return { category: "app-content-excluded", match: match[0], learnerCategory: rule.category, nonOverridable: true };
  }
  for (const value of values) {
    if (sourceQualifiedImageAliases(item).includes(normalizeSafetyKey(value))) continue;
    if (
      exclusions.headwords.has(normalizeSafetyKey(value)) ||
      hasExcludedHeadwordToken(value, exclusions.headwords)
    ) {
      return { category: "app-content-excluded", match: value };
    }
  }

  const haystack = qualifiedImageClassifierText(item, values);
  const normalizedHaystack = haystack;
  for (const rule of exclusions.rules) {
    const match = haystack.match(rule) || normalizedHaystack.match(rule);
    if (match) return { category: "app-content-excluded", match: match[0] };
  }

  return null;
}

function classifyBlocked(item, blocklist) {
  if (blocklist.nonOverridableHeadwords?.has(normalizeSafetyKey(item.headword))) {
    return { category: "prohibited-anatomy-headword", match: item.headword, nonOverridable: true };
  }
  const haystack = qualifiedImageClassifierText(item, [
    item.headword,
    item.gloss,
    ...(item.glosses || []),
    ...(item.originalSafetyLabels || []),
    item.partOfSpeech,
    item.semanticDomain,
  ]);
  const normalizedHaystack = normalizeSafetyKey(haystack);
  // Check hard rules before an exact headword exception can hide the gloss.
  for (const rule of blocklist.nonOverridableDepictionRules || []) {
    const match = haystack.match(rule.pattern) || normalizedHaystack.match(rule.pattern);
    if (match) return { category: rule.category, match: match[0], nonOverridable: true };
  }
  for (const rule of blocklist.rules) {
    if (!blocklist.nonOverridableCategories?.has(rule.category)) continue;
    const match = haystack.match(rule.pattern) || normalizedHaystack.match(rule.pattern);
    if (match) return { category: rule.category, match: match[0], nonOverridable: true };
  }
  const headwordKey = normalizeKey(item.headword);
  if (blocklist.blockedHeadwords.has(headwordKey)) {
    return { category: "blocked-headword", match: item.headword };
  }

  for (const rule of blocklist.rules) {
    const match = haystack.match(rule.pattern);
    if (match && rule.category === "weapons-or-violence" && allowsNeutralFirearmComposition(item) &&
        /^(?:weapon|gun|rifle|pistol|shoot)$/iu.test(match[0])) continue;
    if (match && rule.category === "anatomy-card-risk" && normalizeSafetyKey(match[0]) === "palm" &&
        /\bpalm trees?\b/iu.test(item.gloss || "") &&
        ![item.gloss, ...(item.originalSafetyLabels || [])].some(value => /\b(?:hands?|palm of)\b/iu.test(value || ""))) continue;
    if (match) return { category: rule.category, match: match[0] };
  }

  return null;
}

function classifyObjectOnly(item, blocklist) {
  const headwordKey = normalizeKey(item.headword);
  if (blocklist?.objectOnlyHeadwords?.has(headwordKey)) {
    return { category: "object-only-headword", match: item.headword };
  }

  const haystack = [
    item.headword,
    item.gloss,
    ...(item.glosses || []),
    item.partOfSpeech,
    item.semanticDomain,
  ]
    .filter(Boolean)
    .join(" ");

  for (const rule of blocklist?.objectOnlyRules || []) {
    const match = haystack.match(rule.pattern);
    if (match) return { category: rule.category, match: match[0] };
  }

  return null;
}

function allowsRequestedQuestionMark(item, instruction) {
  if (!(item.source === "verified-v3" || item.exactIdentity) || typeof item.id !== "string" || !item.id || !item.provenance || item.provenance.entry_id !== item.id ||
      item.provenance.headword !== item.headword || item.provenance.meaning_en !== item.gloss ||
      item.provenance.meaning_es !== item.meaningEs || !/^[a-f0-9]{64}$/.test(item.provenance.lexical_review_hash || "")) return false;
  const meaning = normalizeKey(item.gloss);
  const inquiryPos = /(?:interrogative|question word|inquiry|uncertainty)/iu.test(item.partOfSpeech || "");
  const approvedInquiryMeaning = ["question", "inquiry", "uncertainty", "doubt", "ask a question", "to ask a question", "i do not know", "i don't know"].includes(meaning) ||
    /^(?:who|what|which|when|where|why|how(?: (?:much|many|long|often))?)\?$/u.test(meaning) ||
    meaning.split(/\s*[;,]\s*/u).every(part => ["perhaps", "maybe"].includes(part));
  if (!(approvedInquiryMeaning || (inquiryPos && /\?$/.test(meaning)))) return false;
  return String(instruction || "").split(/[.;\n]/u).some(clause => {
    if (/^\s*(?:no|never|do not|don't|avoid|omit|exclude|without)\b/iu.test(clause)) return false;
    return /\b(?:show|add|include|use|draw|place|render|depict)\b(?:(?!\b(?:no|never|without|avoid|omit|exclude)\b).){0,180}\bquestion[- ]marks?\b/iu.test(clause);
  });
}

function approvedAdultVisualBrief(item) {
  const expected = {
    "word-v3f-752dfc0ef9593f5b": { headword: "ichpokatik", en: "adult woman with an adolescent appearance", es: "mujer adulta con apariencia adolescente",
      lexical: "b65d0bf0f764ab4c650516e5924fe67d2be113846a654080a67850ae3fc526d0", fact: "1541c65599cdfc6c82bc06f96a9cd8a06979178debcdd7e7100668a5d89da269",
      scene: "One fully clothed twenty-five-year-old adult woman with clearly grown-adult facial structure, wearing an ordinary opaque blouse, modest skirt or trousers and shoes in a calm everyday setting." },
    "word-v3f-8dc1eac7f7ff7000": { headword: "telpokatik", en: "adult man with an adolescent appearance", es: "hombre adulto con apariencia adolescente",
      lexical: "f5216156a656515eb339cbc3ab3a71afc4355d860d30b86e09840cfe68e50f15", fact: "85bb187b00e65fd1ee32b597b8326e336da12a3f020dae9351b2068c3fbd520a",
      scene: "One fully clothed twenty-five-year-old adult man with clearly grown-adult facial structure, wearing an opaque everyday gym shirt, trousers and shoes, gently flexing his bent arms in an ordinary gym." },
    "word-v3r-75f0e2ccd6914551": { headword: "ixseltik", en: "young-looking", es: "de aspecto joven",
      lexical: "06139836addd99cc91ac0fbaa965529f5692e6a7b1cae4b80018a80a47c311b1", fact: "8fdae2b0f9296603231170cc4a6f1ae0f513e1911731a34abc307eb911754d14",
      scene: "One fully clothed twenty-five-year-old adult woman with a fresh pleasant adult face and clearly grown-adult facial structure, wearing an ordinary opaque blouse, modest skirt or trousers and shoes." },
  }[item.id];
  const proof = item.provenance;
  if (!expected || item.source !== "verified-v3" || item.headword !== expected.headword || item.gloss !== expected.en ||
      item.meaningEs !== expected.es || proof?.entry_id !== item.id || proof.meaning_en !== expected.en || proof.meaning_es !== expected.es ||
      proof.lexical_review_hash !== expected.lexical || proof.source_fact_review_hash !== expected.fact ||
      proof.source_locator?.sourceFactReviewHash !== expected.fact) return null;
  return expected.scene;
}

function approvedImageScene(item) {
  const proof = item.provenance;
  if (item.source !== "verified-v3" || !proof || !item.compositionInstruction) return null;
  const scene = APPROVED_IMAGE_SCENES.find(entry => entry.entry_id === item.id);
  if (!scene || item.headword !== scene.headword || item.gloss !== scene.meaning_en || item.meaningEs !== scene.meaning_es ||
      proof.entry_id !== scene.entry_id || proof.meaning_en !== scene.meaning_en || proof.meaning_es !== scene.meaning_es ||
      proof.lexical_review_hash !== scene.lexical_review_hash || proof.source_fact_review_hash !== scene.source_fact_review_hash ||
      proof.source_import_sha256 !== scene.source_import_sha256 || sha256(JSON.stringify(proof.source_locator)) !== scene.source_locator_sha256 ||
      item.requireNoPeople !== scene.require_no_people || proof.composition_sha256 !== scene.composition_sha256 ||
      sha256(JSON.stringify({ instruction: item.compositionInstruction.trim(), requireNoPeople: item.requireNoPeople })) !== scene.composition_sha256) return null;
  return scene;
}

function buildPrompt(item, blocklist, reviewedAllowlist) {
  const reviewed = reviewedAllowlistEntry(item, reviewedAllowlist);
  const gloss = item.gloss || item.glosses?.[0] || item.headword;
  const questionMarkAllowed = (item.source === "verified-v3" || item.exactIdentity) && allowsRequestedQuestionMark(item, item.compositionInstruction || reviewed?.instruction);
  const approvedScene = approvedImageScene(item);
  const adultTargetPractice = approvedScene?.kind === "sports-target-practice";
  const neutralFirearmAllowed = allowsNeutralFirearmComposition(item) || adultTargetPractice;
  const adultVisualBrief = approvedAdultVisualBrief(item);
  const safeSceneBrief = approvedScene?.visual_brief || adultVisualBrief;
  const extraGlosses =
    !safeSceneBrief && !reviewed && item.glosses?.length > 1
      ? `Other learner-facing glosses: ${item.glosses.slice(1, 4).join("; ")}.`
      : "";
  const objectOnly =
    (item.requireNoPeople ? { category: "verified-no-people-composition", match: item.id } : null) ||
    classifyObjectOnly(item, blocklist) ||
    (reviewed && ["object-only", "bird-only", "animal-only"].includes(reviewed.mode)
      ? { category: "reviewed-object-only", match: reviewed.headword }
      : null);
  const key = normalizeSafetyKey(item.headword);
  const specificComposition =
    key === "tlahcoyohual"
      ? "Specific composition for midnight: show only a crescent moon, stars, a dark sky, and quiet landscape or plant silhouettes. No people, no children, no mother, no bed, no blanket, no faces, no indoor scene."
      : "";
  const childSafetyLine = "Never show children, babies, infants, teens, schoolchildren, young students, minors, childlike figures, or childlike proportions. There are no exceptions. A requested student role may use only an unmistakably mature fully clothed adult.";
  const reviewedRestriction = reviewed
    ? [
        "Reviewed allowlist restriction: this card was manually approved only under the following stricter safety constraints.",
        childSafetyLine,
        reviewed.mode === "swaddled-child"
          ? "This historical minor composition is not eligible for new image generation."
          : reviewed.instruction,
      ]
        .filter(Boolean)
        .join(" ")
    : "";
  return [
    "Create one family-safe vocabulary-card illustration for a Nahuatl language-learning app.",
    item.omitTargetWord ? "" : `Target word: ${item.headword}.`,
    safeSceneBrief ? `User-approved safe visual brief: ${safeSceneBrief}` : reviewed && objectOnly
      ? `Approved composition to illustrate instead of the literal meaning: ${reviewed.instruction}`
      : `Meaning to illustrate: ${gloss}.`,
    extraGlosses,
    !safeSceneBrief && (item.source === "verified-v3" || item.exactIdentity) && item.usageNote ? `Selected meaning scope: ${item.usageNote}` : "",
    item.compositionInstruction ? `Required exact-entry composition: ${item.compositionInstruction}` : "",
    "Style: warm flat editorial illustration with a hand-cut paper feel, subtle printed grain, cream parchment background, simple rounded geometric shapes, bold dark-brown accent lines, and a restrained palette of terracotta, marigold, cacao brown, leaf green, and soft cream.",
    (item.source === "verified-v3" || item.exactIdentity)
      ? "Composition: square image with complete centered artwork, generous padding around every edge, and all identifying parts fully visible. Keep it uncluttered and clear at small flashcard size. Use the full canvas for the artwork; do not add a bottom label band or reserve blank lower space inside this generated image. The app will fit the complete image above its own separate label band without cropping any artwork."
      : "Composition: square image, centered object or friendly everyday scene, uncluttered, easy to understand at small flashcard size. Leave a quiet cream band at the bottom where the app can render the word label.",
    "Cultural direction: respectful educational style, lightly Mesoamerican and Huasteca-inspired through color and texture only; do not imitate sacred objects, ceremonial scenes, or living artists.",
    "Human figures, if used, must be clearly mature adults and fully clothed in opaque modest everyday clothing covering the torso, hips and intimate areas. Ordinary short sleeves, modest knee-length skirts, forearms and lower legs are allowed; they are not nudity. Never show unclothed bodies, intimate exposure, underwear-only outfits, swimwear, or sexually suggestive clothing or poses.",
    childSafetyLine,
    approvedScene?.kind === "routine-upper-arm-injection"
      ? "For this exact user-approved source, the specified routine upper-arm injection between fully clothed adults is allowed. No blood, injury, intimate exposure, coercion or graphic/invasive bodily procedure. Ordinary short sleeves may show the upper arm only."
      : "For health or care concepts, neutral care objects and benign fully clothed adult scenes are allowed, including taking ordinary medicine, resting on a bed, recovering or receiving ordinary nonintrusive care. Do not depict compromising exposure, invasive procedures, coercion, humiliation, injuries or graphic distress.",
    objectOnly
      ? "Object-only safety override: do not show people, faces, hands, feet, human silhouettes, patients, beds with people, people in water, or anyone receiving care. Use only the specifically approved neutral objects, animals, plants, landscapes, weather, food, tools, furniture, containers, or symbolic scenes."
      : "",
    specificComposition,
    reviewedRestriction,
    `Do not include text, letters, numerals, watermarks, logos, UI, flags, political symbols, gore, nudity, ${neutralFirearmAllowed ? "violence or people targeted or harmed by firearms" : "weapons"}, modern alcohol bottles, intoxication, drugs, sexual content, suggestive poses, or body-exposure imagery.`,
    adultTargetPractice ? "This exact user-approved sports scene may show the specified fully clothed adult shooter aiming only at the inanimate target. Nobody is downrange or in the target area. No threats, fighting, injury or human/animal targets. Neutral sports equipment is not violence."
      : neutralFirearmAllowed ? "This source-qualified object-only composition may show only the requested ordinary firearm or nonhuman shooting demonstration. No people, animals used as targets, fighting, threats, injuries or harmed targets. A firearm’s presence alone is not violence." : "",
    questionMarkAllowed ? "The explicitly requested plain question-mark graphic is an allowed wordless inquiry cue for this exact source-qualified card. Do not add the Nahuatl word, any other written word, numerals, logos or unrequested glyphs."
      : "No question-mark graphic is authorized unless expressly requested for an exact source-qualified question or uncertainty card.",
    "For abstract words, show a simple expression, gesture, relationship, or everyday action. For animals, plants, foods, and objects, show the item clearly.",
    blocklist.bathingCompositionInstruction,
  ]
    .filter(Boolean)
    .join("\n");
}

function outputPathFor(args, item) {
  const sourceId = slugify(item.sourceIds?.[0] || item.sourceId || item.id);
  const base = slugify(item.headword) || "word";
  return path.join(args.outDir, `${base}-${sourceId}.${args.outputFormat}`);
}

function imageManifestKey(item) {
  return (item.source === "verified-v3" || item.exactIdentity) ? item.id : item.headword;
}

function itemManifestEntry(manifest, item) {
  if ((item.source !== "verified-v3" && !item.exactIdentity)) return manifestEntryFor(manifest, item.headword);
  const entry = manifest[imageManifestKey(item)];
  if (!entry) return null;
  if (entry.provenance?.lexical_review_hash !== item.provenance.lexical_review_hash ||
      entry.provenance?.composition_sha256 !== item.provenance.composition_sha256 ||
      entry.headword !== item.headword || entry.meaning_en !== item.gloss || entry.meaning_es !== item.meaningEs) {
    throw new Error(`Existing verified V3 image has different meaning/provenance: ${item.id}`);
  }
  return entry;
}

function publicUrlFor(args, outPath) {
  if (S3_IMAGE_BASE_URL) {
    return `${S3_IMAGE_BASE_URL.replace(/\/?$/, "/")}${path.basename(outPath)}`;
  }

  const publicRoot = path.join(ROOT, "public");
  const relative = path.relative(publicRoot, outPath);
  if (!relative.startsWith("..")) return `/${relative.replace(/\\/g, "/")}`;
  return outPath;
}

function manifestEntryFor(manifest, headword) {
  const { orthographySearchVariants } = loadProductionCoreTools();
  for (const variant of orthographySearchVariants(headword)) {
    if (manifest[variant]) return manifest[variant];
  }

  const normalizeImageHeadword = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[¿¡?!.\,"'“”‘’()[\]{}]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const key = normalizeImageHeadword(headword);
  if (key.length <= 1) return null;
  const variants = new Set(
    orthographySearchVariants(headword)
      .map(normalizeImageHeadword)
      .filter((value) => value.length > 1)
  );
  variants.add(key);
  const matchedKey = Object.keys(manifest).find(
    (value) => variants.has(normalizeImageHeadword(value)) && manifest[value]
  );
  return matchedKey ? manifest[matchedKey] : null;
}

function openaiEntryHasFile(entry) {
  const url = entry?.url || "";
  if (!url.startsWith("/generated/word-images/openai/")) return Boolean(url);
  const filePath = path.join(ROOT, "public", url.replace(/^\//, ""));
  return fs.existsSync(filePath);
}

function manifestHasEntry(manifest, headword) {
  return Boolean(manifestEntryFor(manifest, headword));
}

function hasExistingAnyImage(item, manifests) {
  if ((item.source === "verified-v3" || item.exactIdentity)) {
    return Boolean(itemManifestEntry(manifests.openai, item) || itemManifestEntry(manifests.pending, item));
  }
  if (item.imageBindingHeld) return false;
  if (item.mediaCard) return Boolean(loadProductionCoreTools().getVocabCardImage(item.mediaCard));
  return (
    openaiEntryHasFile(manifestEntryFor(manifests.openai, item.headword)) ||
    manifestHasEntry(manifests.s3, item.headword) ||
    manifestHasEntry(manifests.legacy, item.headword)
  );
}

function pendingEntryHasReviewedFile(entry) {
  const reviewPassed =
    entry?.automated_safety_review === "deterministic-typography" ||
    entry?.automated_safety_review?.pass === true;
  if (!entry?.local_path || !reviewPassed) return false;
  const filePath = path.resolve(ROOT, entry.local_path);
  return filePath.startsWith(ROOT + path.sep) && fs.existsSync(filePath);
}

function preparePlan(args) {
  const manifests = {
    openai: readJson(OPENAI_MANIFEST_PATH, {}),
    s3: readJson(S3_MANIFEST_PATH, {}),
    legacy: readJson(LEGACY_MANIFEST_PATH, {}),
    pending: readJson(PENDING_MANIFEST_PATH, {}),
  };
  const blocklist = loadBlocklist();
  const reviewedAllowlist = loadReviewedAllowlist();
  const appExclusions = loadAppContentExclusions();
  const vocabulary = loadVocabulary(args);
  const appExcluded = [];
  const imageExcluded = [];
  const blocked = [];
  const existing = [];
  const localFiles = [];
  const rows = [];

  for (const item of vocabulary) {
    const renderMode = isTypographyItem(item) ? "typography" : "openai";
    const reviewed = reviewedAllowlistEntry(item, reviewedAllowlist);
    if (!args.force && item.mediaCard && !item.imageBindingHeld && loadProductionCoreTools().getVocabCardImage(item.mediaCard)) {
      existing.push({ ...item, existingReason: "current-card-image-binding" });
      continue;
    }

    const pendingEntry = itemManifestEntry(manifests.pending, item);
    if ((item.source === "verified-v3" || item.exactIdentity) && pendingEntry) {
      // Even --force cannot overwrite an exact entry waiting for human review.
      existing.push({ ...item, existingReason: "exact-v3-pending-review" });
      continue;
    }
    if (!item.imageBindingHeld && !args.force && pendingEntryHasReviewedFile(pendingEntry)) {
      existing.push({ ...item, existingReason: "pending-reviewed-file" });
      continue;
    }
    const activeEntry = itemManifestEntry(manifests.openai, item);
    const activeRendererAlreadyPublished =
      !item.imageBindingHeld && openaiEntryHasFile(activeEntry) &&
      (renderMode === "openai" || activeEntry?.source === "itzli");
    if (!args.force && activeRendererAlreadyPublished) {
      existing.push({
        ...item,
        existingReason: renderMode === "typography" ? "typography-manifest" : "openai-manifest",
      });
      continue;
    }
    if (renderMode === "openai" && !args.force && args.missingOnly && hasExistingAnyImage(item, manifests)) {
      existing.push({ ...item, existingReason: "any-image-manifest" });
      continue;
    }

    const appExclusion = renderMode === "openai" ? classifyAppExcluded(item, appExclusions) : null;
    if (appExclusion && (appExclusion.nonOverridable || !reviewed || (reviewed.exactContext && normalizeSafetyKey(appExclusion.match) !== reviewed.appMatch))) {
      const blockedItem = {
        ...item,
        appExclusion,
        block: { category: appExclusion.category || "app-content-excluded", match: appExclusion.match || item.headword },
      };
      appExcluded.push(blockedItem);
      blocked.push(blockedItem);
      continue;
    }

    const block = renderMode === "openai" ? classifyBlocked(item, blocklist) : null;
    if (block && (!reviewed || block.nonOverridable ||
        (reviewed.exactContext && (block.category !== reviewed.softCategory || normalizeSafetyKey(block.match) !== reviewed.softMatch)))) {
      const blockedItem = { ...item, block };
      imageExcluded.push(blockedItem);
      blocked.push(blockedItem);
      continue;
    }
    if (renderMode === "openai" && reviewed?.mode === "swaddled-child") {
      const blockedItem = { ...item, block: { category: "existing-only-child-composition", match: item.headword } };
      imageExcluded.push(blockedItem);
      blocked.push(blockedItem);
      continue;
    }

    const outPath = outputPathFor(args, item);
    if ((item.source === "verified-v3" || item.exactIdentity) && fs.existsSync(outPath)) {
      blocked.push({ ...item, block: { category: "existing-verified-output", match: outPath } });
      continue;
    }
    rows.push({
      ...item,
      omitTargetWord: Boolean(args.omitTargetWord || item.omitTargetWord),
      reviewed,
      renderMode,
      prompt: renderMode === "openai" ? buildPrompt({ ...item, omitTargetWord: Boolean(args.omitTargetWord || item.omitTargetWord) }, blocklist, reviewedAllowlist) : "",
      outPath,
    });
  }

  const limitedRows = args.limit > 0 ? rows.slice(0, args.limit) : rows;
  const openaiRows = limitedRows.filter((item) => item.renderMode === "openai");
  const typographyRows = limitedRows.filter((item) => item.renderMode === "typography");
  const totalPromptTokens = openaiRows.reduce(
    (sum, item) => sum + Math.ceil(item.prompt.length / 4),
    0
  );
  const pricingAvailable = hasCurrentPricingEstimate(args);
  const outputUsd = pricingAvailable ? openaiRows.length * args.outputUnitCostUsd : null;
  const inputUsd = pricingAvailable ? (totalPromptTokens / 1_000_000) * args.inputTokenCostPerMillionUsd : null;

  return {
    vocabulary,
    appExcluded,
    imageExcluded,
    blocked,
    existing,
    localFiles,
    rows: limitedRows,
    openaiRows,
    typographyRows,
    omittedByLimit: rows.length - limitedRows.length,
    cost: {
      outputUsd,
      inputUsd,
      totalUsd: pricingAvailable ? outputUsd + inputUsd : null,
      pricingAvailable,
      pricingBasis: pricingAvailable ? (args.explicitOutputPricing && args.explicitInputPricing ? "explicit operator estimates" : "gpt-image-1 medium 1024x1024 defaults") : "unavailable: explicit model-specific rates required",
      promptTokensApprox: totalPromptTokens,
    },
  };
}

function dollars(value) {
  return `$${value.toFixed(2)}`;
}

function printPlan(args, plan) {
  console.log("OpenAI word image plan");
  console.log("======================");
  console.log(`Vocabulary source: ${args.source}`);
  console.log(`Candidate words:    ${plan.vocabulary.length}`);
  console.log(`App excluded:       ${plan.appExcluded.length}`);
  console.log(`Image excluded:     ${plan.imageExcluded.length}`);
  console.log(`Blocked words:      ${plan.blocked.length}`);
  console.log(`Existing skipped:   ${plan.existing.length}`);
  console.log(`Local files index:  ${plan.localFiles.length}`);
  console.log(`To generate:        ${plan.rows.length}`);
  console.log(`  OpenAI images:    ${plan.openaiRows.length}`);
  console.log(`  Typography cards: ${plan.typographyRows.length}`);
  if (plan.omittedByLimit > 0) console.log(`Omitted by --limit:  ${plan.omittedByLimit}`);
  console.log("");
  console.log(`Model:              ${args.model}`);
  console.log(`Quality / size:     ${args.quality} / ${args.size}`);
  console.log(`Output format:      ${args.outputFormat}`);
  if (plan.cost.pricingAvailable) {
    console.log(`Output unit cost:   $${args.outputUnitCostUsd.toFixed(3)} per image`);
    console.log(`Approx prompt cost: ${dollars(plan.cost.inputUsd)} (${plan.cost.promptTokensApprox} tokens est.)`);
    console.log(`Image output cost:  ${dollars(plan.cost.outputUsd)}`);
    console.log(`Estimated total:    ${dollars(plan.cost.totalUsd)}`);
  } else console.log("Cost estimate:      unavailable for this model/settings; explicit rates required before generation");
  console.log("");

  console.log("Prompt/style preview");
  for (const item of plan.openaiRows.slice(0, 3)) {
    console.log(`\n[${item.sourceIds.join(", ")}] ${item.headword} — ${item.gloss || item.glosses[0] || ""}`);
    console.log(item.prompt.split("\n").map((line) => `  ${line}`).join("\n"));
  }

  if (plan.blocked.length) {
    console.log("\nBlocked preview");
    for (const item of plan.blocked.slice(0, 16)) {
      console.log(
        `  ${item.headword} — ${item.gloss || item.glosses?.[0] || ""} ` +
          `(${item.block.category}: ${item.block.match})`
      );
    }
    if (plan.blocked.length > 16) console.log(`  ... ${plan.blocked.length - 16} more blocked`);
  }
  if (plan.imageExcluded.length) {
    console.log("\nImage-excluded preview");
    for (const item of plan.imageExcluded.slice(0, 16)) {
      console.log(
        `  ${item.headword} — ${item.gloss || item.glosses?.[0] || ""} ` +
          `(${item.block.category}: ${item.block.match})`
      );
    }
    if (plan.imageExcluded.length > 16) {
      console.log(`  ... ${plan.imageExcluded.length - 16} more image-excluded`);
    }
  }

  if (!args.execute) {
    console.log("");
    console.log("Dry run only. Add --execute and CONFIRM_IMAGE_SPEND=YES to generate files.");
  }
}

function writePlanFile(args, plan) {
  if (!args.writePlan) return;
  fs.mkdirSync(path.dirname(args.writePlan), { recursive: true });
  fs.writeFileSync(
    args.writePlan,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: args.source,
        counts: {
          candidates: plan.vocabulary.length,
          app_excluded: plan.appExcluded.length,
          image_excluded: plan.imageExcluded.length,
          blocked: plan.blocked.length,
          existing: plan.existing.length,
          local_files: plan.localFiles.length,
          to_generate: plan.rows.length,
          openai_images: plan.openaiRows.length,
          typography_cards: plan.typographyRows.length,
          omitted_by_limit: plan.omittedByLimit,
        },
        cost: plan.cost,
        to_generate: plan.rows.map((item) => ({
          headword: item.headword,
          gloss: item.gloss || item.glosses?.[0] || "",
          glosses: item.glosses || [],
          lesson_number: item.lessonNumber,
          source_ids: item.sourceIds,
          render_mode: item.renderMode,
          reviewed_allowlist: item.reviewed || null,
          out_path: path.relative(ROOT, item.outPath),
          ...((item.source === "verified-v3" || item.exactIdentity) ? {
            entry_id: item.id, meaning_es: item.meaningEs, provenance: item.provenance,
            required_composition: item.compositionInstruction, requires_no_people: item.requireNoPeople,
            prompt: item.prompt, prompt_sha256: sha256(item.prompt),
          } : {}),
        })),
        app_excluded: plan.appExcluded.map((item) => ({
          headword: item.headword,
          gloss: item.gloss || item.glosses?.[0] || "",
          reason: item.appExclusion,
        })),
        image_excluded: plan.imageExcluded.map((item) => ({
          headword: item.headword,
          gloss: item.gloss || item.glosses?.[0] || "",
          reason: item.block,
        })),
        blocked: plan.blocked.map((item) => ({
          headword: item.headword,
          gloss: item.gloss || item.glosses?.[0] || "",
          reason: item.block,
        })),
      },
      null,
      2
    )}\n`
  );
  console.log(`\nWrote local plan: ${path.relative(ROOT, args.writePlan)}`);
}

function printBlockedStop(args, plan) {
  console.log("OpenAI word image generation blocked");
  console.log("====================================");
  console.log(`Vocabulary source: ${args.source}`);
  console.log(`Candidate words:    ${plan.vocabulary.length}`);
  console.log(`App excluded:       ${plan.appExcluded.length}`);
  console.log(`Image excluded:     ${plan.imageExcluded.length}`);
  console.log(`Blocked words:      ${plan.blocked.length}`);
  console.log(`Skipped audit file: ${path.relative(ROOT, SKIPPED_AUDIT_PATH)}`);
  console.log("");
  console.log("Blocked preview");
  for (const item of plan.blocked.slice(0, 32)) {
    console.log(
      `  ${item.headword} — ${item.gloss || item.glosses?.[0] || ""} ` +
        `(${item.block.category}: ${item.block.match})`
    );
  }
  if (plan.blocked.length > 32) console.log(`  ... ${plan.blocked.length - 32} more blocked`);
}

async function getOpenAIClient(args) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(1);
  }
  const { default: OpenAI } = await import("openai");
  return new OpenAI(["verified-v3", "reviewed-queue"].includes(args.source) ? { maxRetries: 0 } : {});
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function imageGenerationRequest(args, item) {
  return {
    model: args.model,
    prompt: item.prompt,
    size: args.size,
    quality: args.quality,
    n: 1,
    output_format: args.outputFormat,
    moderation: "auto",
    ...((item.source === "verified-v3" || item.exactIdentity) ? { background: "opaque" } : {}),
  };
}

function assertPendingReviewImage(item, entry, bytes) {
  itemManifestEntry({ [imageManifestKey(item)]: entry }, item);
  if (entry.entry_id !== item.id || entry.vocabulary_source !== (item.catalogSource || item.source)) throw new Error(`Pending image source/identity differs: ${item.id}`);
  const imageHash = sha256(bytes);
  if (entry.image_sha256 !== imageHash) throw new Error(`Pending image hash differs from the exact file: ${item.id}`);
  if (!entry.generation_prompt || sha256(entry.generation_prompt) !== entry.prompt_sha256) throw new Error(`Pending prompt hash is invalid: ${item.id}`);
  if (entry.derivation) validateNumericDerivation(item, entry.derivation, imageHash);
  return imageHash;
}

function validateNumericDerivation(item, recipe, imageHash) {
  const numbers = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    "one; a single one": 1, "one hundred": 100, "four hundred": 400, "eight thousand": 8000, "eight thousand (number reference)": 8000 };
  const meaning = normalizeKey(item.gloss);
  const distributiveGroupSize = { "two apiece": 2, "three apiece; in groups of three": 3 }[meaning];
  const grouped = distributiveGroupSize !== undefined || recipe.group_count !== undefined || recipe.group_size !== undefined;
  if (grouped && (!Number.isInteger(recipe.group_count) || recipe.group_count < (distributiveGroupSize ? 2 : 1) ||
      !Number.isInteger(recipe.group_size) || recipe.group_size <= 0 ||
      (distributiveGroupSize && recipe.group_size !== distributiveGroupSize))) throw new Error(`Numeric derivative has invalid distributive/group semantics: ${item.id}`);
  const count = distributiveGroupSize ? recipe.group_count * distributiveGroupSize : numbers[meaning];
  if (grouped && recipe.group_count * recipe.group_size !== count) throw new Error(`Numeric derivative group total differs: ${item.id}`);
  if (recipe.kind !== "exact-count-tiling" || count === undefined || recipe.expected_count !== count ||
      recipe.source_asset_reviewed_object_count !== 1 || recipe.output_sha256 !== imageHash ||
      !/^[a-f0-9]{64}$/.test(recipe.source_asset_sha256 || "") || typeof recipe.source_asset_path !== "string" ||
      recipe.canvas_width !== 1024 || recipe.canvas_height !== 1024 || !Array.isArray(recipe.placements) || recipe.placements.length !== count) {
    throw new Error(`Numeric derivative differs from its exact count/source/output contract: ${item.id}`);
  }
  const seen = new Set();
  const groupCounts = grouped ? Array(recipe.group_count).fill(0) : [];
  for (const tile of recipe.placements) {
    if (![tile.index, tile.left, tile.top, tile.width, tile.height].every(Number.isInteger) || seen.has(tile.index) ||
        tile.index < 0 || tile.index >= count || tile.left < 0 || tile.top < 0 || tile.width <= 0 || tile.height <= 0 ||
        tile.left + tile.width > 1024 || tile.top + tile.height > 758) throw new Error(`Numeric derivative has an invalid/cropped placement: ${item.id}`);
    seen.add(tile.index);
    if (grouped) {
      if (!Number.isInteger(tile.group_index) || tile.group_index < 0 || tile.group_index >= recipe.group_count) throw new Error(`Numeric derivative has invalid group assignment: ${item.id}`);
      groupCounts[tile.group_index] += 1;
    }
  }
  if (grouped && groupCounts.some(size => size !== recipe.group_size)) throw new Error(`Numeric derivative has unequal/incorrect groups: ${item.id}`);
  for (let i = 0; i < recipe.placements.length; i++) for (let j = i + 1; j < recipe.placements.length; j++) {
    const a = recipe.placements[i], b = recipe.placements[j];
    if (a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top) {
      throw new Error(`Numeric derivative has overlapping placements: ${item.id}`);
    }
  }
  return { count, deterministic_placement_count_verified: true, visual_count_certified: false, publication_approved: false };
}

function pendingReviewResult(entry, imageHash, review, reviewedAt, reviewModel) {
  return { ...entry,
    ...(entry.derivation ? { derivation_validation: validateNumericDerivation({ id: entry.entry_id, gloss: entry.meaning_en }, entry.derivation, imageHash) } : {}),
    automated_review_history: [...(entry.automated_review_history || []), ...(entry.automated_safety_review ? [{
      image_sha256: entry.automated_review_image_sha256 || entry.image_sha256, verdict: entry.automated_safety_review,
      reviewed_at: entry.automated_reviewed_at || null,
    }] : [])],
    automated_safety_review: review, automated_review_image_sha256: imageHash,
    automated_reviewed_at: reviewedAt, automated_review_model: reviewModel,
    review_required_after_export: false, publication_approved: false,
  };
}

async function reviewImagePixels(client, args, item, bytes) {
  const base64 = bytes.toString("base64");
  const moderation = await client.moderations.create({ model: "omni-moderation-latest", input: [{
    type: "image_url", image_url: { url: `data:image/${args.outputFormat};base64,${base64}` },
  }] });
  return reviewModeratedImage(client, args, item, base64, moderation);
}

function imageModerationDecision(item, moderation) {
  const result = moderation.results?.[0];
  const original = { model: "omni-moderation-latest", response_model: moderation.model || null,
    response_id: moderation.id || null, provider_request_id: moderation._request_id || null, result: result || null };
  const sports = approvedImageScene(item)?.kind === "sports-target-practice";
  const triage = sports && isViolenceOnlyModerationResult(result)
    ? "exact-source-adult-sports-violence-only" : null;
  if (!result || typeof result.flagged !== "boolean" || (result.flagged && !triage)) {
    const categories = result ? Object.entries(result.categories || {}).filter(([, value]) => value === true).map(([key]) => key) : ["moderation-empty"];
    const error = new Error(`Image failed visual moderation: ${categories.join(", ")}`);
    error.visualModeration = original;
    throw error;
  }
  return { local_visual_moderation: original, local_moderation_triage: triage };
}

async function reviewModeratedImage(client, args, item, imageBase64, moderation) {
  const decision = imageModerationDecision(item, moderation);
  try {
    // Local violence-only categorization never supplies a passing safety verdict.
    // The exact final pixels must still pass every mandatory harm/age/exposure check.
    const review = await reviewGeneratedImage(client, args, item, imageBase64);
    if (decision.local_moderation_triage && (review.adult_target_practice_composition !== true ||
        review.contains_people !== true || review.all_people_clearly_adult_25_plus_and_fully_clothed !== true)) {
      const error = new Error("Sports moderation triage requires the exact clearly adult, fully clothed target-practice pixel verdict.");
      error.safetyReview = review;
      throw error;
    }
    return { ...review, review_contract_version: 5, ...decision };
  } catch (error) {
    error.visualModeration = decision.local_visual_moderation;
    error.localModerationTriage = decision.local_moderation_triage;
    throw error;
  }
}

async function reviewPendingImages(args) {
  const pending = readJson(PENDING_MANIFEST_PATH, {});
  const blocklist = loadBlocklist();
  const exclusions = loadAppContentExclusions();
  const rows = [];
  for (const item of loadVocabulary(args)) {
    const entry = itemManifestEntry(pending, item);
    if (!entry || (!entry.review_required_after_export && entry.automated_safety_review?.pass === true)) continue;
    if (classifyBlocked(item, blocklist) || classifyAppExcluded(item, exclusions)) throw new Error(`Pending review violates current word/sense safeguards: ${item.id}`);
    const localPath = path.resolve(ROOT, entry.local_path || "");
    if (!localPath.startsWith(ROOT + path.sep) || !fs.existsSync(localPath)) throw new Error(`Pending review file is missing/outside workspace: ${item.id}`);
    const bytes = fs.readFileSync(localPath);
    const imageHash = assertPendingReviewImage(item, entry, bytes);
    if (entry.derivation) {
      const sourcePath = path.resolve(ROOT, entry.derivation.source_asset_path);
      if (!sourcePath.startsWith(ROOT + path.sep) || !fs.existsSync(sourcePath) ||
          sha256(fs.readFileSync(sourcePath)) !== entry.derivation.source_asset_sha256) throw new Error(`Numeric derivative source asset hash/path differs: ${item.id}`);
      const sharp = require("sharp");
      const metadata = await sharp(bytes).metadata();
      if (metadata.width !== 1024 || metadata.height !== 1024 ||
          (metadata.hasAlpha && (await sharp(bytes).stats()).channels[3].min !== 255)) {
        throw new Error(`Numeric derivative must be an opaque 1024-square image: ${item.id}`);
      }
    }
    rows.push({ item: { ...item, compositionInstruction: entry.required_composition, requireNoPeople: entry.requires_no_people,
      numericDerivationVerified: Boolean(entry.derivation) }, entry, bytes, imageHash });
  }
  const selected = args.limit > 0 ? rows.slice(0, args.limit) : rows;
  console.log(`Pending files requiring exact-pixel review: ${selected.length}; image generation requests: 0`);
  if (!args.execute || !selected.length) return;
  if (process.env.CONFIRM_IMAGE_SPEND !== "YES") throw new Error("Pending paid vision review requires CONFIRM_IMAGE_SPEND=YES");
  loadLocalEnv(["OPENAI_API_KEY"]);
  const client = await getOpenAIClient(args);
  let failed = 0;
  await runPool(selected, args.concurrency, async ({ item, entry, bytes, imageHash }) => {
    try {
      const review = await reviewImagePixels(client, { ...args, outputFormat: entry.output_format }, item, bytes);
      const current = readJson(PENDING_MANIFEST_PATH, {});
      assertPendingReviewImage(item, current[item.id], fs.readFileSync(path.resolve(ROOT, entry.local_path)));
      current[item.id] = pendingReviewResult(current[item.id], imageHash, review, new Date().toISOString(), args.visionReviewModel);
      writeJsonAtomic(PENDING_MANIFEST_PATH, current);
      console.log(`REVIEW OK ${item.id}; exact current image; publication remains pending`);
    } catch (error) { failed += 1; console.error(`REVIEW FAIL ${item.id}: ${error.message}`); }
    if (args.delayMs > 0) await delay(args.delayMs);
  });
  if (failed) process.exitCode = 1;
}

async function generateOne(client, args, item) {
  fs.mkdirSync(path.dirname(item.outPath), { recursive: true });

  const response = await client.images.generate(imageGenerationRequest(args, item));

  try {
  const image = response.data?.[0];
  if (!image?.b64_json) {
    throw new Error("OpenAI image response did not include b64_json data.");
  }

  const rawBuffer = Buffer.from(image.b64_json, "base64");
  const framed = (item.source === "verified-v3" || item.exactIdentity) ? await frameVerifiedV3Image(rawBuffer, args.outputFormat) : null;
  const buffer = framed ? framed.buffer : await removeGeneratedLabelBand(rawBuffer, args.outputFormat);
  const reviewedBase64 = buffer.toString("base64");
  const moderation = await client.moderations.create({
    model: "omni-moderation-latest",
    input: [
      {
        type: "image_url",
        image_url: {
          url: `data:image/${args.outputFormat};base64,${reviewedBase64}`,
        },
      },
    ],
  });
  const safetyReview = await reviewModeratedImage(client, args, item, reviewedBase64, moderation);
  fs.writeFileSync(item.outPath, buffer, (item.source === "verified-v3" || item.exactIdentity) ? { flag: "wx" } : undefined);
  return { bytes: buffer.length, usage: response.usage, providerRequestId: response._request_id || null, safetyReview,
    ...(framed ? { rawImageSha256: sha256(rawBuffer), framingTransform: framed.framingTransform } : {}) };
  } catch (error) {
    if (["verified-v3", "reviewed-queue"].includes(args.source)) {
      error.generationUsage = response.usage;
      error.providerRequestId = response._request_id || null;
    }
    throw error;
  }
}

async function frameVerifiedV3Image(buffer, outputFormat) {
  const sharp = require("sharp");
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Generated V3 image has no valid dimensions.");
  const size = 1024;
  const artworkHeight = Math.round(size * 0.74);
  // Preserve the complete artwork, including its original bottom edge and any
  // generated lettering. The subsequent strict visual review sees all of it.
  const framedBuffer = await sharp(buffer)
    .flatten({ background: "#fbf1d8" })
    .resize(size, artworkHeight, { fit: "contain", position: "centre", background: "#fbf1d8" })
    .extend({ top: 0, left: 0, right: 0, bottom: size - artworkHeight, background: "#fbf1d8" })
    .toFormat(outputFormat)
    .toBuffer();
  return {
    buffer: framedBuffer,
    framingTransform: {
      version: 1, mode: "contain-complete-image", fit: "contain", position: "centre", crop: false,
      original_width: metadata.width, original_height: metadata.height,
      original_has_alpha: Boolean(metadata.hasAlpha), background_mode: "opaque", flattened_before_resize: true,
      canvas_width: size, canvas_height: size, artwork_box: { left: 0, top: 0, width: size, height: artworkHeight },
      label_band: { left: 0, top: artworkHeight, width: size, height: size - artworkHeight }, background: "#fbf1d8",
    },
  };
}

async function removeGeneratedLabelBand(buffer, outputFormat) {
  const sharp = require("sharp");
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;
  const retainedHeight = Math.max(1, Math.floor(height * 0.74));
  return sharp(buffer)
    .extract({ left: 0, top: 0, width, height: retainedHeight })
    .extend({
      top: 0,
      left: 0,
      right: 0,
      bottom: height - retainedHeight,
      background: "#fbf1d8",
    })
    .toFormat(outputFormat)
    .toBuffer();
}

async function reviewGeneratedImage(client, args, item, imageBase64) {
  const reviewedRestriction = item.compositionInstruction || item.reviewed?.instruction || "No card-specific exception.";
  const questionMarkAllowed = (item.source === "verified-v3" || item.exactIdentity) && allowsRequestedQuestionMark(item, reviewedRestriction);
  const approvedScene = approvedImageScene(item);
  const adultTargetPractice = approvedScene?.kind === "sports-target-practice";
  const neutralFirearmAllowed = allowsNeutralFirearmComposition(item) || adultTargetPractice;
  const response = await client.responses.create({
    model: args.visionReviewModel,
    store: false,
    instructions:
      "You are a fail-closed visual safety reviewer for a general-audience language-learning app. " +
      "Inspect the actual image, not merely the requested prompt. When age, clothing coverage, body exposure, or context is ambiguous, fail it. Return only the required JSON.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Card: ${item.headword}`,
              `Meaning: ${item.gloss || item.glosses?.[0] || ""}`,
              approvedScene ? `Exact source-and-composition-qualified user scene: ${approvedScene.visual_brief} All ordinary actual age, nudity, intimate exposure, sexual content, waste, injury, violence and coercion checks remain required.` : "",
              approvedScene?.partial_cue ? "This explicitly approved indirect/partial teaching cue retains the original lexical meaning. It does not certify that meaning from pixels alone. Review the specified safe action component, attitude, object or clean after-state; do not require an absent recipient, inferred biological cause, complete physical process, or the prohibited harmful/exposing interaction merely because the unchanged full lexical label references it. This is limited to this exact source-and-composition-qualified partial cue. Actual fighting, blood, injuries, minors, humiliating/coercive interaction or compromising exposure still fail." : "",
              approvedScene?.partial_cue_reason ? `Exact partial-cue scope and limitation: ${approvedScene.partial_cue_reason}` : "",
              ["animal-birth-after-state", "animal-arrival-after-state"].includes(approvedScene?.kind)
                ? "This exact checked source permits the depicted nonhuman animal mother and calf. A normal nonhuman calf is not a human minor or childlike PERSON. Still reject all human subjects, human infants, visible delivery processes, reproductive anatomy, body fluids, injury or graphic scenes. The clean animal-family after-state is a partial cue, not a literal image of the birth process."
                : "",
              approvedAdultVisualBrief(item) ? "This exact source-qualified adult-appearance card uses the user-approved scene of a fully clothed twenty-five-year-old grown adult. A fresh adult face is allowed; do not require teenage visual features. The original bilingual lexical label remains unchanged. Actual minors, genuinely childlike appearance or ambiguous maturity still fail." : "",
              `Required composition: ${reviewedRestriction}`,
              item.numericDerivationVerified ? "This exact numeric image has an independently validated deterministic tiling recipe matching the source-approved count, current output hash, and reviewed single-object source asset. Inspect actual pixels for safety, text, object identity, missing/cropped parts and composition. Do not claim that your visual estimate certifies the dense count; mathematical placement validation is separate." : "",
              "Visual-semantic contract: these are fictional teaching scenes in the requested flat paper/editorial illustration style. Photographic realism is not required. Clearly mature adult proportions and features are required; ambiguous maturity still fails. Do not demand visual proof of a precise numerical age, biological kinship, ancestry, Indigenous identity, or another declared fictional role that cannot be established from appearance. The source-validated card label supplies that role; reject a visibly contradictory action, relationship, perspective or quantity.",
              "Adult illustration scope: use the declared fictional adult age together with grown-adult visual cues. Normal paper/cartoon stylization is allowed; no fixed head-to-height ratio, wrinkles, forty-five-plus appearance or photographic anatomical proportions are required. An otherwise clearly grown adult is not a child merely because of a large stylized head or a smooth face. Actual children, minors or genuinely childlike appearance remain prohibited.",
              "For relationship scenes, check the singular/plural TARGET participants, first-person/self-pointing gesture when requested, and the depicted interaction. Clearly secondary, fully clothed mature adult reference figures may establish a fictional cousin, uncle, parent or similar relationship; do not treat each reference figure as an additional target. Do not demand a gender distinction absent from the selected source meaning. Context-dependent role pictures are teaching aids and do not certify the role from pixels alone.",
              /\barrows?\b/iu.test(reviewedRestriction)
                ? `This exact composition explicitly requests diagram arrows. Wordless directional arrows, motion lines and diagram connectors used for that requested purpose are allowed graphic cues, not text. Still reject letters, written words, numerals, ${questionMarkAllowed ? "unrequested question marks" : "question marks"}, logos, political symbols, or unrequested graphic symbols.`
                : "No unrequested diagram arrows or written glyphs are authorized by this card.",
              questionMarkAllowed
                ? "This exact source-qualified question/inquiry/uncertainty card expressly requests a plain question-mark graphic. That specific wordless inquiry cue is allowed and must not set the UNAPPROVED-text flag by itself. All written words, including the Nahuatl target, incorrect spellings, numerals, logos and any unrequested glyph remain prohibited."
                : "No question-mark graphic is authorized for this source/composition; unrequested punctuation remains prohibited.",
              adultTargetPractice
                ? "This exact source-qualified sports composition permits the specified fully clothed adult shooter with an ordinary firearm and inanimate target. A weapon’s neutral sports presence is advisory under the historical weapon flag. No person may be downrange, in the target area, or targeted by a weapon. Reject actual violence, threats, injury, human/animal targets or unsafe firearm direction."
                : neutralFirearmAllowed
                ? "This exact source-qualified object-only composition permits the requested ordinary firearm or nonhuman shooting demonstration. The historical weapons-or-violence flag is advisory for weapon presence only. Still reject ANY actual violence, threats, human or animal targets, injury or harm. No people anywhere; a firearm’s neutral presence alone is not violence."
                : "Also reject weapons, violence, dead or dying people, humiliation, coercion, or any compromising situation, even when it is not bloody or graphic.",
              (item.source === "verified-v3" || item.exactIdentity) || item.exactIdentity
                ? "Formatting context: you are viewing the final 1024-square app image. Its complete original artwork is fitted without cropping inside the upper 1024-by-758 art box, with expected cream side padding and a blank cream app label band in the bottom 266 pixels. Full-canvas composition instructions describe the original artwork BEFORE that fit. Do not reject expected formatter padding, margins or the blank label band as unused canvas. Inspect the ENTIRE image for all safety and text rules, and still reject missing or unclear identifying subject parts."
                : "",
              "Hard rules: no babies, children, teens, students who could be minors, or actual childlike appearance; all visible people must clearly be adults age25+ and fully clothed in opaque modest clothing covering the torso, hips and intimate areas. Ordinary short sleeves, modest knee-length skirts, forearms and lower legs do not constitute nudity or unclothed people. Mature paper/cartoon illustration proportions are allowed without any fixed seven-head ratio; actual childlike appearance or unclear maturity still fails. No nudity, ambiguous intimate exposure, exposed genitals, breasts or buttocks; no people bathing, showering or changing; no toilet, urination, defecation, body waste, sexual content, suggestive pose, injury, blood or gore; no text, letters, numerals, logos, labels or watermarks.",
              approvedScene?.kind === "routine-upper-arm-injection"
                ? "Care/rest scope for this exact qualified routine upper-arm injection: the specified fully clothed adult nurse/patient scene is benign care. Set the hard compromising-care flag for actual intimate exposure, graphic/exposing procedures, coercion or humiliation. Ordinary upper-arm injection with no blood, injury or intimate exposure is false. All separate age, nudity, sexual, waste, violence and coercion flags remain mandatory."
                : "Care/rest scope: ordinary fully clothed mature adults resting on a bed, taking medicine, recovering or receiving benign nonintrusive care are allowed and are not compromising merely because a bed, care or medicine appears. The historical contains_person_in_bed_or_vulnerable_care_scene flag is advisory. Set the hard compromising-care flag only for actual intimate exposure, invasive/exposing procedures, coercion, humiliation or another genuinely compromising care situation. All separate age, nudity, sexual, waste, violence and coercion flags remain mandatory.",
              approvedScene?.kind === "routine-upper-arm-injection" ? "For this exact qualified scene ONLY, a routine upper-arm injection between clearly adult fully clothed nurse and patient, with no blood, injury, coercion, graphic procedure or intimate exposure, is allowed and is NOT compromising care. Ordinary modest short sleeves may reveal the upper arm. Any genuinely compromising procedure or exposure still fails the hard care flag." : "",
              "Non-overridable: for any bathing concept use only an empty shower, empty tub, or appropriate empty body of water. No people of ANY age anywhere in that scene, including children, babies, adults, reflections, silhouettes or human body parts. An empty fixture without people is not a person bathing. NEVER show children in bathing, nudity, changing or body exposure. Card-specific exceptions and educational-text approval cannot override these rules.",
              "Set pass=false if any rule fails or if the requested concept/composition is not clearly depicted.",
            ].join("\n"),
          },
          {
            type: "input_image",
            detail: "high",
            image_url: `data:image/${args.outputFormat};base64,${imageBase64}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "vocabulary_image_safety_review",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            pass: { type: "boolean" },
            reasons: { type: "array", items: { type: "string" } },
            contains_people: { type: "boolean" },
            contains_minor_or_childlike_person: { type: "boolean" },
            all_people_clearly_adult_25_plus_and_fully_clothed: { type: "boolean", description: "Clearly mature adults in opaque modest clothing covering torso, hips and intimate areas. Ordinary short sleeves, knee-length skirts, visible forearms/lower legs and mature illustration proportions are allowed; no fixed head-height ratio." },
            contains_nudity_or_ambiguous_covered_body_exposure: { type: "boolean", description: "Actual nudity or ambiguous intimate exposure; ordinary clothed forearms/lower legs are false." },
            contains_exposed_genitals_breasts_or_buttocks: { type: "boolean" },
            bathing_scene_contains_people: { type: "boolean", description: "Any person of any age, human body part, human silhouette or human reflection anywhere in a bathing scene, even fully clothed. Empty fixtures or water with no people are false." },
            contains_bathing_showering_or_changing: { type: "boolean", description: "A person bathing, showering or changing clothing. An empty shower or tub with no person is false." },
            contains_toilet_urination_defecation_or_body_waste: { type: "boolean" },
            contains_sexual_or_suggestive_content: { type: "boolean" },
            contains_person_in_bed_or_vulnerable_care_scene: { type: "boolean", description: "Advisory historical context flag. An ordinary fully clothed adult resting or receiving benign care may be true without being unsafe." },
            contains_compromising_medical_or_care_context: { type: "boolean", description: `Actual intimate or compromising exposure, invasive/exposing procedures, coercion, humiliation or genuinely compromising care. Benign fully clothed adult rest, medicine or nonintrusive care is false.${approvedScene?.kind === "routine-upper-arm-injection" ? " The exact authorized routine upper-arm injection without blood/intimate exposure/coercion is also false." : ""}` },
            contains_injury_blood_or_gore: { type: "boolean" },
            contains_weapons_or_violence: { type: "boolean" },
            contains_violence_or_targeted_or_harmed_people: { type: "boolean", description: "Actual violence, threats, attacks, people targeted or harmed by weapons, or animal targets/injury. A neutral ordinary firearm object or nonhuman shooting demonstration with no harm is false." },
            contains_people_in_sports_target_area_or_weapon_aimed_at_people: { type: "boolean", description: "Any person downrange, in a sports firearm/archery target area, or targeted by a weapon. Safe inanimate-target practice with nobody downrange is false." },
            contains_dead_or_dying_people: { type: "boolean" },
            contains_humiliation_coercion_or_compromising_situation: { type: "boolean" },
            contains_unapproved_text_letters_numbers_logo_or_watermark: { type: "boolean", description: "Written words, letters, numerals, logos, watermarks and unrequested glyphs are unapproved. Only expressly authorized wordless directional arrows or source-qualified requested question-mark graphics may be false under the provided exact-card contract." },
            visible_unapproved_text: { type: "string" },
            unapproved_text_location: { type: "string" },
            matches_requested_concept_and_composition: { type: "boolean" },
          },
          required: [
            "pass",
            "reasons",
            "contains_people",
            "contains_minor_or_childlike_person",
            "all_people_clearly_adult_25_plus_and_fully_clothed",
            "contains_nudity_or_ambiguous_covered_body_exposure",
            "contains_exposed_genitals_breasts_or_buttocks",
            "bathing_scene_contains_people",
            "contains_bathing_showering_or_changing",
            "contains_toilet_urination_defecation_or_body_waste",
            "contains_sexual_or_suggestive_content",
            "contains_person_in_bed_or_vulnerable_care_scene",
            "contains_compromising_medical_or_care_context",
            "contains_injury_blood_or_gore",
            "contains_weapons_or_violence",
            "contains_violence_or_targeted_or_harmed_people",
            "contains_people_in_sports_target_area_or_weapon_aimed_at_people",
            "contains_dead_or_dying_people",
            "contains_humiliation_coercion_or_compromising_situation",
            "contains_unapproved_text_letters_numbers_logo_or_watermark",
            "visible_unapproved_text",
            "unapproved_text_location",
            "matches_requested_concept_and_composition",
          ],
        },
      },
    },
  });

  if (!response.output_text) throw new Error("Visual safety review returned no verdict.");
  const review = JSON.parse(response.output_text);
  const forbidden = [
    "contains_minor_or_childlike_person",
    "contains_nudity_or_ambiguous_covered_body_exposure",
    "contains_exposed_genitals_breasts_or_buttocks",
    "bathing_scene_contains_people",
    "contains_bathing_showering_or_changing",
    "contains_toilet_urination_defecation_or_body_waste",
    "contains_sexual_or_suggestive_content",
    "contains_compromising_medical_or_care_context",
    "contains_injury_blood_or_gore",
    ...(neutralFirearmAllowed ? [] : ["contains_weapons_or_violence"]),
    "contains_violence_or_targeted_or_harmed_people",
    "contains_people_in_sports_target_area_or_weapon_aimed_at_people",
    "contains_dead_or_dying_people",
    "contains_humiliation_coercion_or_compromising_situation",
    "contains_unapproved_text_letters_numbers_logo_or_watermark",
  ];
  const verdictFields = ["pass", "contains_people", "all_people_clearly_adult_25_plus_and_fully_clothed",
    "matches_requested_concept_and_composition", "contains_person_in_bed_or_vulnerable_care_scene", "contains_weapons_or_violence", ...forbidden];
  const missingVerdicts = verdictFields.filter((field) => typeof review[field] !== "boolean");
  if (missingVerdicts.length) {
    throw new Error(`Visual safety review returned incomplete or invalid verdicts: ${missingVerdicts.join(", ")}`);
  }
  const hardFailures = forbidden.filter((field) => review[field] === true);
  if (review.contains_people && !review.all_people_clearly_adult_25_plus_and_fully_clothed) {
    hardFailures.push("people_not_clearly_adult_25_plus_and_fully_clothed");
  }
  if (review.contains_people && BATHING_CONCEPT_PATTERN.test(normalizeSafetyKey([item.headword, item.gloss, ...(item.glosses || [])].filter(Boolean).join(" ")))) {
    hardFailures.push("people_in_bathing_concept");
  }
  if ((item.requireNoPeople || ["object-only", "bird-only", "animal-only"].includes(item.reviewed?.mode)) && review.contains_people) {
    hardFailures.push("people_in_object_only_card");
  }
  if (!review.matches_requested_concept_and_composition) {
    hardFailures.push("composition_mismatch");
  }
  if (review.contains_unapproved_text_letters_numbers_logo_or_watermark) {
    hardFailures.push(
      `visible_text=${review.visible_unapproved_text || "unreadable"}` +
        ` at ${review.unapproved_text_location || "unknown location"}`
    );
  }
  if (!review.pass || hardFailures.length) {
    const reasons = [...new Set([...(review.reasons || []), ...hardFailures])];
    const error = new Error(`Generated image failed strict vision review: ${reasons.join(", ")}`);
    error.safetyReview = review;
    throw error;
  }
  return { ...review, review_contract_version: 4, neutral_firearm_composition: neutralFirearmAllowed && !adultTargetPractice,
    adult_target_practice_composition: adultTargetPractice,
    ...(approvedScene ? { approved_scene_kind: approvedScene.kind, approved_scene_entry_id: item.id,
      partial_conceptual_cue: approvedScene.partial_cue, standalone_image_meaning_certified: false } : {}) };
}

function typographyLines(headword) {
  const value = String(headword || "").trim();
  if (value === "k / kw") return ["k", "kw"];
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length >= 5) {
    const midpoint = Math.ceil(tokens.length / 2);
    return [tokens.slice(0, midpoint).join("  "), tokens.slice(midpoint).join("  ")];
  }
  return [value];
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function renderTypographyCard(args, item) {
  const sharp = require("sharp");
  const lines = typographyLines(item.headword);
  const longest = Math.max(...lines.map((line) => line.length));
  const fontSize = lines.length > 1
    ? Math.min(220, Math.max(140, 700 / longest))
    : Math.min(430, Math.max(180, 780 / longest));
  const lineGap = fontSize * 1.05;
  const firstY = lines.length === 1 ? 500 : 380;
  const text = lines
    .map(
      (line, index) =>
        `<text x="512" y="${firstY + index * lineGap}" text-anchor="middle" dominant-baseline="middle" ` +
        `font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" fill="#34241d">${escapeXml(line)}</text>`
    )
    .join("");
  const svg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#fbf1d8"/>
      <rect x="70" y="70" width="884" height="710" rx="56" fill="#fffaf0" stroke="#d8c8a7" stroke-width="8"/>
      <circle cx="154" cy="151" r="31" fill="#d85d35"/>
      <path d="M850 120c49 0 89 40 89 89-49 0-89-40-89-89Z" fill="#3d7c54"/>
      <path d="M814 166c0-45 36-81 81-81 0 45-36 81-81 81Z" fill="#e4a52d"/>
      ${text}
      <path d="M122 710h780" stroke="#e4a52d" stroke-width="11" stroke-linecap="round"/>
      <rect y="802" width="1024" height="222" fill="#fbf1d8"/>
    </svg>`;
  const buffer = await sharp(Buffer.from(svg)).toFormat(args.outputFormat).toBuffer();
  fs.mkdirSync(path.dirname(item.outPath), { recursive: true });
  fs.writeFileSync(item.outPath, buffer, (item.source === "verified-v3" || item.exactIdentity) ? { flag: "wx" } : undefined);
  return { bytes: buffer.length };
}

function pendingManifestEntry(args, item, imageSha256) {
  const typography = item.renderMode === "typography";
  return {
      proposed_url: publicUrlFor(args, item.outPath),
      local_path: path.relative(ROOT, item.outPath),
      license: typography
        ? "First-party generated typography; review before publication"
        : "OpenAI-generated image; review before publication",
      author: typography ? "Itzli typography renderer" : args.model,
      alt: item.gloss
        ? `Illustration for ${item.headword}: ${item.gloss}`
        : `Illustration for ${item.headword}`,
      source: typography ? "itzli" : "openai",
      model: typography ? null : args.model,
      quality: typography ? null : args.quality,
      size: args.size,
      output_format: args.outputFormat,
      generated_at: new Date().toISOString(),
      review_status: "pending",
      automated_safety_review: item.safetyReview || (typography ? "deterministic-typography" : null),
      ...((item.source === "verified-v3" || item.exactIdentity) ? {
        entry_id: item.id, headword: item.headword, meaning_en: item.gloss, meaning_es: item.meaningEs,
        vocabulary_source: item.catalogSource || item.source, provenance: item.provenance,
        generation_prompt: item.prompt, prompt_sha256: sha256(item.prompt), image_sha256: imageSha256,
        required_composition: item.compositionInstruction, requires_no_people: item.requireNoPeople,
        target_word_omitted_from_generation_prompt: Boolean(item.omitTargetWord),
        ...(approvedAdultVisualBrief(item) ? { user_approved_adult_visual_brief: approvedAdultVisualBrief(item), lexical_label_preserved: true } : {}),
        ...(approvedImageScene(item) ? { user_approved_scene: approvedImageScene(item), lexical_label_preserved: true,
          standalone_image_meaning_certified: false } : {}),
        contextual_role_image_only_certification: false,
        generation_usage: item.generationUsage || null,
        provider_request_id: item.providerRequestId || null,
        raw_image_sha256: item.rawImageSha256 || null,
        framing_transform: item.framingTransform || null,
      } : {}),
  };
}

function updatePendingManifest(args, generated) {
  if (!generated.length) return;
  const manifest = readJson(PENDING_MANIFEST_PATH, {});
  for (const item of generated) {
    const key = imageManifestKey(item);
    if ((item.source === "verified-v3" || item.exactIdentity) && manifest[key]) {
      throw new Error(`Refusing to overwrite a pending verified V3 image: ${key}`);
    }
    manifest[key] = pendingManifestEntry(args, item,
      (item.source === "verified-v3" || item.exactIdentity) ? sha256(fs.readFileSync(item.outPath)) : null);
  }

  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => normalizeKey(a).localeCompare(normalizeKey(b)))
  );
  fs.mkdirSync(path.dirname(PENDING_MANIFEST_PATH), { recursive: true });
  writeJsonAtomic(PENDING_MANIFEST_PATH, sorted);
}

function appendRejectedAudit(item, error) {
  const audit = readJson(REJECTED_AUDIT_PATH, []);
  audit.push({
    rejected_at: new Date().toISOString(),
    headword: item.headword,
    gloss: item.gloss || item.glosses?.[0] || "",
    lesson_number: item.lessonNumber,
    source_ids: item.sourceIds,
    reason: error.message,
    safety_review: error.safetyReview || null,
    ...(error.visualModeration ? { local_visual_moderation: error.visualModeration,
      local_moderation_triage: error.localModerationTriage || null } : {}),
    ...((item.source === "verified-v3" || item.exactIdentity) ? { entry_id: item.id, provenance: item.provenance,
      prompt_sha256: sha256(item.prompt), generation_usage: error.generationUsage || null,
      provider_request_id: error.providerRequestId || null } : {}),
  });
  fs.mkdirSync(path.dirname(REJECTED_AUDIT_PATH), { recursive: true });
  writeJsonAtomic(REJECTED_AUDIT_PATH, audit);
}

function writeSkippedAudit(plan) {
  const skipped = [
    ...(plan.appExcluded || []).map((item) => ({
      item,
      reason: item.appExclusion,
    })),
    ...(plan.imageExcluded || []).map((item) => ({
      item,
      reason: item.block,
    })),
    ...(plan.blocked || []).map((item) => ({
      item,
      reason: item.block,
    })),
  ];
  if (!skipped.length) return;
  fs.mkdirSync(path.dirname(SKIPPED_AUDIT_PATH), { recursive: true });
  const audit = skipped.map(({ item, reason }) => ({
    headword: item.headword,
    gloss: item.gloss || item.glosses?.[0] || "",
    lesson_number: item.lessonNumber,
    source_ids: item.sourceIds,
    reason,
  }));
  writeJsonAtomic(SKIPPED_AUDIT_PATH, audit);
}

async function runPool(items, concurrency, worker, shouldStop = () => false) {
  let index = 0;
  async function next() {
    while (index < items.length && !shouldStop()) {
      const item = items[index];
      index += 1;
      await worker(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

function createImageStartGate(intervalMs, now = Date.now, pause = delay) {
  let nextStart = 0;
  let reservations = Promise.resolve();
  return () => {
    const reservation = reservations.then(async () => {
      const waitMs = Math.max(0, nextStart - now());
      if (waitMs) await pause(waitMs);
      const startedAt = now();
      nextStart = startedAt + intervalMs;
      return startedAt;
    });
    reservations = reservation.catch(() => {});
    return reservation;
  };
}

function isFatalProviderError(error) {
  return [401, 403].includes(error.status) || ["insufficient_quota", "billing_hard_limit_reached", "invalid_api_key"].includes(error.code);
}

function recordCheckpoint(args, item, status, details = {}) {
  if (!args.checkpoint) return;
  const checkpoint = readJson(args.checkpoint, { schema_version: 1, jobs: {} });
  const key = imageManifestKey(item);
  const old = checkpoint.jobs[key];
  checkpoint.jobs[key] = { ...old, entry_id: key, lexical_review_hash: item.provenance?.lexical_review_hash || null,
    composition_sha256: item.provenance?.composition_sha256 || null, status, updated_at: new Date().toISOString(),
    attempts: (old?.attempts || 0) + (status === "request-started" ? 1 : 0), ...details };
  fs.mkdirSync(path.dirname(args.checkpoint), { recursive: true });
  writeJsonAtomic(args.checkpoint, checkpoint);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.reviewPending) return reviewPendingImages(args);
  const plan = preparePlan(args);
  writePlanFile(args, plan);

  if (!args.execute) {
    printPlan(args, plan);
    return;
  }
  if (plan.blocked.length) {
    writeSkippedAudit(plan);
    printBlockedStop(args, plan);
    console.error(
      "STOPPED before any OpenAI client or image request. " +
        "Generation is locked while blocked cards are present."
    );
    process.exit(1);
  }
  printPlan(args, plan);
  if (plan.openaiRows.length && process.env.CONFIRM_IMAGE_SPEND !== "YES") {
    console.error("Refusing to call paid image generation without CONFIRM_IMAGE_SPEND=YES.");
    process.exit(1);
  }
  if (plan.openaiRows.length) loadLocalEnv(["OPENAI_API_KEY"]);
  if (plan.localFiles.length) {
    updatePendingManifest(args, plan.localFiles);
    console.log(`Queued local files for review: ${plan.localFiles.length}`);
  }
  if (!plan.rows.length) {
    writeSkippedAudit(plan);
    return;
  }

  const generated = [];
  let failed = 0;
  let completed = 0;
  let stopRequests = false;
  const startImageRequest = createImageStartGate(args.minImageIntervalMs);
  const checkpoint = args.checkpoint ? readJson(args.checkpoint, { jobs: {} }) : { jobs: {} };

  for (const item of plan.typographyRows) {
    try {
      const result = await renderTypographyCard(args, item);
      generated.push(item);
      updatePendingManifest(args, [item]);
      completed += 1;
      console.log(
        `OK   ${completed}/${plan.rows.length} ${item.headword} -> ` +
          `${path.relative(ROOT, item.outPath)} (${result.bytes} bytes)`
      );
    } catch (error) {
      failed += 1;
      completed += 1;
      appendRejectedAudit(item, error);
      console.error(`FAIL ${completed}/${plan.rows.length} ${item.headword}: ${error.message}`);
    }
  }

  const client = plan.openaiRows.length ? await getOpenAIClient(args) : null;
  await runPool(plan.openaiRows, args.concurrency, async (item) => {
    const previous = checkpoint.jobs[imageManifestKey(item)];
    if (previous && ["request-started", "request-uncertain", "failed"].includes(previous.status)) {
      failed += 1;
      console.error(`HELD ${item.id}: prior ${previous.status}; select an explicit reviewed retry in a new checkpoint`);
      return;
    }
    try {
      await startImageRequest();
      if (stopRequests) return;
      recordCheckpoint(args, item, "request-started");
      const result = await generateOne(client, args, item);
      const reviewedItem = { ...item, safetyReview: result.safetyReview, generationUsage: result.usage,
        providerRequestId: result.providerRequestId, rawImageSha256: result.rawImageSha256,
        framingTransform: result.framingTransform };
      generated.push(reviewedItem);
      updatePendingManifest(args, [reviewedItem]);
      recordCheckpoint(args, item, "pending-review", { image_sha256: sha256(fs.readFileSync(item.outPath)), provider_request_id: result.providerRequestId });
      completed += 1;
      console.log(
        `OK   ${completed}/${plan.rows.length} ${item.headword} -> ` +
          `${path.relative(ROOT, item.outPath)} (${result.bytes} bytes; strict review passed)`
      );
    } catch (error) {
      failed += 1;
      completed += 1;
      if ((item.source !== "verified-v3" && !item.exactIdentity) && fs.existsSync(item.outPath)) fs.rmSync(item.outPath);
      appendRejectedAudit(item, error);
      recordCheckpoint(args, item, error.generationUsage ? "failed" : "request-uncertain", { reason: error.message, provider_request_id: error.providerRequestId || error.request_id || null });
      if (isFatalProviderError(error)) stopRequests = true;
      console.error(`FAIL ${completed}/${plan.rows.length} ${item.headword}: ${error.message}`);
    }
    if (args.delayMs > 0) await delay(args.delayMs);
  }, () => stopRequests);

  writeSkippedAudit(plan);
  console.log("");
  console.log(`Generated: ${generated.length}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Pending review: ${path.relative(ROOT, PENDING_MANIFEST_PATH)}`);
  if (["verified-v3", "reviewed-queue"].includes(args.source) && failed) process.exitCode = 1;
}

if (require.main === module) main().catch((error) => {
  console.error(error);
  process.exit(1);
});

module.exports = { parseArgs, loadCoreRows, loadExpansionRows, loadVerifiedV3Rows, buildVerifiedV3Rows,
  applyVerifiedV3Compositions,
  verifiedV3CompositionIds,
  dedupeRows, preparePlan, hasExistingAnyImage, imageManifestKey, itemManifestEntry,
  outputPathFor, pendingManifestEntry, buildPrompt, reviewGeneratedImage, frameVerifiedV3Image,
  assertPendingReviewImage, pendingReviewResult, reviewImagePixels, exactLegacyImageRow, loadReviewedQueueRows,
  createImageStartGate, isFatalProviderError, exactCoreReviewedModeEvidence, validateNumericDerivation, writeJsonAtomic, allowsRequestedQuestionMark,
  imageModerationDecision, reviewModeratedImage };
