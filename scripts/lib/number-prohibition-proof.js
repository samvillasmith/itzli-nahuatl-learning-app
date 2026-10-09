const assert = require('node:assert/strict');
const { verifyReferenceFactLocator } = require('./reference-fact-locator');

const PDF_HASH = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const COURSE_HASH = '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f';
const SEP_HASH = 'c25887473619870cd9dd7e2a2ce1f63ae73e82ef8e554940e02cd4be95511166';
const SEP_URL = 'https://dgeiib.basica.sep.gob.mx/files/fondo-editorial/educacion-intercultural/cgeib_00028.pdf';
const CARDINAL_RULES = [[4, 1, 110], [4, 1, 111], [4, 1, 112], [4, 1, 113], [4, 1, 115], [4, 1, 116], [4, 1, 117], [4, 1, 118], [31, 2, 1]];
const COMMAND_RULES = [[19, 2, 0], [19, 2, 2], [19, 2, 4]];

function line(rule, course, required) {
  assert.deepEqual([rule.lessonNumber, rule.sectionIndex, rule.bodyIndex], required);
  const lesson = course.lessons.find(item => item.number === rule.lessonNumber);
  assert.ok(lesson, 'Missing frozen grammar lesson');
  assert.equal(rule.sourceUrl, lesson.originalUrl);
  assert.equal(rule.sourceImportSha256, COURSE_HASH);
  const text = lesson.sections[rule.sectionIndex]?.body[rule.bodyIndex];
  assert.equal(typeof text, 'string');
  return text;
}

function common(entry, courseHash, field) {
  const loc = entry.sourceLocator, proof = loc[field];
  assert.equal(courseHash, COURSE_HASH);
  assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(entry.audioUrl, null);
  assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.authoredReferenceForm, entry.sourceSpelling);
  assert.equal(proof.authoredReferenceForm, entry.sourceSpelling);
  assert.equal(proof.directWholeFormAttestationClaimed, false);
  assert.equal(proof.compositionNoStemChanges, true);
  assert.deepEqual(proof.phonologicalChangesInComposition, []);
  return proof;
}

// One exact eighty-plus-ten quantity only. No ordinal, arbitrary arithmetic,
// noun agreement or complete sentence follows from this narrow approval.
function verifyCardinalFormProof(entry, course, courseHash) {
  const proof = common(entry, courseHash, 'numberProof');
  assert.equal(entry.sourceLocator.sourceType, 'productive-cardinal-form');
  assert.equal(entry.formKind, 'rule-composed-cardinal');
  assert.equal(entry.partOfSpeech, 'number');
  assert.equal(entry.sourceSpelling, 'nauhpōhualli huan mahtlactli');
  assert.equal(entry.meaningEn, 'ninety'); assert.equal(entry.meaningEs, 'noventa');
  assert.equal(proof.construction, 'exact-cardinal-base-plus-huan-plus-exact-addend');
  assert.equal(proof.ordinalClaimed, false);
  assert.equal(proof.predicateAsserted, false);
  assert.equal(proof.generalizedNumberGeneratorApproved, false);
  for (const field of ['subject', 'object', 'possessor', 'tense', 'nounSlot']) assert.equal(proof[field] ?? null, null);
  assert.equal(proof.resultValue, 90);
  assert.deepEqual(proof.operator, { sourceSpelling: 'huan', operation: 'addition' });
  assert.equal(proof.operands.length, 2);
  const [base, addend] = proof.operands;
  assert.equal(base.value, 80); assert.equal(base.sourceSpelling, 'nauhpōhualli');
  assert.equal(addend.value, 10); assert.equal(addend.sourceSpelling, 'mahtlactli');
  assert.equal(line(base.locator, course, [4, 1, 124]), 'nauhpōhualli “eighty” (4 x 20)');
  assert.equal(line(addend.locator, course, [4, 1, 66]), 'mahtlactli “ten”');
  assert.equal(entry.sourceUrl, base.locator.sourceUrl);
  assert.equal(proof.grammarRuleLocators.length, CARDINAL_RULES.length);
  const examples = ['mahtlactli huan cē “eleven”', 'mahtlactli huan ōme “twelve”', 'mahtlactli huan ēyi “thirteen”', 'mahtlactli huan nahui “fourten”', 'caxtōlli huan cē “sixteen”', 'caxtōlli huan ōme “seventeen”', 'caxtōlli huan ēyi “eighteen”', 'caxtōlli huan nahui “nineteen”'];
  proof.grammarRuleLocators.forEach((rule, index) => {
    const text = line(rule, course, CARDINAL_RULES[index]);
    if (index < 8) assert.equal(text, examples[index]);
    else assert.ok(text.includes('itamachca cēmpōhualli huan mahtlactli'), 'Missing independently attested tens-plus-ten quantity');
  });
}

