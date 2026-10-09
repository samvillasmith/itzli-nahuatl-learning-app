const assert = require('node:assert/strict');

function union(a = [], b = []) { return [...new Set([...a, ...b])]; }
function sameMembers(a, b) { return a.length === b.length && a.every(id => b.includes(id)); }
function records(a = [], b = [], label) {
  const result = new Map(a.map(item => [item.id, item]));
  for (const item of b) {
    if (result.has(item.id)) assert.deepEqual(item, result.get(item.id), `${label} changed an established record: ${item.id}`);
    else result.set(item.id, item);
  }
  return [...result.values()];
}
function mergeForms(forms = []) {
  const result = new Map();
  for (const form of forms) {
    const key = `${form.entryId}|${form.display}`;
    const previous = result.get(key);
    if (previous) {
      assert.deepEqual(form.meaning, previous.meaning, 'A reviewed form cannot silently change meaning');
      result.set(key, { ...previous, phraseIds: union(previous.phraseIds, form.phraseIds) });
    } else result.set(key, structuredClone(form));
  }
  return [...result.values()];
}

/** Append reviewed teaching while preserving established task and cohort identities. */
function mergeReviewedBlueprints(blueprints) {
  const result = new Map();
  for (const incoming of blueprints) {
    const previous = result.get(incoming.unitId);
    if (!previous) {
      const first = structuredClone(incoming);
      if (first.reviewedEntryForms) first.reviewedEntryForms = mergeForms(first.reviewedEntryForms);
      result.set(incoming.unitId, first);
      continue;
    }
    if (previous.contextCoverage || incoming.contextCoverage) {
      assert(previous.contextCoverage && incoming.contextCoverage, 'A cohort cannot lose its explicit coverage partition');
      assert(sameMembers(previous.vocabularyIds, incoming.vocabularyIds), 'An established cohort cannot change vocabulary membership');
    }
    const covered = union(previous.contextCoverage?.coveredEntryIds, incoming.contextCoverage?.coveredEntryIds);
    const forms = mergeForms([...(previous.reviewedEntryForms ?? []), ...(incoming.reviewedEntryForms ?? [])]);
    result.set(incoming.unitId, {
      ...previous, id: incoming.id === previous.id ? `${previous.id}-expanded` : incoming.id,
      vocabularyIds: union(previous.vocabularyIds, incoming.vocabularyIds),
      contextPhraseIds: union(previous.contextPhraseIds, incoming.contextPhraseIds),
      grammarRuleIds: union(previous.grammarRuleIds, incoming.grammarRuleIds),
      builders: records(previous.builders, incoming.builders, 'Builder'),
      dialogues: records(previous.dialogues, incoming.dialogues, 'Conversation'),
      ...(forms.length ? { reviewedEntryForms: forms } : {}),
      ...(previous.contextCoverage ? { contextCoverage: { coveredEntryIds: covered,
        pendingEntryIds: previous.vocabularyIds.filter(id => !covered.includes(id)) } } : {}),
    });
  }
  return [...result.values()];
}

/** Apply an explicit, reviewed wording correction without replacing a task or its answer. */
function applyReviewedFeedbackRevisions(blueprints, revisions) {
  const result = structuredClone(blueprints);
  for (const revision of revisions) {
    const lesson = result.find(item => item.unitId === revision.unitId);
    assert(lesson, 'Feedback revision needs an existing lesson');
    const task = [...lesson.builders, ...lesson.dialogues].find(item => item.id === revision.taskId);
    assert(task, 'Feedback revision needs an existing task');
    assert.deepEqual(task.feedback, revision.expectedFeedback, 'Feedback revision changed its reviewed starting text');
    assert(revision.feedback?.en?.trim() && revision.feedback?.es?.trim(), 'Feedback revision needs both languages');
    task.feedback = structuredClone(revision.feedback);
  }
  return result;
}

/** Revise only a reviewed scene description; retain all speakers, questions and answers. */
function applyReviewedContextRevisions(blueprints, revisions) {
  const result = structuredClone(blueprints);
  const applied = new Set();
  for (const revision of revisions) {
    const matches = result.flatMap(lesson => lesson.dialogues).filter(dialogue => dialogue.id === revision.id);
    assert.equal(matches.length, 1, 'Context revision needs one existing conversation');
    assert(!applied.has(revision.id), 'Context revision cannot repeat a conversation');
    applied.add(revision.id);
    const dialogue = matches[0];
    assert.deepEqual(dialogue.context, revision.oldContext, 'Context revision changed its reviewed starting text');
    assert(revision.newContext?.en?.trim() && revision.newContext?.es?.trim(), 'Context revision needs both languages');
    assert.deepEqual(Object.keys(revision.newContext).sort(), ['en', 'es'], 'Context revision only changes bilingual scene text');
    dialogue.context = structuredClone(revision.newContext);
  }
  return result;
}

module.exports = { mergeReviewedBlueprints, mergeReviewedRecords: records, applyReviewedFeedbackRevisions, applyReviewedContextRevisions };
