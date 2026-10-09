"use strict";

// Local course metadata only. No provider, download, credential or learner-data access.
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, loadTs, loadCurrentAudioManifest, sha256 } = require("./course-audio-inputs");
const { getExcludedAudioDependencies, AUDIO_ELIGIBILITY_SOURCE_HASH_FORMAT,
  isAudioEligibilityCodeSource, canonicalAudioEligibilityCodeSource } = require("../../src/lib/learner-audio-projection.cjs");

const SOURCE_FILES = ["src/data/app-content-exclusions.json", "src/data/app-content-reviewed-allowlist.json",
  "src/data/reviewed-vocabulary-labels.json", "src/data/learner-vocabulary-senses.json", "src/lib/reviewed-vocabulary-labels.cjs",
  "src/data/reviewed-context-labels.json",
  "src/data/v3-verified-lexicon.json", "src/data/lexical-expansion.json", "src/data/v3-original-course.json",
  "src/data/instructional-lesson-blueprints.json", "src/data/nahuatlahtolli-course.json",
  "src/data/conversation-scenarios.ts", "src/lib/app-content-safety.ts", "src/lib/instructional-lessons.ts",
  "src/lib/nahuatlahtolli.ts", "scripts/lib/learner-audio-eligibility.cjs", "src/lib/learner-audio-projection.cjs",
  "src/lib/generated-audio.ts", "src/lib/audio.ts", "public/offline-audio.js", "public/offline.html"];
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
function audioEligibilitySourceHash(file) {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  return sha256(isAudioEligibilityCodeSource(file) ? canonicalAudioEligibilityCodeSource(bytes.toString("utf8")) : bytes);
}
function checkedAudioEligibilityFingerprints(policy) {
  if (policy.source_sha256_format !== AUDIO_ELIGIBILITY_SOURCE_HASH_FORMAT ||
      !policy.source_sha256 || typeof policy.source_sha256 !== "object" || Array.isArray(policy.source_sha256) ||
      JSON.stringify(Object.keys(policy.source_sha256)) !== JSON.stringify(SOURCE_FILES)) {
    throw new Error("Learner audio source fingerprint format is stale; refresh the equivalent policy locally.");
  }
  for (const file of SOURCE_FILES) if (policy.source_sha256[file] !== audioEligibilitySourceHash(file)) {
    throw new Error(`Learner audio source changed: ${file}`);
  }
}

/** Exact native bindings establish URL eligibility; filenames alone never
 * attest that a file contains a longer sentence or passage. Shared recordings
 * remain available whenever an eligible binding still uses the same URL. */
function getExcludedNativeSourceUrls(bindings, excludedReferenceIds) {
  const held = new Set(excludedReferenceIds), byUrl = new Map();
  for (const binding of bindings) {
    if (!binding.url || !binding.reference_id) continue;
    const ids = byUrl.get(binding.url) || new Set();
    ids.add(binding.reference_id); byUrl.set(binding.url, ids);
  }
  return [...byUrl].filter(([, ids]) => [...ids].every(id => held.has(id))).map(([url]) => url).sort();
}

