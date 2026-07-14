import { describe, expect, it } from "vitest";
import {
  CURRICULUM_REVISION,
  emptySrs,
  parseProgressData,
  parseSrsData,
} from "../src/lib/progress-schema";

const unit = {
  status: "in_progress" as const,
  completedChunks: 2,
  totalChunks: 4,
  lastCorrect: 4,
  lastTotal: 5,
  completedAt: null,
};

describe("progress schema", () => {
  it("restarts unfinished legacy progress after curriculum reordering", () => {
    const parsed = parseProgressData({ version: 1, units: { "7": unit } });
    expect(parsed?.version).toBe(2);
    expect(parsed?.units["7"]?.completedChunks).toBe(0);
    expect(parsed?.units["7"]?.curriculumRevision).toBe(CURRICULUM_REVISION);
  });

  it("preserves a completed legacy unit", () => {
    const parsed = parseProgressData({
      version: 1,
      units: { "7": { ...unit, status: "completed", completedChunks: 4, completedAt: 10 } },
    });
    expect(parsed?.units["7"]?.status).toBe("completed");
    expect(parsed?.units["7"]?.completedChunks).toBe(4);
  });

  it("rejects malformed counts and mutable version-one SRS indexes", () => {
    expect(parseProgressData({ version: 2, units: { "7": { ...unit, lastCorrect: 8 } } })).toBeNull();
    expect(
      parseProgressData({
        version: 2,
        units: { "7": { ...unit, completedChunks: 5, curriculumRevision: CURRICULUM_REVISION } },
      }),
    ).toBeNull();
    expect(parseSrsData({ version: 1, words: { "7:0": { correct: 1, total: 1 } } })).toBeNull();
    expect(parseSrsData(emptySrs())).toEqual(emptySrs());
  });
});
