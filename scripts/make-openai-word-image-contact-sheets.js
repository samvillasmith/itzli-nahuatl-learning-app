#!/usr/bin/env node
"use strict";

/**
 * Builds visual audit contact sheets from already-generated OpenAI images.
 * This script never calls OpenAI.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "src", "data", "openai-word-images.json");
const PUBLIC_ROOT = path.join(ROOT, "public");
const DEFAULT_OUT_DIR = path.join(ROOT, "data", "openai-word-image-audit");
const GENERATED_DIR = path.join(PUBLIC_ROOT, "generated", "word-images", "openai");
const S3_IMAGE_BASE_URL = "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";

const COLUMNS = 4;
const ROWS = 4;
const TILE_WIDTH = 205;
const TILE_HEIGHT = 273;
const IMAGE_SIZE = 176;
const PADDING = 12;
const LABEL_TOP = PADDING + IMAGE_SIZE + 8;
const PAGE_WIDTH = COLUMNS * TILE_WIDTH;
const PAGE_HEIGHT = ROWS * TILE_HEIGHT;

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf8").trim();
  return raw ? JSON.parse(raw) : fallback;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(value, maxChars, maxLines) {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  return lines;
}

function filePathFor(url) {
  if (url?.startsWith(S3_IMAGE_BASE_URL)) {
    return path.join(GENERATED_DIR, path.basename(new URL(url).pathname));
  }
  if (!url || !url.startsWith("/")) return "";
  return path.normalize(path.join(PUBLIC_ROOT, url));
}

function parseArgs(argv) {
  const args = {
    planPath: "",
    outDir: DEFAULT_OUT_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === "--plan") {
      args.planPath = path.resolve(value);
      index += 1;
    } else if (arg === "--out") {
      args.outDir = path.resolve(value);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage:
  node scripts/make-openai-word-image-contact-sheets.js
  node scripts/make-openai-word-image-contact-sheets.js --plan data/openai-reviewed-allowlist-plan.json --out data/openai-reviewed-image-audit
`);
      process.exit(0);
    }
  }

  return args;
}

function itemsFromPlan(planPath) {
  const plan = readJson(planPath, { to_generate: [] });
  return (plan.to_generate || [])
    .map((item) => {
      const filePath = path.resolve(ROOT, item.out_path || "");
      return {
        headword: item.headword,
        gloss: item.gloss || "",
        filePath,
      };
    })
    .filter((item) => item.filePath && fs.existsSync(item.filePath))
    .sort((a, b) => normalize(a.headword).localeCompare(normalize(b.headword)));
}

function labelSvg(item) {
  const headword = wrapText(item.headword, 22, 1);
  const gloss = wrapText(item.gloss, 30, 2);
  const rows = [
    ...headword.map((line) => ({ line, size: 15, weight: 700, fill: "#2f2119" })),
    ...gloss.map((line) => ({ line, size: 12, weight: 500, fill: "#5a4738" })),
  ];

  const text = rows
    .map((row, index) => {
      const y = LABEL_TOP + 17 + index * 18;
      return `<text x="${TILE_WIDTH / 2}" y="${y}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${row.size}" font-weight="${row.weight}" fill="${row.fill}">${escapeXml(row.line)}</text>`;
    })
    .join("");

  return Buffer.from(`
<svg width="${TILE_WIDTH}" height="${TILE_HEIGHT}" viewBox="0 0 ${TILE_WIDTH} ${TILE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${TILE_WIDTH}" height="${TILE_HEIGHT}" fill="#fbf0d9"/>
  <rect x="${PADDING - 1}" y="${PADDING - 1}" width="${IMAGE_SIZE + 2}" height="${IMAGE_SIZE + 2}" rx="6" fill="#d8c6a3"/>
  ${text}
</svg>`);
}

async function tileFor(item) {
  const image = await sharp(item.filePath)
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: "cover" })
    .png()
    .toBuffer();

  return sharp(labelSvg(item))
    .composite([{ input: image, left: PADDING, top: PADDING }])
    .png()
    .toBuffer();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = readJson(MANIFEST_PATH, {});
  const items = args.planPath
    ? itemsFromPlan(args.planPath)
    : Object.entries(manifest)
        .map(([headword, entry]) => {
          const filePath = filePathFor(entry?.url || "");
          return {
            headword,
            gloss: String(entry?.alt || "").replace(/^Illustration for .*?:\s*/i, ""),
            filePath,
          };
        })
        .filter((item) => item.filePath && fs.existsSync(item.filePath))
        .sort((a, b) => normalize(a.headword).localeCompare(normalize(b.headword)));

  fs.rmSync(args.outDir, { recursive: true, force: true });
  fs.mkdirSync(args.outDir, { recursive: true });

  const perPage = COLUMNS * ROWS;
  const pageCount = Math.ceil(items.length / perPage);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageItems = items.slice(pageIndex * perPage, (pageIndex + 1) * perPage);
    const composites = [];
    for (let index = 0; index < pageItems.length; index += 1) {
      const tile = await tileFor(pageItems[index]);
      composites.push({
        input: tile,
        left: (index % COLUMNS) * TILE_WIDTH,
        top: Math.floor(index / COLUMNS) * TILE_HEIGHT,
      });
    }

    const outPath = path.join(args.outDir, `contact-sheet-${String(pageIndex + 1).padStart(2, "0")}.png`);
    await sharp({
      create: {
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        channels: 4,
        background: "#fbf0d9",
      },
    })
      .composite(composites)
      .png()
      .toFile(outPath);
  }

  console.log(`Wrote ${pageCount} contact sheets for ${items.length} images to ${path.relative(ROOT, args.outDir)}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
