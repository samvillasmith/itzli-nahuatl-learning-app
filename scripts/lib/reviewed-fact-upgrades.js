const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const factHash = entry => crypto.createHash('sha256').update(JSON.stringify(entry)).digest('hex');

// A separately reviewed sense can replace the earlier card for the same written
// form. Keep its learner identity; never count a second sense as another word.
function applyReviewedFactUpgrades(entries, reviews, upgrades, normalize) {
  const result = entries.slice();
  const seen = new Set();
  for (const upgrade of upgrades) {
    assert.ok(!seen.has(upgrade.reviewedEntryId), 'Repeated reviewed fact');
    seen.add(upgrade.reviewedEntryId);
    const previousIndex = result.findIndex(entry => entry.id === upgrade.existingEntryId);
    const reviewedIndex = result.findIndex(entry => entry.id === upgrade.reviewedEntryId);
    assert.ok(previousIndex >= 0 && reviewedIndex >= 0 && previousIndex !== reviewedIndex, 'Missing distinct reviewed upgrade');
    const previous = result[previousIndex], reviewed = result[reviewedIndex];
    assert.equal(factHash(previous), upgrade.previousFactSha256, 'Previous card differs from reviewed upgrade');
    assert.equal(normalize(previous.display), normalize(reviewed.display), 'Upgrade changes the written form');
    assert.equal(previous.newToCourse, reviewed.newToCourse);
    const review = reviews.get(reviewed.id);
    assert.ok(review && review.decision === 'approved-specified-fact', 'Upgrade lacks a semantic review');
    assert.equal(reviewed.audioUrl, previous.audioUrl, 'A recording change requires a separate reviewed migration');
    if (previous.audioUrl !== null) {
      assert.equal(review.originalFinding?.nativeAudioPreservedForCanonicalOnly, true);
      assert.equal(previous.sourceSpelling, reviewed.sourceSpelling);
      assert.equal(previous.sourceUrl, reviewed.sourceUrl);
      assert.equal(previous.sourceLocator?.sourceType, 'licensed-course');
      assert.equal(reviewed.sourceLocator?.sourceType, 'licensed-course');
      for (const field of ['lessonNumber', 'vocabularyIndex', 'sectionIndex', 'bodyIndex', 'sourceImportSha256']) {
        assert.equal(previous.sourceLocator[field], reviewed.sourceLocator[field]);
      }
    }
    result[previousIndex] = { ...reviewed, id: previous.id };
    result.splice(reviewedIndex, 1);
    reviews.set(previous.id, review);
  }
  return result;
}
module.exports = { applyReviewedFactUpgrades };
