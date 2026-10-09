const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const COPYRIGHT_URL = 'https://ebible.org/nheNT/copyright.htm';
const COPYRIGHT_SHA = '81488f675e64c971b4a12c032a18fdebb2a4f4ca837b10773fef0cc10c60db63';
const FACTS = Object.freeze({
  nopona: Object.freeze({
    url: 'https://ebible.org/nheNT/TIT01.htm', fragment: 'V5', file: 'ehn-wycliffe-titus1-public.raw.html',
    sha256: '640fd20e6a85e98b8c0e59430a35d8a36a667fdfece0a37511d005b6f1cd9132',
    contextStart: 3654, contextEnd: 3952, contextSha256: 'e8aac6922322e5988225283751c2687c9596d26d1a3fc910b22d11c24ce70980',
    textStart: 3834, nextVerse: 'V6', meaningEn: 'there (at a mentioned place)', meaningEs: 'allí (en un lugar mencionado)',
    formKind: 'attested-reference-form', selectedSense: 'mentioned-location-reference',
  }),
  ipampa: Object.freeze({
    url: 'https://ebible.org/nheNT/PHP03.htm', fragment: 'V9', file: 'ehn-wycliffe-philippians3-public.raw.html',
    sha256: '2d0a2dbe40e6199a0cb4e9c2955125bf9e96d370e380e382e0c0d42e405b34d6',
    contextStart: 3568, contextEnd: 3913, contextSha256: '127d9f782abcebc4a63a3364fdc17e39404bea5b52162f975245d02bcd1943f5',
    textStart: 3690, nextVerse: 'V10', meaningEn: 'because of; for the sake of', meaningEs: 'a causa de; por',
    formKind: 'relational-reference-form', selectedSense: 'cause-or-beneficiary-reference',
    supplemental: Object.freeze({ fragment: 'V10', contextStart: 3913, contextEnd: 4223,
      contextSha256: 'c40a5cadb2da886f95f7116ff05413ffa7e2999263efec6305db974882374aef', textStart: 4213, nextVerse: 'V11' }),
  }),
});

function verifyOccurrence(text, form, evidence, expected) {
  assert.equal(evidence.contextVerseId, expected.fragment);
  assert.equal(evidence.contextTextStart, expected.contextStart);
  assert.equal(evidence.contextTextEnd, expected.contextEnd);
  assert.equal(evidence.contextSha256, expected.contextSha256);
  assert.equal(evidence.referenceTextStart, expected.textStart);
  assert.equal(evidence.referenceTextEnd, expected.textStart + form.length);
  const context = text.slice(expected.contextStart, expected.contextEnd);
  assert.equal(sha(context), expected.contextSha256, 'Changed selected EHN context');
  assert.ok(context.startsWith(`<span class="verse" id="${expected.fragment}">`));
  assert.ok(text.slice(expected.contextEnd).startsWith(`<span class="verse" id="${expected.nextVerse}">`));
  assert.equal(text.slice(expected.textStart, expected.textStart + form.length), form);
  assert.ok(!/[\p{L}\p{M}\p{N}_]/u.test(text[expected.textStart - 1] + text[expected.textStart + form.length]), 'Corpus form is only a substring');
}

// These two whole written function forms are individually bounded. This guard
// verifies provenance and the reviewed scope; a human semantic pass is still
// required. The caller supplies hashes of the saved anonymous raw bytes.
function verifyEhnPublicCorpusFact(entry, reference, rawFileHash, copyrightReference, copyrightRawHash) {
  const loc = entry.sourceLocator, proof = loc.corpusFactProof;
  assert.equal(loc.sourceType, 'individual-ehn-corpus-fact');
  assert.ok(Object.hasOwn(FACTS, entry.sourceSpelling), 'Unreviewed EHN corpus fact');
  const selected = FACTS[entry.sourceSpelling];
  assert.equal(entry.display, entry.sourceSpelling);
  assert.equal(entry.sourceUrl, `${selected.url}#${selected.fragment}`);
  assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(reference.reference_url, selected.url);
  assert.equal(reference.source_sha256, selected.sha256);
  assert.equal(rawFileHash, selected.sha256);
  assert.equal(loc.referenceFileSha256, selected.sha256);
  assert.equal(proof.kind, 'individually-reviewed-ehn-translation-corpus-function');
  assert.equal(proof.referenceUrl, selected.url);
  assert.equal(proof.referenceFileSha256, selected.sha256);
  assert.equal(proof.selectedForm, entry.sourceSpelling);
  assert.equal(loc.attestedHeadword, entry.sourceSpelling);
  assert.equal(proof.selectedSense, selected.selectedSense);
  assert.equal(entry.meaningEn, selected.meaningEn);
  assert.equal(entry.meaningEs, selected.meaningEs);
  assert.equal(entry.formKind, selected.formKind);
  assert.equal(proof.scope, 'translation-corpus-function-reference');
  assert.equal(proof.completeStandaloneUtteranceClaimed, false);
  assert.equal(proof.nearListenerDistanceRuleClaimed, false);
  assert.equal(proof.generalMorphologyRuleClaimed, false);
  assert.equal(proof.verseTextReused, false);
  assert.equal(proof.mediaReuseLicenseClaimed, false);
  assert.equal(entry.audioUrl, null);
  assert.equal(entry.audioKind, 'missing');
  assert.equal(typeof reference.text, 'string');
  assert.equal(sha(reference.text), selected.sha256, 'Changed raw EHN source text');
  assert.ok(reference.text.includes('Huasteca Oriental'));
  verifyOccurrence(reference.text, entry.sourceSpelling, proof, selected);
  if (selected.supplemental) {
    assert.equal(proof.supplementalOccurrences.length, 1);
    verifyOccurrence(reference.text, entry.sourceSpelling, proof.supplementalOccurrences[0], selected.supplemental);
  } else assert.deepEqual(proof.supplementalOccurrences, []);
  assert.equal(copyrightReference.reference_url, COPYRIGHT_URL);
  assert.equal(copyrightReference.source_sha256, COPYRIGHT_SHA);
  assert.equal(copyrightRawHash, COPYRIGHT_SHA);
  assert.equal(proof.regionalCopyrightUrl, COPYRIGHT_URL);
  assert.equal(proof.regionalCopyrightSha256, COPYRIGHT_SHA);
  assert.equal(typeof copyrightReference.text, 'string');
  assert.equal(sha(copyrightReference.text), COPYRIGHT_SHA);
  assert.ok(copyrightReference.text.includes('Dialect: Huasteca Oriental'));
  assert.ok(copyrightReference.text.includes('Translation by: Wycliffe Bible Translators, Inc.'));
  assert.ok(copyrightReference.text.includes('creativecommons.org/licenses/by-nc-nd/'));
  return true;
}

module.exports = { verifyEhnPublicCorpusFact, verifyExactCorpusOccurrence: verifyOccurrence, FACTS, COPYRIGHT_URL, COPYRIGHT_SHA };
