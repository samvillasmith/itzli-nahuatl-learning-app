/* Public saved-pack playback. No credentials, source rewriting or progress writes. */
(() => {
  'use strict';
  const RECIPE = 'spanish-air-b-2026-10-07';
  const BASE = 'https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/audio-v3/' + RECIPE + '/';
  const HASH = /^[a-f0-9]{64}$/;
  const text = value => typeof value === 'string' && value.length > 0 && value.length <= 20000;
  const reference = value => typeof value === 'string' && value.length > 0 && value.length <= 500;
  function sourceAssetIdentity(value) {
    try { const url = new URL(value); url.search = ''; url.hash = ''; return url.href; } catch { return value; }
  }
  function sourceUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'tlahtolli.coerll.utexas.edu' && !url.port &&
        !url.username && !url.password && !url.hash && /\.(?:mp3|wav|ogg)$/i.test(url.pathname);
    } catch { return false; }
  }
  function createIndex(manifest) {
    const assets = new Map(), held = new Set(), known = new Set(), heldSourceUrls = new Set(), excludedContent = new Set();
    const generatedReferences = new Map(), generatedTexts = new Map();
    const sourceReferences = new Map(), sourceTexts = new Map();
    const valid = manifest && manifest.schema_version === 1 && manifest.recipe_id === RECIPE &&
      Array.isArray(manifest.assets) && manifest.assets.length <= 10000 &&
      Array.isArray(manifest.bindings) && manifest.bindings.length <= 100000 &&
      Array.isArray(manifest.held_reference_ids) && manifest.held_reference_ids.length <= 100000 &&
      (manifest.held_source_urls === undefined || Array.isArray(manifest.held_source_urls) && manifest.held_source_urls.length <= 100000) &&
      (manifest.learner_excluded_reference_ids === undefined || Array.isArray(manifest.learner_excluded_reference_ids) && manifest.learner_excluded_reference_ids.length <= 100000) &&
      (manifest.source_bindings === undefined || Array.isArray(manifest.source_bindings) && manifest.source_bindings.length <= 100000);
    const content = manifest?.learner_content_policy;
    const normalizeContent = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    let contentValid = Boolean(valid && content?.schema_version === 1 &&
      ['headwords', 'exact_text', 'patterns'].every(key => Array.isArray(content[key]) && content[key].length <= 10000 &&
        content[key].every(value => typeof value === 'string' && value.length <= 20000)) &&
      Array.isArray(manifest.learner_excluded_reference_ids) && manifest.learner_excluded_reference_ids.length <= 100000);
    const blockedHeadwords = new Set(contentValid ? content.headwords.map(normalizeContent) : []);
    const blockedExactText = new Set(contentValid ? content.exact_text.map(normalizeContent) : []);
    let contentPatterns = [];
    try { if (contentValid) contentPatterns = content.patterns.map(value => new RegExp(value, 'iu')); } catch { contentValid = false; }
    function add(map, key, url) {
      const previous = map.get(key);
      map.set(key, previous === undefined || previous === url ? url : null);
    }
    function bind(references, texts, binding, url) {
      const entries = references.get(binding.reference_id) || new Map();
      add(entries, binding.runtime_text, url);
      references.set(binding.reference_id, entries);
      add(texts, binding.runtime_text, url);
    }
    if (valid) {
      for (const id of manifest.held_reference_ids) if (reference(id)) { held.add(id); known.add(id); }
      for (const url of manifest.held_source_urls || []) if (typeof url === 'string') heldSourceUrls.add(sourceAssetIdentity(url));
      for (const id of manifest.learner_excluded_reference_ids || []) if (reference(id)) excludedContent.add(id);
      for (const asset of manifest.assets) {
        if (!asset || !HASH.test(asset.id) || !HASH.test(asset.ssml_sha256) ||
          asset.url !== BASE + asset.id + '.mp3' && asset.url !== BASE + asset.id + '.wav' ||
          asset.audio_sha256 !== undefined && !HASH.test(asset.audio_sha256) ||
          asset.byte_length !== undefined && (!Number.isSafeInteger(asset.byte_length) || asset.byte_length <= 0)) continue;
        // Duplicate identities with different assets cannot authorize playback.
        add(assets, asset.id, asset.url);
      }
      for (const binding of manifest.bindings) {
        if (!binding || !reference(binding.reference_id) || !text(binding.runtime_text)) continue;
        known.add(binding.reference_id);
        const url = assets.get(binding.asset_id);
        if (url && !held.has(binding.reference_id)) bind(generatedReferences, generatedTexts, binding, url);
      }
      for (const binding of manifest.source_bindings || []) {
        if (!binding || !reference(binding.reference_id) || !text(binding.runtime_text)) continue;
        known.add(binding.reference_id);
        if (sourceUrl(binding.url) && !held.has(binding.reference_id) && !heldSourceUrls.has(sourceAssetIdentity(binding.url))) bind(sourceReferences, sourceTexts, binding, binding.url);
      }
    }
    return {
      valid: Boolean(valid),
      contentValid,
      isContentExcluded(referenceId, values = []) {
        if (excludedContent.has(referenceId)) return true;
        const present = values.filter(value => typeof value === 'string');
        if (present.some(value => blockedHeadwords.has(normalizeContent(value)) || blockedExactText.has(normalizeContent(value)))) return true;
        const text = normalizeContent(present.join(' ')).replace(/\b(?:same[- ]sex (?:relationship|couple|couples|orientation|marriage)|sexual orientation|gender identity)\b/gu, 'neutral identity');
        return contentPatterns.some(pattern => pattern.test(text));
      },
      resolve({ text: raw, displayText, referenceId, url, held: withheld = false }) {
        if (withheld || held.has(referenceId) || heldSourceUrls.has(sourceAssetIdentity(url))) return null;
        const candidates = [...new Set([raw, displayText].filter(text))];
        if (!candidates.length) return null;
        const identified = known.has(referenceId);
        const originals = identified ? sourceReferences.get(referenceId) : sourceTexts;
        const generated = identified ? generatedReferences.get(referenceId) : generatedTexts;
        // A known identity must match its own explicit raw/INALI alias. It may
        // never borrow another word's clip or keep a mismatching old recording.
        if (identified && !candidates.some(candidate => originals?.has(candidate) || generated?.has(candidate))) return null;
        if (sourceUrl(url)) return { url, kind: 'source', generated: false };
        for (const candidate of candidates) {
          const original = originals?.get(candidate);
          if (original) return { url: original, kind: 'source', generated: false };
        }
        for (const candidate of candidates) {
          const generatedUrl = generated?.get(candidate);
          if (generatedUrl) return { url: generatedUrl, kind: 'synthetic', generated: true };
        }
        // Historical local/S3 synthetic URLs are not evidence for current text.
        return null;
      },
    };
  }
  globalThis.ItzliOfflineAudio = { createIndex };
})();
