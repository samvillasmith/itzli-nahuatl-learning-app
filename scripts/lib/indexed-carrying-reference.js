const assert = require('node:assert/strict');
const INDEX_URL = 'https://gdn.iib.unam.mx/diccionario/zazaca/27080';
const INDEX_SHA = 'eb7b26617011c851dfe10a3d8beb3161ad187cf2c6042e5ff9f55aa2e4ecb2d4';
const INDEXED_CARRYING_PROOF = { kind: 'one-modern-indexed-carrying-verb-reference', sourceUrl: INDEX_URL, sourceFileSha256: INDEX_SHA, selectedDictionary: 'Mecayapan', publicationYear: 2002, originalPaleographicForm: 'quisasaca', explicitlyLabeledPrefix: 'qui', extraction: { removedExplicitPrefix: 'qui', unchangedLexicalReference: 'sasaca', learnerDisplay: 'sasaka' }, historicalParallelMeaningsUsed: false, modernMultipleOriginSenseApproved: false, EasternCommunityUsageCertified: false, freeStandaloneUtteranceClaimed: false, genericPrefixRemovalGeneratorApproved: false, reduplicationGeneratorApproved: false, pronunciationCertificationClaimed: false, sourceAudioClaimed: false, sourceExampleCopied: false };
function verifyIndexedCarryingReference(entry, indexHtml, indexHash) {
  assert.equal(indexHash, INDEX_SHA); const loc = entry.sourceLocator;
  assert.equal(loc.sourceType, 'individual-modern-indexed-verb-reference'); assert.equal(loc.referenceFileSha256, INDEX_SHA); assert.equal(entry.sourceUrl, INDEX_URL); assert.equal(loc.sourceUrl, INDEX_URL);
  assert.deepEqual(loc.indexedVerbReferenceProof, INDEXED_CARRYING_PROOF); assert.equal(loc.attestedHeadword, null); assert.equal(loc.referenceHeadword, 'quisasaca');
  assert.equal(entry.display, 'sasaka'); assert.equal(entry.sourceSpelling, 'sasaca'); assert.equal(entry.meaningEn, 'carry or transport (Mecayapan verb reference)'); assert.equal(entry.meaningEs, 'acarrear o transportar (referencia verbal de Mecayapan)');
  assert.equal(entry.partOfSpeech, 'verb reference'); assert.equal(entry.formKind, 'source-extracted-reference-form'); assert.equal(entry.audioUrl, null); assert.equal(entry.audioKind, 'missing');
  const text = indexHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ');
  // Only the governing selected record can supply the fact; later merged entries are excluded.
  const end = text.indexOf('Entradas'); assert.ok(end >= 0); const body = text.slice(0, end);
  assert.ok(/Paleografía:\s+quisasaca\s+Grafía normalizada:\s+zazaca\s+Prefijo:\s+qui\s+Tipo:\s+v\. t\./u.test(body));
  assert.ok(/Traducción uno:\s+acarrear\s+Traducción dos:\s+acarrear\s+Diccionario:\s+Mecayapan/u.test(body)); assert.ok(/Fuente:\s+2002 Mecayapan/u.test(body));
  assert.equal('quisasaca'.slice('qui'.length), entry.sourceSpelling);
}
module.exports = { verifyIndexedCarryingReference, INDEXED_CARRYING_PROOF, INDEX_URL, INDEX_SHA };
