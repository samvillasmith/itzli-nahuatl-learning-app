import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_REVIEWS,
  reviewConstruction,
} from "../src/data/construction-review";
import sourceCourse from "../src/data/nahuatlahtolli-course.json";

function deployedRow(id: string) {
  const review = CONSTRUCTION_REVIEWS[id];
  return {
    priority_id: id,
    first_lesson_number: review.first_lesson_number,
    example_original: review.expected_example_original,
    translation_en: review.expected_translation_en,
    construction_label: "Imported construction",
  };
}

describe("reviewed primer constructions", () => {
  it("fails closed when an ID, lesson, or upstream text has not been reviewed", () => {
    const row = deployedRow("FCN-CP-00157");
    expect(reviewConstruction({ ...row, priority_id: "FCN-CP-99999" })).toBeNull();
    expect(reviewConstruction({ ...row, priority_id: 157 })).toBeNull();
    expect(reviewConstruction({ ...row, first_lesson_number: 10 })).toBeNull();
    expect(reviewConstruction({ ...row, first_lesson_number: 8 })).toBeNull();
    expect(reviewConstruction({ ...row, example_original: "Different example" })).toBeNull();
    expect(reviewConstruction({ ...row, translation_en: "New upstream meaning" })).toBeNull();
    expect(reviewConstruction({ ...row, translation_en: null })).toBeNull();
  });

  it("withholds page furniture, blanks, corrupted text and untranslated narratives", () => {
    const withheld = [1, 2, 4, 6, 7, 12, 19, 28, 37, 58, 66, 70, 84, 88, 95,
      97, 101, 103, 104, 107, 108, 109, 115, 117, 121, 123, 129, 142, 143, 155, 161];
    for (const number of withheld) {
      const id = `FCN-CP-${String(number).padStart(5, "0")}`;
      expect(CONSTRUCTION_REVIEWS[id], id).toBeUndefined();
      expect(reviewConstruction({
        priority_id: id,
        first_lesson_number: 1,
        example_original: "An imported instruction or unreviewed example",
        translation_en: "A translation",
      }), id).toBeNull();
    }
  });

  it("corrects the source-specific meanings of eggs, blue, guavas and family terms", () => {
    expect(reviewConstruction(deployedRow("FCN-CP-00042"))?.translation_en)
      .toBe("There are three eggs; one is blue.");
    expect(reviewConstruction(deployedRow("FCN-CP-00053"))?.translation_en)
      .toBe("How many eggs are there and what color are they?");
    expect(reviewConstruction(deployedRow("FCN-CP-00046"))?.translation_en)
      .toContain("guavas");
    expect(reviewConstruction(deployedRow("FCN-CP-00157"))?.translation_en)
      .toBe("How many older brothers do you have?");
    expect(reviewConstruction(deployedRow("FCN-CP-00158"))?.translation_en)
      .toBe("How many older sisters do you have?");
    const lesson4 = sourceCourse.lessons.find((lesson) => lesson.number === 4)!;
    const lesson9 = sourceCourse.lessons.find((lesson) => lesson.number === 9)!;
    const text4 = lesson4.sections.flatMap((section) => section.body).join("\n");
    const text9 = lesson9.sections.flatMap((section) => section.body).join("\n");
    expect(text4).toContain("eggs");
    expect(text4).toContain("tzictic");
    expect(text4).toContain("guavas");
    expect(text9).toContain("nomimi");
    expect(text9).toContain("older brother");
    expect(text9).toContain("older sister");
  });

  it("preserves possessor and plural subject meanings in body-part questions", () => {
    expect(reviewConstruction(deployedRow("FCN-CP-00133"))?.translation_en)
      .toContain("your stomach");
    expect(reviewConstruction(deployedRow("FCN-CP-00140"))?.translation_en)
      .toContain("our neck");
    expect(reviewConstruction(deployedRow("FCN-CP-00138"))?.translation_en)
      .toContain("we eat");
  });

  it("returns only the exercise text while preserving row identity and source evidence", () => {
    for (const [id, review] of Object.entries(CONSTRUCTION_REVIEWS)) {
      const row = deployedRow(id);
      const cleaned = reviewConstruction(row);
      expect(cleaned, id).toBeDefined();
      expect(cleaned?.priority_id, id).toBe(id);
      expect(cleaned?.construction_label, id).toBe(row.construction_label);
      expect(cleaned?.example_original, id).not.toMatch(/[“”"_→]|^[AB]:|^\d+\./u);
      expect(cleaned?.translation_en, id).not.toMatch(/^"|^[AB]:/u);
      const source = sourceCourse.lessons.find((lesson) => lesson.number === review.source_lesson_number);
      expect(source?.originalUrl, id).toBe(review.source_url);
      expect(review.review_status, id).toBe("source-backed-example");
    }
    expect(reviewConstruction(deployedRow("FCN-CP-00068"))?.translation_en)
      .toBe("I am still a student. I study accounting.");
    expect(reviewConstruction(deployedRow("FCN-CP-00052"))?.example_original)
      .toContain("eltoc");
  });
});
