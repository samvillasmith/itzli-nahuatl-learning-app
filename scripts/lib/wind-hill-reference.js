const assert = require('node:assert/strict');
const DICTIONARY_URL = 'https://www.nahuatlhuasteca.com/NahuatlSullivanDictionaryTlahtolxitlauhcayotl_Chicontepec_Veracru.pdf';
const DICTIONARY_SHA = 'bca334b50f02a5c83b90669007693fddcdee761fa0314616e53af6b2e79e1fbc';
const RULE_URL = 'https://scholars.sil.org/david_h_tuggy/es/publicaciones/nahuatl_lecciones/10';
const RULE_SHA = '3d72a2266875acbce7b6685bf2eb0d1486e7088a3bf76bfaa30b19f83b0b2dbe';
const WIND_HILL_PROOF = {
  kind: 'one-reviewed-wind-modified-hill-reference',
  components: [{ headword: 'EHĒCATL', pdfPage: 194, selectedSense: 1, combiningStem: 'ehēca-', selectedMeaning: 'wind' }, { headword: 'TEPĒTL', pdfPage: 456, selectedMeaning: 'hill / mountain' }],
  mechanismReference: { sourceUrl: RULE_URL, sourceFileSha256: RULE_SHA, ruleSection: '10.1', variety: 'Modern Orizaba; nominal-composition structural comparison only', nominalHeadRule: 'first noun modifies second nominal head; second absolute ending retained' },
  composition: { firstCombiningStem: 'ehēca', secondNominalHead: 'tepētl', authoredReferenceForm: 'ehēcatepētl', learnerDisplay: 'ehekatepetl', selectedRelation: 'hill associated with wind' },
  directWholeFormAttestationClaimed: false, unrestrictedGeneratorApproved: false,
  firstSyllableDeletionRuleClaimed: false, arbitraryAllomorphApproved: false,
  exactNamedGeographicalHillClaimed: false, locativeEkatepekEquivalenceClaimed: false,
  completeStandaloneUtteranceClaimed: false, fullPossessiveParadigmApproved: false,
  pronunciationCertificationClaimed: false, recordedSourceAudioClaimed: false,
  sourceProseOrExamplesCopied: false
};
function definition(dictionary, pageNumber, headword) {
  const page = dictionary.pages[pageNumber - 1]; assert.equal(page?.pdf_page, pageNumber);
  const pattern = new RegExp(`^${headword}\\.\\s+tlat\\.`, 'm'), head = pattern.exec(page.text);
  assert.ok(head, 'Missing exact modern noun head');
  const tail = page.text.slice(head.index + head[0].length);
  const next = tail.search(/^\p{Lu}[\p{Lu}\p{M}\d,-]*\.\s+(?:tlat\.|tlap\.|tlaten\.|pil\.|tlach(?:\d(?:\/\d)?)?\.|Xiquitta\b)/mu);
  const body = tail.slice(0, next < 0 ? undefined : next);
  assert.ok(!body.includes('[')); assert.ok(!/axcanah\s+motequihuia\s+icelti/u.test(body));
  return body;
}
function verifyWindHillReference(entry, dictionary, dictionaryHash, ruleHtml, ruleHash) {
  assert.equal(dictionaryHash, DICTIONARY_SHA); assert.equal(dictionary.source_sha256, DICTIONARY_SHA); assert.equal(dictionary.reference_url, DICTIONARY_URL);
  // The caller hashes the original file; this body gate checks its parsed evidence.
  assert.equal(ruleHash, RULE_SHA);
  const loc = entry.sourceLocator;
  assert.equal(loc.sourceType, 'productive-wind-hill-reference'); assert.equal(loc.attestedHeadword, null);
  assert.equal(loc.referenceFileSha256, DICTIONARY_SHA); assert.equal(loc.referenceHeadword, 'EHĒCATL'); assert.equal(loc.referencePdfPage, 194);
  assert.equal(entry.sourceUrl, DICTIONARY_URL + '#page=194'); assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(entry.sourceSpelling, 'ehēcatepētl'); assert.equal(entry.display, 'ehekatepetl');
  assert.equal(entry.meaningEn, 'wind hill (modeled noun)'); assert.equal(entry.meaningEs, 'cerro del viento (sustantivo modelado)');
  assert.equal(entry.partOfSpeech, 'noun reference'); assert.equal(entry.formKind, 'rule-composed-reference-form');
  assert.equal(entry.verification.formEvidence, 'qualified-reviewed-rule-composition');
  assert.equal(entry.audioUrl, null); assert.equal(entry.audioKind, 'missing');
  assert.deepEqual(loc.windHillProof, WIND_HILL_PROOF);
  assert.ok(/tlazal\.\s+ehēca-\./u.test(definition(dictionary, 194, 'EHĒCATL')), 'Unchanged wind combining stem not found inside governing head');
  definition(dictionary, 456, 'TEPĒTL');
  const text = ruleHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  assert.ok(ruleHtml.includes('href="' + RULE_URL + '"')); assert.ok(text.includes('Nawatl de Orizaba'));
  assert.ok(text.includes('10.1 Raíces compuestas sustantivas')); assert.ok(text.includes('S 1 + S 2 = S;'));
  assert.ok(text.includes('absolutivos')); assert.ok(text.includes('segunda raíz componente'));
  assert.equal(entry.sourceSpelling, 'ehēca' + 'tepētl');
}
module.exports = { verifyWindHillReference, WIND_HILL_PROOF, DICTIONARY_URL, DICTIONARY_SHA, RULE_URL, RULE_SHA };
