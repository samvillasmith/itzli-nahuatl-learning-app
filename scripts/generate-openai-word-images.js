#!/usr/bin/env node
"use strict";

/**
 * Generates family-safe, style-consistent vocabulary images with OpenAI.
 *
 * Default mode is a dry run. Paid generation requires both --execute and
 * CONFIRM_IMAGE_SPEND=YES.
 */

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");

const ROOT = path.resolve(__dirname, "..");
loadLocalEnv();

const SOURCE_COURSE_PATH = path.join(ROOT, "src", "data", "nahuatlahtolli-course.json");
const OPENAI_MANIFEST_PATH = path.join(ROOT, "src", "data", "openai-word-images.json");
const S3_MANIFEST_PATH = path.join(ROOT, "src", "data", "s3-word-images.json");
const LEGACY_MANIFEST_PATH = path.join(ROOT, "src", "data", "word-images.json");
const EXCLUDED_VOCAB_PATH = path.join(ROOT, "src", "data", "excluded-vocab.ts");
const BLOCKLIST_PATH = path.join(ROOT, "scripts", "config", "openai-word-image-blocklist.json");
const REVIEWED_ALLOWLIST_PATH = path.join(ROOT, "scripts", "config", "openai-reviewed-image-allowlist.json");
const APP_CONTENT_EXCLUSIONS_PATH = path.join(ROOT, "src", "data", "app-content-exclusions.json");
const SKIPPED_AUDIT_PATH = path.join(ROOT, "data", "openai-word-images-skipped.json");
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
  outDir:
    process.env.OPENAI_IMAGE_OUT_DIR ||
    path.join(ROOT, "public", "generated", "word-images", "openai"),
  source: process.env.OPENAI_IMAGE_SOURCE || "all",
  delayMs: Number(process.env.OPENAI_IMAGE_DELAY_MS || "600"),
};

const QUESTIONABLE_GLOSS_MARKERS = [
  "misplaced",
  "off-theme",
  "non-standard",
  "not standard",
  "possible data error",
  "not widely attested",
  "not a core",
  "not attested",
  "likely corruption",
  "classical only",
  "central nahuatl",
  "comparative",
  "dubious",
  "uncertain",
  "fabricated",
  "wrong definition",
  "not ehn",
  "not learner-facing",
  "mythological only",
  "specialized",
  "obscure",
  "data error",
];

const CORE_VOCAB_LIMITS = {
  9: 28,
  10: 28,
  21: 30,
  27: 30,
  29: 28,
  33: 24,
  34: 28,
  35: 28,
  36: 28,
  37: 32,
  38: 32,
  39: 28,
  40: 32,
  41: 28,
  42: 32,
  43: 28,
};

const FOCUSED_SEMANTIC_DOMAINS = {
  33: new Set(["months"]),
  34: new Set(["numbers", "curated_expansion"]),
  35: new Set(["colors", "sizes_shapes"]),
  36: new Set(["qualities", "curated_expansion"]),
  37: new Set(["animals"]),
  38: new Set(["food_extra", "curated_expansion"]),
  39: new Set(["household"]),
  40: new Set(["nature", "curated_expansion"]),
  41: new Set(["community"]),
  42: new Set(["verbs_extra"]),
  43: new Set(["adverbs", "curated_expansion"]),
};

