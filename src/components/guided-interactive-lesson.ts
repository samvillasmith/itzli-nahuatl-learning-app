import type { AppLocale } from "@/i18n/config";
import { normalizeExpansionResponse, type ExpansionCourse, type ExpansionText } from "@/lib/expansion-course";
import type { UnifiedVocabularyEntry } from "@/lib/unified-course-path";
import type { GuidedForm, GuidedLearnCard } from "./guided-path-lesson-content";

export type GuidedInteractiveBlueprint = {
  id: string;
  vocabularyIds: string[];
  contextPhraseIds: string[];
  grammarRuleIds: string[];
  /** Individually reviewed complete forms of a citation word, tied to specific sentences. */
  reviewedEntryForms?: { entryId: string; display: string; meaning: ExpansionText; phraseIds: string[] }[];
  contextCoverage?: { coveredEntryIds: string[]; pendingEntryIds: string[] };
  builders: {
    id: string; phraseId: string; acceptedPhraseIds?: string[]; chunks?: string[];
    prompt: ExpansionText; feedback: ExpansionText;
  }[];
  dialogues: {
    id: string; title: ExpansionText; context: ExpansionText; feedback: ExpansionText;
    turns: {
      id: string; speaker: ExpansionText; cue?: ExpansionText; phraseId: string;
      gaps: { id: string; tokenIndexes: number[]; answerPhraseIds?: string[]; entryId?: string }[];
    }[];
  }[];
};
export type GuidedTile = { id: string; label: string; value: string };
export type GuidedBuilder = {
  id: string; prompt: string; feedback: string; answers: GuidedForm[];
  tiles: GuidedTile[]; separator: " " | ""; kind: "words" | "chunks";
};
export type GuidedDialogueGap = { id: string; tokenIndexes: number[]; answer: string; acceptedAnswers: string[]; entryId: string | null };
export type GuidedDialogueTurn = { id: string; speaker: string; cue: string | null; form: GuidedForm; tokens: string[]; gaps: GuidedDialogueGap[] };
export type GuidedDialogue = { id: string; title: string; context: string; feedback: string; turns: GuidedDialogueTurn[] };
export type GuidedInteractiveContent = {
  revision: string; vocabulary: GuidedForm[]; context: GuidedForm[];
  grammar: Extract<GuidedLearnCard, { kind: "rule" }>[]; builders: GuidedBuilder[]; dialogues: GuidedDialogue[];
  contextCoverage?: { coveredEntryIds: string[]; pendingEntryIds: string[] };
};

function assertUnique(ids: readonly string[], label: string) {
  if (ids.some(id => !id.trim()) || new Set(ids).size !== ids.length) throw new Error(`Invalid or repeated ${label}`);
}
function phraseTokens(value: string) {
  const tokens = value.trim().split(/\s+/);
  if (!value.trim() || tokens.some(token => !token)) throw new Error("Empty reviewed phrase");
  return tokens;
}

/** Stable identities distinguish repeated words; the bank contains only reviewed material. */
export function reviewedBuilderTiles(id: string, answers: readonly string[], chunks?: readonly string[]): { tiles: GuidedTile[]; separator: " " | ""; kind: "words" | "chunks" } {
  if (!answers.length) throw new Error("A builder needs a reviewed answer");
  if (chunks && (chunks.length < 2 || chunks.some(chunk => !chunk.trim()) || chunks.join("") !== answers[0])) throw new Error("Reviewed chunks must reconstruct the exact source form");
  const values: string[] = [];
  if (chunks) values.push(...chunks);
  else {
    const maximum = new Map<string, number>();
    for (const answer of answers) {
      const occurrence = new Map<string, number>();
      for (const token of phraseTokens(answer)) {
        const key = normalizeExpansionResponse(token);
        occurrence.set(key, (occurrence.get(key) ?? 0) + 1);
        if ((occurrence.get(key) ?? 0) > (maximum.get(key) ?? 0)) { values.push(token); maximum.set(key, occurrence.get(key)!); }
      }
    }
  }
  const canonical = values.map((value, index) => ({ id: `${id}:tile:${index}`, label: value.trim(), value }));
  // A reproducible reverse-and-rotate order does not leak the answer order.
  const shuffled = [...canonical].reverse();
  if (shuffled.length > 2) shuffled.push(shuffled.shift()!);
  return { tiles: shuffled, separator: chunks ? "" : " ", kind: chunks ? "chunks" : "words" };
}

