import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyPublicReferenceFact } = createRequire(import.meta.url)("../scripts/lib/public-reference-fact.js");
const URL = "https://www.aveligob.mx/anz/micrositio/IMAGENES/PDF%20POR%20TEMA/13_NUMEROS_ORDINALES.pdf";
const SHA = "5b46e28429f80f890b36e59d119ce7305ab6cdb8d0a28ccfbb9c23457a0ce935";
function fixture(word = "Sekan") {
  const sourceUrl = URL + "#page=3";
  const reference = { reference_url: URL, source_sha256: SHA, pages: [{ text: "Cover" }, { text: "" }, { text: "Selected reference\n" + word + "\nIndividual spatial fact." }] };
  const entry = { sourceSpelling: word, sourceUrl, audioUrl: null as string | null, sourceLocator: { sourceType: "individual-public-reference-fact", sourceUrl, referenceFileSha256: SHA, attestedHeadword: word, referencePdfPage: 3, referenceTextStart: 19 } };
  return { entry, reference };
}
const verify = (x: ReturnType<typeof fixture>, hash = SHA) => verifyPublicReferenceFact(x.entry, x.reference, hash);
describe("exact public AVELI numerical-location source", () => {
  it.each(["Sekan", "Nawkan"])("accepts individually located %s with the pinned public PDF", word => expect(() => verify(fixture(word))).not.toThrow());
  it("rejects a different PDF even when a matching token is supplied", () => expect(() => verify(fixture(), "0".repeat(64))).toThrow());
  it("rejects a token embedded in a longer unreviewed word", () => {
    const x = fixture(); x.reference.pages[2].text = "Selected reference\nSekantzin\nAnother word.";
    expect(() => verify(x)).toThrow();
  });
  it("rejects a nearby token at the wrong page offset", () => {
    const x = fixture(); x.entry.sourceLocator.referenceTextStart += 1;
    expect(() => verify(x)).toThrow();
  });
  it("rejects attaching audio from another word or source", () => {
    const x = fixture(); x.entry.audioUrl = "https://example.com/other.mp3";
    expect(() => verify(x)).toThrow();
  });
});
