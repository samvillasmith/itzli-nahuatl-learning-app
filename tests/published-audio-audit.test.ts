import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGeneratedAudioIndex, type GeneratedAudioManifest } from "@/lib/generated-audio";
const require = createRequire(import.meta.url);
const { collectPublishedAudio } = require("../scripts/audit-audio-integrity.js");
const recipe = "spanish-air-b-2026-10-07", assetId = "a".repeat(64);
const asset = (id = assetId) => ({ id, ssml_sha256: "c".repeat(64),
  url: `https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/audio-v3/${recipe}/${id}.mp3` });
const native = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/word.mp3";
const passage = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/passage.mp3";
const row = (id: string, text: string, extra: Record<string, unknown> = {}) => ({ id, runtime_text: text,
  runtime_aliases: [text], job_id: assetId, status: "generate-missing-fixed-content", units: [11], content_accuracy_hold: false,
  ...extra });
function fixture(records = [row("core-vocab:35", "Kenihki tiitstok?")], changes: Partial<GeneratedAudioManifest> = {}, links: { url: string }[] = []) {
  const manifest: GeneratedAudioManifest = { schema_version: 1, recipe_id: recipe, assets: [asset()],
    bindings: [{ reference_id: "core-vocab:35", runtime_text: "Kenihki tiitstok?", asset_id: assetId }],
    source_bindings: [], held_reference_ids: [], lesson_assets: [], ...changes };
  return collectPublishedAudio({ inventory: { recipe_id: recipe, records, external_media_links: links },
    manifest, index: createGeneratedAudioIndex(manifest) });
}
afterEach(() => vi.unstubAllGlobals());

