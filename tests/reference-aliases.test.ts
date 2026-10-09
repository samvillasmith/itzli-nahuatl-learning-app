import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
const { countReviewedReferenceAliases } = createRequire(import.meta.url)("../scripts/lib/reference-aliases.js");
function fixture() {
  const entry = { id: "stem", display: "base", referenceAliases: ["-base"], sourceLocator: {
    sourceType: "individual-reference-stem", referenceStem: "-base", referenceHeadword: "HEAD", referencePdfPage: 16 } };
  const id = "private-target-" + createHash("sha256").update("historical-1228|-base").digest("hex").slice(0, 16);
  const review = { originalFinding: { referenceAliases: [{ alias: "-base", targetItemId: id, targetSenseAgreement: true,
    exactPrintedMetadata: "-base", referenceHeadword: "HEAD", referencePdfPage: 16 }] } };
  return { entries: [entry], reviews: new Map([["stem", review]]), keys: new Set(["base", "-base"]),
    concordance: { forms: [{ source_form_key: "-base", inali_retrieval_key: "-base", current_app_candidates: [] }] } };
}
const verify = (value: ReturnType<typeof fixture>) => countReviewedReferenceAliases(value.entries, value.reviews, value.keys, value.concordance, (text: string) => text.toLowerCase());
describe("bound notation aliases", () => {
  it("covers the documented inventory notation without adding a vocabulary record", () => {
    const value = fixture(), result = verify(value);
    expect([...result.present]).toEqual(["-base"]);
    expect([...result.senseSupported]).toEqual(["-base"]);
    expect(value.entries).toHaveLength(1);
  });
  it("rejects arbitrary spelling aliases and duplicate display counting", () => {
    const arbitrary = fixture(); arbitrary.entries[0].referenceAliases = ["other"];
    expect(() => verify(arbitrary)).toThrow();
    const duplicate = fixture(); duplicate.entries.push({ ...duplicate.entries[0], id: "extra", display: "-base", referenceAliases: [] });
    expect(() => verify(duplicate)).toThrow("double-count");
  });
  it("rejects an alias that was never an original inventory item", () => {
    const value = fixture(); value.keys.delete("-base");
    expect(() => verify(value)).toThrow("existing inventory item");
  });
});

function notationFixture() {
  const alias = "san kwalli", sourceLocator = { sourceType: "individual-reference-fact", sourceUrl: "https://example.test/reference#page=635",
    referencePdfPage: 635, referenceHeadword: "ZANCUALLI", referenceFileSha256: "source-hash" };
  const entry = { id: "fit", display: "sankwalli", sourceSpelling: "zancualli", sourceLocator, referenceAliases: [alias] };
  const evidence = { kind: "individually-reviewed-book-notation-correspondence", alias, canonicalDisplay: entry.display,
    exactSourceSpelling: entry.sourceSpelling, targetSenseAgreement: true,
    targetItemId: "private-target-" + createHash("sha256").update(`historical-1228|${alias}`).digest("hex").slice(0, 16),
    correspondence: { publicSourceLocator: sourceLocator, additionalLexicalWordClaimed: false, sourceSpacedQuotationClaimed: false,
      generalSpaceDeletionRuleClaimed: false, privatePhotographedFactualNotation: { printedPage: 139,
        photoSha256: "d04d93161ff404a62f0ce01419a751afb80fd4f5c9d03d9e0a0a941fa7385468", exactFactualNotation: alias, explicitOneWordNotationAllowed: true } } };
  const review = { originalFinding: { referenceAliases: [evidence] } };
  return { entries: [entry], reviews: new Map([[entry.id, review]]), keys: new Set([alias]),
    concordance: { forms: [{ source_form_key: alias, inali_retrieval_key: alias, current_app_candidates: [] }] }, evidence };
}
const verifyNotation = (value: ReturnType<typeof notationFixture>) => countReviewedReferenceAliases(value.entries, value.reviews,
  value.keys, value.concordance, (text: string) => text.toLowerCase());
describe("individual compound notation correspondence", () => {
  it("covers one target notation using one independent canonical form", () => {
    const value = notationFixture(), result = verifyNotation(value);
    expect([...result.present]).toEqual(["san kwalli"]);
    expect([...result.senseSupported]).toEqual(["san kwalli"]);
    expect(value.entries).toHaveLength(1);
  });
  it("does not certify an identical pronunciation or generalized spacing rule", () => {
    const value = notationFixture(); value.evidence.correspondence.generalSpaceDeletionRuleClaimed = true;
    expect(() => verifyNotation(value)).toThrow();
    value.evidence.correspondence.generalSpaceDeletionRuleClaimed = false;
    value.evidence.correspondence.sourceSpacedQuotationClaimed = true;
    expect(() => verifyNotation(value)).toThrow();
  });
  it("rejects unrelated aliases, absent factual notation and a different source locator", () => {
    const unrelated = notationFixture(); unrelated.entries[0].referenceAliases = ["san other"];
    expect(() => verifyNotation(unrelated)).toThrow("Unreviewed notation");
    const missing = notationFixture(); missing.evidence.correspondence.privatePhotographedFactualNotation.explicitOneWordNotationAllowed = false;
    expect(() => verifyNotation(missing)).toThrow();
    const source = notationFixture(); source.evidence.correspondence.publicSourceLocator = { ...source.entries[0].sourceLocator, referencePdfPage: 636 };
    expect(() => verifyNotation(source)).toThrow();
  });
});

