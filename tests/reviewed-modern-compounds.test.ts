import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyReviewedModernCompound, MODERN_COMPOUND_PROOFS, DICTIONARY_URL, DICTIONARY_SHA, RULE_URL, RULE_SHA } = createRequire(import.meta.url)("../scripts/lib/reviewed-modern-compounds.js");
function fixture(kind = "studentHouse") {
  const proof = MODERN_COMPOUND_PROOFS[kind];
  const values: Record<string, [string, string, string, string, string, number, string]> = {
    studentHouse: ["momachtihcācalli", "momachtihkakalli", "student house (modeled noun)", "casa de estudiante (sustantivo modelado)", "noun reference", 332, "MOMACHTIHQUĒTL"],
    waterFalls: ["āhuetzi", "awetsi", "water falls (modeled verb)", "cae agua (verbo modelado)", "subject-incorporated verb reference", 45, "ĀTL"],
    fearfulSpeaking: ["mahcatlahtoā", "mahkatlahtoa", "speak fearfully (verb reference)", "hablar con miedo (referencia verbal)", "manner-modified verb reference", 500, "TLAHTOĀ"]
  };
  const [sourceSpelling, display, meaningEn, meaningEs, partOfSpeech, page, head] = values[kind];
  const dictionary = { reference_url: DICTIONARY_URL, source_sha256: DICTIONARY_SHA, pages: Array.from({ length: 644 }, (_, i) => ({ pdf_page: i + 1, text: "" })) };
  dictionary.pages[331].text = "MOMACHTIHQUĒTL. tlat. ni. Student. tlazal. momachtihcā-.\nNEXT. tlat. Neighbor.";
  dictionary.pages[67].text = "CALLI. tlat. House. tlazal. cal-.\nNEXT. tlat. Neighbor.";
  dictionary.pages[44].text = "ĀTL. tlat. Water.\n";
  dictionary.pages[45].text = "CONTINUATION\ntlazal. ā-, āl-.\nNEXT. tlat. Neighbor.";
  dictionary.pages[217].text = "HUETZI. tlach2. 1. Fruit falls. 2. Ce tlenhueli falls from above.\nNEXT. tlat. Neighbor.";
  dictionary.pages[499].text = "TLAHTOĀ. tlach3. 1. Special use. 2. ni. Speak.\nNEXT. tlat. Neighbor.";
  const ruleHtml = `<link href="${RULE_URL}"><title>Nawatl de Orizaba</title><h5>10.1 Raíces compuestas sustantivas</h5><p>S 1 + S 2 = S; absolutivos; segunda raíz componente.</p><h6>10.2.1 La incorporación de sustantivos</h6><p>Suj + V = V; a-kalaki; intransitivas; prefijo de sujeto u objeto.</p><h6>10.2.3 Incorporación de verbos</h6><p>V + -ka- + V = V; ni-mawi; ni-mah-ka-tzahtzi.</p>`;
  const url = DICTIONARY_URL + "#page=" + page;
  const entry = { sourceSpelling, display, meaningEn, meaningEs, partOfSpeech, formKind: "rule-composed-reference-form", sourceUrl: url, audioUrl: null as string | null, audioKind: "missing", verification: { formEvidence: "qualified-reviewed-rule-composition" }, sourceLocator: { sourceType: "productive-reviewed-modern-compound", referenceFileSha256: DICTIONARY_SHA, sourceUrl: url, referencePdfPage: page, referenceHeadword: head, attestedHeadword: null as string | null, modernCompoundProof: structuredClone(proof) } };
  return { entry, dictionary, ruleHtml };
}
const verify = (x: ReturnType<typeof fixture>, dictionaryHash = DICTIONARY_SHA, ruleHash = RULE_SHA) => verifyReviewedModernCompound(x.entry, x.dictionary, dictionaryHash, x.ruleHtml, ruleHash);
describe("three individually reviewed modern comparison compounds", () => {
  it.each(["studentHouse", "waterFalls", "fearfulSpeaking"])("accepts bounded %s evidence", key => expect(() => verify(fixture(key))).not.toThrow());
  it.each(["direct-word", "generator", "allomorph", "utterance", "paradigm", "pronunciation", "source-audio", "copied-examples"])("rejects added %s claims", change => {
    const x = fixture(); const p = x.entry.sourceLocator.modernCompoundProof;
    if (change === "direct-word") p.directWholeFormAttestationClaimed = true;
    if (change === "generator") p.unrestrictedGeneratorApproved = true;
    if (change === "allomorph") p.arbitraryAllomorphApproved = true;
    if (change === "utterance") p.completeStandaloneUtteranceClaimed = true;
    if (change === "paradigm") p.fullParadigmApproved = true;
    if (change === "pronunciation") p.pronunciationCertificationClaimed = true;
    if (change === "source-audio") x.entry.audioUrl = "https://example.com/unrelated.mp3";
    if (change === "copied-examples") p.sourceProseOrExamplesCopied = true;
    expect(() => verify(x)).toThrow();
  });
  it.each(["student-h-drop", "school", "ownership", "student-neighbor-stem", "historical-house", "dependent-student", "missing-house", "source-hash", "rule-hash", "wrong-rule-url"])("rejects invalid %s nominal evidence", change => {
    const x = fixture(); const p = x.entry.sourceLocator.modernCompoundProof;
    if (change === "student-h-drop") p.composition.firstCombiningStem = "momachticā";
    if (change === "school") p.lexicalizedSchoolSenseClaimed = true;
    if (change === "ownership") p.studentOwnershipOrDormitoryClaimed = true;
    if (change === "student-neighbor-stem") x.dictionary.pages[331].text = "MOMACHTIHQUĒTL. tlat. No metadata.\nNEXT. tlat. tlazal. momachtihcā-.";
    if (change === "historical-house") x.dictionary.pages[67].text = x.dictionary.pages[67].text.replace("House.", "House [Mc. 12].");
    if (change === "dependent-student") x.dictionary.pages[331].text = x.dictionary.pages[331].text.replace("Student.", "axcanah motequihuia icelti.");
    if (change === "missing-house") x.dictionary.pages[67].text = "OTHER. tlat. Neighbor.";
    if (change === "wrong-rule-url") x.ruleHtml = x.ruleHtml.replace(RULE_URL, "https://example.com/copied");
    expect(() => verify(x, change === "source-hash" ? "0".repeat(64) : DICTIONARY_SHA, change === "rule-hash" ? "0".repeat(64) : RULE_SHA)).toThrow();
  });
  it.each(["human-subject", "atmospheric-deletion", "rain-sense", "wrong-water-stem", "water-neighbor-stem", "missing-subject-model"])("rejects invalid %s water evidence", change => {
    const x = fixture("waterFalls"); const p = x.entry.sourceLocator.modernCompoundProof;
    if (change === "human-subject") p.humanSubjectClaimed = true;
    if (change === "atmospheric-deletion") p.weatherTlaRemovalRuleClaimed = true;
    if (change === "rain-sense") p.independentlyAttestedRainSenseClaimed = true;
    if (change === "wrong-water-stem") p.composition.incorporatedSubjectStem = "āl";
    if (change === "water-neighbor-stem") x.dictionary.pages[45].text = "CONTINUATION\nNo stem.\nNEXT. tlat. tlazal. ā-, āl-.";
    if (change === "missing-subject-model") x.ruleHtml = x.ruleHtml.replace("a-kalaki", "other");
    expect(() => verify(x)).toThrow();
  });
  it.each(["w-h-rewrite", "eastern-whole-word", "missing-fear-model", "wrong-speech-frame"])("rejects invalid %s fear evidence", change => {
    const x = fixture("fearfulSpeaking"); const p = x.entry.sourceLocator.modernCompoundProof;
    if (change === "w-h-rewrite") p.wToHRewriteClaimed = true;
    if (change === "eastern-whole-word") p.contemporaryEasternWholeWordClaimed = true;
    if (change === "missing-fear-model") x.ruleHtml = x.ruleHtml.replace("ni-mah-ka-tzahtzi", "other");
    if (change === "wrong-speech-frame") x.dictionary.pages[499].text = x.dictionary.pages[499].text.replace("2. ni.", "2. nic.");
    expect(() => verify(x)).toThrow();
  });
});
