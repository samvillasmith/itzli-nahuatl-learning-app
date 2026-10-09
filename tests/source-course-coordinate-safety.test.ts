import { describe, expect, it } from "vitest";
import course from "../src/data/nahuatlahtolli-course.json";
import { sanitizeSourceLesson, type SourceLesson } from "../src/lib/nahuatlahtolli";

describe("source browser audio coordinates survive learner exclusions", () => {
  it("omits prohibited content while retaining every remaining original section, line and word coordinate", () => {
    const lesson: SourceLesson = { ...course.lessons[0], mediaLinks: [], sections: [
      { heading: "Empty", body: [] },
      { heading: "Practice", body: ["to rape", "safe original line"] },
      { heading: "Later practice", body: ["another safe line"] },
    ], vocabulary: [
      { headword: "unsafe-example", gloss: "to shit", audioUrl: null },
      { headword: "metstli", gloss: "moon", audioUrl: null },
    ] };
    const before = structuredClone(lesson);
    const projected = sanitizeSourceLesson(lesson);
    expect(projected.sections.map(section => section.sourceSectionIndex)).toEqual([1, 2]);
    expect(projected.sections.map(section => section.sourceBodyIndices)).toEqual([[1], [0]]);
    expect(projected.sections[0].body).toEqual(["safe original line"]);
    expect(projected.vocabulary).toHaveLength(1);
    expect(projected.vocabulary[0].sourceVocabularyIndex).toBe(2);
    expect(sanitizeSourceLesson(projected)).toEqual(projected);
    expect(lesson).toEqual(before);
  });
});
