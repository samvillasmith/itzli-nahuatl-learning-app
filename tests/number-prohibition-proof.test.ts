import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import importedCourse from "../src/data/nahuatlahtolli-course.json";

const { verifyCardinalFormProof, verifySixtyPlusTenFormProof, verifyProhibitionFormProof } = createRequire(import.meta.url)("../scripts/lib/number-prohibition-proof.js");
const courseHash = createHash("sha256").update(readFileSync("src/data/nahuatlahtolli-course.json")).digest("hex");
const pdfHash = "bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc";
const sepHash = "c25887473619870cd9dd7e2a2ce1f63ae73e82ef8e554940e02cd4be95511166";
const sepUrl = "https://dgeiib.basica.sep.gob.mx/files/fondo-editorial/educacion-intercultural/cgeib_00028.pdf";
const pdfUrl = "https://example.org/reference.pdf";
function rule(course: typeof importedCourse, lessonNumber: number, sectionIndex: number, bodyIndex: number) {
  return { lessonNumber, sectionIndex, bodyIndex, sourceUrl: course.lessons.find(item => item.number === lessonNumber)!.originalUrl, sourceImportSha256: courseHash };
}
function cardinalFixture() {
  const course = structuredClone(importedCourse), sourceSpelling = "nauhpōhualli huan mahtlactli";
  const sourceUrl = course.lessons.find(item => item.number === 4)!.originalUrl;
  const numberProof = {
    construction: "exact-cardinal-base-plus-huan-plus-exact-addend", authoredReferenceForm: sourceSpelling,
    directWholeFormAttestationClaimed: false, compositionNoStemChanges: true, phonologicalChangesInComposition: [] as string[],
    ordinalClaimed: false, predicateAsserted: false, generalizedNumberGeneratorApproved: false,
    subject: null as string | null, object: null as string | null, possessor: null as string | null, tense: null as string | null, nounSlot: null as string | null,
    operands: [{ value: 80, sourceSpelling: "nauhpōhualli", locator: rule(course, 4, 1, 124) }, { value: 10, sourceSpelling: "mahtlactli", locator: rule(course, 4, 1, 66) }],
    operator: { sourceSpelling: "huan", operation: "addition" }, resultValue: 90,
    grammarRuleLocators: [[4, 1, 110], [4, 1, 111], [4, 1, 112], [4, 1, 113], [4, 1, 115], [4, 1, 116], [4, 1, 117], [4, 1, 118], [31, 2, 1]].map(([l, s, b]) => rule(course, l, s, b)),
  };
  const entry = { sourceSpelling, sourceUrl, audioUrl: null as string | null, formKind: "rule-composed-cardinal", partOfSpeech: "number", meaningEn: "ninety", meaningEs: "noventa",
    sourceLocator: { sourceType: "productive-cardinal-form", sourceUrl, attestedHeadword: null as string | null, authoredReferenceForm: sourceSpelling, numberProof } };
  return { entry, course };
}
function prohibitionFixture() {
  const course = structuredClone(importedCourse), sourceSpelling = "amo xiyāuh";
  const reference = { reference_url: pdfUrl, source_sha256: pdfHash, pages: Array.from({ length: 615 }, () => ({ text: "" })) };
  reference.pages[614].text = "YĀ1. tlach. axahci. 1. Motequihuia YAUH ica na huan ta pan tlenpano huan ica ta pan tlenmapano; other usage. 2. Other sense.";
  const sepReference = { reference_url: sepUrl, source_sha256: sepHash, pages: Array.from({ length: 47 }, () => ({ text: "" })) };
  sepReference.pages[46].text = " ".repeat(4225) + "Amo xikilkauakaj inkiijkuilosej";
  const prohibitionProof = {
    construction: "negative-particle-before-exact-singular-second-person-command", authoredReferenceForm: sourceSpelling,
    directWholeFormAttestationClaimed: false, compositionNoStemChanges: true, phonologicalChangesInComposition: [] as string[],
    exactPositiveCommand: { sourceSpelling: "Xiyāuh", locator: rule(course, 24, 2, 39) },
    modernIrregularVerbEvidence: { referenceHeadword: "YĀ1", referencePdfPage: 615, selectedSense: 1, selectedCommandBase: "yauh", referenceFileSha256: pdfHash,
      exactGrammaticalFrame: "YAUH ica na huan ta pan tlenpano huan ica ta pan tlenmapano" },
    negativeCommandModel: { sourceUrl: sepUrl + "#page=47", referencePdfPage: 47, referenceTextStart: 4225, referenceFileSha256: sepHash,
      exactSelectedForm: "Amo xikilkauakaj", negativeParticle: "Amo", commandPrefix: "xi", positiveToNegativeStemChanges: [] as string[],
      sourceContext: "A negative reminder to the learner group not to forget to write the respondent’s name and work, with matching Spanish instructional context on the same page.",
      regionalScope: "Huasteca-wide official school guide; exact positive command is independently Chicontepec." },
    grammarRuleLocators: [[19, 2, 0], [19, 2, 2], [19, 2, 4]].map(([l, s, b]) => rule(course, l, s, b)),
    subject: { person: 2, number: "singular" }, object: null as string | null, tense: null as string | null,
    mood: "negative-directive", honorificClaimed: false, generalizedNegativeCommandGeneratorApproved: false,
  };
  const sourceUrl = prohibitionProof.exactPositiveCommand.locator.sourceUrl;
  const entry = { sourceSpelling, sourceUrl, audioUrl: null as string | null, formKind: "rule-composed-prohibition", partOfSpeech: "expression", meaningEn: "do not go", meaningEs: "no vayas",
    sourceLocator: { sourceType: "productive-prohibition-form", sourceUrl, attestedHeadword: null as string | null, authoredReferenceForm: sourceSpelling,
      referencePdfPage: 615, referenceHeadword: "YĀ1", referenceFileSha256: pdfHash, prohibitionProof } };
  return { entry, course, reference, sepReference };
}
const cardinal = (value: ReturnType<typeof cardinalFixture>) => verifyCardinalFormProof(value.entry, value.course, courseHash);
const prohibition = (value: ReturnType<typeof prohibitionFixture>) => verifyProhibitionFormProof(value.entry, value.reference, pdfHash, value.course, courseHash, value.sepReference, sepHash);

