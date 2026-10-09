import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import importedCourse from "../src/data/nahuatlahtolli-course.json";

const { verifyNominalFormProof } = createRequire(import.meta.url)("../scripts/lib/nominal-form-proof.js");
const pdfHash = "bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc";
const courseHash = createHash("sha256").update(readFileSync("src/data/nahuatlahtolli-course.json")).digest("hex");
const url = "https://example.org/reference.pdf";
type Term = "icxitlan" | "tzintlan";

// Minimal synthetic source pages exercise evidence boundaries. Actual source
// hashes and the frozen semantic review are separately checked by publishing.
function fixture(term: Term = "icxitlan") {
  const course = structuredClone(importedCourse);
  const lesson = course.lessons.find(item => item.number === 23)!;
  const reference = { reference_url: url, source_sha256: pdfHash, pages: Array.from({ length: 456 }, () => ({ text: "" })) };
  reference.pages[455].text = "TEPĒTL. tlat. Montoniuhtoc tlalli huan tetl ica huahcapan. tlazal. tepē-.";
  const sourceSpelling = "tepē" + term;
  const nominalProof = {
    construction: "noun-combining-base-plus-relational-term", authoredReferenceForm: sourceSpelling,
    directWholeFormAttestationClaimed: false, nominalCombiningStemEvidence: {
      kind: "explicit-combining-stem", referencePdfPage: 456, referenceHeadword: "TEPĒTL",
      sourceStemSpelling: "tepē", exactPrintedMetadata: "tepē-", sourceExplicitStemMetadata: true,
      selectedSense: "hill", referenceFileSha256: pdfHash,
    }, relationalTerm: term as string,
    grammarRuleLocators: (term === "icxitlan" ? [[0, 3], [2, 21], [3, 15]] : [[0, 3], [2, 42], [2, 43]])
      .map(([sectionIndex, bodyIndex]) => ({ lessonNumber: 23, sectionIndex, bodyIndex, sourceUrl: lesson.originalUrl, sourceImportSha256: courseHash })),
    compositionNoStemChanges: true, phonologicalChangesInComposition: [] as string[],
    possessorPrefix: null as string | null, subject: null as null | { person: number; number: string },
    object: null as null | { person: number; number: string }, tense: null as string | null,
    numberSuffix: "", predicateAsserted: false, generalizedNominalGeneratorApproved: false,
  };
  const sourceUrl = `${url}#page=456`;
  const entry = { id: "reviewed-hill-location", sourceSpelling, sourceUrl, audioUrl: null as string | null,
    formKind: "rule-composed-relational-form", partOfSpeech: "locative-expression",
    meaningEn: term === "icxitlan" ? "at the hill’s foot" : "at the hill’s base",
    meaningEs: term === "icxitlan" ? "al pie del cerro" : "en la base del cerro",
    sourceLocator: { sourceType: "productive-nominal-form", sourceUrl, attestedHeadword: null as string | null,
      authoredReferenceForm: sourceSpelling, referencePdfPage: 456, referenceHeadword: "TEPĒTL",
      referenceFileSha256: pdfHash, nominalProof } };
  return { entry, reference, course };
}
const verify = (value: ReturnType<typeof fixture>) => verifyNominalFormProof(value.entry, value.reference, pdfHash, value.course, courseHash);

