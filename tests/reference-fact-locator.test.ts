import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { verifyReferenceFactLocator } = createRequire(import.meta.url)("../scripts/lib/reference-fact-locator.js");
const fileHash = "a".repeat(64);
const pages = Array.from({ length: 18 }, () => ({ text: "" }));
pages[15] = { text: "TEST. tlat.\nReference context continues on the next page." };
pages[16] = { text: "Documented form: noexample. Two words: noexample\nexample. Larger token: noexamples." };
const reference = { reference_url: "https://example.org/reference.pdf", source_sha256: fileHash, pages };
const normalize = (value: string) => value.toLowerCase();
function form() {
  return { id: "reviewed-form", sourceSpelling: "noexample", sourceUrl: `${reference.reference_url}#page=17`,
    sourceLocator: { sourceType: "individual-reference-form", referencePdfPage: 17,
      referenceHeadwordPdfPage: 16, referenceHeadword: "TEST", referenceFileSha256: fileHash,
      referenceTextStart: pages[16].text.indexOf("noexample") } };
}
const verify = (entry: ReturnType<typeof form>) => verifyReferenceFactLocator(entry, reference, fileHash, normalize);

describe("exact reference form provenance", () => {
  it("accepts a complete body token governed by a head on the previous page", () => {
    expect(() => verify(form())).not.toThrow();
  });
  it("rejects a shorter token inside a larger written word", () => {
    const entry = form();
    entry.sourceLocator.referenceTextStart = pages[16].text.lastIndexOf("noexamples");
    expect(() => verify(entry)).toThrow("part of a larger word");
    entry.sourceSpelling = "example";
    entry.sourceLocator.referenceTextStart = pages[16].text.indexOf("noexample") + 2;
    expect(() => verify(entry)).toThrow("part of a larger word");
  });
  it("rejects a wrong page, offset, governing head or source file", () => {
    const entry = form();
    entry.sourceLocator.referenceHeadwordPdfPage = 17;
    expect(() => verify(entry)).toThrow("Missing exact reference head");
    entry.sourceLocator.referenceHeadwordPdfPage = 16;
    entry.sourceLocator.referenceTextStart += 1;
    expect(() => verify(entry)).toThrow("Unattested exact reference form");
    expect(() => verifyReferenceFactLocator(form(), reference, "b".repeat(64), normalize)).toThrow();
  });
  it("accepts a multiword form split across source line wrapping", () => {
    const entry = form();
    entry.sourceSpelling = "noexample example";
    entry.sourceLocator.referenceTextStart = pages[16].text.indexOf("noexample\nexample");
    expect(() => verify(entry)).not.toThrow();
  });
  it("keeps lexical head facts distinct from inflected body forms", () => {
    const entry = form();
    entry.sourceLocator.sourceType = "individual-reference-fact";
    entry.sourceLocator.referencePdfPage = 16;
    entry.sourceUrl = `${reference.reference_url}#page=16`;
    entry.sourceSpelling = "test";
    expect(() => verify(entry)).not.toThrow();
    entry.sourceSpelling = "noexample";
    expect(() => verify(entry)).toThrow();
  });
  it("rejects a real token located under a neighboring dictionary entry", () => {
    const changedPages = pages.map(page => ({ ...page }));
    changedPages[16].text = "OTHER. tlach2. This context contains noexample.";
    const entry = form();
    entry.sourceLocator.referenceTextStart = changedPages[16].text.indexOf("noexample");
    expect(() => verifyReferenceFactLocator(entry, { ...reference, pages: changedPages }, fileHash, normalize))
      .toThrow("different governing entry");
  });
  it("recognizes a printed dual-class verb head and preserves its boundary", () => {
    const changedPages = pages.map(page => ({ ...page }));
    changedPages[15].text = "TEST. tlach1/2. Governing definition.";
    expect(() => verifyReferenceFactLocator(form(), { ...reference, pages: changedPages }, fileHash, normalize))
      .not.toThrow();
    changedPages[16].text = "OTHER. tlach1/2. This context contains noexample.";
    const entry = form();
    entry.sourceLocator.referenceTextStart = changedPages[16].text.indexOf("noexample");
    expect(() => verifyReferenceFactLocator(entry, { ...reference, pages: changedPages }, fileHash, normalize))
      .toThrow("different governing entry");
  });
});

