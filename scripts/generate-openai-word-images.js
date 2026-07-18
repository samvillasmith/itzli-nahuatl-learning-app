#!/usr/bin/env node
"use strict";

/**
 * Generates family-safe, style-consistent vocabulary images with OpenAI.
 *
 * Default mode is a dry run. Paid generation requires both --execute and
 * CONFIRM_IMAGE_SPEND=YES.
 */

const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");
const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");

const ROOT = path.resolve(__dirname, "..");
loadLocalEnv();

const SOURCE_COURSE_PATH = path.join(ROOT, "src", "data", "nahuatlahtolli-course.json");
const OPENAI_MANIFEST_PATH = path.join(ROOT, "src", "data", "openai-word-images.json");
const S3_MANIFEST_PATH = path.join(ROOT, "src", "data", "s3-word-images.json");
const LEGACY_MANIFEST_PATH = path.join(ROOT, "src", "data", "word-images.json");
const BLOCKLIST_PATH = path.join(ROOT, "scripts", "config", "openai-word-image-blocklist.json");
const REVIEWED_ALLOWLIST_PATH = path.join(ROOT, "scripts", "config", "openai-reviewed-image-allowlist.json");
const APP_CONTENT_EXCLUSIONS_PATH = path.join(ROOT, "src", "data", "app-content-exclusions.json");
const SKIPPED_AUDIT_PATH = path.join(ROOT, "data", "openai-word-images-skipped.json");
const REJECTED_AUDIT_PATH = path.join(ROOT, "data", "openai-word-images-rejected.json");
const PENDING_MANIFEST_PATH = path.join(ROOT, "data", "openai-word-images-pending.json");
const S3_IMAGE_BASE_URL =
  process.env.OPENAI_IMAGE_PUBLIC_BASE_URL ||
  "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";

function loadLocalEnv() {
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
  source: process.env.OPENAI_IMAGE_SOURCE || "all",
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
      i += 1;
    } else if (arg === "--input-token-cost") {
      args.inputTokenCostPerMillionUsd = Number(value);
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

  if (!["all", "core", "source-course"].includes(args.source)) {
    console.error("--source must be all, core, or source-course");
    process.exit(1);
  }
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

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/generate-openai-word-images.js --dry-run
  node scripts/generate-openai-word-images.js --dry-run --source core --missing-only
  CONFIRM_IMAGE_SPEND=YES node scripts/generate-openai-word-images.js --execute --limit 25

Options:
  --source all|core|source-course  Vocabulary source. Default: ${DEFAULTS.source}
  --missing-only                   Skip words with any existing OpenAI, S3, or legacy image
  --include-phrases                Include multi-word learner phrases. Default: off
  --force                          Regenerate existing OpenAI image files
  --limit N                        Cap rows for testing. Default: no cap
  --write-plan FILE                Write the local plan JSON without calling OpenAI
  --ids a,b,c                      Only generate selected vocab/source ids
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
  return { filterCoreVocab, collapseVariants, orthographySearchVariants, getCuratedUnitVocab };
}

function loadCoreRows(args) {
  const { filterCoreVocab, collapseVariants, getCuratedUnitVocab } = loadProductionCoreTools();
  const db = new Database(resolveDbPath(), { readonly: true });
  const rows = db
    .prepare(
      `SELECT id, entry_id, rank, display_form AS headword, display_form,
              gloss_en, part_of_speech,
              lesson_number, lesson_number AS first_lesson_number,
              semantic_domain
       FROM lesson_vocab
       WHERE display_form IS NOT NULL
         AND length(trim(display_form)) > 0
       ORDER BY lesson_number, rank, id`
    )
    .all();
  db.close();

  const byLesson = new Map();
  for (const row of rows) {
    const lessonRows = byLesson.get(row.lesson_number) || [];
    lessonRows.push(row);
    byLesson.set(row.lesson_number, lessonRows);
  }

  const coreRows = [...byLesson.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([lessonNumber, lessonRows]) =>
      collapseVariants(filterCoreVocab(lessonRows, lessonNumber), lessonNumber).cards
    )
    .map((row) => ({
      source: "core",
      sourceId: String(row.id),
      id: row.id,
      lessonNumber: row.first_lesson_number,
      rank: row.rank,
      headword: row.headword,
      gloss: row.gloss_en,
      partOfSpeech: row.part_of_speech,
      semanticDomain: row.semantic_domain,
    }))
    .filter((row) => includeRow(args, row));

  const curatedRows = getCuratedUnitVocab().map((row) => ({
    source: "curated-unit",
    sourceId: row.entry_id,
    id: row.id,
    lessonNumber: row.first_lesson_number,
    rank: row.rank,
    headword: row.imageHeadword || row.headword,
    gloss: row.gloss_en,
    partOfSpeech: row.part_of_speech,
    semanticDomain: row.semantic_domain,
    sourceUrl: row.sourceUrl,
  })).filter((row) => includeRow(args, row));

  return [...coreRows, ...curatedRows];
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
  return dedupeRows(rows, args);
}