describe("two bounded hill-location constructions", () => {
  it.each<Term>(["icxitlan", "tzintlan"])("accepts unchanged tepē + %s with exact rule evidence", term => {
    expect(() => verify(fixture(term))).not.toThrow();
  });
  it.each(["substituted-base", "contracted-base", "unreviewed-term", "changed-spelling"])("rejects %s", change => {
    const value = fixture(), proof = value.entry.sourceLocator.nominalProof;
    if (change === "substituted-base") proof.nominalCombiningStemEvidence.sourceStemSpelling = "cal";
    if (change === "contracted-base") value.entry.sourceSpelling = "tepecxitlan";
    if (change === "unreviewed-term") proof.relationalTerm = "ihtic";
    if (change === "changed-spelling") value.entry.sourceSpelling = "tepeicxitlan";
    value.entry.sourceLocator.authoredReferenceForm = value.entry.sourceSpelling;
    proof.authoredReferenceForm = value.entry.sourceSpelling;
    expect(() => verify(value)).toThrow();
  });
  it.each(["possessor", "subject", "object", "tense", "plural", "predicate", "generator", "stem-change"])("rejects an added %s claim", change => {
    const value = fixture(), proof = value.entry.sourceLocator.nominalProof;
    if (change === "possessor") proof.possessorPrefix = "no";
    if (change === "subject") proof.subject = { person: 1, number: "singular" };
    if (change === "object") proof.object = { person: 1, number: "singular" };
    if (change === "tense") proof.tense = "present";
    if (change === "plural") proof.numberSuffix = "meh";
    if (change === "predicate") proof.predicateAsserted = true;
    if (change === "generator") proof.generalizedNominalGeneratorApproved = true;
    if (change === "stem-change") { proof.compositionNoStemChanges = false; proof.phonologicalChangesInComposition = ["delete i"]; }
    expect(() => verify(value)).toThrow();
  });
  it("rejects a neighboring head's combining metadata", () => {
    const value = fixture();
    value.reference.pages[455].text = "TEPĒTL. tlat. Montoniuhtoc tlalli huan tetl ica huahcapan.\nOTHER. tlat. tlazal. tepē-.";
    expect(() => verify(value)).toThrow("governing head");
  });
  it.each(["missing-head", "missing-meaning", "bound-only", "changed-metadata"])("rejects %s source evidence", change => {
    const value = fixture();
    if (change === "missing-head") value.reference.pages[455].text = "OTHER. tlat. Montoniuhtoc tlalli huan tetl ica huahcapan. tlazal. tepē-.";
    if (change === "missing-meaning") value.reference.pages[455].text = "TEPĒTL. tlat. An unrelated meaning. tlazal. tepē-.";
    if (change === "bound-only") value.entry.sourceLocator.nominalProof.nominalCombiningStemEvidence.sourceExplicitStemMetadata = false;
    if (change === "changed-metadata") value.reference.pages[455].text = "TEPĒTL. tlat. Montoniuhtoc tlalli huan tetl ica huahcapan. tlazal. tepec-.";
    expect(() => verify(value)).toThrow();
  });
  it.each(["rule-offset", "rule-hash", "rule-url", "joining-rule", "term-sense", "noun-domain"])("rejects %s grammar changes", change => {
    const value = fixture(), rule = value.entry.sourceLocator.nominalProof.grammarRuleLocators[0];
    const lesson = value.course.lessons.find(item => item.number === 23)!;
    if (change === "rule-offset") rule.bodyIndex = 2;
    if (change === "rule-hash") rule.sourceImportSha256 = "b".repeat(64);
    if (change === "rule-url") rule.sourceUrl = "https://example.org/invented-lesson";
    if (change === "joining-rule") lesson.sections[0].body[3] = "An unrelated sentence.";
    if (change === "term-sense") lesson.sections[2].body[21] = "icxitlan means inside";
    if (change === "noun-domain") lesson.sections[3].body[15] = "icxitlan for people only";
    expect(() => verify(value)).toThrow();
  });
  it.each(["false-attestation", "audio", "broader-english", "wrong-spanish"])("rejects %s publication claims", change => {
    const value = fixture();
    if (change === "false-attestation") { value.entry.sourceLocator.attestedHeadword = value.entry.sourceSpelling; value.entry.sourceLocator.nominalProof.directWholeFormAttestationClaimed = true; }
    if (change === "audio") value.entry.audioUrl = "https://example.org/invented.mp3";
    if (change === "broader-english") value.entry.meaningEn = "I am at the hill’s foot";
    if (change === "wrong-spanish") value.entry.meaningEs = "en la cima del cerro";
    expect(() => verify(value)).toThrow();
  });
  it("rejects changed primary source identity or imported grammar version", () => {
    const value = fixture(); value.entry.sourceUrl = `${url}#page=455`;
    expect(() => verify(value)).toThrow();
    expect(() => verifyNominalFormProof(fixture().entry, fixture().reference, "b".repeat(64), fixture().course, courseHash)).toThrow();
    expect(() => verifyNominalFormProof(fixture().entry, fixture().reference, pdfHash, fixture().course, "b".repeat(64))).toThrow();
  });
});
