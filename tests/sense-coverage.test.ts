import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { summarizeReviewedAdditionalSenseHolds } = createRequire(import.meta.url)("../scripts/lib/sense-coverage.js");
function fixture() {
  const review = { targetSenseAgreement: true, originalFinding: { additionalTargetSensesHeld: ["another meaning", "Another meaning", "third meaning"] } };
  const entry = { id: "existing-word", display: "word", newToCourse: true,
    sourceLocator: { sourceFactReviewHash: createHash("sha256").update(JSON.stringify(review)).digest("hex") } };
  return { entry, review, run: () => summarizeReviewedAdditionalSenseHolds([entry], new Map([[entry.id, review]]), new Set(["word"]), (s: string) => s) };
}
describe("additional intended meanings", () => {
  it("keeps withheld meanings visible after one meaning is supported, without counting new words", () => {
    expect(fixture().run()).toEqual({ targetItemsWithAdditionalReviewHolds: 1, additionalTargetClaimsWithheld: 2,
      targetItemsWithExplicitAdditionalMeaningHolds: 0, additionalMeaningsExplicitlyWithheld: 0 });
  });
  it("rejects a stale review after the public card changes", () => {
    const value = fixture(); value.entry.sourceLocator.sourceFactReviewHash = "stale";
    expect(value.run).toThrow("current fact");
  });
  it("does not count an existing baseline anchor as a new target word", () => {
    const value = fixture(); value.entry.newToCourse = false;
    expect(value.run().targetItemsWithAdditionalReviewHolds).toBe(0);
  });
});
