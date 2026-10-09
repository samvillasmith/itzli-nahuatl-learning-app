import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GuidedPathLesson from "@/components/GuidedPathLesson";
import type { WordImage } from "@/data/word-images";
import { getUnifiedVocabularyEntries } from "@/lib/unified-course-path";

vi.mock("@/i18n/LocaleProvider", () => ({ useLocale: () => ({ locale: "en", translate: (text: string) => text }) }));
vi.mock("@/components/useLessonImageWarmup", () => ({ useLessonImageWarmup: () => undefined }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useState: (initial: unknown) => {
    const result = actual.useState(initial);
    return initial === "intro" ? ["practice", result[1]] : result;
  } };
});

describe("images on unanswered guided vocabulary practice cards", () => {
  for (const [kind, count] of [["recognition", 4], ["recall", 1]] as const) {
    it(`shows the exact vocabulary target during ${kind} before checking an answer`, () => {
      const entries = getUnifiedVocabularyEntries().slice(0, count);
      const previewImages: Record<string, WordImage> = Object.fromEntries(entries.map(entry => [entry.id, {
        url: `/api/local-review/images/${entry.id}?v=immutable-hash`, license: "Local review", author: "Itzli", source: "itzli",
      }]));
      const markup = renderToStaticMarkup(createElement(GuidedPathLesson, {
        unitNum: 50, lessonNumber: 100, title: { en: "Words", es: "Palabras" }, goal: { en: "Learn", es: "Aprende" },
        durationMinutes: 8, progressId: "practice-image-test", entries, previewImages,
        course: { schemaVersion: 1, license: {}, sources: [], phrases: [], rules: [], units: [], coverage: [] },
        prevUnit: null, nextUnit: null,
      }));
      expect(markup).toContain(kind === "recognition" ? "Choose the meaning" : "Write the form");
      expect(markup).toContain(`src="${previewImages[entries[0].id].url}"`);
      expect(markup.match(/<img\b/g)).toHaveLength(1);
      expect(markup).toContain('alt="Image for this word"');
      expect(markup).not.toContain("Correct!");
      expect(markup).not.toContain("Practice this answer");
    });
  }
});
