import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyAbstractNounReference, ABSTRACT_NOUN_REFERENCES, DICTIONARY_URL, DICTIONARY_SHA } = createRequire(import.meta.url)("../scripts/lib/abstract-noun-reference.js");
function fixture(display = "tlillotl") {
  const spec = ABSTRACT_NOUN_REFERENCES[display];
  const dictionary = { reference_url: DICTIONARY_URL, source_sha256: DICTIONARY_SHA,
    pages: Array.from({ length: 644 }, (_, i) => ({ pdf_page: i + 1, text: "" })) };
  dictionary.pages[557].text = "TLĪLLI. tlat. Selected noun. tlazal. tlīl-.\nTLĪLLOH. tlat. Neighbor.";
  dictionary.pages[499].text = "TLAHTŌLLI. tlat. Selected noun. tlazal. tlahtōl-.\nTLAHTŌLMĪLLI. tlat. Neighbor.";
  dictionary.pages[259].text = "IUCCILLI. tlat. Dependent model base. tlazal. iuccil-.\nIUCCILLŌTL. tlat. Model. achi. IUCCILLI, YŌTL.\nIUCCILLŌYOH. tlat. Neighbor.";
  dictionary.pages[629].text = "YŌTL. tlat. Modern nominalizer; lōtl. tlazal. yō-.\nYOX. tlaten. Neighbor.";
  const url = DICTIONARY_URL + "#page=" + spec.proof.base.pdfPage;
  const entry = { display, sourceSpelling: spec.sourceSpelling, meaningEn: spec.meaningEn, meaningEs: spec.meaningEs,
    partOfSpeech: "abstract noun reference", formKind: "rule-composed-reference-form", verification: { formEvidence: "independently-reviewed-rule-composition" },
    sourceUrl: url, audioUrl: null as string | null, audioKind: "missing", sourceLocator: { sourceType: "productive-abstract-noun-reference", sourceUrl: url,
      referencePdfPage: spec.proof.base.pdfPage, referenceHeadword: spec.proof.base.headword, referenceFileSha256: DICTIONARY_SHA,
      attestedHeadword: null as string | null, abstractNounProof: structuredClone(spec.proof) } };
  return { entry, dictionary };
}
const verify = (value: ReturnType<typeof fixture>) => verifyAbstractNounReference(value.entry, value.dictionary, DICTIONARY_SHA);
describe("two bounded abstract noun references", () => {
  it.each(["tlillotl", "tlahtollotl"])("accepts reviewed %s composition", display => expect(() => verify(fixture(display))).not.toThrow());
  it.each(["wrong-stem", "possessed-stem", "wrong-suffix", "history", "generic-generator", "whole-form", "phonology", "free-utterance", "possessive-paradigm", "audio"])("rejects unsupported %s scope", change => {
    const x = fixture(); const proof = x.entry.sourceLocator.abstractNounProof;
    if (change === "wrong-stem") proof.base.headword = "TLITL";
    if (change === "possessed-stem") proof.composition.baseStem = "tlīlo";
    if (change === "wrong-suffix") proof.composition.suffixRealization = "yōtl";
    if (change === "history") proof.lexicalizedHistorySenseApproved = true;
    if (change === "generic-generator") proof.genericAbstractNounGeneratorApproved = true;
    if (change === "whole-form") x.entry.sourceLocator.attestedHeadword = "TLĪLLŌTL";
    if (change === "phonology") proof.pronunciationCertificationClaimed = true;
    if (change === "free-utterance") proof.completeStandaloneUtteranceClaimed = true;
    if (change === "possessive-paradigm") proof.fullPossessiveParadigmApproved = true;
    if (change === "audio") x.entry.audioUrl = "https://example.com/other-word.mp3";
    expect(() => verify(x)).toThrow();
  });
  it.each(["base-neighbor-stem", "model-neighbor-decomposition", "missing-allomorph", "historical-base", "historical-model", "wrong-source", "wrong-hash", "different-meaning", "dependent-base"])("rejects invalid %s evidence", change => {
    const x = fixture();
    if (change === "base-neighbor-stem") x.dictionary.pages[557].text = "TLĪLLI. tlat. No stem.\nTLĪLLOH. tlat. Neighbor. tlazal. tlīl-.";
    if (change === "model-neighbor-decomposition") x.dictionary.pages[259].text = x.dictionary.pages[259].text.replace("Model. achi. IUCCILLI, YŌTL.", "Model.").replace("Neighbor.", "Neighbor. achi. IUCCILLI, YŌTL.");
    if (change === "missing-allomorph") x.dictionary.pages[629].text = x.dictionary.pages[629].text.replace("lōtl", "chōtl");
    if (change === "historical-base") x.dictionary.pages[557].text = x.dictionary.pages[557].text.replace("Selected noun.", "Historical [Mc. 1].");
    if (change === "historical-model") x.dictionary.pages[259].text = x.dictionary.pages[259].text.replace("Model.", "Historical [K. 3].");
    if (change === "wrong-source") x.dictionary.reference_url = "https://example.com/other.pdf";
    if (change === "wrong-hash") x.dictionary.source_sha256 = "0".repeat(64);
    if (change === "different-meaning") x.entry.meaningEn = "historical narrative";
    if (change === "dependent-base") x.dictionary.pages[557].text = x.dictionary.pages[557].text.replace("Selected noun.", "axcanah motequihuia icelti.");
    expect(() => verify(x)).toThrow();
  });
});
