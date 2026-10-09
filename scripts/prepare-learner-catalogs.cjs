"use strict";

// Selected learner data only. Raw authoring evidence stays outside browser imports.
const fs = require("node:fs");
const path = require("node:path");
const { loadTs } = require("./lib/course-audio-inputs.js");
const { projectLearnerAudioManifest } = require("../src/lib/learner-audio-projection.cjs");
const ROOT = path.resolve(__dirname, "..");
const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, name), "utf8"));
const S3_WORD_IMAGE_BASE = "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";

function learnerImageUrl(name, entry) {
  if (!entry) return "";
  const value = typeof entry === "string" ? entry : entry.url ?? entry.key ?? "";
  if (name !== "s3-word-images") return value;
  return value.startsWith("http") ? value : S3_WORD_IMAGE_BASE + value.replace(/^\/+/, "");
}
function learnerImageExclusion(headword, entry, exclusionReason) {
  return exclusionReason([headword, entry?.alt, entry?.title, entry?.gloss,
    entry?.provenance?.entry_id, entry?.provenance?.meaning_en, entry?.provenance?.meaning_es]);
}
function projectLearnerImageRecords(records, { name, heldAssetUrls, exclusionReason }) {
  return Object.fromEntries(Object.entries(records).filter(([headword, entry]) =>
    !heldAssetUrls.has(learnerImageUrl(name, entry)) && !learnerImageExclusion(headword, entry, exclusionReason)));
}

/** Preserve why a spelling's former illustration was withheld without shipping
 * its URL, asset metadata, source glosses or historical authoring record. */
function projectLearnerImageHoldReasons(records, { name, heldAssets, exclusionReason }) {
  return Object.fromEntries(Object.entries(records).flatMap(([headword, entry]) => {
    if (learnerImageExclusion(headword, entry, exclusionReason)) return [];
    const hold = heldAssets.get(learnerImageUrl(name, entry));
    return hold ? [[headword, { reason: hold.reason }]] : [];
  }));
}

function safetyProjection() {
  const policy = read("src/data/app-content-exclusions.json");
  return { headwords: policy.headwords, patterns: policy.patterns,
    learnerSenseExclusions: policy.learnerSenseExclusions.map(({ entryId, category, headword }) => ({ entryId, category, headword })),
    learnerSenseRules: policy.learnerSenseRules,
    learnerExcludedHeadwords: policy.learnerExcludedHeadwords,
    learnerExcludedExactText: policy.learnerExcludedExactText };
}

