#!/usr/bin/env node
"use strict";

/**
 * Audits app-facing content against the app content exclusion list.
 * This is separate from the OpenAI image blocklist; it controls what Itzli
 * itself displays or retrieves.
 */

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { isReviewedStaticText } = require("./lib/reviewed-static-text.js");
const { resolveReadonlyCourseDbPath, dictionaryAuditScope } = require("./lib/readonly-course-db.cjs");
const { loadTs } = require("./lib/course-audio-inputs.js");
const { getAppContentExclusionReason, getLearnerSenseExclusionReason } = loadTs("src/lib/app-content-safety.ts");

const ROOT = path.resolve(__dirname, "..");
const COURSE_PATH = path.join(ROOT, "src", "data", "nahuatlahtolli-course.json");
const MANIFEST_PATHS = [
  path.join(ROOT, "src", "data", "openai-word-images.json"),
  path.join(ROOT, "src", "data", "s3-word-images.json"),
  path.join(ROOT, "src", "data", "word-images.json"),
];
const STATIC_TEXT_PATHS = [
  path.join(ROOT, "src", "data", "v3-verified-lexicon.json"),
  path.join(ROOT, "src", "data", "v3-original-course.json"),
  path.join(ROOT, "src", "data", "instructional-lesson-blueprints.json"),
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

function reasonFor(...values) {
  return getAppContentExclusionReason(values);
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
    if (path.basename(filePath) === 'v3-verified-lexicon.json') {
      // Raw source history intentionally retains excluded meanings. Audit the
      // same filtered selected senses that reach learners, without deleting history.
      for (const entry of loadTs("src/data/v3-expansion.ts").getVerifiedExpansionEntries()) {
        const reason = reasonFor(entry.id, entry.display, entry.sourceSpelling, entry.meaningEn, entry.meaningEs);
        if (reason) hits.push(`${path.relative(ROOT, filePath)}:${entry.id}\t${reason}\t${entry.display}`);
      }
      continue;
    }
    if (path.basename(filePath) === 'instructional-lesson-blueprints.json') {
      const { getInstructionalLessonPayload } = loadTs("src/lib/instructional-lessons.ts");
      for (const spec of readJson(filePath, { lessons: [] }).lessons) {
        const payload = getInstructionalLessonPayload(spec.unitId);
        if (!payload) continue;
        for (const phrase of payload.course.phrases) {
          const reason = getLearnerSenseExclusionReason([phrase.sourceLocator.lexicalEntryId,
            phrase.english, phrase.spanish, phrase.usageNote?.en, phrase.usageNote?.es]);
          if (reason) hits.push(`runtime:instructional:${spec.unitId}:${phrase.id}\t${reason}`);
        }
        const reason = getLearnerSenseExclusionReason([JSON.stringify(payload.blueprint)]);
        if (reason) hits.push(`runtime:instructional:${spec.unitId}:blueprint\t${reason}`);
      }
      continue;
    }
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const reason = reasonFor(line);
      if (reason && !isReviewedStaticText(path.relative(ROOT, filePath), line)) hits.push(`${path.relative(ROOT, filePath)}:${index + 1}\t${reason}\t${line.trim()}`);
    }
  }
  return hits;
}

function auditDictionaryOrientationContent(dbPath) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  let rows;
  let scope;
  try {
    scope = dictionaryAuditScope(db);
    rows = scope.startsWith("course-only") ? [] : db.prepare(
    `SELECT entry_id, ehn_spoken_form, msn_headword, gloss_en, gloss_es, notes_public
     FROM lexicon_entries
     WHERE is_active = 1`
    ).all();
  } finally { db.close(); }

  const blocked = [];
  const leaks = [];
  for (const row of rows) {
    const values = [
      row.ehn_spoken_form,
      row.msn_headword,
      row.gloss_en,
      row.gloss_es,
      row.notes_public,
    ];
    if (!getLearnerSenseExclusionReason(values)) continue;

    const description = `${row.entry_id}\t${row.msn_headword || row.ehn_spoken_form}\t${row.gloss_en}`;
    if (reasonFor(...values)) blocked.push(description);
    else leaks.push(description);
  }

  return { blocked, leaks, scope };
}

function auditRuntimeCourse(dbPath) {
  process.env.DATABASE_PATH = dbPath;
  const courseDb = loadTs("src/lib/db.ts");
  const hits = [];
  for (const unit of courseDb.getAllUnits()) {
    const lesson = unit.lesson_number;
    const groups = [
      ["vocabulary", courseDb.getUnitVocab(lesson), ["headword", "gloss_en", "part_of_speech", "semantic_domain"]],
      ["dialogues", courseDb.getUnitDialogueContent(lesson), ["utterance_normalized", "translation_en"]],
      ["blocks", courseDb.getUnitLessonBlocks(lesson), ["text_normalized"]],
      ["constructions", courseDb.getUnitConstructions(lesson), ["construction_label", "pattern_text", "example_original", "translation_en"]],
      ["assessments", courseDb.getUnitAssessments(lesson), ["prompt"]],
    ];
    for (const [kind, rows, fields] of groups) {
      for (const [index, row] of rows.entries()) {
        const reason = reasonFor(...fields.map((field) => row[field]));
        if (reason) hits.push(`runtime:${lesson}:${kind}:${index}\t${reason}`);
      }
    }
  }
  return hits;
}

function main() {
  const write = process.argv.includes("--clean");
  const dbPath = resolveReadonlyCourseDbPath();
  const courseHits = cleanCourse(write);
  const manifestHits = MANIFEST_PATHS.flatMap((filePath) => cleanManifest(filePath, write));
  const staticHits = scanStaticText();
  const dictionaryAudit = auditDictionaryOrientationContent(dbPath);
  const runtimeHits = auditRuntimeCourse(dbPath);

  console.log(`Source-course excluded items: ${courseHits.length}`);
  console.log(`Image-manifest excluded items: ${manifestHits.length}`);
  console.log(`Static app text hits:         ${staticHits.length}`);
  console.log(`Dictionary sensitive blocked: ${dictionaryAudit.blocked.length}`);
  console.log(`Dictionary sensitive leaks:   ${dictionaryAudit.leaks.length}`);
  console.log(`Dictionary audit scope:       ${dictionaryAudit.scope}`);
  console.log(`Runtime course text hits:     ${runtimeHits.length}`);

  for (const [label, hits] of [
    ["Source course", courseHits],
    ["Image manifests", manifestHits],
    ["Static app text", staticHits],
    ["Runtime course", runtimeHits],
  ]) {
    if (!hits.length) continue;
    console.log(`\n${label}`);
    for (const hit of hits) console.log(hit);
  }

  if (dictionaryAudit.leaks.length) {
    console.log("\nDictionary leaks");
    for (const leak of dictionaryAudit.leaks) console.log(leak);
  }

  if (write) console.log("\nCleaned JSON app content where possible.");
  if (staticHits.length || dictionaryAudit.leaks.length || runtimeHits.length) process.exitCode = 1;
}

main();
