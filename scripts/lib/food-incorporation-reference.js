const assert = require('node:assert/strict');

const DICTIONARY_URL = 'https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf';
const DICTIONARY_SHA = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const RULE_URL = 'https://revistas-filologicas.unam.mx/tlalocan/index.php/tl/article/download/550/562/924';
const RULE_SHA = '7d9f6da17cbfeadb7da4bd2af0ff38fa4a90d6e52141d1d7852b73a34ffbb1cb';
const FOOD_INCORPORATION_PROOF = {
  kind: 'one-reviewed-food-noun-incorporation-reference',
  noun: { headword: 'ĒTL', pdfPage: 200, combiningStemMetadata: 'ē-', compositionStem: 'ē', selectedMeaning: 'beans' },
  verb: { headword: 'CUĀ', pdfPage: 142, compositionStem: 'cuā', sourceFrame: 'nic', selectedMeaning: 'eat' },
  models: [
    { compoundHeadword: 'ĒLŌCUĀ', compoundPdfPage: 197, sourceFrame: 'ni', nounHeadword: 'ĒLŌTL', nounPdfPage: 197, nounCombiningStemMetadata: 'ēlō-', selectedMeaning: 'eat fresh maize' },
    { compoundHeadword: 'NACACUĀ', compoundPdfPage: 336, sourceFrame: 'ni', nounHeadword: 'NACATL', nounPdfPage: 337, nounCombiningStemMetadata: 'naca-', selectedMeaning: 'eat meat' }
  ],
  mechanismReference: { sourceUrl: RULE_URL, sourceFileSha256: RULE_SHA, varietyPdfPage: 3, incorporationPdfPage: 4, community: 'Tzocohuite', varietyCode: 'nhe' },
  composition: { foodNounStem: 'ē', lexicalVerbStem: 'cuā', authoredReferenceForm: 'ēcuā', learnerDisplay: 'ekwa', modeledArgumentFrame: 'food-object-incorporated; subject-only ni frame in the exact comparison models' },
  directWholeFormAttestationClaimed: false,
  genericIncorporationGeneratorApproved: false,
  arbitraryAllomorphApproved: false,
  completeStandaloneUtteranceClaimed: false,
  fullConjugationApproved: false,
  targetVerbClassCertificationClaimed: false,
  pronunciationCertificationClaimed: false,
  recordedSourceAudioClaimed: false,
  sourceExampleCopied: false
};
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function governingDefinition(reference, pageNumber, headword, partOfSpeech, frame) {
  assert.ok(Number.isInteger(pageNumber) && pageNumber >= 16 && pageNumber <= reference.pages.length);
  const page = reference.pages[pageNumber - 1];
  assert.equal(page.pdf_page, pageNumber);
  assert.equal(typeof page.text, 'string');
  const pattern = new RegExp(`^${escapePattern(headword)}\\.\\s+${escapePattern(partOfSpeech)}\\.${frame ? `\\s+${escapePattern(frame)}\\.` : ''}`, 'm');
  const head = pattern.exec(page.text);
  assert.ok(head, `Missing exact modern ${headword} head/frame`);
  const rest = page.text.slice(head.index + head[0].length);
  const next = rest.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  const body = rest.slice(0, next < 0 ? undefined : next);
  assert.ok(!/axcanah\s+motequihuia\s+icelti/u.test(body), 'A dependent root is not the reviewed complete model');
  assert.ok(!body.includes('['), 'Historical-source definition cannot supply this modern model');
  return body;
}

// One reference composition, not an arbitrary lemma or inflection generator.
// The frozen independent semantic review supplies the model/sense adjudication.
function verifyFoodIncorporationReferenceForm(entry, dictionary, dictionaryFileHash, mechanism, mechanismFileHash) {
  const loc = entry.sourceLocator;
  assert.equal(dictionaryFileHash, DICTIONARY_SHA);
  assert.equal(dictionary.source_sha256, DICTIONARY_SHA);
  assert.equal(dictionary.reference_url, DICTIONARY_URL);
  assert.equal(mechanismFileHash, RULE_SHA);
  assert.equal(mechanism.source_sha256, RULE_SHA);
  assert.equal(mechanism.reference_url, RULE_URL);
  assert.equal(loc.sourceType, 'productive-food-incorporation-form');
  assert.equal(loc.referenceFileSha256, DICTIONARY_SHA);
  assert.equal(loc.referencePdfPage, 200);
  assert.equal(loc.referenceHeadword, 'ĒTL');
  assert.equal(loc.attestedHeadword, null);
  assert.equal(entry.sourceUrl, DICTIONARY_URL + '#page=200');
  assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(entry.sourceSpelling, 'ēcuā');
  assert.equal(entry.display, 'ekwa');
  assert.equal(entry.meaningEn, 'eat beans (verb reference)');
  assert.equal(entry.meaningEs, 'comer frijoles (referencia verbal)');
  assert.equal(entry.partOfSpeech, 'incorporated-object verb reference');
  assert.equal(entry.formKind, 'rule-composed-reference-form');
  assert.equal(entry.verification.formEvidence, 'independently-reviewed-rule-composition');
  assert.equal(entry.audioUrl, null); assert.equal(entry.audioKind, 'missing');
  assert.deepEqual(loc.foodIncorporationProof, FOOD_INCORPORATION_PROOF);
  const noun = governingDefinition(dictionary, 200, 'ĒTL', 'tlat');
  assert.ok(/tlazal\.\s+ē-\./u.test(noun), 'Missing exact ē- combining stem inside ĒTL');
  governingDefinition(dictionary, 142, 'CUĀ', 'tlach4', 'nic');
  for (const model of FOOD_INCORPORATION_PROOF.models) {
    const compound = governingDefinition(dictionary, model.compoundPdfPage, model.compoundHeadword, 'tlach4', 'ni');
    const decomposition = new RegExp(`achi\\.\\s+${escapePattern(model.nounHeadword)},\\s+CUĀ\\.`, 'u');
    assert.ok(decomposition.test(compound), 'Missing exact incorporated-food model decomposition');
    const modelNoun = governingDefinition(dictionary, model.nounPdfPage, model.nounHeadword, 'tlat');
    const stem = new RegExp(`tlazal\\.\\s+${escapePattern(model.nounCombiningStemMetadata)}\\.`, 'u');
    assert.ok(stem.test(modelNoun), 'Missing exact combining stem inside model noun');
  }
  const variety = mechanism.pages.find(page => page.pdf_page === 3)?.text;
  const incorporation = mechanism.pages.find(page => page.pdf_page === 4)?.text;
  assert.equal(typeof variety, 'string'); assert.equal(typeof incorporation, 'string');
  assert.ok(variety.toLowerCase().includes('tzocohuite'));
  assert.ok(variety.toLowerCase().includes('huasteca oriental'));
  assert.ok(variety.includes('[nhe]'));
  assert.ok(incorporation.includes('incorporación nominal'));
}

module.exports = { verifyFoodIncorporationReferenceForm, FOOD_INCORPORATION_PROOF, DICTIONARY_URL, DICTIONARY_SHA, RULE_URL, RULE_SHA };
