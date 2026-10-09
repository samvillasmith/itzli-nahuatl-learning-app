import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isSourceBoundImageEligible } from "../src/lib/word-image-sense-eligibility";
import { isPublishedImageReviewSource } from "../src/lib/image-review-source.cjs";
const require = createRequire(import.meta.url);
const { buildPublicationPlan, publishedImageRecord, assertPublicObject, hash } = require("../scripts/lib/reviewed-image-publication.cjs");
const { publicationConcurrency } = require("../scripts/publish-reviewed-word-images.cjs");
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
let root: string;
const fixture = (id = "word-test-one", meaning = "flower") => ({
  entry_id: id, headword: "xochitl", meaning_en: meaning, meaning_es: "flor",
  local_path: `data/image-production/${id}.png`, image_sha256: hash(png), source: "openai", author: "Itzli", alt: `Illustration for ${meaning}`,
  provenance: { entry_id: id, headword: "xochitl", meaning_en: meaning, meaning_es: "flor", source_fact_review_hash: "c".repeat(64) },
  automated_safety_review: { pass: true, contains_people: false, all_people_clearly_adult_25_plus_and_fully_clothed: false,
    contains_minor_or_childlike_person: false, contains_nudity_or_ambiguous_covered_body_exposure: false,
    contains_exposed_genitals_breasts_or_buttocks: false, bathing_scene_contains_people: false,
    contains_bathing_showering_or_changing: false, contains_toilet_urination_defecation_or_body_waste: false,
    contains_sexual_or_suggestive_content: false, contains_injury_blood_or_gore: false,
    contains_unapproved_text_letters_numbers_logo_or_watermark: false, contains_person_in_bed_or_vulnerable_care_scene: false,
    matches_requested_concept_and_composition: true },
});
const review = (entry: ReturnType<typeof fixture>) => ({ entry_id: entry.entry_id, headword: entry.headword,
  meaning_en: entry.meaning_en, meaning_es: entry.meaning_es, image_sha256: entry.image_sha256,
  publication_approved: true, reviewed_by: "Course owner", reviewed_at: "2026-10-09T05:00:00Z" });
const planFor = (entry: ReturnType<typeof fixture>, reviews?: object[], isExcluded = () => false) => {
  writeFileSync(join(root, entry.local_path), png);
  return buildPublicationPlan({ [entry.entry_id]: entry }, { root, isExcluded,
    reviewLedger: reviews ? { entries: reviews } : null, reviewLedgerHash: "a".repeat(64) });
};
beforeEach(() => { root = mkdtempSync(join(tmpdir(), "itzli-image-publish-")); mkdirSync(join(root, "data/image-production"), { recursive: true }); });
afterEach(() => { if (!root.startsWith(join(tmpdir(), "itzli-image-publish-"))) throw new Error("Invalid test cleanup root"); rmSync(root, { recursive: true }); });

