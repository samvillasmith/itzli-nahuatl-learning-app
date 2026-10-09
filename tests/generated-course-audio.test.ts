import { describe, expect, it } from "vitest";
import published from "@/data/generated-course-audio.json";
import { createGeneratedAudioIndex, resolvePracticeRecording, type GeneratedAudioManifest } from "@/lib/generated-audio";
import { audioFixture } from "./helpers/audio-fixture";

const recipe = "spanish-air-b-2026-10-07";
describe("exact published pronunciation bindings", () => {
  it("rejects unrelated hosts, query URLs, malformed hashes, and other recipes", () => {
    const fixture = audioFixture(4);
    fixture.assets[0].url = fixture.assets[0].url.replace("nahuatl-language", "unrelated");
    fixture.assets[1].url += "?token=private";
    fixture.assets[2].id = "same-old-id";
    fixture.assets[3].url = fixture.assets[3].url.replace(recipe, "older-recipe");
    expect(createGeneratedAudioIndex(fixture).assets).toHaveLength(0);
  });
  it("keeps questions, statements, accents, and case distinct", () => {
    const fixture = audioFixture();
    fixture.bindings = [
      { reference_id: "phrase:question", runtime_text: "¿Kwalli?", asset_id: fixture.assets[0].id },
      { reference_id: "phrase:statement", runtime_text: "Kwalli.", asset_id: fixture.assets[1].id },
    ];
    const index = createGeneratedAudioIndex(fixture);
    expect(index.lookup("¿Kwalli?", "phrase:question")?.id).toBe(fixture.assets[0].id);
    expect(index.lookup("Kwalli.", "phrase:question")).toBeNull();
    expect(index.lookup("Kwalli")).toBeNull();
    expect(index.lookup("¿kwalli?")).toBeNull();
    expect(index.lookup("¿Kwālli?")).toBeNull();
  });
  it("requires context identity when the same display text has different approved recordings", () => {
    const fixture = audioFixture();
    fixture.bindings = fixture.assets.slice(0, 2).map((asset, index) => ({ reference_id: `sense:${index}`, runtime_text: "Kwalli", asset_id: asset.id }));
    const index = createGeneratedAudioIndex(fixture);
    expect(index.lookup("Kwalli")).toBeNull();
    expect(index.lookup("Kwalli", "sense:1")?.id).toBe(fixture.assets[1].id);
  });
  it("keeps original recordings ahead of generated practice voices and blocks held contexts", () => {
    const fixture = audioFixture();
    fixture.bindings = [{ reference_id: "core-vocab:35", runtime_text: "Kenihki tiitstok?", asset_id: fixture.assets[0].id },
      { reference_id: "phrase:thanks", runtime_text: "Tlaskamati.", asset_id: fixture.assets[1].id }];
    fixture.held_reference_ids = ["core-vocab:35"];
    const source = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/tlazohcamati.mp3";
    fixture.source_bindings = [{ reference_id: "phrase:thanks", runtime_text: "Tlaskamati.", url: source }];
    const index = createGeneratedAudioIndex(fixture);
    expect(resolvePracticeRecording({ text: "Tlaskamati.", referenceId: "phrase:thanks" }, index)).toMatchObject({ url: source, kind: "source", generated: false });
    expect(resolvePracticeRecording({ text: "Changed text.", referenceId: "phrase:thanks", url: source }, index).url).toBeNull();
    expect(resolvePracticeRecording({ text: "Kenihki tiitstok?", referenceId: "core-vocab:35", url: source }, index).url).toBeNull();
    expect(resolvePracticeRecording({ text: "Tlaskamati.", url: source }, index).url).toBe(source);
    expect(index.hasUrl(source)).toBe(false);
    expect(index.hasSourceUrl(source)).toBe(true);
  });
  it("resolves every published generated binding to its exact immutable asset", () => {
    const manifest = published as GeneratedAudioManifest;
    const index = createGeneratedAudioIndex(manifest);
    expect(index.assets.length).toBe(manifest.assets.length);
    for (const binding of manifest.bindings) {
      if (manifest.held_reference_ids.includes(binding.reference_id)) continue;
      expect(index.lookup(binding.runtime_text, binding.reference_id)?.id, `${binding.reference_id}: ${binding.runtime_text}`).toBe(binding.asset_id);
    }
    for (const binding of manifest.source_bindings ?? []) {
      if (manifest.held_reference_ids.includes(binding.reference_id)) continue;
      expect(index.sourceLookup(binding.runtime_text, binding.reference_id), binding.reference_id).toBe(binding.url);
    }
  });
  it("releases the corrected song identity only for its attested current aliases", () => {
    const index = createGeneratedAudioIndex(published as GeneratedAudioManifest);
    const expected = index.lookup("wikatl", "core-vocab:680");
    expect(index.isHeld("core-vocab:680")).toBe(false);
    expect(expected).toBeTruthy();
    expect(index.lookup("huicatl", "core-vocab:680")?.id).toBe(expected!.id);
    expect(resolvePracticeRecording({ text: "wikatl", referenceId: "core-vocab:680", url: null }, index))
      .toMatchObject({ url: expected!.url, kind: "synthetic", generated: true });
    for (const text of ["kwikatl", "Kwikatl", "cuicatl"])
      expect(resolvePracticeRecording({ text, referenceId: "core-vocab:680", url: "/audio-google/vocab/680.wav" }, index).url).toBeNull();
  });
});
