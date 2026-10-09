import { describe, expect, it, vi } from "vitest";
vi.mock("../src/data/learner-openai-word-images.json", () => {
  const record = (id: string, headword: string, meaning: string, meaningEs: string) => {
    const url = `https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/v3/${id}.png`;
    return { url, author: "Itzli", license: "OpenAI-generated illustration", alt: meaning,
      image_sha256: "b".repeat(64), review_status: "approved", review_scope: "exact-published-image",
      reviewed_url: url, review_source: `v3-image-publication/${"a".repeat(64)}`,
      provenance: { entry_id: id, headword, meaning_en: meaning, meaning_es: meaningEs } };
  };
  return { default: {
    "word-image-one": record("word-image-one", "xochitl", "flower", "flor"),
    "word-image-two": record("word-image-two", "xochitl", "blossom", "floración"),
    "core-203": record("core-203", "ikniw", "sibling", "hermano/a"),
  } };
});
import { getWordImage, getVocabCardImage, getVocabCardImageHold } from "../src/data/word-images";

describe("published V3 artwork reaches its own lesson", () => {
  it("resolves homograph images by exact entry and meaning", () => {
    const one = getWordImage("xochitl", { entryId: "word-image-one", meaningEn: "flower", meaningEs: "flor" });
    const two = getWordImage("xochitl", { entryId: "word-image-two", meaningEn: "blossom", meaningEs: "floración" });
    expect(one?.url).toContain("word-image-one.png");
    expect(two?.url).toContain("word-image-two.png");
    expect(getWordImage("xochitl", { entryId: "word-image-one", meaningEn: "blossom", meaningEs: "floración" })?.url).not.toBe(one?.url);
  });
  it("allows an exact approved replacement while keeping the historical asset hold", () => {
    const card = { id: 203, entry_id: "203", headword: "ikniw", gloss_en: "sibling" };
    expect(getVocabCardImage(card)?.url).toContain("core-203.png");
    expect(getVocabCardImageHold(card)).toBeNull();
    expect(getVocabCardImage({ ...card, gloss_en: "brother" })).toBeNull();
    expect(getVocabCardImageHold({ ...card, gloss_en: "brother" })).toContain("sibling");
  });
});
