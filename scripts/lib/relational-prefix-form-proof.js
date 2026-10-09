const assert = require('node:assert/strict');
const { verifyReferenceFactLocator } = require('./reference-fact-locator');
const PDF_SHA = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const COURSE_SHA = '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f';

// A single literal base-location composition. This does not generalize the
// dictionary's tree-base context to a human anatomical meaning.
function verifyRelationalPrefixFormProof(entry, pages, pdfHash, course, courseHash) {
  const loc = entry.sourceLocator, proof = loc.referenceStemEvidence, rule = loc.grammarRuleLocator;
  assert.equal(loc.sourceType, 'productive-reference-form');
  assert.equal(entry.sourceSpelling, 'notzintlan');
  assert.equal(entry.display, 'notsintlan');
  assert.equal(entry.meaningEn, 'at my base (relational expression)');
  assert.equal(entry.meaningEs, 'en mi base (expresión relacional)');
  assert.equal(entry.formKind, 'relational-reference-form');
  assert.equal(entry.partOfSpeech, 'relational-location');
  assert.equal(entry.verification.formEvidence, 'independently-reviewed-rule-composition');
  assert.equal(entry.audioUrl, null);
  assert.equal(entry.audioKind, 'missing');
  assert.equal(loc.attestedHeadword, null, 'Composed form must not claim direct attestation');
  assert.equal(loc.authoredReferenceForm, 'notzintlan');
  assert.equal(loc.possessorPrefix, 'no');
  assert.equal(loc.referencePossessedStem, 'tzintlan');
  assert.equal(loc.referencePdfPage, 584);
  assert.equal(loc.componentHeadwordPdfPage, 584);
  assert.equal(loc.referenceHeadword, 'TZĪNTLAN');
  assert.equal(loc.referenceFileSha256, PDF_SHA);
  assert.equal(pages.source_sha256, PDF_SHA);
  assert.equal(pdfHash, PDF_SHA);
  assert.equal(courseHash, COURSE_SHA);
  assert.equal(proof.kind, 'attested-relational-prefix-substitution');
  assert.equal(proof.attestedPrefix, 'i');
  assert.equal(proof.authoredPrefix, 'no');
  assert.equal(proof.attestedForm, 'itzintlan');
  assert.equal(proof.inferredStemByDocumentedPrefixRemoval, 'tzintlan');
  assert.equal(proof.referencePdfPage, 584);
  assert.equal(proof.referenceHeadwordPdfPage, 584);
  assert.equal(proof.referenceHeadword, 'TZĪNTLAN');
  assert.equal(proof.referenceTextStart, 4009);
  assert.equal(proof.selectedSourceFrame, 'i');
  assert.equal(proof.selectedMeaning, 'literal-base-location');
  for (const field of ['stemOrSuffixChanged', 'completeStandaloneUtteranceClaimed', 'anatomicalButtockSenseApproved', 'generalRelationalParadigmApproved']) assert.equal(proof[field], false);
  assert.ok(pages.pages[583].text.slice(3900).startsWith('TZĪNTLAN. tlap. i.'), 'Missing modern i-frame relational head');

  // The exact documented i-form belongs to this modern relational head.
  verifyReferenceFactLocator({ ...entry, sourceSpelling: proof.attestedForm,
    sourceLocator: { ...loc, sourceType: 'individual-reference-form', referenceHeadwordPdfPage: 584, referenceTextStart: 4009 } },
  pages, pdfHash, value => value.toLowerCase());

  const lesson = course.lessons.find(l => l.number === 23);
  assert.equal(rule.sourceImportSha256, COURSE_SHA);
  assert.equal(rule.lessonNumber, 23);
  assert.equal(rule.sourceUrl, lesson.originalUrl);
  assert.equal(rule.sectionIndex, 0);
  assert.deepEqual(rule.bodyIndices, [1]);
  assert.equal(lesson.sections[0].body[1], 'First, with prefixes for possessed nouns (no-, mo-, i-, to-, inmo-, inin-), as well as “tē-“, “tla-” and “ø”. For example:');
  assert.deepEqual(rule.exactBaseLocator, { sectionIndex: 2, bodyIndex: 42 });
  assert.equal(lesson.sections[2].body[42], '/-tzintlan/ “on the base of”');
  const noMeaning = rule.meaningEvidence.noPrefix;
  const l8 = course.lessons.find(l => l.number === 8);
  assert.deepEqual(noMeaning, { sourceUrl: l8.originalUrl, lessonNumber: 8, sectionIndex: 0, bodyIndex: 2 });
  assert.equal(l8.sections[0].body[2], 'no – conē – uh “my child”');
  return true;
}

module.exports = { verifyRelationalPrefixFormProof, PDF_SHA, COURSE_SHA };