// One sixty-plus-ten quantity. The x-bearing base is a separately reviewed
// individual lexical choice, not an x-insertion rule from COERLL's variant.
function verifySixtyPlusTenFormProof(entry, course, courseHash, sepPages, sepHash, sixtyEntry) {
  const proof = common(entry, courseHash, 'numberProof');
  assert.equal(entry.sourceLocator.sourceType, 'productive-sixty-plus-ten-form');
  assert.equal(entry.formKind, 'rule-composed-cardinal'); assert.equal(entry.partOfSpeech, 'number');
  assert.equal(entry.sourceSpelling, 'expowalli huan mahtlactli');
  assert.equal(entry.meaningEn, 'seventy'); assert.equal(entry.meaningEs, 'setenta');
  assert.equal(proof.construction, 'reviewed-sixty-base-plus-huan-plus-exact-ten');
  assert.equal(proof.ordinalClaimed, false); assert.equal(proof.predicateAsserted, false); assert.equal(proof.generalizedNumberGeneratorApproved, false);
  for (const field of ['subject', 'object', 'possessor', 'tense', 'nounSlot']) assert.equal(proof[field], null);
  assert.equal(proof.resultValue, 70); assert.deepEqual(proof.operator, { sourceSpelling: 'huan', operation: 'addition' });
  assert.equal(proof.operands.length, 2); const [base, addend] = proof.operands;
  assert.deepEqual(base, {
    value: 60, sourceSpelling: 'Expouali', compositionSpelling: 'expowalli',
    reviewedFactEntryId: 'word-v3function-dec5dc1053abd2b1', reviewedSourceFactHash: '1db2359f53b46a23f7bbc7d6c977da3fb0a026bd17f78a2af8092dd114f4a364',
    reviewedPublishableFileSha256: '11286de8c43ef3fc7978fdd35d0a13c247933edf1cfc3a996b5b044dc8e3913d',
    reviewedPrivateFileSha256: 'e69c65fc2a16a4529aa6452a51c5fb4849cba2010d88b2dde40a8cca13d79478',
    reviewedPeerFileSha256: '3e73e18d0e79472da6dc9dcfeeb007cd547222d153b36971e0ce947de2a77de8',
    sourcePdfPage: 60, sourceTextStart: 3048, sourceFileSha256: SEP_HASH,
    individualLexicalDisplayChoiceReviewed: true, sourceAndCompositionOrthographyIdenticalClaimed: false,
    generalXInsertionRuleClaimed: false, generalUToWRuleClaimed: false, generalLToLlRuleClaimed: false, identicalPronunciationClaimed: false,
  });
  assert.equal(sepHash, SEP_HASH); assert.equal(sepPages.source_sha256, SEP_HASH); assert.equal(sepPages.reference_url, SEP_URL);
  assert.equal(sixtyEntry.id, base.reviewedFactEntryId); assert.equal(sixtyEntry.display, base.compositionSpelling);
  assert.equal(sixtyEntry.sourceSpelling, base.sourceSpelling); assert.equal(sixtyEntry.meaningEn, 'sixty'); assert.equal(sixtyEntry.meaningEs, 'sesenta');
  const sixtyLoc = sixtyEntry.sourceLocator;
  assert.equal(sixtyLoc.sourceType, 'individual-public-reference-fact'); assert.equal(sixtyLoc.sourceFactReviewHash, base.reviewedSourceFactHash);
  assert.equal(sixtyLoc.referencePdfPage, 60); assert.equal(sixtyLoc.referenceTextStart, 3048); assert.equal(sixtyLoc.referenceFileSha256, SEP_HASH);
  assert.equal(sixtyLoc.attestedHeadword, 'Expouali'); assert.equal(sixtyEntry.sourceUrl, SEP_URL + '#page=60'); assert.equal(sixtyLoc.sourceUrl, sixtyEntry.sourceUrl);
  const text = sepPages.pages[59].text;
  assert.equal(text.slice(3048, 3056), 'Expouali'); assert.ok(/\s/u.test(text[3047])); assert.ok(/\s/u.test(text[3056]));
  assert.ok(sepPages.pages[61].text.includes('\nExpouali uan ome\n'), 'Missing independently documented sixty-plus-two base');
  assert.equal(proof.independentXLessVariantUsedToInsertX, false);
  assert.equal(line(proof.independentValueCorroboration, course, [4, 1, 123]), 'ēpōhualli “sixty” (3 x 20)');
  assert.equal(addend.value, 10); assert.equal(addend.sourceSpelling, 'mahtlactli');
  assert.equal(line(addend.locator, course, [4, 1, 66]), 'mahtlactli “ten”');
  assert.equal(entry.sourceUrl, SEP_URL + '#page=60');
  assert.equal(proof.grammarRuleLocators.length, CARDINAL_RULES.length);
  const examples = ['mahtlactli huan cē “eleven”', 'mahtlactli huan ōme “twelve”', 'mahtlactli huan ēyi “thirteen”', 'mahtlactli huan nahui “fourten”', 'caxtōlli huan cē “sixteen”', 'caxtōlli huan ōme “seventeen”', 'caxtōlli huan ēyi “eighteen”', 'caxtōlli huan nahui “nineteen”'];
  proof.grammarRuleLocators.forEach((rule, index) => {
    const text = line(rule, course, CARDINAL_RULES[index]);
    if (index < 8) assert.equal(text, examples[index]); else assert.ok(text.includes('itamachca cēmpōhualli huan mahtlactli'));
  });
  assert.equal(entry.sourceSpelling, base.compositionSpelling + ' ' + proof.operator.sourceSpelling + ' ' + addend.sourceSpelling);
}

