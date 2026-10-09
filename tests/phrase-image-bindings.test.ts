import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { guidedPhraseImageEntry } from "../src/lib/guided-phrase-image-entry";
import { vocabularyImageEntryId } from "../src/lib/vocabulary-image-identity";
import type { ExpansionCourse, ExpansionPhrase } from "../src/lib/expansion-course";
import GuidedPathLesson from "../src/components/GuidedPathLesson";
const state = vi.hoisted(() => ({ warmup: vi.fn() }));
vi.mock("@/i18n/LocaleProvider", () => ({ useLocale: () => ({ locale: "en", translate: (value: string) => value }) }));
vi.mock("@/components/useLessonImageWarmup", () => ({ useLessonImageWarmup: state.warmup }));
const entry = { id: "word-source-coffee", display: "kafen", meaningEn: "coffee", meaningEs: "café" };
const phrase: ExpansionPhrase = { id: "noun-fact-coffee", sourceId: "source", sourceText: "cafen", nahuatl: "kafen",
  english: "coffee", spanish: "café", audioUrl: null, audioKind: "none", adaptationNote: "Exact source noun",
  sourceLocator: { lessonNumber: 18, vocabularyIndex: null, sectionIndex: 1, bodyIndex: 65, lexicalEntryId: entry.id } };

describe("source-linked image reuse for vocabulary forms", () => {
  it("requires an explicit source identity, whole form and both exact current meanings", () => {
    expect(guidedPhraseImageEntry(phrase, [entry])).toBe(entry);
    expect(guidedPhraseImageEntry({ ...phrase, nahuatl: "Na nikitta kafen" }, [entry])).toBeNull();
    expect(guidedPhraseImageEntry({ ...phrase, english: "I see coffee" }, [entry])).toBeNull();
    expect(guidedPhraseImageEntry({ ...phrase, spanish: "veo café" }, [entry])).toBeNull();
    expect(guidedPhraseImageEntry({ ...phrase, sourceLocator: { ...phrase.sourceLocator, lexicalEntryId: undefined } }, [entry])).toBeNull();
    expect(guidedPhraseImageEntry({ ...phrase, sourceLocator: null } as unknown as ExpansionPhrase, [entry])).toBeNull();
  });
  it("resolves only the two reviewed identical duplicate word senses", () => {
    const chocolate = { id: "word-v3-0014", display: "chokolatl", meaningEn: "chocolate", meaningEs: "chocolate" };
    expect(vocabularyImageEntryId(chocolate)).toBe("word-v3i-37bb8e4bcc2aec5f");
    expect(vocabularyImageEntryId({ ...chocolate, meaningEn: "a different meaning" })).toBe(chocolate.id);
    expect(vocabularyImageEntryId({ ...chocolate, meaningEs: "otro significado" })).toBe(chocolate.id);
    expect(vocabularyImageEntryId({ ...chocolate, id: "another-chocolate-word" })).toBe("another-chocolate-word");
    expect(vocabularyImageEntryId({ id: "word-v3-0038", display: "yawaltik", meaningEn: "round", meaningEs: "redondo" })).toBe("word-v3i-bf24fb03e4abc18f");
  });
  it("renders and warms an exact source-linked noun card even when its phrase ID differs", () => {
    const unit = { id: "v3-image-noun", title: { en: "Coffee", es: "Café" }, goal: { en: "Learn", es: "Aprende" },
      durationMinutes: 3, ruleIds: [], phraseIds: [phrase.id], steps: [{ id: "recall-coffee", kind: "recall" as const,
        prompt: { en: "Write coffee", es: "Escribe café" }, phraseId: null, choices: [], answerPhraseIds: [phrase.id], feedback: { en: "Coffee", es: "Café" } }], mastery: { en: "Coffee", es: "Café" } };
    const course: ExpansionCourse = { schemaVersion: 1, license: {}, rules: [], coverage: [], units: [unit], phrases: [phrase],
      sources: [{ id: "source", title: "Source", url: "https://example.test/source", license: "CC BY-SA", authors: ["Teacher"], variety: "Chicontepec" }] };
    const image = { url: "/api/local-review/images/word-source-coffee?v=abc", license: "Local review", source: "openai", author: "Itzli" };
    const markup = renderToStaticMarkup(createElement(GuidedPathLesson, { unitNum: 1, lessonNumber: 284, progressId: unit.id,
      title: unit.title, goal: unit.goal, durationMinutes: 3, course, unit, entries: [], formImages: {
        [phrase.id]: image, unrelated: { ...image, url: "/unrelated-image.png" } }, prevUnit: null, nextUnit: null }));
    expect(markup).toContain(`src="${image.url}"`);
    expect(markup).not.toContain("/unrelated-image.png");
    expect(state.warmup).toHaveBeenLastCalledWith([image.url]);
  });
});
