#!/usr/bin/env node
"use strict";

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

for (const name of [".env.local", ".env"]) {
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
    /^openai-(?:word|reviewed)-image-audit\/contact-sheet-\d{2}$/.test(
      entry?.review_source || ""
    )
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

function classify(headword, entry, blocklist, reviewedHeadwords) {
  const reviewedMode = reviewedHeadwords.get(normalizeSafetyKey(headword));
  const exactPublishedReview = isExactPublishedReview(entry);

  const key = normalizeKey(headword);
  if (!reviewedMode && blocklist.blockedHeadwords.has(key)) {
    return { category: "blocked-headword", match: headword };
  }

  const rawHaystack = [reviewedMode ? "" : headword, entry.alt, entry.title, entry.license, entry.author]
    .filter(Boolean)
    .join(" ");
  const haystack = exactPublishedReview
    ? stripReviewedMatches(rawHaystack, entry.reviewed_safe_matches)
    : rawHaystack;
  for (const rule of blocklist.rules) {
    const match = haystack.match(rule.pattern);
    if (NON_OVERRIDABLE_CATEGORIES.has(rule.category)) {
      if (match) return { category: rule.category, match: match[0] };
      continue;
    }
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
