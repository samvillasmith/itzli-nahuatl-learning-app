#!/usr/bin/env node
"use strict";

// Project already-produced audio locally. Never synthesize, upload, download,
// delete originals, access learners, or change image publication records.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { ROOT, sha256 } = require("./lib/course-audio-inputs");
const { buildAllCourseAudioInventory } = require("./lib/all-course-audio-inventory.cjs");
const { buildLearnerAudioEligibility } = require("./lib/learner-audio-eligibility.cjs");
const { projectLearnerAudioManifest } = require("../src/lib/learner-audio-projection.cjs");

function projectCurrentAudio({ write = false } = {}) {
  const runtimeFile = path.join(ROOT, "src/data/generated-course-audio.json");
  const publicFile = path.join(ROOT, "public/generated-course-audio.json");
  const original = fs.readFileSync(runtimeFile);
  assert(original.equals(fs.readFileSync(publicFile)), "Runtime and offline originals must match before projection");
  const manifest = JSON.parse(original);
  const inventory = buildAllCourseAudioInventory();
  const historicalPlan = path.join(ROOT, "data/audio-v3/all-course-air-b-plan.private.json");
  const historicalRecords = fs.existsSync(historicalPlan) ? JSON.parse(fs.readFileSync(historicalPlan)).records : [];
  const policy = buildLearnerAudioEligibility([...inventory.records, ...historicalRecords]);
  const projected = projectLearnerAudioManifest(manifest, policy);
  const serialized = JSON.stringify(projected) + "\n";
  const retained = new Set(projected.assets.map(asset => asset.id));
  const removedAssets = manifest.assets.filter(asset => !retained.has(asset.id));
  const summary = { original_assets: manifest.assets.length, active_assets: projected.assets.length,
    original_bindings: manifest.bindings.length, active_bindings: projected.bindings.length,
    original_source_bindings: manifest.source_bindings.length, active_source_bindings: projected.source_bindings.length,
    original_source_assets: manifest.source_asset_urls.length, active_source_assets: projected.source_asset_urls.length,
    excluded_reference_ids: policy.excluded_reference_ids.length, removed_generated_assets: removedAssets.length,
    lesson_groups: projected.lesson_assets.length, original_manifest_sha256: sha256(original),
    active_manifest_sha256: sha256(serialized), provider_calls: 0, originals_deleted: 0 };
  if (write) {
    const archive = path.join(ROOT, "data/audio-v3/learner-content-archives", summary.original_manifest_sha256);
    fs.mkdirSync(path.join(archive, "assets"), { recursive: true });
    // Content-addressed archival files are immutable and idempotent.
    const preserve = (destination, bytes) => {
      if (fs.existsSync(destination)) assert(fs.readFileSync(destination).equals(bytes), "Archive collision");
      else fs.writeFileSync(destination, bytes);
    };
    preserve(path.join(archive, "generated-course-audio.original.json"), original);
    if (fs.existsSync(historicalPlan)) preserve(path.join(archive, "all-course-air-b-plan.original.private.json"), fs.readFileSync(historicalPlan));
    const assetArchive = [];
    for (const asset of removedAssets) {
      const candidates = [path.join(ROOT, "data/audio-v3/releases", manifest.recipe_id, "delivery", `${asset.id}.mp3`),
        path.join(ROOT, "public/audio-v3/generated", manifest.recipe_id, `${asset.id}.mp3`)];
      const existing = candidates.find(file => fs.existsSync(file));
      if (!existing) { assetArchive.push({ id: asset.id, url: asset.url, local_copy: false, remote_original_untouched: true }); continue; }
      const bytes = fs.readFileSync(existing);
      assert(!asset.audio_sha256 || sha256(bytes) === asset.audio_sha256, "Original asset hash mismatch");
      preserve(path.join(archive, "assets", `${asset.id}.mp3`), bytes);
      assetArchive.push({ id: asset.id, audio_sha256: sha256(bytes), byte_length: bytes.length,
        local_copy: true, original_path: path.relative(ROOT, existing), remote_original_untouched: true });
    }
    preserve(path.join(archive, "asset-preservation.private.json"), Buffer.from(JSON.stringify(assetArchive, null, 2) + "\n"));
    const publicPolicy = { schema_version: policy.schema_version, excluded_reference_ids: policy.excluded_reference_ids,
      excluded_source_urls: policy.excluded_source_urls, learner_content_policy: policy.learner_content_policy,
      source_sha256_format: policy.source_sha256_format, source_sha256: policy.source_sha256 };
    fs.writeFileSync(path.join(ROOT, "src/data/audio-learner-exclusions.json"), JSON.stringify(publicPolicy, null, 2) + "\n");
    fs.writeFileSync(runtimeFile, serialized); fs.writeFileSync(publicFile, serialized);
    fs.writeFileSync(path.join(archive, "projection-audit.private.json"), JSON.stringify({ ...summary,
      policy, preserved_assets: assetArchive, publication_approval_changed: false }, null, 2) + "\n");
    summary.archived_local_assets = assetArchive.filter(row => row.local_copy).length;
  }
  return summary;
}

/** Re-pin an equivalent policy after an audited registry/file split. Never
 * rewrite current bindings, asset manifests, original clips or source labels. */
function refreshAudioEligibilityFingerprints() {
  const file = path.join(ROOT, "src/data/audio-learner-exclusions.json"), old = JSON.parse(fs.readFileSync(file));
  const runtimeFile = path.join(ROOT, "src/data/generated-course-audio.json"), publicFile = path.join(ROOT, "public/generated-course-audio.json");
  const original = fs.readFileSync(runtimeFile), offline = fs.readFileSync(publicFile);
  assert(original.equals(offline), "Current runtime/offline manifests differ");
  const plan = JSON.parse(fs.readFileSync(path.join(ROOT, "data/audio-v3/all-course-air-b-plan.private.json")));
  const current = buildLearnerAudioEligibility(plan.records);
  assert.deepEqual(current.excluded_reference_ids, old.excluded_reference_ids, "A fingerprint refresh cannot change reference eligibility");
  assert.deepEqual(current.excluded_source_urls, old.excluded_source_urls, "A fingerprint refresh cannot change source eligibility");
  assert.deepEqual(current.learner_content_policy, old.learner_content_policy, "Changed offline content rules require a full manifest projection");
  fs.writeFileSync(file, JSON.stringify({ schema_version:1, excluded_reference_ids:old.excluded_reference_ids,
    excluded_source_urls:old.excluded_source_urls, learner_content_policy:current.learner_content_policy,
    source_sha256_format:current.source_sha256_format, source_sha256:current.source_sha256 }, null, 2) + "\n");
  assert(original.equals(fs.readFileSync(runtimeFile)) && offline.equals(fs.readFileSync(publicFile)), "Current audio changed during fingerprint refresh");
  return { excluded_reference_ids:old.excluded_reference_ids.length, audio_manifest_sha256:sha256(original),
    policy_sha256:sha256(fs.readFileSync(file)), source_sha256_format:current.source_sha256_format,
    audio_manifest_writes:0, provider_calls:0 };
}

if (require.main === module) console.log(JSON.stringify(process.argv.includes("--refresh-policy-only")
  ? refreshAudioEligibilityFingerprints() : projectCurrentAudio({ write: process.argv.includes("--write") }), null, 2));
module.exports = { projectCurrentAudio, refreshAudioEligibilityFingerprints };
