import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import importedCourse from "../src/data/nahuatlahtolli-course.json";

const { verifyPossessedAgentFormProof } = createRequire(import.meta.url)("../scripts/lib/possessed-agent-form-proof.js");
const pdfHash = "bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc";
const courseHash = createHash("sha256").update(readFileSync("src/data/nahuatlahtolli-course.json")).digest("hex");
const url = "https://example.org/reference.pdf";

function fixture(number = "singular") {
  const course = structuredClone(importedCourse), suffix = number === "singular" ? "uh" : "huān";
  const sourceSpelling = "notlayecāncā" + suffix, sourceUrl = url + "#page=550";
  const reference = { reference_url: url, source_sha256: pdfHash, pages: Array.from({ length: 597 }, () => ({ text: "" })) };
  reference.pages[549].text = "TLAYECĀNA. tlach2. ni. Macehualli quinnahuatia cequinoqueh ica ce tequitl. panoc. tlayecānqui.\nTLAYECĀNQUĒTL. tlat. ni. Macehualli tlen quinnahuatia cequinoqueh ica ce tequitl. achi. TLAYECĀNA, QUĒ, TL2.";
  reference.pages[56].text = "CĀ1. tlaten. 1. Tlachiuhcatlatocaxtiliztli ica tlenpanoc quitequihuia CĀ1 quemman quicelia tlaaxcatilli tlen UH2 huan HUĀN2. 2. Other sense.";
  reference.pages[412].text = "QUĒ. tlaten. Activity agent sense. achi. CĀ1 (tlalocotz.)";
  reference.pages[331].text = "MOMACHTIHQUĒTL. tlat. Study agent. tlaaxca. -momachtihcāuh.";
  reference.pages[513].text = "TLAMACHTIHQUĒTL. tlat. Teaching agent. tlaaxca. -tlamachtihcāuh.";
  reference.pages[596].text = "UH2. tlaten. Tlaaxcatilli tlen cetzin. Zan motequihuia ica cequin tlatocaxtiliztli iyollo tlen tzontlami ica tentzilincayotl.";
  reference.pages[210].text = "HUĀN2. tlaten. 1. Tlatzonpepecholli. Tlaaxcatilli tlen miaquin. 2. Other sense.";
  const possessedAgentProof = {
    construction: "first-person-possessed-reviewed-agent-noun", authoredReferenceForm: sourceSpelling, directWholeFormAttestationClaimed: false,
    modernAgentEvidence: { referencePdfPage: 550, referenceHeadword: "TLAYECĀNQUĒTL", sourceSpelling: "tlayecānquētl", selectedSense: "work-group-leader", referenceFileSha256: pdfHash,
      governingVerbHeadword: "TLAYECĀNA", verbClass: "2", exactPastForm: "tlayecānqui", exactPastStem: "tlayecān", derivationalReferences: ["TLAYECĀNA", "QUĒ", "TL2"] },
    agentAllomorphEvidence: { referencePdfPage: 57, referenceHeadword: "CĀ1", selectedSense: 1, sourceAllomorph: "cā",
      exactFunction: "deverbal-past-noun-allomorph-when-combining-or-receiving-UH2-or-HUĀN2",
      suffixCrossReference: { referencePdfPage: 413, referenceHeadword: "QUĒ", exactPrintedReference: "CĀ1 (tlalocotz.)" },
      modelEvidence: [{ referencePdfPage: 332, referenceHeadword: "MOMACHTIHQUĒTL", exactPrintedPossessedMetadata: "-momachtihcāuh" }, { referencePdfPage: 514, referenceHeadword: "TLAMACHTIHQUĒTL", exactPrintedPossessedMetadata: "-tlamachtihcāuh" }] },
    stemAllomorph: { operation: "replace-singular-agent-suffix-with-reviewed-possessed-allomorph", sourceAgentSuffix: "quētl", possessedAgentSuffix: "cā", exactResult: "tlayecāncā" },
    possessionNumberEvidence: { referencePdfPage: number === "singular" ? 597 : 211, referenceHeadword: number === "singular" ? "UH2" : "HUĀN2", selectedSense: number === "singular" ? "unnumbered modern suffix" as string | number : 1,
      sourceSuffix: suffix, number, allVowelFinalNounsClaimed: false },
    possessorPrefix: "no", possessor: { person: 1, number: "singular" }, possessedNumber: number,
    subject: null as string | null, object: null as string | null, tense: null as string | null, finitePredicateAsserted: false,
    grammarRuleLocators: [[0, 0], [0, 2], [0, 3], [1, 1], [1, 9], [1, 30], [1, 31]].map(([sectionIndex, bodyIndex]) => ({ lessonNumber: 8, sectionIndex, bodyIndex, sourceUrl: course.lessons.find(item => item.number === 8)!.originalUrl, sourceImportSha256: courseHash })),
    phonologicalChangesBeyondReviewedAllomorph: [] as string[], generalizedPossessedAgentGeneratorApproved: false,
  };
  const entry = { sourceSpelling, sourceUrl, audioUrl: null as string | null, formKind: "rule-composed-possessed-agent", partOfSpeech: "noun", meaningEn: number === "singular" ? "my leader" : "my leaders", meaningEs: number === "singular" ? "mi líder" : "mis líderes",
    sourceLocator: { sourceType: "productive-possessed-agent-form", sourceUrl, attestedHeadword: null as string | null, authoredReferenceForm: sourceSpelling, referencePdfPage: 550, referenceHeadword: "TLAYECĀNQUĒTL", referenceFileSha256: pdfHash, possessedAgentProof } };
  return { entry, reference, course };
}
const verify = (value: ReturnType<typeof fixture>) => verifyPossessedAgentFormProof(value.entry, value.reference, pdfHash, value.course, courseHash);