function seventyFixture() {
  const course = structuredClone(importedCourse), sourceSpelling = "expowalli huan mahtlactli", sourceUrl = sepUrl + "#page=60";
  const sepReference = { reference_url: sepUrl, source_sha256: sepHash, pages: Array.from({ length: 62 }, () => ({ text: "" })) };
  sepReference.pages[59].text = " ".repeat(3048) + "Expouali\n";
  sepReference.pages[61].text = "\nExpouali uan ome\n";
  const base = { value: 60, sourceSpelling: "Expouali", compositionSpelling: "expowalli", reviewedFactEntryId: "word-v3function-dec5dc1053abd2b1", reviewedSourceFactHash: "1db2359f53b46a23f7bbc7d6c977da3fb0a026bd17f78a2af8092dd114f4a364",
    reviewedPublishableFileSha256: "11286de8c43ef3fc7978fdd35d0a13c247933edf1cfc3a996b5b044dc8e3913d", reviewedPrivateFileSha256: "e69c65fc2a16a4529aa6452a51c5fb4849cba2010d88b2dde40a8cca13d79478", reviewedPeerFileSha256: "3e73e18d0e79472da6dc9dcfeeb007cd547222d153b36971e0ce947de2a77de8",
    sourcePdfPage: 60, sourceTextStart: 3048, sourceFileSha256: sepHash, individualLexicalDisplayChoiceReviewed: true, sourceAndCompositionOrthographyIdenticalClaimed: false,
    generalXInsertionRuleClaimed: false, generalUToWRuleClaimed: false, generalLToLlRuleClaimed: false, identicalPronunciationClaimed: false };
  const addend = { value: 10, sourceSpelling: "mahtlactli", locator: rule(course, 4, 1, 66) };
  const numberProof = { construction: "reviewed-sixty-base-plus-huan-plus-exact-ten", authoredReferenceForm: sourceSpelling, directWholeFormAttestationClaimed: false, compositionNoStemChanges: true, phonologicalChangesInComposition: [] as string[],
    resultValue: 70, operator: { sourceSpelling: "huan", operation: "addition" }, operands: [base, addend],
    independentValueCorroboration: rule(course, 4, 1, 123), independentXLessVariantUsedToInsertX: false,
    grammarRuleLocators: [[4,1,110],[4,1,111],[4,1,112],[4,1,113],[4,1,115],[4,1,116],[4,1,117],[4,1,118],[31,2,1]].map(([l,s,b]) => rule(course,l,s,b)),
    subject: null as string | null, object: null as string | null, possessor: null as string | null, tense: null as string | null, nounSlot: null as string | null, ordinalClaimed: false, predicateAsserted: false, generalizedNumberGeneratorApproved: false };
  const sixtyEntry = { id: base.reviewedFactEntryId, display: "expowalli", sourceSpelling: "Expouali", sourceUrl, meaningEn: "sixty", meaningEs: "sesenta",
    sourceLocator: { sourceType: "individual-public-reference-fact", sourceUrl, sourceFactReviewHash: base.reviewedSourceFactHash, referencePdfPage: 60, referenceTextStart: 3048, referenceFileSha256: sepHash, attestedHeadword: "Expouali" } };
  const entry = { sourceSpelling, sourceUrl, audioUrl: null as string | null, formKind: "rule-composed-cardinal", partOfSpeech: "number", meaningEn: "seventy", meaningEs: "setenta",
    sourceLocator: { sourceType: "productive-sixty-plus-ten-form", sourceUrl, attestedHeadword: null as string | null, authoredReferenceForm: sourceSpelling, numberProof } };
  return { entry, base, addend, course, sepReference, sixtyEntry };
}
const seventy = (value: ReturnType<typeof seventyFixture>) => verifySixtyPlusTenFormProof(value.entry, value.course, courseHash, value.sepReference, sepHash, value.sixtyEntry);

