const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { auditInstructionalCompletion, mergeCohortBlueprints, verifiedLabelEquivalences } = require('./lib/instructional-completion-audit.cjs');
const { toInaliOrthography } = require('../public/nahuatl-orthography.js');
const { reviewedHistoricalVocabularyLabel } = require('../src/lib/reviewed-vocabulary-labels.cjs');
const directory = 'data/research/yan-garcia-nhe-20261004/verification/instructional-v3';
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const sourceText = filename => fs.readFileSync(filename, 'utf8');
const fileHash = filename => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
// This review approves eighteen specific wording redrafts, not new grammatical coverage.
const labelReviewPath = 'data/copyright-audit-20261007/gloss-label-equivalence-review.private.json';
const labelReviewSha256 = '570f31f6a85588f5f2baed7c67b301edff8b4063c67ddad1b4fb0f46e8e12f36';
const primarySourcePaths = [
  'data/research/yan-garcia-nhe-20261004/verification/further-sources/tlahtolxitlauhcayotl-chicontepec-reference.pdf',
  'src/data/nahuatlahtolli-course.json',
];
const labelEquivalences = verifiedLabelEquivalences({ reviewSource: sourceText(labelReviewPath), expectedReviewSha256: labelReviewSha256,
  labelsSource: sourceText('src/data/reviewed-vocabulary-labels.json'), lexiconSource: sourceText('src/data/v3-verified-lexicon.json'),
  contextLabelsSource: sourceText('src/data/reviewed-context-labels.json'), primarySourceHashes: Object.fromEntries(primarySourcePaths.map(filename => [filename, fileHash(filename)])) });
const extension = read('src/data/course-path-extension.json');
const blueprintData = read('src/data/instructional-lesson-blueprints.json');
const course = read('src/data/v3-original-course.json');
const entries = [...read('src/data/v3-verified-lexicon.json').entries,
  ...read('src/data/lexical-expansion.json').map(entry => ({ ...entry,
    display: toInaliOrthography(entry.sourceSpelling.replace(/\(ø\)/g,'').replace(/[/?¿]/g,'')).trim(),
    meaningEn: entry.english, meaningEs: entry.spanish }))].map(entry => {
  // This audit evaluates its immutable original factual-label/source review.
  // Current learner sense selections are independently applied by the app.
  const correction = reviewedHistoricalVocabularyLabel(entry.id, entry.meaningEn, entry.meaningEs);
  return correction ? { ...entry, meaningEn: correction.meaningEn, meaningEs: correction.meaningEs } : entry;
});
const baseline = read(path.join(directory, 'completion-baseline-sense-review.private.json'));
const reviews = [...baseline.rows];
const lessonMap = new Map(blueprintData.lessons.map(lesson => [lesson.unitId, lesson]));
const phraseMap = new Map([...course.phrases, ...blueprintData.supplementPhrases].map(phrase => [phrase.id, phrase]));
const proposalPaths = process.argv.flatMap((value, index) => value === '--proposal' ? [process.argv[index + 1]] : []);
const proposalHashes = new Set(proposalPaths.map(filename => createHash('sha256').update(fs.readFileSync(filename)).digest('hex')));
// Published coverage needs the separate approval, not the author's draft verdict.
const stagedReviews = fs.readdirSync(directory)
  .filter(filename => /^current-.*-(sense-review|parent-review)\.private\.json$/.test(filename))
  .flatMap(filename => {
    const review = read(path.join(directory, filename));
    const independentlyApproved = review.status?.startsWith('independently-reviewed');
    if (!independentlyApproved && !proposalHashes.has(review.proposalSha256)) return [];
    const proposalName = filename.replace(/-(sense-review|parent-review)\.private\.json$/, '-proposal.private.json');
    const candidates = [path.join(directory, proposalName), path.join(directory, '../grammar', proposalName)];
    const matching = candidates.find(candidate => fs.existsSync(candidate)
      && createHash('sha256').update(fs.readFileSync(candidate)).digest('hex') === review.proposalSha256);
    if (!matching) throw Error(`Approved review lost its exact proposal: ${filename}`);
    return review.rows ?? [];
  });
for (const filename of proposalPaths) {
  const proposal = read(filename);
  for (const phrase of proposal.newPhrases ?? []) phraseMap.set(phrase.id, phrase);
  for (const blueprint of proposal.blueprints ?? []) lessonMap.set(blueprint.unitId, { unitId: blueprint.unitId,
    blueprint: mergeCohortBlueprints(lessonMap.get(blueprint.unitId)?.blueprint, blueprint) });
}
reviews.push(...stagedReviews.filter(review => review.approvedContextPhraseIds.some(id => phraseMap.has(id))));
const result = auditInstructionalCompletion({ assignments: extension.lessons, frozenAssignments: baseline.frozenAssignments,
  entries, phrases: [...phraseMap.values()], lessons: [...lessonMap.values()], reviews, labelEquivalences });
result.factualLabelRedraftReview = { path: labelReviewPath, sha256: labelReviewSha256, entryIds: labelEquivalences.map(row => row.entryId),
  learnerContextOverlaySha256: fileHash('src/data/reviewed-context-labels.json'), accuracyHoldsChanged: false };
result.publicationState = !proposalPaths.length ? 'current-published-only' : 'unpublished-proposal-included';
if (proposalPaths.length) result.proposalPaths = proposalPaths;
result.inputs = Object.fromEntries(['src/data/course-path-extension.json', 'src/data/instructional-lesson-blueprints.json', 'src/data/v3-verified-lexicon.json', 'src/data/reviewed-vocabulary-labels.json'].map(filename => [filename, createHash('sha256').update(fs.readFileSync(filename)).digest('hex')]));
result.unpublishedReviewRowsDeferred = stagedReviews.filter(review => !review.approvedContextPhraseIds.some(id => phraseMap.has(id))).length;
if (process.argv.includes('--write')) fs.writeFileSync(path.join(directory, 'independent-current-cohort-completion-audit.private.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.counts, null, 2));
if (result.errors.length) console.log(JSON.stringify(result.errors.slice(0, 8), null, 2));
if (result.errors.length || process.argv.includes('--require-complete') && result.counts.pendingEntries) process.exitCode = 1;
