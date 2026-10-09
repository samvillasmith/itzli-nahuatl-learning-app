const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { toInaliOrthography } = require('../../public/nahuatl-orthography.js');
const NOTATION_CASES = new Map([
  ['san kwalli', ['sankwalli', 'zancualli']],
  ['san sampa', ['sansampa', 'zanzampa']],
  ['san sehko', ['sansehko', 'zancehco']],
  ['san tekitl', ['santekitl', 'zantequitl']],
  ['axkanah', ['axkana', 'axcanah']],
  ['axikah', ['axika', 'Axica']],
  ['ayikana', ['ayikanah', 'ayicanah']],
  ['ayokkana', ['ayokkanah', 'ayoccanah']],
  ['kwasesoh', ['kwaseso', 'cuācēzo']],
  ['yexmantli', ['yexnantli', 'yēxnāntli']],
  ['yewawkaw', ['yewawkan', 'yēhuauhcān']],
  ['tlache', ['tlachche', 'tlachchē']],
  ['ichiyawaka', ['ichiyawka', 'ichiyauhca']],
  ['iyawaltik', ['ixyawaltik', 'īxyahualtic']],
  ['yahwantin', ['inihwantin', 'inihhuantin']],
  ['kewkinin', ['iwkinin', 'iuhquinīn']],
  ['itlan', ['tlan', 'tlān']],
  ['amo tlen', ['axtlen', 'axtlen']],
  ['momachtikakalli', ['momachtihkakalli', 'momachtihcācalli']],
  ['mawkatlahtoa', ['mahkatlahtoa', 'mahcatlahtoā']],
  ['ekatepetl', ['ehekatepetl', 'ehēcatepētl']],
  ['senkak', ['sekan', 'Sekan']],
  ['nawkak', ['nawkan', 'Nawkan']],
]);

