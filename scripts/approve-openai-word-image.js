#!/usr/bin/env node
"use strict";

/**
 * Publishes one generated image after a human has visually reviewed it.
 * There is intentionally no bulk-approval option.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ACTIVE_PATH = path.join(ROOT, "src", "data", "openai-word-images.json");
const PENDING_PATH = path.join(ROOT, "data", "openai-word-images-pending.json");
const S3_PREFIX = "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const text = fs.readFileSync(filePath, "utf8").trim();
  return text ? JSON.parse(text) : fallback;
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : "";
}

function sorted(record) {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b, "en", { sensitivity: "base" }))
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const headword = valueAfter(argv, "--headword").trim();
  const publicUrl = valueAfter(argv, "--public-url").trim();

  if (!headword || !publicUrl) {
    console.error(
      "Usage: CONFIRM_IMAGE_REVIEW=YES node scripts/approve-openai-word-image.js " +
        "--headword <exact-headword> --public-url <uploaded-S3-url>"
    );
    process.exit(1);
  }
  if (process.env.CONFIRM_IMAGE_REVIEW !== "YES") {
    console.error("Refusing publication without CONFIRM_IMAGE_REVIEW=YES.");
    process.exit(1);
  }
  if (!publicUrl.startsWith(S3_PREFIX)) {
    console.error(`Public URL must use the project S3 image prefix: ${S3_PREFIX}`);
    process.exit(1);
  }

  const pending = readJson(PENDING_PATH, {});
  const entry = pending[headword];
  if (!entry) {
    console.error(`No pending image found for exact headword: ${headword}`);
    process.exit(1);
  }

  const localPath = path.resolve(ROOT, entry.local_path || "");
  const generatedRoot = path.resolve(ROOT, "public", "generated", "word-images", "openai");
  if (!localPath.startsWith(`${generatedRoot}${path.sep}`) || !fs.existsSync(localPath)) {
    console.error("The pending local image is missing or outside the generated-image quarantine.");
    process.exit(1);
  }

  const response = await fetch(publicUrl, { method: "HEAD" });
  if (!response.ok) {
    console.error(`The reviewed image is not available at the supplied URL (HTTP ${response.status}).`);
    process.exit(1);
  }

  const active = readJson(ACTIVE_PATH, {});
  active[headword] = {
    url: publicUrl,
    license: "OpenAI-generated illustration",
    author: entry.author,
    alt: entry.alt,
    source: entry.source,
    model: entry.model,
    quality: entry.quality,
    size: entry.size,
    output_format: entry.output_format,
    generated_at: entry.generated_at,
    reviewed_at: new Date().toISOString(),
    review_status: "approved",
  };
  delete pending[headword];

  fs.writeFileSync(ACTIVE_PATH, `${JSON.stringify(sorted(active), null, 2)}\n`);
  fs.writeFileSync(PENDING_PATH, `${JSON.stringify(sorted(pending), null, 2)}\n`);
  console.log(`Published reviewed image for ${headword}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
