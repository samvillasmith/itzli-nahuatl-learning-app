import { describe, expect, it } from "vitest";
import course from "../src/data/nahuatlahtolli-course.json";
import { getGrammarLab, GRAMMAR_LABS } from "../src/data/grammar-labs";
import {
  getGrammarLesson,
  GRAMMAR_LESSONS,
  GRAMMAR_REVIEW_HOLDS,
} from "../src/data/grammar-lessons";
import { getLessonFocusCardsForLab, LESSON_FOCUS_CARDS } from "../src/data/lesson-focus-cards";
import {
  answerMatches,
  buildNounPredicate,
  buildPossessedNoun,
  buildPresentVerb,
  normalizeAnswer,
} from "../src/lib/grammar-engine";

function sourceText(...lessonNumbers: number[]) {
  return normalizeAnswer(
    course.lessons
      .filter((lesson) => lessonNumbers.includes(lesson.number))
      .flatMap((lesson) => lesson.sections.flatMap((section) => section.body))
      .join(" "),
  );
}

describe("source-grounded Chicontepec grammar corrections", () => {
  it("keeps the six regular present forms aligned with source Lesson 6", () => {
    const verb = { stem: "tequiti", gloss: "work" };
    const paradigm = [
      ["1sg", "nitequiti"], ["2sg", "titequiti"], ["3sg", "tequiti"],
      ["1pl", "titequitih"], ["2pl", "intequitih"], ["3pl", "tequitih"],
    ] as const;
    for (const [person, form] of paradigm) {
      expect(buildPresentVerb(verb, person)).toBe(form);
      expect(sourceText(6)).toContain(normalizeAnswer(form));
    }
    expect(getLessonFocusCardsForLab("subject-prefixes").map((card) => card.headword))
      .toEqual(paradigm.map(([, form]) => form));
    expect(getLessonFocusCardsForLab("present-tense-verbs").map((card) => card.headword))
      .toContain("intlamachtiah");
  });

  it("keeps possessed-name prefixes and family endings distinct", () => {
    const name = { canonical: "tōcāitl", stem: "tōcā", possessedStem: "tokah", gloss: "name" };
    expect(buildPossessedNoun(name, "2pl")).toBe("inmotokah");
    expect(buildPossessedNoun(name, "3pl")).toBe("inintokah");
    expect(sourceText(9)).toContain(normalizeAnswer("inintōcah"));
    expect(answerMatches("inintōcah", "inintokah")).toBe(true);
    expect(answerMatches("intokah", "inintokah")).toBe(false);

    const family = getGrammarLab("family-possession")!;
    expect(family.examples.map((example) => example.nahuatl))
      .toEqual(["nonanān", "motatah", "īicniuh", "īnanān"]);
    for (const example of family.examples) {
      expect(sourceText(9, 25)).toContain(normalizeAnswer(example.nahuatl));
    }
    const siblingDrill = family.drills.find((drill) => drill.kind === "produce")!;
    if (siblingDrill.kind !== "produce") throw new Error("Missing family production drill");
    const sibling = siblingDrill.items.find((item) => item.english === "her/his sibling")!;
    expect(answerMatches("iicni", sibling.answer, sibling.accepted)).toBe(false);
    expect(answerMatches("iicniuh", sibling.answer, sibling.accepted)).toBe(true);
  });

  it("does not generate unknown plurals, possessed endings, or irregular presents", () => {
    const child = { canonical: "conētl", stem: "conē", gloss: "child", animate: true };
    expect(buildPossessedNoun(child, "1sg")).toBeNull();
    expect(buildNounPredicate(child, "3pl")).toBeNull();
    expect(buildPossessedNoun({ ...child, possessedStem: "conēuh" }, "1sg"))
      .toBe("noconēuh");
    expect(buildNounPredicate({ ...child, plural: "conēmeh" }, "3pl")).toBe("conēmeh");
    expect(buildNounPredicate({
      canonical: "momachtihquetl", stem: "momachti", gloss: "student", animate: true,
      plural: "momachtianih",
    }, "2pl")).toBe("inmomachtianih");
    const irregularGo = { stem: "yāuh", gloss: "go", presentForms: { "1sg": "niyāuh" } };
    expect(buildPresentVerb(irregularGo, "1sg")).toBe("niyāuh");
    expect(buildPresentVerb(irregularGo, "3pl")).toBeNull();
  });

  it("uses source Lesson 20 prefix pil- forms throughout practice", () => {
    const lab = getGrammarLab("respect-affection")!;
    expect(lab.examples.map((example) => example.nahuatl))
      .toEqual(["pilcihuātzin", "nopilahui", "pilcīntzin"]);
    for (const example of lab.examples) {
      expect(sourceText(20)).toContain(normalizeAnswer(example.nahuatl));
    }
    for (const card of getLessonFocusCardsForLab("respect-affection")) {
      expect(sourceText(20)).toContain(normalizeAnswer(card.headword));
    }
    const lesson = getGrammarLesson("diminutives")!;
    expect(JSON.stringify(lesson)).not.toMatch(/calpil|tlahtōlpil|Ximoquētzatsin/u);
  });

  it("requires only source-attested singular future forms in active exercises", () => {
    const lab = getGrammarLab("future-tense")!;
    expect(lab.examples.map((example) => example.nahuatl))
      .toEqual(["Nitequitiz.", "Titequitiz.", "Nimomachtiz."]);
    for (const example of lab.examples) {
      expect(sourceText(12)).toContain(normalizeAnswer(example.nahuatl));
    }
    for (const drill of lab.drills) {
      if (drill.kind !== "transform" && drill.kind !== "produce") continue;
      for (const item of drill.items) {
        expect(sourceText(12)).toContain(normalizeAnswer(item.answer));
        expect(item.answer).not.toMatch(/z(?:queh|ceh)|skeh/iu);
      }
    }
    for (const card of getLessonFocusCardsForLab("future-tense")) {
      expect(sourceText(12)).toContain(normalizeAnswer(card.headword));
    }

    // Review notes may name both spellings, but no active Nahuatl example,
    // paradigm form, focus card, or required answer may teach either plural.
    function requiredForms(value: unknown): string[] {
      if (Array.isArray(value)) return value.flatMap(requiredForms);
      if (!value || typeof value !== "object") return [];
      return Object.entries(value).flatMap(([key, entry]) => {
        if (["nahuatl", "breakdown", "person", "form", "headword", "answer", "accepted"].includes(key)) {
          if (typeof entry === "string") return [entry];
          if (Array.isArray(entry)) return entry.filter((item): item is string => typeof item === "string");
        }
        return requiredForms(entry);
      });
    }
    expect(requiredForms([GRAMMAR_LESSONS, GRAMMAR_LABS, LESSON_FOCUS_CARDS]).join(" "))
      .not.toMatch(/z(?:[·-]?queh|ceh)|skeh/iu);
    expect(JSON.stringify(getLessonFocusCardsForLab("future-tense")))
      .not.toMatch(/z(?:queh|ceh)|skeh/iu);
    expect(getGrammarLesson("future-tense")!.sections)
      .toEqual(expect.arrayContaining([expect.objectContaining({
        kind: "rule",
        text: expect.stringContaining("neither spelling is presented here as universally correct"),
      })]));
  });

  it("teaches imperfect -yaya separately from learned past states", () => {
    const lesson = getGrammarLesson("aspect-mood")!;
    expect(JSON.stringify(lesson)).not.toMatch(/nitequititoya|ticochitoya|tlacuatoya/u);
    const paradigms = lesson.sections.filter((section) => section.kind === "paradigm");
    for (const paradigm of paradigms) {
      if (paradigm.kind !== "paradigm") continue;
      for (const row of paradigm.rows) {
        expect(sourceText(24, 25, 28)).toContain(normalizeAnswer(row.form));
      }
    }
    const pastLab = getGrammarLab("past-tense")!;
    expect(pastLab.examples[0].translation).toBe("I cried.");
    expect(sourceText(14)).toContain(normalizeAnswer(pastLab.examples[0].nahuatl));
  });

  it("serves source directional suffixes and withholds unsupported draft lessons", () => {
    const lesson = getGrammarLesson("directionals")!;
    const table = lesson.sections.find((section) => section.kind === "paradigm")!;
    if (table.kind !== "paradigm") throw new Error("Missing directional table");
    expect(table.rows.map((row) => row.person)).toEqual(["-co", "-qui", "-to", "-ti"]);
    for (const row of table.rows) expect(sourceText(26)).toContain(normalizeAnswer(row.form));
    for (const id of Object.keys(GRAMMAR_REVIEW_HOLDS)) {
      expect(getGrammarLesson(id)).toBeUndefined();
      expect(GRAMMAR_LESSONS.some((lesson) => lesson.id === id)).toBe(false);
    }
    expect(JSON.stringify(GRAMMAR_LESSONS)).not.toMatch(/Okikwak|Ōnēchcōhuilih/u);
  });
});