function verifyNotationCorrespondence(entry, alias, evidence) {
  const selected = NOTATION_CASES.get(alias);
  assert.ok(selected, 'Unreviewed notation correspondence');
  assert.equal(evidence.kind, 'individually-reviewed-book-notation-correspondence');
  assert.equal(entry.display, selected[0]);
  assert.equal(evidence.canonicalDisplay, entry.display);
  assert.equal(evidence.exactSourceSpelling, selected[1]);
  assert.equal(entry.sourceSpelling, evidence.exactSourceSpelling);
  const correspondence = evidence.correspondence;
  assert.equal(correspondence.additionalLexicalWordClaimed, false);
  const source = correspondence.publicSourceLocator;
  for (const field of ['sourceType', 'sourceUrl', 'referencePdfPage', 'referenceHeadword', 'referenceFileSha256',
    'lessonNumber', 'sectionIndex', 'bodyIndex', 'sourceImportSha256']) {
    if (Object.hasOwn(source, field)) assert.equal(source[field], entry.sourceLocator[field]);
  }
  if (alias === 'senkak' || alias === 'nawkak') {
    const one = alias === 'senkak', aveli = 'https://www.aveligob.mx/anz/micrositio/IMAGENES/PDF%20POR%20TEMA/13_NUMEROS_ORDINALES.pdf';
    assert.equal(source.sourceType, 'individual-public-reference-fact');
    assert.equal(source.sourceUrl, aveli + '#page=3'); assert.equal(source.referencePdfPage, 3);
    assert.equal(source.referenceFileSha256, '5b46e28429f80f890b36e59d119ce7305ab6cdb8d0a28ccfbb9c23457a0ce935');
    assert.equal(source.referenceTextStart, one ? 906 : 967);
    assert.equal(correspondence.sameIntendedReferentVerified, true);
    assert.equal(correspondence.sameCardinalAndSpatialReferentVerified, true);
    assert.equal(correspondence.quantity, one ? 1 : 4);
    assert.equal(correspondence.bookCardinalStem, one ? 'sen' : 'naw');
    assert.equal(correspondence.canonicalCardinalStem, one ? 'se' : 'naw');
    assert.equal(correspondence.bookSpatialSuffix, 'kak'); assert.equal(correspondence.canonicalSpatialSuffix, 'kan');
    for (const field of ['identicalPronunciationClaimed', 'interchangeableSpokenUseClaimed', 'ocrCorrectionClaimed',
      'generalFinalKToNRuleClaimed', 'generalMedialNDeletionRuleClaimed', 'generalHToWRuleClaimed',
      'genericSuffixSubstitutionRuleClaimed', 'sourceAudioSupportsAlias', 'independentlyCertifiedEasternWholeWordClaimed']) assert.equal(correspondence[field], false);
    const component = correspondence.privatePhotographedComponentAnalysis;
    assert.equal(component.printedPage, 113);
    assert.equal(component.photoSha256, 'ecf50fbda189d3c67df02e08687cd624f6f60850888d2dfb2095c3e86dac9890');
    for (const field of ['numberPlusSpatialSuffixExplicit', 'seSenSemRelationshipExplicit', 'fourCardinalNawiOnSamePage']) assert.equal(component[field], true);
    const modern = correspondence.independentModernComponentEvidence;
    assert.equal(modern.sourceFileSha256, 'a46b8ead3187dfcd893c286ba09d756414903f81656b35dcd814352390bdb100');
    assert.equal(modern.numericalSpatialMechanismPdfPage, 10); assert.equal(modern.cardinalsPdfPage, 13);
    assert.equal(modern.wholeCounterpartSourceUrl, source.sourceUrl);
    assert.equal(modern.wholeCounterpartPdfPage, 3); assert.equal(modern.wholeCounterpartTextStart, source.referenceTextStart);
    assert.equal(entry.audioUrl, null);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo => photo.exactFactualNotation === alias &&
      photo.printedPage === 113 && photo.selectedMeaning === (one ? 'in one place' : 'in four places') &&
      photo.photoSha256 === component.photoSha256));
  } else if (alias === 'ekatepetl') {
    assert.equal(source.sourceType, 'productive-wind-hill-reference');
    assert.equal(source.referenceHeadword, 'EHĒCATL'); assert.equal(source.referencePdfPage, 194);
    assert.equal(correspondence.sameIntendedReferentVerified, true);
    for (const field of ['identicalPronunciationClaimed', 'interchangeableSpokenUseClaimed', 'ocrCorrectionClaimed',
      'generalFirstSyllableDeletionRuleClaimed', 'genericStemContractionClaimed', 'genericHInsertionOrRemovalClaimed',
      'genericVowelRewriteClaimed', 'sourceAudioSupportsAlias', 'independentCanonicalWholeFormAttestationClaimed',
      'independentlyAttestedSpokenBookVariantClaimed']) assert.equal(correspondence[field], false);
    assert.equal(entry.audioUrl, null);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo =>
      photo.exactFactualNotation === alias && photo.printedPage === 65 && photo.selectedMeaning === 'hill of the wind' &&
      photo.photoSha256 === '0d9be74344e08f1ff916045e3e2f359f22701cea400ce08d716059045ebda675'));
    const component = correspondence.privateComponentCrossCheck;
    assert.equal(component.exactWindCitation, 'ehekatl'); assert.equal(component.printedPage, 224);
    assert.equal(component.photoSha256, 'ce1748167d173771d5baaf99f06e373ac2692a0cbe80e6869e396da197d92d4d');
  } else if (alias === 'momachtikakalli' || alias === 'mawkatlahtoa') {
    const student = alias === 'momachtikakalli';
    assert.equal(source.sourceType, 'productive-reviewed-modern-compound');
    assert.equal(source.referenceHeadword, student ? 'MOMACHTIHQUĒTL' : 'TLAHTOĀ');
    assert.equal(source.referencePdfPage, student ? 332 : 500);
    assert.equal(correspondence.sameIntendedReferentVerified, true);
    for (const field of ['identicalPronunciationClaimed', 'interchangeableSpokenUseClaimed', 'ocrCorrectionClaimed',
      'generalHDeletionRuleClaimed', 'generalWToHRewriteClaimed', 'independentlyAttestedSpokenBookVariantClaimed',
      'independentCanonicalWholeFormAttestationClaimed']) assert.equal(correspondence[field], false);
    assert.equal(entry.audioUrl, null);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo =>
      photo.exactFactualNotation === alias && photo.printedPage === 123 &&
      photo.photoSha256 === '93a9e5294e29256915e0ec3e1c498577695142002b62d01285f063a4e489f4cc'));
  } else if (alias === 'amo tlen') {
    assert.equal(source.sourceType, 'individual-reference-fact');
    assert.equal(source.referenceHeadword, 'AXTLEN'); assert.equal(source.referencePdfPage, 51);
    assert.equal(correspondence.sameNegativeReferentVerified, true);
    assert.equal(correspondence.explicitPhotographedParallelNegativeComparisonVerified, true);
    for (const field of ['generalAmoAxSubstitutionClaimed', 'generalNegativeIndefiniteGeneratorClaimed',
      'identicalPronunciationClaimed', 'interchangeableSpokenUseClaimed', 'sourceAudioSupportsAlias', 'sourceTableOrExamplesCopied']) assert.equal(correspondence[field], false);
    assert.equal(entry.audioUrl, null);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo =>
      photo.exactFactualNotation === alias && photo.explicitlyPairedCanonicalNotation === entry.display &&
      photo.selectedMeaning === 'nothing' && photo.printedPage === 48 &&
      photo.pairingKind === 'parallel-row-in-explicit-negative-word-comparison' &&
      photo.photoSha256 === '1c2436be62a6d38d851eea43352d9d8d0978e07a91dae2cfadb9106c397aa00d'));
  } else if (alias === 'itlan') {
    assert.equal(source.sourceType, 'individual-reference-fact');
    assert.equal(source.referenceHeadword, 'TLĀN1'); assert.equal(source.referencePdfPage, 520);
    assert.equal(correspondence.sameIntendedReferentVerified, true);
    assert.equal(correspondence.explicitPhotographedConditionalAlternativeVerified, true);
    for (const field of ['genericIInsertionOrRemovalClaimed', 'genericPossessedConditionalDerivationClaimed',
      'ocrCorrectionClaimed', 'identicalPronunciationClaimed', 'interchangeableSpokenUseClaimed', 'sourceAudioSupportsAlias']) assert.equal(correspondence[field], false);
    assert.equal(entry.audioUrl, null);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo =>
      photo.exactFactualNotation === alias && photo.explicitlyPairedCanonicalNotation === entry.display &&
      photo.selectedMeaning === 'conditional if' && photo.printedPage === 64 &&
      photo.photoSha256 === 'c3e70cf8e5e4c41ac04b50d679afcf2451cc76bd8791c4345bd3e96f8a8623d3'));
  } else if (alias === 'kewkinin') {
    assert.equal(source.sourceType, 'individual-reference-fact');
    assert.equal(source.referenceHeadword, 'IUHQUINĪN'); assert.equal(source.referencePdfPage, 260);
    for (const field of ['genericStemContractionClaimed', 'genericKeniwkiToKewRuleClaimed',
      'genericHInsertionOrRemovalClaimed', 'genericVowelRewriteClaimed', 'ocrCorrectionClaimed',
      'identicalPronunciationClaimed', 'interchangeableSpokenUseClaimed', 'sourceAudioSupportsAlias']) assert.equal(correspondence[field], false);
    assert.equal(entry.audioUrl, null);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo =>
      photo.exactFactualNotation === alias && photo.explicitlyPairedCanonicalNotation === entry.display &&
      photo.selectedMeaning === 'like this' && photo.printedPage === 51 && photo.separateDistalColumnExcluded === true &&
      photo.pairingKind === 'same-column-synonym-table-with-explicit-synonym-introduction' &&
      photo.photoSha256 === '8c8a94fb0ea665bb797ed7932200f947234bf0d1b6dc58a78a570161f8ef9eb7'));
  } else if (alias === 'yahwantin') {
    assert.equal(entry.legacyMainCourseVocabId, 55);
    assert.equal(source.sourceType, 'licensed-course');
    assert.equal(source.lessonNumber, 3); assert.equal(source.vocabularyIndex, 6);
    assert.equal(source.sourceImportSha256, '36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f');
    for (const field of ['genericHInsertionOrRemovalClaimed', 'genericVowelRewriteClaimed',
      'genericPronounStemSubstitutionClaimed', 'ocrCorrectionClaimed', 'identicalPronunciationClaimed',
      'interchangeableSpokenUseClaimed', 'sourceAudioSupportsAlias']) assert.equal(correspondence[field], false);
    assert.equal(entry.audioUrl, 'https://tlahtolli.coerll.utexas.edu/wp-content/uploads/Inihhuantin.mp3');
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo =>
      photo.exactFactualNotation === alias && photo.explicitlyPairedCanonicalNotation === entry.display &&
      photo.selectedMeaning === 'they' && photo.printedPage === 36 &&
      photo.photoSha256 === '8d703c918c35c577ad85a0b1bcb9bc38c944bfd3e748d19553342afe02da25fe'));
  } else if (alias.startsWith('san ')) {
    assert.equal(correspondence.sourceSpacedQuotationClaimed, false);
    assert.equal(correspondence.generalSpaceDeletionRuleClaimed, false);
    const photo = correspondence.privatePhotographedFactualNotation;
    assert.equal(photo.printedPage, 139);
    assert.equal(photo.photoSha256, 'd04d93161ff404a62f0ce01419a751afb80fd4f5c9d03d9e0a0a941fa7385468');
    assert.equal(photo.exactFactualNotation, alias);
    assert.equal(photo.explicitOneWordNotationAllowed, true);
  } else if (alias === 'axkanah') {
    assert.equal(correspondence.identicalPronunciationClaimed, false);
    assert.equal(correspondence.existingReviewedDisplayOverride.genericHDeletionRule, false);
    assert.equal(correspondence.existingReviewedDisplayOverride.existingCanonicalDisplay, entry.display);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo => photo.exactFactualNotation === alias && photo.printedPage === 48));
  } else if (alias === 'ichiyawaka' || alias === 'iyawaltik') {
    assert.equal(correspondence.sameIntendedReferentVerified, true);
    for (const field of ['identicalPronunciationClaimed', 'interchangeableSpokenUseClaimed', 'ocrCorrectionClaimed',
      'genericVowelDeletionRuleClaimed', 'generalXDeletionRuleClaimed', 'generalHDeletionRuleClaimed',
      'independentlyAttestedSpokenBookVariantClaimed']) assert.equal(correspondence[field], false);
    const fat = alias === 'ichiyawaka';
    assert.equal(source.sourceType, fat ? 'individual-reference-form' : 'individual-reference-fact');
    assert.equal(source.referenceHeadword, fat ? 'CHIYĀUHCĀ' : 'ĪXYAHUALTIC');
    assert.equal(source.referencePdfPage, fat ? 111 : 282);
    const photos = correspondence.privatePhotographedFactualNotation;
    assert.ok(photos.some(photo => photo.exactFactualNotation === alias && photo.printedPage === (fat ? 117 : 226) &&
      photo.photoSha256 === (fat ? 'ac8a45d64e3b265af09d3ae4cc40b0ea9bda7a4a7a8954fbb5da1d211b2b806c' : '269f5c95fc80485b259dda7703fca63758d3b855d3d2e2c63b6738666646f0c7')));
  } else if (alias === 'tlache') {
    assert.equal(source.sourceType, 'individual-reference-fact');
    assert.equal(source.referenceHeadword, 'TLACHCHĒ');
    assert.equal(source.referencePdfPage, 480);
    assert.equal(correspondence.identicalPronunciationClaimed, false);
    assert.equal(correspondence.interchangeableSpokenUseClaimed, false);
    assert.equal(correspondence.generalChDoublingRuleClaimed, false);
    assert.equal(correspondence.generalChReductionRuleClaimed, false);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo => photo.exactFactualNotation === alias &&
      photo.printedPage === 237 && photo.photoSha256 === '88a1dc94e2350668980e6a43a276ba62f3b3a6b68be647db0f6bf9338254a532'));
  } else if (alias === 'yewawkaw') {
    assert.equal(source.sourceType, 'individual-reference-fact');
    assert.equal(source.referenceHeadword, 'YĒHUAUHCĀN');
    assert.equal(source.referencePdfPage, 625);
    assert.equal(correspondence.identicalPronunciationClaimed, false);
    assert.equal(correspondence.interchangeableSpokenUseClaimed, false);
    assert.equal(correspondence.generalFinalNToWRuleClaimed, false);
    assert.equal(correspondence.generalFinalWToNRuleClaimed, false);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo => photo.exactFactualNotation === alias &&
      photo.printedPage === 241 && photo.photoSha256 === 'a2eb6f97a77a5943403133577831f789ed29938bc0b11b6820da55d9f3fae332'));
  } else if (alias === 'yexmantli') {
    assert.equal(correspondence.identicalPronunciationClaimed, false);
    assert.equal(correspondence.interchangeableSpokenUseClaimed, false);
    assert.equal(correspondence.generalMToNRuleClaimed, false);
    assert.equal(correspondence.ocrCorrectionClaimed, false);
    assert.equal(correspondence.independentlyAttestedSpokenMVariantClaimed, false);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo => photo.exactFactualNotation === alias &&
      photo.printedPage === 241 && photo.photoSha256 === 'a2eb6f97a77a5943403133577831f789ed29938bc0b11b6820da55d9f3fae332'));
  } else if (alias === 'kwasesoh') {
    assert.equal(correspondence.identicalPronunciationClaimed, false);
    assert.equal(correspondence.interchangeableSpokenUseClaimed, false);
    assert.equal(correspondence.generalFinalHDeletionRuleClaimed, false);
    assert.equal(correspondence.generalFinalHInsertionRuleClaimed, false);
    assert.ok(correspondence.privatePhotographedFactualNotation.some(photo => photo.exactFactualNotation === alias &&
      photo.printedPage === 123 && photo.photoSha256 === '93a9e5294e29256915e0ec3e1c498577695142002b62d01285f063a4e489f4cc'));
  } else {
    assert.equal(correspondence.identicalPronunciationClaimed, false);
    assert.equal(correspondence.generalFinalHDeletionRuleClaimed, false);
    assert.equal(correspondence.generalFinalHInsertionRuleClaimed, false);
    const photos = correspondence.privatePhotographedFactualNotation;
    assert.ok(photos.some(photo => photo.exactFactualNotation === alias && photo.printedPage === 48 &&
      photo.photoSha256 === '1c2436be62a6d38d851eea43352d9d8d0978e07a91dae2cfadb9106c397aa00d'));
    assert.ok(photos.some(photo => photo.exactFactualNotation === entry.display && photo.printedPage === 223 &&
      photo.photoSha256 === '72d2b8e78054d60805dcc1a49afdec6e5048c02a46e291a37dd882e83448ba19'));
  }
}

