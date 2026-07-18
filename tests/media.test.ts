import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import reviewedAudio from "@/data/reviewed-audio.json";
import { CURATED_DIALOGUES } from "@/data/dialogue-overrides";
import { getWordImage } from "@/data/word-images";
import { dialogueAudioUrl, vocabCardAudioUrl } from "@/lib/audio";

const audioRoot = path.join(process.cwd(), "public", "audio-google");

describe("reviewed media", () => {
  it("ships every reviewed Spanish-voice pronunciation clip", () => {
    for (const entry of reviewedAudio.vocab) {
      const file = path.join(audioRoot, "vocab", `${entry.id}.wav`);
      expect(fs.statSync(file).size, file).toBeGreaterThan(1_000);
      expect(vocabCardAudioUrl(Number(entry.id))).toBe(`/audio-google/vocab/${entry.id}.wav`);
    }

    for (const entry of reviewedAudio.dialogue) {
      const file = path.join(audioRoot, "dialogue", `${entry.id}.wav`);
      expect(fs.statSync(file).size, file).toBeGreaterThan(1_000);
      expect(dialogueAudioUrl(entry.id)).toBe(`/audio-google/dialogue/${entry.id}.wav`);
    }
  });

  it("keeps every curated Unit 11 dialogue line audible", () => {
    expect(CURATED_DIALOGUES[11]).toHaveLength(6);
    expect(CURATED_DIALOGUES[11].every((line) => line.audio_available !== false)).toBe(true);
    expect(
      CURATED_DIALOGUES[11].every((line) =>
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
});
