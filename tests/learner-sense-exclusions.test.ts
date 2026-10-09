import { describe, expect, it } from "vitest";
import rawLexicon from "../src/data/v3-verified-lexicon.json";
import exclusions from "../src/data/app-content-exclusions.json";
import instructional from "../src/data/instructional-lesson-blueprints.json";
import assignments from "../src/data/course-path-extension.json";
import { getLearnerSenseExclusionReason, isAppContentExcluded } from "../src/lib/app-content-safety";
import { getVerifiedExpansionEntries } from "../src/data/v3-expansion";
import { getUnifiedCoursePath, getUnifiedLessonForEntry, getUnifiedPathLesson, getUnifiedVocabularyCount } from "../src/lib/unified-course-path";
import { getExcludedLearnerPhraseIds, getInstructionalLessonPayload } from "../src/lib/instructional-lessons";
import { countVocabularyWrittenForms, getUnifiedVocabulary, searchUnifiedVocabulary } from "../src/lib/unified-vocabulary";
import { guidedInteractiveContent } from "../src/components/guided-path-lesson-content";
import { reviewedVocabularyLabel } from "../src/lib/reviewed-vocabulary-labels.cjs";
import { getAllPrimerVocab } from "../src/lib/db";
import { NAHUATLAHTOLLI_COURSE } from "../src/lib/nahuatlahtolli";

describe("selected learner meanings and preserved source history", () => {
  it("removes every exact excluded record from study, index, search and lesson assignments while preserving source evidence", () => {
    const live = getVerifiedExpansionEntries();
    const words = getUnifiedVocabulary(getAllPrimerVocab());
    for (const exclusion of exclusions.learnerSenseExclusions) {
      const source = rawLexicon.entries.find(entry => entry.id === exclusion.entryId);
      expect(source, exclusion.entryId).toBeDefined();
      expect(source?.sourceLocator).toBeDefined();
      expect(live.some(entry => entry.id === exclusion.entryId)).toBe(false);
      expect(words.some(entry => entry.id === exclusion.entryId)).toBe(false);
      expect(getUnifiedLessonForEntry(exclusion.entryId)).toBeNull();
      for (const assignment of assignments.lessons.filter(lesson => lesson.entryIds.includes(exclusion.entryId))) {
        const lesson = getUnifiedPathLesson(assignment.lessonNumber)!;
        expect(lesson.progressId).toBe(assignment.progressId);
        expect(lesson.entries?.some(entry => entry.id === exclusion.entryId)).toBe(false);
        expect(lesson.wordCount).toBe(lesson.entries?.length);
      }
    }
    expect(searchUnifiedVocabulary(words, "awiltia").some(word => word.display === "awiltia")).toBe(false);
    expect(getUnifiedVocabularyCount()).toBe(countVocabularyWrittenForms(words));
  });

  it("cannot restore prohibited senses through the historical educational allowlist", () => {
    expect(isAppContentExcluded("awiltia", "rape; recognition of sexual violence")).toBe(true);
    expect(isAppContentExcluded("moxixa", "defecate")).toBe(true);
    expect(isAppContentExcluded("kwitlatl", "feces; excrement")).toBe(true);
    expect(isAppContentExcluded("ordinary", "to shoot cum")).toBe(true);
    expect(isAppContentExcluded("ordinary", "to have lesbian sex with")).toBe(true);
    expect(isAppContentExcluded("ordinary", "to have heterosexual sex with")).toBe(true);
    expect(isAppContentExcluded("ordinary", "to be a bottom as a gay person")).toBe(true);
    expect(isAppContentExcluded("ordinary", "a passive sexual partner")).toBe(true);
    expect(isAppContentExcluded("ordinary", "run over someone")).toBe(true);
    expect(isAppContentExcluded("xiktli", "umbilical cord")).toBe(true);
    expect(isAppContentExcluded("xīctli", "ordinary body reference")).toBe(true);
    expect(getExcludedLearnerPhraseIds()).toContain("object-frame-word-v3d-3f775b3f819cecff");
  });

  it("keeps ordinary shooting, firearms, identities, harmless homographs and the expressly retained vocabulary", () => {
    for (const meaning of ["to shoot", "firearm; gun", "shoot arrows", "a plant shoot", "bottom of the hill",
      "run over a piece of paper", "a gay man", "a lesbian", "sexual orientation", "gender identity", "same-sex relationship",
      "farther away", "deceased person", "have labor pains", "look after someone"]) {
      expect(getLearnerSenseExclusionReason([meaning]), meaning).toBeNull();
    }
    const live = getVerifiedExpansionEntries();
    for (const headword of ["tiochiwa", "tepeikxitlan", "mokwitlawia", "kokolistli", "kwahkwalo", "mikkatsin",
      "telpokatik", "ixseltik", "ichpokatik", "tlamotla", "tlamotlaketl"]) {
      expect(live.some(entry => entry.display === headword), headword).toBe(true);
    }
  });

  it("selects only the independently attested liquid and old-clothing meanings without changing raw source records", () => {
    const live = getVerifiedExpansionEntries();
    for (const [id, meaningEn, meaningEs] of [
      ["word-v3rf-c571e43a0548dd42", "pour a liquid", "verter un líquido"],
      ["word-v3d-3f775b3f819cecff", "worn-out clothing", "ropa vieja"],
    ]) {
      const original = rawLexicon.entries.find(entry => entry.id === id)!;
      const entry = live.find(entry => entry.id === id)!;
      expect(entry).toMatchObject({ meaningEn, meaningEs, id: original.id, display: original.display,
        sourceLocator: original.sourceLocator, sourceSpelling: original.sourceSpelling, audioUrl: original.audioUrl });
      expect(original.meaningEn).not.toBe(entry.meaningEn);
      expect(() => reviewedVocabularyLabel(id, original.meaningEn, original.meaningEs, "changed-source-fact")).toThrow(/source fact/);
    }
  });

  it("removes prohibited contextual phrases and whole dependent tasks without breaking any remaining bilingual lesson", () => {
    const path = getUnifiedCoursePath();
    let excludedPhraseCount = 0;
    for (const spec of instructional.lessons) {
      const payload = getInstructionalLessonPayload(spec.unitId)!;
      expect(payload).not.toBeNull();
      for (const phrase of payload.course.phrases) {
        expect(getLearnerSenseExclusionReason([phrase.sourceLocator.lexicalEntryId, phrase.english, phrase.spanish])).toBeNull();
      }
      const phraseIds = new Set(payload.course.phrases.map(phrase => phrase.id));
      for (const builder of payload.blueprint.builders) expect(phraseIds.has(builder.phraseId)).toBe(true);
      for (const dialogue of payload.blueprint.dialogues) {
        for (const turn of dialogue.turns) expect(phraseIds.has(turn.phraseId)).toBe(true);
      }
      excludedPhraseCount += spec.blueprint.contextPhraseIds.length - payload.blueprint.contextPhraseIds.length;
      const lesson = path.find(lesson => lesson.progressId === spec.unitId);
      if (lesson?.kind === "vocabulary") {
        const entries = getUnifiedPathLesson(lesson.lessonNumber)!.entries!;
        for (const locale of ["en", "es"] as const) expect(() =>
          guidedInteractiveContent(payload.course, entries, payload.blueprint, locale)).not.toThrow();
      }
    }
    expect(excludedPhraseCount).toBeGreaterThan(0);
    for (const lesson of NAHUATLAHTOLLI_COURSE.lessons) {
      for (const word of lesson.vocabulary) expect(getLearnerSenseExclusionReason([word.gloss])).toBeNull();
    }
  });
});
