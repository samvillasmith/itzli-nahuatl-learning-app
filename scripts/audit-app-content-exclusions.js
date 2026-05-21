#!/usr/bin/env node
"use strict";

/**
 * Audits app-facing content against the app content exclusion list.
 * This is separate from the OpenAI image blocklist; it controls what Itzli
 * itself displays or retrieves.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "src", "data", "app-content-exclusions.json");
const REVIEWED_ALLOWLIST_PATH = path.join(ROOT, "scripts", "config", "openai-reviewed-image-allowlist.json");
const COURSE_PATH = path.join(ROOT, "src", "data", "nahuatlahtolli-course.json");
const MANIFEST_PATHS = [
  path.join(ROOT, "src", "data", "openai-word-images.json"),
  path.join(ROOT, "src", "data", "s3-word-images.json"),
  path.join(ROOT, "src", "data", "word-images.json"),
];
const STATIC_TEXT_PATHS = [
  path.join(ROOT, "src", "data", "grammar-lessons.ts"),
  path.join(ROOT, "src", "data", "grammar-labs.ts"),
  path.join(ROOT, "src", "data", "lesson-focus-cards.ts"),
  path.join(ROOT, "src", "data", "dialogue-overrides.ts"),
  path.join(ROOT, "src", "lib", "curriculum.ts"),
];

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  const raw = fs.readFileSync(filePath, "utf8").trim();
  return raw ? JSON.parse(raw) : fallback;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const config = readJson(CONFIG_PATH, { headwords: [], patterns: [] });
const reviewedAllowlist = readJson(REVIEWED_ALLOWLIST_PATH, { entries: [] });
const excludedHeadwords = new Set(config.headwords.map(normalize));
const exclusionPatterns = config.patterns.map((pattern) => new RegExp(pattern, "iu"));
const reviewedHeadwords = new Set((reviewedAllowlist.entries || []).map((entry) => normalize(entry.headword)));

function isUrlLike(value) {
  return /(?:https?:\/\/|\/|\.[a-z0-9]{2,5}\b)/i.test(value);
}

function hasExcludedHeadwordToken(value) {
  if (!isUrlLike(value)) return false;
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .some((token) => excludedHeadwords.has(token));
}

function reasonFor(...values) {
  const present = values.filter(Boolean).map(String);
  for (const value of present) {
    const normalized = normalize(value);
    if (reviewedHeadwords.has(normalized)) return null;
    if (excludedHeadwords.has(normalized) || hasExcludedHeadwordToken(value)) {
      return `headword:${value}`;
    }
  }

  const haystack = present.join(" ");
  const normalizedHaystack = normalize(haystack);
  for (const pattern of exclusionPatterns) {
    const match = haystack.match(pattern) ?? normalizedHaystack.match(pattern);
    if (match) return `pattern:${match[0]}`;
  }
  return null;
}

function cleanSections(sections, hits, scope) {
  return (sections || [])
    .map((section, sectionIndex) => {
      const keptBody = [];
      for (const [lineIndex, line] of (section.body || []).entries()) {
        const reason = reasonFor(line);
        if (reason) {
          hits.push(`${scope}.sections[${sectionIndex}].body[${lineIndex}]\t${reason}\t${line}`);
        } else {
          keptBody.push(line);
        }
      }
      return { ...section, body: keptBody };
    })
    .filter((section, sectionIndex) => {
      const reason = reasonFor(section.heading);
      if (reason) hits.push(`${scope}.sections[${sectionIndex}].heading\t${reason}\t${section.heading}`);
      return section.body.length > 0 && !reason;
    });
}

function cleanCourse(write) {
  const course = readJson(COURSE_PATH, null);
  if (!course) return [];

  const hits = [];
  course.lessons = (course.lessons || []).map((lesson) => {
    const scope = `lesson:${lesson.number}`;
    const vocabulary = [];
    for (const [index, item] of (lesson.vocabulary || []).entries()) {
      const reason = reasonFor(item.headword, item.gloss, item.audioUrl);
      if (reason) {
        hits.push(`${scope}.vocabulary[${index}]\t${reason}\t${item.headword} — ${item.gloss}`);
      } else {
        vocabulary.push(item);
      }
    }

    const mediaLinks = [];
    for (const [index, link] of (lesson.mediaLinks || []).entries()) {
      const reason = reasonFor(link.url);
      if (reason) hits.push(`${scope}.mediaLinks[${index}]\t${reason}\t${link.url}`);
      else mediaLinks.push(link);
    }

    return {
      ...lesson,
      vocabulary,
      sections: cleanSections(lesson.sections, hits, scope),
      mediaLinks,
    };
  });

  course.supportPages = (course.supportPages || []).map((page) => ({
    ...page,
    sections: cleanSections(page.sections, hits, `support:${page.kind}`),
    mediaLinks: (page.mediaLinks || []).filter((link, index) => {
      const reason = reasonFor(link.url);
      if (reason) hits.push(`support:${page.kind}.mediaLinks[${index}]\t${reason}\t${link.url}`);
      return !reason;
    }),
  }));

  if (write && hits.length) {
    fs.writeFileSync(COURSE_PATH, `${JSON.stringify(course, null, 2)}\n`);
  }
  return hits;
}

function cleanManifest(filePath, write) {
  const manifest = readJson(filePath, {});
  const kept = {};
  const hits = [];
  for (const [headword, entry] of Object.entries(manifest)) {
    const reason = reasonFor(
      headword,
      entry?.alt,
      entry?.title,
      entry?.gloss,
      entry?.url,
      entry?.pexels_url,
    );
    if (reason) {
      hits.push(`${path.relative(ROOT, filePath)}:${headword}\t${reason}`);
    } else {
      kept[headword] = entry;
    }
  }

  if (write && hits.length) {
    fs.writeFileSync(filePath, `${JSON.stringify(kept, null, 2)}\n`);
  }
  return hits;
}

function scanStaticText() {
  const hits = [];
  for (const filePath of STATIC_TEXT_PATHS) {
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const reason = reasonFor(line);
      if (reason) hits.push(`${path.relative(ROOT, filePath)}:${index + 1}\t${reason}\t${line.trim()}`);
    }
  }
  return hits;
}

function main() {
  const write = process.argv.includes("--clean");
  const courseHits = cleanCourse(write);
  const manifestHits = MANIFEST_PATHS.flatMap((filePath) => cleanManifest(filePath, write));
  const staticHits = scanStaticText();

  console.log(`Source-course excluded items: ${courseHits.length}`);
  console.log(`Image-manifest excluded items: ${manifestHits.length}`);
  console.log(`Static app text hits:         ${staticHits.length}`);

  for (const [label, hits] of [
    ["Source course", courseHits],
    ["Image manifests", manifestHits],
    ["Static app text", staticHits],
  ]) {
    if (!hits.length) continue;
    console.log(`\n${label}`);
    for (const hit of hits) console.log(hit);
  }

  if (write) console.log("\nCleaned JSON app content where possible.");
  if (staticHits.length) process.exitCode = 1;
}

main();
