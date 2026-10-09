import { describe, expect, it } from "vitest";
import reviewed from "../src/data/v3-original-course.json";
import instructional from "../src/data/instructional-lesson-blueprints.json";
import corrections from "../src/data/reviewed-context-labels.json";
import { reviewedContextBlueprint, reviewedContextPhrase } from "../src/lib/reviewed-context-labels";
import { expansionMeaning, type ExpansionPhrase } from "../src/lib/expansion-course";
import { getInstructionalLessonPayload } from "../src/lib/instructional-lessons";
import type { GuidedInteractiveBlueprint } from "../src/components/guided-interactive-lesson";
import { guidedInteractiveContent } from "../src/components/guided-path-lesson-content";
import { guidedBuilderMatches, gradeGuidedDialogue } from "../src/components/guided-interactive-lesson";
import { getUnifiedVocabularyEntries } from "../src/lib/unified-course-path";

const originals = [...reviewed.phrases, ...instructional.supplementPhrases] as ExpansionPhrase[];
function originalBlueprint(unitId: string): GuidedInteractiveBlueprint {
  return instructional.lessons.find(lesson => lesson.unitId === unitId)!.blueprint as GuidedInteractiveBlueprint;
}

describe("reviewed context wording preserves source evidence and lesson answers", () => {
  it("projects only seven exact bilingual phrase meanings and is safe to read twice", () => {
    expect(corrections.phrases).toHaveLength(7);
    const before = JSON.stringify(instructional);
    for (const correction of corrections.phrases) {
      const original = originals.find(phrase => phrase.id === correction.id)!;
      const learner = reviewedContextPhrase(original);
      expect({ en: learner.english, es: learner.spanish }).toEqual(correction.after);
      const { english: originalEn, spanish: originalEs, ...originalEvidence } = original;
      const { english: learnerEn, spanish: learnerEs, ...learnerEvidence } = learner;
      expect({ en: originalEn, es: originalEs }).toEqual(correction.before);
      expect({ en: learnerEn, es: learnerEs }).toEqual(correction.after);
      expect(learnerEvidence).toEqual(originalEvidence);
      expect(learner.sourceLocator).toBe(original.sourceLocator);
      expect(reviewedContextPhrase(learner)).toEqual(learner);
      expect(expansionMeaning(original, "en")).toBe(correction.after.en);
      expect(expansionMeaning(learner, "es")).toBe(correction.after.es);
    }
    expect(JSON.stringify(instructional)).toBe(before);
  });
  it("does not rewrite a similarly worded record with another identity", () => {
    const original = originals.find(phrase => phrase.id === corrections.phrases[0].id)!;
    const unrelated = { ...original, id: "an-unreviewed-record-with-the-same-text" };
    expect(reviewedContextPhrase(unrelated)).toBe(unrelated);
  });
  it("rejects changed Nahuatl, changed source wording and partially applied translations", () => {
    const correction = corrections.phrases[0];
    const original = originals.find(phrase => phrase.id === correction.id)!;
    expect(() => reviewedContextPhrase({ ...original, nahuatl: "nopona" })).toThrow(/cannot change its Nahuatl/);
    expect(() => reviewedContextPhrase({ ...original, english: "anywhere" })).toThrow(/source drift/);
    expect(() => reviewedContextPhrase({ ...original, english: correction.after.en })).toThrow(/source drift/);
  });
  it("targets only reviewed builder prompts, speaker cues and selected mapped meanings", () => {
    const rawBefore = JSON.stringify(instructional);
    for (const correction of corrections.lessons) {
      const original = originalBlueprint(correction.unitId);
      const learner = reviewedContextBlueprint(correction.unitId, original);
      expect(learner.id).toBe(original.id);
      expect(learner.vocabularyIds).toBe(original.vocabularyIds);
      expect(learner.contextPhraseIds).toBe(original.contextPhraseIds);
      expect(learner.contextCoverage).toBe(original.contextCoverage);
      expect(learner.grammarRuleIds).toBe(original.grammarRuleIds);
      for (let index = 0; index < original.builders.length; index++) {
        const before = original.builders[index];
        const after = learner.builders[index];
        const change = correction.builders.find(item => item.id === before.id);
        expect(after).toEqual(change ? { ...before, prompt: change.after } : before);
      }
      for (let index = 0; index < original.dialogues.length; index++) {
        const before = original.dialogues[index];
        const after = learner.dialogues[index];
        expect(after).toEqual({ ...before, turns: before.turns.map(turn => {
          const change = correction.turns.find(item => item.dialogueId === before.id && item.id === turn.id);
          return change ? { ...turn, cue: change.after } : turn;
        }) });
      }
      for (let index = 0; index < (original.reviewedEntryForms?.length ?? 0); index++) {
        const before = original.reviewedEntryForms![index];
        const after = learner.reviewedEntryForms![index];
        const change = correction.mappings.find(item => item.entryId === before.entryId && item.display === before.display);
        expect(after).toEqual(change ? { ...before, meaning: change.after } : before);
      }
      expect(reviewedContextBlueprint(correction.unitId, learner)).toEqual(learner);
    }
    expect(JSON.stringify(instructional)).toBe(rawBefore);
  });
  it("retains the inflected first-person hill-location meaning instead of replacing it with the citation gloss", () => {
    const payload = getInstructionalLessonPayload("v3-vocab-nature-004")!;
    const mapped = payload.blueprint.reviewedEntryForms!.find(item => item.entryId === "word-v3pn-f6dcfd90577b3140")!;
    expect(mapped.meaning).toEqual({ en: "I am at the bottom of the hill.", es: "Estoy en la parte de abajo del cerro." });
    expect(mapped.display).toBe("tepetsintlan");
    expect(payload.course.phrases.find(phrase => phrase.id === mapped.phraseIds[0])!.nahuatl).toBe("Tepetsintlan niitstok.");
  });
  it("fails closed if a reviewed lesson revision, prompt, answer identity, cue or mapping drifts", () => {
    const unitId = "v3-vocab-place-004";
    const correction = corrections.lessons.find(item => item.unitId === unitId)!;
    const baseline = originalBlueprint(unitId);
    const changedRevision = { ...baseline, id: `${baseline.id}-changed` };
    expect(() => reviewedContextBlueprint(unitId, changedRevision)).toThrow(/expected lesson revision/);
    for (const key of ["prompt", "phraseId"] as const) {
      const altered = structuredClone(baseline);
      const builder = altered.builders.find(builder => builder.id === correction.builders[0].id)!;
      if (key === "prompt") builder.prompt.en = "different scene";
      else builder.phraseId = "an-unreviewed-answer";
      expect(() => reviewedContextBlueprint(unitId, altered)).toThrow(/source drift|builder answer/);
    }
    const alteredCue = structuredClone(baseline);
    alteredCue.dialogues.find(dialogue => dialogue.id === correction.turns[0].dialogueId)!.turns
      .find(turn => turn.id === correction.turns[0].id)!.cue!.es = "otro significado";
    expect(() => reviewedContextBlueprint(unitId, alteredCue)).toThrow(/source drift/);
    const alteredMapping = structuredClone(baseline);
    alteredMapping.reviewedEntryForms![0].phraseIds = ["different-sentence"];
    expect(() => reviewedContextBlueprint(unitId, alteredMapping)).toThrow(/mapped sentences/);
    const missing = structuredClone(baseline);
    missing.builders = missing.builders.filter(builder => builder.id !== correction.builders[0].id);
    expect(() => reviewedContextBlueprint(unitId, missing)).toThrow(/unique target/);
  });
  it("runs corrected prompts and conversations in both teaching languages while preserving every graded answer", () => {
    const entries = new Map(getUnifiedVocabularyEntries().map(entry => [entry.id, entry]));
    for (const correction of corrections.lessons) {
      const payload = getInstructionalLessonPayload(correction.unitId)!;
      const assigned = payload.blueprint.vocabularyIds.flatMap(id => entries.has(id) ? [entries.get(id)!] : []);
      for (const locale of ["en", "es"] as const) {
        const learner = guidedInteractiveContent(payload.course, assigned, payload.blueprint, locale);
        for (const change of correction.builders) {
          const builder = learner.builders.find(builder => builder.id === change.id)!;
          expect(builder.prompt).toBe(change.after[locale]);
          expect(builder.answers[0].display).toBe(originals.find(phrase => phrase.id === change.phraseId)!.nahuatl);
          const count = payload.blueprint.builders.find(item => item.id === builder.id)!.chunks?.length
            ?? builder.answers[0].display.trim().split(/\s+/).length;
          const sourceOrder = [...builder.tiles].sort((a, b) => Number(a.id.split(":").at(-1)) - Number(b.id.split(":").at(-1))).slice(0, count);
          expect(guidedBuilderMatches(builder, sourceOrder.map(tile => tile.id))).toBe(true);
        }
        for (const change of correction.turns) {
          const dialogue = learner.dialogues.find(dialogue => dialogue.id === change.dialogueId)!;
          const turn = dialogue.turns.find(turn => turn.id === change.id)!;
          expect(turn.cue).toBe(change.after[locale]);
          expect(turn.form.display).toBe(originals.find(phrase => phrase.id === change.phraseId)!.nahuatl);
          const answers = Object.fromEntries(dialogue.turns.flatMap(turn => turn.gaps.map(gap => [gap.id, gap.answer])));
          expect(gradeGuidedDialogue(dialogue, answers).correct).toBe(true);
          expect(gradeGuidedDialogue(dialogue, {}).correct).toBe(false);
        }
      }
    }
  });
});
