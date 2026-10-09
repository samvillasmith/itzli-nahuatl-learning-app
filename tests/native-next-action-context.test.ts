import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { verifyNativeNextActionContext, SOURCE_URL, SOURCE_PDF_SHA256, SOURCE_PAGES_SHA256 } = createRequire(import.meta.url)("../scripts/lib/native-next-action-context.js");
const dictionaryUrl = "https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=211";

function fixture() {
  const proof = {
    sourceUrl: SOURCE_URL, referenceFileSha256: SOURCE_PDF_SHA256, extractedPagesSha256: SOURCE_PAGES_SHA256,
    nativeSpeaker: "Erasmo Montiel Pascual", nativeCommunity: "Alahualtitla, Chicontepec, Veracruz", speakerProvenancePdfPage: 2,
    actualNahuatlPdfPage: 8, printedNahuatlPage: 152, exactToken: "wankinon", exactTokenStart: 2869,
    pairedSpanishPdfPage: 3, printedSpanishPage: 147, alignedSpanishToken: "entonces", alignedSpanishTokenStart: 2657,
    selectedFunction: "temporal-next-action-connector",
    contextualRoles: { precedingContext: "described situation affecting plants", followingContext: "next action to take in response" },
    sourceProseOrSentenceReproduced: false, recordingAcquiredOrFollowed: false,
    generalAfterXConstructionApproved: false, universalStrictChronologyApproved: false
  };
  const entry = {
    display: "wankinon", sourceSpelling: "huānquinōn", sourceUrl: dictionaryUrl,
    sourceLocator: { referenceHeadword: "HUĀNQUINŌN", referencePdfPage: 211, referenceFileSha256: "bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc" },
    meaningEn: "then; at that time; then for the next step", meaningEs: "entonces; en ese momento; entonces para el siguiente paso",
    audioUrl: null as string | null, audioKind: "missing"
  };
  const review = {
    decision: "approved-specified-fact", targetSenseAgreement: true, targetItemId: "private-target-3d2637f4ad724262",
    originalFinding: {
      supplementalPrimaryContextProof: proof, allIntendedSensesResolvedClaimed: false,
      perSenseCoverage: {
        allIntendedMeaningsResolved: false, newInflectionOrSourceFrameApproved: false, sourceRestrictionsPreserved: true,
        supported: [{ meaningEn: "then for the next step", sourceUrl: SOURCE_URL + "#page=8" }],
        held: [{ meaningEn: "unrestricted strict afterward or after X", countAsResolvedMeaning: false, status: "not-independently-approved" }]
      }
    }
  };
  const pages = { sourceUrl: SOURCE_URL, sourceSha256: SOURCE_PDF_SHA256, publicationYear: 2021, pageCount: 12, pages: [
    { pdf_page: 2, text: "Erasmo Montiel Pascual; Alahualtitla; Chicontepec" },
    { pdf_page: 3, text: " ".repeat(2657) + "entonces" },
    { pdf_page: 8, text: " ".repeat(2869) + "wankinon" }
  ] };
  return { entry, review, pages, pagesHash: SOURCE_PAGES_SHA256, pdfHash: SOURCE_PDF_SHA256 };
}

const verify = (f: ReturnType<typeof fixture>) => verifyNativeNextActionContext(f.entry, f.review, f.pages, f.pagesHash, f.pdfHash);

describe("individually reviewed native temporal-connector context", () => {
  it("accepts the exact checked tuple with its broader meaning still withheld", () => expect(() => verify(fixture())).not.toThrow());
  it.each(["pdf bytes", "page extraction", "source URL", "wrong token offset", "wrong translation offset", "lost speaker provenance", "another headword", "invented spoken audio", "free after construction", "strict chronology", "copied narrative", "no remaining hold", "counting held sense", "complete meaning claim", "wrong target identity", "new grammatical frame"])("rejects %s", change => {
    const f = fixture();
    const proof = f.review.originalFinding.supplementalPrimaryContextProof;
    const coverage = f.review.originalFinding.perSenseCoverage;
    if (change === "pdf bytes") f.pdfHash = "0".repeat(64);
    if (change === "page extraction") f.pagesHash = "0".repeat(64);
    if (change === "source URL") proof.sourceUrl = "https://example.com/other.pdf";
    if (change === "wrong token offset") proof.exactTokenStart += 1;
    if (change === "wrong translation offset") proof.alignedSpanishTokenStart += 1;
    if (change === "lost speaker provenance") f.pages.pages[0].text = "Different region and speaker";
    if (change === "another headword") f.entry.sourceLocator.referenceHeadword = "HUĀN1";
    if (change === "invented spoken audio") f.entry.audioUrl = "https://example.com/unreviewed.mp3";
    if (change === "free after construction") proof.generalAfterXConstructionApproved = true;
    if (change === "strict chronology") proof.universalStrictChronologyApproved = true;
    if (change === "copied narrative") proof.sourceProseOrSentenceReproduced = true;
    if (change === "no remaining hold") coverage.held = [];
    if (change === "counting held sense") coverage.held[0].countAsResolvedMeaning = true;
    if (change === "complete meaning claim") coverage.allIntendedMeaningsResolved = true;
    if (change === "wrong target identity") f.review.targetItemId = "another-target";
    if (change === "new grammatical frame") coverage.newInflectionOrSourceFrameApproved = true;
    expect(() => verify(f)).toThrow();
  });
  it("does not use matching word text to approve mismatched source metadata", () => {
    const f = fixture(); f.pages.sourceSha256 = "0".repeat(64);
    expect(() => verify(f)).toThrow();
  });
  it("rejects a target meaning broader than the independently bounded next-step use", () => {
    const f = fixture(); f.entry.meaningEn = "after anything, always later";
    expect(() => verify(f)).toThrow();
  });
});
