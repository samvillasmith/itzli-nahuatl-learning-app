import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { mergeOwnerConfirmedMeroImages } = require("../scripts/import-s3-word-images.js");
const base = "https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/";
const importScript = fileURLToPath(new URL("../scripts/import-s3-word-images.js", import.meta.url));

function confirmedImage(key = "822001-no.webp") {
  return {
    key, url: base + key, source: "owner-ai", author: "Itzli / Sam Villa-Smith",
    license: "Owner-confirmed AI-generated illustration", alt: "no, negative response",
    owner_confirmed_at: "2026-10-07",
    owner_confirmation: "Owner confirms this is their own AI-generated illustration.",
  };
}

function cachedImage(headword = "axtle") {
  const original = confirmedImage();
  const sha = "a".repeat(64);
  return { ...original,
    original_url: original.url, image_sha256: sha,
    url: `https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/v3/owner-cache/822001-no-${sha}.webp`,
    cache_migration: { schema_version: 1, scope: "same-approved-image-bytes",
      source_asset_url: original.url, source_asset_sha256: sha,
      owner_approval_receipt_sha256: "b".repeat(64),
      approval_source: "Explicit owner approval of Desktop final image review",
      reviewed_at: "2026-10-10T02:00:00Z",
      approved_uses: [{ manifest_headword: headword, entry_id: "word-test", headword, meaning_en: "no" }] } };
}

describe("historical image ownership survives future S3 imports", () => {
  it("retains every existing confirmed mapping during conflicting and incomplete imports", () => {
    const existing = JSON.parse(readFileSync(new URL("../src/data/s3-word-images.json", import.meta.url), "utf8"));
    const confirmed = Object.entries(existing).filter(([, entry]) =>
      (entry as { source?: string }).source === "owner-ai");
    expect(confirmed).toHaveLength(350);
    const imported = Object.fromEntries(confirmed.slice(0, 20).map(([headword]) =>
      [headword, { key: "replacement.png", author: "Itzli", license: "Project word-image asset" }]));
    const newCandidate = Object.freeze({ key: "new-word.png", author: "Itzli", license: "Project word-image asset" });
    imported["a new candidate"] = newCandidate;
    const before = JSON.stringify(existing);
    const merged = mergeOwnerConfirmedMeroImages(Object.freeze(imported), existing);
    for (const [headword, original] of confirmed) {
      expect(merged[headword]).toBe(original);
      expect(merged[headword]).not.toHaveProperty("review_status");
      expect(merged[headword]).not.toHaveProperty("model");
    }
    expect(merged["a new candidate"]).toBe(newCandidate);
    expect(Object.keys(merged)).toHaveLength(351);
    expect(JSON.stringify(existing)).toBe(before);
  });

  it("does not preserve or approve unconfirmed, mislabeled or redirected records", () => {
    const owner = confirmedImage();
    const invalid = [
      { ...owner, source: "s3" },
      { ...owner, url: "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/" + owner.key },
      { ...owner, url: owner.url + "?different-version=1" },
      { ...owner, url: base + "other.webp" },
      { ...owner, key: "../other.webp", url: base + "../other.webp" },
      { ...owner, license: "Project word-image asset" },
      { ...owner, owner_confirmed_at: undefined },
      { ...owner, owner_confirmation: "" },
      { ...owner, author: "" },
      "822001-no.webp",
      null,
    ];
    for (const oldRecord of invalid) {
      const candidate = Object.freeze({ key: "new-candidate.png", license: "Project word-image asset" });
      const merged = mergeOwnerConfirmedMeroImages({ axtle: candidate }, { axtle: oldRecord });
      expect(merged.axtle).toBe(candidate);
      expect(merged.axtle).not.toHaveProperty("source");
      expect(merged.axtle).not.toHaveProperty("owner_confirmation");
      expect(merged.axtle).not.toHaveProperty("review_status");
    }
  });

  it("retains exact owner-approved cache migrations without expanding their provenance", () => {
    const image = Object.freeze(cachedImage());
    const merged = mergeOwnerConfirmedMeroImages({ axtle: { key: "unrelated.png" } }, { axtle: image });
    expect(merged.axtle).toBe(image);
    expect(merged.axtle.original_url).toBe(base + image.key);
    expect(merged.axtle.license).toBe("Owner-confirmed AI-generated illustration");
    expect(merged.axtle).not.toHaveProperty("review_status");
    expect(merged.axtle).not.toHaveProperty("model");
    expect(merged.axtle).not.toHaveProperty("prompt");
  });

  it("rejects cache migrations with a changed source, hash, approval receipt or selected identity", () => {
    const image = cachedImage();
    const invalid = [
      { ...image, original_url: base + "another.webp" },
      { ...image, url: image.url + "?other=1" },
      { ...image, url: image.url.replace("owner-cache/", "unrelated/") },
      { ...image, image_sha256: "c".repeat(64) },
      { ...image, cache_migration: { ...image.cache_migration, source_asset_sha256: "c".repeat(64) } },
      { ...image, cache_migration: { ...image.cache_migration, owner_approval_receipt_sha256: "approved" } },
      { ...image, cache_migration: { ...image.cache_migration, source_asset_url: base + "another.webp" } },
      { ...image, cache_migration: { ...image.cache_migration, schema_version: 2 } },
      { ...image, cache_migration: { ...image.cache_migration, scope: "approve-new-meaning" } },
      { ...image, cache_migration: { ...image.cache_migration, approved_uses: [] } },
      { ...image, cache_migration: { ...image.cache_migration, approved_uses: [{ manifest_headword: "another", entry_id: "word-test", headword: "another", meaning_en: "no" }] } },
    ];
    for (const oldRecord of invalid) {
      const replacement = Object.freeze({ key: "new-candidate.png" });
      expect(mergeOwnerConfirmedMeroImages({ axtle: replacement }, { axtle: oldRecord }).axtle).toBe(replacement);
    }
  });

  it("keeps exact headword keys, URLs and owner metadata without normalizing or fabricating receipts", () => {
    const original = Object.freeze(confirmedImage("my-image.webp"));
    const existing = Object.freeze({ "āxān": original });
    const imported = Object.freeze({ axkan: Object.freeze({ key: "another.png" }) });
    const merged = mergeOwnerConfirmedMeroImages(imported, existing);
    expect(Object.keys(merged)).toEqual(["axkan", "āxān"]);
    expect(merged["āxān"]).toBe(original);
    expect(merged["āxān"].url).toBe(base + "my-image.webp");
    expect(merged["āxān"]).not.toHaveProperty("generated_at");
    expect(merged["āxān"]).not.toHaveProperty("prompt");
    expect(mergeOwnerConfirmedMeroImages(imported, null)).toEqual(imported);
  });

  it("can import the pure helper without starting network requests or writing files", () => {
    const result = execFileSync(process.execPath, ["-e", `
      const https = require('node:https');
      const fs = require('node:fs');
      https.get = () => { throw new Error('Unexpected network request'); };
      fs.writeFileSync = () => { throw new Error('Unexpected file write'); };
      const helper = require(${JSON.stringify(importScript)});
      if (typeof helper.mergeOwnerConfirmedMeroImages !== 'function') throw new Error('Missing pure helper');
      process.stdout.write('imported without effects');
    `], { encoding: "utf8" });
    expect(result).toBe("imported without effects");
  });
});
