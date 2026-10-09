import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import source from "../src/data/nahuatlahtolli-course.json";
import base from "../src/data/v3-original-course.json";
const { clarifyReviewedCourseExplanations } = createRequire(import.meta.url)("../scripts/lib/course-explanation-corrections.js");
function fixture() {
  const course = structuredClone(base);
  course.rules.find(rule => rule.id === "negative-and-preference")!.explanation = {
    en: "Nikamati expresses that you like it. Ax nikamati makes the negative statement. The complete coffee question offers hot or cold with so. Reply with the temperature that actually matches your preference.",
    es: "Nikamati expresa que te gusta. Ax nikamati lo niega. La pregunta completa sobre el café ofrece caliente o frío mediante so. Responde con la temperatura que corresponda a tu preferencia."
  };
  return course;
}
describe("first-person preference explanation", () => {
  it("keeps the explanation aligned with the actual speaker and leaves every practice identity intact", () => {
    const course = fixture(), corrected = clarifyReviewedCourseExplanations(course, source);
    const explanation = corrected.rules.find((rule: { id: string }) => rule.id === "negative-and-preference").explanation;
    expect(explanation.en).toContain("I like it"); expect(explanation.en).toContain("I do not like it");
    expect(explanation.es).toContain("me gusta"); expect(explanation.es).not.toContain("te gusta");
    expect(corrected.units).toEqual(course.units); expect(corrected.phrases).toEqual(course.phrases);
  });
  it("refuses a rewrite when the cited source or phrase meaning changes", () => {
    const changed = structuredClone(source); changed.lessons.find(lesson => lesson.number === 18)!.sections[0].body[1] = "different subject";
    expect(() => clarifyReviewedCourseExplanations(fixture(), changed)).toThrow();
    const course = fixture(); course.phrases.find(phrase => phrase.id === "i-like")!.english = "You like it.";
    expect(() => clarifyReviewedCourseExplanations(course, source)).toThrow();
  });
});
