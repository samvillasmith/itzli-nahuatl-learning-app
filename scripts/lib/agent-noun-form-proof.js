const assert = require('node:assert/strict');
const { verifyReferenceFactLocator } = require('./reference-fact-locator');
const PDF_HASH = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const COURSE_HASH = '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f';
const NOUN_RULES = [[5, 2, 0], [5, 2, 1], [5, 2, 2], [5, 2, 3]];
const HUMAN_RULES = [[32, 0, 0], [32, 1, 0], [32, 1, 4], [32, 1, 5]];
const ESCAPE = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CASES = {
  'chōcaquētl': { head: 'CHŌCA', page: 111, base: 'chōca', printedClass: '1/2', selectedClass: '1', frame: 'ni', prefix: null, suffix: 'quētl', en: 'a person who often cries', es: 'una persona que llora con frecuencia' },
  'tēmachtihquētl': { head: 'MACHTIĀ', page: 292, base: 'machtiā', printedClass: '3', selectedClass: '3', frame: 'nic./nimo', prefix: 'tē', suffix: 'hquētl', en: 'a person who teaches people', es: 'una persona que enseña a otras personas' },
  'tēmictihquētl': { head: 'MICTIĀ', page: 326, base: 'mictiā', printedClass: '3', selectedClass: '3', frame: 'nic', prefix: 'tē', suffix: 'hquētl', en: 'a killer of people', es: 'una persona que mata a otras personas' },
  'xōchinamacaquētl': { head: 'XŌCHINAMACA1', page: 608, base: 'xōchinamaca', printedClass: '1', selectedClass: '1', frame: 'ni', prefix: null, suffix: 'quētl', en: 'a flower vendor', es: 'una persona que vende flores' },
};
const CLASS1_MODELS = [
  { referencePdfPage: 400, referenceVerbHeadword: 'PITZONAMACA1', referenceNounHeadword: 'PITZONAMACAQUĒTL', verbClass: '1', baseUnchanged: true },
  { referencePdfPage: 402, referenceVerbHeadword: 'PIYŌNAMACA1', referenceNounHeadword: 'PIYONAMACAQUĒTL', verbClass: '1', ordinaryStemSegmentsUnchanged: true, printedVowelLengthDiffers: true, exactStemIdentityClaimed: false, exactPrintedDerivationReference: 'PIYONAMACA1' },
];
const CLASS3_MODELS = [
  { referencePdfPage: 332, referenceNounHeadword: 'MOMACHTIHQUĒTL' },
  { referencePdfPage: 514, referenceNounHeadword: 'TLAMACHTIHQUĒTL' },
];
function definition(pages, page, head, pos) {
  const raw = pages.pages[page - 1]?.text;
  assert.equal(typeof raw, 'string');
  const match = new RegExp(`^${ESCAPE(head)}\\.\\s+${pos}\\.`, 'm').exec(raw);
  assert.ok(match, `Missing exact modern model head ${head}`);
  const rest = raw.slice(match.index + match[0].length);
  const next = rest.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  return rest.slice(0, next < 0 ? undefined : next);
}