export function builderSelectionText(builder: GuidedBuilder, selectedIds: readonly string[]): string | null {
  if (new Set(selectedIds).size !== selectedIds.length) return null;
  const byId = new Map(builder.tiles.map(tile => [tile.id, tile.value]));
  if (selectedIds.some(id => !byId.has(id))) return null;
  return selectedIds.map(id => byId.get(id)!).join(builder.separator);
}
export function guidedBuilderMatches(builder: GuidedBuilder, selectedIds: readonly string[]): boolean {
  const answer = builderSelectionText(builder, selectedIds);
  if (answer === null || !answer.trim()) return false;
  return builder.answers.some(form => normalizeExpansionResponse(form.display) === normalizeExpansionResponse(answer));
}
export function gradeGuidedDialogue(dialogue: GuidedDialogue, answers: Readonly<Record<string, string>>): { correct: boolean; gaps: Record<string, boolean> } {
  const gaps = Object.fromEntries(dialogue.turns.flatMap(turn => turn.gaps.map(gap => [gap.id,
    Boolean(normalizeExpansionResponse(answers[gap.id] ?? "")) && gap.acceptedAnswers.some(answer => normalizeExpansionResponse(answer) === normalizeExpansionResponse(answers[gap.id] ?? ""))])));
  return { correct: Object.keys(gaps).length > 0 && Object.values(gaps).every(Boolean), gaps };
}

export type GuidedAttemptLedger = { firstAnswers: Record<string, boolean>; correct: number };
/** Reveals and retries cannot change the first-attempt score or create extra review attempts. */
export function recordGuidedFirstAttempt(ledger: GuidedAttemptLedger, taskId: string, correct: boolean): { ledger: GuidedAttemptLedger; firstAttempt: boolean } {
  if (Object.hasOwn(ledger.firstAnswers, taskId)) return { ledger, firstAttempt: false };
  return { ledger: { firstAnswers: { ...ledger.firstAnswers, [taskId]: correct }, correct: ledger.correct + Number(correct) }, firstAttempt: true };
}