const FOCUSED_THEME_PATTERNS = {
  33: /\b(month|week|day|year|morning|night|dawn|today|tomorrow|yesterday|time|january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  34: /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|hundred|first|second|third|times|count|number)\b/i,
  35: /\b(color|colour|red|blue|green|yellow|white|black|brown|pink|grey|gray|orange|purple|big|small|tall|short|long|wide|round|flat|straight|thick|thin)\b/i,
  36: /\b(good|bad|new|old|hard|difficult|easy|expensive|cheap|pure|dirty|clean|cooked|hot|cold|warm|dry|wet|heavy|light|strong|weak|happy|sad|sick|healthy|hungry|thirsty|sweet|bitter|sour|tasty|dark|bright)\b/i,
  37: /\b(animal|bird|fish|snake|dog|cat|horse|pig|chicken|turkey|deer|rabbit|frog|bee|ant|spider|duck|sheep|turtle|donkey|grasshopper|worm|dove|heron)\b/i,
  38: /\b(food|eat|corn|maize|bean|chili|tortilla|atole|sugar|squash|fruit|guava|jicama|milk|pineapple|avocado|pumpkin|drink|sauce|dough|tamal|honey|meat|salt)\b/i,
  39: /\b(house|home|room|door|table|chair|mat|blanket|pot|cup|bowl|basket|letter|writing|mirror|soap|stairs|garden|kitchen|hearth|tool|trap|sack|book)\b/i,
  40: /\b(water|river|lake|rain|cloud|wind|sky|sun|moon|star|earth|stone|rock|mountain|field|sand|tree|leaf|root|flower|grass|ice|fire|cave|thorn|rainbow|flame)\b/i,
  41: /\b(person|city|village|town|community|friend|doctor|man|woman|sir|soldier|hunter|priest|musician|traveler|festival|hospital|humanity|worker|teacher)\b/i,
  42: /\bto\s+[a-z]/i,
  43: /\b(again|always|never|often|much|little|very|more|also|still|already|just|only|here|there|near|where|how|when|suddenly|slowly|quickly|well|thus|together|first|later|afterwards|beforehand)\b/i,
};