describe("specified negative reference notations", () => {
  const cases = [["axikah", "axika", "Axica"], ["ayikana", "ayikanah", "ayicanah"],
    ["ayokkana", "ayokkanah", "ayoccanah"]];
  function negativeFixture([alias, display, sourceSpelling]: string[]) {
    const sourceLocator = { sourceType: "individual-reference-fact", sourceUrl: "https://example.test/negative" };
    const entry = { id: display, display, sourceSpelling, sourceLocator, referenceAliases: [alias] };
    const proof = { kind: "individually-reviewed-book-notation-correspondence", alias, canonicalDisplay: display,
      exactSourceSpelling: sourceSpelling, targetSenseAgreement: true,
      targetItemId: "private-target-" + createHash("sha256").update(`historical-1228|${alias}`).digest("hex").slice(0, 16),
      correspondence: { publicSourceLocator: sourceLocator, additionalLexicalWordClaimed: false,
        identicalPronunciationClaimed: false, generalFinalHDeletionRuleClaimed: false, generalFinalHInsertionRuleClaimed: false,
        privatePhotographedFactualNotation: [{ exactFactualNotation: alias, printedPage: 48,
          photoSha256: "1c2436be62a6d38d851eea43352d9d8d0978e07a91dae2cfadb9106c397aa00d" },
          { exactFactualNotation: display, printedPage: 223,
            photoSha256: "72d2b8e78054d60805dcc1a49afdec6e5048c02a46e291a37dd882e83448ba19" }] } };
    return { entry, proof, run: () => countReviewedReferenceAliases([entry],
      new Map([[entry.id, { originalFinding: { referenceAliases: [proof] } }]]), new Set([alias]),
      { forms: [{ source_form_key: alias, inali_retrieval_key: alias, current_app_candidates: [] }] }, (s: string) => s) };
  }
  it.each(cases)("covers only the individually reviewed %s notation", (...parts) => {
    const value = negativeFixture(parts), result = value.run();
    expect([...result.present]).toEqual([parts[0]]);
    expect([...result.senseSupported]).toEqual([parts[0]]);
    value.proof.correspondence.generalFinalHDeletionRuleClaimed = true;
    expect(value.run).toThrow();
  });
  it("rejects unsupported final-h changes and mismatched photographic facts", () => {
    const value = negativeFixture(cases[0]);
    value.proof.correspondence.privatePhotographedFactualNotation[1].exactFactualNotation = "other";
    expect(value.run).toThrow();
    const arbitrary = negativeFixture(["otherh", "other", "other"]);
    expect(arbitrary.run).toThrow("Unreviewed notation");
  });
});

function pastTimeFixture() {
  const alias = 'yewawkaw';
  const locator = { sourceType: 'individual-reference-fact', sourceUrl: 'https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=625', referencePdfPage: 625, referenceHeadword: 'YĒHUAUHCĀN' };
  const entry = { id: 'past-time', display: 'yewawkan', sourceSpelling: 'yēhuauhcān', sourceLocator: locator, referenceAliases: [alias] };
  const evidence = { kind: 'individually-reviewed-book-notation-correspondence', alias, canonicalDisplay: entry.display, exactSourceSpelling: entry.sourceSpelling, targetSenseAgreement: true,
    targetItemId: 'private-target-' + createHash('sha256').update('historical-1228|' + alias).digest('hex').slice(0, 16),
    correspondence: { publicSourceLocator: { ...locator }, additionalLexicalWordClaimed: false, identicalPronunciationClaimed: false, interchangeableSpokenUseClaimed: false,
      generalFinalNToWRuleClaimed: false, generalFinalWToNRuleClaimed: false,
      privatePhotographedFactualNotation: [{ printedPage: 241, exactFactualNotation: alias, photoSha256: 'a2eb6f97a77a5943403133577831f789ed29938bc0b11b6820da55d9f3fae332' }] } };
  return { entry, evidence, run: () => countReviewedReferenceAliases([entry], new Map([[entry.id, { originalFinding: { referenceAliases: [evidence] } }]]), new Set([alias]),
    { forms: [{ source_form_key: alias, inali_retrieval_key: alias, current_app_candidates: [] }] }, (text: string) => text.toLowerCase()) };
}
describe('one reviewed past-time notation', () => {
  it('counts one reference slot while retaining one canonical vocabulary form', () => {
    expect([...pastTimeFixture().run().present]).toEqual(['yewawkaw']);
  });
  it('rejects pronunciation generalization and a mismatched primary head', () => {
    const spoken = pastTimeFixture(); spoken.evidence.correspondence.interchangeableSpokenUseClaimed = true;
    expect(spoken.run).toThrow();
    const source = pastTimeFixture(); source.evidence.correspondence.publicSourceLocator.referenceHeadword = 'OTHER';
    expect(source.run).toThrow();
  });
});
