import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import published from "@/data/generated-course-audio.json";
import policy from "@/data/audio-learner-exclusions.json";
import { projectLearnerAudioManifest, getExcludedAudioDependencies } from "@/lib/learner-audio-projection.cjs";
import { createGeneratedAudioIndex, GENERATED_AUDIO_INDEX, resolvePracticeRecording } from "@/lib/generated-audio";
import { getExcludedLearnerPhraseIds } from "@/lib/instructional-lessons";
import { audioFixture } from "./helpers/audio-fixture";

const native = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/shared.mp3";
const removedNative = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/excluded.mp3";
const passage = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/passage.mp3";

describe("current learner audio eligibility", () => {
  it("removes excluded downloads and lesson bindings while preserving exact shared clips", () => {
    const fixture = audioFixture(3);
    fixture.bindings = [
      { reference_id: "vocabulary:excluded", runtime_text: "same form", asset_id: fixture.assets[0].id },
      { reference_id: "vocabulary:neutral", runtime_text: "same form", asset_id: fixture.assets[0].id },
      { reference_id: "phrase:excluded", runtime_text: "excluded phrase", asset_id: fixture.assets[1].id },
      { reference_id: "core-vocab:35", runtime_text: "safe question", asset_id: fixture.assets[2].id },
    ];
    fixture.source_bindings = [
      { reference_id: "vocabulary:excluded", runtime_text: "same form", url: native },
      { reference_id: "vocabulary:neutral", runtime_text: "same form", url: native },
      { reference_id: "phrase:excluded", runtime_text: "excluded phrase", url: removedNative },
    ];
    fixture.source_asset_urls = [native, removedNative, passage];
    fixture.lesson_assets = [{ id: "unit:1", asset_ids: fixture.assets.map(asset => asset.id), source_urls: fixture.source_asset_urls }];
    const original = structuredClone(fixture);
    const active = projectLearnerAudioManifest(fixture, { excluded_reference_ids: ["vocabulary:excluded", "phrase:excluded"] });
    expect(fixture).toEqual(original);
    expect(active.assets.map(asset => asset.id)).toEqual([fixture.assets[0].id, fixture.assets[2].id]);
    expect(active.bindings.map(binding => binding.reference_id)).toEqual(["vocabulary:neutral", "core-vocab:35"]);
    expect(active.source_asset_urls).toEqual([native, passage]);
    expect(active.lesson_assets[0]).toMatchObject({ asset_ids: active.assets.map(asset => asset.id), source_urls: [native, passage] });
    const index = createGeneratedAudioIndex(active);
    expect(index.sourceLookup("same form", "vocabulary:neutral")).toBe(native);
    for (const url of [native, fixture.assets[0].url, "/audio-google/vocab/35.wav"])
      expect(resolvePracticeRecording({ text: "same form", referenceId: "vocabulary:excluded", url }, index).url).toBeNull();
    expect(projectLearnerAudioManifest(active, { excluded_reference_ids: active.held_reference_ids })).toEqual(active);
  });

  it("follows exact parent identities without scanning historical provenance prose", () => {
    const parent = "v3-conversation-context-word-v3rf-ae45b9cbb8d63151-q";
    const result = getExcludedAudioDependencies([
      { id: "builder-tile:test:excluded", locator: { parent_reference_id: `phrase:${parent}` } },
      { id: "entry-form:test:excluded", locator: { entry_id: "word-v3rf-ae45b9cbb8d63151", phrase_ids: [parent] } },
      { id: "builder-tile:test:safe", locator: { parent_reference_id: "phrase:safe" }, source_refs: [{ note: "historical sexual-role interpretation excluded from this harmless sense" }] },
      { id: "entry-form:test:shared", locator: { entry_id: "neutral-entry", phrase_ids: [parent, "safe"] } },
    ], [`phrase:${parent}`], ["word-v3rf-ae45b9cbb8d63151"]);
    const ids = result.map(row => row.reference_id);
    expect(ids).toContain("builder-tile:test:excluded");
    expect(ids).toContain("entry-form:test:excluded");
    expect(ids).not.toContain("builder-tile:test:safe");
    expect(ids).not.toContain("entry-form:test:shared");
  });

  it("ships identical eligible online/offline manifests and blocks every current excluded phrase", () => {
    expect(fs.readFileSync(path.resolve("src/data/generated-course-audio.json")).equals(fs.readFileSync(path.resolve("public/generated-course-audio.json")))).toBe(true);
    for (const [file, hash] of Object.entries(policy.source_sha256))
      expect(createHash("sha256").update(fs.readFileSync(path.resolve(file))).digest("hex"), file).toBe(hash);
    const held = new Set(published.held_reference_ids);
    const activeRefs = new Set([...published.bindings, ...published.source_bindings].map(binding => binding.reference_id));
    for (const id of policy.excluded_reference_ids) {
      expect(held.has(id), id).toBe(true);
      expect(activeRefs.has(id), id).toBe(false);
      expect(GENERATED_AUDIO_INDEX.isHeld(id), id).toBe(true);
    }
    for (const id of getExcludedLearnerPhraseIds()) expect(held.has(`phrase:${id}`), id).toBe(true);
    const assets = new Set(published.assets.map(asset => asset.id));
    const referenced = new Set(published.bindings.map(binding => binding.asset_id));
    expect(assets).toEqual(referenced);
    for (const group of published.lesson_assets) for (const id of group.asset_ids) expect(assets.has(id), group.id).toBe(true);
    expect(GENERATED_AUDIO_INDEX.lookup("wikatl", "core-vocab:680")).toBeTruthy();
    expect(JSON.stringify(projectLearnerAudioManifest(published, policy))).toBe(JSON.stringify(published));
  });
});
