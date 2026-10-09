import corrections from "@/data/reviewed-context-labels.json";
import type { ExpansionPhrase, ExpansionText } from "@/lib/expansion-course";
import type { GuidedInteractiveBlueprint } from "@/components/guided-interactive-lesson";

function sameText(left: ExpansionText, right: ExpansionText): boolean {
  return left.en === right.en && left.es === right.es;
}

/** Only the exact reviewed old pair or its exact new pair can be displayed. */
function correctedText(current: ExpansionText | undefined, before: ExpansionText, after: ExpansionText, identity: string): ExpansionText {
  if (!current || (!sameText(current, before) && !sameText(current, after))) {
    throw new Error(`Reviewed contextual label needs review after source drift: ${identity}`);
  }
  return { ...after };
}

function one<T>(items: readonly T[], match: (item: T) => boolean, identity: string): T {
  const selected = items.filter(match);
  if (selected.length !== 1) throw new Error(`Reviewed contextual label lost its unique target: ${identity}`);
  return selected[0];
}

/** Project learner translations only; retain spelling, media and frozen source evidence. */
export function reviewedContextPhrase(phrase: ExpansionPhrase): ExpansionPhrase {
  const correction = corrections.phrases.find(item => item.id === phrase.id);
  if (!correction) return phrase;
  if (phrase.nahuatl !== correction.nahuatl) throw new Error(`Reviewed contextual label cannot change its Nahuatl form: ${phrase.id}`);
  const meaning = correctedText({ en: phrase.english, es: phrase.spanish }, correction.before, correction.after, phrase.id);
  return { ...phrase, english: meaning.en, spanish: meaning.es };
}

/** Named prompts, cues and form meanings are projected without changing task identities or answers. */
export function reviewedContextBlueprint(unitId: string, blueprint: GuidedInteractiveBlueprint): GuidedInteractiveBlueprint {
  const correction = corrections.lessons.find(item => item.unitId === unitId);
  if (!correction) return blueprint;
  if (blueprint.id !== correction.blueprintId) throw new Error(`Reviewed contextual label needs the expected lesson revision: ${unitId}`);
  const builders = new Map(correction.builders.map(item => {
    const builder = one(blueprint.builders, builder => builder.id === item.id, `${unitId}:${item.id}`);
    if (builder.phraseId !== item.phraseId) throw new Error(`Reviewed contextual label cannot change its builder answer: ${item.id}`);
    return [item.id, correctedText(builder.prompt, item.before, item.after, `${unitId}:${item.id}`)] as const;
  }));
  const turns = new Map(correction.turns.map(item => {
    const dialogue = one(blueprint.dialogues, dialogue => dialogue.id === item.dialogueId, `${unitId}:${item.dialogueId}`);
    const turn = one(dialogue.turns, turn => turn.id === item.id, `${unitId}:${item.dialogueId}:${item.id}`);
    if (turn.phraseId !== item.phraseId) throw new Error(`Reviewed contextual label cannot change its conversation answer: ${item.id}`);
    return [`${item.dialogueId}:${item.id}`, correctedText(turn.cue, item.before, item.after, `${unitId}:${item.dialogueId}:${item.id}`)] as const;
  }));
  const mappings = new Map(correction.mappings.map(item => {
    const mapped = one(blueprint.reviewedEntryForms ?? [], mapped => mapped.entryId === item.entryId && mapped.display === item.display,
      `${unitId}:${item.entryId}:${item.display}`);
    if (JSON.stringify(mapped.phraseIds) !== JSON.stringify(item.phraseIds)) throw new Error(`Reviewed contextual label cannot change its mapped sentences: ${item.entryId}`);
    return [`${item.entryId}:${item.display}`, correctedText(mapped.meaning, item.before, item.after, `${unitId}:${item.entryId}:${item.display}`)] as const;
  }));
  return { ...blueprint,
    builders: blueprint.builders.map(builder => builders.has(builder.id) ? { ...builder, prompt: builders.get(builder.id)! } : builder),
    dialogues: blueprint.dialogues.map(dialogue => ({ ...dialogue,
      turns: dialogue.turns.map(turn => turns.has(`${dialogue.id}:${turn.id}`) ? { ...turn, cue: turns.get(`${dialogue.id}:${turn.id}`)! } : turn) })),
    ...(blueprint.reviewedEntryForms ? { reviewedEntryForms: blueprint.reviewedEntryForms.map(mapped => {
      const meaning = mappings.get(`${mapped.entryId}:${mapped.display}`);
      return meaning ? { ...mapped, meaning } : mapped;
    }) } : {}),
  };
}
