import { describe, expect, it } from "vitest";
import { parseExpansionCourseProgress, withExpansionLessonResult, type ExpansionCourseProgress, type ExpansionUnit } from "../src/lib/expansion-course";

const unit = { id: "v3-existing-lesson", steps: Array.from({ length: 6 }, (_, index) => ({ id: `task-${index}` })) } as ExpansionUnit;
const original = { completedAt: 100, firstAttemptCorrect: 2, total: 3 };
const prior: ExpansionCourseProgress = { schemaVersion: 1, units: { [unit.id]: original, "v3-unrelated": { completedAt: 50, firstAttemptCorrect: 1, total: 1 } } };
describe("lesson revisions preserve completed learning", () => {
  it("accepts old saved results without migration or loss", () => {
    expect(parseExpansionCourseProgress(JSON.stringify(prior))).toEqual(prior);
    expect(prior.units[unit.id].completedAt).toBe(100);
  });
  it("archives the original completed result when finishing a richer revision", () => {
    const updated = withExpansionLessonResult(prior, unit, 4, 200, "v3-scene-1");
    expect(updated.units[unit.id]).toEqual({ completedAt: 200, firstAttemptCorrect: 4, total: 6, lessonRevision: "v3-scene-1", priorResults: [original] });
    expect(updated.units["v3-unrelated"]).toBe(prior.units["v3-unrelated"]);
    expect(prior.units[unit.id]).toEqual(original);
    expect(parseExpansionCourseProgress(JSON.stringify(updated))).toEqual(updated);
  });
  it("does not duplicate history when repeating the same revision", () => {
    const upgraded = withExpansionLessonResult(prior, unit, 4, 200, "v3-scene-1");
    const repeated = withExpansionLessonResult(upgraded, unit, 1, 300, "v3-scene-1");
    expect(repeated.units[unit.id].priorResults).toEqual([original]);
    const next = withExpansionLessonResult(repeated, unit, 5, 400, "v3-scene-2");
    expect(next.units[unit.id].priorResults).toEqual([original, { completedAt: 300, firstAttemptCorrect: 1, total: 6, lessonRevision: "v3-scene-1" }]);
  });
  it("keeps validated bounded history without nested or malformed records", () => {
    const current = withExpansionLessonResult(prior, unit, 4, 200, "v3-scene-1");
    for (const corrupt of [ [{ ...original, firstAttemptCorrect: 9 }], [{ ...original, priorResults: [] }], Array(11).fill(original), [null] ]) {
      const value = structuredClone(current); value.units[unit.id].priorResults = corrupt as never;
      expect(parseExpansionCourseProgress(JSON.stringify(value))).toBeNull();
    }
    const unsafe = structuredClone(current); unsafe.units[unit.id].lessonRevision = "<script>";
    expect(parseExpansionCourseProgress(JSON.stringify(unsafe))).toBeNull();
    expect(() => withExpansionLessonResult(prior, unit, 1, 200, "bad revision")).toThrow(/revision/);
  });
  it("retains the original completion even after many later course revisions", () => {
    let progress = prior;
    for (let revision = 1; revision <= 15; revision += 1) progress = withExpansionLessonResult(progress, unit, 4, 200 + revision, `v3-scene-${revision}`);
    expect(progress.units[unit.id].priorResults).toHaveLength(10);
    expect(progress.units[unit.id].priorResults![0]).toEqual(original);
    expect(progress.units[unit.id].priorResults!.at(-1)?.lessonRevision).toBe("v3-scene-14");
    expect(parseExpansionCourseProgress(JSON.stringify(progress))).toEqual(progress);
  });
});
