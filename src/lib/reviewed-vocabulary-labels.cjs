// Shared CommonJS entry point for the offline audits and the bundled learner app.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { corrections: historicalCorrections } = require('../data/reviewed-vocabulary-labels.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { corrections: selectedSenses } = require('../data/learner-vocabulary-senses.json');
const corrections = [...historicalCorrections, ...selectedSenses];
if (new Set(corrections.map(item => item.id)).size !== corrections.length) {
  throw new Error('Duplicate historical correction/current learner sense identity.');
}

function getReviewedVocabularyLabels() { return corrections.slice(); }

function reviewedHistoricalVocabularyLabel(id, meaningEn, meaningEs) {
  return checkedVocabularyLabel(historicalCorrections, id, meaningEn, meaningEs);
}

/** Explicit label repairs preserve each published spelling, identity and source recording. */
function reviewedVocabularyLabel(id, meaningEn, meaningEs, sourceFactReviewHash) {
  return checkedVocabularyLabel(corrections, id, meaningEn, meaningEs, sourceFactReviewHash);
}

function checkedVocabularyLabel(registry, id, meaningEn, meaningEs, sourceFactReviewHash) {
  const correction = registry.find(item => item.id === id);
  if (!correction) return null;
  if (meaningEn !== correction.beforeEn || meaningEs !== correction.beforeEs) {
    throw new Error(`Reviewed vocabulary label lost its original wording: ${id}`);
  }
  if (correction.selectedSenseOnly && sourceFactReviewHash !== correction.sourceFactReviewHash) {
    throw new Error(`Selected vocabulary sense lost its reviewed source fact: ${id}`);
  }
  return correction;
}
module.exports = { reviewedVocabularyLabel, getReviewedVocabularyLabels, reviewedHistoricalVocabularyLabel };
