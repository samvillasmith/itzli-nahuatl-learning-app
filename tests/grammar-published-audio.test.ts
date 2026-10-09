import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import published from "@/data/generated-course-audio.json";
import { GRAMMAR_LESSONS } from "@/data/grammar-lessons";
import { GENERATED_AUDIO_INDEX } from "@/lib/generated-audio";
import { trClient } from "@/i18n/client-translate";
import GrammarLesson from "@/app/grammar/[topic]/GrammarLesson";

const state = vi.hoisted(() => ({ locale: "en" as "en" | "es", cues: [] as { text: string; referenceId: string }[] }));
vi.mock("@/i18n/LocaleProvider", () => ({ useLocale: () => ({
  locale: state.locale, translate: (text: string) => trClient(state.locale, text),
}) }));
vi.mock("@/components/PronunciationAudio", () => ({ default: (props: { text: string; referenceId: string }) => {
  state.cues.push(props);
  return null;
} }));

describe("published grammar cell playback controls", () => {
  it("offers every explicitly inventoried Nahuatl cell in all columns and omits other cells", () => {
    const references = [...new Set([...published.bindings, ...published.source_bindings]
      .map(binding => binding.reference_id)
      .filter(id => id.startsWith("grammar-table:") && id.split(":").length === 5))];
    expect(references.length).toBeGreaterThan(200);
    expect(references.some(id => id.endsWith(":0"))).toBe(true);
    expect(references.some(id => id.endsWith(":2"))).toBe(true);
    for (const locale of ["en", "es"] as const) {
      state.locale = locale;
      state.cues = [];
      for (const lesson of GRAMMAR_LESSONS) renderToStaticMarkup(createElement(GrammarLesson, { lesson, dialogues: [] }));
      const cells = state.cues.filter(cue => cue.referenceId.startsWith("grammar-table:"));
      expect(cells.map(cue => cue.referenceId).sort()).toEqual([...references].sort());
      for (const cue of cells) expect(
        GENERATED_AUDIO_INDEX.sourceLookup(cue.text, cue.referenceId) || GENERATED_AUDIO_INDEX.lookup(cue.text, cue.referenceId)?.url,
        `${locale}: ${cue.referenceId}: ${cue.text}`,
      ).toBeTruthy();
    }
    state.locale = "en";
  });
});
