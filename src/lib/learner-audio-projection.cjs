"use strict";

/** Follow explicit identity links only. Source evidence prose never becomes a
 * content classifier, and a form with a retained parent remains eligible. */
function getExcludedAudioDependencies(records, excludedReferenceIds, excludedEntryIds) {
  const references = new Set(excludedReferenceIds), entries = new Set(excludedEntryIds), reasons = new Map();
  const hold = (id, reason) => { if (id) { reasons.set(id, reason); references.add(id); } };
  for (const row of records) {
    const id = row.id || row.reference_id, locator = row.locator || {};
    if (references.has(locator.parent_reference_id)) hold(id, "excluded-parent-phrase");
    if (entries.has(locator.entry_id)) hold(id, "excluded-parent-entry");
    if (locator.phrase_ids?.length && locator.phrase_ids.every(id => references.has(`phrase:${id}`)))
      hold(id, "all-selected-parent-phrases-excluded");
  }
  return [...reasons].map(([reference_id, reason]) => ({ reference_id, reason }));
}

/** Project existing recordings onto current learner references. Shared clips
 * survive whenever an eligible reference still uses them; original bytes and
 * historical manifests are never changed by this pure function. */
function projectLearnerAudioManifest(manifest, policy = {}) {
  const held = new Set([...(manifest.held_reference_ids || []), ...(policy.excluded_reference_ids || [])]);
  const excludedUrls = new Set([...(manifest.held_source_urls || []), ...(policy.excluded_source_urls || [])]);
  const bindings = (manifest.bindings || []).filter(binding => !held.has(binding.reference_id));
  const source_bindings = (manifest.source_bindings || []).filter(binding =>
    !held.has(binding.reference_id) && !excludedUrls.has(binding.url));
  const referencedAssets = new Set(bindings.map(binding => binding.asset_id));
  const assets = (manifest.assets || []).filter(asset => referencedAssets.has(asset.id));
  const assetIds = new Set(assets.map(asset => asset.id));
  const removedBindingUrls = new Set((manifest.source_bindings || []).filter(binding =>
    held.has(binding.reference_id)).map(binding => binding.url));
  const retainedBindingUrls = new Set(source_bindings.map(binding => binding.url));
  const source_asset_urls = [...new Set([...(manifest.source_asset_urls || []), ...retainedBindingUrls])]
    .filter(url => !excludedUrls.has(url) && (!removedBindingUrls.has(url) || retainedBindingUrls.has(url)));
  const sourceUrls = new Set(source_asset_urls);
  const lesson_assets = (manifest.lesson_assets || []).map(group => ({ ...group,
    asset_ids: [...new Set(group.asset_ids || [])].filter(id => assetIds.has(id)),
    source_urls: [...new Set(group.source_urls || [])].filter(url => sourceUrls.has(url)),
  }));
  return { ...manifest, assets, bindings, source_bindings, source_asset_urls, lesson_assets,
    held_reference_ids: [...held].sort(), held_source_urls: [...excludedUrls].sort(),
    learner_excluded_reference_ids: [...new Set([...(manifest.learner_excluded_reference_ids || []), ...(policy.excluded_reference_ids || [])])].sort(),
    ...(policy.learner_content_policy ? { learner_content_policy: policy.learner_content_policy } : {}) };
}

module.exports = { projectLearnerAudioManifest, getExcludedAudioDependencies };
