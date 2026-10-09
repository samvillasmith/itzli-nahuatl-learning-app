import { describe, expect, it } from "vitest";
import courseData from "../src/data/v3-original-course.json";
import type { ExpansionCourse } from "../src/lib/expansion-course";
import { getUnifiedPathLesson, getUnifiedPathLessons, type UnifiedVocabularyEntry } from "../src/lib/unified-course-path";
import { expressionLessonContent, vocabularyLessonContent, guidedAnswerMatches, guidedReviewAttempt, learnerRuleExplanation, guidedInteractiveContent } from "../src/components/guided-path-lesson-content";
import { getInstructionalLessonPayload } from "../src/lib/instructional-lessons";
import { getUnifiedVocabularyEntries } from "../src/lib/unified-course-path";
import { GENERATED_AUDIO_INDEX } from "../src/lib/generated-audio";

const course = courseData as ExpansionCourse;
function entry(id: string, display: string, meaning: string): UnifiedVocabularyEntry {
  return { id, display, sourceSpelling: display, meaningEn: meaning, meaningEs: meaning,
    partOfSpeech: "noun", formKind: "lexical-headword", sourceUrl: "https://example.org/fact",
    audioUrl: null, audioKind: "none", variety: "Source-specific variety", sourceTitle: "Reviewed source",
    sourceAuthors: ["Source author"], sourceLicense: "Source fact reference", contentLicense: "CC BY-SA 4.0" };
}

