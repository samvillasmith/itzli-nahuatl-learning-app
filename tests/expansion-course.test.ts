import { describe, expect, it } from "vitest";
import { checkExpansionResponse, parseExpansionCourseProgress, withExpansionLessonResult, type ExpansionPhrase, type ExpansionUnit } from "../src/lib/expansion-course";

const phrase = { id: "work-i", nahuatl: "Nitekiti." } as ExpansionPhrase;
const unit = { id: "v3-daily-work", steps: [{ id: "who" }, { id: "answer" }] } as ExpansionUnit;

describe("documented expansion replies", () => {
  it("accepts source orthography, capitalization and punctuation but distinguishes person", () => {
    expect(checkExpansionResponse("  NITEQUITI! ", [phrase])).toBe(true);
    expect(checkExpansionResponse("Titekiti", [phrase])).toBe(false);
    expect(checkExpansionResponse("", [phrase])).toBe(false);
    expect(checkExpansionResponse("Nitekiti nochi", [phrase])).toBe(false);
  });
  it("accepts each specifically documented alternative without generating other forms", () => {
    expect(checkExpansionResponse("tekiti", [phrase, { ...phrase, id: "work-third", nahuatl: "Tekiti" }])).toBe(true);
    expect(checkExpansionResponse("Nitekiti, titekiti", [phrase])).toBe(false);
  });
});

describe("separate additive lesson results", () => {
  it("preserves unrelated lesson results when adding a finished session", () => {
    const prior = { schemaVersion: 1 as const, units: { "v3-introductions": { completedAt: 1000, firstAttemptCorrect: 2, total: 3 } } };
    const updated = withExpansionLessonResult(prior, unit, 1, 2000);
    expect(updated.units["v3-introductions"]).toEqual(prior.units["v3-introductions"]);
    expect(updated.units[unit.id]).toEqual({ completedAt: 2000, firstAttemptCorrect: 1, total: 2 });
    expect(Object.keys(prior.units)).toEqual(["v3-introductions"]);
    expect(parseExpansionCourseProgress(JSON.stringify(updated))).toEqual(updated);
  });
  it("rejects malformed or future results so existing data can be preserved", () => {
    expect(parseExpansionCourseProgress("{broken")).toBeNull();
    expect(parseExpansionCourseProgress('{"schemaVersion":2,"units":{}}')).toBeNull();
    expect(parseExpansionCourseProgress('{"schemaVersion":1,"units":{"v3-work":{"completedAt":2,"total":1,"firstAttemptCorrect":2}}}')).toBeNull();
    expect(parseExpansionCourseProgress('{"schemaVersion":1,"units":{"4":{"completedAt":2,"total":1,"firstAttemptCorrect":1}}}')).toBeNull();
    expect(() => withExpansionLessonResult(prior(), unit, 3)).toThrow();
    expect(() => withExpansionLessonResult(prior(), { ...unit, id: "legacy-unit-1" }, 1)).toThrow();
  });
});
function prior() { return { schemaVersion: 1 as const, units: {} }; }
