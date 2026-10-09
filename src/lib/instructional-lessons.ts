import "server-only";
import reviewed from "@/data/v3-original-course.json";
import instructional from "@/data/instructional-lesson-blueprints.json";
import type { GuidedInteractiveBlueprint } from "@/components/guided-interactive-lesson";
import type { ExpansionCourse, ExpansionPhrase } from "@/lib/expansion-course";
import { reviewedContextBlueprint, reviewedContextPhrase } from "@/lib/reviewed-context-labels";
import { getLearnerSenseExclusionReason, isLearnerEntryExcluded } from "@/lib/app-content-safety";
import learnerExclusions from "@/data/app-content-exclusions.json";

const course: ExpansionCourse = { ...reviewed as ExpansionCourse,
  phrases: ([...reviewed.phrases, ...instructional.supplementPhrases] as ExpansionCourse["phrases"]).map(reviewedContextPhrase),
  rules: [...reviewed.rules, ...instructional.supplementRules],
  units: [...reviewed.units, ...instructional.supplementUnits] as ExpansionCourse["units"],
  sources: [...reviewed.sources, ...instructional.supplementSources] };

function learnerPhraseExcluded(phrase: ExpansionPhrase): boolean {
  if (learnerExclusions.learnerPhraseExclusions.some(item => item.phraseId === phrase.id)) return true;
  // The user selected only the old-clothing sense for this unchanged word ID.
  // Its separately authored diaper sentence must not survive that selection.
  if (phrase.id === "object-frame-word-v3d-3f775b3f819cecff") return true;
  const excludedComponent = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    return Object.entries(value).some(([key, item]) =>
      ((key === "approvedLexiconEntryId" || key === "lexicalEntryId") && typeof item === "string" && isLearnerEntryExcluded(item)) ||
      (typeof item === "object" && excludedComponent(item)));
  };
  if (excludedComponent(phrase.sourceLocator)) return true;
  return Boolean(getLearnerSenseExclusionReason([phrase.sourceLocator.lexicalEntryId,
    phrase.english, phrase.spanish]));
}
const excludedPhraseIds = new Set(course.phrases.filter(learnerPhraseExcluded).map(phrase => phrase.id));
export function getExcludedLearnerPhraseIds(): string[] { return [...excludedPhraseIds]; }
const excludedRuleIds = new Set([
  ...learnerExclusions.learnerRuleExclusions.map(rule => rule.ruleId),
  ...course.rules.filter(rule => rule.phraseIds.length > 0 && rule.phraseIds.every(id => excludedPhraseIds.has(id)))
    .map(rule => rule.id),
]);
function selectedRuleExplanation(rule: ExpansionCourse["rules"][number]) {
  const projection = learnerExclusions.learnerRuleTextProjections.find(item => item.ruleId === rule.id);
  if (!projection) return rule;
  if (rule.explanation.en !== projection.before.en || rule.explanation.es !== projection.before.es)
    throw new Error(`Learner explanation omission lost its reviewed original text: ${rule.id}`);
  return { ...rule, explanation: { ...projection.after } };
}

