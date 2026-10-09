import { describe, expect, it } from "vitest";
import type { WordImage } from "@/data/word-images";
import type { GuidedForm } from "@/components/guided-path-lesson-content";
import { guidedPracticeImage } from "@/lib/guided-practice-images";

const image: WordImage = { url: "/exact-reviewed.png", author: "Itzli", license: "Local review" };
const images = new Map<string, WordImage | null>([["word-a", image], ["held-word", null]]);
const cue = (id: string) => ({ id } as GuidedForm);

describe("guided vocabulary practice artwork", () => {
  it("shows the exact target on recognition and on recall without a written cue", () => {
    expect(guidedPracticeImage({ entryId: "word-a", cue: cue("word-a") }, images)).toBe(image);
    expect(guidedPracticeImage({ entryId: "word-a", cue: null }, images)).toBe(image);
  });

  it("allows an exact vocabulary cue when the task has no vocabulary target", () => {
    expect(guidedPracticeImage({ entryId: null, cue: cue("word-a") }, images)).toBe(image);
  });

  it("never substitutes another cue, a sentence, or artwork held by the existing lookup", () => {
    expect(guidedPracticeImage({ entryId: "missing-word", cue: cue("word-a") }, images)).toBeNull();
    expect(guidedPracticeImage({ entryId: null, cue: cue("sentence-about-word-a") }, images)).toBeNull();
    expect(guidedPracticeImage({ entryId: "held-word", cue: cue("word-a") }, images)).toBeNull();
    expect(guidedPracticeImage({ entryId: null, cue: null }, images)).toBeNull();
  });
});
