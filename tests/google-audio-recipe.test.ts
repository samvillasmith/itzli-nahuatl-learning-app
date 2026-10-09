import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const google = require("../scripts/generate-google-audio.js");
const googleProjectRoot = resolve(dirname(require.resolve("../scripts/generate-google-audio.js")), "..");
const phonology = require("../scripts/lib/nahuatl-pronunciation.js");
const inputs = require("../scripts/lib/course-audio-inputs.js");

function withTemporaryFiles(run: (directory: string) => void) {
  const prefix = join(tmpdir(), "itzli-google-recipe-test-");
  const directory = mkdtempSync(prefix);
  try {
    run(directory);
  } finally {
    if (!directory.startsWith(prefix)) throw new Error("Unsafe test cleanup");
    rmSync(directory, { recursive: true });
  }
}

describe("Google Spanish approximation recipe", () => {
  it("keeps the earlier voice and phoneme defaults without resolving authentication", () => {
    expect(google.parseArgs([], {})).toMatchObject({
      languageCode: "es-US", voiceName: "es-US-Standard-A", speakingRate: 0.82,
      pitch: 0, inputMode: "phoneme", audioEncoding: "LINEAR16", extension: "wav",
      sampleRateHertz: 0, execute: false, held: false, credentials: "", accessToken: "",
    });
    expect(google.parseArgs([], {}).outDir).toBe(join(googleProjectRoot, "data", "audio-v3", "diagnostics", "google", "candidates"));
  });

  it.each([
    ["xochitl", '"So.tSitx'],
    ["huan", '"wan'],
    ["icniuh", '"ik.niw'],
    ["chilli", '"tSil.li'],
    ["calli", '"kal.li'],
    ["tlahtoa", 'txax."to.a'],
    ["tzahtzi", '"tsax.tsi'],
    ["tsahtsi", '"tsax.tsi'],
    ["kwawtli", '"kwaw.txi'],
    ["motōcah", 'mo."to.kax'],
    ["ī", '"i'],
  ])("applies the Spanish recipe to %s", (text, expected) => {
    expect(google.wordToXsampa(text)).toBe(expected);
    expect(() => google.buildSsml(text, { inputMode: "phoneme" })).not.toThrow();
  });

  it("uses the approved Air B phones without changing descriptive Nahuatl tokens", () => {
    expect(google.GOOGLE_RECIPE_VERSION).toBe("spanish-air-b-2026-10-07");
    expect(google.wordToXsampa("atl")).toBe('"atx');
    expect(google.wordToXsampa("tlaxkali")).toBe('txaS."ka.li');
    expect(google.wordToXsampa("sintli")).toBe('"sin.txi');
    expect(phonology.tokenizeWord("atl").at(-1)).toMatchObject({ cue: "tl" });
  });

  it("preserves the natural Spanish stress of existing accented personal names", () => {
    for (const name of ["María", "Ramón", "Tomás"]) {
      expect(google.buildSsml(name, { inputMode: "phoneme" })).toBe(`<speak>${name.toLowerCase()}</speak>`);
    }
    expect(google.buildSsml("café", {inputMode: "phoneme"})).toBe("<speak>café</speak>");
    expect(() => google.buildSsml("Niqué", { inputMode: "phoneme" })).toThrow("Unsupported pronunciation input");
  });

  it("applies kenihki pronunciation aliases only to Google input", () => {
    for (const source of ["quēniuhqui", "queniuhqui", "keniuhki", "keniwki", "kenihki"]) {
      expect(google.wordToXsampa(source)).toBe('ke."nix.ki');
      expect(google.buildSsml(source, { inputMode: "phoneme" })).toContain(`>${source}</phoneme>`);
    }
    expect(google.wordToXsampa("QUĒNIUHQUI")).toBe('ke."nix.ki');
    expect(phonology.normalizeNahuatlText("quēniuhqui")).toBe("quēniuhqui");
    expect(phonology.tokenizeWord("quēniuhqui").some((token: { cue: string }) => token.cue === "w")).toBe(true);
    expect(phonology.tokenizeWord("motōcah").at(-1)).toMatchObject({ orth: "h", cue: "h" });
    expect(phonology.tokenizeWord("ī")[0]).toMatchObject({ orth: "ī", base: "i", long: true });
    expect(google.wordToXsampa("axcanah")).toMatch(/nax$/);
  });

  it("preserves source labels and natural Spanish month loans in SSML", () => {
    const source = "¿Quēniuhqui motōcah?";
    const ssml = google.buildSsml(source, { inputMode: "phoneme" });
    expect(ssml).toContain(">quēniuhqui</phoneme>");
    expect(ssml).toContain(">motōcah</phoneme>");
    expect(ssml).toContain("ke.\"nix.ki");
    expect(ssml).not.toMatch(/ph='[^']*:/);
    expect(source).toBe("¿Quēniuhqui motōcah?");
    expect(google.buildSsml("septiembre", { inputMode: "phoneme" })).toBe("<speak>septiembre</speak>");
    expect(google.buildSsml("oktubre disiembre", { inputMode: "phoneme" })).toBe("<speak>octubre diciembre</speak>");
  });

  it("rejects unsupported input characters in every synthesis mode", () => {
    for (const inputMode of ["phoneme", "cue", "orthography"]) {
      for (const source of ["na🙂", "na 123", "na<script>"]) {
        expect(() => google.buildSsml(source, { inputMode })).toThrow("Unsupported pronunciation input");
      }
    }
    expect(() => google.buildSsml("Tlāhtoa (spoken cue)", { inputMode: "phoneme" })).not.toThrow();
    expect(google.buildSsml("mo’tokah", { inputMode: "phoneme" })).toContain("x");
  });

  it("resolves only whitelisted non-secret settings with environment and file precedence", () => {
    withTemporaryFiles((directory) => {
      const local = join(directory, ".env.local");
      const base = join(directory, ".env");
      writeFileSync(local, [
        'GOOGLE_TTS_VOICE_NAME="es-US-Standard-A"',
        "GOOGLE_TTS_SPEAKING_RATE=0.71", "NAHUATL_GOOGLE_INPUT_MODE='cue'",
        "GOOGLE_TTS_CREDENTIALS=fake-private-file", "GOOGLE_TTS_ACCESS_TOKEN=fake-private-token",
        "GOOGLE_APPLICATION_CREDENTIALS=fake-service-account", "UNRELATED=fake-other-setting",
      ].join("\n"));
      writeFileSync(base, [
        "GOOGLE_TTS_VOICE_NAME=es-ES-Standard-A", "GOOGLE_TTS_SPEAKING_RATE=0.61",
        "NAHUATL_GOOGLE_INPUT_MODE=orthography", "GOOGLE_TTS_PITCH=2",
        "GOOGLE_TTS_ACCESS_TOKEN=fake-base-token",
      ].join("\n"));
      const environment = { GOOGLE_TTS_VOICE: "es-US-Standard-B", GOOGLE_TTS_SPEAKING_RATE: "0.9",
        GOOGLE_TTS_ACCESS_TOKEN: "fake-process-token", GOOGLE_TTS_CREDENTIALS: "fake-process-file" };
      const settings = google.loadGoogleNonSecretSettings([local, base], environment);
      expect(settings).toMatchObject({ GOOGLE_TTS_VOICE_NAME: "es-US-Standard-B",
        GOOGLE_TTS_SPEAKING_RATE: "0.9", NAHUATL_GOOGLE_INPUT_MODE: "cue", GOOGLE_TTS_PITCH: "2" });
      for (const key of ["GOOGLE_TTS_CREDENTIALS", "GOOGLE_TTS_ACCESS_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "UNRELATED"]) {
        expect(settings).not.toHaveProperty(key);
      }
      expect(environment.GOOGLE_TTS_ACCESS_TOKEN).toBe("fake-process-token");
      expect(google.parseArgs(["--voice", "es-US-Standard-C", "--input-mode", "phoneme"], settings))
        .toMatchObject({ voiceName: "es-US-Standard-C", speakingRate: 0.9, inputMode: "phoneme", credentials: "", accessToken: "" });
      const fromFiles = google.loadGoogleNonSecretSettings([local, base], {});
      expect(google.parseArgs([], fromFiles)).toMatchObject({ voiceName: "es-US-Standard-A", speakingRate: 0.71, pitch: 2, inputMode: "cue" });
    });
  });

  it("selects corrected held candidates explicitly and always excludes original source recordings", () => {
    withTemporaryFiles((directory) => {
      const manifest = join(directory, "manifest.json");
      const record = (id: string, legacyHold: boolean, native: boolean, allowed = true) => ({
        kind: "dialogue", id, runtime_text: "Kenihki motokah?", synthesis_text: "Quēniuhqui motōcah?",
        text_sha256: inputs.sha256("Kenihki motokah?"), synthesis_text_sha256: inputs.sha256("Quēniuhqui motōcah?"),
        legacy_hold: legacyHold, generation_allowed: allowed,
        content_review: allowed ? "source-supported-adaptation" : "unknown",
        source_refs: allowed ? [{ source_url: "https://tlahtolli.coerll.utexas.edu/lesson-3/", license: "CC-BY-SA-4.0" }] : [],
        native_source_audio_url: native ? "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/source.mp3" : null,
      });
      const records = [record("active", false, false), record("corrected-held", true, false),
        record("native-active", false, true), record("native-held", true, true), record("unknown-held", true, false, false)];
      writeFileSync(manifest, JSON.stringify({ schema_version: 1, records }));
      const original = JSON.stringify(records);
      const active = google.loadRows(google.parseArgs(["--manifest", manifest], {}));
      const held = google.loadRows(google.parseArgs(["--manifest", manifest, "--held"], {}));
      expect(active.map((row: { id: string }) => row.id)).toEqual(["active"]);
      expect(held.map((row: { id: string }) => row.id)).toEqual(["corrected-held"]);
      expect(held[0]).toMatchObject({ legacy_hold: true, runtime_text: "Kenihki motokah?", text: "Quēniuhqui motōcah?" });
      google.buildSsml(held[0].text, { inputMode: "phoneme" });
      expect(JSON.stringify(records)).toBe(original);
    });
  });

  it("keeps candidate names immutable across voice and pronunciation recipes", () => {
    const args = google.parseArgs([], {});
    const row = { kind: "dialogue", id: "test", text: "Quēniuhqui motōcah?", text_sha256: inputs.sha256("Kenihki motokah?") };
    const original = JSON.stringify(row);
    const output = google.outputPath(args, row);
    expect(output).toMatch(/test--[a-f0-9]{12}--[a-f0-9]{12}\.wav$/);
    expect(output).toContain(join("diagnostics", "google", "candidates"));
    expect(google.outputPath({ ...args, speakingRate: 0.9 }, row)).not.toBe(output);
    expect(google.outputPath({ ...args, voiceName: "es-US-Standard-B" }, row)).not.toBe(output);
    expect(google.outputPath({ ...args, inputMode: "orthography" }, row)).not.toBe(output);
    expect(google.outputPath({ ...args, audioEncoding: "MULAW" }, row)).not.toBe(output);
    expect(google.outputPath(args, { ...row, text: "Kenihki motokah?" })).not.toBe(output);
    expect(JSON.stringify(row)).toBe(original);
  });
});
