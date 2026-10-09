import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import course from "../src/data/nahuatlahtolli-course.json";
const { verifyVerbFormProof } = createRequire(import.meta.url)("../scripts/lib/verb-form-proof.js");
const courseHash = createHash("sha256").update(readFileSync("src/data/nahuatlahtolli-course.json")).digest("hex");
const pdfHash = "a".repeat(64), url = "https://example.org/reference.pdf";
function fixture() {
  const reference = { reference_url: url, source_sha256: pdfHash, pages: Array.from({ length: 16 }, () => ({ text: "" })) };
  reference.pages[15].text = "EXAMPLE. tlach2. ni. Modern intransitive definition.";
  const entry = { id: "composed-verb", sourceSpelling: "niexample", sourceUrl: `${url}#page=16`, audioUrl: null, formKind: "rule-composed-verb-form",
    sourceLocator: { sourceType: "productive-verb-form", referencePdfPage: 16, referenceHeadword: "EXAMPLE", referenceFileSha256: pdfHash,
      attestedHeadword: null, authoredReferenceForm: "niexample", subjectPrefix: "ni", objectPrefix: null,
      subject: { person: 1, number: "singular" }, tense: "present", numberSuffix: "", compositionNoStemChanges: true,
      directWholeFormAttestationClaimed: false,
      modernStemEvidence: { referencePdfPage: 16, referenceHeadword: "EXAMPLE", sourceStemSpelling: "example", frame: "ni" },
      grammarRuleLocators: [[0, 1], [1, 1], [3, 2]].map(([sectionIndex, bodyIndex]) => ({ sectionIndex, bodyIndex, lessonNumber: 6,
        sourceImportSha256: courseHash, sourceUrl: course.lessons.find(l => l.number === 6)!.originalUrl })) } };
  return { entry, reference };
}
const verify = ({ entry, reference }: ReturnType<typeof fixture>) => verifyVerbFormProof(entry, reference, pdfHash, course, courseHash);
describe("narrow reviewed present verb composition", () => {
  it("checks an explicit ni stem and its frozen first-person singular grammar", () => expect(() => verify(fixture())).not.toThrow());
  it("rejects a transitive or missing ni frame", () => {
    const value = fixture(); value.reference.pages[15].text = "EXAMPLE. tlach2. nic. Modern transitive definition.";
    expect(() => verify(value)).toThrow("intransitive ni frame");
  });
  it("rejects inserted objects, plural/future suffixes and stem changes", () => {
    const object = fixture(); object.entry.sourceLocator.objectPrefix = "mitz" as never;
    expect(() => verify(object)).toThrow();
    const future = fixture(); future.entry.sourceLocator.tense = "future";
    expect(() => verify(future)).toThrow();
    const changed = fixture(); changed.entry.sourceSpelling = "niexampleh";
    changed.entry.sourceLocator.authoredReferenceForm = changed.entry.sourceSpelling;
    expect(() => verify(changed)).toThrow("changes the reviewed stem");
  });
  it("rejects a false direct-attestation claim or changed grammar version", () => {
    const direct = fixture(); direct.entry.sourceLocator.directWholeFormAttestationClaimed = true;
    expect(() => verify(direct)).toThrow();
    const changed = fixture(); changed.entry.sourceLocator.grammarRuleLocators[0].sourceImportSha256 = "b".repeat(64);
    expect(() => verify(changed)).toThrow();
  });
});

