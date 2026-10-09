const assert = require('node:assert/strict');

const SOURCE_URL = 'https://revistas.inah.gob.mx/index.php/narrativasantropologicas/article/download/16546/17581/34512';
const SOURCE_PDF_SHA256 = '2f462de1ddb976d22bafd84fe733ec4118c452c8422ff4f881e3a354b085c07c';
const SOURCE_PAGES_SHA256 = '63494c7f967cfbaf99cc366b88e23cc71cdeefb3882c90faf36624b97e9f2009';
const DICTIONARY_URL = 'https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf#page=211';
const DICTIONARY_SHA256 = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';

// One reviewed native context supplements a specified dictionary fact. These
// checks never turn an occurrence into a general temporal or morphology rule.
function verifyNativeNextActionContext(entry, review, pages, actualPagesSha256, actualPdfSha256) {
  const proof = review.originalFinding?.supplementalPrimaryContextProof;
  assert.ok(proof, 'Missing individually reviewed native context');
  assert.equal(entry.display, 'wankinon');
  assert.equal(entry.sourceSpelling, 'huānquinōn');
  assert.equal(entry.sourceUrl, DICTIONARY_URL);
  assert.equal(entry.sourceLocator.referenceHeadword, 'HUĀNQUINŌN');
  assert.equal(entry.sourceLocator.referencePdfPage, 211);
  assert.equal(entry.sourceLocator.referenceFileSha256, DICTIONARY_SHA256);
  assert.equal(review.decision, 'approved-specified-fact');
  assert.equal(review.targetSenseAgreement, true);
  assert.equal(review.targetItemId, 'private-target-3d2637f4ad724262');
  assert.equal(proof.sourceUrl, SOURCE_URL);
  assert.equal(proof.referenceFileSha256, SOURCE_PDF_SHA256);
  assert.equal(actualPdfSha256, SOURCE_PDF_SHA256);
  assert.equal(proof.extractedPagesSha256, SOURCE_PAGES_SHA256);
  assert.equal(actualPagesSha256, SOURCE_PAGES_SHA256);
  assert.equal(pages.sourceUrl, SOURCE_URL);
  assert.equal(pages.sourceSha256, SOURCE_PDF_SHA256);
  assert.equal(pages.publicationYear, 2021);
  assert.equal(pages.pageCount, 12);
  assert.equal(proof.nativeSpeaker, 'Erasmo Montiel Pascual');
  assert.equal(proof.nativeCommunity, 'Alahualtitla, Chicontepec, Veracruz');
  assert.equal(proof.speakerProvenancePdfPage, 2);
  const provenance = pages.pages.find(page => page.pdf_page === 2)?.text;
  assert.ok(provenance?.includes('Erasmo Montiel Pascual'));
  assert.ok(provenance.includes('Alahualtitla'));
  assert.ok(provenance.includes('Chicontepec'));
  assert.equal(proof.actualNahuatlPdfPage, 8);
  assert.equal(proof.printedNahuatlPage, 152);
  assert.equal(proof.exactToken, 'wankinon');
  assert.equal(proof.exactTokenStart, 2869);
  assert.equal(pages.pages.find(page => page.pdf_page === 8)?.text.slice(2869, 2877), 'wankinon');
  assert.equal(proof.pairedSpanishPdfPage, 3);
  assert.equal(proof.printedSpanishPage, 147);
  assert.equal(proof.alignedSpanishToken, 'entonces');
  assert.equal(proof.alignedSpanishTokenStart, 2657);
  assert.equal(pages.pages.find(page => page.pdf_page === 3)?.text.slice(2657, 2665), 'entonces');
  assert.equal(proof.selectedFunction, 'temporal-next-action-connector');
  assert.deepEqual(proof.contextualRoles, {
    precedingContext: 'described situation affecting plants',
    followingContext: 'next action to take in response'
  });
  for (const field of ['sourceProseOrSentenceReproduced', 'recordingAcquiredOrFollowed', 'generalAfterXConstructionApproved', 'universalStrictChronologyApproved']) assert.equal(proof[field], false);
  assert.equal(review.originalFinding.allIntendedSensesResolvedClaimed, false);
  const coverage = review.originalFinding.perSenseCoverage;
  assert.equal(coverage.allIntendedMeaningsResolved, false);
  assert.equal(coverage.newInflectionOrSourceFrameApproved, false);
  assert.equal(coverage.sourceRestrictionsPreserved, true);
  assert.equal(coverage.supported.length, 1);
  assert.equal(coverage.supported[0].meaningEn, 'then for the next step');
  assert.equal(coverage.supported[0].sourceUrl, SOURCE_URL + '#page=8');
  assert.equal(coverage.held.length, 1);
  assert.equal(coverage.held[0].countAsResolvedMeaning, false);
  assert.equal(coverage.held[0].status, 'not-independently-approved');
  assert.equal(coverage.held[0].meaningEn, 'unrestricted strict afterward or after X');
  assert.equal(entry.meaningEn, 'then; at that time; then for the next step');
  assert.equal(entry.meaningEs, 'entonces; en ese momento; entonces para el siguiente paso');
  assert.equal(entry.audioUrl, null);
  assert.equal(entry.audioKind, 'missing');
  return true;
}

module.exports = { verifyNativeNextActionContext, SOURCE_URL, SOURCE_PDF_SHA256, SOURCE_PAGES_SHA256 };
