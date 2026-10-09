const assert = require('node:assert/strict');
const { verifyReferenceFactLocator } = require('./reference-fact-locator');

const PDF_HASH = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const COURSE_HASH = '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f';
const RULES = {
  icxitlan: [[0, 3], [2, 21], [3, 15]],
  tzintlan: [[0, 3], [2, 42], [2, 43]],
};

// Two reviewed hill-location expressions only. This gate does not approve a
// compound generator, noun substitutions, place names or finite sentences.
function verifyNominalFormProof(entry, pages, pdfHash, course, courseHash) {
  const loc = entry.sourceLocator, proof = loc.nominalProof;
  assert.equal(loc.sourceType, 'productive-nominal-form');
  assert.equal(entry.formKind, 'rule-composed-relational-form');
  assert.equal(entry.partOfSpeech, 'locative-expression');
  assert.equal(entry.audioUrl, null);
  assert.equal(pdfHash, PDF_HASH);
  assert.equal(courseHash, COURSE_HASH);
  assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.referencePdfPage, 456);
  assert.equal(loc.referenceHeadword, 'TEPĒTL');
  assert.equal(loc.referenceFileSha256, PDF_HASH);
  assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(loc.authoredReferenceForm, entry.sourceSpelling);
  assert.equal(proof.construction, 'noun-combining-base-plus-relational-term');
  assert.equal(proof.authoredReferenceForm, entry.sourceSpelling);
  assert.equal(proof.directWholeFormAttestationClaimed, false);
  assert.equal(proof.compositionNoStemChanges, true);
  assert.deepEqual(proof.phonologicalChangesInComposition, []);
  for (const field of ['possessorPrefix', 'subject', 'object', 'tense']) assert.equal(proof[field], null);
  assert.equal(proof.numberSuffix, '');
  assert.equal(proof.predicateAsserted, false);
  assert.equal(proof.generalizedNominalGeneratorApproved, false);
  assert.deepEqual(proof.nominalCombiningStemEvidence, {
    kind: 'explicit-combining-stem', referencePdfPage: 456,
    referenceHeadword: 'TEPĒTL', sourceStemSpelling: 'tepē',
    exactPrintedMetadata: 'tepē-', sourceExplicitStemMetadata: true,
    selectedSense: 'hill', referenceFileSha256: PDF_HASH,
  });
  const required = RULES[proof.relationalTerm];
  assert.ok(required, 'Unreviewed relational term');
  assert.equal(entry.sourceSpelling, 'tepē' + proof.relationalTerm, 'Composition changes the reviewed noun base');
  verifyReferenceFactLocator({ ...entry, sourceSpelling: 'tepētl',
    sourceLocator: { ...loc, sourceType: 'individual-reference-fact' } }, pages, pdfHash, value => value.toLowerCase());
  const pageText = pages.pages[455].text;
  const head = /^TEPĒTL\.\s+tlat\./m.exec(pageText);
  assert.ok(head, 'Missing exact modern noun head');
  const rest = pageText.slice(head.index + head[0].length);
  const next = rest.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  const definition = rest.slice(0, next < 0 ? undefined : next);
  assert.ok(definition.includes('Montoniuhtoc tlalli huan tetl ica huahcapan'), 'Missing reviewed modern hill meaning');
  assert.match(definition, /(?:^|\s)tlazal\.\s+tepē-\.(?=\s|$)/u, 'Missing exact combining metadata in the governing head');
  assert.deepEqual(proof.grammarRuleLocators.map(rule => [rule.sectionIndex, rule.bodyIndex]), required);
  const lesson = course.lessons.find(item => item.number === 23);
  assert.ok(lesson, 'Missing relational grammar lesson');
  for (const rule of proof.grammarRuleLocators) {
    assert.equal(rule.lessonNumber, 23);
    assert.equal(rule.sourceImportSha256, COURSE_HASH);
    assert.equal(rule.sourceUrl, lesson.originalUrl);
    assert.equal(typeof lesson.sections[rule.sectionIndex]?.body[rule.bodyIndex], 'string');
  }
  assert.ok(lesson.sections[0].body[3].includes('substantive and verbal bases'));
  assert.ok(lesson.sections[0].body[3].includes('attached directly to the relational terms'));
  if (proof.relationalTerm === 'icxitlan') {
    assert.equal(lesson.sections[2].body[21], 'icxitlan “at the feet of”');
    assert.equal(lesson.sections[3].body[15], 'icxitlan “at the feet of” (person, animal, or thing)');
    assert.equal(entry.meaningEn, 'at the hill’s foot');
    assert.equal(entry.meaningEs, 'al pie del cerro');
  } else {
    assert.equal(lesson.sections[2].body[42], '/-tzintlan/ “on the base of”');
    assert.equal(lesson.sections[2].body[43], 'nacaztzintlan “at the base of the ear”');
    assert.equal(entry.meaningEn, 'at the hill’s base');
    assert.equal(entry.meaningEs, 'en la base del cerro');
  }
}

module.exports = { verifyNominalFormProof };
