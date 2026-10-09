import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import course from "../src/data/nahuatlahtolli-course.json";

const { verifyPossessedFormProof } = createRequire(import.meta.url)("../scripts/lib/possessed-form-proof.js");
const courseHash = createHash("sha256").update(readFileSync("src/data/nahuatlahtolli-course.json")).digest("hex");
const pdfHash = "a".repeat(64);
const url = "https://example.org/reference.pdf";
function fixture(plural = false) {
  const base = plural ? "examplehuan" : "example";
  const pages = Array.from({ length: 16 }, () => ({ text: "" }));
  pages[15].text = `EXAMPLE. tlat. no. Modern noun.\n${plural ? "miaq" : "tlaaxca"}. -${base}.\nNEXT. tlat. Neighbor noun. tlaaxca. -wrong.`;
  const reference = { reference_url: url, source_sha256: pdfHash, pages };
  const entry = { id: "reviewed-composition", sourceSpelling: `no${base}`, sourceUrl: `${url}#page=16`,
    audioUrl: null, formKind: "rule-composed-possessed-form",
    verification: { formEvidence: "independently-reviewed-rule-composition" },
    sourceLocator: { sourceType: "productive-reference-form", possessorPrefix: "no", attestedHeadword: null,
      authoredReferenceForm: `no${base}`, referencePdfPage: 16, componentHeadwordPdfPage: 16,
      referenceHeadword: "EXAMPLE", referenceFileSha256: pdfHash, referencePossessedStem: `-${base}`,
      referenceStemEvidence: { kind: plural ? "explicit-possessed-plural-stem" : "explicit-possessed-stem",
        sourceExplicitStemMetadata: true, exactPrintedMetadata: `-${base}`, referencePdfPage: 16, referenceHeadword: "EXAMPLE" },
      grammarRuleLocator: { lessonNumber: 8, sourceImportSha256: courseHash,
        sourceUrl: course.lessons.find(lesson => lesson.number === 8)!.originalUrl,
        sectionIndex: 1, bodyIndices: [1, 9], meaningEvidence: { noPrefix: {
          introduction: { sectionIndex: 0, bodyIndex: 2 }, translatedWordTable: { sectionIndex: 1, bodyIndex: 9 } } } } } };
  return { entry, reference };
}
const verify = ({ entry, reference }: ReturnType<typeof fixture>) =>
  verifyPossessedFormProof(entry, reference, pdfHash, course, courseHash);

describe("reviewed possessed-form composition proof", () => {
  it("checks singular and plural allomorphs in their distinct source fields", () => {
    expect(() => verify(fixture())).not.toThrow();
    expect(() => verify(fixture(true))).not.toThrow();
    const wrongField = fixture(true);
    wrongField.entry.sourceLocator.referenceStemEvidence.kind = "explicit-possessed-stem";
    expect(() => verify(wrongField)).toThrow("not in the selected source metadata");
  });
  it("rejects borrowing a neighboring entry's otherwise real possessed stem", () => {
    const value = fixture();
    value.entry.sourceLocator.referencePossessedStem = "-wrong";
    value.entry.sourceLocator.referenceStemEvidence.exactPrintedMetadata = "-wrong";
    value.entry.sourceSpelling = "nowrong";
    value.entry.sourceLocator.authoredReferenceForm = "nowrong";
    expect(() => verify(value)).toThrow("not in the selected source metadata");
  });
  it("rejects an invented suffix, changed base or unsupported person prefix", () => {
    const value = fixture();
    value.entry.sourceSpelling += "huan";
    value.entry.sourceLocator.authoredReferenceForm = value.entry.sourceSpelling;
    expect(() => verify(value)).toThrow("changes the reviewed base");
    value.entry.sourceLocator.possessorPrefix = "mo";
    expect(() => verify(value)).toThrow();
  });
  it("rejects false whole-form attestation and mismatched grammar versions", () => {
    const value = fixture();
    value.entry.sourceLocator.attestedHeadword = "noexample" as never;
    expect(() => verify(value)).toThrow("must not claim direct attestation");
    value.entry.sourceLocator.attestedHeadword = null;
    value.entry.sourceLocator.grammarRuleLocator.sourceImportSha256 = "b".repeat(64);
    expect(() => verify(value)).toThrow();
  });
  it("allows only the attested i- to reviewed no- substitution with its meaning evidence", () => {
    const value = fixture();
    const text = "EXAMPLE. tlat. no.\nMeaningful iexample here.\nNEXT. tlat. Neighbor.";
    value.reference.pages[15].text = text;
    const loc = value.entry.sourceLocator;
    loc.referencePossessedStem = "example";
    loc.referenceStemEvidence = {
      kind: "attested-possessive-prefix-substitution", sourceExplicitStemMetadata: false,
      attestedPrefix: "i", authoredPrefix: "no", attestedForm: "iexample",
      inferredStemByDocumentedPrefixRemoval: "example", referenceTextStart: text.indexOf("iexample"),
      referencePdfPage: 16, referenceHeadword: "EXAMPLE",
    } as never;
    loc.grammarRuleLocator.bodyIndices = [1, 3, 9, 11];
    expect(() => verify(value)).not.toThrow();
    loc.grammarRuleLocator.bodyIndices = [1, 9];
    expect(() => verify(value)).toThrow();
  });
  it("checks a plural inin- token in a separate governing entry before composing no-", () => {
    const value = fixture();
    const body = "BODY. tlat. Recorded ininexamplehuan here.\nNEXT. tlat. Neighbor.";
    value.reference.pages.push({ text: body });
    value.entry.sourceSpelling = "noexamplehuan";
    const loc = value.entry.sourceLocator;
    loc.authoredReferenceForm = value.entry.sourceSpelling;
    loc.referencePossessedStem = "examplehuan";
    loc.referenceStemEvidence = { kind: "attested-possessive-prefix-substitution", sourceExplicitStemMetadata: false,
      attestedPrefix: "inin", authoredPrefix: "no", attestedForm: "ininexamplehuan", inferredStemByDocumentedPrefixRemoval: "examplehuan",
      referencePdfPage: 17, referenceHeadwordPdfPage: 17, referenceHeadword: "BODY", referenceTextStart: body.indexOf("ininexamplehuan") } as never;
    loc.grammarRuleLocator.bodyIndices = [1, 6, 9, 14];
    expect(() => verify(value)).not.toThrow();
    loc.grammarRuleLocator.bodyIndices = [1, 9];
    expect(() => verify(value)).toThrow();
  });
  it("allows the documented no- to i- change while preserving the entire base", () => {
    const value = fixture(), text = "EXAMPLE. tlat. no. Meaningful noexample here.";
    value.reference.pages[15].text = text;
    const loc = value.entry.sourceLocator;
    loc.possessorPrefix = "i";
    value.entry.sourceSpelling = loc.authoredReferenceForm = "iexample";
    loc.referencePossessedStem = "example";
    loc.referenceStemEvidence = { kind: "attested-possessive-prefix-substitution", sourceExplicitStemMetadata: false,
      attestedPrefix: "no", authoredPrefix: "i", attestedForm: "noexample", inferredStemByDocumentedPrefixRemoval: "example",
      referencePdfPage: 16, referenceHeadwordPdfPage: 16, referenceHeadword: "EXAMPLE", referenceTextStart: text.indexOf("noexample") } as never;
    loc.grammarRuleLocator.bodyIndices = [1, 3, 9, 11];
    expect(() => verify(value)).not.toThrow();
    value.entry.sourceSpelling = loc.authoredReferenceForm = "iexamples";
    expect(() => verify(value)).toThrow("changes the reviewed base");
  });
});
