#!/usr/bin/env node
"use strict";

/**
 * Reviews currently excluded image candidates and identifies likely
 * over-aggressive safety matches. This script never calls OpenAI.
 */

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");

const ROOT = path.resolve(__dirname, "..");
const PLAN_PATH = path.join(ROOT, "data", "openai-word-images-plan.json");
const SOURCE_COURSE_PATH = path.join(ROOT, "src", "data", "nahuatlahtolli-course.json");
const OUT_JSON = path.join(ROOT, "data", "overaggressive-image-candidates.json");
const OUT_MD = path.join(ROOT, "data", "overaggressive-image-candidates.md");

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

const definiteCandidates = new Map(
  [
    ["tototl", "bird was caught by a hard app exclusion; safe animal/object card"],
    ["quetza", "upright/stand something upright; avoid the English word that triggered the app exclusion"],
    ["pemuch", "botanical 'naked coral tree'; safe plant card if prompt avoids the word naked"],
    ["pemoch", "botanical 'naked coral flower'; safe plant card if prompt avoids the word naked"],
    ["elotl", "fresh ear of corn; false anatomy match on 'ear'"],
    ["metlapilli", "grinding stone; false anatomy match on 'hand-held'"],
    ["tlatehtectli", "paper cut-out; false violence match on 'cut'"],
    ["petlani", "flash/shine/lightning; false violence match on 'strike'"],
    ["apachkoatl", "palm snake; likely plant/animal false match on 'palm'"],
    ["soyatl", "palm tree; false anatomy match on 'palm'"],
    ["ahcoqui", "light in weight; can use object/scale metaphor"],
    ["cototzin", "short; can use short object, not body"],
    ["huehcapantic", "tall; can use tall object/tree, not body"],
    ["cuauhtic", "tall; can use tall object/tree, not body"],
    ["hueyic", "tall; can use tall object/tree, not body"],
    ["lalakatik", "tall; can use tall object/tree, not body"],
    ["canahuac", "thin/slim; can use thin object/line, not body"],
    ["huihuiciquitic", "thin/slender; can use thin object/line, not body"],
  ].map(([headword, note]) => [normalize(headword), note])
);

const maybeCandidates = new Map(
  [
    ["conetzin", "baby can be safe only as fully clothed/swaddled and not in bed/bath/medical context"],
    ["conētzin", "baby can be safe only as fully clothed/swaddled and not in bed/bath/medical context"],
    ["tiona", "godmother is a family-role false religious match"],
    ["tiota", "godfather is a family-role false religious match"],
    ["mapohpohua", "clean/wipe/dry hands; could be object-only towel/basin, no visible body"],
    ["tequi", "cut something; could show already-cut firewood/food with no blade, but lower priority"],
    ["tehtequi", "chop/cut; could show already-cut pieces with no blade, but lower priority"],
    ["tlatequi", "cut something; could show separated paper/wood with no blade, but lower priority"],
    ["cuahuehhueloa", "cut firewood; could show stacked split firewood with no axe/blade"],
    ["omitl", "bone; possible object-only stylized bone, no person/skeleton"],
    ["xolotl", "mythological/deity term; safe only if treated as no-image cultural/religious review item"],
    ["notlacal", "my property; false headword-pattern hit, likely safe abstract/property card"],
  ].map(([headword, note]) => [normalize(headword), note])
);

const keepBlockedCategories = new Set([
  "adult-sexual",
  "anatomy-card-risk",
  "blocked-headword",
  "body-description-risk",
  "covered-body-or-exposure-risk",
  "clothing-change-exposure-risk",
  "body-waste",
  "graphic-injury-or-death",
  "body-health-or-injury-risk",
  "infant-exposure-risk",
  "romance-or-organ-risk",
  "weapons-or-violence",
  "drugs-alcohol-tobacco",
  "sacred-or-religious-imagery-risk",
  "hate-or-extremism",
]);

const keepBlockedHeadwords = new Set(
  [
    "chichihual",
    "chichiualayotl",
    "chichiuali",
    "chichiual",
    "cocoxqui",
    "cocoa",
    "cocōa",
    "cocoliztli",
    "cocōliztli",
    "cuitlapil",
    "ehuatl",
    "huacaxcuitlatl",
    "maxtli",
    "maltia",
    "māltia",
    "maxixa",
    "maua",
    "tlazohtla",
    "tlazohtlaliztli",
    "tlakwepilia",
    "xolentok",
  ].map(normalize)
);

function sourceOf(item) {
  return item.source_ids?.[0] || item.sourceIds?.[0] || item.sourceId || "";
}

function loadSourceIndex() {
  const byHeadword = new Map();
  const add = (headword, source) => {
    const key = normalize(headword);
    if (!key) return;
    const list = byHeadword.get(key) || [];
    if (!list.some((item) => item.id === source.id && item.source === source.source)) list.push(source);
    byHeadword.set(key, list);
  };

  const db = new Database(resolveDbPath(), { readonly: true });
  for (const row of db
    .prepare(
      `SELECT id, lesson_number AS lessonNumber, rank, display_form AS headword, gloss_en AS gloss
       FROM lesson_vocab
       WHERE display_form IS NOT NULL
       ORDER BY lesson_number, rank, id`
    )
    .all()) {
    add(row.headword, {
      id: String(row.id),
      source: "core",
      lessonNumber: row.lessonNumber,
      rank: row.rank,
      gloss: row.gloss || "",
    });
  }
  db.close();

  const course = readJson(SOURCE_COURSE_PATH, { lessons: [] });
  for (const lesson of course.lessons || []) {
    for (const [index, item] of (lesson.vocabulary || []).entries()) {
      add(item.headword, {
        id: `source-${lesson.number}-${index + 1}`,
        source: "source-course",
        lessonNumber: lesson.number,
        rank: index + 1,
        gloss: item.gloss || "",
      });
    }
  }

  return byHeadword;
}