type Construction = "mitz" | "nech" | "mo" | "te" | "future" | "omitted-ni";
type Rule = { lessonNumber: number; sectionIndex: number; bodyIndex: number; sourceUrl: string; sourceImportSha256: string };
const expandedPdfHash = "bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc";
const niRules = [[6, 0, 1], [6, 1, 1], [6, 3, 2]];
const objectRules = [[13, 2, 0], [13, 2, 1], [13, 2, 2], [13, 2, 10], [13, 2, 17], [13, 2, 18], [13, 2, 34], [13, 2, 35]];
const reflexiveRules = [[17, 0, 0], [17, 1, 1], [17, 1, 4]];
const humanRules = [[32, 0, 0], [32, 1, 0], [32, 1, 4], [32, 1, 5]];
const singularFutureRules = [[12, 0, 0], [12, 0, 1], [12, 0, 3]];
function ruleRecords(locators: number[][]): Rule[] {
  return locators.map(([lessonNumber, sectionIndex, bodyIndex]) => ({ lessonNumber, sectionIndex, bodyIndex,
    sourceImportSha256: courseHash, sourceUrl: course.lessons.find(l => l.number === lessonNumber)!.originalUrl }));
}
// Synthetic pages test evidence boundaries. They are not language approvals;
// publishing additionally verifies the real file hash and frozen sense review.
function expandedFixture(route: Construction) {
  const future = route === "future", omitted = route === "omitted-ni";
  const head = future ? "TLAHPALOĀ" : omitted ? "CAXĀNI" : "EXAMPLE", page = future ? 497 : omitted ? 81 : 16;
  const base = head.toLowerCase(), subjectPrefix = route === "nech" || route === "te" ? "" : "ni";
  const objectPrefix = route === "mitz" || future ? "mitz" : route === "nech" ? "nech" : route === "mo" ? "mo" : route === "te" ? "tē" : null;
  const frame = omitted ? "modern-intransitive-human-recovery-predicate; printed ni omitted" : route === "mo" ? "nimo" : "nic";
  const grammarRuleLocators = ruleRecords([...(subjectPrefix ? niRules : [[6, 1, 3]]),
    ...(route === "mo" ? reflexiveRules : route === "te" ? humanRules : objectPrefix ? objectRules : []), ...(future ? singularFutureRules : [])]);
  const object: { person: number | null; number: string; kind: string; reflexive: boolean } | null = objectPrefix ? {
    person: route === "te" ? null : route === "nech" || route === "mo" ? 1 : 2,
    number: route === "te" ? "unspecified" : "singular", kind: route === "te" ? "non-specific-human" : "specific-human", reflexive: route === "mo",
  } : null;
  const stemAllomorph: { operation: string; exactResult: string; allomorphSourceRule: Rule } | null = future ? {
    operation: "drop-final-a-class3", exactResult: base.slice(0, -1), allomorphSourceRule: grammarRuleLocators.at(-2)!,
  } : null;
  const sourceSpelling = subjectPrefix + (objectPrefix ?? "") + (stemAllomorph?.exactResult ?? base) + (future ? "z" : "");
  const reference = { reference_url: url, source_sha256: expandedPdfHash, pages: Array.from({ length: page }, () => ({ text: "" })) };
  reference.pages[page - 1].text = omitted
    ? "CAXĀNI. tlach2. 1. Cocoxquetl poliuhtiyohua icocoliz. Raul caxanqui. 2. A different sense."
    : `${head}. tlach${future ? 3 : 2}. ${frame}. Selected modern predicate.`;
  const entry = { id: "expanded-composition", sourceSpelling, sourceUrl: `${url}#page=${page}`, audioUrl: null as string | null, formKind: "rule-composed-verb-form",
    sourceLocator: { sourceType: "productive-verb-form", referencePdfPage: page, referenceHeadword: head, referenceFileSha256: expandedPdfHash,
      attestedHeadword: null, authoredReferenceForm: sourceSpelling, subjectPrefix, objectPrefix: objectPrefix as string | null,
      subject: { person: subjectPrefix ? 1 : 3, number: "singular" }, object, tense: future ? "future" : "present", numberSuffix: future ? "z" : "",
      compositionNoStemChanges: !future, directWholeFormAttestationClaimed: false, stemAllomorph,
      modernStemEvidence: { referencePdfPage: page, referenceHeadword: head, sourceStemSpelling: base, frame, selectedSense: 1 }, grammarRuleLocators } };
  return { entry, reference };
}
const verifyExpanded = ({ entry, reference }: ReturnType<typeof expandedFixture>) => verifyVerbFormProof(entry, reference, expandedPdfHash, course, courseHash);

