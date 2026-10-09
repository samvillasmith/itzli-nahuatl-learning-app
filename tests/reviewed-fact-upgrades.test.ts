import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
const { applyReviewedFactUpgrades } = createRequire(import.meta.url)("../scripts/lib/reviewed-fact-upgrades.js");
function fixture() {
  const previous = { id: "earlier-card", display: "same-form", meaningEn: "earlier meaning", audioUrl: null as string | null, newToCourse: true };
  const reviewed = { ...previous, id: "new-fact", meaningEn: "reviewed meaning" };
  const neighbor = { ...previous, id: "unaffected-card", display: "other-form" };
  return { entries: [previous, neighbor, reviewed], reviews: new Map([[reviewed.id, { decision: "approved-specified-fact" }]]),
    upgrades: [{ existingEntryId: previous.id, reviewedEntryId: reviewed.id,
      previousFactSha256: createHash("sha256").update(JSON.stringify(previous)).digest("hex") }] };
}
const normalize = (s: string) => s.toLowerCase();
describe("reviewed sense upgrades preserve learner card identities", () => {
  it("keeps the old ID and its neighbor, replacing one sense without counting a second word", () => {
    const f = fixture(); const result = applyReviewedFactUpgrades(f.entries, f.reviews, f.upgrades, normalize);
    expect(result.map((e: { id: string }) => e.id)).toEqual(["earlier-card", "unaffected-card"]);
    expect(result[0].meaningEn).toBe("reviewed meaning");
    expect(result[1]).toBe(f.entries[1]);
    expect(f.reviews.get("earlier-card")).toEqual(f.reviews.get("new-fact"));
    expect(f.entries).toHaveLength(3);
  });
  it("rejects a changed earlier card, changed form, missing review or recording migration", () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => { f.entries[0].meaningEn = "changed"; },
      (f: ReturnType<typeof fixture>) => { f.entries[2].display = "different-form"; },
      (f: ReturnType<typeof fixture>) => { f.reviews.clear(); },
      (f: ReturnType<typeof fixture>) => { f.entries[2].audioUrl = "https://example.org/recording.mp3"; },
      (f: ReturnType<typeof fixture>) => { f.entries[2].newToCourse = false; },
    ]) {
      const f = fixture(); mutate(f);
      expect(() => applyReviewedFactUpgrades(f.entries, f.reviews, f.upgrades, normalize)).toThrow();
    }
  });
  it("rejects reusing the same reviewed fact", () => {
    const f = fixture(); f.upgrades.push({ ...f.upgrades[0] });
    expect(() => applyReviewedFactUpgrades(f.entries, f.reviews, f.upgrades, normalize)).toThrow("Repeated");
  });
  it("preserves the original identity through a second independently reviewed correction", () => {
    const f = fixture();
    const intermediate = { ...f.entries[2], id: f.entries[0].id };
    const final = { ...intermediate, id: "later-fact", meaningEn: "expanded reviewed meaning" };
    f.entries.push(final);
    f.reviews.set(final.id, { decision: "approved-specified-fact" });
    f.upgrades.push({ existingEntryId: intermediate.id, reviewedEntryId: final.id,
      previousFactSha256: createHash("sha256").update(JSON.stringify(intermediate)).digest("hex") });
    const result = applyReviewedFactUpgrades(f.entries, f.reviews, f.upgrades, normalize);
    expect(result.map((entry: { id: string }) => entry.id)).toEqual(["earlier-card", "unaffected-card"]);
    expect(result[0].meaningEn).toBe(final.meaningEn);
    expect(f.reviews.get("earlier-card")).toBe(f.reviews.get(final.id));
    f.upgrades.reverse();
    expect(() => applyReviewedFactUpgrades(f.entries, f.reviews, f.upgrades, normalize)).toThrow();
  });
  it("retains an unchanged native course recording only for its exact canonical source word", () => {
    const sourceLocator = { sourceType: "licensed-course", lessonNumber: 3, vocabularyIndex: 6, sourceImportSha256: "source", sectionIndex: null, bodyIndex: null };
    const previous = { ...fixture().entries[0], audioUrl: "https://example.org/native.mp3", sourceSpelling: "original", sourceUrl: "https://example.org/lesson", sourceLocator };
    const reviewed = { ...previous, id: "new-native-review", sourceLocator: { ...sourceLocator } };
    const reviews = new Map([[reviewed.id, { decision: "approved-specified-fact", originalFinding: { nativeAudioPreservedForCanonicalOnly: true } }]]);
    const upgrade = { existingEntryId: previous.id, reviewedEntryId: reviewed.id,
      previousFactSha256: createHash("sha256").update(JSON.stringify(previous)).digest("hex") };
    const run = () => applyReviewedFactUpgrades([previous, reviewed], reviews, [upgrade], normalize);
    expect(run()[0].audioUrl).toBe(previous.audioUrl);
    reviewed.sourceLocator.vocabularyIndex = 7;
    expect(run).toThrow();
    reviewed.sourceLocator.vocabularyIndex = 6;
    reviewed.sourceSpelling = "different word";
    expect(run).toThrow();
  });
});
