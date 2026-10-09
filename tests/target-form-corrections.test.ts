import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const { applyTargetFormCorrections } = createRequire(import.meta.url)("../scripts/lib/target-form-corrections.js");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function fixture() {
  const review = {
    decision: "approved-photographed-transcription-correction", canonicalResearchId: "source-one",
    canonicalSourceFormKey: "mistl", oldRetrievalKey: "mistl", correctedRetrievalKey: "mist",
    correctedPhotographedSourceForm: "mist",
    targetItemId: "private-target-" + hash("historical-1228|mistl").slice(0, 16),
    identityImpact: { newVocabularySlots: 0, targetSlotsReplaced: 1 },
    photoEvidence: { characterProof: { operation: "remove", zeroBasedIndex: 4, erroneousCharacter: "l", photographedCharacter: null } },
  };
  return {
    keys: new Set(["mistl", "another"]), baseline: new Set(["old"]),
    corrections: { canonicalInventoryUnmodified: true, inputSha256: { canonicalInventory: "frozen" },
      records: [{ ...review, correctionReviewHash: hash(JSON.stringify(review)) }] },
    concordance: { forms: [{ source_form_key: "mistl", inali_retrieval_key: "mistl" }] },
    inventory: { entries: [{ research_id: "source-one", source_form: "mistl" }] },
  };
}
function verify(value: ReturnType<typeof fixture>) {
  return applyTargetFormCorrections(value.keys, value.corrections, value.concordance, value.inventory,
    value.baseline, (text: string) => text.toLowerCase(), { canonicalInventory: "frozen" });
}
describe("corrected transcription preserves the original target", () => {
  it("replaces one slot without mutating the frozen inventory or adding a slot", () => {
    const value = fixture();
    expect([...verify(value)]).toEqual(["another", "mist"]);
    expect([...value.keys]).toEqual(["mistl", "another"]);
    expect(value.inventory.entries[0].source_form).toBe("mistl");
  });
  it("rejects a baseline collision or a duplicate corrected slot", () => {
    const value = fixture(); value.baseline.add("mist");
    expect(() => verify(value)).toThrow("collision");
    value.baseline.delete("mist"); value.keys.add("mist");
    expect(() => verify(value)).toThrow("collision");
  });
  it("rejects changed review evidence and changed canonical identity", () => {
    const value = fixture(); value.corrections.records[0].correctedRetrievalKey = "invented";
    expect(() => verify(value)).toThrow("Changed correction review");
    const fresh = fixture(); fresh.inventory.entries[0].source_form = "other";
    expect(() => verify(fresh)).toThrow();
  });
});
