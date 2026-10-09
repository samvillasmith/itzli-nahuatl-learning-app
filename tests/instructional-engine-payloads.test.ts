import { describe, expect, it } from "vitest";
import reviewed from "../src/data/v3-original-course.json";
import instructional from "../src/data/instructional-lesson-blueprints.json";
import { getExcludedLearnerPhraseIds, getInstructionalLessonPayload, getSupplementalInstructionalUnits } from "../src/lib/instructional-lessons";
import { getUnifiedVocabularyEntries } from "../src/lib/unified-course-path";
import { guidedInteractiveContent, expressionLessonContent, vocabularyLessonContent } from "../src/components/guided-path-lesson-content";
import { guidedBuilderMatches, gradeGuidedDialogue } from "../src/components/guided-interactive-lesson";

describe("every published contextual lesson can run the complete learning sequence", () => {
  it("resolves every original and supplementary lesson payload in both teaching languages", () => {
    expect(reviewed.units).toHaveLength(46);
    const units = new Map([...reviewed.units, ...getSupplementalInstructionalUnits()].map(unit => [unit.id, unit]));
    const entries = new Map(getUnifiedVocabularyEntries().map(entry => [entry.id, entry]));
    const excludedPhrases = new Set(getExcludedLearnerPhraseIds());
    expect(instructional.lessons.length).toBeGreaterThanOrEqual(100);
    for (const spec of instructional.lessons) {
      const payload = getInstructionalLessonPayload(spec.unitId);
      expect(payload, spec.unitId).not.toBeNull();
      const original = units.get(spec.unitId);
      expect(payload!.unit).toEqual(original);
      expect(payload!.course.units).toEqual(original ? [original] : []);
      expect(payload!.course.phrases.length).toBeLessThan(reviewed.phrases.length);
      const assignedEntries = payload!.blueprint.vocabularyIds.flatMap(id => entries.has(id) ? [entries.get(id)!] : []);
      for (const locale of ["en", "es"] as const) {
        // Match the actual renderer before testing its additional contextual phases.
        const practice = payload!.unit && !payload!.blueprint.contextCoverage
          ? expressionLessonContent(payload!.course, payload!.unit, locale)
          : vocabularyLessonContent(assignedEntries, locale);
        if (payload!.unit && !payload!.blueprint.contextCoverage) {
          expect(practice.practice.length, spec.unitId).toBe(payload!.unit.steps.length);
          expect(practice.learn.filter(card => card.kind === "form").map(card => card.kind === "form" && card.form.id), spec.unitId).toEqual(payload!.unit.phraseIds);
          expect(practice.practice.every(task => task.answers.length > 0), spec.unitId).toBe(true);
        } else {
          expect(practice.practice.filter(task => task.kind === "recall").map(task => task.entryId), spec.unitId).toEqual(assignedEntries.map(entry => entry.id));
          expect(practice.learn.length, spec.unitId).toBe(assignedEntries.length);
        }
        const lesson = guidedInteractiveContent(payload!.course, assignedEntries, payload!.blueprint, locale);
        expect(lesson.vocabulary.length, spec.unitId).toBeGreaterThan(0);
        expect(lesson.context.length, spec.unitId).toBeGreaterThan(0);
        expect(lesson.grammar.length, spec.unitId).toBeGreaterThan(0);
        expect(lesson.builders.length, spec.unitId).toBeGreaterThan(0);
        expect(lesson.dialogues.length, spec.unitId).toBeGreaterThan(0);
        expect(payload!.course.rules.every(rule => rule.phraseIds.every(id => payload!.course.phrases.some(phrase => phrase.id === id)))).toBe(true);
        for (const builder of lesson.builders) {
          expect(builder.tiles.length, builder.id).toBeGreaterThan(1);
          const spec = payload!.blueprint.builders.find(spec => spec.id === builder.id)!;
          const count = spec.chunks?.length ?? builder.answers[0].display.trim().split(/\s+/).length;
          const sourceOrder = [...builder.tiles].sort((a, b) => Number(a.id.split(":").at(-1)) - Number(b.id.split(":").at(-1))).slice(0, count);
          expect(guidedBuilderMatches(builder, sourceOrder.map(tile => tile.id)), builder.id).toBe(true);
        }
        for (const dialogue of lesson.dialogues) {
          if (dialogue.turns.length === 2) {
            const originalDialogue = spec.blueprint.dialogues.find(item => item.id === dialogue.id)!;
            expect(originalDialogue.turns.length, dialogue.id).toBeGreaterThanOrEqual(4);
            expect(originalDialogue.turns.some(turn => excludedPhrases.has(turn.phraseId)), dialogue.id).toBe(true);
            const first = originalDialogue.turns.findIndex(turn => turn.id === dialogue.turns[0].id);
            expect(first % 2, dialogue.id).toBe(0);
            expect(dialogue.turns.map(turn => turn.id), dialogue.id).toEqual(originalDialogue.turns.slice(first, first + 2).map(turn => turn.id));
            expect(payload!.course.phrases.find(phrase => phrase.id === originalDialogue.turns[first].phraseId)?.english, dialogue.id).toMatch(/\?$/);
          } else expect(dialogue.turns.length, dialogue.id).toBeGreaterThanOrEqual(4);
          const answers = Object.fromEntries(dialogue.turns.flatMap(turn => turn.gaps.map(gap => [gap.id, gap.answer])));
          expect(Object.keys(answers).length, dialogue.id).toBeGreaterThan(0);
          expect(gradeGuidedDialogue(dialogue, answers).correct, dialogue.id).toBe(true);
          expect(gradeGuidedDialogue(dialogue, {}).correct, dialogue.id).toBe(false);
        }
      }
    }
  // This exhaustive check resolves and grades hundreds of bilingual payloads;
  // allow for contention with other release-audit workers without skipping any.
  }, 15_000);
});