describe("reviewed object, reflexive, human-agent and singular future routes", () => {
  it.each<Construction>(["mitz", "nech", "mo", "te", "future", "omitted-ni"])("accepts the specifically reviewed %s construction", route => {
    expect(() => verifyExpanded(expandedFixture(route))).not.toThrow();
  });
  it.each(["subject-person", "subject-number", "object-person", "object-number", "missing-object", "reflexive-flag"])("rejects false %s metadata", field => {
    const value = expandedFixture("mitz"), loc = value.entry.sourceLocator;
    if (field === "subject-person") loc.subject.person = 2;
    if (field === "subject-number") loc.subject.number = "plural";
    if (field === "object-person") loc.object!.person = 3;
    if (field === "object-number") loc.object!.number = "plural";
    if (field === "missing-object") loc.object = null;
    if (field === "reflexive-flag") loc.object!.reflexive = true;
    expect(() => verifyExpanded(value)).toThrow();
  });
  it("requires the reflexive frame in the selected sense, not the adjacent worry sense", () => {
    const value = expandedFixture("mo"); value.reference.pages[15].text = "EXAMPLE. tlach3. 1. nic./nimo. Workload. 2. nic. Cause worry.";
    value.entry.sourceLocator.modernStemEvidence.frame = "nic./nimo";
    expect(() => verifyExpanded(value)).not.toThrow();
    value.entry.sourceLocator.modernStemEvidence.selectedSense = 2;
    expect(() => verifyExpanded(value)).toThrow("argument frame");
  });
  it("requires the complete human-object pair and rejects borrowing another head's frame", () => {
    const value = expandedFixture("te"); value.entry.sourceLocator.grammarRuleLocators.pop();
    expect(() => verifyExpanded(value)).toThrow();
    const neighbor = expandedFixture("mo"); neighbor.reference.pages[15].text = "EXAMPLE. tlach2. nic. Predicate.\nOTHER. tlach2. nimo. Another predicate.";
    expect(() => verifyExpanded(neighbor)).toThrow("argument frame");
  });
  it("rejects invented bases and changed complete compositions", () => {
    const base = expandedFixture("mitz"); base.entry.sourceLocator.modernStemEvidence.sourceStemSpelling = "changed";
    expect(() => verifyExpanded(base)).toThrow();
    const changed = expandedFixture("nech"); changed.entry.sourceSpelling += "h"; changed.entry.sourceLocator.authoredReferenceForm = changed.entry.sourceSpelling;
    expect(() => verifyExpanded(changed)).toThrow("changes the reviewed stem");
  });
  it.each(["plural", "retained-final-a", "false-allomorph", "wrong-tense"])("rejects %s future changes", field => {
    const value = expandedFixture("future"), loc = value.entry.sourceLocator;
    if (field === "plural") { loc.numberSuffix = "zceh"; loc.subject.number = "plural"; }
    if (field === "retained-final-a") { value.entry.sourceSpelling = "nimitztlahpaloāz"; loc.authoredReferenceForm = value.entry.sourceSpelling; }
    if (field === "false-allomorph") loc.stemAllomorph!.exactResult = "tlahpal";
    if (field === "wrong-tense") loc.tense = "past";
    expect(() => verifyExpanded(value)).toThrow();
  });
  it("does not grant a future generator for another checked modern stem", () => {
    const value = expandedFixture("mitz"); value.entry.sourceLocator.tense = "future";
    expect(() => verifyExpanded(value)).toThrow();
  });
  it("does not generalize the omitted-ni recovery exception", () => {
    const value = expandedFixture("omitted-ni"); value.reference.pages[80].text = "CAXĀNI. tlach2. 1. A different meaning. Raul caxanqui.";
    expect(() => verifyExpanded(value)).toThrow();
    const other = expandedFixture("mitz"); other.entry.sourceLocator.modernStemEvidence.frame = "modern-intransitive-human-recovery-predicate; printed ni omitted";
    expect(() => verifyExpanded(other)).toThrow();
  });
  it.each(["direct-attestation", "source-audio", "source-hash", "invented-sense", "invented-grammar"])("rejects false %s evidence", field => {
    const value = expandedFixture("nech"), loc = value.entry.sourceLocator;
    if (field === "direct-attestation") loc.directWholeFormAttestationClaimed = true;
    if (field === "source-audio") value.entry.audioUrl = "https://example.org/guessed.mp3";
    if (field === "source-hash") loc.referenceFileSha256 = "0".repeat(64);
    if (field === "invented-sense") loc.modernStemEvidence.selectedSense = 99;
    if (field === "invented-grammar") loc.grammarRuleLocators[0].sourceImportSha256 = "0".repeat(64);
    expect(() => verifyExpanded(value)).toThrow();
  });
});