function classify(item, bucket) {
  const key = normalize(item.headword);
  const reason = item.reason || {};
  if (definiteCandidates.has(key)) {
    return {
      status: "candidate",
      priority: 1,
      promptMode: "object-only/no-person",
      note: definiteCandidates.get(key),
    };
  }
  if (maybeCandidates.has(key)) {
    return {
      status: "review",
      priority: 2,
      promptMode: "object-only/no-person",
      note: maybeCandidates.get(key),
    };
  }
  if (keepBlockedHeadwords.has(key) || keepBlockedCategories.has(reason.category)) {
    return {
      status: "keep-blocked",
      priority: 9,
      promptMode: "none",
      note: "still matches strict safety policy",
    };
  }
  if (bucket === "app_excluded") {
    return {
      status: "keep-blocked",
      priority: 9,
      promptMode: "none until app exclusion is relaxed",
      note: "app-level exclusion; keep blocked unless manually promoted",
    };
  }
  return {
    status: "review",
    priority: 3,
    promptMode: "object-only/no-person",
    note: "not obviously unsafe, but not in the definite false-positive set",
  };
}

function simplify(item, bucket, sourceIndex) {
  const verdict = classify(item, bucket);
  const sources = sourceIndex.get(normalize(item.headword)) || [];
  return {
    headword: item.headword,
    gloss: item.gloss || "",
    bucket,
    reason: item.reason || null,
    sourceId: sourceOf(item) || sources[0]?.id || "",
    sources,
    ...verdict,
  };
}

function byPriorityThenWord(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority;
  return normalize(a.headword).localeCompare(normalize(b.headword));
}

function markdownList(title, items) {
  const lines = [`## ${title}`, ""];
  if (!items.length) {
    lines.push("_None._", "");
    return lines;
  }
  for (const item of items) {
    const reason = item.reason ? `${item.reason.category}: ${item.reason.match}` : "no reason";
    const ids = item.sources?.length ? item.sources.map((source) => source.id).join(", ") : item.sourceId || "unknown id";
    lines.push(
      `- ${item.headword} — ${item.gloss} | ids: ${ids} | ${item.promptMode} | ${reason} | ${item.note}`
    );
  }
  lines.push("");
  return lines;
}

function main() {
  const plan = readJson(PLAN_PATH, {});
  const sourceIndex = loadSourceIndex();
  const reviewed = [
    ...(plan.image_excluded || []).map((item) => simplify(item, "image_excluded", sourceIndex)),
    ...(plan.app_excluded || []).map((item) => simplify(item, "app_excluded", sourceIndex)),
  ].sort(byPriorityThenWord);

  const candidates = reviewed.filter((item) => item.status === "candidate");
  const review = reviewed.filter((item) => item.status === "review");
  const keepBlocked = reviewed.filter((item) => item.status === "keep-blocked");

  const report = {
    generated_at: new Date().toISOString(),
    source_plan: path.relative(ROOT, PLAN_PATH),
    counts: {
      reviewed: reviewed.length,
      candidates: candidates.length,
      review: review.length,
      keep_blocked: keepBlocked.length,
    },
    candidates,
    candidate_ids: [...new Set(candidates.flatMap((item) => item.sources?.map((source) => source.id) || []))],
    review,
    review_ids: [...new Set(review.flatMap((item) => item.sources?.map((source) => source.id) || []))],
    keep_blocked: keepBlocked,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    "# Over-Aggressive Image Exclusion Audit",
    "",
    `Generated: ${report.generated_at}`,
    "",
    `Reviewed: ${report.counts.reviewed}`,
    `Candidate for generation: ${report.counts.candidates}`,
    `Candidate ids: ${report.candidate_ids.join(", ") || "none"}`,
    `Needs manual review: ${report.counts.review}`,
    `Keep blocked: ${report.counts.keep_blocked}`,
    "",
    ...markdownList("Candidate for generation", candidates),
    ...markdownList("Needs manual review", review),
    ...markdownList("Keep blocked", keepBlocked),
  ].join("\n");
  fs.writeFileSync(OUT_MD, `${md}\n`);

  console.log(`Reviewed:                ${report.counts.reviewed}`);
  console.log(`Candidate for generation:${String(report.counts.candidates).padStart(3)}`);
  console.log(`Needs manual review:     ${String(report.counts.review).padStart(3)}`);
  console.log(`Keep blocked:            ${String(report.counts.keep_blocked).padStart(3)}`);
  console.log(`JSON: ${path.relative(ROOT, OUT_JSON)}`);
  console.log(`Markdown: ${path.relative(ROOT, OUT_MD)}`);
}

main();
