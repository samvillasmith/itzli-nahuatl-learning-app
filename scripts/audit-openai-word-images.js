#!/usr/bin/env node
"use strict";
const { nonOverridableMetadataReason, assertImagePublicationGuard } = require("./lib/image-depiction-guardrails");
const { isPublishedImageReviewSource } = require("../src/lib/image-review-source.cjs");

/**
 * Audits already-generated OpenAI word images against the strict text blocklist.
 * Add --visual to run the published pixels through image moderation as well.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "src", "data", "openai-word-images.json");
const BLOCKLIST_PATH = path.join(ROOT, "scripts", "config", "openai-word-image-blocklist.json");
const REVIEWED_ALLOWLIST_PATH = path.join(ROOT, "scripts", "config", "openai-reviewed-image-allowlist.json");
const PUBLIC_ROOT = path.join(ROOT, "public");
const GENERATED_DIR = path.join(PUBLIC_ROOT, "generated", "word-images", "openai");
const S3_IMAGE_BASE_URL = "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";
const MODERATION_MODEL = "omni-moderation-latest";
const NON_OVERRIDABLE_CATEGORIES = new Set([
  "adult-sexual",
  "covered-body-or-exposure-risk",
  "clothing-change-exposure-risk",
  "body-waste",
  "graphic-injury-or-death",
  "hate-or-extremism",
]);

// Offline metadata audits do not need credentials or environment files.
if (process.argv.includes("--visual")) for (const name of [".env.local", ".env"]) {
  const filePath = path.join(ROOT, name);
  if (!fs.existsSync(filePath)) continue;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !(match[1].trim() in process.env)) {
      process.env[match[1].trim()] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }
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

function loadBlocklist() {
  const config = readJson(BLOCKLIST_PATH, { blockedHeadwords: [], rules: [] });
  return {
    blockedHeadwords: new Set((config.blockedHeadwords || []).map(normalizeKey)),
    rules: (config.rules || []).map((rule) => ({
      category: rule.category || "blocked",
      pattern: new RegExp(rule.pattern, "i"),
    })),
  };
}

function loadReviewedAllowlist() {
  const config = readJson(REVIEWED_ALLOWLIST_PATH, { entries: [] });
  return new Map(
    (config.entries || []).map((entry) => [normalizeSafetyKey(entry.headword), entry.mode || "reviewed"])
  );
}

function isExactPublishedReview(entry) {
  return (
    entry?.review_status === "approved" &&
    entry?.review_scope === "exact-published-image" &&
    entry?.reviewed_url === entry?.url &&
    isPublishedImageReviewSource(entry?.review_source)
  );
}

function stripReviewedMatches(value, matches) {
  let cleaned = value;
  for (const approvedMatch of matches || []) {
    const escaped = String(approvedMatch).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }
  return cleaned;
}

// The historical allowlist uses source spellings; the V3 manifest uses exact
// entry IDs. Recognize only these source-and-composition-bound adult lessons.
function hasExactReviewedBodyScene(headword, entry, reviewedHeadwords) {
  const expected = {
    "core-808016": { headword: "noixtiyol", en: "my eye", es: "mi ojo", spelling: "noīxtiyōl", index: 16,
      lexicalHash: "56d2f676710f607cf651cd5b1efb63a6a4eb0351a3838b66f79c8751d1862a31",
      modeHash: "c4541b261277a157f276be2e4ca437c21acda86a8a4ba1a3afd9eacbf7ba2101",
      compositionHash: "620c179e682539b070f8c06c5a11fd6aa34e33b5c4b4b6cf57a761a5c3a2c975" },
    "core-808024": { headword: "nomahpil", en: "my finger", es: "mi dedo", spelling: "nomāhpil", index: 24,
      lexicalHash: "e6e6a1525d782809f2a30ae5ea789980f8da39653eef3dd2e37ef21be681f7df",
      modeHash: "30e48109a9762350fa72d4000f8d192a1f7b72fb35bd0cadef991bf029af1271",
      compositionHash: "9916aef472f58acef46793e7485ff2ffe78eb3ad69564477c249ef4e0efee228" },
  }[headword];
  const provenance = entry?.provenance, evidence = provenance?.reviewed_image_mode_evidence;
  if (!expected || !isExactPublishedReview(entry) || entry.entry_id !== headword || provenance?.entry_id !== headword ||
      provenance.headword !== expected.headword || entry.meaning_en !== expected.en || entry.meaning_es !== expected.es ||
      provenance.meaning_en !== expected.en || provenance.meaning_es !== expected.es ||
      entry.alt !== `Illustration for ${expected.headword}: ${expected.en}` ||
      provenance.lexical_review_hash !== expected.lexicalHash || provenance.composition_sha256 !== expected.compositionHash ||
      evidence?.entry_id !== headword || evidence.headword !== expected.headword || evidence.meaning_en !== expected.en ||
      evidence.meaning_es !== expected.es || evidence.source_spelling !== expected.spelling ||
      evidence.source_import_sha256 !== "36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f" ||
      evidence.lesson_number !== 8 || evidence.vocabulary_index !== expected.index || evidence.evidence_role !== "exact-licensed-vocabulary" ||
      evidence.reviewed_image_mode !== "adult-body" || evidence.reviewed_image_mode_sha256 !== expected.modeHash ||
      reviewedHeadwords.get(normalizeSafetyKey(expected.spelling)) !== "adult-body") return false;
  try { assertImagePublicationGuard(expected.headword, entry); return true; } catch { return false; }
}

function hasExactReviewedPalmTree(headword, entry) {
  const exact = headword === "core-904003" && entry?.entry_id === headword && isExactPublishedReview(entry) &&
    entry.meaning_en === "palm tree" && entry.meaning_es === "palmera" && entry.alt === "Illustration for soyatl: palm tree" &&
    entry.provenance?.entry_id === headword && entry.provenance.headword === "soyatl" &&
    entry.provenance.meaning_en === "palm tree" && entry.provenance.meaning_es === "palmera" &&
    entry.provenance.lexical_review_hash === "f0112a64d4c57634b4545b164406d9b3e44be5f25e09085c7188f0cfb83fd8fc" &&
    entry.provenance.composition_sha256 === "94aba9a3d3cc046e67878186a73335a5f3d5449aef23a740d20fe55b8f697d61" &&
    entry.automated_safety_review?.contains_people === false;
  if (!exact) return false;
  try { assertImagePublicationGuard("soyatl", entry); return true; } catch { return false; }
}

function classify(headword, entry, blocklist, reviewedHeadwords) {
  const hardReason = nonOverridableMetadataReason(headword, [entry.alt, entry.title, entry.license, entry.author]);
  if (hardReason) return hardReason;
  const reviewedMode = reviewedHeadwords.get(normalizeSafetyKey(headword));
  const exactPublishedReview = isExactPublishedReview(entry);
  const exactReviewedBodyScene = hasExactReviewedBodyScene(headword, entry, reviewedHeadwords);

  const key = normalizeKey(headword);
  if (!reviewedMode && blocklist.blockedHeadwords.has(key)) {
    return { category: "blocked-headword", match: headword };
  }

  const rawHaystack = [reviewedMode ? "" : headword, entry.alt, entry.title, entry.license, entry.author]
    .filter(Boolean)
    .join(" ");
  let haystack = exactPublishedReview
    ? stripReviewedMatches(rawHaystack, entry.reviewed_safe_matches)
    : rawHaystack;
  // Remove only the botanical phrase; a separate human palm/hand still matches.
  if (hasExactReviewedPalmTree(headword, entry)) haystack = haystack.replace(/\bpalm trees?\b/gi, "tree");
  for (const rule of blocklist.rules) {
    const match = haystack.match(rule.pattern);
    if (NON_OVERRIDABLE_CATEGORIES.has(rule.category)) {
      if (match) return { category: rule.category, match: match[0] };
      continue;
    }
    if (rule.category === "anatomy-card-risk" && exactReviewedBodyScene) continue;
    if (reviewedMode) {
      if (
        reviewedMode === "swaddled-child" &&
        (rule.category === "infant-exposure-risk" || rule.category === "minors-or-child")
      ) continue;
      if (
        rule.category !== "adult-sexual" &&
        !(reviewedMode === "swaddled-child" && rule.category === "covered-body-or-exposure-risk")
      ) continue;
    }
    if (match) return { category: rule.category, match: match[0] };
  }
  return null;
}

function fileFromUrl(url) {
  if (!url || !url.startsWith("/generated/word-images/openai/")) return "";
  return path.normalize(path.join(PUBLIC_ROOT, url));
}

function safeGeneratedFile(filePath) {
  return filePath && filePath.startsWith(GENERATED_DIR + path.sep);
}

function parseArgs(argv) {
  return {
    clean: argv.includes("--clean"),
    visual: argv.includes("--visual"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printHelp() {
  console.log(`
Usage:
  node scripts/audit-openai-word-images.js
  node scripts/audit-openai-word-images.js --visual
  node scripts/audit-openai-word-images.js --clean

Options:
  --clean   Remove manifest entries and local generated files that match the blocklist.
  --visual  Send every published image to OpenAI's image moderation endpoint.
`);
}

async function moderateImages(entries) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for --visual");
  const OpenAI = require("openai");
  const client = new OpenAI({ timeout: 30_000, maxRetries: 2 });
  const flagged = [];
  let index = 0;

  async function worker() {
    while (index < entries.length) {
      const current = entries[index++];
      const [headword, entry] = current;
      const url = String(entry?.url || "");
      if (!url.startsWith("http")) throw new Error(`Visual audit requires a public URL: ${headword}`);
      const response = await client.moderations.create({
        model: MODERATION_MODEL,
        input: [{ type: "image_url", image_url: { url } }],
      });
      const result = response.results?.[0];
      if (!result) throw new Error(`Moderation returned no result for ${headword}`);
      if (result.flagged) {
        const categories = Object.entries(result.categories || {})
          .filter(([, matched]) => matched)
          .map(([category]) => category);
        flagged.push({
          headword,
          reason: { category: "visual-moderation", match: categories.join(",") || "flagged" },
          url,
          alt: entry.alt || "",
        });
      }
      if (index % 50 === 0 || index === entries.length) {
        console.log(`Visual moderation:      ${Math.min(index, entries.length)}/${entries.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, entries.length) }, () => worker()));
  return flagged;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const manifest = readJson(MANIFEST_PATH, {});
  const blocklist = loadBlocklist();
  const reviewedHeadwords = loadReviewedAllowlist();
  const files = fs.existsSync(GENERATED_DIR)
    ? fs.readdirSync(GENERATED_DIR).filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    : [];
  const manifestFiles = new Set(
    Object.values(manifest)
      .map((entry) => path.basename(entry?.url || ""))
      .filter(Boolean)
  );

  const flagged = [];
  const kept = {};
  for (const [headword, entry] of Object.entries(manifest)) {
    const reason = classify(headword, entry, blocklist, reviewedHeadwords);
    if (!reason) {
      kept[headword] = entry;
      continue;
    }
    flagged.push({
      headword,
      reason,
      url: entry.url || "",
      alt: entry.alt || "",
    });
  }

  const orphanFiles = files.filter((file) => !manifestFiles.has(file));
  const remoteManifestUrls = Object.values(manifest).filter((entry) =>
    String(entry?.url || "").startsWith(S3_IMAGE_BASE_URL)
  ).length;
  const missingFiles = Object.entries(manifest)
    .filter(([, entry]) => {
      const filePath = fileFromUrl(entry?.url || "");
      return safeGeneratedFile(filePath) && !fs.existsSync(filePath);
    })
    .map(([headword, entry]) => ({ headword, url: entry.url }));

  if (args.visual) {
    const textFlagged = new Set(flagged.map((item) => item.headword));
    const visualEntries = Object.entries(manifest).filter(
      ([headword, entry]) => !textFlagged.has(headword) && !isExactPublishedReview(entry)
    );
    flagged.push(...(await moderateImages(visualEntries)));
  }

  console.log(`Manifest entries:       ${Object.keys(manifest).length}`);
  console.log(`S3 manifest URLs:       ${remoteManifestUrls}`);
  console.log(`Local generated files:  ${files.length}`);
  console.log(`Flagged entries:        ${flagged.length}`);
  console.log(`Orphan files:           ${orphanFiles.length}`);
  console.log(`Missing files:          ${missingFiles.length}`);

  if (flagged.length) {
    console.log("\nFlagged entries");
    for (const item of flagged) {
      console.log(
        `${item.headword}\t${item.reason.category}:${item.reason.match}\t${item.url}\t${item.alt}`
      );
    }
  }
  if (orphanFiles.length) {
    console.log("\nOrphan files");
    for (const file of orphanFiles) console.log(file);
  }
  if (missingFiles.length) {
    console.log("\nMissing files");
    for (const item of missingFiles) console.log(`${item.headword}\t${item.url}`);
  }

  if (!args.clean) {
    if (flagged.length || missingFiles.length) process.exitCode = 1;
    return;
  }

  for (const item of flagged) {
    const filePath = fileFromUrl(item.url);
    if (safeGeneratedFile(filePath) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  for (const item of missingFiles) {
    delete kept[item.headword];
  }
  for (const file of orphanFiles) {
    const filePath = path.join(GENERATED_DIR, file);
    if (safeGeneratedFile(filePath) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  const sorted = Object.fromEntries(
    Object.entries(kept).sort(([a], [b]) => normalizeKey(a).localeCompare(normalizeKey(b)))
  );
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log("\nCleaned flagged entries, missing entries, and orphan files.");
}

if (require.main === module) main().catch((error) => {
  console.error(error);
  process.exit(1);
});

module.exports = { classify, loadBlocklist, loadReviewedAllowlist };
