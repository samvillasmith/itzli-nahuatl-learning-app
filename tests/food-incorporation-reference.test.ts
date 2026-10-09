import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyFoodIncorporationReferenceForm, FOOD_INCORPORATION_PROOF, DICTIONARY_URL, DICTIONARY_SHA, RULE_URL, RULE_SHA } = createRequire(import.meta.url)("../scripts/lib/food-incorporation-reference.js");

function fixture() {
  const dictionary = { reference_url: DICTIONARY_URL, source_sha256: DICTIONARY_SHA,
    pages: Array.from({ length: 644 }, (_, index) => ({ pdf_page: index + 1, text: "" })) };
  dictionary.pages[199].text = "ĒTL. tlat. Selected noun. tlazal. ē-.\nĒTLACUALLI. tlat. Neighbor.";
  dictionary.pages[141].text = "CUĀ. tlach4. nic. Selected eat verb.\nCUĀĀCHACĀNIĀ. tlach3. nimo. Neighbor.";
  dictionary.pages[196].text = "ĒLŌCUĀ. tlach4. ni. Selected food compound. achi. ĒLŌTL, CUĀ.\nĒLŌCUI. tlach1. ni. Neighbor.\nĒLŌTL. tlat. Model noun. tlazal. ēlō-.\nĒLŌTLAH. tlap. Neighbor.";
  dictionary.pages[335].text = "NACACUĀ. tlach4. ni. Selected food compound. achi. NACATL, CUĀ.\nNACACUAHQUĒTL. tlat. Neighbor.";
  dictionary.pages[336].text = "NACATL. tlat. Model noun. tlazal. naca-.\nNACAYOH. tlat. Neighbor.";
  const mechanism = { reference_url: RULE_URL, source_sha256: RULE_SHA, pages: [
    { pdf_page: 3, text: "Tzocohuite; huasteca oriental; [nhe]" },
    { pdf_page: 4, text: "Reviewed mechanism: incorporación nominal." }
  ] };
  const entry = { display: "ekwa", sourceSpelling: "ēcuā", meaningEn: "eat beans (verb reference)", meaningEs: "comer frijoles (referencia verbal)",
    partOfSpeech: "incorporated-object verb reference", formKind: "rule-composed-reference-form", verification: { formEvidence: "independently-reviewed-rule-composition" },
    audioUrl: null as string | null, audioKind: "missing", sourceUrl: DICTIONARY_URL + "#page=200",
    sourceLocator: { sourceType: "productive-food-incorporation-form", sourceUrl: DICTIONARY_URL + "#page=200", referenceFileSha256: DICTIONARY_SHA, referencePdfPage: 200, referenceHeadword: "ĒTL", attestedHeadword: null as string | null, foodIncorporationProof: structuredClone(FOOD_INCORPORATION_PROOF) } };
  return { entry, dictionary, mechanism };
}
const verify = (value: ReturnType<typeof fixture>) => verifyFoodIncorporationReferenceForm(value.entry, value.dictionary, DICTIONARY_SHA, value.mechanism, RULE_SHA);

