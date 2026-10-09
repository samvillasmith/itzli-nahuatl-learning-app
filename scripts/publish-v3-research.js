/* Export only reviewed, independently sourced content. Photos/OCR/book evidence
 * remain in ignored private research. This is a local content export, not a deploy. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { toInaliOrthography } = require('../public/nahuatl-orthography.js');
const { loadTs } = require('./lib/course-audio-inputs');
const { verifyReferenceFactLocator } = require('./lib/reference-fact-locator');
const { verifyPossessedFormProof } = require('./lib/possessed-form-proof');
const { applyTargetFormCorrections } = require('./lib/target-form-corrections');
const { verifyReferenceStemLocator } = require('./lib/reference-stem-locator');
const { verifyVerbFormProof } = require('./lib/verb-form-proof');
const { countReviewedReferenceAliases } = require('./lib/reference-aliases');
const { applyReviewedFactUpgrades } = require('./lib/reviewed-fact-upgrades');
const { verifyPublicReferenceFact } = require('./lib/public-reference-fact');
const { verifyNominalFormProof } = require('./lib/nominal-form-proof');
const { verifyAgentNounFormProof } = require('./lib/agent-noun-form-proof');
const { verifyCardinalFormProof, verifySixtyPlusTenFormProof, verifyProhibitionFormProof } = require('./lib/number-prohibition-proof');
const { verifyPossessedAgentFormProof } = require('./lib/possessed-agent-form-proof');
const { verifyStateVerbFormProof } = require('./lib/state-verb-form-proof');
const { verifyProperNameReferenceFact } = require('./lib/proper-name-reference-fact');
const { verifyGettyEhnNoteFact, FACT: GETTY_FACT, LICENSE_URL: GETTY_LICENSE_URL, LICENSE_FILE: GETTY_LICENSE_FILE } = require('./lib/getty-ehn-note-fact');
const { verifyInaliCourtesyFact, FACT: INALI_FACT } = require('./lib/inali-courtesy-fact');
const { verifyRelationalPrefixFormProof } = require('./lib/relational-prefix-form-proof');
const { verifyFoodIncorporationReferenceForm } = require('./lib/food-incorporation-reference');
const { verifyAntipassiveDrinkingForm } = require('./lib/antipassive-drinking-form-proof');
const { verifyWaterDiminutiveReference } = require('./lib/water-diminutive-reference');
const { summarizeReviewedAdditionalSenseHolds } = require('./lib/sense-coverage');
const { verifyAbstractNounReference } = require('./lib/abstract-noun-reference');
const { verifyReviewedModernCompound } = require('./lib/reviewed-modern-compounds');
const { verifyNativeNextActionContext } = require('./lib/native-next-action-context');
const { verifyWindHillReference } = require('./lib/wind-hill-reference');
const { verifyHumanFeedingForm } = require('./lib/human-feeding-form-proof');
const { verifyIndexedCarryingReference } = require('./lib/indexed-carrying-reference');
const { clarifyReviewedCourseExplanations } = require('./lib/course-explanation-corrections');
const { verifyEhnPublicCorpusFact, FACTS: CORPUS_FACTS, COPYRIGHT_URL: CORPUS_COPYRIGHT_URL } = require('./lib/ehn-public-corpus-fact');
const { verifyLocalReferenceFact, LOCAL_URL } = require('./lib/local-reference-fact');
const { getAppContentExclusionReason } = loadTs('src/lib/app-content-safety.ts');
const root = path.resolve(__dirname, '..');
const research = path.join(root, 'data/research/yan-garcia-nhe-20261004/verification');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourcePath = path.join(root, 'src/data/nahuatlahtolli-course.json');
const source = read(sourcePath), sourceHash = sha(sourcePath);
const normalize = text => toInaliOrthography(text).toLowerCase().replace(/[¿¡?!.,:;“”"/]/g, '').replace(/\s+/g, ' ').trim();
const exactText = (text, value) => typeof text === 'string' && new RegExp(`(?<![\\p{L}\\p{M}])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{M}])`, 'u').test(text);
const fields = ['id', 'display', 'meaningEn', 'meaningEs', 'partOfSpeech', 'formKind', 'referenceAliases', 'legacySourceVocabId', 'legacyMainCourseVocabId', 'sourceUrl', 'sourceSpelling', 'sourceLocator', 'audioUrl', 'audioKind', 'verification', 'usageNoteEn', 'usageNoteEs', 'sourceLicense', 'contentLicense', 'attribution'];
function assertPublic(payload) {
  const serialized = JSON.stringify(payload);
  assert.ok(!/IMG_\d+|Yan Garc|\.HEIC|nhe2\/|data\/research\/|private_book|printed_page|research_id|source_manifest/i.test(serialized), 'Private research must not enter course exports');
}
function lesson(number) { const value = source.lessons.find(item => item.number === number); assert.ok(value, 'Missing independently cited lesson'); return value; }
const factReviews = new Map();
const factBatches = [];
const referencePagesPath = path.join(research, 'further-sources/chicontepec-pages-private.json');
const referencePages = fs.existsSync(referencePagesPath) ? read(referencePagesPath) : null;
const referenceFileHash = referencePages
  ? sha(path.join(research, 'further-sources/tlahtolxitlauhcayotl-chicontepec-reference.pdf')) : null;
const sepPagesPath = path.join(research, 'further-sources/semanauak-maestro-pages-private.json');
const sepPages = fs.existsSync(sepPagesPath) ? read(sepPagesPath) : null;
const sepFileHash = sepPages ? sha(path.join(research, 'further-sources/semanauak-maestro-sep-public.pdf')) : null;
const sixtyFactPath = path.join(research, 'further-sources/expowalli-individual-fact-publishable.json');
const sixtyFact = fs.existsSync(sixtyFactPath) ? read(sixtyFactPath).entries[0] : null;
const hidalgoPagesPath = path.join(research, 'further-sources/hidalgo-vocabulario-basico-pages-private.json');
const hidalgoPages = fs.existsSync(hidalgoPagesPath) ? read(hidalgoPagesPath) : null;
const hidalgoFileHash = hidalgoPages ? sha(path.join(research, 'further-sources/hidalgo-vocabulario-basico-sep-public.pdf')) : null;
const multistatePagesPath = path.join(research, 'further-sources/nahuatl-maestro-segundo-ciclo-pages-private.json');
const multistatePages = fs.existsSync(multistatePagesPath) ? read(multistatePagesPath) : null;
const multistateFileHash = multistatePages ? sha(path.join(research, 'further-sources/nahuatl-maestro-segundo-ciclo-sep-public.pdf')) : null;
const pueblaPagesPath = path.join(research, 'further-sources/hilario-cruz-puebla-pages-private.json');
const pueblaPages = fs.existsSync(pueblaPagesPath) ? read(pueblaPagesPath) : null;
const pueblaFileHash = pueblaPages ? sha(path.join(research, 'further-sources/hilario-cruz-puebla-anonymous-reference.pdf')) : null;
const inePagesPath = path.join(research, 'further-sources/ine-tejido-voces-pages-private.json');
const inePages = fs.existsSync(inePagesPath) ? read(inePagesPath) : null;
const ineFileHash = inePages ? sha(path.join(research, 'further-sources/ine-tejido-voces-public-reference.pdf')) : null;
const zongolicaPagesPath = path.join(research, 'further-sources/zongolica-diccionario-moderno-pages-private.json');
const zongolicaPages = fs.existsSync(zongolicaPagesPath) ? read(zongolicaPagesPath) : null;
const zongolicaFileHash = zongolicaPages ? sha(path.join(research, 'further-sources/zongolica-diccionario-moderno-anonymous-public.pdf')) : null;
const aveliPagesPath = path.join(research, 'further-sources/aveli-counted-locations-pages-private.json');
const aveliPages = fs.existsSync(aveliPagesPath) ? read(aveliPagesPath) : null;
const aveliFileHash = aveliPages ? sha(path.join(research, 'further-sources/aveli-counted-locations-primary.pdf')) : null;
const tzocohuitePagesPath = path.join(research, 'further-sources/tzocohuite-diluvio-unam-pages-private.json');
const tzocohuitePages = fs.existsSync(tzocohuitePagesPath) ? read(tzocohuitePagesPath) : null;
const tzocohuiteFileHash = tzocohuitePages ? sha(path.join(research, 'further-sources/tzocohuite-diluvio-unam-primary.pdf')) : null;
const tuggyHtmlPath = path.join(research, 'further-sources/tuggy-orizaba-compound-primary.html');
const tuggyHtml = fs.existsSync(tuggyHtmlPath) ? fs.readFileSync(tuggyHtmlPath, 'utf8') : null;
const tuggyHtmlHash = tuggyHtml ? sha(tuggyHtmlPath) : null;
const tuggyCausativePath = path.join(research, 'further-sources/tuggy-orizaba-causative-primary.html');
const tuggyCausativeHtml = fs.existsSync(tuggyCausativePath) ? fs.readFileSync(tuggyCausativePath, 'utf8') : null;
const tuggyCausativeHash = tuggyCausativeHtml ? sha(tuggyCausativePath) : null;
const carryingIndexPath = path.join(research, 'further-sources/mecayapan-sasaka-gdn-primary.html');
const carryingIndexHtml = fs.existsSync(carryingIndexPath) ? fs.readFileSync(carryingIndexPath, 'utf8') : null;
const carryingIndexHash = carryingIndexHtml ? sha(carryingIndexPath) : null;
const inahContextPagesPath = path.join(research, 'further-sources/chicontepec-chiles-inah-pages-private.json');
const inahContextPages = fs.existsSync(inahContextPagesPath) ? read(inahContextPagesPath) : null;
const inahContextPagesHash = inahContextPages ? sha(inahContextPagesPath) : null;
const inahContextPdfHash = inahContextPages ? sha(path.join(research, 'further-sources/chicontepec-chiles-inah-public-reference.pdf')) : null;
const properNamePagesPath = path.join(research, 'further-sources/tlaxcala-flor-canto-sep-official-pages-private.json');
const properNamePages = fs.existsSync(properNamePagesPath) ? read(properNamePagesPath) : null;
const properNameFileHash = properNamePages ? sha(path.join(research, 'further-sources/tlaxcala-flor-canto-sep-official.pdf')) : null;
const municipalityPagesPath = path.join(research, 'further-sources/ecatepec-municipal-name-pages-private.json');
const municipalityPages = fs.existsSync(municipalityPagesPath) ? read(municipalityPagesPath) : null;
const municipalityFileHash = municipalityPages ? sha(path.join(research, 'further-sources/ecatepec-municipal-name-public.pdf')) : null;
function savedCorpusReference(file, url) {
  const sourcePath = path.join(research, 'further-sources', file);
  const fileHash = fs.existsSync(sourcePath) ? sha(sourcePath) : null;
  return fileHash ? { reference_url: url, source_sha256: fileHash, text: fs.readFileSync(sourcePath, 'utf8') } : null;
}
const corpusCopyright = savedCorpusReference('ehn-wycliffe-copyright-public.raw.html', CORPUS_COPYRIGHT_URL);
const gettyReferences = Object.fromEntries([GETTY_FACT.primary, GETTY_FACT.supplemental,
  { file: GETTY_LICENSE_FILE, url: GETTY_LICENSE_URL }].map(item => [item.url, savedCorpusReference(item.file, item.url)]));
const inaliEvidence = savedCorpusReference(INALI_FACT.evidenceFile, INALI_FACT.sourceUrl);
const inaliReferences = { [INALI_FACT.sourceUrl]: inaliEvidence && {
  reference_url: INALI_FACT.sourceUrl, evidence_kind: INALI_FACT.evidenceKind,
  provider_evidence_sha256: inaliEvidence.source_sha256, source_server_byte_integrity_claimed: false, text: inaliEvidence.text,
} };
const localReferencePath = path.join(research, 'further-sources/jaltocan-nomenclatura-public.raw.html');
const localReferenceHash = fs.existsSync(localReferencePath) ? sha(localReferencePath) : null;
const localReference = localReferenceHash ? { reference_url: LOCAL_URL, source_sha256: localReferenceHash,
  text: fs.readFileSync(localReferencePath, 'utf8') } : null;
const factManifestPath = path.join(research, 'individual-fact-imports-private.json');
const factManifest = fs.existsSync(factManifestPath) ? read(factManifestPath) : null;
for (const importRecord of factManifest?.imports ?? []) {
  const batchPath = path.resolve(research, importRecord.batchFile);
  const reviewPath = path.resolve(research, importRecord.reviewFile);
  assert.ok(batchPath.startsWith(research + path.sep) && reviewPath.startsWith(research + path.sep));
  assert.equal(sha(batchPath), importRecord.batchSha256);
  assert.equal(sha(reviewPath), importRecord.reviewSha256);
  if (importRecord.secondReview) {
    const peerPath = path.resolve(research, importRecord.secondReview.file);
    assert.ok(peerPath.startsWith(research + path.sep));
    assert.equal(sha(peerPath), importRecord.secondReview.sha256);
    const peer = read(peerPath);
    assert.ok((peer.status || peer.decision || '').startsWith('passed-'), 'Second review must have passed');
  }
  const batch = read(batchPath), batchIds = new Set(batch.entries.map(entry => entry.id));
  for (const review of read(reviewPath).records) {
    if (review.decision !== 'approved-specified-fact' || !batchIds.has(review.publishableEntryId)) continue;
    assert.ok(!factReviews.has(review.publishableEntryId), 'Duplicate reviewed fact identity');
    factReviews.set(review.publishableEntryId, review);
  }
  factBatches.push(batch);
}
function verifyLocator(entry) {
  const loc = entry.sourceLocator;
  if (entry.legacyMainCourseVocabId !== undefined) {
    assert.equal(entry.legacyMainCourseVocabId, 55);
    assert.equal(loc.sourceType, 'licensed-course');
    assert.equal(loc.lessonNumber, 3); assert.equal(loc.vocabularyIndex, 6);
    assert.equal(entry.sourceSpelling, 'inihhuantin'); assert.equal(entry.display, 'inihwantin');
    const anchor = read(path.join(research, '../existing-course-baseline.json')).rows.find(row =>
      row.inventory === 'main-course' && row.stable_card_id === entry.legacyMainCourseVocabId);
    assert.ok(anchor);
    assert.ok(anchor.evidence.some(item => item.source_id === 'source-3-6' && item.source_lesson === 3 && item.source_index === 6 &&
      item.text === entry.sourceSpelling && item.audio_url === entry.audioUrl && item.source_url === entry.sourceUrl));
    assert.equal(anchor.source_spelling, entry.sourceSpelling);
    assert.equal(anchor.learner_spelling, entry.display);
    assert.equal(anchor.source_audio_url, entry.audioUrl);
  }
  if (entry.legacySourceVocabId !== undefined) {
    assert.equal(loc.sourceType, 'licensed-course');
    assert.equal(entry.legacySourceVocabId, 801033);
    assert.equal(loc.lessonNumber, 1); assert.equal(loc.vocabularyIndex, 33);
    assert.equal(entry.sourceSpelling, 'iucci'); assert.equal(entry.display, 'iwksi');
    const identity = read(path.join(root, 'src/data/source-vocab-identity.json')).find(item => item.id === entry.legacySourceVocabId);
    assert.ok(identity); assert.equal(identity.entry_id, 'source-1-33');
    assert.equal(identity.sourceSpelling, entry.sourceSpelling);
  }
  if (['individual-dictionary-fact', 'individual-reference-fact', 'individual-reference-form', 'individual-reference-alias', 'individual-public-reference-fact', 'individual-local-reference-fact', 'productive-reference-form', 'individual-reference-stem', 'productive-verb-form', 'productive-nominal-form', 'productive-agent-noun-form', 'productive-cardinal-form', 'productive-sixty-plus-ten-form', 'productive-prohibition-form', 'productive-possessed-agent-form', 'productive-state-verb-form', 'individual-proper-name-reference-fact', 'individual-ehn-corpus-fact', 'individual-getty-ehn-note-fact', 'individual-inali-courtesy-fact', 'productive-food-incorporation-form', 'productive-antipassive-drinking-form', 'productive-water-diminutive-reference', 'productive-abstract-noun-reference', 'productive-reviewed-modern-compound', 'productive-wind-hill-reference', 'productive-human-feeding-form', 'individual-modern-indexed-verb-reference'].includes(loc.sourceType)) {
    const url = new URL(entry.sourceUrl);
    assert.equal(url.protocol, 'https:');
    if (loc.sourceType === 'individual-local-reference-fact') {
      verifyLocalReferenceFact(entry, localReference, localReferenceHash);
    } else if (loc.sourceType === 'productive-wind-hill-reference') {
      verifyWindHillReference(entry, referencePages, referenceFileHash, tuggyHtml, tuggyHtmlHash);
    } else if (loc.sourceType === 'productive-human-feeding-form') {
      verifyHumanFeedingForm(entry, referencePages, referenceFileHash, tzocohuitePages, tzocohuiteFileHash, tuggyCausativeHtml, tuggyCausativeHash, source, sourceHash);
    } else if (loc.sourceType === 'individual-modern-indexed-verb-reference') {
      verifyIndexedCarryingReference(entry, carryingIndexHtml, carryingIndexHash);
    } else if (loc.sourceType === 'productive-reviewed-modern-compound') {
      verifyReviewedModernCompound(entry, referencePages, referenceFileHash, tuggyHtml, tuggyHtmlHash);
    } else if (loc.sourceType === 'productive-abstract-noun-reference') {
      verifyAbstractNounReference(entry, referencePages, referenceFileHash);
    } else if (loc.sourceType === 'productive-antipassive-drinking-form') {
      verifyAntipassiveDrinkingForm(entry, referencePages, referenceFileHash, hidalgoPages, hidalgoFileHash, tzocohuitePages, tzocohuiteFileHash, source, sourceHash);
    } else if (loc.sourceType === 'productive-water-diminutive-reference') {
      verifyWaterDiminutiveReference(entry, referencePages, referenceFileHash, source, sourceHash, inePages, ineFileHash);
    } else if (loc.sourceType === 'productive-food-incorporation-form') {
      verifyFoodIncorporationReferenceForm(entry, referencePages, referenceFileHash, tzocohuitePages, tzocohuiteFileHash);
    } else if (loc.sourceType === 'individual-getty-ehn-note-fact') {
      verifyGettyEhnNoteFact(entry, gettyReferences);
    } else if (loc.sourceType === 'individual-inali-courtesy-fact') {
      verifyInaliCourtesyFact(entry, inaliReferences);
    } else if (loc.sourceType === 'individual-proper-name-reference-fact') {
      if (loc.properNameProof.kind === 'one-official-modern-municipality-name') {
        assert.equal(sha(municipalityPagesPath), '839ddc0e50c7bbe62c7f825b6c66918c562220f9dfb234075ea359596f709008');
        verifyProperNameReferenceFact(entry, municipalityPages, municipalityFileHash);
      } else verifyProperNameReferenceFact(entry, properNamePages, properNameFileHash);
    } else if (loc.sourceType === 'individual-ehn-corpus-fact') {
      const fact = CORPUS_FACTS[entry.sourceSpelling]; assert.ok(fact);
      const corpusReference = savedCorpusReference(fact.file, fact.url);
      verifyEhnPublicCorpusFact(entry, corpusReference, corpusReference?.source_sha256, corpusCopyright, corpusCopyright?.source_sha256);
    } else if (loc.sourceType === 'productive-possessed-agent-form') {
      verifyPossessedAgentFormProof(entry, referencePages, referenceFileHash, source, sourceHash);
    } else if (loc.sourceType === 'productive-state-verb-form') {
      verifyStateVerbFormProof(entry, referencePages, referenceFileHash, source, sourceHash);
    } else if (loc.sourceType === 'productive-agent-noun-form') {
      verifyAgentNounFormProof(entry, referencePages, referenceFileHash, source, sourceHash);
    } else if (loc.sourceType === 'productive-cardinal-form') {
      verifyCardinalFormProof(entry, source, sourceHash);
    } else if (loc.sourceType === 'productive-sixty-plus-ten-form') {
      verifySixtyPlusTenFormProof(entry, source, sourceHash, sepPages, sepFileHash, sixtyFact);
    } else if (loc.sourceType === 'productive-prohibition-form') {
      verifyProhibitionFormProof(entry, referencePages, referenceFileHash, source, sourceHash, sepPages, sepFileHash);
    } else if (loc.sourceType === 'productive-nominal-form') {
      verifyNominalFormProof(entry, referencePages, referenceFileHash, source, sourceHash);
    } else if (loc.sourceType === 'individual-public-reference-fact') {
      const selected = [[sepPages, sepFileHash], [hidalgoPages, hidalgoFileHash], [multistatePages, multistateFileHash],
        [pueblaPages, pueblaFileHash], [inePages, ineFileHash], [zongolicaPages, zongolicaFileHash], [aveliPages, aveliFileHash]]
        .find(([reference]) => reference && entry.sourceUrl === reference.reference_url + '#page=' + loc.referencePdfPage);
      assert.ok(selected, 'Missing registered public reference');
      verifyPublicReferenceFact(entry, selected[0], selected[1]);
    } else if (loc.sourceType === 'productive-verb-form') {
      verifyVerbFormProof(entry, referencePages, referenceFileHash, source, sourceHash);
    } else if (loc.sourceType === 'productive-reference-form') {
      if (loc.referenceStemEvidence.kind === 'attested-relational-prefix-substitution') verifyRelationalPrefixFormProof(entry, referencePages, referenceFileHash, source, sourceHash);
      else verifyPossessedFormProof(entry, referencePages, referenceFileHash, source, sourceHash);
    } else if (loc.sourceType === 'individual-reference-stem') {
      verifyReferenceStemLocator(entry, referencePages, referenceFileHash);
    } else if (loc.sourceType !== 'individual-dictionary-fact') {
      verifyReferenceFactLocator(entry, referencePages, referenceFileHash, normalize);
    } else assert.equal(url.hostname, 'nahuatl.wired-humanities.org');
    assert.equal(loc.sourceUrl, entry.sourceUrl);
    if (loc.sourceType === 'individual-modern-indexed-verb-reference') {
      assert.equal(loc.attestedHeadword, null);
      assert.equal(loc.indexedVerbReferenceProof.extraction.unchangedLexicalReference, entry.sourceSpelling);
    } else if (loc.sourceType === 'productive-wind-hill-reference' || loc.sourceType === 'productive-human-feeding-form') {
      assert.equal(loc.attestedHeadword, null);
      assert.equal((loc.windHillProof || loc.humanFeedingProof).composition.authoredReferenceForm, entry.sourceSpelling);
    } else if (loc.sourceType === 'productive-reviewed-modern-compound') {
      assert.equal(loc.attestedHeadword, null);
      assert.equal(loc.modernCompoundProof.composition.authoredReferenceForm, entry.sourceSpelling);
    } else if (loc.sourceType === 'productive-abstract-noun-reference') {
      assert.equal(loc.attestedHeadword, null);
      assert.equal(loc.abstractNounProof.composition.authoredReferenceForm, entry.sourceSpelling);
    } else if (loc.sourceType === 'productive-antipassive-drinking-form' || loc.sourceType === 'productive-water-diminutive-reference') {
      assert.equal(loc.attestedHeadword, null);
      const proof = loc.antipassiveDrinkingProof || loc.waterDiminutiveProof;
      assert.equal(proof.composition.authoredReferenceForm, entry.sourceSpelling);
    } else if (loc.sourceType === 'productive-food-incorporation-form') {
      assert.equal(loc.attestedHeadword, null);
      assert.equal(loc.foodIncorporationProof.composition.authoredReferenceForm, entry.sourceSpelling);
    } else if (loc.sourceType === 'individual-reference-stem') assert.equal(loc.attestedHeadword, null);
    else if (['productive-reference-form', 'productive-verb-form', 'productive-nominal-form', 'productive-agent-noun-form', 'productive-cardinal-form', 'productive-sixty-plus-ten-form', 'productive-prohibition-form', 'productive-possessed-agent-form', 'productive-state-verb-form'].includes(loc.sourceType)) assert.equal(loc.authoredReferenceForm, entry.sourceSpelling);
    else assert.equal(loc.attestedHeadword, entry.sourceSpelling);
    for (const field of ['lessonNumber', 'vocabularyIndex', 'sectionIndex', 'bodyIndex', 'sourceImportSha256']) assert.equal(loc[field], null);
    assert.match(loc.reviewedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(loc.sourceFieldLocators?.length && loc.sourceFieldLocators.every(field => typeof field === 'string'));
    assert.equal(entry.audioUrl, null, 'Reference facts do not grant reuse of source recordings');
    const review = factReviews.get(entry.id); assert.ok(review, `Unreviewed reference fact ${entry.id}`);
    if (review.originalFinding?.supplementalPrimaryContextProof) {
      verifyNativeNextActionContext(entry, review, inahContextPages, inahContextPagesHash, inahContextPdfHash);
    }
    assert.equal(loc.sourceFactReviewHash, crypto.createHash('sha256').update(JSON.stringify(review)).digest('hex'));
    assert.equal(review.sourceUrl, entry.sourceUrl);
    assert.deepEqual(review.sourceFieldLocators, loc.sourceFieldLocators);
    assert.deepEqual(review.originalGloss, { en: entry.meaningEn, es: entry.meaningEs });
    assert.equal(typeof review.targetSenseAgreement, 'boolean');
    if (loc.sourceType === 'individual-reference-stem') assert.deepEqual(review.originalFinding.stemProof, loc.referenceStemEvidence);
    if (loc.sourceType === 'individual-reference-alias') assert.deepEqual(review.originalFinding.aliasProof, loc.referenceAliasEvidence);
    if (loc.sourceType === 'productive-nominal-form') assert.deepEqual(review.originalFinding.nominalProof, loc.nominalProof);
    if (loc.sourceType === 'productive-agent-noun-form') assert.deepEqual(review.originalFinding.agentNounProof, loc.agentNounProof);
    if (loc.sourceType === 'productive-cardinal-form') assert.deepEqual(review.originalFinding.numberProof, loc.numberProof);
    if (loc.sourceType === 'productive-sixty-plus-ten-form') assert.deepEqual(review.originalFinding.numberProof, loc.numberProof);
    if (loc.sourceType === 'productive-prohibition-form') assert.deepEqual(review.originalFinding.prohibitionProof, loc.prohibitionProof);
    if (loc.sourceType === 'productive-possessed-agent-form') assert.deepEqual(review.originalFinding.possessedAgentProof, loc.possessedAgentProof);
    if (loc.sourceType === 'productive-state-verb-form') assert.deepEqual(review.originalFinding.stateVerbProof, loc.stateVerbProof);
    if (loc.sourceType === 'individual-local-reference-fact') assert.deepEqual(review.originalFinding.localReferenceProof, loc.localReferenceProof);
    if (loc.sourceType === 'individual-proper-name-reference-fact') assert.deepEqual(review.originalFinding.properNameProof, loc.properNameProof);
    if (loc.sourceType === 'individual-ehn-corpus-fact') assert.deepEqual(review.originalFinding.corpusFactProof, loc.corpusFactProof);
    if (loc.sourceType === 'individual-getty-ehn-note-fact') assert.deepEqual(review.originalFinding.gettyNoteFactProof, loc.gettyNoteFactProof);
    if (loc.sourceType === 'individual-inali-courtesy-fact') assert.deepEqual(review.originalFinding.inaliCourtesyFactProof, loc.inaliCourtesyFactProof);
    if (loc.sourceType === 'productive-food-incorporation-form') assert.deepEqual(review.originalFinding.foodIncorporationProof, loc.foodIncorporationProof);
    if (loc.sourceType === 'productive-antipassive-drinking-form') assert.deepEqual(review.originalFinding.antipassiveDrinkingProof, loc.antipassiveDrinkingProof);
    if (loc.sourceType === 'productive-water-diminutive-reference') assert.deepEqual(review.originalFinding.waterDiminutiveProof, loc.waterDiminutiveProof);
    if (loc.sourceType === 'productive-abstract-noun-reference') assert.deepEqual(review.originalFinding.abstractNounProof, loc.abstractNounProof);
    if (loc.sourceType === 'productive-reviewed-modern-compound') assert.deepEqual(review.originalFinding.modernCompoundProof, loc.modernCompoundProof);
    if (loc.sourceType === 'productive-wind-hill-reference') assert.deepEqual(review.originalFinding.windHillProof, loc.windHillProof);
    if (loc.sourceType === 'productive-human-feeding-form') assert.deepEqual(review.originalFinding.humanFeedingProof, loc.humanFeedingProof);
    if (loc.sourceType === 'individual-modern-indexed-verb-reference') assert.deepEqual(review.originalFinding.indexedVerbReferenceProof, loc.indexedVerbReferenceProof);
    if (loc.sourceType === 'productive-verb-form') {
      const proofFields = ['modernStemEvidence', 'grammarRuleLocators', 'subjectPrefix', 'objectPrefix', 'subject', 'tense',
        'numberSuffix', 'compositionNoStemChanges', 'directWholeFormAttestationClaimed'];
      for (const optional of ['object', 'stemAllomorph']) if (Object.hasOwn(loc, optional)) proofFields.push(optional);
      if (Object.hasOwn(review.originalFinding.verbProof, 'authoredReferenceForm')) proofFields.push('authoredReferenceForm');
      assert.deepEqual(review.originalFinding.verbProof, Object.fromEntries(proofFields.map(field => [field, loc[field]])));
      assert.equal(review.originalFinding.authoredReferenceForm, entry.sourceSpelling);
    }
    if (loc.sourceType === 'productive-reference-form') {
      assert.deepEqual(review.originalFinding.grammarRuleLocator, loc.grammarRuleLocator);
      assert.equal(review.originalFinding.directWholeFormAttestationClaimed, false);
      if (loc.referenceStemEvidence.kind === 'attested-relational-prefix-substitution') {
        assert.deepEqual(review.originalFinding.referenceStemEvidence, loc.referenceStemEvidence);
        assert.equal(review.originalFinding.completeStandaloneUtteranceClaimed, false);
        assert.equal(review.originalFinding.anatomicalButtockSenseApproved, false);
        assert.equal(review.originalFinding.generalRelationalParadigmApproved, false);
        assert.equal(review.sourceSpelling, entry.sourceSpelling);
      } else {
        assert.deepEqual(review.originalFinding.stemProof, loc.referenceStemEvidence);
        assert.deepEqual(review.originalFinding.composition.phonologicalChangesInComposition, []);
        assert.equal(review.originalFinding.composition.possessorPrefix, loc.possessorPrefix);
        assert.equal(review.originalFinding.authoredReferenceForm, entry.sourceSpelling);
      }
    }
    assert.ok(entry.verification.variety && entry.verification.limitationsEn && entry.verification.limitationsEs);
    if (loc.sourceType === 'productive-cardinal-form') {
      assert.equal(entry.sourceLicense, 'CC BY-SA (publisher listing; version unspecified) for consulted COERLL grammar');
    } else if (loc.sourceType === 'productive-sixty-plus-ten-form') {
      assert.equal(entry.sourceLicense, 'Individual numeral facts consulted; COERLL grammar CC BY-SA (publisher listing; version unspecified); no SEP prose, compilation or media license claimed');
    } else if (loc.sourceType === 'productive-antipassive-drinking-form') {
      assert.equal(entry.sourceLicense, 'Individual linguistic facts and mechanisms consulted; no source prose, narrative, compilation or media reuse license claimed. COERLL separately lists CC BY-SA with version unspecified.');
    } else if (loc.sourceType === 'productive-water-diminutive-reference') {
      assert.equal(entry.sourceLicense, 'Individual linguistic facts and models consulted; no dictionary prose, research narrative or media reuse license claimed. COERLL separately lists CC BY-SA with version unspecified.');
    } else if (loc.sourceType === 'productive-human-feeding-form') {
      assert.equal(entry.sourceLicense, 'Individual linguistic facts consulted; no source collection, prose, examples or media reuse license claimed. Licensed COERLL person rules, where used, separately list CC BY-SA with version unspecified.');
    } else assert.ok(!/CC BY-SA/.test(entry.sourceLicense), 'Do not claim a source dictionary license from licensing our own gloss');
  } else {
    assert.ok(!loc.sourceType || loc.sourceType === 'licensed-course');
    const l = lesson(loc.lessonNumber);
    assert.equal(loc.sourceImportSha256, sourceHash);
    assert.equal(entry.sourceUrl, l.originalUrl);
    if (loc.vocabularyIndex !== null) {
      const item = l.vocabulary[loc.vocabularyIndex - 1];
      assert.equal(item?.headword, entry.sourceSpelling);
      assert.equal(item.audioUrl || null, entry.audioUrl);
    } else {
      assert.ok(exactText(l.sections[loc.sectionIndex]?.body[loc.bodyIndex], entry.sourceSpelling), `Unattested complete form ${entry.id}`);
      assert.equal(entry.audioUrl, null, 'Body-only words do not inherit guessed recordings');
    }
  }
  assert.equal(entry.display, toInaliOrthography(entry.sourceSpelling).toLowerCase().trim());
  assert.equal(entry.verification.status, 'source-supported');
  assert.equal(entry.audioKind, entry.audioUrl ? 'source-linked' : 'missing');
  assert.ok(entry.meaningEn && entry.meaningEs && entry.attribution?.authors?.length);
  assert.equal(entry.contentLicense, 'CC BY-SA 4.0');
  if (entry.audioUrl) {
    const url = new URL(entry.audioUrl);
    assert.equal(url.protocol, 'https:'); assert.equal(url.hostname, 'tlahtolli.coerll.utexas.edu');
  }
}
const formReview = read(path.join(research, 'grammar/verified-forms-adversarial-review.private.json'));
assert.equal(formReview.status, 'passed-specified-source-senses');
assert.equal(formReview.batchSha256, sha(path.join(research, 'grammar/verified-forms-additions-publishable.json')));
assert.equal(formReview.summary.requiredUnresolvedEdits, 0);
assert.equal(formReview.summary.optionalUnresolvedEdits, 0);
const batches = [read(path.join(research, 'verified-lexicon-publishable.json')), read(path.join(research, 'independent-body-additions-publishable.json')),
  read(path.join(research, 'grammar/verified-forms-additions-publishable.json'))];
const bodyBatchPath = path.join(research, 'body-only-additions-publishable.json');
const bodyReview = read(path.join(research, 'body-only-adversarial-review.private.json'));
assert.equal(bodyReview.status, 'passed-specified-independent-source-senses');
assert.equal(bodyReview.batchSha256, sha(bodyBatchPath));
assert.equal(bodyReview.summary.requiredUnresolvedEdits, 0);
assert.equal(bodyReview.summary.selectedSenseContradictions, 0);
assert.equal(bodyReview.summary.phraseAudioMisassignments, 0);
batches.push(read(bodyBatchPath));
batches.push(...factBatches);
const baseline = read(path.join(research, '../existing-course-baseline.json'));
const baselineKeys = new Set(baseline.rows.map(row => normalize(row.learner_spelling)));
const first = batches[0];
let reviewedEntries = batches.flatMap(batch => batch.entries).map(entry => {
  if (entry.referenceAliases?.length && entry.sourceLocator.sourceType === 'licensed-course') {
    const review = factReviews.get(entry.id);
    assert.equal(review?.decision, 'approved-specified-fact');
    assert.equal(review.sourceUrl, entry.sourceUrl);
    assert.deepEqual(review.originalGloss, { en: entry.meaningEn, es: entry.meaningEs });
    assert.ok(review.originalFinding.referenceAliases?.length);
    // Preserve a semantic-review link for independently sourced course facts
    // that additionally cover a reviewed reference notation.
    entry.sourceLocator.sourceFactReviewHash = crypto.createHash('sha256').update(JSON.stringify(review)).digest('hex');
  }
  verifyLocator(entry);
  const result = Object.fromEntries(fields.map(key => [key, entry[key]]));
  result.sourceLocator = { sourceType: 'licensed-course', ...entry.sourceLocator };
  result.newToCourse = !baselineKeys.has(normalize(entry.display));
  return result;
});
const patchFile = path.join(research, 'adversarial-review-private.json');
if (fs.existsSync(patchFile)) for (const patch of read(patchFile).patches ?? []) {
  assert.equal(patch.field, 'meaningEs');
  const entry = reviewedEntries.find(item => item.id === patch.id); assert.ok(entry);
  assert.equal(entry.meaningEs, patch.before); entry.meaningEs = patch.after;
}
for (const patch of read(path.join(root, 'src/data/v3-lexical-corrections.json')).corrections) {
  assert.ok(['meaningEn', 'meaningEs', 'usageNoteEn', 'usageNoteEs'].includes(patch.field));
  const entry = reviewedEntries.find(item => item.id === patch.id); assert.ok(entry);
  assert.equal(entry[patch.field], patch.before); entry[patch.field] = patch.after;
}
reviewedEntries = applyReviewedFactUpgrades(reviewedEntries, factReviews, factManifest?.existingEntryUpgrades ?? [], normalize);
const contentHolds = reviewedEntries.flatMap(entry => {
  const reason = getAppContentExclusionReason([entry.display, entry.sourceSpelling, JSON.stringify(entry)]);
  return reason ? [{ id: entry.id, display: entry.display, reason, entry }] : [];
});
const heldIds = new Set(contentHolds.map(hold => hold.id));
const entries = reviewedEntries.filter(entry => !heldIds.has(entry.id));
fs.writeFileSync(path.join(research, 'app-content-holds-private.json'), JSON.stringify({
  schemaVersion: 1, scope: 'Existing app display rules only; source-supported facts remain private and do not count as publicly present.',
  records: contentHolds,
}, null, 2) + '\n');
for (const entry of entries) {
  if (entry.partOfSpeech === 'locative-expression' && !/\s/.test(entry.display) && entry.formKind !== 'rule-composed-relational-form') entry.formKind = 'locative-form';
}
entries.sort((a, b) => a.display.localeCompare(b.display, 'es'));
assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
assert.equal(new Set(entries.map(entry => normalize(entry.display))).size, entries.length);
const currentForms = new Set([...baseline.rows.map(row => normalize(row.learner_spelling)), ...entries.map(entry => normalize(entry.display))]);
const writtenItemTarget = 1551;
const targetConcordance = read(path.join(research, 'coerll-concordance-private.json'));
const displayKey = value => value.normalize('NFC').toLowerCase().replace(/[¿¡?!.,:;“”"'/]/g, '').replace(/\s+/g, ' ').trim();
let originalTargetKeys = new Set(targetConcordance.forms.filter(form => !form.current_app_candidates.length).map(form => displayKey(form.inali_retrieval_key)));
for (const correctionImport of [factManifest?.sourceFormCorrections, ...(factManifest?.sourceFormCorrectionImports ?? [])].filter(Boolean)) {
  const correctionPath = path.resolve(research, correctionImport.file);
  assert.ok(correctionPath.startsWith(research + path.sep));
  assert.equal(sha(correctionPath), correctionImport.sha256);
  const inventoryPath = path.join(research, '../lexical-research-inventory.json');
  originalTargetKeys = applyTargetFormCorrections(originalTargetKeys, read(correctionPath), targetConcordance,
    read(inventoryPath), baselineKeys, displayKey, {
      canonicalInventory: sha(inventoryPath), canonicalConcordance: sha(path.join(research, 'coerll-concordance-private.json')),
      historicalBaseline: sha(path.join(research, '../existing-course-baseline.json')),
    });
}
assert.equal(originalTargetKeys.size + baseline.counts.combined_display_keys, writtenItemTarget);
const coveredTargetKeys = new Set(entries.filter(entry => entry.newToCourse && originalTargetKeys.has(displayKey(entry.display))).map(entry => displayKey(entry.display)));
const referenceAliases = countReviewedReferenceAliases(entries, factReviews, originalTargetKeys, targetConcordance, displayKey);
const originalTargetDistinctWrittenFormsPresent = baseline.counts.combined_display_keys + coveredTargetKeys.size;
for (const key of referenceAliases.present) coveredTargetKeys.add(key);
const originalTargetCovered = baseline.counts.combined_display_keys + coveredTargetKeys.size;
const initialSenseIds = new Set(read(path.join(research, 'adjudications-private.json')).approved.map(item => item.publishable_entry_id));
const reviewedBodySenseIds = new Set(bodyReview.records.filter(item => !item.originalTargetPreciseSenseUnverified).map(item => item.id));
const newTargetSenseKeys = new Set(entries.filter(entry => entry.newToCourse && originalTargetKeys.has(displayKey(entry.display)) &&
  (factReviews.has(entry.id) ? factReviews.get(entry.id).targetSenseAgreement === true :
    initialSenseIds.has(entry.id) || reviewedBodySenseIds.has(entry.id))).map(entry => displayKey(entry.display)));
for (const key of referenceAliases.senseSupported) newTargetSenseKeys.add(key);
const additionalSenseHolds = summarizeReviewedAdditionalSenseHolds(entries, factReviews, originalTargetKeys, displayKey);
const lexicon = {
  schemaVersion: 1, license: { ...first.license,
    individualDictionaryFacts: { rightsBasis: 'Individual linguistic facts checked; original Itzli glosses. No source prose, examples, collection arrangement or media imported.', sourceLicenseGranted: false },
    individualReferenceFacts: { rightsBasis: 'Individual Chicontepec reference facts checked at exact PDF page and head. Original Itzli labels only; source expression and assets remain private.', sourceLicenseGranted: false } },
  scope: { ...first.scope, communityEvidence: 'Per-entry evidence: Chicontepec course and qualified modern dictionary checks; see each entry for regional scope.',
    selection: 'Itzli organizes individually checked facts around communication needs. Source prose, exercises, lesson sequences and compilation arrangement are not imported.' },
  counts: { sourceSupportedRecords: entries.length, newWrittenForms: entries.filter(entry => entry.newToCourse).length,
    existingAnchors: entries.filter(entry => !entry.newToCourse).length,
    sourceLinkedAudio: entries.filter(entry => entry.audioUrl).length,
    missingAudio: entries.filter(entry => !entry.audioUrl).length, verifiedUniqueLemmaCount: null,
    writtenItemTarget, appDistinctWrittenForms: currentForms.size,
    remainingToTarget: writtenItemTarget - originalTargetCovered,
    originalTargetCovered, originalTargetPresent: originalTargetCovered,
    originalTargetDistinctWrittenFormsPresent, originalTargetReferenceAliases: referenceAliases.present.size,
    remainingOriginalTargetItems: writtenItemTarget - originalTargetCovered,
    newTargetSenseSupportedForms: newTargetSenseKeys.size,
    presentNewTargetFormsWithSenseUnresolved: coveredTargetKeys.size - newTargetSenseKeys.size,
    ...additionalSenseHolds,
    additionsOutsideOriginalTarget: entries.filter(entry => entry.newToCourse && !originalTargetKeys.has(displayKey(entry.display))).length,
    targetStatus: originalTargetCovered === writtenItemTarget ? 'written-target-represented' : 'in-progress' },
  entries,
};
assertPublic(lexicon);
const report = { sourceImportSha256: sourceHash, privateBookExported: false, existingProgressMigrated: false,
  mediaGenerated: false, productionAccessed: false, lexicon: lexicon.counts, baselineSnapshotSchema: baseline.schema_version ?? null };
const grammarPath = path.join(research, 'grammar/publishable-course.json');
let publishedCourse;
if (!process.argv.includes('--lexicon-only')) {
  const courseReview = read(path.join(research, 'grammar/course-extension-adversarial-review.private.json'));
  assert.equal(courseReview.status, 'passed-specified-source-meanings');
  assert.equal(courseReview.courseSha256, sha(grammarPath));
  assert.equal(courseReview.summary.requiredUnresolvedEdits, 0);
  assert.equal(courseReview.summary.selectedSourcePersonNumberTimeContradictions, 0);
  const { applyReviewedCourseExtension } = require('./lib/v3-authored-course-extension.js');
  const reviewedExtension = applyReviewedCourseExtension(read(grammarPath), { root, research });
  const { applyReviewedBonesExtension } = require('./lib/v3-bones-course-extension');
  const bones = applyReviewedBonesExtension(reviewedExtension.course, { root, research });
  report.bonesCourseExtension = bones.evidence;
  const grammar = clarifyReviewedCourseExplanations(bones.course, source);
  report.authoredCourseExtension = reviewedExtension.evidence;
  const sources = new Map(grammar.sources.map(item => [item.id, item]));
  const phrases = new Map(grammar.phrases.map(item => [item.id, item]));
  const rules = new Map(grammar.rules.map(item => [item.id, item]));
  assert.equal(phrases.size, grammar.phrases.length); assert.equal(rules.size, grammar.rules.length);
  assert.equal(new Set(grammar.units.map(item => item.id)).size, grammar.units.length);
  for (const phrase of grammar.phrases) {
    const loc = phrase.sourceLocator, l = lesson(loc.lessonNumber);
    const src = sources.get(phrase.sourceId); assert.ok(src); assert.equal(src.url, l.originalUrl);
    const locatedText = loc.vocabularyIndex !== null
      ? l.vocabulary[loc.vocabularyIndex - 1]?.headword
      : l.sections[loc.sectionIndex]?.body[loc.bodyIndex];
    assert.ok(exactText(locatedText, phrase.sourceText), `Unattested exact phrase locator ${phrase.id}`);
    assert.equal(phrase.nahuatl, toInaliOrthography(phrase.sourceText));
    if (phrase.audioUrl) assert.ok(l.vocabulary.some(item => item.headword === phrase.sourceText && item.audioUrl === phrase.audioUrl), `Recording does not match ${phrase.id}`);
    assert.equal(phrase.audioKind, phrase.audioUrl ? 'source-recording' : 'none');
  }
  for (const rule of grammar.rules) {
    for (const id of rule.phraseIds) assert.ok(phrases.has(id));
    for (const id of rule.sourceIds) assert.ok(sources.has(id));
  }
  const feedbackPath = path.join(research, 'grammar/course-feedback-corrections.json');
  if (fs.existsSync(feedbackPath)) for (const correction of read(feedbackPath).corrections) {
    const unit = grammar.units.find(item => item.id === correction.unitId); assert.ok(unit);
    const step = unit.steps.find(item => item.id === correction.stepId); assert.ok(step);
    assert.deepEqual(correction.answerPhraseIds, step.answerPhraseIds);
    for (const id of correction.evidencePhraseIds) assert.ok(phrases.has(id));
    assert.ok(correction.feedback.en && correction.feedback.es);
    step.feedback = correction.feedback;
  }
  for (const unit of grammar.units) {
    assert.match(unit.id, /^v3-[a-z0-9-]+$/); assert.ok(unit.steps.length);
    for (const id of unit.phraseIds) assert.ok(phrases.has(id));
    for (const id of unit.ruleIds) assert.ok(rules.has(id));
    assert.equal(new Set(unit.steps.map(step => step.id)).size, unit.steps.length);
    for (const step of unit.steps) {
      assert.ok(['choice', 'recall'].includes(step.kind)); assert.ok(step.answerPhraseIds.length);
      for (const id of [...step.choices, ...step.answerPhraseIds, ...(step.phraseId ? [step.phraseId] : [])]) assert.ok(phrases.has(id));
      assert.ok(step.answerPhraseIds.every(id => unit.phraseIds.includes(id)), 'Recall answers must be taught in the unit');
      if (step.kind === 'choice') {
        assert.ok(step.choices.length >= 2);
        assert.ok(step.answerPhraseIds.every(id => step.choices.includes(id)));
        assert.ok(step.choices.some(id => !step.answerPhraseIds.includes(id)), 'Recognition needs a meaningful alternative');
      }
    }
  }
  publishedCourse = { schemaVersion: grammar.schemaVersion, license: grammar.license,
    sources: grammar.sources, phrases: grammar.phrases, rules: grammar.rules, units: grammar.units, coverage: [] };
  assertPublic(publishedCourse);
  report.course = { units: grammar.units.length, rules: grammar.rules.length, phrases: grammar.phrases.length,
    tasks: grammar.units.reduce((sum, item) => sum + item.steps.length, 0),
    sourceLinkedAudio: grammar.phrases.filter(item => item.audioUrl).length,
    missingAudio: grammar.phrases.filter(item => !item.audioUrl).length };
}
// Complete every content/provenance check before replacing either public export.
fs.writeFileSync(path.join(root, 'src/data/v3-verified-lexicon.json'), JSON.stringify(lexicon, null, 2) + '\n');
if (publishedCourse) fs.writeFileSync(path.join(root, 'src/data/v3-original-course.json'), JSON.stringify(publishedCourse, null, 2) + '\n');
fs.mkdirSync(path.join(root, 'data/audits'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/audits/v3-expansion-export.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