describe("reviewed image publication", () => {
  it("keeps publication concurrency bounded with the original default", () => {
    expect(publicationConcurrency([])).toBe(4);
    expect(publicationConcurrency(["--execute", "--concurrency", "1"])).toBe(1);
    expect(publicationConcurrency(["--concurrency", "12"])).toBe(12);
    for (const value of ["0", "13", "-1", "1.5", "NaN", "Infinity", "1e2", "", "--execute"]) {
      expect(() => publicationConcurrency(["--concurrency", value])).toThrow(/integer from 1 to 12/);
    }
    expect(() => publicationConcurrency(["--concurrency"])).toThrow(/integer from 1 to 12/);
    expect(() => publicationConcurrency(["--concurrency", "4", "--concurrency", "12"])).toThrow(/once/);
  });
  it("prepares an immutable content-addressed URL but cannot publish an unapproved image", () => {
    const entry = fixture(); const plan = planFor(entry); const item = plan.items[0];
    expect(plan).toMatchObject({ count: 1, approvedCount: 0, pendingCount: 1 });
    expect(item.key).toBe(`itzli-app/images/v3/xochitl-word-test-one-${entry.image_sha256}.png`);
    expect(item.cacheControl).toBe("public,max-age=31536000,immutable");
    expect(() => publishedImageRecord(entry, item, "2026-10-09T05:00:00Z")).toThrow(/approval/);
  });
  it("publishes the exact source and selected-meaning proof instead of dropping it", () => {
    const entry = fixture(); const plan = planFor(entry, [review(entry)]);
    const record = publishedImageRecord(entry, plan.items[0], "2026-10-09T05:00:00Z");
    expect(record.provenance).toEqual(entry.provenance);
    expect(record.image_sha256).toBe(entry.image_sha256);
    expect(record.reviewed_url).toBe(record.url);
    expect(isPublishedImageReviewSource(record.review_source)).toBe(true);
  });
  it("rejects a stale human review hash or meaning", () => {
    const entry = fixture();
    expect(() => planFor(entry, [{ ...review(entry), image_sha256: "b".repeat(64) }])).toThrow(/Human review/);
    expect(() => planFor(entry, [{ ...review(entry), meaning_en: "different meaning" }])).toThrow(/Human review/);
  });
  it("rejects changed local bytes and paths outside the reviewed image roots", () => {
    const entry = fixture(); planFor(entry);
    writeFileSync(join(root, entry.local_path), Buffer.concat([png, Buffer.from([9])]));
    expect(() => buildPublicationPlan({ [entry.entry_id]: entry }, { root, isExcluded: () => false })).toThrow(/bytes/);
    expect(() => planFor({ ...entry, local_path: "outside.png" })).toThrow(/outside/);
  });
  it("rejects excluded course records and adverse visual verdicts even with human approval", () => {
    const entry = fixture();
    expect(() => planFor(entry, [review(entry)], () => true)).toThrow(/Excluded learner/);
    const unsafe = { ...entry, automated_safety_review: { ...entry.automated_safety_review, contains_minor_or_childlike_person: true } };
    expect(() => planFor(unsafe, [review(unsafe)])).toThrow(/explicit false/);
  });
  it("keeps homographs as separate image identities and S3 keys", () => {
    const one = fixture(), two = fixture("word-test-two", "blossom");
    for (const entry of [one, two]) writeFileSync(join(root, entry.local_path), png);
    const plan = buildPublicationPlan({ [one.entry_id]: one, [two.entry_id]: two }, { root, isExcluded: () => false });
    expect(plan.count).toBe(2); expect(plan.items[0].key).not.toBe(plan.items[1].key);
  });
  it("verifies public bytes, content type and one-year immutable cache headers", () => {
    const item = planFor(fixture()).items[0];
    const response = new Response(png, { headers: { "content-type": "image/png", "cache-control": item.cacheControl } });
    expect(() => assertPublicObject(response, item, png)).not.toThrow();
    expect(() => assertPublicObject(response, item, Buffer.from([1]))).toThrow(/bytes or cache/);
    expect(() => assertPublicObject(new Response(png, { headers: { "content-type": "image/png", "cache-control": "no-cache" } }), item, png)).toThrow(/bytes or cache/);
  });
});

describe("published image identity", () => {
  it("accepts a source-bound image only for its exact record and meaning", () => {
    const entry = fixture(); const image = { url: "https://example.test/image.png", provenance: entry.provenance };
    expect(isSourceBoundImageEligible("xochitl", { entryId: entry.entry_id, meaningEn: "flower", meaningEs: "flor" }, image)).toBe(true);
    expect(isSourceBoundImageEligible("xochitl", { entryId: "word-test-two", meaningEn: "flower", meaningEs: "flor" }, image)).toBe(false);
    expect(isSourceBoundImageEligible("xochitl", { entryId: entry.entry_id, meaningEn: "blossom", meaningEs: "flor" }, image)).toBe(false);
    expect(isSourceBoundImageEligible("xochitl", {}, image)).toBe(false);
    expect(isSourceBoundImageEligible("xochitl", { imageEntryId: entry.entry_id, meaningEn: "flower" }, image)).toBe(true);
  });
  it("recognizes exact review ledger references while retaining older contact-sheet reviews", () => {
    expect(isPublishedImageReviewSource("openai-word-image-audit/contact-sheet-01")).toBe(true);
    expect(isPublishedImageReviewSource(`v3-image-publication/${"a".repeat(64)}`)).toBe(true);
    expect(isPublishedImageReviewSource("v3-image-publication/approved-everything")).toBe(false);
  });
});
