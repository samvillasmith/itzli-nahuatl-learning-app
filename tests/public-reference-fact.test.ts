import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyPublicReferenceFact, SEP_URL, SEP_SHA, HIDALGO_URL, HIDALGO_SHA, MULTISTATE_URL, MULTISTATE_SHA, PUEBLA_URL, PUEBLA_SHA, INE_URL, INE_SHA, ZONGOLICA_URL, ZONGOLICA_SHA } = createRequire(import.meta.url)("../scripts/lib/public-reference-fact.js");
function fixture() {
  const reference = { reference_url: SEP_URL, source_sha256: SEP_SHA, pages: [{ text: "TITLE: TLEN SE XIUITL.\nTLEN SECOND is a larger token." }] };
  return { reference, entry: { id: "contextual-fact", sourceSpelling: "TLEN SE", audioUrl: null as string | null,
    sourceUrl: `${SEP_URL}#page=1`, sourceLocator: { sourceType: "individual-public-reference-fact",
      sourceUrl: `${SEP_URL}#page=1`, referenceFileSha256: SEP_SHA, referencePdfPage: 1,
      referenceTextStart: 7, attestedHeadword: "TLEN SE" } } };
}
describe("anonymous publisher reference provenance", () => {
  it.each([[MULTISTATE_URL, MULTISTATE_SHA], [PUEBLA_URL, PUEBLA_SHA], [INE_URL, INE_SHA], [ZONGOLICA_URL, ZONGOLICA_SHA]])("requires the exact reviewed source file for %s", (url, hash) => {
    const f = fixture(); f.reference.reference_url = url; f.reference.source_sha256 = hash;
    f.entry.sourceUrl = `${url}#page=1`; f.entry.sourceLocator.sourceUrl = f.entry.sourceUrl;
    f.entry.sourceLocator.referenceFileSha256 = hash;
    expect(() => verifyPublicReferenceFact(f.entry, f.reference, hash)).not.toThrow();
    expect(() => verifyPublicReferenceFact(f.entry, f.reference, SEP_SHA)).toThrow();
  });
  it("accepts an exact complete contextual phrase at its recorded offset", () => {
    const f = fixture(); expect(() => verifyPublicReferenceFact(f.entry, f.reference, SEP_SHA)).not.toThrow();
  });
  it("requires the separately pinned vocabulary source and rejects interchanging the two publisher files", () => {
    const f = fixture(); f.reference.reference_url = HIDALGO_URL; f.reference.source_sha256 = HIDALGO_SHA;
    f.entry.sourceUrl = `${HIDALGO_URL}#page=1`; f.entry.sourceLocator.sourceUrl = f.entry.sourceUrl;
    f.entry.sourceLocator.referenceFileSha256 = HIDALGO_SHA;
    expect(() => verifyPublicReferenceFact(f.entry, f.reference, HIDALGO_SHA)).not.toThrow();
    expect(() => verifyPublicReferenceFact(f.entry, f.reference, SEP_SHA)).toThrow();
    f.reference.reference_url = "https://dgeiib.basica.sep.gob.mx/unreviewed.pdf";
    expect(() => verifyPublicReferenceFact(f.entry, f.reference, HIDALGO_SHA)).toThrow("Unreviewed");
  });
  it("rejects another domain, authenticated query, source file or page", () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => { f.entry.sourceUrl = "https://drive.google.com/example#page=1"; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceUrl = `${SEP_URL}?token=example#page=1`; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.referenceFileSha256 = "b".repeat(64); },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.referencePdfPage = 2; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.sourceUrl = "https://example.org/reference.pdf"; },
    ]) {
      const f = fixture(); mutate(f);
      expect(() => verifyPublicReferenceFact(f.entry, f.reference, SEP_SHA)).toThrow();
    }
    const f = fixture(); expect(() => verifyPublicReferenceFact(f.entry, f.reference, "b".repeat(64))).toThrow();
  });
  it("rejects a substring, wrong offset, changed case or borrowed recording", () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.referenceTextStart = f.reference.pages[0].text.indexOf("TLEN SECOND"); },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceLocator.referenceTextStart += 1; },
      (f: ReturnType<typeof fixture>) => { f.entry.sourceSpelling = "tlen se"; f.entry.sourceLocator.attestedHeadword = "tlen se"; },
      (f: ReturnType<typeof fixture>) => { f.entry.audioUrl = "https://example.org/other-recording.mp3"; },
    ]) {
      const f = fixture(); mutate(f);
      expect(() => verifyPublicReferenceFact(f.entry, f.reference, SEP_SHA)).toThrow();
    }
  });
});