describe("one model-constrained food-noun reference", () => {
  it("accepts only the exact ē- plus cuā reference with both reviewed models", () => expect(() => verify(fixture())).not.toThrow());
  it.each(["possessed-allomorph", "arbitrary-noun", "wrong-verb", "object-frame", "conjugated-form", "display", "free-utterance", "full-paradigm", "generic-generator", "phonology", "class-certification", "claimed-attestation"])('rejects unsupported %s', change => {
    const x = fixture(), proof = x.entry.sourceLocator.foodIncorporationProof;
    if (change === "possessed-allomorph") proof.noun.compositionStem = "ēuh";
    if (change === "arbitrary-noun") proof.noun.headword = "ĀTL";
    if (change === "wrong-verb") proof.verb.headword = "I";
    if (change === "object-frame") proof.models[0].sourceFrame = "nic";
    if (change === "conjugated-form") x.entry.sourceSpelling = "niēcuā";
    if (change === "display") x.entry.display = "ekwia";
    if (change === "free-utterance") proof.completeStandaloneUtteranceClaimed = true;
    if (change === "full-paradigm") proof.fullConjugationApproved = true;
    if (change === "generic-generator") proof.genericIncorporationGeneratorApproved = true;
    if (change === "phonology") proof.pronunciationCertificationClaimed = true;
    if (change === "class-certification") proof.targetVerbClassCertificationClaimed = true;
    if (change === "claimed-attestation") x.entry.sourceLocator.attestedHeadword = "ēcuā";
    expect(() => verify(x)).toThrow();
  });
  it.each(["noun-stem", "noun-neighbor-stem", "verb-frame", "model-frame", "model-decomposition", "model-neighbor-decomposition", "model-stem", "historical-only", "dependent-root"])('rejects unsupported dictionary evidence %s', change => {
    const x = fixture();
    if (change === "noun-stem") x.dictionary.pages[199].text = x.dictionary.pages[199].text.replace("ē-.", "ēuh-.");
    if (change === "noun-neighbor-stem") x.dictionary.pages[199].text = "ĒTL. tlat. No stem here.\nĒTLACUALLI. tlat. Neighbor. tlazal. ē-.";
    if (change === "verb-frame") x.dictionary.pages[141].text = x.dictionary.pages[141].text.replace("nic.", "ni.");
    if (change === "model-frame") x.dictionary.pages[196].text = x.dictionary.pages[196].text.replace("tlach4. ni.", "tlach4. nic.");
    if (change === "model-decomposition") x.dictionary.pages[335].text = x.dictionary.pages[335].text.replace("achi. NACATL, CUĀ.", "achi. ĀTL, CUĀ.");
    if (change === "model-neighbor-decomposition") x.dictionary.pages[335].text = "NACACUĀ. tlach4. ni. No decomposition here.\nNACACUAHQUĒTL. tlat. Neighbor. achi. NACATL, CUĀ.";
    if (change === "model-stem") x.dictionary.pages[196].text = x.dictionary.pages[196].text.replace("ēlō-.", "ē-.");
    if (change === "historical-only") x.dictionary.pages[335].text = x.dictionary.pages[335].text.replace("Selected food compound.", "Historical claim [Mc. 1].");
    if (change === "dependent-root") x.dictionary.pages[335].text = x.dictionary.pages[335].text.replace("Selected food compound.", "axcanah motequihuia icelti.");
    expect(() => verify(x)).toThrow();
  });
  it.each(["mechanism-missing", "variety-unspecified", "community-missing", "wrong-language", "dictionary-url", "dictionary-sha", "rule-url", "rule-sha", "audio", "false-direct-evidence", "other-meaning"])('rejects changed provenance or scope %s', change => {
    const x = fixture();
    if (change === "mechanism-missing") x.mechanism.pages[1].text = "No incorporation mechanism.";
    if (change === "variety-unspecified") x.mechanism.pages[0].text = x.mechanism.pages[0].text.replace("huasteca oriental", "other variety");
    if (change === "community-missing") x.mechanism.pages[0].text = x.mechanism.pages[0].text.replace("Tzocohuite", "Unknown");
    if (change === "wrong-language") x.mechanism.pages[0].text = x.mechanism.pages[0].text.replace("[nhe]", "[nci]");
    if (change === "dictionary-url") x.dictionary.reference_url = RULE_URL;
    if (change === "dictionary-sha") x.dictionary.source_sha256 = "a".repeat(64);
    if (change === "rule-url") x.mechanism.reference_url = DICTIONARY_URL;
    if (change === "rule-sha") x.mechanism.source_sha256 = "a".repeat(64);
    if (change === "audio") x.entry.audioUrl = "https://example.org/unattested.mp3";
    if (change === "false-direct-evidence") x.entry.verification.formEvidence = "directly-attested";
    if (change === "other-meaning") x.entry.meaningEn = "feed someone beans";
    expect(() => verify(x)).toThrow();
  });
});
