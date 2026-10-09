import { describe, expect, it } from "vitest";
import { getReviewedVocabularyLabels } from "@/lib/reviewed-vocabulary-labels.cjs";
import exclusions from "@/data/app-content-exclusions.json";
import lexicon from "@/data/v3-verified-lexicon.json";
import { getVocabCardImage, getWordImage } from "@/data/word-images";
import { isSelectedSenseImageEligible, type SenseBoundImage } from "@/lib/word-image-sense-eligibility";

const selected = getReviewedVocabularyLabels().filter(row => row.selectedSenseOnly);
describe("source-qualified selected image meanings", () => {
  it("rejects old mixed meanings, generic titles and incomplete asset provenance", () => {
    expect(new Set(selected.map(row => row.id))).toEqual(new Set([
      "word-v3rf-c571e43a0548dd42", "word-v3d-3f775b3f819cecff", "word-v3rf-050f218449bc3c32",
    ]));
    for (const sense of selected) {
      const context = { entryId: sense.id, meaningEn: sense.meaningEn, meaningEs: sense.meaningEs,
        sourceFactReviewHash: sense.sourceFactReviewHash };
      const oldImage: SenseBoundImage = { url: "https://example.test/old-art.png", image_sha256: "a".repeat(64),
        review_status: "approved", review_scope: "exact-published-image", reviewed_url: "https://example.test/old-art.png",
        provenance: { entry_id: sense.id, headword: sense.display, meaning_en: sense.beforeEn, meaning_es: sense.beforeEs,
          source_fact_review_hash: sense.sourceFactReviewHash } };
      expect(isSelectedSenseImageEligible(sense.display, context, oldImage)).toBe(false);
      expect(isSelectedSenseImageEligible(sense.display, {}, oldImage)).toBe(false);
      expect(getWordImage(sense.display, { allowLegacyFallback: true, safetyText: [sense.meaningEn, sense.meaningEs] })).toBeNull();
      expect(getVocabCardImage({ headword: sense.display, imageHeadword: "familia", gloss_en: sense.meaningEn, gloss_es: sense.meaningEs })).toBeNull();
    }
  });
  it("allows only the approved exact current sense and rejects identity/source/meaning drift", () => {
    for (const sense of selected) {
      const context = { entryId: sense.id, meaningEn: sense.meaningEn, meaningEs: sense.meaningEs,
        sourceFactReviewHash: sense.sourceFactReviewHash };
      const url = "https://example.test/current-art.png";
      const image: SenseBoundImage = { url, image_sha256: "a".repeat(64), review_status: "approved",
        review_scope: "exact-published-image", reviewed_url: url, provenance: { entry_id: sense.id,
          headword: sense.display, meaning_en: sense.meaningEn, meaning_es: sense.meaningEs,
          source_fact_review_hash: sense.sourceFactReviewHash, selected_sense: { meaning_en: sense.meaningEn,
            meaning_es: sense.meaningEs, source_fact_review_hash: sense.sourceFactReviewHash } } };
      expect(isSelectedSenseImageEligible(sense.display, context, image)).toBe(true);
      expect(isSelectedSenseImageEligible(sense.display, context, {
        ...image, provenance: { ...image.provenance, source_fact_review_hash: null },
      })).toBe(false);
      for (const changed of [{ ...context, entryId: "other-entry" }, { ...context, meaningEn: sense.beforeEn },
        { ...context, meaningEs: sense.beforeEs }, { ...context, sourceFactReviewHash: "b".repeat(64) }])
        expect(isSelectedSenseImageEligible(sense.display, changed, image)).toBe(false);
      expect(isSelectedSenseImageEligible(sense.display, context, { ...image, reviewed_url: url + "?different" })).toBe(false);
      expect(isSelectedSenseImageEligible(sense.display, context, { ...image, review_status: "pending" })).toBe(false);
    }
  });
  it("blocks removed identities and ambiguous legacy headwords in either learner language", () => {
    expect(exclusions.learnerSenseExclusions).toHaveLength(36);
    for (const excluded of exclusions.learnerSenseExclusions) {
      const entry = lexicon.entries.find(row => row.id === excluded.entryId)!;
      expect(entry, excluded.entryId).toBeDefined();
      expect(getWordImage(entry.display, { allowLegacyFallback: true }), entry.id).toBeNull();
      for (const gloss of [entry.meaningEn, entry.meaningEs]) {
        expect(getWordImage(entry.display, { entryId: entry.id, allowLegacyFallback: true, safetyText: [gloss] }), entry.id).toBeNull();
        expect(getVocabCardImage({ headword: entry.display, imageHeadword: "familia", entry_id: entry.id, gloss_en: gloss }), entry.id).toBeNull();
      }
    }
  });
  it("preserves unrelated owner artwork and typography", () => {
    expect(getWordImage("familia", { safetyText: ["family"] })?.source).toBe("owner-ai");
    expect(getWordImage("ts", { safetyText: [] })?.source).toBe("itzli");
  });
});
