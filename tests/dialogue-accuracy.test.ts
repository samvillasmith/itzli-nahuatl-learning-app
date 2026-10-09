import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CURATED_DIALOGUES,
  DIALOGUE_LINE_CORRECTIONS,
} from "../src/data/dialogue-overrides";
import sourceCourse from "../src/data/nahuatlahtolli-course.json";
import { getAllUnits, getUnitDialogueContent } from "../src/lib/db";
import { toInaliOrthography } from "../src/lib/orthography";

function generatorRows(file: string, firstId: number, pattern: RegExp) {
  const source = readFileSync(join(process.cwd(), file), "utf8");
  return new Map(
    [...source.matchAll(pattern)].map((match, index) => [
      `FCN-LDG-${String(firstId + index).padStart(6, "0")}`,
      { utterance_normalized: match[1], translation_en: match[2] },
    ]),
  );
}

describe("source-grounded dialogue corrections", () => {
  it("keeps database overrides and regeneration scripts in sync by stable row ID", () => {
    const generated = new Map([
      ...generatorRows(
        "scripts/generate-dialogues.js",
        216,
        /\{ s: "[AB]", ehn: "([^"]*)", en: "([^"]*)" \}/gu,
      ),
      ...generatorRows(
        "scripts/regenerate-dialogues-33-43.js",
        329,
        /\{ speaker: "[AB]", utterance: "([^"]*)",\s+translation: "([^"]*)" \}/gu,
      ),
    ]);
    for (const [id, correction] of Object.entries(DIALOGUE_LINE_CORRECTIONS)) {
      expect(generated.get(id), id).toEqual({
        utterance_normalized: correction.utterance_normalized,
        translation_en: correction.translation_en,
      });
      expect(correction.source_lesson_numbers.length, id).toBeGreaterThan(0);
      for (const number of correction.source_lesson_numbers) {
        expect(sourceCourse.lessons.some((lesson) => lesson.number === number), id).toBe(true);
      }
    }
  });

  it("applies corrected text to the published database and withholds stale recordings", () => {
    const visible = new Map(
      getAllUnits().flatMap((unit) =>
        getUnitDialogueContent(unit.lesson_number).map((line) => [line.lesson_dialogue_id, line] as const),
      ),
    );
    for (const [id, correction] of Object.entries(DIALOGUE_LINE_CORRECTIONS)) {
      const line = visible.get(id);
      expect(line, id).toBeDefined();
      expect(line?.utterance_normalized, id).toBe(correction.utterance_normalized);
      expect(line?.translation_en, id).toBe(correction.translation_en);
      expect(line?.audio_available, id).toBe(false);
    }
  });

  it("practices the conditional forms taught in Units 30 and 31", () => {
    const unit30 = getUnitDialogueContent(30);
    const unit31 = getUnitDialogueContent(31);
    expect(unit30).toHaveLength(4);
    expect(unit31).toHaveLength(4);
    expect(unit30.every((line) => line.utterance_normalized.includes("zquia"))).toBe(true);
    expect(unit31.every((line) => line.utterance_normalized.includes("tozquia"))).toBe(true);
    expect(unit31.some((line) => /God|stars|clouds/i.test(line.translation_en ?? ""))).toBe(false);
  });

  it("uses source-course invitations, sitting, and farewell forms", () => {
    const lesson2 = sourceCourse.lessons.find((lesson) => lesson.number === 2)!;
    const lesson11 = sourceCourse.lessons.find((lesson) => lesson.number === 11)!;
    const text2 = lesson2.sections.flatMap((section) => section.body).join("\n");
    const text11 = lesson11.sections.flatMap((section) => section.body).join("\n");
    expect(text2).toContain("Xipano");
    expect(text2).toContain("Ximocehui");
    expect(text11).toContain("Mōztlayoc");
    expect(CURATED_DIALOGUES[11][1].utterance_normalized).toContain("xipano");
    expect(CURATED_DIALOGUES[19][2].utterance_normalized).toContain(
      toInaliOrthography("Ximocehui"),
    );
    for (const line of CURATED_DIALOGUES[11].slice(4)) {
      expect(line.utterance_normalized).toBe(`${toInaliOrthography("Mōztlayoc")}.`);
      expect(line.audio_available).toBe(false);
    }
  });

  it("uses attested singular futures while leaving source-attested plural examples intact", () => {
    const lesson12 = sourceCourse.lessons.find((lesson) => lesson.number === 12)!;
    const text12 = lesson12.sections.flatMap((section) => section.body).join("\n");
    expect(text12).toContain("Nitlacuāz");
    expect(text12).toContain("Nimomachtiz");
    const line288 = getUnitDialogueContent(22).find((line) => line.lesson_dialogue_id === "FCN-LDG-000288")!;
    const line372 = getUnitDialogueContent(43).find((line) => line.lesson_dialogue_id === "FCN-LDG-000372")!;
    expect(line288.utterance_normalized).toContain("nitlacuāz");
    expect(line288.translation_en).toContain("I'll eat");
    expect(line372.utterance_normalized).toContain("nimomachtiz");
    expect(line372.translation_en).toBe("Very good. I'll study again.");
    expect(line288.audio_available).toBe(false);
    expect(line372.audio_available).toBe(false);
    const lesson3 = sourceCourse.lessons.find((lesson) => lesson.number === 3)!;
    expect(lesson3.sections.flatMap((section) => section.body).join("\n")).toContain("timoittazceh");
    expect(DIALOGUE_LINE_CORRECTIONS["FCN-LDG-000013"]).toBeUndefined();
  });
});
