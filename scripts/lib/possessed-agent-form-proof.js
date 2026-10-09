const assert = require('node:assert/strict');
const { verifyReferenceFactLocator } = require('./reference-fact-locator');
const PDF_HASH = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const COURSE_HASH = '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f';
const ESCAPE = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RULES = [[0, 0], [0, 2], [0, 3], [1, 1], [1, 9], [1, 30], [1, 31]];
const CASES = {
  notlayecāncāuh: { number: 'singular', suffix: 'uh', page: 597, head: 'UH2', sense: 'unnumbered modern suffix', en: 'my leader', es: 'mi líder' },
  notlayecāncāhuān: { number: 'plural', suffix: 'huān', page: 211, head: 'HUĀN2', sense: 1, en: 'my leaders', es: 'mis líderes' },
};
function definition(pages, page, head, pos) {
  const raw = pages.pages[page - 1]?.text; assert.equal(typeof raw, 'string');
  const match = new RegExp(`^${ESCAPE(head)}\\.\\s+${pos}\\.`, 'm').exec(raw); assert.ok(match, 'Missing exact governing head ' + head);
  const rest = raw.slice(match.index + match[0].length);
  const next = rest.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  return rest.slice(0, next < 0 ? undefined : next).replace(/\s+/g, ' ').trim();
}

