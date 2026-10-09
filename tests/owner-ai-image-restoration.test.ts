import { describe, expect, it } from "vitest";
import images from "@/data/s3-word-images.json";
import openaiImages from "@/data/openai-word-images.json";
import imageReviews from "@/data/image-content-review.json";
import { getVocabCardImage, getVocabCardImageHold, getWordImage } from "@/data/word-images";
import { getUnitVocab } from "@/lib/db";

describe("owner-confirmed original image restoration", () => {
  it("preserves original ownership and exact approved cache copies for all mappings", () => {
    const entries = Object.values(images);
    expect(entries).toHaveLength(350);
    expect(new Set(entries.map(entry => "original_url" in entry ? entry.original_url : entry.url)).size).toBe(179);
    for (const entry of entries) {
      expect(entry.key).toMatch(/^[\w-]+\.webp$/);
      if ("cache_migration" in entry) {
        const cached = entry as typeof entry & { original_url: string; image_sha256: string;
          cache_migration: { scope: string; source_asset_url: string; source_asset_sha256: string; owner_approval_receipt_sha256: string } };
        expect(cached.original_url).toBe(`https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/${entry.key}`);
        expect(cached.url).toBe(`https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/v3/owner-cache/${entry.key.replace(/\.webp$/, `-${cached.image_sha256}.webp`)}`);
        expect(cached.image_sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(cached.cache_migration.scope).toBe("same-approved-image-bytes");
        expect(cached.cache_migration.source_asset_url).toBe(cached.original_url);
        expect(cached.cache_migration.source_asset_sha256).toBe(cached.image_sha256);
        expect(cached.cache_migration.owner_approval_receipt_sha256).toMatch(/^[a-f0-9]{64}$/);
      } else {
        expect(entry.url).toBe(`https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/${entry.key}`);
      }
      expect(entry.author).toBe("Itzli / Sam Villa-Smith");
      expect(entry.license).toBe("Owner-confirmed AI-generated illustration");
      expect(entry.source).toBe("owner-ai");
      expect(entry.owner_confirmed_at).toBe("2026-10-07");
      expect(entry.owner_confirmation).toContain("Model, prompt, and generation date are not established");
      expect(entry).not.toHaveProperty("model");
      expect(entry).not.toHaveProperty("prompt");
      expect(entry).not.toHaveProperty("generated_at");
    }
  });

  it("resolves a restored fallback with its owner provenance", () => {
    expect(getWordImage("familia", { safetyText: ["family"] })).toMatchObject({
      url: "https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/3001-familia.webp",
      source: "owner-ai",
      author: "Itzli / Sam Villa-Smith",
      license: "Owner-confirmed AI-generated illustration",
      owner_confirmed_at: "2026-10-07",
      alt: "family",
    });
  });

  it("keeps the preferred current PNG illustration and exact corrected card binding", () => {
    expect(getWordImage("ciento", { safetyText: ["hundred"] })?.url).toBe(openaiImages.ciento.url);
    const greeting = getUnitVocab(11).find(card => card.id === 35)!;
    expect(getVocabCardImage(greeting)?.url).toContain("/kenihki-tiistok-35.png");
    expect(getVocabCardImage({ ...greeting, gloss_en: "thank you" })).toBeNull();
  });

  it("retains historical meaning holds while resolving exact approved replacements and numeral cues", () => {
    const location = getUnitVocab(28).find(card => card.id === 902805)!;
    const replacement = openaiImages["core-902805"];
    expect(getVocabCardImage(location)).toMatchObject({ url: replacement.url,
      review_status: "approved", review_scope: "exact-published-image",
      provenance: { entry_id: "core-902805", meaning_en: location.gloss_en, source_url: location.sourceUrl } });
    expect(replacement.review_source).toMatch(/^v3-image-publication\/[a-f0-9]{64}$/);
    expect(getVocabCardImageHold(location)).toBeNull();
    expect(imageReviews.cards.find(card => card.id === location.id)).toMatchObject({ status: "held" });
    expect(imageReviews.cards.find(card => card.id === location.id)?.reason).toContain("you feel");
    expect(getVocabCardImage({ ...location, gloss_en: "you feel", safety_gloss_en: "you feel" })).toBeNull();
    const seven = getUnitVocab(34).find(card => card.id === 69)!;
    expect(seven).toBeDefined();
    expect(getVocabCardImage(seven)).toBeNull();
  });

  it("does not let owner confirmation bypass depiction or canonical-gloss guards", () => {
    expect(getWordImage("familia", { safetyText: ["explicit nude body"] })).toBeNull();
    expect(getVocabCardImage({ headword: "familia", gloss_en: "familia", safety_gloss_en: "child bathing" })).toBeNull();
    expect(getWordImage("ehuatl", { safetyText: ["skin exposed while bathing"] })).toBeNull();
  });
});
