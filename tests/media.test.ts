import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import reviewedAudio from "@/data/reviewed-audio.json";
import { CURATED_UNIT_VOCAB } from "@/data/curated-unit-vocab";
import { CURATED_DIALOGUES } from "@/data/dialogue-overrides";
import { SOURCE_VOCAB_PROMOTIONS } from "@/data/source-vocab-promotions";
import { getWordImage } from "@/data/word-images";
import { dialogueAudioUrl, vocabCardAudioUrl } from "@/lib/audio";

const audioRoot = path.join(process.cwd(), "public", "audio-google");
const require = createRequire(import.meta.url);
const { buildTtsInstructions, cueForWord, cueInputForText, spanishLoanSpokenForm } = require("../scripts/lib/nahuatl-pronunciation.js") as {
  buildTtsInstructions: (text: string) => string;
  cueForWord: (text: string) => string;
  cueInputForText: (text: string) => string;
  spanishLoanSpokenForm: (text: string) => string;
};

describe("reviewed media", () => {
  it("ships every reviewed Spanish-voice pronunciation clip", () => {
    expect(new Set(reviewedAudio.dialogue.map((entry) => entry.id)).size).toBe(
      reviewedAudio.dialogue.length,
    );
    for (const entry of reviewedAudio.vocab) {
      const file = path.join(audioRoot, "vocab", `${entry.id}.wav`);
      expect(fs.statSync(file).size, file).toBeGreaterThan(1_000);
      expect(vocabCardAudioUrl(Number(entry.id))).toBe(`/audio-google/vocab/${entry.id}.wav`);
    }

    for (const entry of reviewedAudio.dialogue) {
      const file = path.join(audioRoot, "dialogue", `${entry.id}.wav`);
      expect(fs.statSync(file).size, file).toBeGreaterThan(1_000);
      expect(dialogueAudioUrl(entry.id)).toMatch(
        new RegExp(`^/audio-google/dialogue/${entry.id}\\.wav(?:\\?v=\\d{8}-\\d+)?$`),
      );
    }
  });

  it("cache-busts the corrected dialogue set", () => {
    expect(
      reviewedAudio.dialogue.find((entry) => entry.id === "FCN-LDG-000218")?.text,
    ).toBe("Cuālli. ¿Ācquiya mitzmachtia nāhuatl?");
    expect(dialogueAudioUrl("FCN-LDG-000218")).toBe(
      "/audio-google/dialogue/FCN-LDG-000218.wav?v=20260718-3",
    );
  });

  it("keeps every curated replacement dialogue line audible", () => {
    expect(CURATED_DIALOGUES[5]).toHaveLength(3);
    expect(CURATED_DIALOGUES[11]).toHaveLength(6);
    expect(CURATED_DIALOGUES[19]).toHaveLength(4);
    const curatedLines = [5, 11, 19].flatMap((unit) => CURATED_DIALOGUES[unit]);
    expect(curatedLines.every((line) => line.audio_available !== false)).toBe(true);
    expect(
      curatedLines.every((line) =>
        reviewedAudio.dialogue.some((entry) => entry.id === line.lesson_dialogue_id)
      )
    ).toBe(true);
  });

  it("uses distinct reviewed illustrations for the Unit 11 greeting cards", () => {
    const headwords = ["piyali", "axtlen", "nicca", "ximopanolti"];
    const urls = headwords.map((headword) =>
      getWordImage(headword, { safetyText: ["greeting"] })?.url
    );

    expect(urls.every(Boolean)).toBe(true);
    expect(new Set(urls).size).toBe(headwords.length);
  });

  it("preserves first-party typography provenance", () => {
    const image = getWordImage("ts", { safetyText: [] });

    expect(image?.source).toBe("itzli");
    expect(image?.license).toBe("First-party generated typography");
  });

  it("gives every promoted source card explicit audio and reviewed imagery", () => {
    expect(SOURCE_VOCAB_PROMOTIONS).toHaveLength(240);
    expect(new Set(SOURCE_VOCAB_PROMOTIONS.map((entry) => entry.id)).size).toBe(240);

    for (const entry of SOURCE_VOCAB_PROMOTIONS) {
      expect(entry.audioSrc).toMatch(/^https:\/\//);
      expect(entry.sourceUrl).toMatch(/^https:\/\//);
      expect(
        getWordImage(entry.imageHeadword, {
          allowLegacyFallback: true,
          safetyText: [entry.gloss_en, entry.part_of_speech],
        }),
        `${entry.entry_id}: ${entry.headword}`,
      ).not.toBeNull();
    }
  });

  it("gives every curated word-first card explicit audio and reviewed imagery", () => {
    expect(CURATED_UNIT_VOCAB).toHaveLength(75);
    expect(new Set(CURATED_UNIT_VOCAB.map((entry) => entry.id)).size).toBe(75);

    for (const entry of CURATED_UNIT_VOCAB) {
      expect(entry.audioSrc, `${entry.entry_id}: ${entry.headword}`).toMatch(/^https:\/\//);
      expect(vocabCardAudioUrl(entry.id, entry.audioSrc)).toBe(entry.audioSrc);
      expect(
        getWordImage(entry.imageHeadword, {
          allowLegacyFallback: true,
          safetyText: [entry.gloss_en, entry.part_of_speech],
        }),
        `${entry.entry_id}: ${entry.headword}`,
      ).not.toBeNull();
    }
  });

  it("keeps synthesized curated audio on the reviewed Spanish-voice prefix", () => {
    const synthesized = CURATED_UNIT_VOCAB.filter((entry) => !entry.sourceUrl);
    const sourceRecorded = CURATED_UNIT_VOCAB.filter((entry) => entry.sourceUrl);

    expect(synthesized).toHaveLength(43);
    expect(
      synthesized.every((entry) =>
        entry.audioSrc?.startsWith(
          "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/vocab-reviewed-v2/",
        ),
      ),
    ).toBe(true);
    expect(sourceRecorded).toHaveLength(32);
    expect(sourceRecorded.every((entry) => entry.audioSrc?.includes("tlahtolli.coerll.utexas.edu"))).toBe(true);
  });

  it("preserves Mexican Spanish pronunciation for the month loans", () => {
    expect(cueForWord("febrero")).toBe("feh-BREH-roh");
    expect(cueForWord("junio")).toBe("JOON-yoh");
    expect(cueForWord("septiembre")).toBe("sep-TYEM-breh");
    expect(cueForWord("marso")).toBe("MAR-soh");
    expect(cueForWord("oktubre")).toBe("ohk-TOO-breh");
    expect(cueForWord("disiembre")).toBe("dee-SYEM-breh");
    expect(spanishLoanSpokenForm("marso")).toBe("marzo");
    expect(spanishLoanSpokenForm("oktubre")).toBe("octubre");
    expect(spanishLoanSpokenForm("disiembre")).toBe("diciembre");
    expect(buildTtsInstructions("diciembre")).toContain("natural Mexican Spanish pronunciation");
  });

  it("preserves INALI consonants and dialogue punctuation in TTS cues", () => {
    expect(cueForWord("kwalli")).toBe("KWAHL-lee");
    expect(cueForWord("tsapotl")).toBe("TSAH-pohtl");
    expect(cueForWord("mostlaj")).toBe("MOHS-tlah");
    expect(cueInputForText("Kwalli, ¿kenihki tiistok?")).toBe(
      "kwahl lee, ¿keh neeh kee tee ees tohk?",
    );
  });
});
