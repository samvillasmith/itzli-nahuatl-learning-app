const assert = require('node:assert/strict');
const { verifyReferenceFactLocator } = require('./reference-fact-locator');
const PDF_HASH = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const COURSE_HASH = '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f';
const ESCAPE = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RULES = [[0, 5], [2, 142], [2, 143], [2, 144], [2, 176]];
function definition(pages, page, head, pos) {
  const raw = pages.pages[page - 1]?.text; assert.equal(typeof raw, 'string');
  const match = new RegExp(`^${ESCAPE(head)}\\.\\s+${pos}\\.`, 'm').exec(raw); assert.ok(match, 'Missing exact governing head ' + head);
  const rest = raw.slice(match.index + match[0].length);
  const next = rest.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  return rest.slice(0, next < 0 ? undefined : next).replace(/\s+/g, ' ').trim();
}

// One reviewed third-singular human sadness state. Shared cuecihui evidence
// supports this allomorph; it does not approve general past-stem statives.
function verifyStateVerbFormProof(entry, pages, pdfHash, course, courseHash) {
  const loc = entry.sourceLocator, proof = loc.stateVerbProof;
  assert.equal(pdfHash, PDF_HASH); assert.equal(courseHash, COURSE_HASH);
  assert.equal(loc.sourceType, 'productive-state-verb-form');
  assert.equal(entry.formKind, 'rule-composed-state-verb'); assert.equal(entry.partOfSpeech, 'verb-form');
  assert.equal(entry.sourceSpelling, 'yōlcueciuhtoc'); assert.equal(entry.meaningEn, 'he/she is sad'); assert.equal(entry.meaningEs, 'él/ella está triste');
  assert.equal(entry.audioUrl, null); assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.sourceUrl, entry.sourceUrl); assert.equal(loc.authoredReferenceForm, entry.sourceSpelling);
  assert.equal(loc.referencePdfPage, 627); assert.equal(loc.referenceHeadword, 'YŌLCUECIHUI'); assert.equal(loc.referenceFileSha256, PDF_HASH);
  verifyReferenceFactLocator({ ...entry, sourceSpelling: 'yōlcuecihui', sourceLocator: { ...loc, sourceType: 'individual-reference-fact' } }, pages, pdfHash, value => value.toLowerCase());
  assert.equal(proof.construction, 'reviewed-shared-root-third-singular-current-state');
  assert.equal(proof.authoredReferenceForm, entry.sourceSpelling); assert.equal(proof.directWholeFormAttestationClaimed, false);
  assert.deepEqual(proof.modernStemEvidence, { referencePdfPage: 627, referenceHeadword: 'YŌLCUECIHUI', referenceFileSha256: PDF_HASH,
    sourceSpelling: 'yōlcuecihui', verbClass: '2', exactPastForm: 'yōlcueciuhqui', exactPastStem: 'yōlcueciuh', frame: 'ni',
    selectedSense: 'human-unhappiness-and-wanting-to-cry', derivationalReferences: ['YŌLLI', 'CUECIHUI'] });
  const sadness = definition(pages, 627, 'YŌLCUECIHUI', 'tlach2');
  assert.ok(sadness.startsWith('ni. Macehualli axcanah yolpaqui huan quinequi chocaz.'), 'Missing modern human sadness meaning');
  assert.ok(sadness.includes('panoc. yōlcueciuhqui.')); assert.ok(sadness.includes('achi. YŌLLI, CUECIHUI.'));
  const shared = proof.sharedRootModelEvidence;
  assert.deepEqual(shared, { referencePdfPage: 182, referenceHeadword: 'CUECIHUI', sourceSpelling: 'cuecihui', exactPastForm: 'cueciuhqui', exactPastStem: 'cueciuh',
    lessonNumber: 24, sectionIndex: 2, bodyIndex: 176, exactModelForm: 'Nicueciuhtoc', sharedVerbEnding: 'cuecihui', sourceImportSha256: COURSE_HASH, limitedToThisExplicitSharedRoot: true });
  assert.ok(definition(pages, 182, 'CUECIHUI', 'tlach2').includes('panoc. cueciuhqui.'), 'Missing exact shared-root allomorph');
  assert.deepEqual(proof.stateConstructionEvidence, [
    { referencePdfPage: 466, referenceHeadword: 'TI3', selectedSense: 1, exactPrintedMetadata: 'ti-, t-', selectedFunction: 'verbal-linker-with-i-deleted-before-O2', selectedAllomorph: 't' },
    { referencePdfPage: 356, referenceHeadword: 'O2', selectedSense: 3, selectedFunction: 'state-auxiliary-for-person-animal-or-thing', sourceAuxiliary: 'o', linkerReference: 'TI3' },
    { referencePdfPage: 357, referenceHeadword: 'OC', selectedSense: 2, selectedFunction: 'singular-stative-ending-linked-to-O2-and-C4', exactPrintedPluralMetadata: 'oqueh', sourceEnding: 'oc' },
    { referencePdfPage: 56, referenceHeadword: 'C4', selectedSense: 2, selectedFunction: 'quality-or-state-nominal-ending-not-past-tense-in-this-route', sourceEnding: 'c' },
  ]);
  const linker = definition(pages, 466, 'TI3', 'tlamotz');
  assert.ok(linker.includes('Quizaloa tlachihualiztli ica itlapalehuihca.'));
  assert.ok(linker.includes('TI3 quipoloa "i" quemman teipan yohui tlapalehuihquetl tlen ĒHUA1, IHCA huan O2.'));
  assert.ok(linker.includes('tlazal. ti-, t-.'));
  const auxiliary = definition(pages, 356, 'O2', 'tlach');
  assert.ok(auxiliary.includes('3. Tlapalehuihquetl. Motequihuia ica TI3. Itztoc macehualli, tecuani zo tlapiyalli zo eltoc tlamantli quennopa.'));
  const ending = definition(pages, 357, 'OC', 'tlat');
  assert.ok(ending.includes('2. Tlatzonpepecholli.'));
  assert.ok(ending.includes('miaq. oqueh.')); assert.ok(ending.includes('achi. O2, C4 (tlachiuhca.)'));
  const quality = definition(pages, 56, 'C4', 'tlaten');
  assert.ok(quality.includes('2. Motequihuia ica ome tlamantli tlachiuhcatlatocaxtiliztli:'));
  assert.ok(quality.includes('tlen quimanextia queniuhqui neci macehualli, tecuani, tlapiyalli zo tlamantli;'));
  assert.deepEqual(proof.stemAllomorph, { operation: 'use-exact-modern-stem-with-shared-root-state-model', exactPastForm: 'yōlcueciuhqui', removedPastEnding: 'qui', exactResult: 'yōlcueciuh' });
  assert.equal(proof.subjectPrefix, ''); assert.deepEqual(proof.subject, { person: 3, number: 'singular', animacy: 'human' });
  assert.equal(proof.objectPrefix, null); assert.equal(proof.object, null); assert.equal(proof.tense, 'present'); assert.equal(proof.aspect, 'state');
  assert.equal(proof.linker, 't'); assert.equal(proof.stateAuxiliary, 'o'); assert.equal(proof.singularStateEnding, 'c');
  assert.equal(entry.sourceSpelling, proof.subjectPrefix + proof.stemAllomorph.exactResult + proof.linker + proof.stateAuxiliary + proof.singularStateEnding);
  assert.deepEqual(proof.phonologicalChangesBeyondReviewedAllomorph, []);
  assert.equal(proof.generalizedStateGeneratorApproved, false); assert.equal(proof.medicalDiagnosisClaimed, false); assert.equal(proof.completedPastEventClaimed, false);
  assert.deepEqual(proof.grammarRuleLocators.map(rule => [rule.sectionIndex, rule.bodyIndex]), RULES);
  const lesson = course.lessons.find(item => item.number === 24); assert.ok(lesson);
  for (const rule of proof.grammarRuleLocators) {
    assert.equal(rule.lessonNumber, 24); assert.equal(rule.sourceImportSha256, COURSE_HASH); assert.equal(rule.sourceUrl, lesson.originalUrl);
    assert.equal(typeof lesson.sections[rule.sectionIndex]?.body[rule.bodyIndex], 'string');
  }
  assert.equal(lesson.sections[0].body[5], '/itztoc/ “to be in a place, to be in a certain state” (for human and animal subjects)');
  assert.equal(lesson.sections[2].body[142], 'Niitztoc “I am”'); assert.equal(lesson.sections[2].body[143], 'Tiitztoc “You are”');
  assert.equal(lesson.sections[2].body[144], 'Itztoc “She/he is”');
  assert.equal(lesson.sections[2].body[176], '¿Quīniuhqui tiitztoc? Niciauhtoc. Niyōlpactoc. Nicueciuhtoc. Nicualāntoc.');
}
module.exports = { verifyStateVerbFormProof };