describe("guided lessons in the existing path", () => {
  it("preserves every reviewed grammar lesson's tasks, acceptable answers and exact recordings", () => {
    const phrases = new Map(course.phrases.map(phrase => [phrase.id, phrase]));
    for (const unit of course.units) {
      const adapted = expressionLessonContent(course, unit, "en");
      expect(adapted.practice).toHaveLength(unit.steps.length);
      expect(adapted.learn.filter(card => card.kind === "form").map(card => card.kind === "form" && card.form.id)).toEqual(unit.phraseIds);
      unit.steps.forEach((step, index) => {
        const card = adapted.practice[index];
        expect(card.prompt).toBe(step.prompt.en);
        expect(card.answers.map(answer => answer.id)).toEqual(step.answerPhraseIds);
        expect(card.answers.map(answer => answer.display)).toEqual(step.answerPhraseIds.map(id => phrases.get(id)!.nahuatl));
        for (const answer of card.answers) {
          const phrase = phrases.get(answer.id)!;
          const referenceId = `phrase:${answer.id}`;
          expect(answer.audioReferenceId).toBe(referenceId);
          const native = phrase.audioKind === "source-recording" ? phrase.audioUrl
            : GENERATED_AUDIO_INDEX.sourceLookup(answer.display, referenceId);
          const generated = GENERATED_AUDIO_INDEX.lookup(answer.display, referenceId);
          expect(answer.audioUrl).toBe(native || generated?.url || null);
          if (native) expect(answer.audioUrl).toBe(native);
        }
      });
    }
  });

  it("uses the authored Spanish explanations and prompts", () => {
    const unit = course.units[0];
    const adapted = expressionLessonContent(course, unit, "es");
    expect(adapted.practice[0].prompt).toBe(unit.steps[0].prompt.es);
    const rule = adapted.learn[0];
    expect(rule.kind).toBe("rule");
    if (rule.kind === "rule") expect(rule.explanation).toBe(course.rules.find(item => item.id === unit.ruleIds[0])!.explanation.es);
  });

  it("teaches only the exact selected vocabulary forms and retains scope notes", () => {
    const entries = [entry("a", "form-a", "tree"), entry("b", "form-b", "house"), entry("c", "form-c", "flower")];
    entries[0].usageNoteEn = "A bound reference form; not an independently attested full sentence.";
    entries[0].formKind = "bound-stem";
    const adapted = vocabularyLessonContent(entries, "en");
    expect(adapted.learn).toHaveLength(3);
    const first = adapted.learn[0];
    if (first.kind === "form") {
      expect(first.form.usage).toBe(entries[0].usageNoteEn);
      expect(first.form.variety).toBe(entries[0].variety);
      expect(first.form.buildingBlock).toBe(true);
    }
    expect(adapted.practice.filter(card => card.kind === "recall").map(card => card.answers[0].display)).toEqual(entries.map(item => item.display));
    expect(adapted.practice.every(card => card.answers.every(answer => entries.some(item => item.display === answer.display)))).toBe(true);
  });

  it("does not teach a misleading recognition contrast between homographs", () => {
    const entries = [entry("a", "same", "tree"), entry("b", "same", "house"), entry("c", "other", "flower"), entry("d", "last", "lake")];
    const adapted = vocabularyLessonContent(entries, "en");
    expect(adapted.practice.filter(card => card.kind === "choice").some(card => ["a", "b"].includes(card.entryId!))).toBe(false);
    expect(adapted.practice.filter(card => card.kind === "recall")).toHaveLength(4);
  });

  it("never exposes a synthetic or guessed audio URL as a source recording", () => {
    const fact = { ...entry("a", "same", "tree"), audioUrl: "https://example.org/guessed.mp3", audioKind: "none" as const };
    const adapted = vocabularyLessonContent([fact], "en");
    const first = adapted.learn[0];
    if (first.kind === "form") expect(first.form.audioUrl).toBeNull();
    expect(adapted.practice[0].answers[0].audioUrl).toBeNull();
  });

  it("identifies the target when identical glosses would otherwise punish a valid alternative", () => {
    const facts = [entry("a", "iwkinin", "like this"), entry("b", "iwkinoh", "like this")];
    facts[0].usageNoteEn = "Proximal demonstrative reference.";
    facts[1].usageNoteEn = "Distal demonstrative reference.";
    const tasks = vocabularyLessonContent(facts, "en").practice.filter(task => task.kind === "recall");
    expect(tasks[0].hint).toContain("iwkini");
    expect(tasks[1].hint).toContain("iwkino");
    expect(tasks[0].hint).toContain(facts[0].usageNoteEn);
    expect(tasks[1].hint).toContain(facts[1].usageNoteEn);
    expect(guidedAnswerMatches("iwkinoh", tasks[0].answers)).toBe(false);
  });

  it("keeps a single-entry lesson usable through recall without fabricated choices", () => {
    const adapted = vocabularyLessonContent([entry("a", "only-form", "only meaning")], "es");
    expect(adapted.learn).toHaveLength(1);
    expect(adapted.practice).toHaveLength(1);
    expect(adapted.practice[0].kind).toBe("recall");
    expect(adapted.practice[0].choices).toEqual([]);
    expect(adapted.practice[0].hint).toBeNull();
  });

  it("accepts ordinary documented source spelling conversion but excludes an incompatible pronunciation alias", () => {
    const sourceSpellingFact = entry("a", "wewentsin", "elder");
    sourceSpellingFact.sourceSpelling = "huēhuentzin";
    const answer = vocabularyLessonContent([sourceSpellingFact], "en").practice[0].answers;
    expect(guidedAnswerMatches(sourceSpellingFact.sourceSpelling, answer)).toBe(true);
    const unit = course.units.find(item => item.phraseIds.includes("name-question"))!;
    const question = expressionLessonContent(course, unit, "en").learn.find(card => card.kind === "form" && card.form.id === "name-question");
    if (question?.kind === "form") {
      expect(guidedAnswerMatches("¿kenihki motokah?", [question.form])).toBe(true);
      expect(guidedAnswerMatches("¿quēniuhqui motōcah?", [question.form])).toBe(true);
      expect(guidedAnswerMatches("¿kenijki motokah?", [question.form])).toBe(false);
    }
    const canonical = { ...entry("canonical", "inihwantin", "they"), referenceAliases: ["yahwantin"] };
    const canonicalAnswer = vocabularyLessonContent([canonical], "en").practice[0].answers;
    expect(guidedAnswerMatches("yahwantin", canonicalAnswer)).toBe(false);
  });

  it("expresses learner usage limits without showing source table repair details", () => {
    const unit = course.units.find(item => item.ruleIds.includes("bones-rule-respect"))!;
    for (const locale of ["en", "es"] as const) {
      const rule = expressionLessonContent(course, unit, locale).learn.find(card => card.kind === "rule" && card.id === "bones-rule-respect");
      if (rule?.kind === "rule") {
        expect(rule.scope).not.toMatch(/faulty|table cells|celdas erróneas/i);
        expect(rule.scope).toMatch(locale === "es" ? /no añadas estos sufijos libremente/ : /do not attach these suffixes freely/);
      }
    }
  });

  it("previews and assesses recall of every assigned word in every published cohort", () => {
    const vocabularyLessons = getUnifiedPathLessons().filter(lesson => lesson.kind === "vocabulary");
    expect(vocabularyLessons.length).toBeGreaterThan(0);
    for (const summary of vocabularyLessons) {
      const detail = getUnifiedPathLesson(summary.lessonNumber)!;
      for (const locale of ["en", "es"] as const) {
        const adapted = vocabularyLessonContent(detail.entries!, locale);
        const ids = detail.entries!.map(item => item.id);
        expect(adapted.learn.map(card => card.kind === "form" && card.form.id)).toEqual(ids);
        expect(adapted.practice.filter(task => task.kind === "recall").map(task => task.entryId)).toEqual(ids);
        for (const task of adapted.practice.filter(task => task.kind === "choice")) {
          expect(task.choices.length).toBeGreaterThanOrEqual(3);
          expect(task.choices.every(choice => ids.includes(choice.id))).toBe(true);
        }
      }
    }
  });

  it("retains exact supplementary evidence links alongside the entry's primary source", () => {
    const fact = entry("a", "wankinon", "then, in a next-action context");
    fact.supplementalSources = [
      { title: "Native Chicontepec context", url: "https://revistas.inah.gob.mx/index.php/narrativasantropologicas/article/download/16546/17581/34512" },
      { title: "Additional grammar reference", url: "https://scholars.sil.org/david_h_tuggy/es/publicaciones/nahuatl_lecciones/9" },
    ];
    const adapted = vocabularyLessonContent([fact], "en");
    const learned = adapted.learn[0];
    if (learned.kind === "form") {
      expect(learned.form.sourceUrl).toBe(fact.sourceUrl);
      expect(learned.form.supplementalSources).toEqual(fact.supplementalSources);
    }
    expect(adapted.practice[0].answers[0].supplementalSources).toEqual(fact.supplementalSources);
  });

  it("uses explicit existing review identities and the matching assessed skill", () => {
    const facts = [entry("a", "tree-form", "tree"), entry("b", "house-form", "house"), entry("c", "flower-form", "flower")];
    facts[0].reviewActivityId = "word:word-v3i-existing-id";
    facts[1].reviewActivityId = "word:960001";
    const tasks = vocabularyLessonContent(facts, "en").practice;
    expect(guidedReviewAttempt(tasks.find(task => task.entryId === "a" && task.kind === "choice")!)).toEqual({ activityId: facts[0].reviewActivityId, skill: "recognition" });
    expect(guidedReviewAttempt(tasks.find(task => task.entryId === "a" && task.kind === "recall")!)).toEqual({ activityId: facts[0].reviewActivityId, skill: "production" });
    expect(guidedReviewAttempt(tasks.find(task => task.entryId === "b" && task.kind === "recall")!)).toEqual({ activityId: facts[1].reviewActivityId, skill: "production" });
    expect(guidedReviewAttempt(tasks.find(task => task.entryId === "c")!)).toBeNull();
  });

  it("does not schedule building-block references or invent grammar activity identities", () => {
    const fact = { ...entry("a", "bound-form", "stem reference"), formKind: "bound-stem", reviewActivityId: "word:should-not-enter-review" };
    const task = vocabularyLessonContent([fact], "en").practice[0];
    expect(task.reviewActivityId).toBeUndefined();
    expect(guidedReviewAttempt(task)).toBeNull();
    for (const task of expressionLessonContent(course, course.units[0], "en").practice) expect(guidedReviewAttempt(task)).toBeNull();
  });
  it("repairs the approved inline past form only in learner display, preserving the frozen source course", () => {
    const unit = course.units.find(unit => unit.ruleIds.includes("bones-rule-past-process"))!;
    const rule = course.rules.find(rule => rule.id === "bones-rule-past-process")!;
    for (const locale of ["en", "es"] as const) {
      expect(rule.explanation[locale]).toContain("Nipano, Nipanqui, Nipanoyaya");
      const card = expressionLessonContent(course, unit, locale).learn.find(card => card.kind === "rule" && card.id === rule.id);
      if (card?.kind === "rule") {
        expect(card.explanation).toContain("Nipano, Nipanki, Nipanoyaya");
        expect(card.explanation).not.toContain("Nipano, Nipanqui, Nipanoyaya");
      } else throw new Error("Missing repaired past explanation");
      expect(rule.explanation[locale]).toContain("Nipano, Nipanqui, Nipanoyaya");
    }
  });
  it("uses the reviewed embedded future wording in the learner explanation", () => {
    const payload = getInstructionalLessonPayload("v3-mechanic-embedded-questions")!;
    expect(payload).not.toBeNull();
    const entries = new Map(getUnifiedVocabularyEntries().map(entry => [entry.id, entry]));
    const selected = payload.blueprint.vocabularyIds.flatMap(id => entries.has(id) ? [entries.get(id)!] : []);
    for (const locale of ["en", "es"] as const) {
      const card = guidedInteractiveContent(payload.course, selected, payload.blueprint, locale).grammar.find(card => card.id === "v3-mechanic-embedded-questions-rule")!;
      expect(card.explanation).toContain("Ya kimati tlen kichiwas wan kenihki");
      expect(card.explanation).not.toContain("tlen kichwas");
    }
  });
  it("retains intentionally labeled source-spelling comparisons and unrelated text", () => {
    const reference = "Source plurals -zceh and -zqueh differ; source form Nipanqui is retained in this reference.";
    expect(learnerRuleExplanation("other-reviewed-rule", reference)).toBe(reference);
    expect(learnerRuleExplanation("bones-rule-past-process", reference)).toBe(reference);
    expect(learnerRuleExplanation("v3-mechanic-embedded-questions-rule", reference)).toBe(reference);
  });
});
