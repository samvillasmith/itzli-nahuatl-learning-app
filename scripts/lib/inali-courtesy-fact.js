const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const FACT = Object.freeze({
  sourceUrl: 'https://site.inali.gob.mx/Micrositios/Prontuarios/nahuatlV.html',
  evidenceFile: 'inali-huasteca-courtesy-indexed-primary.provider.txt',
  evidenceSha256: '8db47dccca06ca1331006909b125332bc6cfc962f5367f7f958526e08ae49787',
  evidenceKind: 'web-provider-indexed-primary-page-text',
  sourceSpelling: 'Tlazohcamati', display: 'tlasohkamati',
  meaningEn: 'thanks; thank you', meaningEs: 'gracias',
  scope: 'qualified-Huasteca-courtesy-gratitude-function',
  headingTextStart: 654, voiceTextStart: 1414,
  occurrences: Object.freeze([
    Object.freeze({ referenceTextStart: 1763, contextTextStart: 1763, contextTextEnd: 1798, contextSha256: '9dfe9d1a6fb1b5de908feb8fe214ba8e35863d45d1bffea70b1d6d682af00ce9' }),
    Object.freeze({ referenceTextStart: 1840, contextTextStart: 1840, contextTextEnd: 1903, contextSha256: 'fcf91d682351f185c13191fd22da48e8b95d6a9c2cdec0e78f2934cdb51077f4' }),
  ]),
});

// A frozen provider extract is evidence of the indexed official page. Its hash
// does not certify source-server HTML/PDF bytes or current server freshness.
function verifyIndexedOccurrence(text, form, occurrence, expected) {
  for (const field of ['referenceTextStart', 'contextTextStart', 'contextTextEnd', 'contextSha256']) assert.equal(occurrence[field], expected[field]);
  assert.equal(occurrence.referenceTextEnd, expected.referenceTextStart + form.length);
  assert.equal(sha(text.slice(expected.contextTextStart, expected.contextTextEnd)), expected.contextSha256, 'Changed indexed primary context');
  assert.equal(text.slice(expected.referenceTextStart, expected.referenceTextStart + form.length), form);
  assert.ok(expected.referenceTextStart >= expected.contextTextStart && expected.referenceTextStart + form.length <= expected.contextTextEnd);
  assert.ok(!/[\p{L}\p{M}\p{N}_]/u.test((text[expected.referenceTextStart - 1] || '') + (text[expected.referenceTextStart + form.length] || '')), 'Only a partial word matches');
}

// One manually reviewed courtesy fact only. This is not a phrase importer,
// transitive-verb rule, media license or universal Eastern-variety certification.
function verifyInaliCourtesyFact(entry, references) {
  const loc = entry.sourceLocator, proof = loc.inaliCourtesyFactProof;
  assert.equal(loc.sourceType, 'individual-inali-courtesy-fact');
  assert.equal(entry.sourceUrl, FACT.sourceUrl);
  assert.equal(loc.sourceUrl, FACT.sourceUrl);
  assert.equal(entry.sourceSpelling, FACT.sourceSpelling, 'Unreviewed INALI word fact');
  assert.equal(loc.attestedHeadword, FACT.sourceSpelling);
  assert.equal(entry.display, FACT.display);
  assert.equal(entry.meaningEn, FACT.meaningEn);
  assert.equal(entry.meaningEs, FACT.meaningEs);
  assert.equal(entry.partOfSpeech, 'gratitude expression');
  assert.equal(entry.formKind, 'attested-reference-form');
  assert.equal(entry.audioUrl, null);
  assert.equal(entry.audioKind, 'missing');
  assert.equal(loc.providerEvidenceSha256, FACT.evidenceSha256);
  assert.equal(loc.referenceFileSha256 ?? null, null, 'Indexed evidence is not acquired source-server bytes');
  assert.equal(proof.kind, 'individually-reviewed-indexed-INALI-gratitude-fact');
  assert.equal(proof.referenceUrl, FACT.sourceUrl);
  assert.equal(proof.evidenceKind, FACT.evidenceKind);
  assert.equal(proof.providerEvidenceSha256, FACT.evidenceSha256);
  assert.equal(proof.selectedForm, FACT.sourceSpelling);
  assert.equal(proof.selectedSense, 'expressing-thanks');
  assert.equal(proof.scope, FACT.scope);
  for (const field of ['sourceServerByteIntegrityClaimed', 'currentSourceFreshnessCertified', 'universalEasternCommunityCertificationClaimed', 'completeBareUtteranceClaimed', 'transitiveAppreciateObjectSenseApproved', 'sourceExpressionsCopied', 'audioReuseLicenseClaimed', 'mediaReuseLicenseClaimed']) assert.equal(proof[field], false);
  assert.ok(Object.hasOwn(references, FACT.sourceUrl), 'Missing exact INALI indexed primary evidence');
  const reference = references[FACT.sourceUrl];
  assert.equal(reference.reference_url, FACT.sourceUrl);
  assert.equal(reference.evidence_kind, FACT.evidenceKind);
  assert.equal(reference.provider_evidence_sha256, FACT.evidenceSha256);
  assert.equal(reference.source_server_byte_integrity_claimed, false);
  assert.equal(sha(reference.text), FACT.evidenceSha256, 'Changed provider snapshot');
  assert.ok(reference.text.startsWith('Prontuarios en Lenguas Indígenas (' + FACT.sourceUrl + ')'));
  assert.equal(reference.text.slice(FACT.headingTextStart, FACT.headingTextStart + '# NÁHUATL DE LA HUASTECA'.length), '# NÁHUATL DE LA HUASTECA');
  assert.equal(reference.text.slice(FACT.voiceTextStart, FACT.voiceTextStart + 'Voz: Maximina Félix Allende'.length), 'Voz: Maximina Félix Allende');
  assert.equal(proof.occurrences.length, FACT.occurrences.length);
  proof.occurrences.forEach((occurrence, i) => verifyIndexedOccurrence(reference.text, FACT.sourceSpelling, occurrence, FACT.occurrences[i]));
  assert.equal(entry.contentLicense, 'CC BY-SA 4.0');
  assert.equal(entry.attribution.publisher, 'Instituto Nacional de Lenguas Indígenas (INALI)');
  assert.equal(entry.attribution.url, FACT.sourceUrl);
  assert.equal(entry.attribution.licenseUrl, null);
  return true;
}
module.exports = { verifyInaliCourtesyFact, verifyIndexedOccurrence, FACT };
