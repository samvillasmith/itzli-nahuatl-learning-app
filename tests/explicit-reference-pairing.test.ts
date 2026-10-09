import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import lexicon from "../src/data/v3-verified-lexicon.json";
const { countReviewedReferenceAliases } = createRequire(import.meta.url)("../scripts/lib/reference-aliases.js");
const cases = [
  { alias: "yahwantin", page: 36, hash: "8d703c918c35c577ad85a0b1bcb9bc38c944bfd3e748d19553342afe02da25fe", meaning: "they",
    flags: ["genericHInsertionOrRemovalClaimed", "genericVowelRewriteClaimed", "genericPronounStemSubstitutionClaimed", "ocrCorrectionClaimed", "identicalPronunciationClaimed", "interchangeableSpokenUseClaimed", "sourceAudioSupportsAlias"] },
  { alias: "kewkinin", page: 51, hash: "8c8a94fb0ea665bb797ed7932200f947234bf0d1b6dc58a78a570161f8ef9eb7", meaning: "like this",
    flags: ["genericStemContractionClaimed", "genericKeniwkiToKewRuleClaimed", "genericHInsertionOrRemovalClaimed", "genericVowelRewriteClaimed", "ocrCorrectionClaimed", "identicalPronunciationClaimed", "interchangeableSpokenUseClaimed", "sourceAudioSupportsAlias"] },
  { alias: "itlan", page: 64, hash: "c3e70cf8e5e4c41ac04b50d679afcf2451cc76bd8791c4345bd3e96f8a8623d3", meaning: "conditional if",
    flags: ["genericIInsertionOrRemovalClaimed", "genericPossessedConditionalDerivationClaimed", "ocrCorrectionClaimed", "identicalPronunciationClaimed", "interchangeableSpokenUseClaimed", "sourceAudioSupportsAlias"] },
  { alias: "amo tlen", page: 48, hash: "1c2436be62a6d38d851eea43352d9d8d0978e07a91dae2cfadb9106c397aa00d", meaning: "nothing",
    flags: ["generalAmoAxSubstitutionClaimed", "generalNegativeIndefiniteGeneratorClaimed", "identicalPronunciationClaimed", "interchangeableSpokenUseClaimed", "sourceAudioSupportsAlias", "sourceTableOrExamplesCopied"] },
];
function fixture(spec: typeof cases[number]) {
  const source = lexicon.entries.find(entry => entry.referenceAliases?.includes(spec.alias))!;
  expect(source).toBeDefined();
  const entry = structuredClone(source);
  const photo = { exactFactualNotation: spec.alias, explicitlyPairedCanonicalNotation: source.display,
    selectedMeaning: spec.meaning, printedPage: spec.page, photoSha256: spec.hash,
    separateDistalColumnExcluded: true, pairingKind: spec.alias === "kewkinin"
      ? "same-column-synonym-table-with-explicit-synonym-introduction" : "parallel-row-in-explicit-negative-word-comparison" };
  const correspondence: Record<string, unknown> = { publicSourceLocator: source.sourceLocator,
    additionalLexicalWordClaimed: false, privatePhotographedFactualNotation: [photo], sameIntendedReferentVerified: true,
    explicitPhotographedConditionalAlternativeVerified: true, sameNegativeReferentVerified: true,
    explicitPhotographedParallelNegativeComparisonVerified: true, ...Object.fromEntries(spec.flags.map(flag => [flag, false])) };
  const proof = { kind: "individually-reviewed-book-notation-correspondence", alias: spec.alias,
    canonicalDisplay: source.display, exactSourceSpelling: source.sourceSpelling, targetSenseAgreement: true,
    targetItemId: "private-target-" + createHash("sha256").update(`historical-1228|${spec.alias}`).digest("hex").slice(0, 16), correspondence };
  return { correspondence, photo, entry, run: () => countReviewedReferenceAliases([entry],
    new Map([[source.id, { originalFinding: { referenceAliases: [proof] } }]]), new Set([spec.alias]),
    { forms: [{ source_form_key: spec.alias, inali_retrieval_key: spec.alias, current_app_candidates: [] }] }, (s: string) => s) };
}
describe("explicit alternative-reference correspondence", () => {
  it.each(cases)("covers the one $alias inventory slot without adding a word", spec => {
    expect([...fixture(spec).run().present]).toEqual([spec.alias]);
  });
  it.each(cases)("rejects general grammar/phonetic certification for $alias", spec => {
    const value = fixture(spec); value.correspondence[spec.flags[0]] = true;
    expect(value.run).toThrow();
    value.correspondence[spec.flags[0]] = false;
    value.photo.explicitlyPairedCanonicalNotation = "unrelated";
    expect(value.run).toThrow();
  });
  it("does not let a canonical recording certify an alternative pronoun recording", () => {
    const value = fixture(cases[0]); value.correspondence.sourceAudioSupportsAlias = true;
    expect(value.run).toThrow();
  });
});
