import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyIndexedCarryingReference, INDEXED_CARRYING_PROOF, INDEX_URL, INDEX_SHA } = createRequire(import.meta.url)("../scripts/lib/indexed-carrying-reference.js");
function fixture() {
  const html = '<p>Paleografía: quisasaca Grafía normalizada: zazaca Prefijo: qui Tipo: v. t. Traducción uno: acarrear Traducción dos: acarrear Diccionario: Mecayapan Fuente: 2002 Mecayapan</p><h3>Entradas</h3><p>historical parallels excluded</p>';
  const entry = { display: "sasaka", sourceSpelling: "sasaca", sourceUrl: INDEX_URL, meaningEn: "carry or transport (Mecayapan verb reference)", meaningEs: "acarrear o transportar (referencia verbal de Mecayapan)", partOfSpeech: "verb reference", formKind: "source-extracted-reference-form", audioUrl: null as string | null, audioKind: "missing", sourceLocator: { sourceType: "individual-modern-indexed-verb-reference", sourceUrl: INDEX_URL, referenceFileSha256: INDEX_SHA, referenceHeadword: "quisasaca", attestedHeadword: null as string | null, indexedVerbReferenceProof: structuredClone(INDEXED_CARRYING_PROOF) } };
  return { entry, html };
}
const verify = (x: ReturnType<typeof fixture>, hash = INDEX_SHA) => verifyIndexedCarryingReference(x.entry, x.html, hash);
describe("exact modern selected indexed carrying reference", () => {
  it("accepts the unchanged explicitly prefixed lexical reference", () => expect(() => verify(fixture())).not.toThrow());
  it.each(["historical-meaning", "multiple-origins", "eastern-certified", "free-utterance", "prefix-generator", "reduplication-generator", "pronunciation", "whole-root-attestation", "source-audio"])("rejects invented %s claims", change => {
    const x = fixture(); const p = x.entry.sourceLocator.indexedVerbReferenceProof;
    if (change === "historical-meaning") p.historicalParallelMeaningsUsed = true;
    if (change === "multiple-origins") p.modernMultipleOriginSenseApproved = true;
    if (change === "eastern-certified") p.EasternCommunityUsageCertified = true;
    if (change === "free-utterance") p.freeStandaloneUtteranceClaimed = true;
    if (change === "prefix-generator") p.genericPrefixRemovalGeneratorApproved = true;
    if (change === "reduplication-generator") p.reduplicationGeneratorApproved = true;
    if (change === "pronunciation") p.pronunciationCertificationClaimed = true;
    if (change === "whole-root-attestation") x.entry.sourceLocator.attestedHeadword = "sasaca";
    if (change === "source-audio") x.entry.audioUrl = "https://example.com/wrong.mp3";
    expect(() => verify(x)).toThrow();
  });
  it.each(["wrong-dictionary", "historical-selected-year", "unlabeled-prefix", "neighbor-prefix", "neighbor-meaning", "changed-stem", "wrong-file-hash"])("rejects invalid %s provenance", change => {
    const x = fixture();
    if (change === "wrong-dictionary") x.html = x.html.replaceAll("Mecayapan", "Molina");
    if (change === "historical-selected-year") x.html = x.html.replace("2002", "1571");
    if (change === "unlabeled-prefix") x.html = x.html.replace("Prefijo: qui", "No prefix");
    if (change === "neighbor-prefix") x.html = x.html.replace("Prefijo: qui", "No prefix").replace("historical parallels excluded", "Prefijo: qui");
    if (change === "neighbor-meaning") x.html = x.html.replaceAll("acarrear", "different").replace("historical parallels excluded", "Traducción uno: acarrear Traducción dos: acarrear Diccionario: Mecayapan Fuente: 2002 Mecayapan");
    if (change === "changed-stem") x.entry.sourceSpelling = "sahsaca";
    expect(() => verify(x, change === "wrong-file-hash" ? "0".repeat(64) : INDEX_SHA)).toThrow();
  });
});
