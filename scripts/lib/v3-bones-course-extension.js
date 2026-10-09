const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const EXPECTED = {
  base: '724003826d296d4496c845e9c555032f8ab003f7262e4ec8cec5d62b9dde543e',
  main: '9c0bdbafb546758987c03de3a5edc1c6ab036af9ce78786ec002ace6b2f8d1c4',
  mainCourse: '007c61983bf6a16efbf7afeec640eebeeeb1a0ffdfa91033835449b7045a8592',
  mainFacts: '0072d40f7d867e2de899b44da9dbe18486af7c71d83835cc7429626c7acdb738',
  mainPeer: 'b442c97a763aa47707b1f464411532d811fa296a0b4b7779b492989d2ec740fa',
  supplement: '1da63036699ed83a50b95ac1ac837a16de9bc191a4d275b1c6221d99d6023087',
  supplementFacts: 'e9b7dc0e8c1479a0b0a11e060c27311ff23f4d290aada8b6f2bfa7c470d34252',
  supplementPeer: 'e4464bf907014cd5e00faab576db02ecacaebf1800a6eadac6788e9523a62b0b',
  combined: 'aba7f965b7ea2cf16232f2d0edf616cfc02e4ffd4181d27c05d351d513a634b8',
  source: '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f',
};
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
function frozen(file, hash) {
  const bytes = fs.readFileSync(file); assert.equal(digest(bytes), hash, 'Changed bones source requires fresh review: ' + path.basename(file));
  return JSON.parse(bytes.toString('utf8'));
}
function checkAppendix(base, appendix, proposed) {
  for (const [field, addition] of [['units', 'newUnits'], ['rules', 'newRules'], ['phrases', 'newPhrases'], ['sources', 'newSources']]) {
    assert.deepEqual(proposed[field], [...base[field], ...appendix[addition]], 'Preserve every existing ' + field + ' identity');
    assert.equal(new Set(proposed[field].map(item => item.id)).size, proposed[field].length);
  }
}
function applyReviewedBonesExtension(course, { root, research }) {
  assert.equal(digest(JSON.stringify(course, null, 2) + '\n'), EXPECTED.base);
  assert.equal(digest(fs.readFileSync(path.join(root, 'src/data/nahuatlahtolli-course.json'))), EXPECTED.source);
  const at = name => path.join(research, 'grammar', name);
  const main = frozen(at('curriculum-bones-extension.private.json'), EXPECTED.main);
  const mainCourse = frozen(at('curriculum-bones-proposed.private.json'), EXPECTED.mainCourse);
  frozen(at('curriculum-bones-source-facts.private.json'), EXPECTED.mainFacts);
  const mainPeer = frozen(at('curriculum-bones-main7-adversarial-review.private.json'), EXPECTED.mainPeer);
  const supplement = frozen(at('curriculum-bones-supplement.private.json'), EXPECTED.supplement);
  frozen(at('curriculum-bones-supplement-facts.private.json'), EXPECTED.supplementFacts);
  const supplementPeer = frozen(at('curriculum-bones-supplement-adversarial-review.private.json'), EXPECTED.supplementPeer);
  const combined = frozen(at('curriculum-bones-combined-proposed.private.json'), EXPECTED.combined);
  assert.ok(mainPeer.status.startsWith('passed-') && supplementPeer.status.startsWith('passed-'));
  assert.equal(main.baseCourseSha256, EXPECTED.base); assert.equal(supplement.baseCourseSha256, EXPECTED.mainCourse);
  assert.equal(main.approvedSourceSha256, EXPECTED.source); assert.equal(supplement.approvedSourceSha256, EXPECTED.source);
  checkAppendix(course, main, mainCourse); checkAppendix(mainCourse, supplement, combined);
  assert.equal(main.newUnits.length, 7); assert.equal(supplement.newUnits.length, 2);
  assert.equal(combined.units.length, 46); assert.equal(combined.rules.length, 37); assert.equal(combined.phrases.length, 219);
  assert.equal(combined.units.reduce((total, unit) => total + unit.steps.length, 0), 379);
  return { course: structuredClone(combined), evidence: {
    baseCourseSha256: EXPECTED.base, authoredMainSha256: EXPECTED.main, mainReviewSha256: EXPECTED.mainPeer,
    authoredSupplementSha256: EXPECTED.supplement, supplementReviewSha256: EXPECTED.supplementPeer,
    reviewedCombinedSha256: EXPECTED.combined, existingUnitsPreserved: 37, newUnits: 9, newTasks: 70, newPhraseRecords: 43,
  } };
}
module.exports = { applyReviewedBonesExtension, EXPECTED };
