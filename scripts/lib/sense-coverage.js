const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

// A supported word meaning does not certify every other meaning in its anchor.
// Count only explicit decisions tied to the exact current public fact review.
function summarizeReviewedAdditionalSenseHolds(entries, reviews, targetKeys, normalize) {
  let targetItemsWithAdditionalReviewHolds = 0, additionalTargetClaimsWithheld = 0;
  let targetItemsWithExplicitAdditionalMeaningHolds = 0, additionalMeaningsExplicitlyWithheld = 0;
  for (const entry of entries) {
    if (!entry.newToCourse || !targetKeys.has(normalize(entry.display))) continue;
    const review = reviews.get(entry.id), finding = review?.originalFinding;
    const held = finding?.additionalTargetSensesHeld;
    if (!held?.length) continue;
    assert.equal(entry.sourceLocator.sourceFactReviewHash,
      createHash('sha256').update(JSON.stringify(review)).digest('hex'), 'Additional-meaning review must match the current fact');
    assert.ok(held.every(value => typeof value === 'string' && value.trim()));
    targetItemsWithAdditionalReviewHolds++;
    additionalTargetClaimsWithheld += new Set(held.map(value => value.trim().toLowerCase())).size;
    const meanings = finding.perSenseCoverage?.held;
    if (meanings?.length) {
      assert.ok(meanings.every(value => value.status === 'not-independently-approved' && value.countAsResolvedMeaning === false && value.meaningEn));
      targetItemsWithExplicitAdditionalMeaningHolds++;
      additionalMeaningsExplicitlyWithheld += new Set(meanings.map(value => value.meaningEn.trim().toLowerCase())).size;
    }
  }
  return { targetItemsWithAdditionalReviewHolds, additionalTargetClaimsWithheld,
    targetItemsWithExplicitAdditionalMeaningHolds, additionalMeaningsExplicitlyWithheld };
}
module.exports = { summarizeReviewedAdditionalSenseHolds };