function buildLearnerAudioEligibility(records = []) {
  const { getAppContentExclusionReason, getLearnerSenseExclusionReason } = loadTs("src/lib/app-content-safety.ts");
  const { getExcludedLearnerPhraseIds } = loadTs("src/lib/instructional-lessons.ts");
  const { reviewedVocabularyLabel } = require("../../src/lib/reviewed-vocabulary-labels.cjs");
  const excluded = new Map(), excludedUrls = new Set(), excludedEntries = new Set();
  const hold = (id, reason) => { if (id && reason) excluded.set(id, reason); };
  const currentCore = new Set(loadCurrentAudioManifest().records.map(row => `core-${row.kind}:${row.id}`));
  for (const row of records) {
    const id = row.id || row.reference_id;
    if (/^core-(?:vocab|dialogue|block):/u.test(id) && !currentCore.has(id))
      hold(id, "omitted-from-current-selected-core-content");
  }
  for (const id of getExcludedLearnerPhraseIds()) hold(`phrase:${id}`, "excluded-current-learner-phrase");
  for (const entry of [...read("src/data/v3-verified-lexicon.json").entries,
    ...read("src/data/lexical-expansion.json")]) {
    const en = entry.meaningEn ?? entry.english, es = entry.meaningEs ?? entry.spanish;
    const correction = reviewedVocabularyLabel(entry.id, en, es, entry.sourceLocator?.sourceFactReviewHash);
    const reason = getAppContentExclusionReason([entry.id, entry.display ?? entry.headword ?? entry.sourceSpelling,
      correction?.meaningEn ?? en, correction?.meaningEs ?? es]);
    if (reason) { excludedEntries.add(entry.id); hold(`vocabulary:${entry.id}`, reason); }
  }
  const source = read("src/data/nahuatlahtolli-course.json");
  const sourceBodyHolds = new Map(read("src/data/app-content-exclusions.json").learnerSourceBodyExclusions
    .map(row => [`${row.lessonNumber}:${row.sectionIndex}:${row.bodyIndex}`, row.reason]));
  const exactNativeBindings = [];
  for (const lesson of source.lessons) {
    lesson.vocabulary.forEach((word, index) => {
      const reference = `source-vocabulary:${lesson.number}:${index + 1}`;
      hold(reference, getAppContentExclusionReason([word.headword, word.gloss, word.audioUrl]));
      if (word.audioUrl) exactNativeBindings.push({ reference_id: reference, url: word.audioUrl });
    });
    lesson.sections.forEach((section, sectionIndex) => section.body.forEach((line, bodyIndex) =>
      hold(`source-body:${lesson.number}:${sectionIndex}:${bodyIndex}`,
        sourceBodyHolds.get(`${lesson.number}:${sectionIndex}:${bodyIndex}`) ||
        getAppContentExclusionReason([section.heading]) || getAppContentExclusionReason([line]))));
    lesson.mediaLinks.filter(link => link.type === "audio").forEach((link, index) => {
      const reason = getAppContentExclusionReason([link.url]);
      if (reason) { excludedUrls.add(link.url); hold(`source-media:${lesson.number}:${index}`, reason); }
    });
  }
  const { getConversationScenarios, getSentencePatterns } = loadTs("src/data/conversation-scenarios.ts");
  for (const scenario of getConversationScenarios()) for (const turn of scenario.turns)
    for (const [index, value] of [turn, ...turn.options].entries()) hold(
      `conversation:${scenario.id}:${turn.id}:${index === 0 ? "model" : value.id}`,
      getLearnerSenseExclusionReason([value.nahuatl, value.english, value.spanish]));
  for (const pattern of getSentencePatterns()) for (const slot of pattern.slots) for (const choice of slot.choices)
    hold(`sentence-choice:${pattern.id}:${choice.id}`, getLearnerSenseExclusionReason([choice.nahuatl, choice.english, choice.spanish]));
  // Dependency checks use identity fields only, never prose in source evidence.
  for (const row of getExcludedAudioDependencies(records, excluded.keys(), excludedEntries)) hold(row.reference_id, row.reason);
  const historicalPlan = path.join(ROOT, "data/audio-v3/all-course-air-b-plan.private.json");
  if (fs.existsSync(historicalPlan)) exactNativeBindings.push(...JSON.parse(fs.readFileSync(historicalPlan)).source_bindings);
  for (const url of getExcludedNativeSourceUrls(exactNativeBindings, excluded.keys())) excludedUrls.add(url);
  const contentPolicy = read("src/data/app-content-exclusions.json");
  const learner_content_policy = { schema_version: 1,
    headwords: [...new Set([...contentPolicy.learnerExcludedHeadwords, ...contentPolicy.learnerSenseExclusions.map(row => row.headword)])].sort(),
    exact_text: contentPolicy.learnerExcludedExactText,
    patterns: contentPolicy.learnerSenseRules.map(row => row.pattern) };
  return { schema_version: 1, excluded_reference_ids: [...excluded.keys()].sort(), learner_content_policy,
    excluded_source_urls: [...excludedUrls].sort(),
    source_sha256_format: AUDIO_ELIGIBILITY_SOURCE_HASH_FORMAT,
    source_sha256: Object.fromEntries(SOURCE_FILES.map(file => [file, audioEligibilitySourceHash(file)])),
    evidence: [...excluded].map(([reference_id, reason]) => ({ reference_id, reason })) };
}

module.exports = { buildLearnerAudioEligibility, getExcludedNativeSourceUrls, SOURCE_FILES,
  audioEligibilitySourceHash, checkedAudioEligibilityFingerprints };
