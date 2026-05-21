#!/usr/bin/env node
"use strict";

/**
 * Audits already-generated OpenAI word images against the strict text blocklist.
 * This script never calls OpenAI.
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
  return new Set((config.entries || []).map((entry) => normalizeSafetyKey(entry.headword)));
}

function classify(headword, entry, blocklist, reviewedHeadwords) {
  if (reviewedHeadwords.has(normalizeSafetyKey(headword))) return null;

  const key = normalizeKey(headword);
  if (blocklist.blockedHeadwords.has(key)) {
    return { category: "blocked-headword", match: headword };
  }

  const haystack = [headword, entry.alt, entry.title, entry.license, entry.author]
    .filter(Boolean)
    .join(" ");
  for (const rule of blocklist.rules) {
    const match = haystack.match(rule.pattern);
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
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printHelp() {
  console.log(`
Usage:
  node scripts/audit-openai-word-images.js
  node scripts/audit-openai-word-images.js --clean

Options:
  --clean   Remove manifest entries and local generated files that match the blocklist.
`);
}

function main() {
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

  if (!args.clean) return;

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

main();