describe("one bounded eighty-plus-ten cardinal", () => {
  it("accepts ninety with exact operands and licensed additive models", () => expect(() => cardinal(cardinalFixture())).not.toThrow());
  it.each(["operand", "addition", "sum", "operator", "spelling"])("rejects changed %s", change => {
    const value = cardinalFixture(), proof = value.entry.sourceLocator.numberProof;
    if (change === "operand") proof.operands[0].sourceSpelling = "cēmpōhualli";
    if (change === "addition") proof.operator.operation = "multiplication";
    if (change === "sum") proof.resultValue = 800;
    if (change === "operator") proof.operator.sourceSpelling = "ihuan";
    if (change === "spelling") value.entry.sourceSpelling = "nauhpōhualli mahtlactli";
    expect(() => cardinal(value)).toThrow();
  });
  it.each(["ordinal", "predicate", "generator", "noun-slot", "person", "stem-change"])("rejects added %s claims", change => {
    const value = cardinalFixture(), proof = value.entry.sourceLocator.numberProof;
    if (change === "ordinal") proof.ordinalClaimed = true;
    if (change === "predicate") proof.predicateAsserted = true;
    if (change === "generator") proof.generalizedNumberGeneratorApproved = true;
    if (change === "noun-slot") proof.nounSlot = "people";
    if (change === "person") proof.subject = "we";
    if (change === "stem-change") proof.phonologicalChangesInComposition = ["delete vowel"];
    expect(() => cardinal(value)).toThrow();
  });
  it.each(["offset", "url", "hash", "missing-model", "operand-gloss", "tens-model"])("rejects altered %s evidence", change => {
    const value = cardinalFixture(), proof = value.entry.sourceLocator.numberProof;
    if (change === "offset") proof.operands[0].locator.bodyIndex = 123;
    if (change === "url") proof.grammarRuleLocators[0].sourceUrl = "https://example.org/invented";
    if (change === "hash") proof.grammarRuleLocators[0].sourceImportSha256 = "a".repeat(64);
    if (change === "missing-model") proof.grammarRuleLocators.pop();
    if (change === "operand-gloss") value.course.lessons.find(item => item.number === 4)!.sections[1].body[124] = "nauhpōhualli “sixty”";
    if (change === "tens-model") value.course.lessons.find(item => item.number === 31)!.sections[2].body[1] = "An unrelated conjunction.";
    expect(() => cardinal(value)).toThrow();
  });
  it("rejects invented media, false attestation and a wrong English or Spanish value", () => {
    const audio = cardinalFixture(); audio.entry.audioUrl = "https://example.org/invented.mp3";
    const attested = cardinalFixture(); attested.entry.sourceLocator.numberProof.directWholeFormAttestationClaimed = true;
    const english = cardinalFixture(); english.entry.meaningEn = "ninetieth";
    const spanish = cardinalFixture(); spanish.entry.meaningEs = "ochenta";
    for (const value of [audio, attested, english, spanish]) expect(() => cardinal(value)).toThrow();
  });
});

