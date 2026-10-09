const assert = require('node:assert/strict');
const DICTIONARY_URL = 'https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf';
const DICTIONARY_SHA = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const NATIVE_URL = 'https://revistas-filologicas.unam.mx/tlalocan/index.php/tl/article/download/550/562/924';
const NATIVE_SHA = '7d9f6da17cbfeadb7da4bd2af0ff38fa4a90d6e52141d1d7852b73a34ffbb1cb';
const RULE_URL = 'https://scholars.sil.org/david_h_tuggy/es/publicaciones/nahuatl_lecciones/9';
const RULE_SHA = 'e6afc81ec4c7f81abc408bf184138a98a4d764e3e82dea29c8856b7e27f274b7';
const COURSE_SHA = '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f';
const HUMAN_FEEDING_PROOF = {
  kind: 'one-reviewed-human-causee-feeding-composition',
  lexicalModel: { headword: 'CUALTIĀ', pdfPage: 157, sourceFrame: 'nic', explicitComponents: ['CUĀ', 'LTIĀ'], selectedMeaning: 'make another human or animal eat or taste something', preservedCausativeComponent: 'cualtiā' },
  intransitiveBase: { headword: 'TLACUĀ', pdfPage: 488, sourceFrame: 'ni', explicitComponents: ['TLA1', 'CUĀ'], selectedMeaning: 'eat with unspecified food' },
  nativeValencyEvidence: { sourceUrl: NATIVE_URL, sourceFileSha256: NATIVE_SHA, community: 'Tzocohuite', varietyCode: 'nhe', varietyPdfPage: 3, mechanismPdfPage: 4, sourceForm: 'nitlakwa', analysis: 'TLA antipassive gives an intransitive eating base' },
  causativeValencyEvidence: { sourceUrl: RULE_URL, sourceFileSha256: RULE_SHA, variety: 'Modern Orizaba; independently documented valency comparison', section: '9.1', operation: 'the original intransitive subject becomes the causative direct object; preserve the lexically documented causal component' },
  personEvidence: { sourceImportSha256: COURSE_SHA, subjectLesson: 6, subjectSection: 1, subjectBody: 1, objectLesson: 13, objectSection: 2, objectBody: 2, subjectObjectOrderBody: 10, secondSingularOrderBody: 18 },
  composition: { subjectPrefix: 'ni', humanCauseePrefix: 'mitz', internalEatingPrefix: 'tla', causativeComponent: 'cualtiā', presentSingularSuffix: '', authoredReferenceForm: 'nimitztlacualtiā', learnerDisplay: 'nimitstlakwaltia', explicitFoodObjectNamed: false },
  directlyAttestedWholeFormClaimed: false, religiousOfferingSenseTransferredToHumanFeeding: false, unrestrictedCausativeGeneratorApproved: false, arbitraryAllomorphApproved: false, targetVerbClassOrParadigmCertified: false, pronunciationCertificationClaimed: false, sourceAudioClaimed: false, sourceProseOrExamplesCopied: false
};
const getPage = (s, n) => { const p = s.pages.find(p => p.pdf_page === n); assert.equal(typeof p?.text, 'string'); return p.text; };
function governed(page, head) { const m = new RegExp('^' + head + '\\. ', 'm').exec(page); assert.ok(m, 'Missing exact modern head'); const tail = page.slice(m.index + m[0].length); const end = tail.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlach\d|tlap\.|pil\.|Xiquitta)/mu); const body = tail.slice(0, end < 0 ? undefined : end); assert.ok(!body.includes('[')); assert.ok(!/axcanah\s+motequihuia\s+icelti/u.test(body)); return body; }
function verifyHumanFeedingForm(entry, dictionary, dictionaryHash, native, nativeHash, causativeHtml, causativeHash, course, courseHash) {
  assert.equal(dictionaryHash, DICTIONARY_SHA); assert.equal(dictionary.source_sha256, DICTIONARY_SHA); assert.equal(dictionary.reference_url, DICTIONARY_URL);
  assert.equal(nativeHash, NATIVE_SHA); assert.equal(native.source_sha256, NATIVE_SHA); assert.equal(native.reference_url, NATIVE_URL); assert.equal(causativeHash, RULE_SHA); assert.equal(courseHash, COURSE_SHA);
  const loc = entry.sourceLocator; assert.equal(loc.sourceType, 'productive-human-feeding-form'); assert.deepEqual(loc.humanFeedingProof, HUMAN_FEEDING_PROOF);
  assert.equal(loc.attestedHeadword, null); assert.equal(loc.referenceFileSha256, DICTIONARY_SHA); assert.equal(loc.referencePdfPage, 157); assert.equal(loc.referenceHeadword, 'CUALTIĀ');
  assert.equal(entry.sourceUrl, DICTIONARY_URL + '#page=157'); assert.equal(loc.sourceUrl, entry.sourceUrl); assert.equal(entry.sourceSpelling, 'nimitztlacualtiā'); assert.equal(entry.display, 'nimitstlakwaltia');
  assert.equal(entry.meaningEn, 'I make you eat; I feed you (modeled form)'); assert.equal(entry.meaningEs, 'te hago comer; te alimento (forma modelada)');
  assert.equal(entry.partOfSpeech, 'verb'); assert.equal(entry.formKind, 'rule-composed-verb-form'); assert.equal(entry.verification.formEvidence, 'qualified-reviewed-rule-composition'); assert.equal(entry.audioUrl, null); assert.equal(entry.audioKind, 'missing');
  const causal = governed(getPage(dictionary, 157), 'CUALTIĀ'), base = governed(getPage(dictionary, 488), 'TLACUĀ');
  assert.ok(/^tlach3\. nic\./u.test(causal)); assert.ok(/achi\.\s+CUĀ,\s+LTIĀ\./u.test(causal)); assert.ok(causal.includes('ceyoc zo') && causal.includes('tlapiyalli'));
  assert.ok(/^tlach4\. ni\./u.test(base)); assert.ok(/achi\.\s+TLA1,\s+CUĀ\./u.test(base));
  const nativeRule = getPage(native, 4), provenance = getPage(native, 3); assert.ok(provenance.includes('[nhe]')); assert.ok(provenance.toLowerCase().includes('tzocohuite'));
  assert.ok(nativeRule.includes('antipasivo') && nativeRule.includes('intransitiva') && nativeRule.includes('nitlakwa'));
  const rule = causativeHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.ok(causativeHtml.includes('href="' + RULE_URL + '"')); assert.ok(rule.includes('9.1 Causativos')); assert.ok(rule.includes('Nawatl de Orizaba'));
  assert.ok(rule.includes('sujeto de la raíz verbal queda como objeto directo')); assert.ok(rule.includes('-ltia'));
  const subject = course.lessons.find(l => l.number === 6), object = course.lessons.find(l => l.number === 13);
  assert.equal(subject.sections[1].body[1], 'ni – (verbal base) – ø');
  assert.equal(object.sections[2].body[2], '/mītz/ “to you”'); assert.equal(object.sections[2].body[10], 'Ni – qui – (base verbal) – ø'); assert.equal(object.sections[2].body[18], 'ø – Mitz – (base verbal) – ø');
  assert.equal(HUMAN_FEEDING_PROOF.composition.authoredReferenceForm, 'ni' + 'mitz' + 'tla' + 'cualtiā');
}
module.exports = { verifyHumanFeedingForm, HUMAN_FEEDING_PROOF, DICTIONARY_URL, DICTIONARY_SHA, NATIVE_URL, NATIVE_SHA, RULE_URL, RULE_SHA, COURSE_SHA };