describe("two bounded possessed work-leader nouns", () => {
  it.each(["singular", "plural"])("accepts first-person possessor with %s possessed noun", number => expect(() => verify(fixture(number))).not.toThrow());
  it.each(["possessor-prefix", "possessor-person", "possessor-number", "possessed-number", "ending", "all-vowels"])("rejects changed %s", change => {
    const value = fixture(), proof = value.entry.sourceLocator.possessedAgentProof;
    if (change === "possessor-prefix") proof.possessorPrefix = "i";
    if (change === "possessor-person") proof.possessor.person = 3;
    if (change === "possessor-number") proof.possessor.number = "plural";
    if (change === "possessed-number") proof.possessedNumber = "plural";
    if (change === "ending") proof.possessionNumberEvidence.sourceSuffix = "meh";
    if (change === "all-vowels") proof.possessionNumberEvidence.allVowelFinalNounsClaimed = true;
    expect(() => verify(value)).toThrow();
  });
  it.each(["subject", "object", "tense", "predicate", "generator", "stem-change"])("rejects added %s claims", change => {
    const value = fixture(), proof = value.entry.sourceLocator.possessedAgentProof;
    if (change === "subject") proof.subject = "I";
    if (change === "object") proof.object = "people";
    if (change === "tense") proof.tense = "present";
    if (change === "predicate") proof.finitePredicateAsserted = true;
    if (change === "generator") proof.generalizedPossessedAgentGeneratorApproved = true;
    if (change === "stem-change") proof.phonologicalChangesBeyondReviewedAllomorph = ["drop n"];
    expect(() => verify(value)).toThrow();
  });
  it.each(["past-base", "verb-class", "allomorph", "allomorph-sense", "agent-suffix", "model-metadata", "cross-reference"])("rejects altered %s proof", change => {
    const value = fixture(), proof = value.entry.sourceLocator.possessedAgentProof;
    if (change === "past-base") proof.modernAgentEvidence.exactPastStem = "tlayecāna";
    if (change === "verb-class") proof.modernAgentEvidence.verbClass = "1";
    if (change === "allomorph") proof.stemAllomorph.exactResult = "tlayecānquē";
    if (change === "allomorph-sense") proof.agentAllomorphEvidence.selectedSense = 2;
    if (change === "agent-suffix") proof.stemAllomorph.sourceAgentSuffix = "tli";
    if (change === "model-metadata") proof.agentAllomorphEvidence.modelEvidence[0].exactPrintedPossessedMetadata = "-momachtiquē";
    if (change === "cross-reference") proof.agentAllomorphEvidence.suffixCrossReference.referenceHeadword = "QUĒ2";
    expect(() => verify(value)).toThrow();
  });
  it.each(["work-sense", "past-stem", "neighbor-rule", "neighbor-model", "missing-uh", "missing-huan"])("rejects altered %s actual source", change => {
    const value = fixture(change === "missing-huan" ? "plural" : "singular");
    if (change === "work-sense") value.reference.pages[549].text = value.reference.pages[549].text.replace("Macehualli tlen quinnahuatia cequinoqueh ica ce tequitl.", "A traveler’s guide.");
    if (change === "past-stem") value.reference.pages[549].text = value.reference.pages[549].text.replace("panoc. tlayecānqui.", "panoc. tlayecānac.");
    if (change === "neighbor-rule") value.reference.pages[56].text = "CĀ1. tlaten. 1. Another function.\nOTHER. tlaten. Tlachiuhcatlatocaxtiliztli ica tlenpanoc quitequihuia CĀ1 quemman quicelia tlaaxcatilli tlen UH2 huan HUĀN2.";
    if (change === "neighbor-model") value.reference.pages[331].text = "MOMACHTIHQUĒTL. tlat. No possessed metadata.\nOTHER. tlat. tlaaxca. -momachtihcāuh.";
    if (change === "missing-uh") value.reference.pages[596].text = "UH2. tlaten. Another ending.";
    if (change === "missing-huan") value.reference.pages[210].text = "HUĀN2. tlaten. 1. Another ending.";
    expect(() => verify(value)).toThrow();
  });
  it.each(["offset", "url", "hash", "singular-form", "plural-meaning"])("rejects altered %s course evidence", change => {
    const value = fixture(), proof = value.entry.sourceLocator.possessedAgentProof;
    if (change === "offset") proof.grammarRuleLocators[0].bodyIndex = 1;
    if (change === "url") proof.grammarRuleLocators[0].sourceUrl = "https://example.org/invented";
    if (change === "hash") proof.grammarRuleLocators[0].sourceImportSha256 = "a".repeat(64);
    if (change === "singular-form") value.course.lessons.find(item => item.number === 8)!.sections[0].body[2] = "no – conē – huan “my children”";
    if (change === "plural-meaning") value.course.lessons.find(item => item.number === 8)!.sections[1].body[31] = "Our pigs eat corn.";
    expect(() => verify(value)).toThrow();
  });
  it.each(["different-agent", "unpossessed-plural", "generic-guide", "wrong-spanish", "media", "attestation"])("rejects %s publication claims", change => {
    const value = fixture();
    if (change === "different-agent") value.entry.sourceSpelling = "notlamachtihcāuh";
    if (change === "unpossessed-plural") value.entry.sourceSpelling = "notlayecānanih";
    if (change === "generic-guide") value.entry.meaningEn = "my travel guide";
    if (change === "wrong-spanish") value.entry.meaningEs = "sus líderes";
    if (change === "media") value.entry.audioUrl = "https://example.org/invented.mp3";
    if (change === "attestation") { value.entry.sourceLocator.attestedHeadword = value.entry.sourceSpelling; value.entry.sourceLocator.possessedAgentProof.directWholeFormAttestationClaimed = true; }
    expect(() => verify(value)).toThrow();
  });
  it("rejects changed primary source identities", () => {
    const value = fixture();
    expect(() => verifyPossessedAgentFormProof(value.entry, value.reference, "a".repeat(64), value.course, courseHash)).toThrow();
    expect(() => verifyPossessedAgentFormProof(value.entry, value.reference, pdfHash, value.course, "a".repeat(64))).toThrow();
    value.entry.sourceUrl = url + "#page=551";
    expect(() => verify(value)).toThrow();
  });
});
