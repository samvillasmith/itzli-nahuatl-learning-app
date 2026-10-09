const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// A transcription correction replaces one frozen target slot; it cannot create another.
function applyTargetFormCorrections(originalKeys, corrections, concordance, inventory, baselineKeys, normalize, inputHashes) {
  const result = new Set(originalKeys);
  assert.equal(corrections.canonicalInventoryUnmodified, true);
  for (const [key, hash] of Object.entries(inputHashes)) assert.equal(corrections.inputSha256[key], hash);
  const seen = new Set();
  for (const record of corrections.records) {
    const { correctionReviewHash, ...review } = record;
    assert.equal(digest(review), correctionReviewHash, 'Changed correction review');
    assert.equal(record.decision, 'approved-photographed-transcription-correction');
    const anchor = concordance.forms.find(row => row.source_form_key === record.canonicalSourceFormKey);
    const row = inventory.entries.find(item => item.research_id === record.canonicalResearchId);
    assert.ok(anchor && row, 'Missing canonical correction identity');
    assert.equal(row.source_form, record.canonicalSourceFormKey);
    assert.equal(anchor.inali_retrieval_key, record.oldRetrievalKey);
    assert.equal(record.targetItemId, 'private-target-' + createHash('sha256').update('historical-1228|' + record.canonicalSourceFormKey).digest('hex').slice(0, 16));
    const before = normalize(record.oldRetrievalKey), after = normalize(record.correctedRetrievalKey);
    assert.ok(originalKeys.has(before) && result.has(before), 'Correction must replace an original target');
    assert.ok(!seen.has(before), 'Duplicate target correction');
    assert.ok(!result.has(after) && !baselineKeys.has(after), 'Corrected target collision');
    assert.equal(record.identityImpact.newVocabularySlots, 0);
    assert.equal(record.identityImpact.targetSlotsReplaced, 1);
    const proof = record.photoEvidence.characterProof;
    const source = record.canonicalSourceFormKey;
    assert.ok(Number.isInteger(proof.zeroBasedIndex) && proof.zeroBasedIndex >= 0 && proof.zeroBasedIndex <= source.length);
    if (proof.operation === 'insert') assert.equal(proof.erroneousCharacter, null);
    else assert.equal(source[proof.zeroBasedIndex], proof.erroneousCharacter);
    const replacement = proof.operation === 'remove' ? '' : proof.photographedCharacter;
    assert.ok(['remove', 'replace', 'insert'].includes(proof.operation));
    assert.equal(source.slice(0, proof.zeroBasedIndex) + replacement + source.slice(proof.zeroBasedIndex + (proof.operation === 'insert' ? 0 : 1)), record.correctedPhotographedSourceForm);
    assert.equal(normalize(record.correctedPhotographedSourceForm), after);
    result.delete(before);
    result.add(after);
    seen.add(before);
  }
  assert.equal(result.size, originalKeys.size, 'Corrections must preserve target count');
  return result;
}
module.exports = { applyTargetFormCorrections };
