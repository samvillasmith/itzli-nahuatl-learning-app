const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const LOCAL_URL = 'https://jaltocan.gob.mx/jaltocan-hidalgo/nomenclatura';
const LOCAL_SHA = '2d32c9317f59962dabeb2eb3a0d9b4ec918497c993b290c37708a1de12f2c0fd';
const PASSAGE_SHA = '2d1923c335250ff92712778ea61d82c5d6d08a8d0efdcaf6df5872a0a74b714f';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

// The caller supplies the SHA of the saved anonymous raw HTML bytes. This
// bounded locator proves one municipal place-name fact, not spoken-word use.
function verifyLocalReferenceFact(entry, reference, rawFileHash) {
  const loc = entry.sourceLocator, proof = loc.localReferenceProof;
  assert.equal(loc.sourceType, 'individual-local-reference-fact');
  assert.equal(reference.reference_url, LOCAL_URL);
  assert.equal(entry.sourceUrl, LOCAL_URL);
  assert.equal(loc.sourceUrl, LOCAL_URL);
  assert.equal(reference.source_sha256, LOCAL_SHA);
  assert.equal(rawFileHash, LOCAL_SHA);
  assert.equal(proof.referenceFileSha256, LOCAL_SHA);
  assert.equal(proof.kind, 'exact-anonymous-municipal-etymology');
  assert.equal(proof.referenceUrl, LOCAL_URL);
  assert.equal(proof.scope, 'place-name-lexical-reference');
  assert.equal(entry.formKind, 'place-name-lexical-reference');
  assert.equal(entry.sourceSpelling, 'tosan');
  assert.equal(entry.display, 'tosan');
  assert.equal(loc.attestedHeadword, entry.sourceSpelling);
  assert.equal(proof.selectedForm, entry.sourceSpelling);
  assert.equal(proof.selectedMeaning, 'gopher');
  assert.equal(proof.completeStandaloneSpokenWordClaimed, false);
  assert.equal(proof.independentEasternSpeakerCertificationClaimed, false);
  assert.equal(entry.audioUrl, null);
  assert.equal(entry.audioKind, 'missing');
  assert.equal(proof.headingTextStart, 8656);
  assert.equal(proof.referenceTextStart, 8727);
  assert.equal(proof.referenceTextEnd, 8750);
  assert.equal(proof.exactPassageSha256, PASSAGE_SHA);
  assert.equal(typeof reference.text, 'string');
  assert.equal(reference.text.slice(8656, 8674), '<h3>Toponimia</h3>');
  const passage = reference.text.slice(proof.referenceTextStart, proof.referenceTextEnd);
  assert.equal(sha(passage), PASSAGE_SHA, 'Missing exact municipal fact passage');
  assert.ok(passage.startsWith(entry.sourceSpelling));
  const before = reference.text.slice(proof.referenceTextStart - 1, proof.referenceTextStart);
  const after = passage.slice(entry.sourceSpelling.length, entry.sourceSpelling.length + 1);
  assert.ok(!/[\p{L}\p{M}\p{N}_]/u.test(before + after), 'Local form is part of a larger token');
  const between = reference.text.slice(8674, proof.referenceTextStart);
  assert.ok(!/<h[1-6]\b|<\/section>/iu.test(between), 'Local form belongs to a different section');
  return true;
}
module.exports = { verifyLocalReferenceFact, LOCAL_URL, LOCAL_SHA, PASSAGE_SHA };