/** The selected lesson payload is resolved strictly; no phrase, conjugation or audio is generated here. */
export function interactiveLessonContent(course: ExpansionCourse, entries: readonly UnifiedVocabularyEntry[], blueprint: GuidedInteractiveBlueprint, locale: AppLocale,
  form: (id: string) => GuidedForm, rule: (id: string) => Extract<GuidedLearnCard, { kind: "rule" }>): GuidedInteractiveContent {
  assertUnique(blueprint.vocabularyIds, "vocabulary identities");
  assertUnique(blueprint.contextPhraseIds, "context phrase identities");
  assertUnique(blueprint.grammarRuleIds, "grammar identities");
  assertUnique([...blueprint.builders.map(item => item.id), ...blueprint.dialogues.map(item => item.id)], "interactive task identities");
  if (!blueprint.id.trim() || !blueprint.vocabularyIds.length || !blueprint.contextPhraseIds.length || !blueprint.grammarRuleIds.length || !blueprint.builders.length || !blueprint.dialogues.length) throw new Error("Incomplete contextual lesson blueprint");
  const phraseById = new Map(course.phrases.map(item => [item.id, item]));
  const entryById = new Map(entries.map(item => [item.id, item]));
  const mappedForms = blueprint.reviewedEntryForms ?? [];
  const containsForm = (sentence: string, word: string) => (` ${normalizeExpansionResponse(sentence)} `).includes(` ${normalizeExpansionResponse(word)} `);
  assertUnique(mappedForms.map(item => `${item.entryId}:${normalizeExpansionResponse(item.display)}`), "reviewed entry forms");
  for (const mapped of mappedForms) {
    if (!entryById.has(mapped.entryId) || !mapped.display.trim() || !mapped.meaning.en.trim() || !mapped.meaning.es.trim() || !mapped.phraseIds.length) throw new Error("Invalid reviewed entry form");
    assertUnique(mapped.phraseIds, "reviewed entry form sentence identities");
    if (mapped.phraseIds.some(id => !phraseById.has(id) || !containsForm(phraseById.get(id)!.nahuatl, mapped.display))) throw new Error("A reviewed entry form needs its exact complete form in each selected sentence");
  }
  const approvedEntryForm = (entryId: string, phraseId: string, answer: string) => {
    const entry = entryById.get(entryId);
    return Boolean(entry && (normalizeExpansionResponse(entry.display) === normalizeExpansionResponse(answer)
      || mappedForms.some(mapped => mapped.entryId === entryId && mapped.phraseIds.includes(phraseId)
        && normalizeExpansionResponse(mapped.display) === normalizeExpansionResponse(answer))));
  };
  if (blueprint.contextCoverage) {
    const ids = [...blueprint.contextCoverage.coveredEntryIds, ...blueprint.contextCoverage.pendingEntryIds];
    assertUnique(ids, "context coverage identities");
    if (entryById.size !== entries.length || ids.length !== entries.length || ids.some(id => !entryById.has(id)) || !blueprint.contextCoverage.coveredEntryIds.length) throw new Error("Context coverage must partition every assigned word and cover at least one");
    if (blueprint.vocabularyIds.length !== entries.length || blueprint.vocabularyIds.some(id => !entryById.has(id))) throw new Error("A word cohort must introduce every assigned word");
  }
  const contextualForm = (id: string) => {
    if (!phraseById.has(id)) throw new Error(`Unreviewed sentence identity: ${id}`);
    const result = form(id);
    if (result.buildingBlock) throw new Error(`A reference form cannot become a sentence: ${id}`);
    return result;
  };
  const builders = blueprint.builders.map(item => {
    const ids = [item.phraseId, ...(item.acceptedPhraseIds ?? []).filter(id => id !== item.phraseId)];
    assertUnique(ids, "builder answer identities");
    const answers = ids.map(contextualForm);
    if (answers.slice(1).some(answer => answer.meaning !== answers[0].meaning)) throw new Error("Reviewed builder alternatives must have the same intended meaning");
    return { id: item.id, prompt: item.prompt[locale], feedback: item.feedback[locale], answers,
      ...reviewedBuilderTiles(item.id, answers.map(answer => answer.display), item.chunks) };
  });
  const gapIds: string[] = [];
  const dialogues = blueprint.dialogues.map(item => {
    assertUnique(item.turns.map(turn => turn.id), "speaker turn identities");
    if (item.turns.length < 2 || !item.turns.some(turn => turn.gaps.length)) throw new Error("A conversation needs context and a graded speaker turn");
    const turns = item.turns.map(turn => {
      const reviewed = contextualForm(turn.phraseId);
      const tokens = phraseTokens(reviewed.display);
      const occupied = new Set<number>();
      const gaps = turn.gaps.map(gap => {
        gapIds.push(gap.id);
        const indexes = gap.tokenIndexes;
        if (!indexes.length || indexes.some((index, position) => !Number.isInteger(index) || index < 0 || index >= tokens.length || (position > 0 && index !== indexes[position - 1] + 1) || occupied.has(index))) throw new Error("A dialogue gap must be a disjoint contiguous span of the reviewed turn");
        indexes.forEach(index => occupied.add(index));
        const answer = indexes.map(index => tokens[index]).join(" ");
        const alternatives = (gap.answerPhraseIds ?? []).map(id => contextualForm(id).display);
        if (alternatives.some(alternative => normalizeExpansionResponse(alternative) !== normalizeExpansionResponse(answer))) throw new Error("A dialogue alternative lacks exact reviewed equivalence to its source span");
        if (gap.entryId && !approvedEntryForm(gap.entryId, turn.phraseId, answer)) throw new Error("A dialogue gap cannot invent a vocabulary review identity or an unreviewed complete form");
        return { id: gap.id, tokenIndexes: [...indexes], answer, acceptedAnswers: [answer, ...alternatives], entryId: gap.entryId ?? null };
      });
      return { id: turn.id, speaker: turn.speaker[locale], cue: turn.cue?.[locale] ?? null, form: reviewed, tokens, gaps };
    });
    return { id: item.id, title: item.title[locale], context: item.context[locale], feedback: item.feedback[locale], turns };
  });
  assertUnique(gapIds, "conversation gap identities");
  if (blueprint.contextCoverage) {
    for (const id of blueprint.contextCoverage.coveredEntryIds) {
      const word = entryById.get(id)!;
      const hasContext = blueprint.contextPhraseIds.some(phraseId => containsForm(contextualForm(phraseId).display, word.display)
        || mappedForms.some(mapped => mapped.entryId === id && mapped.phraseIds.includes(phraseId) && containsForm(contextualForm(phraseId).display, mapped.display)));
      const hasConversationGap = dialogues.some(dialogue => dialogue.turns.some(turn => turn.gaps.some(gap =>
        (!gap.entryId || gap.entryId === id) && approvedEntryForm(id, turn.form.id, gap.answer))));
      if (!hasContext || !hasConversationGap) throw new Error("A covered word needs its reviewed context and an exact final-conversation gap");
    }
  }
  return { revision: blueprint.id, vocabulary: blueprint.vocabularyIds.map(form), context: blueprint.contextPhraseIds.map(contextualForm),
    grammar: blueprint.grammarRuleIds.map(rule), builders, dialogues,
    ...(blueprint.contextCoverage ? { contextCoverage: { coveredEntryIds: [...blueprint.contextCoverage.coveredEntryIds], pendingEntryIds: [...blueprint.contextCoverage.pendingEntryIds] } } : {}) };
}
