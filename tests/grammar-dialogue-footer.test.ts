import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GRAMMAR_LESSONS, type GrammarLesson as GrammarLessonData } from "../src/data/grammar-lessons";
import { getAllUnits, getGrammarDialogues, getUnitDialogueContent } from "../src/lib/db";
import { trClient } from "../src/i18n/client-translate";
import GrammarLesson from "../src/app/grammar/[topic]/GrammarLesson";

const localeState = vi.hoisted(() => ({ locale: "en" as "en" | "es" }));
vi.mock("../src/i18n/LocaleProvider", () => ({
  useLocale: () => ({
    locale: localeState.locale,
    translate: (text: string) => trClient(localeState.locale, text),
  }),
}));

const footerOnlyLesson: GrammarLessonData = {
  id: "footer-regression",
  title: "Dialogue examples",
  nahuatlTitle: "",
  band: "A1",
  shortDesc: "",
  sections: [],
  relatedUnits: [],
};

describe("corrected grammar dialogue footer", () => {
  it("returns only exact selected course pairs, with the same stable IDs and audio holds", () => {
    const unselectedRawIds = new Set([
      "FCN-LDG-000016", "FCN-LDG-000017", "FCN-LDG-000019",
      "FCN-LDG-000028", "FCN-LDG-000029", "FCN-LDG-000030",
      "FCN-LDG-000031", "FCN-LDG-000032", "FCN-LDG-000033",
      "FCN-LDG-000034", "FCN-LDG-000046",
    ]);
    let checked = 0;
    let held = 0;
    for (const lesson of GRAMMAR_LESSONS) {
      const selected = new Map(lesson.relatedUnits.flatMap((number) =>
        getUnitDialogueContent(number).map((line) => [line.lesson_dialogue_id, line] as const),
      ));
      const footer = getGrammarDialogues(lesson.relatedUnits);
      expect(footer.length).toBeLessThanOrEqual(12);
      for (const line of footer) {
        const courseLine = selected.get(line.lesson_dialogue_id);
        expect(courseLine, `${lesson.id}: ${line.lesson_dialogue_id}`).toBeDefined();
        expect(line).toEqual({
          lesson_dialogue_id: courseLine!.lesson_dialogue_id,
          speaker_label: courseLine!.speaker_label,
          utterance_normalized: courseLine!.utterance_normalized,
          translation_en: courseLine!.translation_en,
          audio_available: courseLine!.audio_available !== false,
        });
        expect(unselectedRawIds.has(line.lesson_dialogue_id)).toBe(false);
        expect(line.translation_en?.trim()).toBeTruthy();
        expect(line.utterance_normalized.length).toBeGreaterThan(8);
        expect(line.utterance_normalized.length).toBeLessThan(150);
        checked += 1;
        if (!line.audio_available) held += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(held).toBeGreaterThan(0);
  });

  it("keeps the corrected family-question fixture and withholds its stale recording", () => {
    expect(getGrammarDialogues([9]).find((line) => line.lesson_dialogue_id === "FCN-LDG-000240"))
      .toEqual({
        lesson_dialogue_id: "FCN-LDG-000240",
        speaker_label: "A",
        utterance_normalized: "¿Ticpiya moconēhuan?",
        translation_en: "Do you have children?",
        audio_available: false,
      });
  });

  it("retains selected INALI-only statements rather than requiring source macrons", () => {
    const lines = getGrammarDialogues([11]);
    expect(lines.find((line) => line.lesson_dialogue_id === "CUR-11-002"))
      .toMatchObject({ utterance_normalized: "Piyali, xipano.", translation_en: "Hello, come in.", audio_available: false });
    expect(lines.find((line) => line.lesson_dialogue_id === "CUR-11-003"))
      .toMatchObject({ utterance_normalized: "Tlaskamati.", translation_en: "Thank you.", audio_available: true });
    expect(lines.every((line) => !/[āēīō¿]/u.test(line.utterance_normalized))).toBe(true);
  });

  it("deduplicates repeated related units and preserves the twelve-example bound", () => {
    expect(getGrammarDialogues([])).toEqual([]);
    expect(getGrammarDialogues([9, 11, 9, 11])).toEqual(getGrammarDialogues([9, 11]));
    const all = getGrammarDialogues(getAllUnits().map((unit) => unit.lesson_number));
    expect(all).toHaveLength(12);
    expect(new Set(all.map((line) => line.lesson_dialogue_id)).size).toBe(12);
  });

  it("uses exact published replacements and original recordings while keeping unknown dialogue unavailable", () => {
    for (const locale of ["en", "es"] as const) {
      localeState.locale = locale;
      const playerLabel = `aria-label="${trClient(locale, "Play pronunciation")}"`;
      const familyMarkup = renderToStaticMarkup(createElement(GrammarLesson, {
        lesson: footerOnlyLesson, dialogues: getGrammarDialogues([9]),
      }));
      expect(familyMarkup.split(playerLabel)).toHaveLength(5);
      expect(familyMarkup).not.toContain(trClient(locale, "Audio awaiting review"));
      const mixedLines = getGrammarDialogues([11]);
      expect(mixedLines).toHaveLength(4);
      const mixedMarkup = renderToStaticMarkup(createElement(GrammarLesson, {
        lesson: footerOnlyLesson, dialogues: mixedLines,
      }));
      expect(mixedMarkup.split(playerLabel)).toHaveLength(mixedLines.length + 1);
      const unavailableMarkup = renderToStaticMarkup(createElement(GrammarLesson, {
        lesson: footerOnlyLesson, dialogues: [{ lesson_dialogue_id: "unknown-unreviewed", speaker_label: "A",
          utterance_normalized: "Unreviewed fixture phrasing.", translation_en: "An unavailable dialogue fixture.", audio_available: false }],
      }));
      expect(unavailableMarkup).not.toContain(playerLabel);
      expect(unavailableMarkup).toContain(trClient(locale, "Audio awaiting review"));
    }
    localeState.locale = "en";
  });
});
