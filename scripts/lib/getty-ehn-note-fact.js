const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const LICENSE_URL = 'https://www.getty.edu/research-conservation/tools-databases/vocabularies/data-services/';
const LICENSE_SHA = '91f35fda0ec2d70788eb876b9a0ec4a503c6e03df469ffb480faf2a9b2d67d3c';
const LICENSE_FILE = 'getty-vocabularies-license-public.raw.html';
const FACT = Object.freeze({
  sourceSpelling: 'queniuhcatza', display: 'keniwkatsa', meaningEn: 'how; in what way', meaningEs: 'cómo; de qué manera',
  selectedSense: 'manner-reference', formKind: 'attested-reference-form',
  primary: Object.freeze({
    url: 'https://www.getty.edu/vow/AATFullDisplay?find=&logic=&note=&page=&subjectid=300343683',
    file: 'getty-deer-ehn-note-public.raw.html', subjectId: '300343683',
    sha256: '4969376b6b25b4b847714f79a114c0428e4bdff56b9fc91b23c18ed57892338e',
    contextStart: 32609, contextEnd: 33289, contextSha256: 'e6ee6291b484e4bdc1ec1734ede0da211aa4766b641cf382800d503d75b2111f', textStart: 32982,
  }),
  supplemental: Object.freeze({
    url: 'https://www.getty.edu/vow/AATFullDisplay?find=&logic=AND&note=&subjectid=300266506',
    file: 'getty-birds-ehn-note-public.raw.html', subjectId: '300266506',
    sha256: '961fc7a68d404a98796837b345aa3df55228284e128b2c9c7f99fe1d99192a3f',
    contextStart: 41994, contextEnd: 42682, contextSha256: '914a2081e4f74b364f5882713473eecc5185383918687050cda82956e771302d', textStart: 42343,
  }),
});

// Exact offsets are tied to the complete private raw bytes. An isolated match
// in a Classical field or a neighboring note cannot prove this modern fact.
function verifyNoteOccurrence(text, form, evidence, expected) {
  assert.equal(evidence.subjectId, expected.subjectId);
  assert.equal(evidence.referenceUrl, expected.url);
  assert.equal(evidence.referenceFileSha256, expected.sha256);
  assert.equal(evidence.contextTextStart, expected.contextStart);
  assert.equal(evidence.contextTextEnd, expected.contextEnd);
  assert.equal(evidence.contextSha256, expected.contextSha256);
  assert.equal(evidence.referenceTextStart, expected.textStart);
  assert.equal(evidence.referenceTextEnd, expected.textStart + form.length);
  const context = text.slice(expected.contextStart, expected.contextEnd);
  assert.equal(sha(context), expected.contextSha256, 'Changed selected Getty context');
  assert.ok(context.startsWith('<TR>') && context.endsWith('</TR>'));
  assert.ok(context.includes('<B>Eastern Huasteca Nahuatl </B>'), 'Selected note is not explicitly Eastern Huasteca');
  assert.ok(text.indexOf('Additional Notes:') < expected.contextStart);
  assert.equal(text.slice(expected.textStart, expected.textStart + form.length), form);
  assert.ok(expected.textStart >= expected.contextStart && expected.textStart + form.length <= expected.contextEnd);
  assert.ok(!/[\p{L}\p{M}\p{N}_]/u.test(text[expected.textStart - 1] + text[expected.textStart + form.length]), 'Getty form is only a substring');
}

function verifyReference(references, expected) {
  assert.ok(Object.hasOwn(references, expected.url), 'Missing exact Getty public reference');
  const reference = references[expected.url];
  assert.equal(reference.reference_url, expected.url);
  assert.equal(reference.source_sha256, expected.sha256);
  assert.equal(typeof reference.text, 'string');
  assert.equal(sha(reference.text), expected.sha256, 'Changed Getty raw source bytes');
  return reference.text;
}

// Deliberately approves one individually reviewed linguistic fact, not an
// automatic translation or a general importer for arbitrary Getty notes.
function verifyGettyEhnNoteFact(entry, references) {
  const loc = entry.sourceLocator, proof = loc.gettyNoteFactProof;
  assert.equal(loc.sourceType, 'individual-getty-ehn-note-fact');
  assert.equal(entry.sourceSpelling, FACT.sourceSpelling, 'Unreviewed Getty word fact');
  assert.equal(entry.display, FACT.display);
  assert.equal(entry.meaningEn, FACT.meaningEn);
  assert.equal(entry.meaningEs, FACT.meaningEs);
  assert.equal(entry.formKind, FACT.formKind);
  assert.equal(entry.partOfSpeech, 'manner expression');
  assert.equal(entry.sourceUrl, FACT.primary.url);
  assert.equal(loc.sourceUrl, FACT.primary.url);
  assert.equal(loc.attestedHeadword, FACT.sourceSpelling);
  assert.equal(loc.referenceFileSha256, FACT.primary.sha256);
  assert.equal(proof.kind, 'individually-reviewed-getty-ehn-note-function');
  assert.equal(proof.selectedForm, FACT.sourceSpelling);
  assert.equal(proof.selectedSense, FACT.selectedSense);
  assert.equal(proof.scope, 'modern-ehn-descriptive-manner-reference');
  for (const field of ['completeStandaloneUtteranceClaimed', 'generalFinalNRemovalRuleClaimed', 'interrogativeSentenceFrameApproved', 'sourceNoteProseReused', 'mediaReuseLicenseClaimed']) assert.equal(proof[field], false);
  assert.equal(entry.audioUrl, null);
  assert.equal(entry.audioKind, 'missing');
  const primary = verifyReference(references, FACT.primary);
  assert.ok(primary.includes('GRI, FloCo terminology (2019-)'));
  verifyNoteOccurrence(primary, FACT.sourceSpelling, proof, FACT.primary);
  assert.equal(proof.supplementalOccurrences.length, 1);
  const supplemental = verifyReference(references, FACT.supplemental);
  verifyNoteOccurrence(supplemental, FACT.sourceSpelling, proof.supplementalOccurrences[0], FACT.supplemental);
  assert.equal(proof.sourceLicenseListingUrl, LICENSE_URL);
  assert.equal(proof.sourceLicenseListingSha256, LICENSE_SHA);
  const license = verifyReference(references, { url: LICENSE_URL, sha256: LICENSE_SHA });
  assert.ok(license.includes('Open Data Commons Attribution License') && license.includes('ODC-By'));
  assert.ok(license.includes('Contains information from the J. Paul Getty Trust'));
  assert.equal(entry.attribution.sourceLicenseListingUrl, LICENSE_URL);
  assert.equal(entry.attribution.licenseUrl, 'https://opendatacommons.org/licenses/by/1-0/');
  assert.ok(entry.attribution.authors.includes('Getty Research Institute, GRI-FloCo contributors'));
  return true;
}

module.exports = { verifyGettyEhnNoteFact, verifyGettyNoteOccurrence: verifyNoteOccurrence, FACT, LICENSE_URL, LICENSE_SHA, LICENSE_FILE };