describe("current published audio coverage audit", () => {
  it("counts a reviewed new binding despite a null legacy URL and makes no requests", () => {
    const fetch = vi.fn(() => { throw new Error("Audit must remain local"); }); vi.stubGlobal("fetch", fetch);
    const audit = fixture([row("core-vocab:35", "Kenihki tiitstok?", { existing_audio_url: null, legacy_recording_hold: true })]);
    expect(audit.rows[0]).toMatchObject({ state: "generated", url: asset().url, legacy_hold: true });
    expect(audit.summary).toMatchObject({ available_reference_records: 1, generated_reference_records: 1,
      unbound_reference_records: 0, held_reference_records: 0, free_substitutions_included: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not count another identity's matching text as a missing identity's binding", () => {
    const audit = fixture([row("core-vocab:35", "Kenihki tiitstok?")], {
      bindings: [{ reference_id: "phrase:other", runtime_text: "Kenihki tiitstok?", asset_id: assetId }],
    });
    expect(audit.summary.unbound_reference_records).toBe(1);
    expect(audit.summary.orphan_manifest_reference_ids).toBe(1);
    expect(audit.rows[0].url).toBeNull();
  });

  it("refuses a stale known reference even when its old text is still elsewhere in the manifest", () => {
    const audit = fixture([row("core-vocab:35", "Quehatza tiitztoc?")], { bindings: [
      { reference_id: "core-vocab:35", runtime_text: "Kenihki tiitstok?", asset_id: assetId },
      { reference_id: "phrase:other", runtime_text: "Quehatza tiitztoc?", asset_id: assetId },
    ] });
    expect(audit.summary.unbound_reference_records).toBe(1);
    expect(audit.rows[0].url).toBeNull();
  });

  it("detects an asset for the wrong exact recipe job and a missing raw alias", () => {
    const wrong = fixture(undefined, { assets: [asset("b".repeat(64))],
      bindings: [{ reference_id: "core-vocab:35", runtime_text: "Kenihki tiitstok?", asset_id: "b".repeat(64) }] });
    expect(wrong.rows[0]).toMatchObject({ state: "unbound", reason: "Published asset differs from the current exact text/recipe job" });
    const alias = fixture([row("core-vocab:35", "Kenihki tiitstok?", { runtime_aliases: ["Kenihki tiitstok?", "Quēniuhqui tiitztoc?"] })]);
    expect(alias.summary.available_reference_records).toBe(1);
    expect(alias.summary.unbound_runtime_aliases).toBe(1);
    expect(alias.aliasGaps[0].text).toBe("Quēniuhqui tiitztoc?");
  });

  it("derives holds dynamically and separates them from unbound recordings", () => {
    const held = fixture([row("core-vocab:912", "held word", { content_accuracy_hold: true, hold_reasons: ["Unresolved source sense"] })],
      { held_reference_ids: ["core-vocab:912"], bindings: [] });
    expect(held.summary).toMatchObject({ held_reference_records: 1, held_reference_ids: ["core-vocab:912"], unbound_reference_records: 0 });
    const released = fixture([row("core-vocab:912", "reviewed word")], {
      bindings: [{ reference_id: "core-vocab:912", runtime_text: "reviewed word", asset_id: assetId }],
    });
    expect(released.summary).toMatchObject({ held_reference_records: 0, available_reference_records: 1, unbound_reference_records: 0 });
  });

  it("preserves native priority and distinguishes exact utterances from extra source passages", () => {
    const audit = fixture([row("core-vocab:35", "Kenihki tiitstok?")], {
      source_bindings: [{ reference_id: "core-vocab:35", runtime_text: "Kenihki tiitstok?", url: native }],
      source_asset_urls: [native, passage],
    }, [{ url: passage }]);
    expect(audit.rows[0]).toMatchObject({ state: "source", url: native });
    expect(audit.summary).toMatchObject({ generated_reference_records: 0, source_reference_records: 1,
      linked_original_assets: 2, exact_utterance_original_assets: 1, extra_passage_or_asset_urls: 1, unlisted_original_asset_urls: 0 });
    const omitted = fixture([row("core-vocab:35", "Kenihki tiitstok?")], {
      source_bindings: [{ reference_id: "core-vocab:35", runtime_text: "Kenihki tiitstok?", url: native }],
    }, [{ url: passage }]);
    expect(omitted.summary.unlisted_original_asset_urls).toBe(1);
  });

  it("does not accept a foreign or malformed generated asset as available", () => {
    const foreign = asset(); foreign.url = foreign.url.replace("nahuatl-language", "unrelated-bucket");
    const audit = fixture(undefined, { assets: [foreign] });
    expect(audit.summary).toMatchObject({ available_reference_records: 0, unbound_reference_records: 1, invalid_manifest_assets: 1 });
  });

  it("excludes deliberately held source links from expected coverage while retaining their diagnostic URLs", () => {
    const fetch = vi.fn(() => { throw new Error("Audit must remain local"); }); vi.stubGlobal("fetch", fetch);
    const audit = fixture(undefined, { held_source_urls: [native] }, [{ url: native }, { url: passage }]);
    expect(audit.summary).toMatchObject({ held_original_asset_urls: 1, unlisted_original_asset_urls: 1,
      published_held_original_asset_urls: 0 });
    expect(audit.heldOriginalAssetUrls).toEqual([native]);
    expect(audit.publishedHeldOriginalAssetUrls).toEqual([]);
    const complete = fixture(undefined, { held_source_urls: [native], source_asset_urls: [passage] },
      [{ url: native }, { url: passage }]);
    expect(complete.summary.unlisted_original_asset_urls).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports raw held source bindings, preload lists and lesson links despite the runtime index hiding them", () => {
    const leaks: Partial<GeneratedAudioManifest>[] = [
      { source_bindings: [{ reference_id: "core-vocab:35", runtime_text: "Kenihki tiitstok?", url: native }] },
      { source_asset_urls: [native] },
      { lesson_assets: [{ id: "unit:11", asset_ids: [], source_urls: [native] }] },
    ];
    for (const leak of leaks) {
      const audit = fixture(undefined, { held_source_urls: [native], ...leak }, [{ url: native }]);
      expect(audit.summary.linked_original_assets).toBe(0);
      expect(audit.summary.published_held_original_asset_urls).toBe(1);
      expect(audit.publishedHeldOriginalAssetUrls).toEqual([native]);
      expect(audit.summary.unlisted_original_asset_urls).toBe(0);
    }
  });
});
