import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ entries: vi.fn(), units: vi.fn(), cards: vi.fn() }));
vi.mock("../src/lib/unified-course-path", () => ({ getUnifiedVocabularyEntries: mocks.entries }));
vi.mock("../src/lib/db", () => ({ getAllUnits: mocks.units, getUnitVocab: mocks.cards }));
import { getLocalReviewWordImages } from "../src/lib/local-review-word-images";
import { GET } from "../src/app/api/local-review/images/[entryId]/route";
import { getReviewedVocabularyLabels } from "../src/lib/reviewed-vocabulary-labels.cjs";

const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
const hash = createHash("sha256").update(bytes).digest("hex");
let root: string;
const context = { entryId: "word-preview-one", headword: "xochitl", meaningEn: "flower", meaningEs: "flor" };
function entry() {
  return { entry_id: context.entryId, headword: context.headword, meaning_en: context.meaningEn, meaning_es: context.meaningEs,
    image_sha256: hash, local_path: "data/image-production/preview.png", source: "openai", author: "Itzli", alt: "A flower",
    provenance: { entry_id: context.entryId, headword: context.headword, meaning_en: context.meaningEn, meaning_es: context.meaningEs },
    automated_safety_review: { pass: true, contains_people: false, all_people_clearly_adult_25_plus_and_fully_clothed: false,
      contains_minor_or_childlike_person: false, contains_nudity_or_ambiguous_covered_body_exposure: false,
      contains_exposed_genitals_breasts_or_buttocks: false, bathing_scene_contains_people: false,
      contains_bathing_showering_or_changing: false, contains_toilet_urination_defecation_or_body_waste: false,
      contains_sexual_or_suggestive_content: false, contains_injury_blood_or_gore: false,
      contains_unapproved_text_letters_numbers_logo_or_watermark: false, contains_person_in_bed_or_vulnerable_care_scene: false,
      matches_requested_concept_and_composition: true } };
}
const writeStore = (value = entry()) => fs.writeFileSync(path.join(root, "data/openai-word-images-pending.json"), JSON.stringify({ [value.entry_id]: value }));
const request = (id = context.entryId, version = hash) => GET(new Request(`http://127.0.0.1:3000/api/local-review/images/${id}?v=${version}`), { params: Promise.resolve({ entryId: id }) });
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "itzli-preview-images-"));
  fs.mkdirSync(path.join(root, "data/image-production"), { recursive: true });
  fs.writeFileSync(path.join(root, "data/image-production/preview.png"), bytes); writeStore();
  vi.spyOn(process, "cwd").mockReturnValue(root);
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("ITZLI_LOCAL_REVIEW", "1"); vi.stubEnv("VERCEL", "0");
  vi.stubEnv("ITZLI_LOCAL_IMAGE_REVIEW_LEDGER", path.join(root, "data/openai-word-images-pending.json"));
  mocks.entries.mockReturnValue([{ id: context.entryId, display: context.headword, meaningEn: context.meaningEn, meaningEs: context.meaningEs }]);
  mocks.units.mockReturnValue([]); mocks.cards.mockReturnValue([]);
});
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllEnvs();
  if (!root.startsWith(path.join(os.tmpdir(), "itzli-preview-images-"))) throw new Error("Invalid cleanup root");
  fs.rmSync(root, { recursive: true });
});

