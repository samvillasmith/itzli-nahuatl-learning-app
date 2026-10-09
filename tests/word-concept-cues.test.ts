import { describe, expect, it } from "vitest";
import { getWordConceptCue, quantityGroups } from "../src/data/word-concept-cues";

describe("precise learning quantities", () => {
  it.each([0, 1, 7, 8, 9, 10, 11, 20, 100])("shows exactly %i countable markers", (value) => {
    const dots = quantityGroups(value).flat();
    expect(dots).toHaveLength(value);
    expect(new Set(dots).size).toBe(value);
    expect(quantityGroups(value).every((group) => group.length <= 20)).toBe(true);
  });

  it("protects corrected meanings and Spanish rendering without guessing by ID", () => {
    expect(getWordConceptCue({ id: 69, gloss_en: "seven" })).toEqual({ kind: "quantity", value: 7 });
    expect(getWordConceptCue({ id: 72, gloss_en: "ocho", safety_gloss_en: "eight" })).toEqual({ kind: "quantity", value: 8 });
    expect(getWordConceptCue({ id: 7418, gloss_en: "marigold" })).toBeNull();
    expect(getWordConceptCue({ id: 100, gloss_en: "counting; account; number" })).toBeNull();
  });

  it("places months in their actual order across both languages", () => {
    expect(getWordConceptCue({ id: 903303, gloss_en: "March" })).toEqual({ kind: "month", value: 3 });
    expect(getWordConceptCue({ id: 903312, gloss_en: "diciembre", safety_gloss_en: "December" })).toEqual({ kind: "month", value: 12 });
    expect(getWordConceptCue({ id: 903303, gloss_en: "parade" })).toBeNull();
  });
});