const FOCUSED_BLOCK_PATTERNS = {
  40: /\bice cream\b/i,
  41: /\b(german|spaniard|guatemalan|blouse|skirt)\b/i,
  43: /\b(bag|cub|puma)\b/i,
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

function hasExcludedGloss(gloss) {
  const normalized = String(gloss || "").toLowerCase();
  return QUESTIONABLE_GLOSS_MARKERS.some((blocker) => normalized.includes(blocker));
}

function loadExcludedVocabIds() {
  const text = fs.readFileSync(EXCLUDED_VOCAB_PATH, "utf8");
  const match = text.match(/EXCLUDED_VOCAB_IDS:[\s\S]*?new Set\(\[([\s\S]*?)\]\)/);
  if (!match) return new Set();

  const uncommented = match[1].replace(/\/\/.*$/gm, "");
  return new Set([...uncommented.matchAll(/\b\d+\b/g)].map((item) => Number(item[0])));
}

function isFocusedLexiconMatch(item, lessonNumber) {
  const pattern = FOCUSED_THEME_PATTERNS[lessonNumber];
  if (!pattern) return true;

  const gloss = item.gloss || "";
  const blocked = FOCUSED_BLOCK_PATTERNS[lessonNumber];
  if (blocked?.test(gloss)) return false;

  const pos = String(item.partOfSpeech || "").toLowerCase();
  if (lessonNumber === 34) return /^(num|number|adv|adverb)$/.test(pos) && pattern.test(gloss);
  if (lessonNumber === 35) return (pos === "adj" || pos === "adjective") && pattern.test(gloss);
  if (lessonNumber === 36) {
    return (pos === "adj" || pos === "adjective" || pos === "verb") && pattern.test(gloss);
  }
  if (lessonNumber === 42) return pos === "verb" && pattern.test(gloss);
  if (lessonNumber === 43) {
    return /^(adv|adverb|particle|conj|conjunction|prep|preposition)$/.test(pos) && pattern.test(gloss);
  }

  return pattern.test(gloss);
}

function isCoreVocabItem(item, excludedIds) {
  if (excludedIds.has(Number(item.id))) return false;
  if (hasExcludedGloss(item.gloss)) return false;

  const lessonNumber = item.lessonNumber || 0;
  const focusedDomains = FOCUSED_SEMANTIC_DOMAINS[lessonNumber];
  if (!focusedDomains) return true;

  const domain = item.semanticDomain || "";
  if (focusedDomains.has(domain)) return true;
  if (domain.startsWith("lexicon_")) return isFocusedLexiconMatch(item, lessonNumber);
  return true;
}

function filterCoreRows(rows, excludedIds) {
  const byLesson = new Map();
  for (const row of rows) {
    const lessonRows = byLesson.get(row.lessonNumber) || [];
    lessonRows.push(row);
    byLesson.set(row.lessonNumber, lessonRows);
  }

  return [...byLesson.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([lessonNumber, lessonRows]) => {
      const filtered = lessonRows.filter((row) => isCoreVocabItem(row, excludedIds));
      const limit = CORE_VOCAB_LIMITS[lessonNumber];
      return (typeof limit === "number" ? filtered.slice(0, limit) : filtered).map((row) => ({
        ...row,
        gloss: sanitizeGloss(row.gloss),
      }));
    });
}

function loadCoreRows(args) {
  const db = new Database(resolveDbPath(), { readonly: true });
  const rows = db
    .prepare(
      `SELECT id, lesson_number AS lessonNumber, rank,
              display_form AS headword, gloss_en AS gloss,
              part_of_speech AS partOfSpeech,
              semantic_domain AS semanticDomain
       FROM lesson_vocab
       WHERE display_form IS NOT NULL
         AND length(trim(display_form)) > 0
       ORDER BY lesson_number, rank, id`
    )
    .all()
    .map((row) => ({
      source: "core",
      sourceId: String(row.id),
      id: row.id,
      lessonNumber: row.lessonNumber,
      rank: row.rank,
      headword: row.headword,
      gloss: row.gloss,
      partOfSpeech: row.partOfSpeech,
      semanticDomain: row.semanticDomain,
    }));
  db.close();

  return filterCoreRows(rows, loadExcludedVocabIds()).filter((row) => includeRow(args, row));
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

  const pos = String(row.partOfSpeech || "").toLowerCase();
  if (pos === "letter" || pos === "phoneme") return false;

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
    (reviewed && ["object-only", "bird-only"].includes(reviewed.mode)
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
  const childSafetyLine = reviewed
    ? reviewed.mode === "swaddled-child"
      ? "For this reviewed baby card only, follow the baby exception exactly. Do not show any other child, teen, student, minor, or adult."
      : "For this reviewed card, do not show children, babies, infants, teens, students, minors, or childlike proportions."
    : "If a child appears, use a simple fully clothed school, family, or play scene with shoes and covered legs. Do not show bedtime, bathing, changing clothes, medical care, or any vulnerable/exposed-body context.";

  return [
    "Create one family-safe vocabulary-card illustration for a Nahuatl language-learning app.",
    `Target word: ${item.headword}.`,
    `Meaning to illustrate: ${gloss}.`,
    extraGlosses,
    "Style: warm flat editorial illustration with a hand-cut paper feel, subtle printed grain, cream parchment background, simple rounded geometric shapes, bold dark-brown accent lines, and a restrained palette of terracotta, marigold, cacao brown, leaf green, and soft cream.",
    "Composition: square image, centered object or friendly everyday scene, uncluttered, easy to understand at small flashcard size. Leave a quiet cream band at the bottom where the app can render the word label.",
    "Cultural direction: respectful educational style, lightly Mesoamerican and Huasteca-inspired through color and texture only; do not imitate sacred objects, ceremonial scenes, or living artists.",
    "Human figures, if used, must be fully clothed in modest everyday clothing with opaque shirts, covered legs, and shoes. Do not show exposed torso, chest, abdomen, hips, thighs, buttocks, underwear, swimwear, intimate body parts, bare feet, or unclothed bodies.",
    childSafetyLine,
    "For allowed health or care concepts, use neutral objects such as simple containers, herbs, or calm household items. Do not show patients, procedures, injuries, distress, or exposed bodies.",
    objectOnly
      ? "Object-only safety override: do not show people, faces, hands, feet, silhouettes, patients, beds with people, people in water, or anyone receiving care. Use only neutral objects, plants, landscapes, weather, food, tools, furniture, containers, or symbolic scenes."
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
  const direct = manifest[headword];
  if (direct) return direct;
  const key = normalizeKey(headword);
  const matchedKey = Object.keys(manifest).find((value) => normalizeKey(value) === key && manifest[value]);
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

function preparePlan(args) {
  const manifests = {
    openai: readJson(OPENAI_MANIFEST_PATH, {}),
    s3: readJson(S3_MANIFEST_PATH, {}),
    legacy: readJson(LEGACY_MANIFEST_PATH, {}),
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
    const reviewed = reviewedAllowlistEntry(item, reviewedAllowlist);
    const appExclusion = classifyAppExcluded(item, appExclusions);
    if (appExclusion && !reviewed) {
      appExcluded.push({ ...item, appExclusion });
      continue;
    }

    const block = classifyBlocked(item, blocklist);
    if (block && !reviewed) {
      imageExcluded.push({ ...item, block });
      continue;
    }

    const openaiAlready = openaiEntryHasFile(manifestEntryFor(manifests.openai, item.headword));
    if (!args.force && openaiAlready) {
      existing.push({ ...item, existingReason: "openai-manifest" });
      continue;
    }
    if (!args.force && args.missingOnly && hasExistingAnyImage(item, manifests)) {
      existing.push({ ...item, existingReason: "any-image-manifest" });
      continue;
    }

    const outPath = outputPathFor(args, item);
    if (!args.force && fs.existsSync(outPath)) {
      localFiles.push({
        ...item,
        reviewed,
        prompt: buildPrompt(item, blocklist, reviewedAllowlist),
        outPath,
      });
      continue;
    }

    rows.push({
      ...item,
      reviewed,
      prompt: buildPrompt(item, blocklist, reviewedAllowlist),
      outPath,
    });
  }

  const limitedRows = args.limit > 0 ? rows.slice(0, args.limit) : rows;
  const totalPromptTokens = limitedRows.reduce(
    (sum, item) => sum + Math.ceil(item.prompt.length / 4),
    0
  );
  const outputUsd = limitedRows.length * args.outputUnitCostUsd;
  const inputUsd = (totalPromptTokens / 1_000_000) * args.inputTokenCostPerMillionUsd;

  return {
    vocabulary,
    appExcluded,
    imageExcluded,
    blocked,
    existing,
    localFiles,
    rows: limitedRows,
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
  for (const item of plan.rows.slice(0, 3)) {
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
          omitted_by_limit: plan.omittedByLimit,
        },
        cost: plan.cost,
        to_generate: plan.rows.map((item) => ({
          headword: item.headword,
          gloss: item.gloss || item.glosses?.[0] || "",
          glosses: item.glosses || [],
          lesson_number: item.lessonNumber,
          source_ids: item.sourceIds,
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

  const buffer = Buffer.from(image.b64_json, "base64");
  fs.writeFileSync(item.outPath, buffer);
  return { bytes: buffer.length, usage: response.usage };
}

function updateManifest(args, generated) {
  if (!generated.length) return;
  const manifest = readJson(OPENAI_MANIFEST_PATH, {});
  for (const item of generated) {
    manifest[item.headword] = {
      url: publicUrlFor(args, item.outPath),
      license: "OpenAI-generated image; review before publication",
      author: args.model,
      alt: item.gloss
        ? `Illustration for ${item.headword}: ${item.gloss}`
        : `Illustration for ${item.headword}`,
      source: "openai",
      model: args.model,
      quality: args.quality,
      size: args.size,
      output_format: args.outputFormat,
      generated_at: new Date().toISOString(),
    };
  }

  const sorted = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => normalizeKey(a).localeCompare(normalizeKey(b)))
  );
  fs.writeFileSync(OPENAI_MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
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

  if (!args.execute) {
    printPlan(args, plan);
    writePlanFile(args, plan);
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
  if (process.env.CONFIRM_IMAGE_SPEND !== "YES") {
    console.error("Refusing to call paid image generation without CONFIRM_IMAGE_SPEND=YES.");
    process.exit(1);
  }
  if (plan.localFiles.length) {
    updateManifest(args, plan.localFiles);
    console.log(`Indexed local files: ${plan.localFiles.length}`);
  }
  if (!plan.rows.length) {
    writeSkippedAudit(plan);
    return;
  }

  const client = await getOpenAIClient();
  const generated = [];
  let failed = 0;
  let completed = 0;

  await runPool(plan.rows, args.concurrency, async (item) => {
    try {
      const result = await generateOne(client, args, item);
      generated.push(item);
      updateManifest(args, [item]);
      completed += 1;
      console.log(
        `OK   ${completed}/${plan.rows.length} ${item.headword} -> ` +
          `${path.relative(ROOT, item.outPath)} (${result.bytes} bytes)`
      );
    } catch (error) {
      failed += 1;
      completed += 1;
      console.error(`FAIL ${completed}/${plan.rows.length} ${item.headword}: ${error.message}`);
    }
    if (args.delayMs > 0) await delay(args.delayMs);
  });

  writeSkippedAudit(plan);
  console.log("");
  console.log(`Generated: ${generated.length}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Manifest:  ${path.relative(ROOT, OPENAI_MANIFEST_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