function countReviewedReferenceAliases(entries, reviews, originalTargetKeys, concordance, normalize, supplementalProofs = []) {
  const present = new Set(), senseSupported = new Set();
  const displays = new Set(entries.map(entry => normalize(entry.display)));
  const supplemented = new Map();
  for (const record of supplementalProofs) {
    const entry = entries.find(item => item.id === record.entryId);
    assert.ok(entry, 'Notation correspondence needs an existing public card');
    assert.equal(createHash('sha256').update(JSON.stringify(entry)).digest('hex'), record.existingFactSha256);
    assert.ok(!supplemented.has(entry.id), 'Duplicate supplemental notation proof');
    supplemented.set(entry.id, record.proof);
  }
  for (const entry of entries) {
    const supplement = supplemented.get(entry.id);
    if (!entry.referenceAliases?.length && !supplement) continue;
    const loc = entry.sourceLocator, proof = supplement ? [supplement] : reviews.get(entry.id)?.originalFinding?.referenceAliases;
    const aliases = supplement ? [supplement.alias] : entry.referenceAliases;
    assert.equal(aliases.length, 1, 'Only one reviewed reference notation is an alias');
    assert.equal(proof?.length, 1, 'Alias needs an individual review');
    const alias = aliases[0], evidence = proof[0], key = normalize(alias);
    if (evidence.kind === 'individually-reviewed-book-notation-correspondence') verifyNotationCorrespondence(entry, alias, evidence);
    else {
      assert.equal(loc.sourceType, 'individual-reference-stem');
      assert.equal(alias, toInaliOrthography(loc.referenceStem).toLowerCase());
      assert.equal(evidence.exactPrintedMetadata, loc.referenceStem);
      assert.equal(evidence.referenceHeadword, loc.referenceHeadword);
      assert.equal(evidence.referencePdfPage, loc.referencePdfPage);
    }
    assert.equal(evidence.alias, alias);
    assert.equal(typeof evidence.targetSenseAgreement, 'boolean');
    assert.ok(originalTargetKeys.has(key), 'Alias must be an existing inventory item');
    assert.ok(!displays.has(key) && !present.has(key), 'Alias cannot double-count a public display');
    const target = concordance.forms.find(form => normalize(form.inali_retrieval_key) === key);
    assert.ok(target && !target.current_app_candidates.length);
    const id = 'private-target-' + createHash('sha256').update('historical-1228|' + target.source_form_key).digest('hex').slice(0, 16);
    assert.equal(evidence.targetItemId, id);
    present.add(key);
    if (evidence.targetSenseAgreement) senseSupported.add(key);
  }
  return { present, senseSupported };
}
module.exports = { countReviewedReferenceAliases };