describe("private image review in actual lessons", () => {
  it("requires the launcher's exact private ledger path without filesystem fallbacks", async () => {
    const stat = vi.spyOn(fs, "statSync");
    vi.stubEnv("ITZLI_LOCAL_IMAGE_REVIEW_LEDGER", "");
    expect(getLocalReviewWordImages([context])).toEqual({});
    expect((await request()).status).toBe(404);
    vi.stubEnv("ITZLI_LOCAL_IMAGE_REVIEW_LEDGER", path.join(root, "other.json"));
    expect(getLocalReviewWordImages([context])).toEqual({});
    expect((await request()).status).toBe(404);
    expect(stat).not.toHaveBeenCalled();
  });
  it("does not read private files or expose a route outside local review, even if enabled on Vercel", async () => {
    const stat = vi.spyOn(fs, "statSync");
    vi.stubEnv("ITZLI_LOCAL_REVIEW", "0");
    expect(getLocalReviewWordImages([context])).toEqual({}); expect((await request()).status).toBe(404);
    vi.stubEnv("ITZLI_LOCAL_REVIEW", "1"); vi.stubEnv("VERCEL", "1");
    expect(getLocalReviewWordImages([context])).toEqual({}); expect((await request()).status).toBe(404);
    expect(stat).not.toHaveBeenCalled();
  });
  it.each(["production", "test", ""])("rejects inherited preview flags in %s without reading private files", async mode => {
    const stat = vi.spyOn(fs, "statSync");
    vi.stubEnv("NODE_ENV", mode);
    expect(getLocalReviewWordImages([context])).toEqual({});
    expect((await request()).status).toBe(404);
    expect(stat).not.toHaveBeenCalled();
  });
  it("serves exact local bytes without granting publication approval or exposing file paths", async () => {
    const original = fs.readFileSync(path.join(root, "data/openai-word-images-pending.json"), "utf8");
    const image = getLocalReviewWordImages([context])[context.entryId];
    expect(image).toMatchObject({ review_status: "local-preview", review_scope: "local-review-preview", image_sha256: hash });
    expect(JSON.stringify(image)).not.toContain("local_path");
    const response = await request(); expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("cache-control")).toBe("private,max-age=31536000,immutable");
    expect(fs.readFileSync(path.join(root, "data/openai-word-images-pending.json"), "utf8")).toBe(original);
  });
  it("rejects changed identities, meanings, unknown IDs and stale URL versions", async () => {
    expect(getLocalReviewWordImages([{ ...context, meaningEn: "different meaning" }])).toEqual({});
    expect(getLocalReviewWordImages([{ ...context, entryId: "other-entry" }])).toEqual({});
    expect((await request("other-entry")).status).toBe(404);
    expect((await request(context.entryId, "f".repeat(64))).status).toBe(404);
    expect((await request("..%2Fsecrets")).status).toBe(404);
  });
  it("rejects changed local pixels and adverse visual verdicts", async () => {
    fs.writeFileSync(path.join(root, "data/image-production/preview.png"), Buffer.concat([bytes, Buffer.from([9])]));
    expect(getLocalReviewWordImages([context])).toEqual({}); expect((await request()).status).toBe(404);
    fs.writeFileSync(path.join(root, "data/image-production/preview.png"), bytes);
    const unsafe = entry(); unsafe.automated_safety_review.contains_minor_or_childlike_person = true; writeStore(unsafe);
    expect(getLocalReviewWordImages([context])).toEqual({}); expect((await request()).status).toBe(404);
  });
  it("still requires the selected sense and exact independent source proof", () => {
    const selected = getReviewedVocabularyLabels().find(row => row.selectedSenseOnly)!;
    const value = { ...entry(), entry_id: selected.id, headword: selected.display, meaning_en: selected.meaningEn, meaning_es: selected.meaningEs,
      provenance: { entry_id: selected.id, headword: selected.display, meaning_en: selected.meaningEn, meaning_es: selected.meaningEs,
        source_fact_review_hash: selected.sourceFactReviewHash,
        selected_sense: { meaning_en: selected.meaningEn, meaning_es: selected.meaningEs, source_fact_review_hash: selected.sourceFactReviewHash } } };
    writeStore(value);
    const current = { entryId: selected.id, headword: selected.display, meaningEn: selected.meaningEn, meaningEs: selected.meaningEs, sourceFactReviewHash: selected.sourceFactReviewHash };
    expect(getLocalReviewWordImages([current])[selected.id]).toBeDefined();
    expect(getLocalReviewWordImages([{ ...current, sourceFactReviewHash: "f".repeat(64) }])).toEqual({});
    expect(getLocalReviewWordImages([{ ...current, meaningEn: selected.beforeEn }])).toEqual({});
  });
});
