import { describe, expect, it } from "vitest";
import { GRAMMAR_LABS } from "../src/data/grammar-labs";
import { GRAMMAR_LESSONS } from "../src/data/grammar-lessons";
import { displayGrammarComparisonCell, displayGrammarText } from "../src/lib/grammar-display";

describe("Nahuatl forms inside grammar instructions", () => {
  it("changes attested forms while preserving the surrounding English", () => {
    expect(displayGrammarText("You can practice calli. The stem cīn- combines with -tli to give cīntli."))
      .toBe("You can practice kalli. The stem sin- combines with -tli to give sintli.");
    expect(displayGrammarText("Huan ta means ‘and you’; the stem is cal-, useful for nocal."))
      .toBe("Wan ta means ‘and you’; the stem is kal-, useful for nokal.");
  });

  it("preserves English labels, hyphenated prose, and colliding short words", () => {
    const text = "You can call a friend. A second-person subject prefix + object prefix + verb stem can express a condition.";
    expect(displayGrammarText(text)).toBe(text);
    expect(displayGrammarText("subject prefix + learned singular future stem + -z"))
      .toBe("subject prefix + learned singular future stem + -s");
    expect(displayGrammarText("Completed past with -qui/-k endings."))
      .toBe("Completed past with -ki/-k endings.");
  });

  it("preserves Spanish words and accents around explicit Nahuatl", () => {
    expect(displayGrammarText("Puedes practicar cīntli y ēhua. Conserva sujeto, objeto, condición y café."))
      .toBe("Puedes practicar sintli y ewa. Conserva sujeto, objeto, condición y café.");
    expect(displayGrammarText("prefijo de sujeto + prefijo de objeto + raíz verbal"))
      .toBe("prefijo de sujeto + prefijo de objeto + raíz verbal");
  });

  it("normalizes inline affixes and macron-marked titles", () => {
    expect(displayGrammarText("Respect and Affection: pil- and -tzin"))
      .toBe("Respect and Affection: pil- and -tsin");
    expect(displayGrammarText("Tlacotōntli huan tlaochpanāliztli"))
      .toBe("Tlakotontli wan tlaochpanalistli");
    expect(displayGrammarText("Use -tzin or -tzitzin for respect and -zquia or -tozquia in the source pattern."))
      .toBe("Use -tsin or -tsitsin for respect and -skia or -toskia in the source pattern.");
  });

  it("keeps historical source-reference columns while rendering the INALI column", () => {
    expect(displayGrammarComparisonCell("cihuātl", "IDIEZ source spelling")).toBe("cihuātl");
    expect(displayGrammarComparisonCell("cualli", "Otra escritura de referencia")).toBe("cualli");
    expect(displayGrammarComparisonCell("cihuātl", "Escritura de aprendizaje INALI")).toBe("siwatl");
    const reference = "Original source conventions use c/qu, hu/uh, and ā ē ī ō: cīntli and cīn-tli.";
    expect(displayGrammarText(reference, true)).toBe(reference);
  });

  it("never rewrites source datasets, answers, IDs, or provenance", () => {
    const before = JSON.stringify([GRAMMAR_LABS, GRAMMAR_LESSONS]);
    for (const lab of GRAMMAR_LABS) {
      displayGrammarText(lab.pattern);
      displayGrammarText(lab.explanation);
      for (const example of lab.examples) displayGrammarText(example.note ?? "");
    }
    expect(JSON.stringify([GRAMMAR_LABS, GRAMMAR_LESSONS])).toBe(before);
  });
});