function dedupeRows(rows, args) {
  const byHeadword = new Map();
  for (const row of rows) {
    if (!isWordLike(row, args)) continue;

    const key = normalizeKey(row.headword);
    if (!key) continue;

    const gloss = sanitizeGloss(row.gloss);
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
  const headword = String(row.headword || "").trim();
  if (!headword) return false;

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

function reviewedAllowlistEntry(item, allowlist) {
  return allowlist.byHeadword.get(normalizeSafetyKey(item.headword)) || null;
}

function loadAppContentExclusions() {
  const config = readJson(APP_CONTENT_EXCLUSIONS_PATH, { headwords: [], patterns: [] });
  return {
    headwords: new Set((config.headwords || []).map(normalizeSafetyKey)),
    rules: (config.patterns || []).map((pattern) => new RegExp(pattern, "iu")),
  };
}

function classifyAppExcluded(item, exclusions) {
  const values = [
    item.headword,
    item.gloss,
    ...(item.glosses || []),
    item.partOfSpeech,
    item.semanticDomain,
    item.sourceUrl,
  ]
    .filter(Boolean)
    .map(String);

  for (const value of values) {
    if (
      exclusions.headwords.has(normalizeSafetyKey(value)) ||
      hasExcludedHeadwordToken(value, exclusions.headwords)
    ) {
      return { category: "app-content-excluded", match: value };
    }
  }

  const haystack = values.join(" ");
  const normalizedHaystack = normalizeSafetyKey(haystack);
  for (const rule of exclusions.rules) {
    const match = haystack.match(rule) || normalizedHaystack.match(rule);
    if (match) return { category: "app-content-excluded", match: match[0] };
  }

  return null;
}

function classifyBlocked(item, blocklist) {
  const headwordKey = normalizeKey(item.headword);
  if (blocklist.blockedHeadwords.has(headwordKey)) {
    return { category: "blocked-headword", match: item.headword };
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

  for (const rule of blocklist.rules) {
    const match = haystack.match(rule.pattern);
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

function buildPrompt(item, blocklist, reviewedAllowlist) {
  const reviewed = reviewedAllowlistEntry(item, reviewedAllowlist);
  const gloss = item.gloss || item.glosses?.[0] || item.headword;
  const extraGlosses =
    !reviewed && item.glosses?.length > 1
      ? `Other learner-facing glosses: ${item.glosses.slice(1, 4).join("; ")}.`
      : "";
  const objectOnly =
    classifyObjectOnly(item, blocklist) ||
    (reviewed && ["object-only", "bird-only", "animal-only"].includes(reviewed.mode)
      ? { category: "reviewed-object-only", match: reviewed.headword }
      : null);
  const key = normalizeSafetyKey(item.headword);
  const specificComposition =
    key === "tlahcoyohual"
      ? "Specific composition for midnight: show only a crescent moon, stars, a dark sky, and quiet landscape or plant silhouettes. No people, no children, no mother, no bed, no blanket, no faces, no indoor scene."
      : "";
  const reviewedRestriction = reviewed
    ? [
        "Reviewed allowlist restriction: this card was manually approved only under the following stricter safety constraints.",
        reviewed.mode === "swaddled-child"
          ? reviewedAllowlist.babyExceptionInstruction
          : reviewedAllowlist.defaultNoChildrenInstruction,
        reviewed.instruction,
      ]
        .filter(Boolean)
        .join(" ")
    : "";
  const childSafetyLine = reviewed?.mode === "swaddled-child"
    ? "For this reviewed baby card only, show one fully clothed or fully swaddled baby exactly as approved. Do not show any other child, teen, student, minor, or adult."
    : "Do not show children, babies, infants, teens, students, minors, childlike figures, or childlike proportions.";

  return [
    "Create one family-safe vocabulary-card illustration for a Nahuatl language-learning app.",
    `Target word: ${item.headword}.`,
    reviewed && objectOnly
      ? `Approved composition to illustrate instead of the literal meaning: ${reviewed.instruction}`
      : `Meaning to illustrate: ${gloss}.`,
    extraGlosses,
    "Style: warm flat editorial illustration with a hand-cut paper feel, subtle printed grain, cream parchment background, simple rounded geometric shapes, bold dark-brown accent lines, and a restrained palette of terracotta, marigold, cacao brown, leaf green, and soft cream.",
    "Composition: square image, centered object or friendly everyday scene, uncluttered, easy to understand at small flashcard size. Leave a quiet cream band at the bottom where the app can render the word label.",
    "Cultural direction: respectful educational style, lightly Mesoamerican and Huasteca-inspired through color and texture only; do not imitate sacred objects, ceremonial scenes, or living artists.",
    "Human figures, if used, must be fully clothed in modest everyday clothing with opaque shirts, covered legs, and shoes. Do not show exposed torso, chest, abdomen, hips, thighs, buttocks, underwear, swimwear, intimate body parts, bare feet, or unclothed bodies.",
    childSafetyLine,
    "For allowed health or care concepts, use neutral objects such as simple containers, herbs, or calm household items. Do not show patients, procedures, injuries, distress, or exposed bodies.",
    objectOnly
      ? "Object-only safety override: do not show people, faces, hands, feet, human silhouettes, patients, beds with people, people in water, or anyone receiving care. Use only the specifically approved neutral objects, animals, plants, landscapes, weather, food, tools, furniture, containers, or symbolic scenes."
      : "",
    specificComposition,
    reviewedRestriction,
    "Do not include text, letters, numerals, watermarks, logos, UI, flags, political symbols, gore, nudity, weapons, modern alcohol bottles, intoxication, drugs, sexual content, suggestive poses, or body-exposure imagery.",
    "For abstract words, show a simple expression, gesture, relationship, or everyday action. For animals, plants, foods, and objects, show the item clearly.",
  ]
    .filter(Boolean)
    .join("\n");
}

function outputPathFor(args, item) {
  const sourceId = slugify(item.sourceIds?.[0] || item.sourceId || item.id);
  const base = slugify(item.headword) || "word";
  return path.join(args.outDir, `${base}-${sourceId}.${args.outputFormat}`);
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
    const pendingEntry = manifestEntryFor(manifests.pending, item.headword);
    if (!args.force && pendingEntryHasReviewedFile(pendingEntry)) {
      existing.push({ ...item, existingReason: "pending-reviewed-file" });
      continue;
    }
    const activeEntry = manifestEntryFor(manifests.openai, item.headword);
    const activeRendererAlreadyPublished =
      openaiEntryHasFile(activeEntry) &&
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
    if (appExclusion && !reviewed) {
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
    if (block && !reviewed) {
      const blockedItem = { ...item, block };
      imageExcluded.push(blockedItem);
      blocked.push(blockedItem);
      continue;
    }

    const outPath = outputPathFor(args, item);
    rows.push({
      ...item,
      reviewed,
      renderMode,
      prompt: renderMode === "openai" ? buildPrompt(item, blocklist, reviewedAllowlist) : "",
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
  const outputUsd = openaiRows.length * args.outputUnitCostUsd;
  const inputUsd = (totalPromptTokens / 1_000_000) * args.inputTokenCostPerMillionUsd;

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
      totalUsd: outputUsd + inputUsd,
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
  console.log(`Output unit cost:   $${args.outputUnitCostUsd.toFixed(3)} per image`);
  console.log(`Approx prompt cost: ${dollars(plan.cost.inputUsd)} (${plan.cost.promptTokensApprox} tokens est.)`);
  console.log(`Image output cost:  ${dollars(plan.cost.outputUsd)}`);
  console.log(`Estimated total:    ${dollars(plan.cost.totalUsd)}`);
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

async function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(1);
  }
  const { default: OpenAI } = await import("openai");
  return new OpenAI();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateOne(client, args, item) {
  fs.mkdirSync(path.dirname(item.outPath), { recursive: true });

  const response = await client.images.generate({
    model: args.model,
    prompt: item.prompt,
    size: args.size,
    quality: args.quality,
    n: 1,
    output_format: args.outputFormat,
    moderation: "auto",
  });

  const image = response.data?.[0];
  if (!image?.b64_json) {
    throw new Error("OpenAI image response did not include b64_json data.");
  }

  const rawBuffer = Buffer.from(image.b64_json, "base64");
  const buffer = await removeGeneratedLabelBand(rawBuffer, args.outputFormat);
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
  const verdict = moderation.results?.[0];
  if (!verdict || verdict.flagged) {
    const categories = verdict
      ? Object.entries(verdict.categories || {}).filter(([, value]) => value).map(([key]) => key)
      : ["moderation-empty"];
    throw new Error(`Generated image failed visual moderation: ${categories.join(", ")}`);
  }

  const safetyReview = await reviewGeneratedImage(client, args, item, reviewedBase64);
  fs.writeFileSync(item.outPath, buffer);
  return { bytes: buffer.length, usage: response.usage, safetyReview };
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
  const reviewedRestriction = item.reviewed?.instruction || "No card-specific exception.";
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
              `Required composition: ${reviewedRestriction}`,
              "Hard rules: no babies, children, teens, students who could be minors, or childlike figures; all visible people must clearly be adults age 25+ and fully clothed in opaque modest clothing with covered torso, chest, abdomen, hips, thighs, and legs; no bare feet; no nudity or ambiguous covered-body exposure; no bathing, showering, changing, toilet, urination, defecation, body waste, sexual content, suggestive pose, person in a bed, vulnerable care scene, injury, blood, or gore; no text, letters, numerals, logos, labels, or watermarks. The only generated exception is the exact card-specific composition above, if one is stated.",
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
            all_people_clearly_adult_25_plus_and_fully_clothed: { type: "boolean" },
            contains_nudity_or_ambiguous_covered_body_exposure: { type: "boolean" },
            contains_bathing_showering_or_changing: { type: "boolean" },
            contains_toilet_urination_defecation_or_body_waste: { type: "boolean" },
            contains_sexual_or_suggestive_content: { type: "boolean" },
            contains_person_in_bed_or_vulnerable_care_scene: { type: "boolean" },
            contains_injury_blood_or_gore: { type: "boolean" },
            contains_unapproved_text_letters_numbers_logo_or_watermark: { type: "boolean" },
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
            "contains_bathing_showering_or_changing",
            "contains_toilet_urination_defecation_or_body_waste",
            "contains_sexual_or_suggestive_content",
            "contains_person_in_bed_or_vulnerable_care_scene",
            "contains_injury_blood_or_gore",
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
    "contains_bathing_showering_or_changing",
    "contains_toilet_urination_defecation_or_body_waste",
    "contains_sexual_or_suggestive_content",
    "contains_person_in_bed_or_vulnerable_care_scene",
    "contains_injury_blood_or_gore",
    "contains_unapproved_text_letters_numbers_logo_or_watermark",
  ];
  const hardFailures = forbidden.filter((field) => review[field] === true);
  if (review.contains_people && !review.all_people_clearly_adult_25_plus_and_fully_clothed) {
    hardFailures.push("people_not_clearly_adult_25_plus_and_fully_clothed");
  }
  if (["object-only", "bird-only", "animal-only"].includes(item.reviewed?.mode) && review.contains_people) {
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
  return review;
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
  fs.writeFileSync(item.outPath, buffer);
  return { bytes: buffer.length };
}

function updatePendingManifest(args, generated) {
  if (!generated.length) return;
  const manifest = readJson(PENDING_MANIFEST_PATH, {});
  for (const item of generated) {
    const typography = item.renderMode === "typography";
    manifest[item.headword] = {
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
    };
  }

  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => normalizeKey(a).localeCompare(normalizeKey(b)))
  );
  fs.mkdirSync(path.dirname(PENDING_MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(PENDING_MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
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
  });
  fs.mkdirSync(path.dirname(REJECTED_AUDIT_PATH), { recursive: true });
  fs.writeFileSync(REJECTED_AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
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
  fs.writeFileSync(SKIPPED_AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
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

  const client = plan.openaiRows.length ? await getOpenAIClient() : null;
  await runPool(plan.openaiRows, args.concurrency, async (item) => {
    try {
      const result = await generateOne(client, args, item);
      const reviewedItem = { ...item, safetyReview: result.safetyReview };
      generated.push(reviewedItem);
      updatePendingManifest(args, [reviewedItem]);
      completed += 1;
      console.log(
        `OK   ${completed}/${plan.rows.length} ${item.headword} -> ` +
          `${path.relative(ROOT, item.outPath)} (${result.bytes} bytes; strict review passed)`
      );
    } catch (error) {
      failed += 1;
      completed += 1;
      if (fs.existsSync(item.outPath)) fs.rmSync(item.outPath);
      appendRejectedAudit(item, error);
      console.error(`FAIL ${completed}/${plan.rows.length} ${item.headword}: ${error.message}`);
    }
    if (args.delayMs > 0) await delay(args.delayMs);
  });

  writeSkippedAudit(plan);
  console.log("");
  console.log(`Generated: ${generated.length}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Pending review: ${path.relative(ROOT, PENDING_MANIFEST_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
