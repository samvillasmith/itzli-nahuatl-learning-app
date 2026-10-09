import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import reviewedAudio from "@/data/reviewed-audio.json";
import { CURATED_UNIT_VOCAB } from "@/data/curated-unit-vocab";
import { CURATED_DIALOGUES, DIALOGUE_LINE_CORRECTIONS } from "@/data/dialogue-overrides";
import { SOURCE_VOCAB_PROMOTIONS } from "@/data/source-vocab-promotions";
import { getWordImage } from "@/data/word-images";
import { getVocabCardImage, getVocabCardImageHold } from "@/data/word-images";
import imageReviews from "@/data/image-content-review.json";
import { dialogueAudioUrl, vocabCardAudioUrl } from "@/lib/audio";

const audioRoot = path.join(process.cwd(), "public", "audio-google");
const withheldDialogueIds = new Set([
  ...Object.keys(DIALOGUE_LINE_CORRECTIONS),
  ...Object.values(CURATED_DIALOGUES).flat().filter((line) => line.audio_available === false)
    .map((line) => line.lesson_dialogue_id),
]);
const require = createRequire(import.meta.url);
const recordedImageHoldReasons = new Set([...imageReviews.cards, ...imageReviews.assets].filter((entry) => entry.status === "held" || entry.status === "structured-cue").map((entry) => entry.reason));
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
      if (withheldDialogueIds.has(entry.id)) continue;
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

  it("withholds stale or missing curated recordings and keeps matching lines audible", () => {
    expect(CURATED_DIALOGUES[5]).toHaveLength(3);
    expect(CURATED_DIALOGUES[11]).toHaveLength(6);
    expect(CURATED_DIALOGUES[19]).toHaveLength(4);
    const curatedLines = [5, 11, 19].flatMap((unit) => CURATED_DIALOGUES[unit]);
    expect(curatedLines.filter((line) => line.audio_available === false)).toHaveLength(10);
    expect(
      curatedLines.filter((line) => line.audio_available !== false).every((line) =>
        reviewedAudio.dialogue.some((entry) => entry.id === line.lesson_dialogue_id)
      )
    ).toBe(true);
  });

  it("uses distinct greeting illustrations and withholds the mislabelled welcome-response image", () => {
    const headwords = ["piyali", "nicca", "ximopanolti"];
    const urls = headwords.map((headword) =>
      getWordImage(headword, { safetyText: ["greeting"] })?.url
    );

    expect(urls.every(Boolean)).toBe(true);
    expect(new Set(urls).size).toBe(headwords.length);
    expect(getWordImage("axtlen", { safetyText: ["you're welcome"] })).toBeNull();
  });

  it("preserves first-party typography provenance", () => {
    const image = getWordImage("ts", { safetyText: [] });

    expect(image?.source).toBe("itzli");
    expect(image?.license).toBe("First-party generated typography");
  });

  it("gives promoted source cards explicit audio and an image or recorded review hold", () => {
    expect(SOURCE_VOCAB_PROMOTIONS).toHaveLength(240);
    expect(new Set(SOURCE_VOCAB_PROMOTIONS.map((entry) => entry.id)).size).toBe(240);

    for (const entry of SOURCE_VOCAB_PROMOTIONS) {
      expect(entry.audioSrc).toMatch(/^https:\/\//);
      expect(entry.sourceUrl).toMatch(/^https:\/\//);
      expect(
        Boolean(getVocabCardImage(entry)) || recordedImageHoldReasons.has(getVocabCardImageHold(entry) ?? ""),
        `${entry.entry_id}: ${entry.headword}`,
      ).toBe(true);
    }
  });

  it("gives curated cards matching media or explicit recorded review holds", () => {
    expect(CURATED_UNIT_VOCAB).toHaveLength(75);
    expect(new Set(CURATED_UNIT_VOCAB.map((entry) => entry.id)).size).toBe(75);

    for (const entry of CURATED_UNIT_VOCAB) {
      if (entry.audioSrc === null) {
        expect(entry.sourceUrl, entry.entry_id).toMatch(/^https:\/\//);
      } else {
        expect(entry.audioSrc, `${entry.entry_id}: ${entry.headword}`).toMatch(/^https:\/\//);
      }
      expect(vocabCardAudioUrl(entry.id, entry.audioSrc)).toBe(entry.audioSrc);
      expect(
        Boolean(getVocabCardImage(entry)) || recordedImageHoldReasons.has(getVocabCardImageHold(entry) ?? ""),
        `${entry.entry_id}: ${entry.headword}`,
      ).toBe(true);
    }
  });

  it("keeps synthesized curated audio on the reviewed Spanish-voice prefix", () => {
    const synthesized = CURATED_UNIT_VOCAB.filter((entry) => entry.audioSrc?.includes("vocab-reviewed-v2"));
    const sourceRecorded = CURATED_UNIT_VOCAB.filter((entry) => entry.audioSrc?.includes("tlahtolli.coerll.utexas.edu"));
    const withheld = CURATED_UNIT_VOCAB.filter((entry) => entry.audioSrc === null);

    expect(synthesized).toHaveLength(37);
    expect(
      synthesized.every((entry) =>
        entry.audioSrc?.startsWith(
          "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/vocab-reviewed-v2/",
        ),
      ),
    ).toBe(true);
    expect(sourceRecorded).toHaveLength(35);
    expect(withheld.map((entry) => entry.entry_id)).toEqual(["curated-28-2", "curated-28-5", "curated-28-7"]);
    expect(sourceRecorded.every((entry) => entry.audioSrc?.includes("tlahtolli.coerll.utexas.edu"))).toBe(true);
  });

  it("never falls back to an old recording when audio is deliberately withheld", () => {
    expect(vocabCardAudioUrl(661, null)).toBeNull();
    expect(vocabCardAudioUrl(680, null)).toBeNull();
    expect(vocabCardAudioUrl(92802, null)).toBeNull();
    expect(vocabCardAudioUrl(123)).toBe("/audio-google/vocab/123.wav");
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
