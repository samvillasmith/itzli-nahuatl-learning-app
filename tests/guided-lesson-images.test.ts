import { describe, expect, it, vi } from "vitest";
import { guidedLessonImage } from "@/lib/guided-lesson-images";
import { getReviewedVocabularyLabels } from "@/lib/reviewed-vocabulary-labels.cjs";
import type { WordImage } from "@/data/word-images";

describe("V3 lesson image identity and meaning", () => {
  it("keeps excluded words and unreviewed mixed-sense images out of the lesson", () => {
    expect(guidedLessonImage({ id: "excluded-word", display: "awiltia", meaningEn: "play with an object; rape someone", meaningEs: "violar a alguien" })).toBeNull();
    for (const row of getReviewedVocabularyLabels().filter(row => row.selectedSenseOnly)) {
      expect(guidedLessonImage({ id: row.id, display: row.display, meaningEn: row.beforeEn, meaningEs: row.beforeEs })).toBeNull();
    }
  });

  it("requires the published entry and both current meanings for source-bound artwork", () => {
    const row = getReviewedVocabularyLabels().find(row => row.selectedSenseOnly)!;
    const entry = { id: row.id, display: row.display, meaningEn: row.meaningEn, meaningEs: row.meaningEs };
    const image: WordImage = { url: "https://example.test/reviewed.png", license: "CC BY-SA 4.0", author: "Itzli",
      provenance: { entry_id: entry.id, meaning_en: entry.meaningEn, meaning_es: entry.meaningEs } };
    const lookup = vi.fn(() => image);
    expect(guidedLessonImage(entry, lookup)).toBe(image);
    expect(lookup).toHaveBeenCalledWith(entry.display, expect.objectContaining({ entryId: entry.id,
      meaningEn: entry.meaningEn, meaningEs: entry.meaningEs, sourceFactReviewHash: row.sourceFactReviewHash }));
    for (const changed of [{ ...entry, id: "other-entry" }, { ...entry, meaningEn: row.beforeEn }, { ...entry, meaningEs: row.beforeEs }])
      expect(guidedLessonImage(changed, lookup)).toBeNull();
  });
});
