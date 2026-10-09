import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getVocabCardImage, getVocabCardImageHold, getWordImage } from "@/data/word-images";
import imageReview from "@/data/image-content-review.json";
import { isAppContentExcluded } from "@/lib/app-content-safety";
import { guidedLessonImage } from "@/lib/guided-lesson-images";
import { getUnifiedVocabularyEntries } from "@/lib/unified-course-path";
import { getAllUnits, getUnitVocab } from "@/lib/db";

const unsafeUrl = "https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/350008-robar.webp";
const semanticIds = ["word-v3d-4e937be654a605d3", "word-v3rf-2b698351d3ff5afb",
  "word-v3r-ced0d631cd1865a5", "word-v3i-b016d2e31ecef67c", "word-v3r-54f227101da61d34"];

describe("final release exact-image safety and meaning holds", () => {
  it("retains the allowed stealing vocabulary while rejecting the threatening image", () => {
    const entry = getUnifiedVocabularyEntries().find(row => row.id === "word-v3d-1ea8ed6bd59fb360")!;
    expect(entry).toBeDefined();
    expect(entry.meaningEn).toBe("to steal something");
    expect(isAppContentExcluded(entry.id, entry.display, entry.meaningEn, entry.meaningEs)).toBe(false);
    expect(imageReview.assets.find(row => row.url === unsafeUrl)?.status).toBe("held");
    expect(guidedLessonImage(entry)).toBeNull();
    for (const spelling of ["ichteki", "ichtequi"])
      expect(getWordImage(spelling, { meaningEn: "to steal something", allowLegacyFallback: true })?.url).not.toBe(unsafeUrl);
  });

  it("cannot select the threatened-person image anywhere in the current course", () => {
    for (const entry of getUnifiedVocabularyEntries()) expect(guidedLessonImage(entry)?.url, entry.id).not.toBe(unsafeUrl);
    for (const unit of getAllUnits()) for (const card of getUnitVocab(unit.lesson_number))
      expect(getVocabCardImage(card)?.url, String(card.id)).not.toBe(unsafeUrl);
  });

  it("withholds wrong selected-sense bindings without removing their words", () => {
    for (const id of semanticIds) {
      const entry = getUnifiedVocabularyEntries().find(row => row.id === id)!;
      expect(entry, id).toBeDefined();
      expect(isAppContentExcluded(entry.id, entry.display, entry.meaningEn, entry.meaningEs), id).toBe(false);
      expect(guidedLessonImage(entry), id).toBeNull();
    }
    // A house can still cue the independently specified living sense. Holding
    // the older-person activity binding does not retire the illustration globally.
    expect(getWordImage("nemi", { meaningEn: "to live" })?.url).toBe(
      "https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/818001-vivir.webp");
    expect(getWordImage("familia", { safetyText: ["family"] })?.source).toBe("owner-ai");
  });

  it("physically excludes globally held image URLs from every learner image catalog", () => {
    for (const name of ["learner-word-images.json", "learner-s3-word-images.json", "learner-openai-word-images.json"]) {
      const contents = fs.readFileSync(path.resolve("src/data", name), "utf8");
      expect(contents, name).not.toContain(unsafeUrl);
      expect(contents, name).not.toContain("350008-robar.webp");
    }
  });

  it("retains explicit card hold reasons after the held original asset is removed from public catalogs", () => {
    for (const card of [
      { id: 802005, entry_id: "source-2-5", headword: "momachtihketl", imageHeadword: "momachtihquetl", gloss_en: "student" },
      { id: 903506, entry_id: "curated-35-6", headword: "kototsin", imageHeadword: "cototzin", gloss_en: "short" },
    ]) {
      const hold = imageReview.cards.find(row => row.id === card.id)!;
      expect(hold).toMatchObject({ status: "held", expected_headword: card.headword, expected_gloss: card.gloss_en });
      expect(getVocabCardImage(card)).toBeNull();
      expect(getVocabCardImageHold(card)).toBe(hold.reason);
    }
  });
});