/** Remove the selected content and its complete dependent tasks; never change its meaning. */
export function learnerInstructionalBlueprint(blueprint: GuidedInteractiveBlueprint): GuidedInteractiveBlueprint {
  const safePhrase = (id: string) => !excludedPhraseIds.has(id);
  const safeText = (...text: Array<string | null | undefined>) => !getLearnerSenseExclusionReason(text);
  const dialogues = blueprint.dialogues.flatMap(dialogue => {
    if (!safeText(dialogue.context.en, dialogue.context.es, dialogue.title.en, dialogue.title.es, dialogue.feedback.en, dialogue.feedback.es)) return [];
    const safeTurn = (turn: typeof dialogue.turns[number]) => safePhrase(turn.phraseId) &&
      turn.gaps.every(gap => (!gap.entryId || !isLearnerEntryExcluded(gap.entryId)) &&
        (gap.answerPhraseIds ?? []).every(safePhrase));
    if (dialogue.turns.every(safeTurn)) return [dialogue];
    // Authored independent question/answer pairs can be omitted as complete
    // exchanges, preserving each other pair's wording and turn identities.
    const independentPairs = dialogue.turns.length % 2 === 0 && dialogue.turns.every((turn, index) =>
      index % 2 !== 0 || course.phrases.find(phrase => phrase.id === turn.phraseId)?.english.trim().endsWith("?"));
    if (!independentPairs) return [];
    const turns = dialogue.turns.flatMap((turn, index) => index % 2 === 0 &&
      safeTurn(turn) && safeTurn(dialogue.turns[index + 1]) ? [turn, dialogue.turns[index + 1]] : []);
    if (!turns.some(turn => turn.gaps.length > 0)) return [];
    // A mixed scenario can keep mentioning an omitted act even when the
    // surviving exchanges are safe. Keep a scene-specific context only when
    // its exact bilingual omission was reviewed; otherwise use a neutral
    // context grounded in the unchanged cues and retained question/reply pairs.
    const projectedContext = learnerExclusions.learnerDialogueContextProjections.find(item =>
      item.dialogueId === dialogue.id && item.after.en === dialogue.context.en && item.after.es === dialogue.context.es);
    const context = projectedContext ? dialogue.context : {
      en: "Two adults ask and answer the questions shown in this exchange. Each reply concerns the person or item named by its cue.",
      es: "Dos personas adultas hacen y responden las preguntas de este intercambio. Cada respuesta trata de la persona o el objeto nombrado en su indicación.",
    };
    return [{ ...dialogue, context, turns }];
  });
  const removedDialogues = blueprint.dialogues.filter(dialogue => !dialogues.includes(dialogue));
  const lostGapEntries = new Set(removedDialogues.flatMap(dialogue => dialogue.turns.flatMap(turn => turn.gaps.flatMap(gap => gap.entryId ? [gap.entryId] : []))));
  const retainedGapEntries = new Set(dialogues.flatMap(dialogue => dialogue.turns.flatMap(turn => turn.gaps.flatMap(gap => gap.entryId ? [gap.entryId] : []))));
  const lostCoverage = (id: string) => lostGapEntries.has(id) && !retainedGapEntries.has(id);
  return { ...blueprint,
    grammarRuleIds: blueprint.grammarRuleIds.filter(id => !excludedRuleIds.has(id)),
    vocabularyIds: blueprint.vocabularyIds.filter(id => !isLearnerEntryExcluded(id)),
    contextPhraseIds: blueprint.contextPhraseIds.filter(safePhrase),
    builders: blueprint.builders.filter(builder => safePhrase(builder.phraseId) &&
      safeText(builder.prompt.en, builder.prompt.es, builder.feedback.en, builder.feedback.es))
      .map(builder => ({ ...builder, ...(builder.acceptedPhraseIds ? { acceptedPhraseIds: builder.acceptedPhraseIds.filter(safePhrase) } : {}) })),
    dialogues,
    ...(blueprint.reviewedEntryForms ? { reviewedEntryForms: blueprint.reviewedEntryForms
      .filter(mapped => !isLearnerEntryExcluded(mapped.entryId) && mapped.phraseIds.every(safePhrase)) } : {}),
    ...(blueprint.contextCoverage ? { contextCoverage: {
      coveredEntryIds: blueprint.contextCoverage.coveredEntryIds.filter(id => !isLearnerEntryExcluded(id) && !lostCoverage(id)),
      pendingEntryIds: [...new Set([...blueprint.contextCoverage.pendingEntryIds,
        ...blueprint.contextCoverage.coveredEntryIds.filter(lostCoverage)])].filter(id => !isLearnerEntryExcluded(id)),
    } } : {}),
  };
}
const learnerBlueprints = new Map<string, GuidedInteractiveBlueprint>();
function selectedBlueprint(unitId: string, blueprint: GuidedInteractiveBlueprint) {
  let selected = learnerBlueprints.get(unitId);
  if (!selected) {
    const reviewed = reviewedContextBlueprint(unitId, blueprint);
    const dialogues = reviewed.dialogues.map(dialogue => {
      const projection = learnerExclusions.learnerDialogueContextProjections.find(item =>
        item.unitId === unitId && item.dialogueId === dialogue.id);
      if (!projection) return dialogue;
      if (dialogue.context.en !== projection.before.en || dialogue.context.es !== projection.before.es)
        throw new Error(`Learner context omission lost its reviewed original text: ${dialogue.id}`);
      return { ...dialogue, context: { ...projection.after } };
    });
    selected = learnerInstructionalBlueprint({ ...reviewed, dialogues });
    learnerBlueprints.set(unitId, selected);
  }
  return selected;
}