// Exactly two first-person possessed work-leader nouns. The reviewed CĀ1
// allomorph and the selected endings do not approve other noun classes.
function verifyPossessedAgentFormProof(entry, pages, pdfHash, course, courseHash) {
  const loc = entry.sourceLocator, proof = loc.possessedAgentProof, selected = CASES[entry.sourceSpelling];
  assert.ok(selected, 'Unreviewed possessed agent');
  assert.equal(pdfHash, PDF_HASH); assert.equal(courseHash, COURSE_HASH);
  assert.equal(loc.sourceType, 'productive-possessed-agent-form');
  assert.equal(entry.formKind, 'rule-composed-possessed-agent'); assert.equal(entry.partOfSpeech, 'noun');
  assert.equal(entry.audioUrl, null); assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.sourceUrl, entry.sourceUrl); assert.equal(loc.authoredReferenceForm, entry.sourceSpelling);
  assert.equal(loc.referencePdfPage, 550); assert.equal(loc.referenceHeadword, 'TLAYECĀNQUĒTL'); assert.equal(loc.referenceFileSha256, PDF_HASH);
  verifyReferenceFactLocator({ ...entry, sourceSpelling: 'tlayecānquētl', sourceLocator: { ...loc, sourceType: 'individual-reference-fact' } }, pages, pdfHash, value => value.toLowerCase());
  assert.equal(proof.construction, 'first-person-possessed-reviewed-agent-noun');
  assert.equal(proof.authoredReferenceForm, entry.sourceSpelling); assert.equal(proof.directWholeFormAttestationClaimed, false);
  assert.equal(proof.possessorPrefix, 'no'); assert.deepEqual(proof.possessor, { person: 1, number: 'singular' });
  assert.equal(proof.possessedNumber, selected.number);
  for (const field of ['subject', 'object', 'tense']) assert.equal(proof[field], null);
  assert.equal(proof.finitePredicateAsserted, false); assert.equal(proof.generalizedPossessedAgentGeneratorApproved, false);
  assert.deepEqual(proof.phonologicalChangesBeyondReviewedAllomorph, []);
  assert.equal(entry.meaningEn, selected.en); assert.equal(entry.meaningEs, selected.es);
  assert.deepEqual(proof.modernAgentEvidence, {
    referencePdfPage: 550, referenceHeadword: 'TLAYECĀNQUĒTL', sourceSpelling: 'tlayecānquētl', selectedSense: 'work-group-leader', referenceFileSha256: PDF_HASH,
    governingVerbHeadword: 'TLAYECĀNA', verbClass: '2', exactPastForm: 'tlayecānqui', exactPastStem: 'tlayecān', derivationalReferences: ['TLAYECĀNA', 'QUĒ', 'TL2'],
  });
  const leader = definition(pages, 550, 'TLAYECĀNQUĒTL', 'tlat');
  assert.ok(leader.startsWith('ni. Macehualli tlen quinnahuatia cequinoqueh ica ce tequitl.'), 'Missing reviewed task-leader sense');
  assert.ok(leader.includes('achi. TLAYECĀNA, QUĒ, TL2.'));
  const verb = definition(pages, 550, 'TLAYECĀNA', 'tlach2');
  assert.ok(verb.startsWith('ni. Macehualli quinnahuatia cequinoqueh ica ce tequitl.'));
  assert.ok(verb.includes('panoc. tlayecānqui.'));
  const allomorph = proof.agentAllomorphEvidence;
  assert.equal(allomorph.referencePdfPage, 57); assert.equal(allomorph.referenceHeadword, 'CĀ1'); assert.equal(allomorph.selectedSense, 1); assert.equal(allomorph.sourceAllomorph, 'cā');
  assert.equal(allomorph.exactFunction, 'deverbal-past-noun-allomorph-when-combining-or-receiving-UH2-or-HUĀN2');
  assert.deepEqual(allomorph.suffixCrossReference, { referencePdfPage: 413, referenceHeadword: 'QUĒ', exactPrintedReference: 'CĀ1 (tlalocotz.)' });
  const firstSense = definition(pages, 57, 'CĀ1', 'tlaten').split(/(?:^|\s)2\.\s/u)[0];
  assert.ok(firstSense.includes('Tlachiuhcatlatocaxtiliztli ica tlenpanoc quitequihuia CĀ1'));
  assert.ok(firstSense.includes('quemman quicelia tlaaxcatilli tlen UH2 huan HUĀN2.'));
  assert.ok(definition(pages, 413, 'QUĒ', 'tlaten').includes('achi. CĀ1 (tlalocotz.)'));
  const requiredModels = [
    { referencePdfPage: 332, referenceHeadword: 'MOMACHTIHQUĒTL', exactPrintedPossessedMetadata: '-momachtihcāuh' },
    { referencePdfPage: 514, referenceHeadword: 'TLAMACHTIHQUĒTL', exactPrintedPossessedMetadata: '-tlamachtihcāuh' },
  ];
  assert.deepEqual(allomorph.modelEvidence, requiredModels);
  for (const model of requiredModels) assert.ok(definition(pages, model.referencePdfPage, model.referenceHeadword, 'tlat').includes('tlaaxca. ' + model.exactPrintedPossessedMetadata + '.'), 'Missing exact possessed agent model');
  assert.deepEqual(proof.stemAllomorph, { operation: 'replace-singular-agent-suffix-with-reviewed-possessed-allomorph', sourceAgentSuffix: 'quētl', possessedAgentSuffix: 'cā', exactResult: 'tlayecāncā' });
  assert.deepEqual(proof.possessionNumberEvidence, { referencePdfPage: selected.page, referenceHeadword: selected.head, selectedSense: selected.sense, sourceSuffix: selected.suffix, number: selected.number, allVowelFinalNounsClaimed: false });
  const numberDefinition = definition(pages, selected.page, selected.head, 'tlaten');
  if (selected.number === 'singular') {
    assert.ok(numberDefinition.includes('Tlaaxcatilli tlen cetzin.'));
    assert.ok(numberDefinition.includes('Zan motequihuia ica cequin tlatocaxtiliztli iyollo tlen tzontlami ica tentzilincayotl.'));
  } else assert.ok(numberDefinition.includes('1. Tlatzonpepecholli. Tlaaxcatilli tlen miaquin.'));
  assert.equal(entry.sourceSpelling, 'no' + 'tlayecān' + 'cā' + selected.suffix);
  assert.deepEqual(proof.grammarRuleLocators.map(rule => [rule.sectionIndex, rule.bodyIndex]), RULES);
  const lesson = course.lessons.find(item => item.number === 8); assert.ok(lesson);
  for (const rule of proof.grammarRuleLocators) {
    assert.equal(rule.lessonNumber, 8); assert.equal(rule.sourceImportSha256, COURSE_HASH); assert.equal(rule.sourceUrl, lesson.originalUrl);
    assert.equal(typeof lesson.sections[rule.sectionIndex]?.body[rule.bodyIndex], 'string');
  }
  assert.ok(lesson.sections[0].body[0].includes('identifies the possessor'));
  assert.equal(lesson.sections[0].body[2], 'no – conē – uh “my child”');
  assert.equal(lesson.sections[0].body[3], 'to – conē – huan “our children”');
  assert.equal(lesson.sections[1].body[1], 'no – (substantive base) – ø /uh /hui');
  assert.equal(lesson.sections[1].body[9], 'noconēuh “my child”');
  assert.equal(lesson.sections[1].body[30], 'Nopitzohuan quicuāh miac cīntli.');
  assert.equal(lesson.sections[1].body[31], 'My pigs eat a lot of corn.');
}
module.exports = { verifyPossessedAgentFormProof };
