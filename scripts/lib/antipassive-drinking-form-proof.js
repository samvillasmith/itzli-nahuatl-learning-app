const assert = require('node:assert/strict');
const DICTIONARY_SHA = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const HIDALGO_SHA = 'c5f6de7e12a2e3d505f03a66e3db83a26c7c3c8a564eb6dd8e73c2f597e4febf';
const RULE_SHA = '7d9f6da17cbfeadb7da4bd2af0ff38fa4a90d6e52141d1d7852b73a34ffbb1cb';
const COURSE_SHA = '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f';
const DICTIONARY_URL = 'https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf';
const HIDALGO_URL = 'https://dgeiib.basica.sep.gob.mx/files/fondo-editorial/materiales-apoyo-didactico/mad_00049.pdf';
const RULE_URL = 'https://revistas-filologicas.unam.mx/tlalocan/index.php/tl/article/download/550/562/924';
const ANTIPASSIVE_DRINKING_PROOF = {
  kind: 'one-qualified-modern-Huasteca-antipassive-drinking-form',
  composition: { subjectPrefix: 'ni', internalPrefix: 'tla', selectedDependentComponent: 'ī',
    authoredReferenceForm: 'nitlaī', learnerDisplay: 'nitlai', subject: { person: 1, number: 'singular' },
    tense: 'present', numberSuffix: '', stemChanges: [], specificObjectPrefix: null },
  lexicalScope: { sourceUrl: HIDALGO_URL, sourceFileSha256: HIDALGO_SHA, referencePdfPage: 79, exactSourceBase: 'tlai',
    selectedMeaning: 'drink alcohol', printedPos: 'vb. t.', independentlySuppliedNiFrameClaimed: false },
  modernComponentEvidence: { sourceFileSha256: DICTIONARY_SHA, completeHeadword: 'ĀTLĪ', completeHeadwordPdfPage: 46,
    completeSourceFrame: 'ni', exactComponents: ['ĀTL', 'Ī3'], dependentHeadword: 'Ī3', dependentHeadwordPdfPage: 230,
    historicalSpecificObjectCitation: '[Mc. 22r]', independentlyAttestedModernFreeNiquiFrameClaimed: false },
  mechanismEvidence: { sourceUrl: RULE_URL, sourceFileSha256: RULE_SHA, varietyPdfPage: 3, mechanismPdfPage: 4,
    community: 'Tzocohuite', varietyCode: 'nhe', mechanism: 'tla antipassive/valency reduction',
    independentlyAttestedTzocohuiteTlaiLexemeClaimed: false },
  subjectEvidence: { sourceImportSha256: COURSE_SHA, lessonNumber: 6,
    locators: [{ sectionIndex: 0, bodyIndex: 1 }, { sectionIndex: 1, bodyIndex: 1 }, { sectionIndex: 1, bodyIndex: 8 }] },
  qualifiedMixedSourceReference: true, alcoholOnlyMeaning: true, broaderPlainDrinkingApproved: false,
  directWholeFormAttestationClaimed: false, generalAntipassiveGeneratorApproved: false,
  pronunciationCertificationClaimed: false, recordedSourceAudioClaimed: false,
  proofSha256: '121446a1bf971866f0114eac6ad326fc8577d447677d6a127663bdcfd093b5e0',
  peerReviewSha256: '61e3fd548e22b5ddda92f72bad139428bbf82162313cd462c38ff62052c596a0'
};
const page = (source, number) => { const item = source.pages.find(x => x.pdf_page === number); assert.equal(typeof item?.text, 'string'); return item.text; };

// Only this separately reviewed, qualified alcohol-reference composition is approved.
// The historical niqu definition is retained as historical evidence, never promoted
// to a modern free-base frame or an unrestricted Eastern drinking paradigm.
function verifyAntipassiveDrinkingForm(entry, dictionary, dictionaryHash, hidalgo, hidalgoHash, mechanism, mechanismHash, course, courseHash) {
  assert.equal(dictionaryHash, DICTIONARY_SHA); assert.equal(dictionary.source_sha256, DICTIONARY_SHA);
  assert.equal(dictionary.reference_url, DICTIONARY_URL);
  assert.equal(hidalgoHash, HIDALGO_SHA); assert.equal(hidalgo.source_sha256, HIDALGO_SHA); assert.equal(hidalgo.reference_url, HIDALGO_URL);
  assert.equal(mechanismHash, RULE_SHA); assert.equal(mechanism.source_sha256, RULE_SHA); assert.equal(mechanism.reference_url, RULE_URL);
  assert.equal(courseHash, COURSE_SHA);
  const loc = entry.sourceLocator;
  assert.equal(loc.sourceType, 'productive-antipassive-drinking-form'); assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.referenceFileSha256, HIDALGO_SHA); assert.equal(loc.referencePdfPage, 79);
  assert.equal(entry.sourceUrl, HIDALGO_URL + '#page=79'); assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(entry.sourceSpelling, 'nitlaī'); assert.equal(entry.display, 'nitlai');
  assert.equal(entry.meaningEn, 'I drink alcohol'); assert.equal(entry.meaningEs, 'bebo alcohol');
  assert.equal(entry.partOfSpeech, 'verb'); assert.equal(entry.formKind, 'rule-composed-verb-form');
  assert.equal(entry.verification.formEvidence, 'qualified-reviewed-rule-composition'); assert.equal(entry.audioUrl, null); assert.equal(entry.audioKind, 'missing');
  assert.deepEqual(loc.antipassiveDrinkingProof, ANTIPASSIVE_DRINKING_PROOF);
  const lexical = page(hidalgo, 79);
  assert.ok(/(?:^|\n)tlai\.\s+vb\.\s+t\./u.test(lexical), 'Keep the source transitive POS');
  assert.ok(lexical.includes('bebida alcohólica'), 'The lexical scope is alcohol only');
  const modernWater = page(dictionary, 46);
  assert.ok(modernWater.includes('ĀTLĪ. tlach1. ni.'));
  assert.ok(modernWater.includes('achi. ĀTL, Ī3.'));
  const dependent = page(dictionary, 230);
  assert.ok(dependent.includes('Ī3. tlach1. ĀTLĪ huan ONĪ iyollo: axcanah motequihuia icelti.'));
  assert.ok(dependent.includes('[Mc. 22r]'), 'Retain the historical source-frame distinction');
  const variety = page(mechanism, 3), rule = page(mechanism, 4);
  assert.ok(variety.includes('[nhe]') && variety.toLowerCase().includes('huasteca oriental') && variety.toLowerCase().includes('tzocohuite'));
  assert.ok(rule.includes('antipasivo') && rule.includes('intransitiva') && rule.includes('nitlakwa'));
  const lesson = course.lessons.find(x => x.number === 6); assert.ok(lesson);
  assert.equal(lesson.sections[1].body[1], 'ni – (verbal base) – ø');
  assert.ok(lesson.sections[0].body[1].includes('present tense') && lesson.sections[0].body[1].includes('singular'));
  assert.ok(lesson.sections[1].body[8].includes('I am from'));
}
module.exports = { verifyAntipassiveDrinkingForm, ANTIPASSIVE_DRINKING_PROOF, DICTIONARY_SHA, HIDALGO_SHA, RULE_SHA, COURSE_SHA, DICTIONARY_URL, HIDALGO_URL, RULE_URL };
