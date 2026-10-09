import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import importedCourse from "../src/data/nahuatlahtolli-course.json";

const { verifyStateVerbFormProof } = createRequire(import.meta.url)("../scripts/lib/state-verb-form-proof.js");
const pdfHash = "bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc";
const courseHash = createHash("sha256").update(readFileSync("src/data/nahuatlahtolli-course.json")).digest("hex");
const url = "https://example.org/reference.pdf";
function fixture() {
  const course = structuredClone(importedCourse), sourceSpelling = "yōlcueciuhtoc", sourceUrl = url + "#page=627";
  const reference = { reference_url: url, source_sha256: pdfHash, pages: Array.from({ length: 627 }, () => ({ text: "" })) };
  reference.pages[626].text = "YŌLCUECIHUI. tlach2. ni. Macehualli axcanah yolpaqui huan quinequi chocaz. panoc. yōlcueciuhqui. achi. YŌLLI, CUECIHUI.";
  reference.pages[181].text = "CUECIHUI. tlach2. ni. Selected shared root. panoc. cueciuhqui.";
  reference.pages[465].text = 'TI3. tlamotz. Quizaloa tlachihualiztli ica itlapalehuihca. TI3 quipoloa "i" quemman teipan yohui tlapalehuihquetl tlen ĒHUA1, IHCA huan O2. tlazal. ti-, t-.';
  reference.pages[355].text = "O2. tlach. axahci. 3. Tlapalehuihquetl. Motequihuia ica TI3. Itztoc macehualli, tecuani zo tlapiyalli zo eltoc tlamantli quennopa.";
  reference.pages[356].text = "OC. tlat. 2. Tlatzonpepecholli. Selected state metadata. miaq. oqueh. achi. O2, C4 (tlachiuhca.)";
  reference.pages[55].text = "C4. tlaten. 2. Motequihuia ica ome tlamantli tlachiuhcatlatocaxtiliztli: tlen quimanextia queniuhqui neci macehualli, tecuani, tlapiyalli zo tlamantli;";
  const stateVerbProof = {
    construction: "reviewed-shared-root-third-singular-current-state", authoredReferenceForm: sourceSpelling, directWholeFormAttestationClaimed: false,
    modernStemEvidence: { referencePdfPage: 627, referenceHeadword: "YŌLCUECIHUI", referenceFileSha256: pdfHash, sourceSpelling: "yōlcuecihui", verbClass: "2", exactPastForm: "yōlcueciuhqui", exactPastStem: "yōlcueciuh", frame: "ni", selectedSense: "human-unhappiness-and-wanting-to-cry", derivationalReferences: ["YŌLLI", "CUECIHUI"] },
    sharedRootModelEvidence: { referencePdfPage: 182, referenceHeadword: "CUECIHUI", sourceSpelling: "cuecihui", exactPastForm: "cueciuhqui", exactPastStem: "cueciuh", lessonNumber: 24, sectionIndex: 2, bodyIndex: 176, exactModelForm: "Nicueciuhtoc", sharedVerbEnding: "cuecihui", sourceImportSha256: courseHash, limitedToThisExplicitSharedRoot: true },
    stateConstructionEvidence: [
      { referencePdfPage: 466, referenceHeadword: "TI3", selectedSense: 1, exactPrintedMetadata: "ti-, t-", selectedFunction: "verbal-linker-with-i-deleted-before-O2", selectedAllomorph: "t" },
      { referencePdfPage: 356, referenceHeadword: "O2", selectedSense: 3, selectedFunction: "state-auxiliary-for-person-animal-or-thing", sourceAuxiliary: "o", linkerReference: "TI3" },
      { referencePdfPage: 357, referenceHeadword: "OC", selectedSense: 2, selectedFunction: "singular-stative-ending-linked-to-O2-and-C4", exactPrintedPluralMetadata: "oqueh", sourceEnding: "oc" },
      { referencePdfPage: 56, referenceHeadword: "C4", selectedSense: 2, selectedFunction: "quality-or-state-nominal-ending-not-past-tense-in-this-route", sourceEnding: "c" },
    ],
    stemAllomorph: { operation: "use-exact-modern-stem-with-shared-root-state-model", exactPastForm: "yōlcueciuhqui", removedPastEnding: "qui", exactResult: "yōlcueciuh" },
    subjectPrefix: "", subject: { person: 3, number: "singular", animacy: "human" }, objectPrefix: null as string | null, object: null as string | null,
    tense: "present", aspect: "state", linker: "t", stateAuxiliary: "o", singularStateEnding: "c",
    grammarRuleLocators: [[0, 5], [2, 142], [2, 143], [2, 144], [2, 176]].map(([sectionIndex, bodyIndex]) => ({ lessonNumber: 24, sectionIndex, bodyIndex, sourceUrl: course.lessons.find(x => x.number === 24)!.originalUrl, sourceImportSha256: courseHash })),
    phonologicalChangesBeyondReviewedAllomorph: [] as string[], generalizedStateGeneratorApproved: false, medicalDiagnosisClaimed: false, completedPastEventClaimed: false,
  };
  const entry = { sourceSpelling, sourceUrl, formKind: "rule-composed-state-verb", partOfSpeech: "verb-form", audioUrl: null as string | null, meaningEn: "he/she is sad", meaningEs: "él/ella está triste",
    sourceLocator: { sourceType: "productive-state-verb-form", sourceUrl, attestedHeadword: null as string | null, authoredReferenceForm: sourceSpelling, referencePdfPage: 627, referenceHeadword: "YŌLCUECIHUI", referenceFileSha256: pdfHash, stateVerbProof } };
  return { entry, reference, course };
}
const verify = (x: ReturnType<typeof fixture>) => verifyStateVerbFormProof(x.entry, x.reference, pdfHash, x.course, courseHash);
describe("one bounded human sadness state", () => {
  it("accepts only the reviewed zero-subject singular current state", () => expect(() => verify(fixture())).not.toThrow());
  it.each(["person", "number", "animacy", "prefix", "object-prefix", "object", "tense", "aspect", "linker", "auxiliary", "ending"])("rejects changed %s", change => {
    const x = fixture(), p = x.entry.sourceLocator.stateVerbProof;
    if (change === "person") p.subject.person = 1;
    if (change === "number") p.subject.number = "plural";
    if (change === "animacy") p.subject.animacy = "plant";
    if (change === "prefix") p.subjectPrefix = "ni";
    if (change === "object-prefix") p.objectPrefix = "qui";
    if (change === "object") p.object = "someone";
    if (change === "tense") p.tense = "past";
    if (change === "aspect") p.aspect = "completed";
    if (change === "linker") p.linker = "ti";
    if (change === "auxiliary") p.stateAuxiliary = "itztoc";
    if (change === "ending") p.singularStateEnding = "queh";
    expect(() => verify(x)).toThrow();
  });
  it.each(["past-stem", "past-ending", "class", "frame", "shared-root", "model", "linker-sense", "state-sense", "past-claim", "diagnosis", "generator", "sound-change"])("rejects altered %s proof", change => {
    const x = fixture(), p = x.entry.sourceLocator.stateVerbProof;
    if (change === "past-stem") p.stemAllomorph.exactResult = "yōlcuecihui";
    if (change === "past-ending") p.stemAllomorph.removedPastEnding = "c";
    if (change === "class") p.modernStemEvidence.verbClass = "3";
    if (change === "frame") p.modernStemEvidence.frame = "nic";
    if (change === "shared-root") p.sharedRootModelEvidence.referenceHeadword = "COCHI";
    if (change === "model") p.sharedRootModelEvidence.exactModelForm = "Nicochtoc";
    if (change === "linker-sense") p.stateConstructionEvidence[0].selectedSense = 2;
    if (change === "state-sense") p.stateConstructionEvidence[1].selectedSense = 2;
    if (change === "past-claim") p.completedPastEventClaimed = true;
    if (change === "diagnosis") p.medicalDiagnosisClaimed = true;
    if (change === "generator") p.generalizedStateGeneratorApproved = true;
    if (change === "sound-change") p.phonologicalChangesBeyondReviewedAllomorph = ["drop yōl"];
    expect(() => verify(x)).toThrow();
  });
  it.each(["meaning", "past", "neighbor-model", "linker", "auxiliary", "ending", "quality"])("rejects changed %s actual source", change => {
    const x = fixture();
    if (change === "meaning") x.reference.pages[626].text = x.reference.pages[626].text.replace("axcanah yolpaqui huan quinequi chocaz", "quicocohua iyollo");
    if (change === "past") x.reference.pages[626].text = x.reference.pages[626].text.replace("yōlcueciuhqui", "yōlcuecihuic");
    if (change === "neighbor-model") x.reference.pages[181].text = "CUECIHUI. tlach2. Missing past.\nOTHER. tlach2. panoc. cueciuhqui.";
    if (change === "linker") x.reference.pages[465].text = x.reference.pages[465].text.replace("IHCA huan O2", "IHCA huan O1");
    if (change === "auxiliary") x.reference.pages[355].text = "O2. tlach. axahci. 3. Another auxiliary.\nOTHER. tlach. 3. Tlapalehuihquetl. Motequihuia ica TI3. Itztoc macehualli, tecuani zo tlapiyalli zo eltoc tlamantli quennopa.";
    if (change === "ending") x.reference.pages[356].text = x.reference.pages[356].text.replace("miaq. oqueh.", "miaq. oyah.");
    if (change === "quality") x.reference.pages[55].text = "C4. tlaten. Only past event.";
    expect(() => verify(x)).toThrow();
  });
  it.each(["offset", "url", "hash", "third-person", "shared-model"])("rejects altered %s course locator or evidence", change => {
    const x = fixture(), p = x.entry.sourceLocator.stateVerbProof, lesson = x.course.lessons.find(l => l.number === 24)!;
    if (change === "offset") p.grammarRuleLocators[4].bodyIndex = 175;
    if (change === "url") p.grammarRuleLocators[4].sourceUrl = "https://example.org/new-course";
    if (change === "hash") p.grammarRuleLocators[4].sourceImportSha256 = "a".repeat(64);
    if (change === "third-person") lesson.sections[2].body[144] = "Itztoc “You are”";
    if (change === "shared-model") lesson.sections[2].body[176] = lesson.sections[2].body[176].replace("Nicueciuhtoc", "Nicochtoc");
    expect(() => verify(x)).toThrow();
  });
  it.each(["different-verb", "depression", "wrong-spanish", "media", "attestation"])("rejects %s publication expansion", change => {
    const x = fixture();
    if (change === "different-verb") x.entry.sourceSpelling = "cochtoc";
    if (change === "depression") x.entry.meaningEn = "he has clinical depression";
    if (change === "wrong-spanish") x.entry.meaningEs = "yo estaba triste";
    if (change === "media") x.entry.audioUrl = "https://example.org/new.mp3";
    if (change === "attestation") { x.entry.sourceLocator.attestedHeadword = x.entry.sourceSpelling; x.entry.sourceLocator.stateVerbProof.directWholeFormAttestationClaimed = true; }
    expect(() => verify(x)).toThrow();
  });
  it("rejects wrong source identities and wrong PDF anchor", () => {
    const x = fixture();
    expect(() => verifyStateVerbFormProof(x.entry, x.reference, "a".repeat(64), x.course, courseHash)).toThrow();
    expect(() => verifyStateVerbFormProof(x.entry, x.reference, pdfHash, x.course, "a".repeat(64))).toThrow();
    x.entry.sourceUrl = url + "#page=628";
    expect(() => verify(x)).toThrow();
  });
});
