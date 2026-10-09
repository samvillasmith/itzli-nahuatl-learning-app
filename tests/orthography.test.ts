import { describe, expect, it } from "vitest";
import { orthographySearchVariants, toInaliOrthography } from "../src/lib/orthography";

describe("INALI learner orthography", () => {
  it("renders the name-question pronunciation transparently", () => {
    expect(toInaliOrthography("¿Quēniuhqui motōcah?")).toBe("¿Kenihki motokah?");
  });

  it("converts common legacy spellings without changing case", () => {
    expect(toInaliOrthography("Cualli tlazohcamati")).toBe("Kwalli tlasohkamati");
    expect(toInaliOrthography("Tzapotl")).toBe("Tsapotl");
    expect(toInaliOrthography("Axcanah. Quēna.")).toBe("Axkana. Kena.");
  });

  it("keeps conversational and source-course forms searchable", () => {
    const variants = orthographySearchVariants("kenihki motokah");
    expect(variants).toContain("queniuhqui motocah");
    expect(orthographySearchVariants("axkana")).toContain("axtle");
  });

  it("adapts the reviewed older concessive spelling without converting other j or final h", () => {
    expect(toInaliOrthography("Maskej. MASKEJ. maskeh.")).toBe("Maskeh. MASKEH. maskeh.");
    expect(toInaliOrthography("jalli ayicanah tlajco")).toBe("jalli ayikanah tlajko");
  });
  it("preserves independently attested sixty variants without general u or l changes", () => {
    expect(toInaliOrthography("Expouali ēpōhualli")).toBe("Expowalli epowalli");
    expect(toInaliOrthography("pouali cualli")).toBe("pouali kwalli");
  });
  it("corrects only the reviewed complete ripening entry without inventing derived allomorphs", () => {
    expect(toInaliOrthography("iucci Iucci IUCCI")).toBe("iwksi Iwksi IWKSI");
    expect(toInaliOrthography("iuccic iuccitoc ikwsik")).toBe("ikwsik ikwsitok ikwsik");
  });
  it("adapts the separately reviewed complete cooked form without guessing other forms", () => {
    expect(toInaliOrthography("iuccicca Iuccicca IUCCICCA")).toBe("iwksikka Iwksikka IWKSIKKA");
    expect(toInaliOrthography("iucciccaya iuccic iuccitoc")).toBe("ikwsikkaya ikwsik ikwsitok");
  });
  it("adapts the reviewed day-after-tomorrow spelling without a generic initial-u rule", () => {
    expect(toInaliOrthography("uiptla Uiptla UIPTLA")).toBe("wiptla Wiptla WIPTLA");
    expect(toInaliOrthography("uiptlaya ualli tlache")).toBe("uiptlaya ualli tlache");
  });
  it("adapts one reviewed divine title while preserving unrelated uc clusters", () => {
    expect(toInaliOrthography("totēuccō Toteucco TOTEUCCO")).toBe("totewkko Totewkko TOTEWKKO");
    expect(toInaliOrthography("teucco hueuccotla")).toBe("tekwko wekwkotla");
  });
});
