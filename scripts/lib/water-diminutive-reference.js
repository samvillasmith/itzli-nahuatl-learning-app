const assert = require('node:assert/strict');
const DICTIONARY_SHA = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const COURSE_SHA = '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f';
const INE_SHA = '8a18deb6de8e7e0022ee5494bc10aa1f2ab03fe617aa25d16f96a81fc023e665';
const DICTIONARY_URL = 'https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf';
const INE_URL = 'https://ine.mx/wp-content/uploads/2024/08/Deceyec-el_tejido_de_nuestras_voces.pdf';
const WATER_DIMINUTIVE_PROOF = {
  kind: 'one-model-constrained-bare-water-diminutive-reference',
  composition: { nounBase: 'ā', diminutiveSuffix: 'tzin', authoredReferenceForm: 'ātzin', learnerDisplay: 'atsin',
    stemChanges: [], pilPrefix: null, subject: null, possessor: null, object: null, tense: null, predicateClaimed: false },
  nounEvidence: { sourceFileSha256: DICTIONARY_SHA, referenceHeadword: 'ĀTL', headwordPdfPage: 45, stemMetadataPdfPage: 46,
    exactPrintedCombiningMetadata: 'ā-, āl-', selectedExactBase: 'ā', selectedMeaning: 'water' },
  suffixEvidence: { sourceFileSha256: DICTIONARY_SHA, referenceHeadword: 'TZIN', referencePdfPage: 579,
    selectedMeaning: 'smallness', sourcePilStatementRetainedAsRegionalQualification: true,
    sourceRespectMeaningAutomaticallyApplied: false, exactAttachmentModel: 'pilpiyotzin' },
  licensedModels: { sourceImportSha256: COURSE_SHA, lessonNumber: 20,
    bareSingular: { sectionIndex: 1, bodyIndex: 33, sourceForm: 'Tlapiyaltzin' },
    barePersonForm: { sectionIndex: 1, bodyIndex: 32, sourceForm: 'Titlapiyaltzin' },
    waterModel: { sectionIndex: 2, bodyIndex: 7, sourceForm: 'pilātzin', sharedSequence: 'ātzin', quotedSourceFormModifiedByDeletingPil: false },
    malformedParadigmCellUsed: false, entireParadigmApproved: false },
  nativeAssociatedBareWord: { sourceUrl: INE_URL, sourceFileSha256: INE_SHA, referencePdfPage: 38,
    exactSourceForm: 'etsin', referenceTextStart: 1089, independentlyProvenDiminutiveSemanticsClaimed: false },
  authoredModelReferenceOnly: true, directlyAttestedChicontepecBareWaterUseClaimed: false,
  easternRespectfulWaterUseCertified: false, quantitativeRequestMeaningClaimed: false,
  generalOptionalPilRuleClaimed: false, generalDiminutiveGeneratorApproved: false, universalPolitenessRuleClaimed: false,
  recordedSourceAudioClaimed: false, pronunciationCertificationClaimed: false,
  proofSha256: '4f8c87bb0be9465122c034024c2d8148633922bab61fcd7ffe3e41212b44e999',
  peerReviewSha256: 'c57bb7d3eb1ecc5b34ea8f473994b9146929bb2ebea5af97ceaec59c18c59cc7'
};
const page = (source, number) => { const item = source.pages.find(x => x.pdf_page === number); assert.equal(typeof item?.text, 'string'); return item.text; };

// Exactly one bounded reference is reviewed. Actual source PIL restrictions and
// imperfect paradigm cells are preserved; neither a universal optional-PIL rule
// nor an attested Eastern respectful utterance is inferred.
function verifyWaterDiminutiveReference(entry, dictionary, dictionaryHash, course, courseHash, ine, ineHash) {
  assert.equal(dictionaryHash, DICTIONARY_SHA); assert.equal(dictionary.source_sha256, DICTIONARY_SHA);
  assert.equal(dictionary.reference_url, DICTIONARY_URL); assert.equal(courseHash, COURSE_SHA);
  assert.equal(ineHash, INE_SHA); assert.equal(ine.source_sha256, INE_SHA); assert.equal(ine.reference_url, INE_URL);
  const loc = entry.sourceLocator;
  assert.equal(loc.sourceType, 'productive-water-diminutive-reference'); assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.referenceFileSha256, DICTIONARY_SHA); assert.equal(loc.referencePdfPage, 45); assert.equal(loc.referenceHeadword, 'ĀTL');
  assert.equal(entry.sourceUrl, DICTIONARY_URL + '#page=45'); assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(entry.sourceSpelling, 'ātzin'); assert.equal(entry.display, 'atsin');
  assert.equal(entry.meaningEn, 'water (diminutive reference)'); assert.equal(entry.meaningEs, 'agua (referencia diminutiva)');
  assert.equal(entry.formKind, 'rule-composed-reference-form'); assert.equal(entry.partOfSpeech, 'noun reference');
  assert.equal(entry.verification.formEvidence, 'bounded-model-composition'); assert.equal(entry.audioUrl, null); assert.equal(entry.audioKind, 'missing');
  assert.deepEqual(loc.waterDiminutiveProof, WATER_DIMINUTIVE_PROOF);
  assert.ok(page(dictionary, 45).includes('ĀTL. tlat.'));
  assert.ok(page(dictionary, 46).includes('tlazal. ā-, āl-.'));
  const suffix = page(dictionary, 579);
  assert.ok(/(?:^|\n)TZIN\.\s+tlat\./u.test(suffix));
  assert.ok(suffix.includes('Motequihuia ica tlatzinpepecholli PĪL'), 'Retain the actual regional/source restriction');
  assert.ok(suffix.includes('tlen cuecuetztzin') && suffix.includes('pilpiyotzin'));
  const lesson = course.lessons.find(x => x.number === 20); assert.ok(lesson);
  assert.equal(lesson.sections[1].body[33], 'Tlapiyaltzin “She/he is a little domesticated animal”');
  assert.equal(lesson.sections[1].body[32], 'Titlapiyaltzin “You are a little domesticated animal”');
  assert.equal(lesson.sections[2].body[7], 'pilātzin “honored water”');
  const beanPage = page(ine, 38);
  assert.equal(beanPage.slice(1089, 1094), 'etsin');
}
module.exports = { verifyWaterDiminutiveReference, WATER_DIMINUTIVE_PROOF, DICTIONARY_SHA, COURSE_SHA, INE_SHA, DICTIONARY_URL, INE_URL };