export function getSupplementalInstructionalUnits() { return instructional.supplementUnits as ExpansionCourse["units"]; }

/** Send only the chosen lesson's reviewed material to the browser. */
export function getInstructionalLessonPayload(unitId: string) {
  const spec = instructional.lessons.find(lesson => lesson.unitId === unitId);
  const sourceUnit = course.units.find(unit => unit.id === unitId);
  const unit = sourceUnit ? { ...sourceUnit, phraseIds: sourceUnit.phraseIds.filter(id => !excludedPhraseIds.has(id)),
    ruleIds: sourceUnit.ruleIds.filter(id => !excludedRuleIds.has(id)),
    steps: sourceUnit.steps.filter(step => ![step.phraseId, ...step.choices, ...step.answerPhraseIds]
      .some(id => id && excludedPhraseIds.has(id))) } : undefined;
  if (!spec) return null;
  const blueprint = selectedBlueprint(unitId, spec.blueprint as GuidedInteractiveBlueprint);
  const phraseCatalog = new Set(course.phrases.map(phrase=>phrase.id));
  const phraseIds = new Set([...(unit?.phraseIds ?? []), ...blueprint.vocabularyIds.filter(id=>phraseCatalog.has(id)), ...blueprint.contextPhraseIds,
    ...(unit?.steps.flatMap(step => [...step.choices, ...step.answerPhraseIds, ...(step.phraseId ? [step.phraseId] : [])]) ?? []),
    ...blueprint.builders.flatMap(builder => [builder.phraseId, ...(builder.acceptedPhraseIds ?? [])]),
    ...blueprint.dialogues.flatMap(dialogue => dialogue.turns.flatMap(turn => [turn.phraseId, ...turn.gaps.flatMap(gap => gap.answerPhraseIds ?? [])]))]);
  const ruleIds = new Set([...(unit?.ruleIds ?? []), ...blueprint.grammarRuleIds]);
  const rules = course.rules.filter(rule => ruleIds.has(rule.id)).map(selectedRuleExplanation)
    .map(rule=>({...rule,phraseIds:rule.phraseIds.filter(id=>phraseIds.has(id))}));
  const phrases = course.phrases.filter(phrase => phraseIds.has(phrase.id) && !excludedPhraseIds.has(phrase.id));
  if (phrases.length !== phraseIds.size || rules.length !== ruleIds.size) throw new Error("The contextual lesson contains an unresolved reviewed record.");
  const sourceIds = new Set([...phrases.map(phrase => phrase.sourceId), ...rules.flatMap(rule => rule.sourceIds)]);
  const selected: ExpansionCourse = { ...course, sources: course.sources.filter(source => sourceIds.has(source.id)),
    phrases, rules, units: unit ? [unit] : [], coverage: [] };
  return { course: selected, unit, blueprint };
}

export function getInstructionalLessonSummary(unitId: string) {
  const spec = instructional.lessons.find(lesson => lesson.unitId === unitId);
  const blueprint = spec ? selectedBlueprint(unitId, spec.blueprint as GuidedInteractiveBlueprint) : null;
  return blueprint ? { contextCount: blueprint.contextPhraseIds.length,
    builderCount: blueprint.builders.length, conversationCount: blueprint.dialogues.length,
    ruleCount: blueprint.grammarRuleIds.length, coverage: blueprint.contextCoverage,
    dialogueTurnCount: blueprint.dialogues.reduce((count, dialogue) => count + dialogue.turns.length, 0) } : null;
}
