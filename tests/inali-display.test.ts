import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { displayNahuatl, toInaliOrthography } from "../src/lib/orthography";
import { TEACHING_STANDARD } from "../src/lib/teaching-standard";
import { displayLearnerExpression, renderLearnerSentenceTemplate } from "../src/lib/learner-expression";
import { personalExpressionReviewCards } from "../src/lib/expression-notebook";
import { getConversationScenarios, getSentencePatterns } from "../src/data/conversation-scenarios";
import course from "../src/data/nahuatlahtolli-course.json";

type StandaloneOrthography = { toInaliOrthography(value: string): string; stripDiacritics(value: string): string };

function loadStandaloneBrowserConverter(): StandaloneOrthography {
  const context: { ItzliOrthography?: StandaloneOrthography } = {};
  runInNewContext(readFileSync(join(process.cwd(), "public/nahuatl-orthography.js"), "utf8"), context);
  if (!context.ItzliOrthography) throw new Error("Standalone converter did not expose its browser API");
  return context.ItzliOrthography;
}

describe("shared INALI learner display", () => {
  it("fixes the reported name question while preserving the reviewed health-question spelling", () => {
    expect(displayNahuatl("Piyalli, ¿quēniuhqui motōcah?")).toBe("Piyalli, ¿kenihki motokah?");
    expect(displayNahuatl("Kenihki tiitstok")).toBe("Kenihki tiitstok");
    expect(displayNahuatl("¿Quēniuhqui tiitztoc?")).toBe("¿Kenihki tiitstok?");
  });

  it("leaves the poster's k, kw, ts, w, h and doubled-l examples intact", () => {
    // Spellings visually checked in the Spanish INALI poster referenced here.
    // These test written examples, not phonetic measurements or vowel-length policy.
    expect(TEACHING_STANDARD.alphabetUrl).toBe("https://site.inali.gob.mx/INALIDhuchlab/assets/files/cartel_alfabeto_Nawatlatolli-espanol.pdf");
    for (const grapheme of ["k", "kw", "ts", "w", "h"]) expect(TEACHING_STANDARD.graphemes).toContain(grapheme);
    for (const word of ["kolotl", "kwawtli", "okwilin", "itskwintli", "siwatl", "witsilin", "ohtli", "chilli", "tlayolli", "tepetl"]) {
      expect(displayNahuatl(word)).toBe(word);
    }
    expect(displayNahuatl("Piyalli chilli tlayolli")).toBe("Piyalli chilli tlayolli");
  });

  it("keeps legacy conversion fixtures distinct from already normalized poster spellings", () => {
    const fixtures = [
      ["calli", "kalli"], ["cualli", "kwalli"], ["tzapotl", "tsapotl"],
      ["cihuatl", "siwatl"], ["ohtli", "ohtli"], ["chilli", "chilli"],
      ["tlazcāmati", "tlaskamati"], ["quēna", "kena"],
    ];
    for (const [source, expected] of fixtures) expect(toInaliOrthography(source)).toBe(expected);
  });

  it("produces identical browser-standalone and TypeScript outputs for source words and exercises", () => {
    const browser = loadStandaloneBrowserConverter();
    const examples = ["Piyalli, ¿quēniuhqui motōcah?", "Kenihki tiitstok", "CUALLI TZAPOTL", "kwawtli okwilin ohtli chilli",
      ...course.lessons.flatMap((lesson) => lesson.vocabulary.map((word) => word.headword)),
      ...getConversationScenarios().flatMap((scenario) => scenario.turns.flatMap((turn) => [turn.nahuatl, ...turn.options.map((option) => option.nahuatl)])),
      ...getSentencePatterns().flatMap((pattern) => pattern.slots.flatMap((slot) => slot.choices.map((choice) => choice.nahuatl))),
    ];
    for (const source of examples) {
      expect(browser.toInaliOrthography(source)).toBe(toInaliOrthography(source));
    }
  });

  it("converts personal sentence frames before inserting names and places", () => {
    expect(renderLearnerSentenceTemplate("my-name", { name: "José García" })).toBe("Na notokah José García.");
    expect(renderLearnerSentenceTemplate("my-origin", { place: "Chicago" })).toBe("Na niewa Chicago.");
    expect(renderLearnerSentenceTemplate("my-origin", { place: "San José García" })).toBe("Na niewa San José García.");
    expect(renderLearnerSentenceTemplate("my-name", { name: "José. Nitequitiz" })).toBeNull();
  });

  it("presents old personal notebook records without replacing their raw text, hash ID or audio status", () => {
    for (const [patternId, raw, expected] of [
      ["my-name", "Na notōcah José García.", "Na notokah José García."],
      ["my-origin", "Na niēhua Chicago.", "Na niewa Chicago."],
    ]) {
      const hash = createHash("sha256").update(JSON.stringify([patternId, raw])).digest("hex");
      const expression = { id: `sentence:${patternId}:personal:${hash}`, nahuatl: raw,
        english: "Personal source-frame expression", spanish: "Expresión personal con estructura de la fuente",
        sourceUrl: getSentencePatterns().find((pattern) => pattern.id === patternId)!.sources[0].url, createdAt: 123 };
      const before = structuredClone(expression);
      expect(displayLearnerExpression(expression)).toBe(expected);
      const card = personalExpressionReviewCards([expression])[0];
      expect(card.id).toBe(before.id);
      expect(card.nahuatl).toBe(raw);
      expect(card.learnerDisplay).toBe(expected);
      expect(card.audioUrl).toBeNull();
      expect(expression).toEqual(before);
    }
  });

  it("keeps source scenario phrases, excerpts, references and audio identities unchanged", () => {
    const scenarios = getConversationScenarios();
    const before = structuredClone(scenarios);
    const courseBefore = structuredClone(course);
    const first = scenarios[0].turns[0];
    expect(first.nahuatl).toBe("Piyalli, ¿quēniuhqui motōcah?");
    expect(displayNahuatl(first.nahuatl)).toBe("Piyalli, ¿kenihki motokah?");
    for (const scenario of scenarios) for (const turn of scenario.turns) {
      displayNahuatl(turn.nahuatl);
      for (const option of turn.options) displayNahuatl(option.nahuatl);
      for (const source of turn.sources) displayNahuatl(source.excerpt);
    }
    expect(getConversationScenarios()).toEqual(before);
    expect(course).toEqual(courseBefore);
    const sourceReply = scenarios[1].turns[0].options.find((option) => option.id === "my-mother")!;
    expect(sourceReply.audioUrl).toBe("https://tlahtolli.coerll.utexas.edu/wp-content/uploads/nonanan.mp3");
    expect(sourceReply.sources[0].id).toBe("coerll-vocab-9-12");
    expect(sourceReply.sources[0].excerpt).toBe("nonanān");
  });
});
