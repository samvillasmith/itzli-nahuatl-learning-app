import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { getAllUnits, getUnitVocab } from "@/lib/db";
import { collapseVariants } from "@/data/variant-groups";
import { getVocabCardImage, getVocabCardImageHold, getWordImage } from "@/data/word-images";
import imageReviews from "@/data/image-content-review.json";
import publishedImages from "@/data/openai-word-images.json";

const require = createRequire(import.meta.url);
const generator = require("../scripts/generate-openai-word-images.js") as {
  parseArgs: (args: string[]) => Record<string, unknown>;
  loadCoreRows: (args: Record<string, unknown>) => Array<{ id: number; headword: string; gloss: string; imageReuseHeadword: string }>;
  preparePlan: (args: Record<string, unknown>) => { rows: unknown[]; existing: Array<{ existingReason: string }> };
};

describe("current card image integrity", () => {
  it("binds the corrected how-are-you card to its matching greeting illustration", () => {
    const card = getUnitVocab(11).find((entry) => entry.id === 35)!;
    expect(card.headword).toBe("Kenihki tiitstok?");
    expect(getVocabCardImage(card)?.url).toContain("/kenihki-tiistok-35.png");
    expect(getVocabCardImage(card)?.url).not.toContain("pexels");
    expect(getWordImage("quehatza tiitztoc", { allowLegacyFallback: true, safetyText: ["how are you?"] })?.url)
      .toBe("https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/1005-como-esta.webp");
  });

  it("preserves corrected imagery across localization and rejects a changed canonical meaning", () => {
    const english = getUnitVocab(11).find((entry) => entry.id === 35)!;
    const spanish = { ...english, gloss_en: "¿Cómo estás?", safety_gloss_en: english.gloss_en };
    expect(getVocabCardImage(spanish)?.url).toBe(getVocabCardImage(english)?.url);
    expect(getVocabCardImage(spanish)?.url).toContain("/kenihki-tiistok-35.png");
    expect(getVocabCardImageHold(spanish)).toBeNull();
    expect(getVocabCardImage({ ...spanish, safety_gloss_en: "thank you" })).toBeNull();
    expect(getVocabCardImage({ ...spanish, safety_gloss_en: "explicit nude body" })).toBeNull();
  });

  it("retains canonical safety filtering when the displayed gloss is Spanish", () => {
    const card = { headword: "tototl", gloss_en: "pájaro", safety_gloss_en: "bird" };
    expect(getVocabCardImage(card)).not.toBeNull();
    expect(getVocabCardImage({ ...card, safety_gloss_en: "explicit nude body" })).toBeNull();
  });

  it("never displays recorded wrong spelling or meaning images on an active card", () => {
    const heldUrls = new Set(imageReviews.assets.filter((entry) => entry.status === "held").map((entry) => entry.url));
    for (const unit of getAllUnits()) {
      for (const card of collapseVariants(getUnitVocab(unit.lesson_number), unit.lesson_number).cards) {
        const image = getVocabCardImage(card);
        if (image) expect(heldUrls.has(image.url), `${card.id}: ${card.headword}`).toBe(false);
      }
    }
  });

  it("uses the exact approved location replacement while retaining the old feeling-image hold", () => {
    const card = getUnitVocab(28).find((entry) => entry.id === 902805)!;
    expect(card.gloss_en).toBe("you are; you are located");
    const replacement = publishedImages["core-902805"];
    expect(getVocabCardImage(card)).toMatchObject({ url: replacement.url,
      review_status: "approved", review_scope: "exact-published-image",
      provenance: { entry_id: "core-902805", headword: card.headword,
        meaning_en: card.gloss_en, source_url: card.sourceUrl } });
    expect(replacement.review_source).toMatch(/^v3-image-publication\/[a-f0-9]{64}$/);
    expect(replacement.url).toContain(replacement.image_sha256);
    expect(replacement.url).not.toMatch(/timoyolia/i);
    expect(imageReviews.cards.find(row => row.id === card.id)).toMatchObject({ status: "held" });
    expect(imageReviews.cards.find(row => row.id === card.id)?.reason).toContain("you feel");
    expect(getVocabCardImageHold(card)).toBeNull();
    expect(getVocabCardImage({ ...card, gloss_en: "you feel", safety_gloss_en: "you feel" })).toBeNull();
  });

  it("keeps inspected image reuse bound to the exact current word and meaning", () => {
    const blanket = getUnitVocab(17).find((entry) => entry.id === 411)!;
    const sea = getUnitVocab(40).find((entry) => entry.id === 904001)!;
    expect(getVocabCardImage(blanket)?.current_card_review?.finding).toContain("blanket");
    expect(getVocabCardImage(sea)?.current_card_review?.finding).toContain("open sea");
    expect(getVocabCardImage({ ...sea, gloss_en: "river" })).toBeNull();
    expect(getVocabCardImage({ ...blanket, headword: "unrelated" })).toBeNull();
  });

  it("plans images for corrected concepts rather than obsolete image keys", () => {
    const rows = generator.loadCoreRows(generator.parseArgs(["--dry-run", "--source", "core", "--include-phrases", "--ids", "35,902805,902806"]));
    expect(rows.find((entry) => entry.id === 35)?.headword).toBe("Kenihki tiitstok?");
    expect(rows.find((entry) => entry.id === 902805)).toMatchObject({ headword: "Tiitstok", gloss: "you are; you are located", imageReuseHeadword: "Timoyolia" });
    expect(rows.find((entry) => entry.id === 902806)?.headword).toBe("Ximosewi");
  });

  it("does not plan numeral or month images already covered by exact structured cues", () => {
    const ids = imageReviews.cards.filter((entry) => entry.status === "structured-cue").map((entry) => entry.id);
    expect(ids).toHaveLength(26);
    expect(generator.loadCoreRows(generator.parseArgs(["--dry-run", "--source", "core", "--ids", ids.join(",")]))).toHaveLength(0);
    for (const unit of [33, 34]) for (const card of getUnitVocab(unit)) {
      if (ids.includes(card.id)) expect(getVocabCardImage(card)).toBeNull();
    }
  });

  it("reuses a corrected binding even when the old asset key differs from the current spelling", () => {
    const plan = generator.preparePlan(generator.parseArgs(["--dry-run", "--source", "core", "--include-phrases", "--ids", "35"]));
    expect(plan.rows).toHaveLength(0);
    expect(plan.existing).toEqual(expect.arrayContaining([expect.objectContaining({ existingReason: "current-card-image-binding" })]));
  });
});