function prepareLearnerCatalogs({ check = false } = {}) {
  const expected = new Map([["src/data/learner-safety-policy.json", safetyProjection()]]);
  const policyFilename = path.join(ROOT, "src/data/learner-safety-policy.json");
  // Runtime selection reads this minimal policy. Refresh it before deriving catalogs.
  if (!check) fs.writeFileSync(policyFilename, JSON.stringify(expected.get("src/data/learner-safety-policy.json"), null, 2) + "\n");
  else if (!fs.existsSync(policyFilename) || JSON.stringify(read("src/data/learner-safety-policy.json")) !== JSON.stringify(expected.get("src/data/learner-safety-policy.json"))) {
    throw new Error("Learner safety policy is stale. Prepare the reviewed learner catalogs locally.");
  }
  const projectedAudio = projectLearnerAudioManifest(read("src/data/generated-course-audio.json"), read("src/data/audio-learner-exclusions.json"));
  const audioName = "src/data/learner-generated-audio.json";
  expected.set(audioName, projectedAudio);
  if (!check) fs.writeFileSync(path.join(ROOT, audioName), JSON.stringify(projectedAudio, null, 2) + "\n");
  else if (!fs.existsSync(path.join(ROOT, audioName)) || JSON.stringify(read(audioName)) !== JSON.stringify(projectedAudio)) {
    throw new Error("Learner audio projection is stale. Prepare the reviewed learner catalogs locally.");
  }
  const conversations = loadTs("src/data/conversation-scenarios.ts");
  const grammar = loadTs("src/data/grammar-lessons.ts");
  const lexical = loadTs("src/data/lexical-expansion.ts");
  const expansion = loadTs("src/data/v3-expansion.ts");
  const exclusions = loadTs("src/data/excluded-vocab.ts");
  const audio = loadTs("src/lib/generated-audio.ts");
  expected.set("src/data/learner-conversations.json", {
    scenarios: conversations.getConversationScenarios(), patterns: conversations.getSentencePatterns(),
  });
  expected.set("src/data/learner-grammar.json", grammar.GRAMMAR_LESSONS);
  expected.set("src/data/learner-offline-words.json", lexical.getExpansionEntries());
  expected.set("src/data/learner-excluded-vocab-ids.json", [...exclusions.EXCLUDED_VOCAB_IDS]);
  const listeningWords = [...lexical.getExpansionEntries().map(entry => ({ headword: entry.headword,
    sourceSpelling: entry.sourceSpelling, english: entry.english, spanish: entry.spanish,
    audio: { url: entry.audio.url }, source: { url: entry.source.url, license: entry.source.license },
    activityId: `word:${entry.cardId}`, audioReferenceId: `core-vocab:${entry.cardId}` })),
    ...expansion.getVerifiedExpansionEntries(true).flatMap(entry => {
      const recording = audio.resolvePracticeRecording({ text: entry.display, url: entry.audioUrl,
        kind: "source", referenceId: `vocabulary:${entry.id}` });
      return recording.url ? [{ headword: entry.display, sourceSpelling: entry.sourceSpelling,
        english: entry.meaningEn, spanish: entry.meaningEs, audio: { url: recording.url },
        source: { url: entry.sourceUrl, license: entry.sourceLicense },
        activityId: `word:${entry.id}`, audioReferenceId: `vocabulary:${entry.id}` }] : [];
    })];
  expected.set("src/data/learner-listening.json", listeningWords);
  const selected = read("src/data/learner-vocabulary-senses.json").corrections;
  expected.set("src/data/learner-image-senses.json", selected.map(({ id, display, meaningEn, meaningEs, sourceFactReviewHash }) =>
    ({ id, display, meaningEn, meaningEs, sourceFactReviewHash })));
  const { getAppContentExclusionReason } = loadTs("src/lib/app-content-safety.ts");
  const heldAssets = new Map(read("src/data/image-content-review.json").assets
    .filter(asset => asset.status === "held").map(asset => [asset.url, asset]));
  const heldAssetUrls = new Set(heldAssets.keys());
  const holdReasons = {};
  for (const name of ["word-images", "s3-word-images", "openai-word-images"]) {
    const records = read(`src/data/${name}.json`);
    expected.set(`src/data/learner-${name}.json`, projectLearnerImageRecords(records,
      { name, heldAssetUrls, exclusionReason: getAppContentExclusionReason }));
    holdReasons[name] = projectLearnerImageHoldReasons(records,
      { name, heldAssets, exclusionReason: getAppContentExclusionReason });
  }
  expected.set("src/data/learner-image-hold-reasons.json", holdReasons);
  for (const [name, data] of expected) {
    const filename = path.join(ROOT, name);
    if (check) {
      if (!fs.existsSync(filename) || JSON.stringify(read(name)) !== JSON.stringify(data)) {
        throw new Error(`Selected learner catalog is stale: ${name}`);
      }
    } else fs.writeFileSync(filename, JSON.stringify(data, null, 2) + "\n");
  }
  return { files: [...expected.keys()], scenarios: conversations.getConversationScenarios().length,
    patterns: conversations.getSentencePatterns().length, grammarReferences: grammar.GRAMMAR_LESSONS.length,
    offlineWords: lexical.getExpansionEntries().length, listeningWords: listeningWords.length };
}

module.exports = { prepareLearnerCatalogs, safetyProjection, projectLearnerImageRecords, projectLearnerImageHoldReasons };
if (require.main === module) {
  const summary = prepareLearnerCatalogs({ check: process.argv.includes("--check") });
  console.log(`${process.argv.includes("--check") ? "Checked" : "Prepared"} ${summary.files.length} selected learner catalogs (${summary.listeningWords} listening cards).`);
}
