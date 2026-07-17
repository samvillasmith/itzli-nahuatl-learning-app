import { describe, expect, it } from "vitest";
import { searchVocab } from "../src/lib/db";

const ORIENTATION_OR_SEXUAL_ROLE =
  /\b(gay|lesbian|homosexual(?:ity)?|same[- ]sex|sodom(?:y|ite)|sex|sexual|intercourse)\b/i;

describe("dictionary content exclusions", () => {
  it("returns no results for excluded orientation searches", () => {
    expect(searchVocab("gay", 100)).toEqual([]);
    expect(searchVocab("lesbian", 100)).toEqual([]);
    expect(searchVocab("homosexual", 100)).toEqual([]);
  });

  it("removes sexual-role definitions from otherwise ordinary searches", () => {
    const results = searchVocab("bottom", 100);
    for (const entry of results) {
      const visibleText = [entry.gloss_en, entry.gloss_es, entry.notes_public]
        .filter(Boolean)
        .join(" ");
      expect(visibleText).not.toMatch(ORIENTATION_OR_SEXUAL_ROLE);
    }
  });

  it("searches verified course vocabulary instead of the raw mixed-dialect lexicon", () => {
    const results = searchVocab("flower", 100);
    expect(results.some((entry) => entry.gloss_en.toLowerCase().includes("flower"))).toBe(true);
    expect(results.every((entry) => entry.variety === "Eastern Huasteca Nahuatl")).toBe(true);
    expect(searchVocab("margay", 100)).toEqual([]);
  });

  it("does not expose superseded raw-import glosses", () => {
    expect(searchVocab("sister-in-low", 100)).toEqual([]);
    expect(searchVocab("mandarine", 100)).toEqual([]);
    expect(searchVocab("pancho", 100)).toEqual([]);
  });
});
