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

  it("keeps unrelated animal names searchable", () => {
    const results = searchVocab("margay", 100);
    expect(results.some((entry) => entry.gloss_en.toLowerCase().includes("margay"))).toBe(true);
  });
});
