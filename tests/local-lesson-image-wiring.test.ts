import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { WordImage } from "@/data/word-images";
import GuidedPathLesson from "@/components/GuidedPathLesson";
import LessonFlow from "@/app/units/[unitId]/LessonFlow";
import FlashcardDeck from "@/app/practice/[unitId]/FlashcardDeck";
import { getUnifiedVocabularyEntries } from "@/lib/unified-course-path";
import { getUnitVocab } from "@/lib/db";

const state = vi.hoisted(() => ({ locale: "en" as "en" | "es", warmup: vi.fn() }));
vi.mock("@/i18n/LocaleProvider", () => ({ useLocale: () => ({ locale: state.locale, translate: (text: string) => text }) }));
vi.mock("@/components/useLessonImageWarmup", () => ({ useLessonImageWarmup: state.warmup }));

function preview(entryId: string): WordImage {
  return { url: `/api/local-review/images/${entryId}?v=${"a".repeat(64)}`,
    license: "Local review", author: "Itzli", source: "itzli",
    review_status: "local-preview", review_scope: "local-review-preview" };
}

describe("server-provided lesson image previews", () => {
  it("shows exact vocabulary images immediately in the V3 introduction and warms every supplied lesson image", () => {
    const entries = getUnifiedVocabularyEntries().slice(0, 4);
    const previewImages = Object.fromEntries(entries.map(entry => [entry.id, preview(entry.id)]));
    previewImages["outside-this-lesson"] = preview("outside-this-lesson");
    for (const locale of ["en", "es"] as const) {
      state.locale = locale;
      const markup = renderToStaticMarkup(createElement(GuidedPathLesson, {
        unitNum: 50, lessonNumber: 100, title: { en: "Words", es: "Palabras" }, goal: { en: "Learn", es: "Aprende" },
        durationMinutes: 8, progressId: "image-preview-test", entries, previewImages,
        course: { schemaVersion: 1, license: {}, sources: [], phrases: [], rules: [], units: [], coverage: [] },
        prevUnit: null, nextUnit: null,
      }));
      expect(markup).toContain('data-testid="lesson-word-image-preview"');
      expect(markup.match(/<img\b/g)).toHaveLength(3);
      for (const entry of entries.slice(0, 3)) expect(markup).toContain(`src="${previewImages[entry.id].url}"`);
      expect(markup).not.toContain("outside-this-lesson");
      expect(state.warmup).toHaveBeenLastCalledWith(entries.map(entry => previewImages[entry.id].url));
    }
    state.locale = "en";
  });

  it("carries every exact legacy card preview through variant collapsing, introduction, and lesson warmup", () => {
    const vocab = getUnitVocab(1).slice(0, 4).map(card => ({ ...card, previewImage: preview(`core-${card.id}`) }));
    const markup = renderToStaticMarkup(createElement(LessonFlow, {
      unitNum: 1, pathCode: "001", themeEn: "Greetings", communicativeGoal: "Greet someone", cefrDescriptor: "A1",
      capstoneTask: "Say hello", targetBand: "A1", vocab, dialogues: [], constructions: [], lessonBlocks: [],
      grammarLabs: [], allVocabPool: vocab, prevUnit: null, nextUnit: null,
    }));
    expect(markup).toContain('data-testid="lesson-word-image-preview"');
    for (const card of vocab.slice(0, 3)) expect(markup).toContain(`src="${card.previewImage.url}"`);
    expect(state.warmup).toHaveBeenLastCalledWith(vocab.map(card => card.previewImage.url));
  });

  it("shows the flashcard preview and preloads the following exact cards rather than substituting a spelling match", () => {
    const cards = getUnitVocab(1).slice(0, 4).map(card => ({ ...card, previewImage: preview(`core-${card.id}`) }));
    const markup = renderToStaticMarkup(createElement(FlashcardDeck, { cards }));
    expect(markup).toContain(`src="${cards[0].previewImage.url}"`);
    expect(markup).toContain(`href="${cards[1].previewImage.url}"`);
    expect(markup).toContain(`href="${cards[2].previewImage.url}"`);
    expect(state.warmup).toHaveBeenLastCalledWith(cards.map(card => card.previewImage.url));
  });

  it("does not put an arbitrary vocabulary image onto a grammar-only introduction", () => {
    const markup = renderToStaticMarkup(createElement(GuidedPathLesson, {
      unitNum: 50, lessonNumber: 100, title: { en: "Grammar", es: "Gramática" }, goal: { en: "Learn", es: "Aprende" },
      durationMinutes: 8, progressId: "grammar-image-preview-test", entries: [],
      previewImages: { unrelated: preview("unrelated") },
      course: { schemaVersion: 1, license: {}, sources: [], phrases: [], rules: [], units: [], coverage: [] },
      prevUnit: null, nextUnit: null,
    }));
    expect(markup).not.toContain("/api/local-review/images/");
    expect(markup).not.toContain('data-testid="lesson-word-image-preview"');
  });
});