describe("explicit modern dictionary redirects", () => {
  function alias() {
    const entry = { id: "reviewed-alias", sourceSpelling: "variant", formKind: "lexical-headword", audioUrl: null,
      sourceUrl: `${reference.reference_url}#page=18`, sourceLocator: {
        sourceType: "individual-reference-alias", referencePdfPage: 18, referenceHeadword: "VARIANT",
        referenceFileSha256: fileHash, referenceCanonicalHeadword: "TEST", referenceCanonicalHeadwordPdfPage: 16,
        referenceAliasEvidence: { kind: "explicit-headword-redirect", exactPrintedRedirect: "VARIANT. Xiquitta TEST.",
          aliasHeadword: "VARIANT", aliasPdfPage: 18, canonicalHeadword: "TEST", canonicalPdfPage: 16,
          canonicalSelectedSense: "1", canonicalFrame: "nimo" } } };
    const aliasPages = pages.map(page => ({ ...page }));
    aliasPages[17].text = "VARIANT. Xiquitta TEST.\nOTHER. Xiquitta ELSE.";
    aliasPages[15].text = "TEST. tlach2. 1. nimo. Modern definition. 2. ni. Other meaning.\nNEXT. tlach2. ni. Neighboring definition.";
    return { entry, reference: { ...reference, pages: aliasPages } };
  }
  it("accepts an exact redirect and its numbered modern argument frame", () => {
    const a = alias();
    expect(() => verifyReferenceFactLocator(a.entry, a.reference, fileHash, normalize)).not.toThrow();
  });
  it("rejects a redirected head, page or file that differs from the printed evidence", () => {
    for (const mutate of [
      (a: ReturnType<typeof alias>) => { a.entry.sourceLocator.referenceCanonicalHeadword = "NEXT"; },
      (a: ReturnType<typeof alias>) => { a.entry.sourceLocator.referencePdfPage = 17; },
      (a: ReturnType<typeof alias>) => { a.reference.pages[17].text = "VARIANT. Xiquitta ELSE."; },
      (a: ReturnType<typeof alias>) => { a.entry.sourceLocator.referenceAliasEvidence.exactPrintedRedirect = "VARIANT. Xiquitta ELSE."; },
      (a: ReturnType<typeof alias>) => { a.entry.sourceSpelling = "test"; },
    ]) {
      const a = alias(); mutate(a);
      expect(() => verifyReferenceFactLocator(a.entry, a.reference, fileHash, normalize)).toThrow();
    }
    const a = alias();
    expect(() => verifyReferenceFactLocator(a.entry, a.reference, "b".repeat(64), normalize)).toThrow();
  });
  it("rejects borrowing a frame from another sense or neighboring entry", () => {
    const a = alias(); a.entry.sourceLocator.referenceAliasEvidence.canonicalFrame = "ni";
    expect(() => verifyReferenceFactLocator(a.entry, a.reference, fileHash, normalize)).toThrow("reviewed frame");
    a.entry.sourceLocator.referenceAliasEvidence.canonicalSelectedSense = "3";
    expect(() => verifyReferenceFactLocator(a.entry, a.reference, fileHash, normalize)).toThrow("Missing selected");
  });
  it("accepts a qualified unnumbered frame and rejects a redirect chain", () => {
    const a = alias();
    a.reference.pages[15].text = "TEST. tlach2. ni. Modern unnumbered definition.\nNEXT. tlach2. nimo. Neighbor.";
    a.entry.sourceLocator.referenceAliasEvidence.canonicalSelectedSense = "unnumbered modern head";
    a.entry.sourceLocator.referenceAliasEvidence.canonicalFrame = "ni";
    expect(() => verifyReferenceFactLocator(a.entry, a.reference, fileHash, normalize)).not.toThrow();
    a.reference.pages[15].text = "TEST. Xiquitta NEXT.\nNEXT. tlach2. ni. Neighbor.";
    expect(() => verifyReferenceFactLocator(a.entry, a.reference, fileHash, normalize)).toThrow("canonical verb head");
  });
});