// One negative directive only: an exactly attested singular going command
// receives the negative particle documented in the authorized Huasteca guide.
function verifyProhibitionFormProof(entry, pages, pdfHash, course, courseHash, sepPages, sepHash) {
  const proof = common(entry, courseHash, 'prohibitionProof'), loc = entry.sourceLocator;
  assert.equal(pdfHash, PDF_HASH); assert.equal(sepHash, SEP_HASH);
  assert.equal(loc.sourceType, 'productive-prohibition-form');
  assert.equal(entry.formKind, 'rule-composed-prohibition'); assert.equal(entry.partOfSpeech, 'expression');
  assert.equal(entry.sourceSpelling, 'amo xiyāuh');
  assert.equal(entry.meaningEn, 'do not go'); assert.equal(entry.meaningEs, 'no vayas');
  assert.equal(proof.construction, 'negative-particle-before-exact-singular-second-person-command');
  assert.deepEqual(proof.subject, { person: 2, number: 'singular' });
  assert.equal(proof.object, null); assert.equal(proof.tense, null);
  assert.equal(proof.mood, 'negative-directive'); assert.equal(proof.honorificClaimed, false);
  assert.equal(proof.generalizedNegativeCommandGeneratorApproved, false);
  assert.equal(proof.exactPositiveCommand.sourceSpelling, 'Xiyāuh');
  assert.equal(line(proof.exactPositiveCommand.locator, course, [24, 2, 39]), 'Xiyāuh “Go!”');
  assert.equal(entry.sourceUrl, proof.exactPositiveCommand.locator.sourceUrl);
  assert.deepEqual(proof.modernIrregularVerbEvidence, {
    referenceHeadword: 'YĀ1', referencePdfPage: 615, selectedSense: 1, selectedCommandBase: 'yauh',
    referenceFileSha256: PDF_HASH,
    exactGrammaticalFrame: 'YAUH ica na huan ta pan tlenpano huan ica ta pan tlenmapano',
  });
  const headUrl = pages.reference_url + '#page=615';
  verifyReferenceFactLocator({ sourceSpelling: 'yā', sourceUrl: headUrl, sourceLocator: {
    sourceType: 'individual-reference-fact', sourceUrl: headUrl, referenceHeadword: 'YĀ1', referencePdfPage: 615, referenceFileSha256: PDF_HASH,
  } }, pages, pdfHash, value => value.toLowerCase());
  const text = pages.pages[614].text, head = /^YĀ1\.\s+tlach\.\s+axahci\.\s+1\./m.exec(text);
  assert.ok(head, 'Missing exact modern irregular going head');
  const sense = text.slice(head.index + head[0].length).split(/(?:^|\s)2\.\s/u)[0].replace(/\s+/g, ' ');
  assert.ok(sense.includes(proof.modernIrregularVerbEvidence.exactGrammaticalFrame), 'Missing exact second-person command selection');
  assert.equal(loc.referencePdfPage, 615); assert.equal(loc.referenceHeadword, 'YĀ1'); assert.equal(loc.referenceFileSha256, PDF_HASH);
  const model = proof.negativeCommandModel;
  assert.equal(sepPages.reference_url, SEP_URL); assert.equal(sepPages.source_sha256, SEP_HASH);
  assert.equal(model.sourceUrl, SEP_URL + '#page=47'); assert.equal(model.referencePdfPage, 47);
  assert.equal(model.referenceFileSha256, SEP_HASH); assert.equal(model.referenceTextStart, 4225);
  assert.equal(model.exactSelectedForm, 'Amo xikilkauakaj'); assert.equal(model.negativeParticle, 'Amo'); assert.equal(model.commandPrefix, 'xi');
  assert.deepEqual(model.positiveToNegativeStemChanges, []);
  assert.equal(model.regionalScope, 'Huasteca-wide official school guide; exact positive command is independently Chicontepec.');
  assert.equal(model.sourceContext, 'A negative reminder to the learner group not to forget to write the respondent’s name and work, with matching Spanish instructional context on the same page.');
  const sepText = sepPages.pages[46].text;
  assert.equal(sepText.slice(model.referenceTextStart, model.referenceTextStart + model.exactSelectedForm.length), model.exactSelectedForm);
  assert.ok(/\s/u.test(sepText[model.referenceTextStart - 1]));
  assert.ok(/\s/u.test(sepText[model.referenceTextStart + model.exactSelectedForm.length]));
  assert.equal(proof.grammarRuleLocators.length, COMMAND_RULES.length);
  const lines = proof.grammarRuleLocators.map((rule, index) => line(rule, course, COMMAND_RULES[index]));
  assert.ok(lines[0].includes('substitutes the second person singular and plural'));
  assert.ok(lines[1].includes('“ø” for the singular'));
  assert.equal(lines[2], 'Xi – (verbal base) – ø');
}

module.exports = { verifyCardinalFormProof, verifySixtyPlusTenFormProof, verifyProhibitionFormProof };
