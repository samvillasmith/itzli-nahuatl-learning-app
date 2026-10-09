import { describe, expect, it } from "vitest";
import { getConversationScenario } from "../src/data/conversation-scenarios";
import { createSourceBrowserAudioLookup, conversationPlaybackHistory } from "../src/lib/course-audio-surfaces";
import type { GeneratedAudioManifest } from "../src/lib/generated-audio";

const assetId = "a".repeat(64);
const audioUrl = `https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/audio-v3/spanish-air-b-2026-10-07/${assetId}.mp3`;
const referenceId = "source-body:2:2:10";
const manifest: GeneratedAudioManifest = {
  schema_version: 1, recipe_id: "spanish-air-b-2026-10-07",
  assets: [{ id: assetId, ssml_sha256: "b".repeat(64), url: audioUrl }],
  bindings: [{ reference_id: referenceId, runtime_text: "Nikan niitstok", asset_id: assetId }],
  held_reference_ids: [], lesson_assets: [],
};

describe("source browser audio is bound to exact published lines", () => {
  it("plays registered source speech without speaking its speaker label or English translation", () => {
    const lookup = createSourceBrowserAudioLookup(manifest);
    expect(lookup("A: Nicān niitztoc", referenceId)).toEqual({ text: "Nikan niitstok", url: audioUrl, referenceId });
    expect(lookup('Nicān niitztoc “I am here”', referenceId)).toEqual({ text: "Nikan niitstok", url: audioUrl, referenceId });
  });

  it("rejects prose, another line identity and changed source text instead of borrowing a matching clip", () => {
    const lookup = createSourceBrowserAudioLookup(manifest);
    expect(lookup("I am here", referenceId)).toBeNull();
    expect(lookup("Nicān niitztoc", "source-body:2:2:11")).toBeNull();
    expect(lookup("Nicān tiitztoc", referenceId)).toBeNull();
  });

  it("retains exact native source priority and never releases an explicit held identity", () => {
    const original = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/test-original.mp3";
    const native = { ...manifest, source_bindings: [{ reference_id: referenceId, runtime_text: "Nikan niitstok", url: original }] };
    expect(createSourceBrowserAudioLookup(native)("Nicān niitztoc", referenceId)?.url).toBe(original);
    expect(createSourceBrowserAudioLookup({ ...native, held_reference_ids: [referenceId] })("Nicān niitztoc", referenceId)).toBeNull();
  });

  it("does not expose a play control for malformed or missing delivery assets", () => {
    const invalid = { ...manifest, assets: [{ ...manifest.assets[0], url: audioUrl + "?unapproved=1" }] };
    expect(createSourceBrowserAudioLookup(invalid)("Nicān niitztoc", referenceId)).toBeNull();
    expect(createSourceBrowserAudioLookup({ ...manifest, assets: [] })("Nicān niitztoc", referenceId)).toBeNull();
  });
});

describe("completed conversation playback follows the original source identities", () => {
  it("rehydrates model and selected reply audio for the actual completed branch in both languages", () => {
    const scenario = getConversationScenario("family")!;
    const step = { turnId: "count", optionId: "siblings-two" };
    const en = conversationPlaybackHistory(scenario, [step], "en");
    const es = conversationPlaybackHistory(scenario, [step], "es");
    const turn = scenario.turns.find(item => item.id === step.turnId)!;
    const reply = turn.options.find(item => item.id === step.optionId)!;
    expect(en).toHaveLength(2);
    expect(en[0]).toMatchObject({ nahuatl: turn.nahuatl, audioUrl: turn.audioUrl, referenceId: "conversation:family:count:model" });
    expect(en[1]).toMatchObject({ nahuatl: reply.nahuatl, audioUrl: reply.audioUrl, referenceId: "conversation:family:count:siblings-two", speaker: "You" });
    expect(es[1]).toMatchObject({ referenceId: en[1].referenceId, translation: "dos", speaker: "Tú" });
  });

  it("does not turn invalid, incorrect or repeat-request choices into completed playback history", () => {
    const scenario = getConversationScenario("introductions")!;
    expect(conversationPlaybackHistory(scenario, [
      { turnId: "missing", optionId: "name-juana" },
      { turnId: "name", optionId: "name-location" },
      { turnId: "name", optionId: "name-repeat" },
    ], "en")).toEqual([]);
  });
});
