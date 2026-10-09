import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import importedCourse from "../src/data/nahuatlahtolli-course.json";

const { verifyAgentNounFormProof } = createRequire(import.meta.url)("../scripts/lib/agent-noun-form-proof.js");
const pdfHash = "bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc";
const courseHash = createHash("sha256").update(readFileSync("src/data/nahuatlahtolli-course.json")).digest("hex");
const url = "https://example.org/reference.pdf";
const cases = [
  { head: "CHŌCA", page: 111, base: "chōca", printedClass: "1/2", selectedClass: "1", frame: "ni", prefix: null, suffix: "quētl", en: "a person who often cries", es: "una persona que llora con frecuencia" },
  { head: "MACHTIĀ", page: 292, base: "machtiā", printedClass: "3", selectedClass: "3", frame: "nic./nimo", prefix: "tē", suffix: "hquētl", en: "a person who teaches people", es: "una persona que enseña a otras personas" },
  { head: "MICTIĀ", page: 326, base: "mictiā", printedClass: "3", selectedClass: "3", frame: "nic", prefix: "tē", suffix: "hquētl", en: "a killer of people", es: "una persona que mata a otras personas" },
  { head: "XŌCHINAMACA1", page: 608, base: "xōchinamaca", printedClass: "1", selectedClass: "1", frame: "ni", prefix: null, suffix: "quētl", en: "a flower vendor", es: "una persona que vende flores" },
];

// Synthetic pages test structural source boundaries. Publishing separately
// reads the real reference and checks the frozen independent semantic report.
function fixture(index = 0) {
  const selected = cases[index], course = structuredClone(importedCourse);
  const reference = { reference_url: url, source_sha256: pdfHash, pages: Array.from({ length: 608 }, () => ({ text: "" })) };
  reference.pages[selected.page - 1].text = `${selected.head}. tlach${selected.printedClass}. ${selected.frame}. Selected modern sense. panoc. ${selected.head === "CHŌCA" ? "chōcac, chōcqui" : "xōchinamacac"}.`;
  reference.pages[412].text = "QUĒ. tlaten. 1. Other sense. 5. Motequihuia ica TL2 quemman cetzin itlapachol. itequiuh mohmoztlah. 6. Other sense.";
  reference.pages[470].text = "TL2. tlaten. Axtlaaxcatilli tlen cetzin.";
  reference.pages[399].text = "PITZONAMACA1. tlach1. ni. Sell pigs.\nPITZONAMACAQUĒTL. tlat. ni. achi. PITZONAMACA1, QUĒ, TL2.";
  reference.pages[401].text = "PIYŌNAMACA1. tlach1. ni. Sell poultry.\nPIYONAMACAQUĒTL. tlat. ni. achi. PIYONAMACA1, QUĒ,\nTL2.";
  reference.pages[331].text = "MOMACHTIHQUĒTL. tlat. ni. achi. MACHTIĀ, QUĒ, TL2.";
  reference.pages[513].text = "TLAMACHTIHQUĒTL. tlat. ni. achi. MACHTIĀ, QUĒ, TL2.";
  const base = selected.selectedClass === "3" ? selected.base.slice(0, -1) : selected.base;
  const sourceSpelling = (selected.prefix || "") + base + selected.suffix;
  const grammarRuleLocators = [...[[5, 2, 0], [5, 2, 1], [5, 2, 2], [5, 2, 3]], ...(selected.prefix ? [[32, 0, 0], [32, 1, 0], [32, 1, 4], [32, 1, 5]] : [])]
    .map(([lessonNumber, sectionIndex, bodyIndex]) => ({ lessonNumber, sectionIndex, bodyIndex, sourceImportSha256: courseHash, sourceUrl: course.lessons.find(item => item.number === lessonNumber)!.originalUrl }));
  const agentNounProof = {
    construction: "singular-agent-noun-from-reviewed-present-base", authoredReferenceForm: sourceSpelling,
    directWholeFormAttestationClaimed: false, finitePredicateAsserted: false,
    generalizedAgentNounGeneratorApproved: false, pluralAgentRuleApproved: false,
    subject: null as string | null, possessor: null as string | null, tense: null as string | null,
    number: "singular", objectPrefix: selected.prefix as string | null, objectKind: selected.prefix ? "non-specific-human" : null as string | null,
    nounSuffix: selected.suffix, modernVerbEvidence: {
      referencePdfPage: selected.page, referenceHeadword: selected.head, sourceStemSpelling: selected.base,
      verbClass: selected.printedClass.replace("/", "-or-"), selectedClass: selected.selectedClass,
      frame: selected.frame, selectedSense: 1, referenceFileSha256: pdfHash,
    }, stemAllomorph: { operation: selected.selectedClass === "3" ? "drop-final-a-class3" : "retain-selected-class1-present-base", exactResult: base },
    agentSuffixEvidence: { referencePdfPage: 413, referenceHeadword: "QUĒ", selectedSense: 5, sourceSuffix: "quē", number: "singular", ordinaryFunction: "occupation-or-habitual-activity-agent", absolutiveEvidence: { referencePdfPage: 471, referenceHeadword: "TL2", sourceSuffix: "tl", number: "singular" } },
    modelEvidence: selected.selectedClass === "1" ? [
      { referencePdfPage: 400, referenceVerbHeadword: "PITZONAMACA1", referenceNounHeadword: "PITZONAMACAQUĒTL", verbClass: "1", baseUnchanged: true },
      { referencePdfPage: 402, referenceVerbHeadword: "PIYŌNAMACA1", referenceNounHeadword: "PIYONAMACAQUĒTL", verbClass: "1", ordinaryStemSegmentsUnchanged: true, printedVowelLengthDiffers: true, exactStemIdentityClaimed: false, exactPrintedDerivationReference: "PIYONAMACA1" },
    ] : [{ referencePdfPage: 332, referenceNounHeadword: "MOMACHTIHQUĒTL" }, { referencePdfPage: 514, referenceNounHeadword: "TLAMACHTIHQUĒTL" }],
    grammarRuleLocators,
  };
  const sourceUrl = `${url}#page=${selected.page}`;
  const entry = { sourceSpelling, sourceUrl, audioUrl: null as string | null, formKind: "rule-composed-agent-noun", partOfSpeech: "noun", meaningEn: selected.en, meaningEs: selected.es,
    sourceLocator: { sourceType: "productive-agent-noun-form", sourceUrl, attestedHeadword: null as string | null, authoredReferenceForm: sourceSpelling,
      referencePdfPage: selected.page, referenceHeadword: selected.head, referenceFileSha256: pdfHash, agentNounProof } };
  return { entry, reference, course };
}
const verify = (value: ReturnType<typeof fixture>) => verifyAgentNounFormProof(value.entry, value.reference, pdfHash, value.course, courseHash);

