import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyHumanFeedingForm, HUMAN_FEEDING_PROOF, DICTIONARY_URL, DICTIONARY_SHA, NATIVE_URL, NATIVE_SHA, RULE_URL, RULE_SHA, COURSE_SHA } = createRequire(import.meta.url)("../scripts/lib/human-feeding-form-proof.js");
function fixture() {
  const dictionary = { reference_url: DICTIONARY_URL, source_sha256: DICTIONARY_SHA, pages: [{ pdf_page: 157, text: "CUALTIĀ. tlach3. nic. Human makes ceyoc zo ce tlapiyalli eat. achi. CUĀ, LTIĀ.\nNEXT. tlat. Neighbor." }, { pdf_page: 488, text: "TLACUĀ. tlach4. ni. Eat. achi. TLA1, CUĀ.\nNEXT. tlat. Neighbor." }] };
  const native = { reference_url: NATIVE_URL, source_sha256: NATIVE_SHA, pages: [{ pdf_page: 3, text: "Tzocohuite [nhe]" }, { pdf_page: 4, text: "antipasivo intransitiva nitlakwa" }] };
  const causativeHtml = `<link href="${RULE_URL}"><h5>Nawatl de Orizaba;9.1 Causativos</h5><p>-ltia; sujeto de la raíz verbal queda como objeto directo.</p>`;
  const course = { lessons: [{ number: 6, sections: [{}, { body: ["", "ni – (verbal base) – ø"] }] }, { number: 13, sections: [{}, {}, { body: Array.from({ length: 19 }, (_, i) => i === 2 ? '/mītz/ “to you”' : i === 10 ? "Ni – qui – (base verbal) – ø" : i === 18 ? "ø – Mitz – (base verbal) – ø" : "") }] }] };
  const url = DICTIONARY_URL + "#page=157";
  const entry = { display: "nimitstlakwaltia", sourceSpelling: "nimitztlacualtiā", meaningEn: "I make you eat; I feed you (modeled form)", meaningEs: "te hago comer; te alimento (forma modelada)", partOfSpeech: "verb", formKind: "rule-composed-verb-form", sourceUrl: url, audioUrl: null as string | null, audioKind: "missing", verification: { formEvidence: "qualified-reviewed-rule-composition" }, sourceLocator: { sourceType: "productive-human-feeding-form", sourceUrl: url, attestedHeadword: null as string | null, referencePdfPage: 157, referenceHeadword: "CUALTIĀ", referenceFileSha256: DICTIONARY_SHA, humanFeedingProof: structuredClone(HUMAN_FEEDING_PROOF) } };
  return { entry, dictionary, native, causativeHtml, course };
}
const verify = (x: ReturnType<typeof fixture>, dh = DICTIONARY_SHA, nh = NATIVE_SHA, rh = RULE_SHA, ch = COURSE_SHA) => verifyHumanFeedingForm(x.entry, x.dictionary, dh, x.native, nh, x.causativeHtml, rh, x.course, ch);
describe("one human-causee feeding composition", () => {
  it("accepts separately proved lexical causative, eating valency and person roles", () => expect(() => verify(fixture())).not.toThrow());
  it.each(["ritual-transfer", "whole-form", "generic-causative", "allomorph", "paradigm", "pronunciation", "food-as-causee", "named-food", "wrong-person", "source-audio"])("rejects unreviewed %s claims", change => {
    const x = fixture(); const p = x.entry.sourceLocator.humanFeedingProof;
    if (change === "ritual-transfer") p.religiousOfferingSenseTransferredToHumanFeeding = true;
    if (change === "whole-form") x.entry.sourceLocator.attestedHeadword = "nimitztlacualtiā";
    if (change === "generic-causative") p.unrestrictedCausativeGeneratorApproved = true;
    if (change === "allomorph") p.arbitraryAllomorphApproved = true;
    if (change === "paradigm") p.targetVerbClassOrParadigmCertified = true;
    if (change === "pronunciation") p.pronunciationCertificationClaimed = true;
    if (change === "food-as-causee") p.composition.humanCauseePrefix = "tla";
    if (change === "named-food") p.composition.explicitFoodObjectNamed = true;
    if (change === "wrong-person") p.composition.subjectPrefix = "ti";
    if (change === "source-audio") x.entry.audioUrl = "https://example.com/other.mp3";
    expect(() => verify(x)).toThrow();
  });
  it.each(["causal-neighbor", "eating-transitive", "historical-cause", "missing-native-antipassive", "missing-promotion", "wrong-mitz", "wrong-word-order", "dictionary-hash", "native-hash", "causative-hash", "course-hash"])("rejects invalid %s evidence", change => {
    const x = fixture();
    if (change === "causal-neighbor") x.dictionary.pages[0].text = "CUALTIĀ. tlach3. nic. Human ceyoc zo ce tlapiyalli.\nNEXT. tlat. achi. CUĀ, LTIĀ.";
    if (change === "eating-transitive") x.dictionary.pages[1].text = x.dictionary.pages[1].text.replace("tlach4. ni.", "tlach4. nic.");
    if (change === "historical-cause") x.dictionary.pages[0].text = x.dictionary.pages[0].text.replace("Human", "[Mc. 1] Human");
    if (change === "missing-native-antipassive") x.native.pages[1].text = "nitlakwa";
    if (change === "missing-promotion") x.causativeHtml = x.causativeHtml.replace("sujeto de la raíz verbal queda como objeto directo", "different mechanism");
    if (change === "wrong-mitz") x.course.lessons[1].sections[2].body![2] = '/mēch/ “to you plural”';
    if (change === "wrong-word-order") x.course.lessons[1].sections[2].body![10] = "qui – Ni – (base verbal) – ø";
    expect(() => verify(x, change === "dictionary-hash" ? "0".repeat(64) : DICTIONARY_SHA, change === "native-hash" ? "0".repeat(64) : NATIVE_SHA, change === "causative-hash" ? "0".repeat(64) : RULE_SHA, change === "course-hash" ? "0".repeat(64) : COURSE_SHA)).toThrow();
  });
});
