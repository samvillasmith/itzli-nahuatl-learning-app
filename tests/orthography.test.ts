import { describe, expect, it } from "vitest";
import { orthographySearchVariants, toInaliOrthography } from "../src/lib/orthography";

describe("INALI learner orthography", () => {
  it("renders the name-question pronunciation transparently", () => {
    expect(toInaliOrthography("¿Quēniuhqui motōcah?")).toBe("¿Kenihki motokah?");
  });

  it("converts common legacy spellings without changing case", () => {
    expect(toInaliOrthography("Cualli tlazohcamati")).toBe("Kwalli tlasohkamati");
    expect(toInaliOrthography("Tzapotl")).toBe("Tsapotl");
  });

  it("keeps conversational and source-course forms searchable", () => {
    const variants = orthographySearchVariants("kenihki motokah");
    expect(variants).toContain("queniuhqui motocah");
    expect(orthographySearchVariants("axkana")).toContain("axtle");
  });
});
