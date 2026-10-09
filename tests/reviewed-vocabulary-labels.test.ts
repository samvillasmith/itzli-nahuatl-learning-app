import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getVerifiedExpansionEntries } from "../src/data/v3-expansion";
import { getExpansionEntries } from "../src/data/lexical-expansion";
import { getUnifiedLessonForEntry, getUnifiedPathLesson, getUnifiedVocabularyEntries } from "../src/lib/unified-course-path";
import { reviewedVocabularyLabel, getReviewedVocabularyLabels, reviewedHistoricalVocabularyLabel } from "../src/lib/reviewed-vocabulary-labels.cjs";
import originalWords from "../src/data/v3-verified-lexicon.json";
import originalPack from "../src/data/lexical-expansion.json";
import labels from "../src/data/reviewed-vocabulary-labels.json";
import selectedSenses from "../src/data/learner-vocabulary-senses.json";
import { vocabularyLessonContent } from "../src/components/guided-path-lesson-content";
import { isLearnerEntryExcluded } from "../src/lib/app-content-safety";

const originReviewedIds = [
  "word-v3rf-88efbeb4cda71e0c", "word-v3rf-d1ea3b4a1d88f1ed", "word-v3rf-b964019f637b7a18",
  "word-v3rf-47daa0ff24687c24", "word-v3rf-f199cd4318294dcc", "word-v3rf-15d91cdc66a1dab0",
  "word-v3i-89915e3940af3346", "word-v3rf-57157e6fedf7a8d8", "word-v3rf-aa6c47a122d5cdd9",
  "word-v3form-79754ab7fcfb4ef4", "word-v3f-0c7171b3193215b1", "word-v3pv-9abc1a952706fc66",
  "word-v3rf-b64a5cb29c0e65be", "word-v3rf-5cf5b5767c7b1b41", "word-v3pn-fc5d1162107714e3",
  "word-v3pn-f6dcfd90577b3140", "word-v3rf-90c166d5e8a48936", "word-v3rf-60aec1e2ebb48bcf",
];

