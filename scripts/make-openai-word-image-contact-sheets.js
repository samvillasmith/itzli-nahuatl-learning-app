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
const DATA_ROOT = path.join(ROOT, "data");
const DEFAULT_OUT_DIR = path.join(ROOT, "data", "openai-word-image-audit");
const GENERATED_DIR = path.join(PUBLIC_ROOT, "generated", "word-images", "openai");
const S3_IMAGE_BASE_URL = "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";

const COLUMNS = 4;
const ROWS = 4;
const IMAGE_SIZE = 176;
const PADDING = 12;

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
    columns: COLUMNS,
    rows: ROWS,
    imageSize: IMAGE_SIZE,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (["--plan", "--out", "--columns", "--rows", "--image-size"].includes(arg) && (!value || value.startsWith("-"))) {
      throw new Error(`${arg} requires a value.`);
    }
    if (arg === "--plan") {
      args.planPath = path.resolve(value);
      index += 1;
    } else if (arg === "--out") {
      args.outDir = path.resolve(value);
      index += 1;
    } else if (arg === "--columns" || arg === "--rows") {
      const count = Number(value);
      if (!/^\d+$/.test(value) || !Number.isInteger(count) || count < 1 || count > 16) {
        throw new Error(`${arg} must be an integer from 1 to 16.`);
      }
      args[arg === "--columns" ? "columns" : "rows"] = count;
      index += 1;
    } else if (arg === "--image-size") {
      const size = Number(value);
      if (!/^\d+$/.test(value) || !Number.isInteger(size) || size < 128 || size > 1024) {
        throw new Error("--image-size must be an integer from 128 to 1024.");
      }
      args.imageSize = size;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function isWithin(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function validateOutputDirectory(outDir) {
  const resolved = path.resolve(outDir);
  if (!isWithin(DATA_ROOT, resolved)) {
    throw new Error("Contact sheets must be written to a folder strictly inside this workspace's data directory.");
  }
  const realRoot = fs.realpathSync(ROOT);
  const realDataRoot = fs.realpathSync(DATA_ROOT);
  if (!isWithin(realRoot, realDataRoot)) {
    throw new Error("The workspace data directory resolves outside the workspace.");
  }
  let existingAncestor = resolved;
  while (!fs.existsSync(existingAncestor)) existingAncestor = path.dirname(existingAncestor);
  const realAncestor = fs.realpathSync(existingAncestor);
  if (realAncestor !== realDataRoot && !isWithin(realDataRoot, realAncestor)) {
    throw new Error("The contact-sheet output directory resolves outside the workspace data directory.");
  }
  if (!fs.statSync(existingAncestor).isDirectory()) {
    throw new Error("The contact-sheet output path must be a directory.");
  }
  return resolved;
}

function itemsFromPlan(planPath) {
  if (!fs.existsSync(planPath)) throw new Error(`Image plan does not exist: ${planPath}`);
  const plan = readJson(planPath, { to_generate: [] });
  return (plan.to_generate || [])
    .filter((item) => typeof item.out_path === "string" && item.out_path.trim())
    .map((item) => {
      const filePath = path.resolve(ROOT, item.out_path || "");
      return {
        headword: item.headword,
        gloss: item.gloss || "",
        filePath,
      };
    })
    .filter((item) => fs.existsSync(item.filePath) && fs.statSync(item.filePath).isFile())
    .sort((a, b) => normalize(a.headword).localeCompare(normalize(b.headword)));
}

function labelSvg(item, imageSize) {
  const tileWidth = imageSize + 29;
  const tileHeight = imageSize + 97;
  const labelTop = PADDING + imageSize + 8;
  const headword = wrapText(item.headword, 22, 1);
  const gloss = wrapText(item.gloss, 30, 2);
  const rows = [
    ...headword.map((line) => ({ line, size: 15, weight: 700, fill: "#2f2119" })),
    ...gloss.map((line) => ({ line, size: 12, weight: 500, fill: "#5a4738" })),
  ];

  const text = rows
    .map((row, index) => {
      const y = labelTop + 17 + index * 18;
      return `<text x="${tileWidth / 2}" y="${y}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${row.size}" font-weight="${row.weight}" fill="${row.fill}">${escapeXml(row.line)}</text>`;
    })
    .join("");

  return Buffer.from(`
<svg width="${tileWidth}" height="${tileHeight}" viewBox="0 0 ${tileWidth} ${tileHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${tileWidth}" height="${tileHeight}" fill="#fbf0d9"/>
  <rect x="${PADDING - 1}" y="${PADDING - 1}" width="${imageSize + 2}" height="${imageSize + 2}" rx="6" fill="#d8c6a3"/>
  ${text}
</svg>`);
}

async function tileFor(item, imageSize) {
  const image = await sharp(item.filePath)
    .resize(imageSize, imageSize, { fit: "cover" })
    .png()
    .toBuffer();

  return sharp(labelSvg(item, imageSize))
    .composite([{ input: image, left: PADDING, top: PADDING }])
    .png()
    .toBuffer();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`
Usage:
  node scripts/make-openai-word-image-contact-sheets.js
  node scripts/make-openai-word-image-contact-sheets.js --plan data/openai-reviewed-allowlist-plan.json --out data/openai-reviewed-image-audit --columns 2 --rows 2 --image-size 384

Output folders must be inside data/. Existing files are never overwritten.
`);
    return;
  }
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
        .filter((item) => item.filePath && fs.existsSync(item.filePath) && fs.statSync(item.filePath).isFile())
        .sort((a, b) => normalize(a.headword).localeCompare(normalize(b.headword)));

  if (!items.length) throw new Error("No local image files were found to include in a contact sheet.");
  args.outDir = validateOutputDirectory(args.outDir);
  const tileWidth = args.imageSize + 29;
  const tileHeight = args.imageSize + 97;
  const perPage = args.columns * args.rows;
  const pageCount = Math.ceil(items.length / perPage);
  const outputPaths = Array.from({ length: pageCount }, (_, pageIndex) =>
    path.join(args.outDir, `contact-sheet-${String(pageIndex + 1).padStart(2, "0")}.png`));
  for (const outPath of outputPaths) {
    if (fs.existsSync(outPath)) throw new Error(`Contact sheet already exists; choose a fresh output folder: ${outPath}`);
  }
  fs.mkdirSync(args.outDir, { recursive: true });
  validateOutputDirectory(args.outDir);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageItems = items.slice(pageIndex * perPage, (pageIndex + 1) * perPage);
    const composites = [];
    for (let index = 0; index < pageItems.length; index += 1) {
      const tile = await tileFor(pageItems[index], args.imageSize);
      composites.push({
        input: tile,
        left: (index % args.columns) * tileWidth,
        top: Math.floor(index / args.columns) * tileHeight,
      });
    }

    const outPath = outputPaths[pageIndex];
    const buffer = await sharp({
      create: {
        width: args.columns * tileWidth,
        height: args.rows * tileHeight,
        channels: 4,
        background: "#fbf0d9",
      },
    })
      .composite(composites)
      .png()
      .toBuffer();
    fs.writeFileSync(outPath, buffer, { flag: "wx" });
  }

  console.log(`Wrote ${pageCount} contact sheets for ${items.length} images to ${path.relative(ROOT, args.outDir)}.`);
}

module.exports = { parseArgs, validateOutputDirectory };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
