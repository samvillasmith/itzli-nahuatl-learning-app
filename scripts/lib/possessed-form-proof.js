const assert = require('node:assert/strict');
const { verifyReferenceFactLocator } = require('./reference-fact-locator');
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Limited to one reviewed possessed base and documented possessor prefix.
 * This is a publication proof, not a general inflection generator. */
function verifyPossessedFormProof(entry, pages, pdfHash, course, courseHash) {
  const loc = entry.sourceLocator, proof = loc.referenceStemEvidence;
  assert.equal(loc.sourceType, 'productive-reference-form');
  assert.ok(['no', 'i'].includes(loc.possessorPrefix));
  assert.equal(loc.attestedHeadword, null, 'Composed form must not claim direct attestation');
  assert.equal(loc.authoredReferenceForm, entry.sourceSpelling);
  assert.equal(entry.verification.formEvidence, 'independently-reviewed-rule-composition');
  assert.equal(entry.formKind, 'rule-composed-possessed-form');
  assert.equal(entry.audioUrl, null);
  assert.equal(loc.referencePdfPage, loc.componentHeadwordPdfPage);

  // Verify the source head and file before reading its possessed metadata.
  const headEntry = { ...entry, sourceSpelling: loc.referenceHeadword.replace(/[1-9]$/, ''),
    sourceLocator: { ...loc, sourceType: 'individual-reference-fact' } };
  verifyReferenceFactLocator(headEntry, pages, pdfHash, value => value.toLowerCase());
  const text = pages.pages[loc.referencePdfPage - 1].text;
  const start = text.search(new RegExp(`^${escapePattern(loc.referenceHeadword)}\\.\\s+(?:tlat\\.|tlap\\.|pil\\.|tlach(?:\\d(?:/\\d)?)?\\.)`, 'm'));
  const following = text.slice(start + loc.referenceHeadword.length + 1);
  const next = following.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  const definition = text.slice(start, next === -1 ? text.length : start + loc.referenceHeadword.length + 1 + next);
  let base;
  if (['explicit-possessed-stem', 'explicit-possessed-plural-stem'].includes(proof.kind)) {
    assert.equal(loc.possessorPrefix, 'no');
    assert.equal(proof.referencePdfPage, loc.referencePdfPage);
    assert.equal(proof.referenceHeadword, loc.referenceHeadword);
    assert.equal(proof.sourceExplicitStemMetadata, true);
    assert.equal(proof.exactPrintedMetadata, loc.referencePossessedStem);
    assert.match(loc.referencePossessedStem, /^-\S+$/u);
    const field = proof.kind === 'explicit-possessed-plural-stem' ? 'miaq' : 'tlaaxca';
    assert.ok(new RegExp(`\\b${field}\\.\\s+${escapePattern(proof.exactPrintedMetadata)}(?![\\p{L}\\p{M}])`, 'u')
      .test(definition), 'Possessed allomorph is not in the selected source metadata');
    base = loc.referencePossessedStem.slice(1);
  } else {
    assert.equal(proof.kind, 'attested-possessive-prefix-substitution');
    assert.equal(proof.sourceExplicitStemMetadata, false);
    assert.ok(['no', 'i', 'inin'].includes(proof.attestedPrefix));
    assert.equal(proof.authoredPrefix, loc.possessorPrefix);
    assert.notEqual(proof.attestedPrefix, proof.authoredPrefix);
    assert.ok(proof.attestedForm.startsWith(proof.attestedPrefix));
    base = proof.attestedForm.slice(proof.attestedPrefix.length);
    assert.equal(base, proof.inferredStemByDocumentedPrefixRemoval);
    assert.equal(base, loc.referencePossessedStem);
    const bodyPage = proof.referencePdfPage;
    const bodyUrl = new URL(entry.sourceUrl); bodyUrl.hash = `page=${bodyPage}`;
    verifyReferenceFactLocator({ ...entry, sourceSpelling: proof.attestedForm, sourceUrl: bodyUrl.href,
      sourceLocator: { ...loc, sourceType: 'individual-reference-form',
        referencePdfPage: bodyPage, referenceHeadword: proof.referenceHeadword,
        referenceHeadwordPdfPage: proof.referenceHeadwordPdfPage ?? loc.componentHeadwordPdfPage,
        referenceTextStart: proof.referenceTextStart } },
    pages, pdfHash, value => value.toLowerCase());
  }
  assert.equal(entry.sourceSpelling, loc.possessorPrefix + base, 'Composition changes the reviewed base');

  const rule = loc.grammarRuleLocator;
  assert.equal(rule.sourceImportSha256, courseHash);
  assert.equal(rule.lessonNumber, 8);
  const lesson = course.lessons.find(item => item.number === 8);
  assert.equal(rule.sourceUrl, lesson.originalUrl);
  assert.equal(rule.sectionIndex, 1);
  assert.ok(rule.bodyIndices.includes(1) && rule.bodyIndices.includes(9));
  assert.equal(lesson.sections[1].body[1], 'no – (substantive base) – ø /uh /hui');
  assert.equal(lesson.sections[1].body[9], 'noconēuh “my child”');
  assert.deepEqual(rule.meaningEvidence.noPrefix.introduction, { sectionIndex: 0, bodyIndex: 2 });
  assert.equal(lesson.sections[0].body[2], 'no – conē – uh “my child”');
  assert.deepEqual(rule.meaningEvidence.noPrefix.translatedWordTable, { sectionIndex: 1, bodyIndex: 9 });
  if (proof.kind === 'attested-possessive-prefix-substitution') {
    const examples = {
      i: [3, 11, 'i – (substantive base) – ø /uh /hui', 'īconēuh “her/his child”'],
      inin: [6, 14, 'inin – (substantive base) – hua', 'ininconēhuan “their children”'],
    };
    for (const prefix of new Set([proof.attestedPrefix, proof.authoredPrefix])) {
      if (prefix === 'no') continue;
      const [frame, translated, frameText, translatedText] = examples[prefix];
      assert.ok(rule.bodyIndices.includes(frame) && rule.bodyIndices.includes(translated));
      assert.equal(lesson.sections[1].body[frame], frameText);
      assert.equal(lesson.sections[1].body[translated], translatedText);
    }
  }
}

module.exports = { verifyPossessedFormProof };
