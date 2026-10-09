const assert = require('node:assert/strict');
const DICTIONARY_URL = 'https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf';
const DICTIONARY_SHA = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const RULE_URL = 'https://scholars.sil.org/david_h_tuggy/es/publicaciones/nahuatl_lecciones/10';
const RULE_SHA = '3d72a2266875acbce7b6685bf2eb0d1486e7088a3bf76bfaa30b19f83b0b2dbe';
const base = { mechanismReference: { sourceUrl: RULE_URL, sourceFileSha256: RULE_SHA, variety: 'Modern Orizaba Nahuatl; structural comparison only' }, directWholeFormAttestationClaimed: false, unrestrictedGeneratorApproved: false, arbitraryAllomorphApproved: false, completeStandaloneUtteranceClaimed: false, fullParadigmApproved: false, pronunciationCertificationClaimed: false, recordedSourceAudioClaimed: false, sourceProseOrExamplesCopied: false };
const MODERN_COMPOUND_PROOFS = {
  studentHouse: { ...base, kind: 'one-reviewed-student-house-nominal-composition', dictionaryComponents: [{ headword: 'MOMACHTIHQUĒTL', pdfPage: 332, combiningStem: 'momachtihcā-', selectedMeaning: 'student' }, { headword: 'CALLI', pdfPage: 68, selectedMeaning: 'house' }], ruleSection: '10.1', relation: 'first nominal component modifies the house head; precise ownership, school and residence function are not certified', composition: { firstCombiningStem: 'momachtihcā', secondNominalHead: 'calli', authoredReferenceForm: 'momachtihcācalli', learnerDisplay: 'momachtihkakalli' }, hDeletionRuleClaimed: false, lexicalizedSchoolSenseClaimed: false, studentOwnershipOrDormitoryClaimed: false },
  waterFalls: { ...base, kind: 'one-reviewed-water-subject-incorporation', dictionaryComponents: [{ headword: 'ĀTL', pdfPage: 45, combiningStem: 'ā-', selectedMeaning: 'water' }, { headword: 'HUETZI', pdfPage: 218, selectedSense: 2, selectedMeaning: 'something falls down from above' }], ruleSection: '10.2.1', subjectIncorporationModel: 'a-kalaki', composition: { incorporatedSubjectStem: 'ā', intransitiveVerb: 'huetzi', subjectPrefix: '', authoredReferenceForm: 'āhuetzi', learnerDisplay: 'awetsi' }, humanSubjectClaimed: false, weatherTlaRemovalRuleClaimed: false, independentlyAttestedRainSenseClaimed: false },
  fearfulSpeaking: { ...base, kind: 'one-reviewed-fear-modified-speaking-reference', dictionaryComponents: [{ headword: 'TLAHTOĀ', pdfPage: 500, sourceFrame: 'ni', selectedSense: 2, selectedMeaning: 'speak a language' }], ruleSection: '10.2.3', fearModel: { citation: 'ni-mawi', combiningModel: 'ni-mah-ka-tzahtzi', modelCombiningStem: 'mah-ka', interpretation: 'fear modifies the second verbal action' }, composition: { fearCombiningStem: 'mahca', secondVerb: 'tlahtoā', authoredReferenceForm: 'mahcatlahtoā', learnerDisplay: 'mahkatlahtoa' }, wToHRewriteClaimed: false, contemporaryEasternWholeWordClaimed: false }
};
const labels = {
  studentHouse: ['momachtihcācalli', 'momachtihkakalli', 'student house (modeled noun)', 'casa de estudiante (sustantivo modelado)', 'noun reference', 'rule-composed-reference-form', 332, 'MOMACHTIHQUĒTL'],
  waterFalls: ['āhuetzi', 'awetsi', 'water falls (modeled verb)', 'cae agua (verbo modelado)', 'subject-incorporated verb reference', 'rule-composed-reference-form', 45, 'ĀTL'],
  fearfulSpeaking: ['mahcatlahtoā', 'mahkatlahtoa', 'speak fearfully (verb reference)', 'hablar con miedo (referencia verbal)', 'manner-modified verb reference', 'rule-composed-reference-form', 500, 'TLAHTOĀ']
};
function definition(dictionary, pageNumber, headword) {
  const page = dictionary.pages.find(p => p.pdf_page === pageNumber); assert.ok(page);
  const start = page.text.indexOf('\n' + headword + '. ');
  const leading = page.text.startsWith(headword + '. ');
  const index = start < 0 && leading ? 0 : start + 1;
  assert.ok(start >= 0 || leading, 'Missing exact governing modern head');
  const tail = page.text.slice(index + headword.length + 2);
  const end = tail.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach\d|Xiquitta)/mu);
  let body = tail.slice(0, end < 0 ? undefined : end);
  if (end < 0) {
    const nextPage = dictionary.pages.find(p => p.pdf_page === pageNumber + 1);
    assert.ok(nextPage, 'Missing continuation page');
    const continuation = nextPage.text.slice(nextPage.text.indexOf('\n') + 1);
    const nextHead = continuation.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach\d|Xiquitta)/mu);
    body += '\n' + continuation.slice(0, nextHead < 0 ? undefined : nextHead);
  }
  assert.ok(!body.includes('['), 'Historical definition cannot supply the selected modern component');
  assert.ok(!/axcanah\s+motequihuia\s+icelti/u.test(body), 'Dependent definition cannot supply complete component');
  return body;
}
function verifyReviewedModernCompound(entry, dictionary, dictionaryFileHash, ruleHtml, ruleFileHash) {
  assert.equal(dictionaryFileHash, DICTIONARY_SHA); assert.equal(dictionary.source_sha256, DICTIONARY_SHA); assert.equal(dictionary.reference_url, DICTIONARY_URL);
  assert.equal(ruleFileHash, RULE_SHA);
  const loc = entry.sourceLocator, key = Object.keys(MODERN_COMPOUND_PROOFS).find(k => MODERN_COMPOUND_PROOFS[k].kind === loc.modernCompoundProof?.kind);
  assert.ok(key, 'Unreviewed modern compound');
  assert.deepEqual(loc.modernCompoundProof, MODERN_COMPOUND_PROOFS[key]);
  const [spelling, display, en, es, pos, form, page, head] = labels[key];
  assert.equal(loc.sourceType, 'productive-reviewed-modern-compound'); assert.equal(loc.referenceFileSha256, DICTIONARY_SHA);
  assert.equal(entry.sourceSpelling, spelling); assert.equal(entry.display, display); assert.equal(entry.meaningEn, en); assert.equal(entry.meaningEs, es);
  assert.equal(entry.partOfSpeech, pos); assert.equal(entry.formKind, form); assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.referencePdfPage, page); assert.equal(loc.referenceHeadword, head); assert.equal(entry.sourceUrl, DICTIONARY_URL + '#page=' + page); assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(entry.verification.formEvidence, 'qualified-reviewed-rule-composition'); assert.equal(entry.audioUrl, null); assert.equal(entry.audioKind, 'missing');
  const text = ruleHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  assert.ok(ruleHtml.includes('href="' + RULE_URL + '"')); assert.ok(text.includes('Nawatl de Orizaba'));
  if (key === 'studentHouse') {
    const student = definition(dictionary, 332, 'MOMACHTIHQUĒTL');
    assert.ok(/tlazal\.\s+momachtihcā-\./u.test(student)); definition(dictionary, 68, 'CALLI');
    assert.ok(text.includes('10.1 Raíces compuestas sustantivas')); assert.ok(text.includes('S 1 + S 2 = S;'));
    assert.ok(text.includes('absolutivos')); assert.ok(text.includes('segunda raíz componente'));
    assert.equal(spelling, 'momachtihcā' + 'calli');
  } else if (key === 'waterFalls') {
    assert.ok(/tlazal\.\s+ā-,\s+āl-\./u.test(definition(dictionary, 45, 'ĀTL')));
    const fall = definition(dictionary, 218, 'HUETZI'); assert.ok(/tlach2\.\s+1\./u.test(fall)); assert.ok(/2\. Ce tlenhueli/u.test(fall));
    assert.ok(text.includes('10.2.1 La incorporación de sustantivos')); assert.ok(text.includes('Suj + V = V'));
    assert.ok(text.includes('a-kalaki')); assert.ok(text.includes('intransitivas')); assert.ok(text.includes('prefijo de sujeto u objeto'));
    assert.equal(spelling, 'ā' + 'huetzi');
  } else {
    const speech = definition(dictionary, 500, 'TLAHTOĀ'); assert.ok(/2\. ni\./u.test(speech));
    assert.ok(text.includes('10.2.3 Incorporación de verbos')); assert.ok(/V \+ -ka\s*- \+ V = V/u.test(text));
    assert.ok(text.includes('ni-mawi')); assert.ok(text.includes('ni-mah-ka-tzahtzi'));
    assert.equal(spelling, 'mahca' + 'tlahtoā');
  }
  return key;
}
module.exports = { verifyReviewedModernCompound, MODERN_COMPOUND_PROOFS, DICTIONARY_URL, DICTIONARY_SHA, RULE_URL, RULE_SHA };
