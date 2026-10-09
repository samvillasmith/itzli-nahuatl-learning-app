import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { isReviewedStaticText } = require("../scripts/lib/reviewed-static-text.js");

describe("exact educational grammar text review", () => {
  it("admits the specifically reviewed language fact only in its instructional file", () => {
    const line = '"english": "My stomach hurts.",';
    expect(isReviewedStaticText("src/data/instructional-lesson-blueprints.json", line)).toBe(true);
    expect(isReviewedStaticText("src/data/word-images.json", line)).toBe(false);
  });
  it("does not admit changed or new text that shares a reviewed keyword", () => {
    expect(isReviewedStaticText("src/data/instructional-lesson-blueprints.json", '"english": "My stomach hurts. Take medicine.",')).toBe(false);
    expect(isReviewedStaticText("src/data/instructional-lesson-blueprints.json", '"english": "Unreviewed bathing scene.",')).toBe(false);
  });
});