describe("one bounded reviewed-sixty-plus-ten cardinal", () => {
  it("accepts seventy with the separately reviewed x-bearing sixty fact", () => expect(() => seventy(seventyFixture())).not.toThrow());
  it.each(["x-insertion", "u-w", "l-ll", "pronunciation", "unreviewed-choice", "identical-source", "fact-hash", "peer-hash", "base-value", "source-spelling", "canonical-base"])("rejects added or changed %s base claim", change => {
    const x = seventyFixture();
    if (change === "x-insertion") x.base.generalXInsertionRuleClaimed = true;
    if (change === "u-w") x.base.generalUToWRuleClaimed = true;
    if (change === "l-ll") x.base.generalLToLlRuleClaimed = true;
    if (change === "pronunciation") x.base.identicalPronunciationClaimed = true;
    if (change === "unreviewed-choice") x.base.individualLexicalDisplayChoiceReviewed = false;
    if (change === "identical-source") x.base.sourceAndCompositionOrthographyIdenticalClaimed = true;
    if (change === "fact-hash") x.base.reviewedSourceFactHash = "a".repeat(64);
    if (change === "peer-hash") x.base.reviewedPeerFileSha256 = "a".repeat(64);
    if (change === "base-value") x.base.value = 80;
    if (change === "source-spelling") x.base.sourceSpelling = "ēpōhualli";
    if (change === "canonical-base") x.base.compositionSpelling = "epowalli";
    expect(() => seventy(x)).toThrow();
  });
  it.each(["base-display", "base-meaning", "base-source", "base-offset", "base-review", "actual-token", "neighbor-token", "sixty-plus-two", "source-identity"])("rejects altered %s independent evidence", change => {
    const x = seventyFixture();
    if (change === "base-display") x.sixtyEntry.display = "expowali";
    if (change === "base-meaning") x.sixtyEntry.meaningEn = "sixty-one";
    if (change === "base-source") x.sixtyEntry.sourceUrl = sepUrl + "#page=61";
    if (change === "base-offset") x.sixtyEntry.sourceLocator.referenceTextStart = 3049;
    if (change === "base-review") x.sixtyEntry.sourceLocator.sourceFactReviewHash = "a".repeat(64);
    if (change === "actual-token") x.sepReference.pages[59].text = " ".repeat(3048) + "Epouali\n";
    if (change === "neighbor-token") x.sepReference.pages[59].text = " ".repeat(3047) + "nExpouali\n";
    if (change === "sixty-plus-two") x.sepReference.pages[61].text = "\nOmpouali uan ome\n";
    if (change === "source-identity") x.sepReference.source_sha256 = "a".repeat(64);
    expect(() => seventy(x)).toThrow();
  });
  it.each(["x-less-insertion", "ten", "value", "operator", "tens-model", "tense", "noun-slot", "ordinal", "generator", "attestation", "wrong-spanish", "media"])("rejects %s construction expansion", change => {
    const x = seventyFixture(), p = x.entry.sourceLocator.numberProof;
    if (change === "x-less-insertion") p.independentXLessVariantUsedToInsertX = true;
    if (change === "ten") x.addend.value = 5;
    if (change === "value") p.resultValue = 600;
    if (change === "operator") p.operator.operation = "multiplication";
    if (change === "tens-model") x.course.lessons.find(l => l.number === 31)!.sections[2].body[1] = "Unrelated sentence.";
    if (change === "tense") p.tense = "present";
    if (change === "noun-slot") p.nounSlot = "students";
    if (change === "ordinal") p.ordinalClaimed = true;
    if (change === "generator") p.generalizedNumberGeneratorApproved = true;
    if (change === "attestation") p.directWholeFormAttestationClaimed = true;
    if (change === "wrong-spanish") x.entry.meaningEs = "sesenta";
    if (change === "media") x.entry.audioUrl = "https://example.org/invented.mp3";
    expect(() => seventy(x)).toThrow();
  });
  it("rejects changed primary and licensed source identities", () => {
    const x = seventyFixture();
    expect(() => verifySixtyPlusTenFormProof(x.entry, x.course, "a".repeat(64), x.sepReference, sepHash, x.sixtyEntry)).toThrow();
    expect(() => verifySixtyPlusTenFormProof(x.entry, x.course, courseHash, x.sepReference, "a".repeat(64), x.sixtyEntry)).toThrow();
  });
});