describe("reviewed vocabulary labels preserve learners' word identities", () => {
  it("retains the immutable factual-label review while applying separate exact source-qualified learner senses", () => {
    const bytes = readFileSync(new URL("../src/data/reviewed-vocabulary-labels.json", import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("120ff0c6c3f467a827198a6e753dd521c144e4ff5ed2cb6fde308b592bbb169f");
    expect(labels.corrections).toHaveLength(21);
    expect(new Set(selectedSenses.corrections.map(row => row.id))).toEqual(new Set([
      "word-v3rf-c571e43a0548dd42", "word-v3d-3f775b3f819cecff", "word-v3rf-050f218449bc3c32",
    ]));
    expect(selectedSenses.corrections).toHaveLength(3);
    expect(getReviewedVocabularyLabels()).toHaveLength(24);
    expect(new Set(getReviewedVocabularyLabels().map(row => row.id)).size).toBe(24);
    for (const selection of selectedSenses.corrections) {
      expect(labels.corrections.some(row => row.id === selection.id)).toBe(false);
      expect(reviewedHistoricalVocabularyLabel(selection.id, selection.beforeEn, selection.beforeEs)).toBeNull();
      expect(reviewedVocabularyLabel(selection.id, selection.beforeEn, selection.beforeEs, selection.sourceFactReviewHash)).toEqual(selection);
      expect(() => reviewedVocabularyLabel(selection.id, selection.beforeEn, selection.beforeEs, "wrong-source")).toThrow(/source fact/);
      expect(getVerifiedExpansionEntries().find(row => row.id === selection.id)).toMatchObject({ meaningEn: selection.meaningEn, meaningEs: selection.meaningEs });
    }
  });
  it("teaches the person-object frame for machtia throughout its assigned lesson", () => {
    const id = "word-v3i-cce871dec1f49d2a";
    const original = originalWords.entries.find(entry => entry.id === id)!;
    const entry = getVerifiedExpansionEntries().find(entry => entry.id === id)!;
    expect(entry.meaningEn).toBe("to teach someone");
    expect(entry.meaningEs).toBe("enseñar a alguien");
    expect(entry).toMatchObject({ id: original.id, display: original.display, sourceSpelling: original.sourceSpelling, audioUrl: original.audioUrl });
    expect(getUnifiedPathLesson(getUnifiedLessonForEntry(id)!)?.entries?.find(entry => entry.id === id)?.meaningEn).toBe("to teach someone");
    expect(entry.attribution.supplementalSources?.some(source => source.url.endsWith("#page=292"))).toBe(true);
  });
  it("keeps the recorded tortilla verb and its card identity while clarifying the action", () => {
    const id = "word-v3-0032";
    const original = originalPack.find(entry => entry.id === id)!;
    const entry = getExpansionEntries().find(entry => entry.id === id)!;
    expect(entry.english).toBe("to prepare and shape tortillas");
    expect(entry.spanish).toBe("preparar y formar tortillas");
    expect(entry).toMatchObject({ id, cardId: original.cardId, sourceSpelling: original.sourceSpelling });
    expect(entry.audio.status).toBe("source-linked");
    expect(getUnifiedPathLesson(getUnifiedLessonForEntry(id)!)?.entries?.find(entry => entry.id === id)?.meaningEs).toBe("preparar y formar tortillas");
  });
  it("requires review again if the original meaning has changed", () => {
    expect(() => reviewedVocabularyLabel("word-v3i-cce871dec1f49d2a", "to learn", "aprender")).toThrow(/original wording/);
  });
  it("distinguishes half measurements from an exact-measurement claim in the learner card", () => {
    const id = "word-v3-0036";
    const original = originalPack.find(entry => entry.id === id)!;
    const entry = getExpansionEntries().find(entry => entry.id === id)!;
    expect(entry.english).toBe("middle; half (measurement)");
    expect(entry.spanish).toBe("medio; mitad (medida)");
    expect(entry.cardId).toBe(original.cardId);
    expect(entry.sourceSpelling).toBe(original.sourceSpelling);
    expect(getUnifiedPathLesson(getUnifiedLessonForEntry(id)!)?.entries?.find(entry => entry.id === id)?.meaningEn).toBe(entry.english);
  });
  it("uses all eighteen independently reviewed labels on actual learning cards without changing source facts or recordings", () => {
    const published = getVerifiedExpansionEntries();
    expect(new Set(originReviewedIds).size).toBe(18);
    for (const id of originReviewedIds) {
      const original = originalWords.entries.find(entry => entry.id === id)!;
      const corrected = labels.corrections.find(entry => entry.id === id)!;
      const entry = published.find(entry => entry.id === id)!;
      expect(corrected, id).toBeDefined();
      if (isLearnerEntryExcluded(id)) {
        expect(entry, id).toBeUndefined();
        expect(getUnifiedLessonForEntry(id)).toBeNull();
        continue;
      }
      expect(entry, id).toBeDefined();
      expect(corrected.beforeEn, id).toBe(original.meaningEn);
      expect(corrected.beforeEs, id).toBe(original.meaningEs);
      expect(entry.meaningEn, id).toBe(corrected.meaningEn);
      expect(entry.meaningEs, id).toBe(corrected.meaningEs);
      expect(entry, id).toMatchObject({ id, display: original.display, sourceSpelling: original.sourceSpelling,
        audioUrl: original.audioUrl, sourceLocator: original.sourceLocator });
      const learnerEntry = getUnifiedVocabularyEntries().find(entry => entry.id === id)!;
      const lessonNumber = getUnifiedLessonForEntry(id);
      if (lessonNumber !== null) {
        expect(getUnifiedPathLesson(lessonNumber)!.entries!.find(entry => entry.id === id)).toEqual(learnerEntry);
      } else {
        // The licensed mama anchor stays in the catalog without a new duplicate path assignment.
        expect(id).toBe("word-v3i-89915e3940af3346");
        expect(original.newToCourse).toBe(false);
      }
      for (const locale of ["en", "es"] as const) {
        const card = vocabularyLessonContent([learnerEntry], locale).learn[0];
        expect(card.kind, id).toBe("form");
        if (card.kind !== "form") throw new Error(`No vocabulary card for ${id}`);
        expect(card.form.meaning, id).toBe(locale === "en" ? corrected.meaningEn : corrected.meaningEs);
      }
    }
  });
  it("retains the culturally specific marriage and visible-location scopes after redrafting", () => {
    const entries = getVerifiedExpansionEntries();
    const monti = entries.find(entry => entry.id === "word-v3rf-57157e6fedf7a8d8")!;
    expect(monti.meaningEn).toMatch(/father-in-law.*after marrying.*a man/);
    expect(monti.meaningEs).toMatch(/suegro.*tras casarse.*un hombre/);
    const nepa = entries.find(entry => entry.id === "word-v3f-0c7171b3193215b1")!;
    expect(nepa.meaningEn).toContain("still in view");
    expect(nepa.meaningEs).toContain("a la vista");
    for (const id of ["word-v3pn-fc5d1162107714e3", "word-v3pn-f6dcfd90577b3140"]) {
      const location = entries.find(entry => entry.id === id)!;
      expect(location.sourceLocator).toMatchObject({ sourceType: "productive-nominal-form",
        nominalProof: { directWholeFormAttestationClaimed: false } });
      expect(location.usageNoteEn).toContain("direct attestation of the whole expression is not claimed");
    }
  });
});