// Four individual singular agents. Lexical senses and these particular bases
// have a separate frozen peer review; no general derivation is enabled.
function verifyAgentNounFormProof(entry, pages, pdfHash, course, courseHash) {
  const loc = entry.sourceLocator, proof = loc.agentNounProof, selected = CASES[entry.sourceSpelling];
  assert.ok(selected, 'Unreviewed agent noun');
  assert.equal(pdfHash, PDF_HASH); assert.equal(courseHash, COURSE_HASH);
  assert.equal(loc.sourceType, 'productive-agent-noun-form');
  assert.equal(entry.formKind, 'rule-composed-agent-noun'); assert.equal(entry.partOfSpeech, 'noun');
  assert.equal(entry.audioUrl, null); assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(loc.referencePdfPage, selected.page); assert.equal(loc.referenceHeadword, selected.head);
  assert.equal(loc.referenceFileSha256, PDF_HASH);
  assert.equal(loc.authoredReferenceForm, entry.sourceSpelling);
  assert.equal(proof.construction, 'singular-agent-noun-from-reviewed-present-base');
  assert.equal(proof.authoredReferenceForm, entry.sourceSpelling);
  assert.equal(proof.directWholeFormAttestationClaimed, false);
  assert.equal(proof.finitePredicateAsserted, false);
  assert.equal(proof.generalizedAgentNounGeneratorApproved, false);
  assert.equal(proof.pluralAgentRuleApproved, false);
  for (const field of ['subject', 'possessor', 'tense']) assert.equal(proof[field], null);
  assert.equal(proof.number, 'singular'); assert.equal(proof.objectPrefix, selected.prefix);
  assert.equal(proof.objectKind, selected.prefix ? 'non-specific-human' : null);
  assert.equal(proof.nounSuffix, selected.suffix);
  assert.equal(entry.meaningEn, selected.en); assert.equal(entry.meaningEs, selected.es);
  assert.deepEqual(proof.modernVerbEvidence, {
    referencePdfPage: selected.page, referenceHeadword: selected.head, sourceStemSpelling: selected.base,
    verbClass: selected.printedClass.replace('/', '-or-'), selectedClass: selected.selectedClass,
    frame: selected.frame, selectedSense: 1, referenceFileSha256: PDF_HASH,
  });
  verifyReferenceFactLocator({ ...entry, sourceSpelling: selected.base, sourceLocator: { ...loc, sourceType: 'individual-reference-fact' } }, pages, pdfHash, value => value.toLowerCase());
  const selectedDefinition = definition(pages, selected.page, selected.head, `tlach${selected.printedClass}`);
  assert.ok(new RegExp(`^(?:1\\.\\s*)?${ESCAPE(selected.frame)}\\.`).test(selectedDefinition.trim()), 'Missing selected verb argument frame');
  const base = selected.selectedClass === '3' ? selected.base.slice(0, -1) : selected.base;
  assert.deepEqual(proof.stemAllomorph, { operation: selected.selectedClass === '3' ? 'drop-final-a-class3' : 'retain-selected-class1-present-base', exactResult: base });
  assert.equal(entry.sourceSpelling, (selected.prefix || '') + base + selected.suffix);
  if (selected.head === 'CHŌCA') assert.match(selectedDefinition, /panoc\.\s+chōcac,\s+chōcqui\./u);
  if (selected.head === 'XŌCHINAMACA1') assert.match(selectedDefinition, /panoc\.\s+xōchinamacac\./u);
  assert.deepEqual(proof.agentSuffixEvidence, { referencePdfPage: 413, referenceHeadword: 'QUĒ', selectedSense: 5, sourceSuffix: 'quē', number: 'singular', ordinaryFunction: 'occupation-or-habitual-activity-agent', absolutiveEvidence: { referencePdfPage: 471, referenceHeadword: 'TL2', sourceSuffix: 'tl', number: 'singular' } });
  const suffixDefinition = definition(pages, 413, 'QUĒ', 'tlaten');
  const fifth = suffixDefinition.split(/(?:^|\s)5\.\s/u)[1]?.split(/(?:^|\s)6\.\s/u)[0];
  assert.ok(fifth?.includes('Motequihuia ica TL2 quemman cetzin itlapachol'));
  assert.ok(fifth.includes('itequiuh') && fifth.includes('mohmoztlah'));
  assert.ok(definition(pages, 471, 'TL2', 'tlaten').includes('Axtlaaxcatilli tlen cetzin'));
  if (selected.selectedClass === '1') {
    assert.deepEqual(proof.modelEvidence, CLASS1_MODELS);
    for (const model of CLASS1_MODELS) {
      const verb = definition(pages, model.referencePdfPage, model.referenceVerbHeadword, 'tlach1');
      assert.match(verb, /(?:^|\s)ni\./u);
      const noun = definition(pages, model.referencePdfPage, model.referenceNounHeadword, 'tlat');
      assert.ok(noun.replace(/\s+/g, ' ').includes(`${model.exactPrintedDerivationReference || model.referenceVerbHeadword}, QUĒ, TL2`), 'Agent model lacks its exact derivational reference');
    }
  } else {
    assert.deepEqual(proof.modelEvidence.map(model => [model.referencePdfPage, model.referenceNounHeadword]), CLASS3_MODELS.map(model => [model.referencePdfPage, model.referenceNounHeadword]));
    for (const model of CLASS3_MODELS) {
      const noun = definition(pages, model.referencePdfPage, model.referenceNounHeadword, 'tlat');
      assert.match(noun, /(?:^|\s)ni\./u);
      assert.ok(noun.includes('QUĒ, TL2'));
    }
  }
  const required = [...NOUN_RULES, ...(selected.prefix ? HUMAN_RULES : [])];
  assert.deepEqual(proof.grammarRuleLocators.map(rule => [rule.lessonNumber, rule.sectionIndex, rule.bodyIndex]), required);
  for (const rule of proof.grammarRuleLocators) {
    const lesson = course.lessons.find(item => item.number === rule.lessonNumber);
    assert.equal(rule.sourceUrl, lesson.originalUrl); assert.equal(rule.sourceImportSha256, COURSE_HASH);
    assert.equal(typeof lesson.sections[rule.sectionIndex]?.body[rule.bodyIndex], 'string');
  }
  const fifthLesson = course.lessons.find(item => item.number === 5);
  assert.ok(fifthLesson.sections[2].body[0].includes('present tense verb forms the word stem'));
  assert.equal(fifthLesson.sections[2].body[1], 'momachtia “to study”');
  assert.equal(fifthLesson.sections[2].body[2], 'momachti – hquetl “student”');
  assert.ok(fifthLesson.sections[2].body[3].includes('deletes its final “a,”'));
  if (selected.prefix) {
    const humanLesson = course.lessons.find(item => item.number === 32);
    assert.ok(humanLesson.sections[1].body[0].includes('non-specific human object marker'));
    assert.equal(humanLesson.sections[1].body[4], 'Notatah quipalehuia Tomás. / My dad helps Tomás.');
    assert.equal(humanLesson.sections[1].body[5], 'Notatah tēpalehuia. / My dad helps people.');
  }
}
module.exports = { verifyAgentNounFormProof };