describe("one bounded negative singular going directive", () => {
  it("accepts the exact singular command with the separately documented negative particle", () => expect(() => prohibition(prohibitionFixture())).not.toThrow());
  it.each(["plural", "first-person", "object", "tense", "future", "honorific", "generator", "stem-change"])("rejects an added %s claim", change => {
    const value = prohibitionFixture(), proof = value.entry.sourceLocator.prohibitionProof;
    if (change === "plural") proof.subject.number = "plural";
    if (change === "first-person") proof.subject.person = 1;
    if (change === "object") proof.object = "me";
    if (change === "tense") proof.tense = "present";
    if (change === "future") proof.mood = "future";
    if (change === "honorific") proof.honorificClaimed = true;
    if (change === "generator") proof.generalizedNegativeCommandGeneratorApproved = true;
    if (change === "stem-change") proof.compositionNoStemChanges = false;
    expect(() => prohibition(value)).toThrow();
  });
  it.each(["positive-command", "irregular-base", "neighbor-sense", "modern-head", "xi-model", "singular-model"])("rejects altered %s evidence", change => {
    const value = prohibitionFixture(), proof = value.entry.sourceLocator.prohibitionProof;
    if (change === "positive-command") proof.exactPositiveCommand.sourceSpelling = "Xiyacan";
    if (change === "irregular-base") proof.modernIrregularVerbEvidence.selectedCommandBase = "yohui";
    if (change === "neighbor-sense") value.reference.pages[614].text = "YĀ1. tlach. axahci. 1. No command. 2. YAUH ica na huan ta pan tlenpano huan ica ta pan tlenmapano";
    if (change === "modern-head") value.reference.pages[614].text = value.reference.pages[614].text.replace("YĀ1.", "OTHER.");
    if (change === "xi-model") value.course.lessons.find(item => item.number === 19)!.sections[2].body[0] = "An unrelated first-person rule.";
    if (change === "singular-model") value.course.lessons.find(item => item.number === 19)!.sections[2].body[2] = "Only a plural rule.";
    expect(() => prohibition(value)).toThrow();
  });
  it.each(["offset", "token", "substring", "page", "source-hash", "source-url", "particle", "regional-scope", "context"])("rejects changed SEP %s", change => {
    const value = prohibitionFixture(), model = value.entry.sourceLocator.prohibitionProof.negativeCommandModel;
    if (change === "offset") model.referenceTextStart++;
    if (change === "token") value.sepReference.pages[46].text = value.sepReference.pages[46].text.replace("Amo", "Ax");
    if (change === "substring") value.sepReference.pages[46].text = " ".repeat(4224) + "xAmo xikilkauakaj inkiijkuilosej";
    if (change === "page") model.referencePdfPage = 46;
    if (change === "source-hash") model.referenceFileSha256 = "a".repeat(64);
    if (change === "source-url") model.sourceUrl = "https://example.org/drive-or-unreviewed.pdf#page=47";
    if (change === "particle") model.negativeParticle = "Ax";
    if (change === "regional-scope") model.regionalScope = "Certified in every Eastern community";
    if (change === "context") model.sourceContext = "An affirmative instruction";
    expect(() => prohibition(value)).toThrow();
  });
  it("rejects changed source identities, false attestation and extra media", () => {
    const value = prohibitionFixture();
    expect(() => verifyProhibitionFormProof(value.entry, value.reference, "a".repeat(64), value.course, courseHash, value.sepReference, sepHash)).toThrow();
    expect(() => verifyProhibitionFormProof(value.entry, value.reference, pdfHash, value.course, courseHash, value.sepReference, "a".repeat(64))).toThrow();
    expect(() => verifyProhibitionFormProof(value.entry, value.reference, pdfHash, value.course, "a".repeat(64), value.sepReference, sepHash)).toThrow();
    value.entry.sourceLocator.prohibitionProof.directWholeFormAttestationClaimed = true;
    expect(() => prohibition(value)).toThrow();
    value.entry.sourceLocator.prohibitionProof.directWholeFormAttestationClaimed = false;
    value.entry.audioUrl = "https://example.org/invented.mp3";
    expect(() => prohibition(value)).toThrow();
  });
});
