const assert = require('node:assert/strict');
const DICTIONARY_URL = 'https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf';
const DICTIONARY_SHA = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const shared = {
  kind: 'one-model-constrained-abstract-noun-reference',
  suffix: { headword: 'YŌTL', pdfPage: 630, selectedFunction: 'abstract or substance nominalization', printedAlternate: 'lōtl' },
  model: { baseHeadword: 'IUCCILLI', pdfPage: 260, combiningStemMetadata: 'iuccil-', derivedHeadword: 'IUCCILLŌTL', decomposition: ['IUCCILLI', 'YŌTL'] },
  directWholeFormAttestationClaimed: false, genericAbstractNounGeneratorApproved: false,
  arbitraryAllomorphApproved: false, completeStandaloneUtteranceClaimed: false,
  fullPossessiveParadigmApproved: false, lexicalizedHistorySenseApproved: false,
  pronunciationCertificationClaimed: false, recordedSourceAudioClaimed: false,
  sourceExampleCopied: false
};
const ABSTRACT_NOUN_REFERENCES = {
  tlillotl: { sourceSpelling: 'tlīllōtl', meaningEn: 'blackness (abstract reference)', meaningEs: 'negrura (referencia abstracta)',
    proof: { ...structuredClone(shared), base: { headword: 'TLĪLLI', pdfPage: 558, combiningStemMetadata: 'tlīl-', selectedMeaning: 'black charcoal' },
      composition: { baseStem: 'tlīl', suffixRealization: 'lōtl', authoredReferenceForm: 'tlīllōtl', learnerDisplay: 'tlillotl', modeledOperation: 'unchanged l-final stem plus attested lōtl suffix realization' } } },
  tlahtollotl: { sourceSpelling: 'tlahtōllōtl', meaningEn: 'speech content (abstract reference)', meaningEs: 'contenido del habla (referencia abstracta)',
    proof: { ...structuredClone(shared), base: { headword: 'TLAHTŌLLI', pdfPage: 500, combiningStemMetadata: 'tlahtōl-', selectedMeaning: 'word / speech' },
      composition: { baseStem: 'tlahtōl', suffixRealization: 'lōtl', authoredReferenceForm: 'tlahtōllōtl', learnerDisplay: 'tlahtollotl', modeledOperation: 'unchanged l-final stem plus attested lōtl suffix realization' } } }
};
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function definition(reference, pageNumber, headword) {
  const page = reference.pages[pageNumber - 1];
  assert.equal(page?.pdf_page, pageNumber);
  assert.equal(typeof page.text, 'string');
  const head = new RegExp(`^${escapePattern(headword)}\\.\\s+tlat\\.`, 'm').exec(page.text);
  assert.ok(head, `Missing exact ${headword} head`);
  const remainder = page.text.slice(head.index + head[0].length);
  const end = remainder.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  const body = remainder.slice(0, end < 0 ? undefined : end);
  assert.ok(!body.includes('['), 'Historical-source field cannot supply the modern composition');
  return body;
}
// Frozen proof and source facts approve only these two references, not a generator.
function verifyAbstractNounReference(entry, dictionary, dictionaryFileHash) {
  const spec = ABSTRACT_NOUN_REFERENCES[entry.display], loc = entry.sourceLocator;
  assert.ok(spec, 'Unreviewed abstract reference');
  assert.equal(dictionaryFileHash, DICTIONARY_SHA);
  assert.equal(dictionary.source_sha256, DICTIONARY_SHA);
  assert.equal(dictionary.reference_url, DICTIONARY_URL);
  assert.equal(loc.sourceType, 'productive-abstract-noun-reference');
  assert.equal(loc.referenceFileSha256, DICTIONARY_SHA);
  assert.equal(loc.referencePdfPage, spec.proof.base.pdfPage);
  assert.equal(loc.referenceHeadword, spec.proof.base.headword);
  assert.equal(loc.attestedHeadword, null);
  assert.equal(entry.sourceUrl, `${DICTIONARY_URL}#page=${loc.referencePdfPage}`);
  assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(entry.sourceSpelling, spec.sourceSpelling);
  assert.equal(entry.meaningEn, spec.meaningEn); assert.equal(entry.meaningEs, spec.meaningEs);
  assert.equal(entry.partOfSpeech, 'abstract noun reference');
  assert.equal(entry.formKind, 'rule-composed-reference-form');
  assert.equal(entry.verification.formEvidence, 'independently-reviewed-rule-composition');
  assert.equal(entry.audioUrl, null); assert.equal(entry.audioKind, 'missing');
  assert.deepEqual(loc.abstractNounProof, spec.proof);
  const base = definition(dictionary, spec.proof.base.pdfPage, spec.proof.base.headword);
  assert.ok(new RegExp(`tlazal\\.\\s+${escapePattern(spec.proof.base.combiningStemMetadata)}\\.`, 'u').test(base), 'Missing unchanged modern combining stem');
  assert.ok(!/axcanah\s+motequihuia\s+icelti/u.test(base), 'Reviewed base is not a free modern noun');
  const modelBase = definition(dictionary, 260, 'IUCCILLI');
  assert.ok(/tlazal\.\s+iuccil-\./u.test(modelBase));
  const model = definition(dictionary, 260, 'IUCCILLŌTL');
  assert.ok(/achi\.\s+IUCCILLI,\s+YŌTL\./u.test(model), 'Missing exact l-stem suffix model decomposition');
  assert.ok(!/axcanah\s+motequihuia\s+icelti/u.test(model));
  const suffix = definition(dictionary, 630, 'YŌTL');
  assert.ok(/lōtl/u.test(suffix), 'Missing explicitly printed lōtl realization');
  assert.ok(/tlazal\.\s+yō-\./u.test(suffix), 'Missing exact nominalizer metadata');
}
module.exports = { verifyAbstractNounReference, ABSTRACT_NOUN_REFERENCES, DICTIONARY_URL, DICTIONARY_SHA };
