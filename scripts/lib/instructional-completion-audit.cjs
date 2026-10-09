const { createHash } = require('node:crypto');
const { toInaliOrthography } = require('../../public/nahuatl-orthography.js');

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const phraseHash = phrase => sha({ nahuatl: phrase.nahuatl, english: phrase.english, spanish: phrase.spanish });
const normalize = value => toInaliOrthography(String(value ?? '')).normalize('NFC').toLowerCase().replace(/[.,!?¿¡:;“”"']/g, '').trim().replace(/\s+/g, ' ');
const contains = (phrase, form) => Boolean(normalize(form)) && (` ${normalize(phrase)} `).includes(` ${normalize(form)} `);
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && a.every(id => b.includes(id));

/** A pinned individual source review can authorize only its exact old/new label pairs. */
function verifiedLabelEquivalences({ reviewSource, expectedReviewSha256, labelsSource, lexiconSource, contextLabelsSource, primarySourceHashes }) {
  const bytesHash = value => createHash('sha256').update(value).digest('hex');
  if (bytesHash(reviewSource) !== expectedReviewSha256) throw Error('Factual label equivalence review lost its approved hash.');
  const review = JSON.parse(reviewSource);
  if (review.schemaVersion !== 1 || review.status !== 'independent-primary-source-label-review'
    || review.entries?.length !== 18 || new Set(review.entries.map(row => row.entryId)).size !== 18
    || !review.reviewDocument || !review.scope) throw Error('Incomplete individual factual label equivalence review.');
  if (bytesHash(labelsSource) !== review.reviewedLabelsSha256 || bytesHash(lexiconSource) !== review.reviewedLexiconSha256
    || bytesHash(contextLabelsSource) !== review.reviewedContextLabelsSha256) throw Error('Factual label equivalence lost its reviewed data hash.');
  for (const source of review.primarySources ?? []) {
    if (primarySourceHashes[source.file] !== source.sha256) throw Error(`Factual label equivalence lost primary evidence: ${source.file}`);
  }
  if (review.primarySources?.length !== 2) throw Error('Factual label equivalence needs both primary-source identities.');
  const labels = JSON.parse(labelsSource).corrections;
  const entries = JSON.parse(lexiconSource).entries;
  return review.entries.map(row => {
    const entry = entries.find(entry => entry.id === row.entryId);
    const matches = labels.filter(label => label.id === row.entryId);
    const label = matches[0];
    if (!entry || matches.length !== 1 || entry.display !== row.display || label.display !== row.display
      || entry.meaningEn !== row.beforeEn || entry.meaningEs !== row.beforeEs
      || label.beforeEn !== row.beforeEn || label.beforeEs !== row.beforeEs
      || label.meaningEn !== row.meaningEn || label.meaningEs !== row.meaningEs
      || sha(entry.sourceLocator) !== row.sourceLocatorSha256 || !row.sourceUrl || !row.factualScopeReview?.trim()) {
      throw Error(`Factual label equivalence needs its exact individual before/after and source proof: ${row.entryId}`);
    }
    return Object.freeze({ ...row, reviewProofSha256: expectedReviewSha256 });
  });
}

function reviewedMeaningMatches(review, entry, equivalence) {
  if (!entry) return false;
  if (review.selectedMeaningEn === entry.meaningEn && review.selectedMeaningEs === entry.meaningEs) return true;
  return Boolean(equivalence && /^[a-f0-9]{64}$/.test(equivalence.reviewProofSha256)
    && equivalence.entryId === entry.id && equivalence.display === entry.display
    && equivalence.sourceLocatorSha256 === sha(entry.sourceLocator)
    && review.selectedMeaningEn === equivalence.beforeEn && review.selectedMeaningEs === equivalence.beforeEs
    && entry.meaningEn === equivalence.meaningEn && entry.meaningEs === equivalence.meaningEs);
}

function mergeCohortBlueprints(first, next) {
  if (!first) return next;
  if (!sameSet(first.vocabularyIds, next.vocabularyIds)) throw Error('Cannot merge changed cohort membership.');
  const tasks = (a, b) => {
    const result = new Map((a ?? []).map(task => [task.id, task]));
    for (const task of b ?? []) {
      if (result.has(task.id) && JSON.stringify(result.get(task.id)) !== JSON.stringify(task)) throw Error(`Existing task identity changed: ${task.id}`);
      result.set(task.id, task);
    }
    return [...result.values()];
  };
  const mappings = new Map();
  for (const mapping of [...(first.reviewedEntryForms ?? []), ...(next.reviewedEntryForms ?? [])]) {
    const key = `${mapping.entryId}|${mapping.display}`;
    const prior = mappings.get(key);
    if (prior && JSON.stringify(prior.meaning) !== JSON.stringify(mapping.meaning)) throw Error(`Mapped meaning changed: ${key}`);
    mappings.set(key, { ...mapping, phraseIds: [...new Set([...(prior?.phraseIds ?? []), ...mapping.phraseIds])] });
  }
  const covered = [...new Set([...(first.contextCoverage?.coveredEntryIds ?? []), ...(next.contextCoverage?.coveredEntryIds ?? [])])];
  return { ...first, vocabularyIds: [...first.vocabularyIds], contextPhraseIds: [...new Set([...first.contextPhraseIds, ...next.contextPhraseIds])],
    grammarRuleIds: [...new Set([...(first.grammarRuleIds ?? []), ...(next.grammarRuleIds ?? [])])],
    builders: tasks(first.builders, next.builders), dialogues: tasks(first.dialogues, next.dialogues),
    ...(mappings.size ? { reviewedEntryForms: [...mappings.values()] } : {}),
    contextCoverage: { coveredEntryIds: covered, pendingEntryIds: first.vocabularyIds.filter(id => !covered.includes(id)) } };
}

/** Linguistic decisions remain explicit input; text matching never approves a sense. */
function auditInstructionalCompletion({ assignments, frozenAssignments, entries, phrases, lessons, reviews, labelEquivalences = [] }) {
  const errors = [];
  const entryById = new Map(entries.map(entry => [entry.id, entry]));
  const phraseById = new Map(phrases.map(phrase => [phrase.id, phrase]));
  const lessonById = new Map(lessons.map(lesson => [lesson.unitId, lesson.blueprint ?? lesson]));
  const reviewById = new Map();
  const mappedFormsById = new Map();
  const labelEquivalenceById = new Map(labelEquivalences.map(row => [row.entryId, row]));
  if (labelEquivalenceById.size !== labelEquivalences.length) throw Error('Duplicate factual label equivalence identity.');
  for (const review of reviews) {
    const entry = entryById.get(review.entryId);
    const problems = [];
    const reviewedMappings = [];
    if (!reviewedMeaningMatches(review, entry, labelEquivalenceById.get(review.entryId))
      || review.selectedForm && normalize(review.selectedForm) !== normalize(entry.display)) problems.push('selected-sense-changed');
    if (review.decision !== 'compatible-complete-context' || !review.reason?.trim() || !review.sourceEvidence?.length) problems.push('missing-individual-sense-review');
    const approved = [];
    for (const phraseId of review.approvedContextPhraseIds ?? []) {
      const phrase = phraseById.get(phraseId);
      if (!phrase || review.approvedContextPhraseHashes?.[phraseId] !== phraseHash(phrase)) { problems.push(`reviewed-phrase-changed:${phraseId}`); continue; }
      const mappings = (review.approvedEntryForms ?? []).filter(mapping => mapping.entryId === review.entryId && mapping.phraseIds?.includes(phraseId)
        && mapping.display?.trim() && mapping.meaning?.en?.trim() && mapping.meaning?.es?.trim() && contains(phrase.nahuatl, mapping.display));
      if (!contains(phrase.nahuatl, entry?.display) && !mappings.length) { problems.push(`no-exact-whole-form:${phraseId}`); continue; }
      if (mappings.length) reviewedMappings.push([`${review.entryId}|${phraseId}`, mappings]);
      approved.push(phraseId);
    }
    if (problems.length) errors.push({ entryId: review.entryId, reviewProblems: problems });
    else {
      reviewById.set(review.entryId, new Set([...(reviewById.get(review.entryId) ?? []), ...approved]));
      for (const [key, mappings] of reviewedMappings) mappedFormsById.set(key, mappings);
    }
  }
  const frozenById = new Map(frozenAssignments.map(lesson => [lesson.progressId, lesson]));
  if (new Set(assignments.map(lesson => lesson.progressId)).size !== assignments.length
    || new Set(assignments.map(lesson => lesson.lessonNumber)).size !== assignments.length) errors.push({ problem: 'duplicate-cohort-route-or-identity' });
  if (!sameSet(assignments.map(lesson => lesson.progressId), frozenAssignments.map(lesson => lesson.progressId))) errors.push({ problem: 'frozen-cohort-identity-changed' });
  const assignedEntries = assignments.flatMap(lesson => lesson.entryIds);
  if (new Set(assignedEntries).size !== assignedEntries.length) errors.push({ problem: 'entry-assigned-to-multiple-cohorts' });
  const rows = [];
  const cohorts = assignments.map(assignment => {
    const frozen = frozenById.get(assignment.progressId);
    const blueprint = lessonById.get(assignment.progressId);
    if (!frozen || frozen.lessonNumber !== assignment.lessonNumber || !sameSet(frozen.entryIds, assignment.entryIds)) errors.push({ cohortId: assignment.progressId, problem: 'frozen-route-or-membership-changed' });
    if (blueprint && !sameSet(assignment.entryIds, blueprint.vocabularyIds)) errors.push({ cohortId: assignment.progressId, problem: 'introduced-vocabulary-does-not-match-assigned-membership' });
    const cohortRows = assignment.entryIds.map(entryId => {
      const entry = entryById.get(entryId);
      if (!entry) errors.push({ entryId, problem: 'missing-assigned-entry' });
      const approved = reviewById.get(entryId) ?? new Set();
      const allowedForms = phraseId => [entry?.display, ...(mappedFormsById.get(`${entryId}|${phraseId}`) ?? []).filter(mapping =>
        blueprint?.reviewedEntryForms?.some(published => published.entryId === entryId && published.display === mapping.display
          && published.meaning.en === mapping.meaning.en && published.meaning.es === mapping.meaning.es && published.phraseIds.includes(phraseId))).map(mapping => mapping.display)];
      const compatiblePhrase = phraseId => approved.has(phraseId) && allowedForms(phraseId).some(form => contains(phraseById.get(phraseId)?.nahuatl, form));
      const contexts = (blueprint?.contextPhraseIds ?? []).filter(compatiblePhrase);
      const builders = (blueprint?.builders ?? []).flatMap(builder => [builder.phraseId, ...(builder.acceptedPhraseIds ?? [])]
        .filter(compatiblePhrase).map(phraseId => ({ builderId: builder.id, phraseId })));
      const gaps = [];
      for (const dialogue of blueprint?.dialogues ?? []) for (const turn of dialogue.turns) {
        if (!compatiblePhrase(turn.phraseId)) continue;
        const phrase = phraseById.get(turn.phraseId);
        const tokens = phrase.nahuatl.trim().split(/\s+/);
        for (const gap of turn.gaps) {
          const indexes = gap.tokenIndexes;
          if (!indexes.length || indexes.some((value, index) => !Number.isInteger(value) || value < 0 || value >= tokens.length || index > 0 && value !== indexes[index - 1] + 1)) {
            errors.push({ cohortId: assignment.progressId, gapId: gap.id, problem: 'invalid-graded-span' }); continue;
          }
          const span = indexes.map(index => tokens[index]).join(' ');
          if (!allowedForms(turn.phraseId).some(form => normalize(span) === normalize(form))) continue;
          if (gap.entryId && gap.entryId !== entryId) {
            // Two reference pieces can legitimately map to the same whole word.
            // Each separately identified gap belongs to its own reviewed entry.
            const owner = entryById.get(gap.entryId);
            const ownerForms = [owner?.display, ...(mappedFormsById.get(`${gap.entryId}|${turn.phraseId}`) ?? [])
              .filter(mapping => blueprint?.reviewedEntryForms?.some(published => published.entryId === gap.entryId
                && published.display === mapping.display && published.meaning.en === mapping.meaning.en
                && published.meaning.es === mapping.meaning.es && published.phraseIds.includes(turn.phraseId)))
              .map(mapping => mapping.display)];
            if (!assignment.entryIds.includes(gap.entryId) || !reviewById.get(gap.entryId)?.has(turn.phraseId)
              || !ownerForms.some(form => normalize(span) === normalize(form))) errors.push({ gapId: gap.id, problem: 'wrong-gap-review-identity' });
            continue;
          }
          gaps.push({ dialogueId: dialogue.id, turnId: turn.id, gapId: gap.id, phraseId: turn.phraseId, span,
            mode: normalize(span) === normalize(entry?.display) ? 'exact-citation-form' : 'individually-reviewed-mapped-form' });
        }
      }
      const introduced = Boolean(blueprint?.vocabularyIds.includes(entryId));
      const complete = introduced && contexts.length > 0 && builders.length > 0 && gaps.length > 0;
      const contextualProduction = introduced && contexts.length > 0 && (builders.length > 0 || gaps.length > 0);
      const row = { entryId, cohortId: assignment.progressId, lessonNumber: assignment.lessonNumber,
        display: entry?.display, meaningEn: entry?.meaningEn, partOfSpeech: entry?.partOfSpeech,
        introduced, reviewedContextPhraseIds: contexts, builders, finalExactGradedGaps: gaps,
        complete, contextualProduction, missing: [!introduced && 'introduction', !contexts.length && 'same-cohort-reviewed-selected-sense-context', !builders.length && 'same-cohort-builder', !gaps.length && 'same-cohort-final-exact-graded-gap'].filter(Boolean) };
      rows.push(row); return row;
    });
    return { cohortId: assignment.progressId, lessonNumber: assignment.lessonNumber, assigned: assignment.entryIds.length,
      complete: cohortRows.every(row => row.complete), completeEntryIds: cohortRows.filter(row => row.complete).map(row => row.entryId),
      pendingEntryIds: cohortRows.filter(row => !row.complete).map(row => row.entryId),
      state: !blueprint ? 'word-only' : cohortRows.every(row => row.complete) ? 'complete' : 'partial' };
  });
  return { schemaVersion: 1, scope: 'Independent same-assigned-cohort selected-sense, introduction, context, builder and final graded-gap audit; no linguistic decisions inferred from matching words.',
    counts: { cohorts: cohorts.length, assignedEntries: rows.length, completeCohorts: cohorts.filter(row => row.complete).length,
      partialCohorts: cohorts.filter(row => row.state === 'partial').length, wordOnlyCohorts: cohorts.filter(row => row.state === 'word-only').length,
      completeEntries: rows.filter(row => row.complete).length, pendingEntries: rows.filter(row => !row.complete).length,
      exactCitationProductionEntries: rows.filter(row => row.complete && row.finalExactGradedGaps.some(gap => gap.mode === 'exact-citation-form')).length,
      mappedFormProductionEntries: rows.filter(row => row.complete && row.finalExactGradedGaps.some(gap => gap.mode === 'individually-reviewed-mapped-form')).length,
      contextualProductionEntries: rows.filter(row => row.contextualProduction).length, validationErrors: errors.length }, errors, cohorts, rows };
}
module.exports = { auditInstructionalCompletion, mergeCohortBlueprints, phraseHash, normalize, contains, verifiedLabelEquivalences };
