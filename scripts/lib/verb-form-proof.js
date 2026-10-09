const assert = require('node:assert/strict');
const { verifyReferenceFactLocator } = require('./reference-fact-locator');
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const NI_RULES = [[6, 0, 1], [6, 1, 1], [6, 3, 2]];
const THIRD_RULES = [[6, 1, 3]];
const OBJECT_RULES = [[13, 2, 0], [13, 2, 1], [13, 2, 2], [13, 2, 10], [13, 2, 17], [13, 2, 18], [13, 2, 34], [13, 2, 35]];
const REFLEXIVE_RULES = [[17, 0, 0], [17, 1, 1], [17, 1, 4]];
const HUMAN_RULES = [[32, 0, 0], [32, 1, 0], [32, 1, 4], [32, 1, 5]];
const FUTURE_RULES = [[12, 0, 0], [12, 0, 1], [12, 0, 3]];
function verifyRules(rules, required, course, hash) {
  assert.deepEqual(rules.map(rule => [rule.lessonNumber, rule.sectionIndex, rule.bodyIndex]), required);
  for (const rule of rules) {
    const lesson = course.lessons.find(item => item.number === rule.lessonNumber);
    assert.equal(rule.sourceUrl, lesson.originalUrl);
    assert.equal(rule.sourceImportSha256, hash);
    assert.equal(typeof lesson.sections[rule.sectionIndex]?.body[rule.bodyIndex], 'string');
  }
}
function governingDefinition(text, head) {
  const match = new RegExp(`^${escapePattern(head)}\\.\\s+tlach(?:[1-9](?:/[1-9])?)?\\.`, 'm').exec(text);
  assert.ok(match, 'Missing modern verb head');
  const rest = text.slice(match.index + match[0].length);
  const next = rest.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  return rest.slice(0, next < 0 ? undefined : next);
}

