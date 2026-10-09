import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyReferenceStemLocator } = createRequire(import.meta.url)("../scripts/lib/reference-stem-locator.js");
const pdfHash = "a".repeat(64), url = "https://example.org/reference.pdf";
function fixture() {
  const reference = { reference_url: url, source_sha256: pdfHash,
    pages: Array.from({ length: 16 }, () => ({ text: "" })) };
  reference.pages[15].text = "EXAMPLE. tlat. no.\ntlaaxca. -base.\nNEXT. tlat. tlaaxca. -neighbor.";
  const entry = { id: "stem", sourceUrl: `${url}#page=16`, sourceSpelling: "base", audioUrl: null, formKind: "possessed-stem",
    sourceLocator: { sourceType: "individual-reference-stem", attestedHeadword: null, referencePdfPage: 16,
      referenceHeadword: "EXAMPLE", referenceFileSha256: pdfHash, referenceStem: "-base",
      referenceStemEvidence: { kind: "explicit-possessed-stem", sourceExplicitStemMetadata: true,
        exactPrintedMetadata: "-base", referenceHeadword: "EXAMPLE", referencePdfPage: 16 } } };
  return { entry, reference };
}
const verify = ({ entry, reference }: ReturnType<typeof fixture>) => verifyReferenceStemLocator(entry, reference, pdfHash);
describe("dependent stem provenance", () => {
  it("verifies the exact stem while rejecting a standalone headword claim", () => {
    const value = fixture(); expect(() => verify(value)).not.toThrow();
    value.entry.formKind = "lexical-headword";
    expect(() => verify(value)).toThrow("building block");
  });
  it("rejects borrowing a neighboring entry’s stem", () => {
    const value = fixture(); value.entry.sourceSpelling = "neighbor";
    value.entry.sourceLocator.referenceStem = "-neighbor";
    value.entry.sourceLocator.referenceStemEvidence.exactPrintedMetadata = "-neighbor";
    expect(() => verify(value)).toThrow("governing source metadata");
  });
  it("rejects using a combining stem as a possessed stem", () => {
    const value = fixture(); value.reference.pages[15].text = "EXAMPLE. tlat. tlazal. -base.";
    expect(() => verify(value)).toThrow("governing source metadata");
  });
  it("preserves a real trailing combining marker rather than inventing a leading one", () => {
    const value = fixture(); value.reference.pages[15].text = "EXAMPLE. tlat. tlazal. base-.";
    value.entry.formKind = "bound-stem";
    value.entry.sourceLocator.referenceStem = "base-";
    value.entry.sourceLocator.referenceStemEvidence.kind = "explicit-combining-stem";
    value.entry.sourceLocator.referenceStemEvidence.exactPrintedMetadata = "base-";
    expect(() => verify(value)).not.toThrow();
    value.entry.sourceLocator.referenceStem = "-base";
    expect(() => verify(value)).toThrow();
  });
});