describe("four bounded singular activity-agent nouns", () => {
  it.each([0, 1, 2, 3])("accepts individually reviewed case %s", index => expect(() => verify(fixture(index))).not.toThrow());
  it.each(["class", "frame", "base", "selected-sense", "allomorph", "suffix", "human-object", "object-kind"])("rejects changed %s morphology", change => {
    const value = fixture(1), proof = value.entry.sourceLocator.agentNounProof;
    if (change === "class") proof.modernVerbEvidence.selectedClass = "1";
    if (change === "frame") proof.modernVerbEvidence.frame = "ni";
    if (change === "base") proof.modernVerbEvidence.sourceStemSpelling = "mictiā";
    if (change === "selected-sense") proof.modernVerbEvidence.selectedSense = 2;
    if (change === "allomorph") proof.stemAllomorph.exactResult = "machtiā";
    if (change === "suffix") proof.nounSuffix = "quētl";
    if (change === "human-object") proof.objectPrefix = "tla";
    if (change === "object-kind") proof.objectKind = "non-specific-thing";
    expect(() => verify(value)).toThrow();
  });
  it.each(["person", "possessor", "tense", "number", "finite-predicate", "generator", "plural-rule"])("rejects an added %s claim", change => {
    const value = fixture(), proof = value.entry.sourceLocator.agentNounProof;
    if (change === "person") proof.subject = "first-person";
    if (change === "possessor") proof.possessor = "my";
    if (change === "tense") proof.tense = "present";
    if (change === "number") proof.number = "plural";
    if (change === "finite-predicate") proof.finitePredicateAsserted = true;
    if (change === "generator") proof.generalizedAgentNounGeneratorApproved = true;
    if (change === "plural-rule") proof.pluralAgentRuleApproved = true;
    expect(() => verify(value)).toThrow();
  });
  it.each(["wrong-class", "missing-head", "neighbor-frame", "missing-class-alternative"])("rejects %s modern source evidence", change => {
    const value = fixture();
    if (change === "wrong-class") value.reference.pages[110].text = value.reference.pages[110].text.replace("tlach1/2", "tlach3");
    if (change === "missing-head") value.reference.pages[110].text = value.reference.pages[110].text.replace("CHŌCA.", "OTHER.");
    if (change === "neighbor-frame") value.reference.pages[110].text = "CHŌCA. tlach1/2. An unrelated frame.\nOTHER. tlach1. ni. panoc. chōcac, chōcqui.";
    if (change === "missing-class-alternative") value.reference.pages[110].text = value.reference.pages[110].text.replace("chōcac, chōcqui", "chōcqui");
    expect(() => verify(value)).toThrow();
  });
  it.each(["wrong-sense", "neighbor-suffix", "missing-absolutive", "model-head", "printed-length", "printed-reference"])("rejects %s suffix/model evidence", change => {
    const value = fixture(), proof = value.entry.sourceLocator.agentNounProof;
    if (change === "wrong-sense") proof.agentSuffixEvidence.selectedSense = 3;
    if (change === "neighbor-suffix") value.reference.pages[412].text = "QUĒ. tlaten. 5. Another meaning.\nOTHER. tlaten. Motequihuia ica TL2 quemman cetzin itlapachol itequiuh mohmoztlah.";
    if (change === "missing-absolutive") value.reference.pages[470].text = "TL2. tlaten. Another meaning.";
    if (change === "model-head") proof.modelEvidence[1].referenceNounHeadword = "PIYŌNAMACAQUĒTL";
    if (change === "printed-length") Object.assign(proof.modelEvidence[1], { exactStemIdentityClaimed: true });
    if (change === "printed-reference") value.reference.pages[401].text = value.reference.pages[401].text.replace("achi. PIYONAMACA1", "achi. OTHER");
    expect(() => verify(value)).toThrow();
  });
  it.each(["missing-human-rule", "wrong-offset", "wrong-hash", "wrong-url", "changed-deletion", "changed-object-rule"])("rejects %s grammar evidence", change => {
    const value = fixture(1), rules = value.entry.sourceLocator.agentNounProof.grammarRuleLocators;
    if (change === "missing-human-rule") rules.pop();
    if (change === "wrong-offset") rules[0].bodyIndex = 1;
    if (change === "wrong-hash") rules[0].sourceImportSha256 = "a".repeat(64);
    if (change === "wrong-url") rules[0].sourceUrl = "https://example.org/invented";
    if (change === "changed-deletion") value.course.lessons.find(item => item.number === 5)!.sections[2].body[3] = "No deletion rule.";
    if (change === "changed-object-rule") value.course.lessons.find(item => item.number === 32)!.sections[1].body[5] = "An unrelated thing-object example.";
    expect(() => verify(value)).toThrow();
  });
  it.each(["crybaby-register", "criminal-meaning", "wrong-spanish", "audio", "attestation", "different-agent"])("rejects %s publication claims", change => {
    const value = fixture();
    if (change === "crybaby-register") value.entry.meaningEn = "crybaby";
    if (change === "criminal-meaning") value.entry.meaningEn = "a murderer";
    if (change === "wrong-spanish") value.entry.meaningEs = "una persona que ríe";
    if (change === "audio") value.entry.audioUrl = "https://example.org/invented.mp3";
    if (change === "attestation") { value.entry.sourceLocator.attestedHeadword = value.entry.sourceSpelling; value.entry.sourceLocator.agentNounProof.directWholeFormAttestationClaimed = true; }
    if (change === "different-agent") value.entry.sourceSpelling = "cuīcaquētl";
    expect(() => verify(value)).toThrow();
  });
  it("rejects altered primary source identities", () => {
    const value = fixture();
    expect(() => verifyAgentNounFormProof(value.entry, value.reference, "a".repeat(64), value.course, courseHash)).toThrow();
    expect(() => verifyAgentNounFormProof(value.entry, value.reference, pdfHash, value.course, "a".repeat(64))).toThrow();
    value.entry.sourceUrl = `${url}#page=112`;
    expect(() => verify(value)).toThrow();
  });
});
