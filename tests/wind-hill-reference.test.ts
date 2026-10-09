import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyWindHillReference, WIND_HILL_PROOF, DICTIONARY_URL, DICTIONARY_SHA, RULE_URL, RULE_SHA } = createRequire(import.meta.url)("../scripts/lib/wind-hill-reference.js");
function fixture() {
  const dictionary = { reference_url: DICTIONARY_URL, source_sha256: DICTIONARY_SHA, pages: Array.from({ length: 644 }, (_, i) => ({ pdf_page: i + 1, text: "" })) };
  dictionary.pages[193].text = "EHĒCATL. tlat. Selected noun. tlazal. ehēca-.\nEHĒCAYOH. tlat. Neighbor.";
  dictionary.pages[455].text = "TEPĒTL. tlat. Selected head. tlazal. tepē-.";
  const ruleHtml = `<link href="${RULE_URL}"><title>Nawatl de Orizaba</title><h5>10.1 Raíces compuestas sustantivas</h5><p>S 1 + S 2 = S; absolutivos; segunda raíz componente.</p>`;
  const sourceUrl = DICTIONARY_URL + "#page=194";
  const entry = { display: "ehekatepetl", sourceSpelling: "ehēcatepētl", meaningEn: "wind hill (modeled noun)", meaningEs: "cerro del viento (sustantivo modelado)", partOfSpeech: "noun reference", formKind: "rule-composed-reference-form", sourceUrl,
    audioUrl: null as string | null, audioKind: "missing", verification: { formEvidence: "qualified-reviewed-rule-composition" }, sourceLocator: { sourceType: "productive-wind-hill-reference", attestedHeadword: null as string | null, referenceFileSha256: DICTIONARY_SHA, referenceHeadword: "EHĒCATL", referencePdfPage: 194, sourceUrl, windHillProof: structuredClone(WIND_HILL_PROOF) } };
  return { entry, dictionary, ruleHtml };
}
const verify = (x: ReturnType<typeof fixture>, dictionaryHash = DICTIONARY_SHA, ruleHash = RULE_SHA) => verifyWindHillReference(x.entry, x.dictionary, dictionaryHash, x.ruleHtml, ruleHash);
describe("one stem-preserving wind-hill reference", () => {
  it("accepts only the full modern wind stem and nominal hill head", () => expect(() => verify(fixture())).not.toThrow());
  it.each(["shortened-stem", "named-hill", "locative-substitution", "generic-generator", "phonology", "full-possession", "free-utterance", "direct-attestation", "different-display", "audio"])("rejects unsupported %s", change => {
    const x = fixture(), p = x.entry.sourceLocator.windHillProof;
    if (change === "shortened-stem") p.composition.firstCombiningStem = "ēca";
    if (change === "named-hill") p.exactNamedGeographicalHillClaimed = true;
    if (change === "locative-substitution") p.locativeEkatepekEquivalenceClaimed = true;
    if (change === "generic-generator") p.unrestrictedGeneratorApproved = true;
    if (change === "phonology") p.pronunciationCertificationClaimed = true;
    if (change === "full-possession") p.fullPossessiveParadigmApproved = true;
    if (change === "free-utterance") p.completeStandaloneUtteranceClaimed = true;
    if (change === "direct-attestation") x.entry.sourceLocator.attestedHeadword = "EHĒCATEPĒTL";
    if (change === "different-display") x.entry.display = "ekatepetl";
    if (change === "audio") x.entry.audioUrl = "https://example.com/wind-only.mp3";
    expect(() => verify(x)).toThrow();
  });
  it.each(["neighbor-stem", "historical-head", "dependent-head", "missing-head", "missing-mechanism", "wrong-rule-url", "source-hash", "rule-hash"])("rejects invalid %s evidence", change => {
    const x = fixture();
    if (change === "neighbor-stem") x.dictionary.pages[193].text = "EHĒCATL. tlat. No stem.\nEHĒCAYOH. tlat. Neighbor. tlazal. ehēca-.";
    if (change === "historical-head") x.dictionary.pages[455].text = x.dictionary.pages[455].text.replace("Selected head.", "Historical [K. 1].");
    if (change === "dependent-head") x.dictionary.pages[455].text = x.dictionary.pages[455].text.replace("Selected head.", "axcanah motequihuia icelti.");
    if (change === "missing-head") x.dictionary.pages[455].text = "OTHER. tlat. Another word.";
    if (change === "missing-mechanism") x.ruleHtml = x.ruleHtml.replace("segunda raíz componente", "unrelated");
    if (change === "wrong-rule-url") x.ruleHtml = x.ruleHtml.replace(RULE_URL, "https://example.com/unrelated");
    expect(() => verify(x, change === "source-hash" ? "0".repeat(64) : DICTIONARY_SHA, change === "rule-hash" ? "0".repeat(64) : RULE_SHA)).toThrow();
  });
});
