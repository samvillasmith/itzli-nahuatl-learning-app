import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import heldBaseline from "../src/data/audio-held-baseline.json";
import { DIALOGUE_LINE_CORRECTIONS } from "../src/data/dialogue-overrides";
import coreVocabularyFacts from "../src/data/core-vocabulary-facts.json";
import { getUnitDialogueContent } from "../src/lib/db";

const require = createRequire(import.meta.url);
const phonology = require("../scripts/lib/nahuatl-pronunciation.js");
const google = require("../scripts/generate-google-audio.js");
const inputs = require("../scripts/lib/course-audio-inputs.js");
const { buildBenchmark } = require("../scripts/export-audio-benchmark.js");

describe("audio text and pronunciation safeguards", () => {
  it("preserves the INALI ts affricate and final uh glide", () => {
    expect(google.wordToXsampa("tsopelatl")).toContain("ts");
    expect(google.wordToXsampa("tsopelatl")).toEqual(google.wordToXsampa("tzopelatl"));
    const tokens = phonology.tokenizeWord("noicniuh");
    expect(tokens.at(-1)).toMatchObject({ orth: "uh", cue: "w", kind: "consonant" });
    expect(tokens.filter((token: { kind: string }) => token.kind === "vowel")).toHaveLength(3);
    expect(google.wordToXsampa("noicniuh")).toBe('no."ik.niw');
    expect(phonology.normalizeNahuatlText("axcanah")).toBe("axcanah");
    expect(phonology.normalizeNahuatlText("quēniuhqui")).toBe("quēniuhqui");
    expect(phonology.tokenizeWord("quēniuhqui").some((token: { cue: string }) => token.cue === "w")).toBe(true);
  });

  it("retains source vowel length descriptively while Google uses its Spanish approximation", () => {
    expect(google.wordToXsampa("ātl")).toBe('"atx');
    expect(google.wordToXsampa("atl")).toBe('"atx');
    expect(phonology.tokenizeWord("ātl")[0]).toMatchObject({ orth: "ā", long: true, base: "a" });
    expect(phonology.tokenizeWord("cīntli")[0].cue).toBe("s");
    expect(phonology.cueForWord("ī")).not.toBe(phonology.cueForWord("i"));
    for (const text of ["ātl", "tsopelatl", "tzahtzi", "tlahtoa"]) {
      expect(() => google.buildSsml(text, { inputMode: "phoneme" })).not.toThrow();
    }
    expect(() => google.buildSsml("na🙂", { inputMode: "phoneme" })).toThrow("Unsupported pronunciation input");
    expect(() => phonology.tokenizeWord("na🙂")).toThrow("Unsupported pronunciation character");
    expect(() => phonology.buildTtsInput("na🙂")).toThrow("Unsupported pronunciation character");
  });

  it("exports corrected runtime text and preserves every legacy hold", () => {
    const manifest = inputs.loadCurrentAudioManifest();
    expect(heldBaseline.records).toHaveLength(54);
    const byIdentity = new Map(manifest.records.map((row: { kind: string; id: string }) => [`${row.kind}:${row.id}`, row]));
    for (const held of heldBaseline.records) {
      // The original hold remains an immutable historical record. A later,
      // reviewed text correction stays held while its current hash changes.
      expect(inputs.sha256(held.runtime_text)).toBe(held.text_sha256);
      const currentText = held.kind === "dialogue" ? DIALOGUE_LINE_CORRECTIONS[held.id]?.utterance_normalized ?? held.runtime_text : coreVocabularyFacts.facts.find(fact => fact.cardId === Number(held.id))?.sourceSpelling ?? held.runtime_text;
      expect(byIdentity.get(`${held.kind}:${held.id}`)).toMatchObject({
        legacy_hold: true, runtime_text: currentText, text_sha256: inputs.sha256(currentText),
      });
    }
    for (const [id, correction] of Object.entries(DIALOGUE_LINE_CORRECTIONS)) {
      expect(byIdentity.get(`dialogue:${id}`)).toMatchObject({
        runtime_text: correction.utterance_normalized, legacy_hold: true,
        content_review: "source-supported-adaptation", generation_allowed: true,
      });
    }
    expect(byIdentity.get("dialogue:FCN-LDG-000217")).toMatchObject({
      content_review: "unknown", generation_allowed: false,
    });
    expect(getUnitDialogueContent(30).every((line) => line.audio_available === false)).toBe(true);
    // This integration check exports the whole SQLite course and transpiles
    // runtime modules; allow cold Windows runs beyond Vitest's 5-second default.
  }, 15_000);

  it("fails before any database fallback when a local snapshot is missing", () => {
    expect(() => inputs.loadCurrentAudioManifest(join(tmpdir(), "missing-itzli-offline-snapshot.sqlite"))).toThrow("never downloads");
  });

  it("rejects stale hashes and unknown inputs instead of accepting a review flag alone", () => {
    const directory = mkdtempSync(join(tmpdir(), "itzli-audio-input-test-"));
    const file = join(directory, "manifest.json");
    const row = { kind: "dialogue", id: "test", runtime_text: "Nimomachtiz.", synthesis_text: "Nimomachtiz.",
      text_sha256: inputs.sha256("Nimomachtiz."), synthesis_text_sha256: inputs.sha256("Nimomachtiz."),
      content_review: "unknown", generation_allowed: true, source_refs: [] };
    try {
      writeFileSync(file, JSON.stringify({ schema_version: 1, records: [row] }));
      expect(() => inputs.readManifest(file)).toThrow("Unknown/quarantined");
      writeFileSync(file, JSON.stringify({ schema_version: 1, records: [{ ...row, generation_allowed: false, runtime_text: "Old text" }] }));
      expect(() => inputs.readManifest(file)).toThrow("Changed audio text");
    } finally {
      if (!directory.startsWith(join(tmpdir(), "itzli-audio-input-test-"))) throw new Error("Unsafe test cleanup");
      rmSync(directory, { recursive: true });
    }
  });

  it("keeps benchmark recordings tied to exact source forms", () => {
    const manifest = buildBenchmark();
    expect(manifest.records).toHaveLength(19);
    for (const record of manifest.records) {
      expect(record.source_refs[0].text).toBe(record.runtime_text);
      expect(record.native_source_audio_url).toMatch(/^https:\/\/tlahtolli\.coerll\.utexas\.edu\/wp-content\/uploads\//);
      expect(record.review_status).toBe("unreviewed");
    }
    const features = manifest.records.flatMap((row: { features: string[] }) => row.features);
    for (const feature of ["tl", "tz", "h", "final-uh", "long-a", "long-e", "long-i", "long-o"]) {
      expect(features).toContain(feature);
    }
    expect(readFileSync(join(process.cwd(), "scripts/generate-audio.py"), "utf8")).not.toContain("sqlite3");
  });
});