// Selected singular constructions only. Every public fact also requires a
// frozen semantic review; this is not a general conjugation engine.
function verifyVerbFormProof(entry, pages, pdfHash, course, courseHash) {
  const loc = entry.sourceLocator, stem = loc.modernStemEvidence;
  assert.equal(loc.sourceType, 'productive-verb-form');
  assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.directWholeFormAttestationClaimed, false);
  assert.equal(entry.formKind, 'rule-composed-verb-form');
  assert.equal(entry.audioUrl, null);
  assert.equal(stem.referenceHeadword, loc.referenceHeadword);
  assert.equal(stem.referencePdfPage, loc.referencePdfPage);
  assert.equal(stem.sourceStemSpelling, loc.referenceHeadword.replace(/[1-9]$/, '').toLowerCase());
  assert.equal(loc.authoredReferenceForm, entry.sourceSpelling);
  verifyReferenceFactLocator({ ...entry, sourceSpelling: stem.sourceStemSpelling,
    sourceLocator: { ...loc, sourceType: 'individual-reference-fact' } }, pages, pdfHash, value => value.toLowerCase());
  const text = pages.pages[loc.referencePdfPage - 1].text;
  const definition = governingDefinition(text, loc.referenceHeadword);
  const sense = stem.selectedSense ?? 1;
  assert.ok(Number.isInteger(sense) && sense > 0, 'Invalid selected modern sense');
  const senseMarker = new RegExp(`(?:^|\\s)${sense}\\.\\s`, 'u').exec(definition);
  assert.ok(senseMarker || (sense === 1 && !/(?:^|\s)[1-9]\.\s/u.test(definition)), 'Missing selected modern sense');
  const selectedRest = senseMarker ? definition.slice(senseMarker.index + senseMarker[0].length) : definition.trim();
  const nextSense = selectedRest.search(/(?:^|\s)[1-9]\.\s/u);
  const selected = selectedRest.slice(0, nextSense < 0 ? undefined : nextSense);
  const omittedNiRecovery = stem.frame === 'modern-intransitive-human-recovery-predicate; printed ni omitted';
  if (omittedNiRecovery) {
    // One explicitly reviewed human predicate with a finite intransitive
    // example. An omitted frame elsewhere grants no permission to infer one.
    assert.equal(loc.referenceHeadword, 'CAXĀNI');
    assert.equal(loc.referencePdfPage, 81);
    assert.equal(pdfHash, 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc');
    assert.equal(sense, 1);
    assert.ok(selected.includes('Cocoxquetl poliuhtiyohua icocoliz'));
    assert.ok(selected.includes('Raul caxanqui'));
  } else {
    assert.ok(['ni', 'nic', 'nimo', 'nic./nimo'].includes(stem.frame), 'Unsupported modern verb frame');
    assert.ok(new RegExp(`(?:^|\\s)${escapePattern(stem.frame)}\\.`, 'u').test(selected),
      stem.frame === 'ni' ? 'Modern stem has no explicit intransitive ni frame' : 'Selected modern sense has no reviewed argument frame');
  }
  let required, base = stem.sourceStemSpelling;
  if (loc.objectPrefix === null) {
    assert.ok(stem.frame === 'ni' || omittedNiRecovery);
    assert.equal(loc.subjectPrefix, 'ni');
    assert.deepEqual(loc.subject, { person: 1, number: 'singular' });
    assert.equal(loc.object ?? null, null);
    required = NI_RULES;
  } else if (loc.objectPrefix === 'mitz') {
    assert.ok(['nic', 'nic./nimo'].includes(stem.frame));
    assert.equal(loc.subjectPrefix, 'ni');
    assert.deepEqual(loc.subject, { person: 1, number: 'singular' });
    assert.deepEqual(loc.object, { person: 2, number: 'singular', kind: 'specific-human', reflexive: false });
    required = [...NI_RULES, ...OBJECT_RULES];
  } else if (loc.objectPrefix === 'nech') {
    assert.ok(['nic', 'nic./nimo'].includes(stem.frame));
    assert.equal(loc.subjectPrefix, '');
    assert.deepEqual(loc.subject, { person: 3, number: 'singular' });
    assert.deepEqual(loc.object, { person: 1, number: 'singular', kind: 'specific-human', reflexive: false });
    required = [...THIRD_RULES, ...OBJECT_RULES];
  } else if (loc.objectPrefix === 'mo') {
    assert.ok(['nimo', 'nic./nimo'].includes(stem.frame));
    assert.equal(loc.subjectPrefix, 'ni');
    assert.deepEqual(loc.subject, { person: 1, number: 'singular' });
    assert.deepEqual(loc.object, { person: 1, number: 'singular', kind: 'specific-human', reflexive: true });
    required = [...NI_RULES, ...REFLEXIVE_RULES];
  } else if (loc.objectPrefix === 'tē') {
    assert.ok(['nic', 'nic./nimo'].includes(stem.frame));
    assert.equal(loc.subjectPrefix, '');
    assert.deepEqual(loc.subject, { person: 3, number: 'singular' });
    assert.deepEqual(loc.object, { person: null, number: 'unspecified', kind: 'non-specific-human', reflexive: false });
    required = [...THIRD_RULES, ...HUMAN_RULES];
  } else assert.fail('Unsupported object construction');
  if (loc.tense === 'future') {
    assert.equal(loc.objectPrefix, 'mitz', 'Only reviewed singular future greeting route is enabled');
    assert.equal(loc.referenceHeadword, 'TLAHPALOĀ');
    assert.equal(loc.referencePdfPage, 497);
    assert.equal(sense, 1);
    assert.equal(loc.numberSuffix, 'z');
    assert.equal(loc.compositionNoStemChanges, false);
    assert.match(base, /[io][aā]$/u);
    base = base.slice(0, -1);
    assert.deepEqual(loc.stemAllomorph, { operation: 'drop-final-a-class3', exactResult: base,
      allomorphSourceRule: loc.grammarRuleLocators.at(-2) });
    required = [...required, ...FUTURE_RULES];
  } else {
    assert.equal(loc.tense, 'present');
    assert.equal(loc.numberSuffix, '');
    assert.equal(loc.compositionNoStemChanges, true);
    assert.equal(loc.stemAllomorph ?? null, null);
  }
  assert.equal(entry.sourceSpelling, loc.subjectPrefix + (loc.objectPrefix ?? '') + base + loc.numberSuffix,
    'Verb composition changes the reviewed stem');
  verifyRules(loc.grammarRuleLocators, required, course, courseHash);
  const lesson = course.lessons.find(item => item.number === 6);
  assert.equal(lesson.sections[1].body[1], 'ni – (verbal base) – ø');
  assert.equal(lesson.sections[3].body[2], 'nichōca “I cry”');
  assert.ok(lesson.sections[0].body[1].includes('singular is followed by the suffix “ø,”'));
}
module.exports = { verifyVerbFormProof };
