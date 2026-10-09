const assert = require('node:assert/strict');
const PDF_HASH = '62e0275b6ca19b25c2d77d1c78702827469b701a9dd0c152577b9a38140792ae';
const SOURCE_URL = 'https://septlaxcala.gob.mx/web/wp-content/uploads/2025/10/Libro-de-Texto-Gratuito-de-Educacion-Indigena-Tlaxcala-Flor-y-Canto.pdf';
const ECATEPEC_PDF_HASH = 'e060b608920c46aabd35747da43c736c5b444a6e02530993e7eb5f06da65aa42';
const ECATEPEC_SOURCE_URL = 'https://ecatepec.gob.mx/wp-content/uploads/2025/06/1.8-Notas-a-los-Estados-Financieros-Notas-Desgloce-Memoria-y-Gestion-Administrativa.pdf';

// Exactly two separately reviewed official place-name facts. Neither certifies an Eastern
// pronunciation, a dialect-wide naming rule or a historical-name generator.
function verifyProperNameReferenceFact(entry, pages, pdfHash) {
  if (entry.sourceSpelling === 'Ecatepec') return verifyEcatepecReferenceFact(entry, pages, pdfHash);
  const loc = entry.sourceLocator, proof = loc.properNameProof;
  assert.equal(pdfHash, PDF_HASH); assert.equal(pages.source_sha256, PDF_HASH); assert.equal(pages.reference_url, SOURCE_URL);
  assert.equal(loc.sourceType, 'individual-proper-name-reference-fact');
  assert.equal(entry.sourceSpelling, 'Tlaxkallan'); assert.equal(entry.display, 'tlaxkallan');
  assert.equal(entry.formKind, 'attested-proper-name-reference'); assert.equal(entry.partOfSpeech, 'proper-name');
  assert.equal(entry.meaningEn, 'Tlaxcala (state)'); assert.equal(entry.meaningEs, 'Tlaxcala (estado)');
  assert.equal(entry.audioUrl, null); assert.equal(loc.attestedHeadword, 'Tlaxkallan');
  assert.equal(entry.sourceUrl, SOURCE_URL + '#page=4'); assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(loc.referencePdfPage, 4); assert.equal(loc.referenceTextStart, 0); assert.equal(loc.referenceFileSha256, PDF_HASH);
  assert.deepEqual(proof, {
    kind: 'one-official-modern-state-name', exactSourceForm: 'Tlaxkallan', canonicalDisplay: 'tlaxkallan',
    referent: { type: 'mexican-federal-state', spanishName: 'Tlaxcala' },
    sourceRegion: 'Tlaxcala', publicationYear: 2024, edition: 'first', isbn: '978-607-26828-0-1',
    semanticEvidence: { bilingualTitlePdfPage: 4, copyrightPdfPage: 2, coverPdfPage: 1, pairedTitle: true, stateContextPresent: true },
    easternDialectClaimed: false, pronunciationIdentityClaimed: false, grammaticalDerivationClaimed: false, generalProperNameGeneratorApproved: false,
    accessProvenance: 'anonymous-official-state-publisher',
  });
  const page = pages.pages.find(x => x.pdf_page === 4)?.text; assert.equal(typeof page, 'string');
  assert.ok(page.startsWith('Tlaxkallan xochitl wan kwikatl: Tlaxcala flor y canto,'), 'Missing exact paired name title');
  assert.ok(page.includes('nuestro Estado.'), 'Missing modern state context');
  assert.ok(page.includes('Secretario de Educación Pública del Estado de Tlaxcala'), 'Missing state education attribution');
  const copyright = pages.pages.find(x => x.pdf_page === 2)?.text; assert.equal(typeof copyright, 'string');
  assert.ok(copyright.includes('Primera edición, 2024')); assert.ok(copyright.includes('ISBN: 978-607-26828-0-1'));
  assert.ok(copyright.includes('DR. Secretaría de Educación Pública'));
  assert.ok(copyright.includes('Tlaxcala flor y canto: Tlaxkallan xochitl wan kwikatl'));
}

function verifyEcatepecReferenceFact(entry, pages, pdfHash) {
  const loc = entry.sourceLocator;
  assert.equal(pdfHash, ECATEPEC_PDF_HASH); assert.equal(pages.source_sha256, ECATEPEC_PDF_HASH);
  assert.equal(pages.reference_url, ECATEPEC_SOURCE_URL);
  assert.equal(pages.extractionMethod, 'manually-transcribed-selected-regions-from-scanned-primary-pages');
  assert.equal(pages.fullPdfTextTranscribed, false);
  assert.equal(loc.sourceType, 'individual-proper-name-reference-fact');
  assert.equal(entry.sourceSpelling, 'Ecatepec'); assert.equal(entry.display, 'ekatepek');
  assert.equal(entry.formKind, 'attested-proper-name-reference'); assert.equal(entry.partOfSpeech, 'proper-name');
  assert.equal(entry.meaningEn, 'Ecatepec de Morelos (municipality)');
  assert.equal(entry.meaningEs, 'Ecatepec de Morelos (municipio)');
  assert.equal(entry.audioUrl, null); assert.equal(loc.attestedHeadword, 'Ecatepec');
  assert.equal(entry.sourceUrl, ECATEPEC_SOURCE_URL + '#page=5'); assert.equal(loc.sourceUrl, entry.sourceUrl);
  assert.equal(loc.referencePdfPage, 5); assert.equal(loc.referenceTextStart, 53);
  assert.equal(loc.referenceFileSha256, ECATEPEC_PDF_HASH);
  assert.deepEqual(loc.properNameProof, {
    kind: 'one-official-modern-municipality-name', exactSourceForm: 'Ecatepec', canonicalDisplay: 'ekatepek',
    referent: { type: 'mexican-municipality', spanishName: 'Ecatepec de Morelos', federalState: 'Estado de México' },
    sourceRegion: 'Estado de México', reportingYear: 2019, documentHeaderYear: 2020,
    semanticEvidence: { municipalHeaderPdfPage: 1, nameOriginPdfPage: 5, nameOriginRegion: 'Autorización e Historia (6)',
      textMethod: 'manual-selected-region-transcription', municipalityContextPresent: true, explicitNahuatlOriginPresent: true },
    orthographyEvidence: { exactNameOnly: true, sourceCToInaliK: true, windStemContractionRuleClaimed: false },
    easternDialectClaimed: false, pronunciationIdentityClaimed: false, grammaticalDerivationClaimed: false,
    commonNounMeaningClaimed: false, generalProperNameGeneratorApproved: false,
    accessProvenance: 'anonymous-official-municipal-publisher'
  });
  const header = pages.pages.find(item => item.pdf_page === 1)?.text;
  const text = pages.pages.find(item => item.pdf_page === 5)?.text;
  assert.equal(typeof header, 'string'); assert.equal(typeof text, 'string');
  assert.ok(header.includes('Gobierno de Ecatepec de Morelos 2019-2021'));
  assert.ok(header.includes('2020, Año de Laura Méndez de la Cuenca'));
  assert.ok(header.includes('TESORERÍA MUNICIPAL'));
  assert.ok(header.includes('DEL 01 DE ENERO AL 31 DE DICIEMBRE 2019'));
  assert.ok(header.includes('El municipio de Ecatepec de Morelos'));
  assert.ok(text.startsWith('Autorización e Historia (6)\nEl origen lingüístico de Ecatepec, proviene de la lengua náhuatl'));
  assert.equal(text.slice(loc.referenceTextStart, loc.referenceTextStart + entry.sourceSpelling.length), entry.sourceSpelling);
  assert.ok(text.includes('se le reconoció como municipio libre integrante del Estado de México.'));
}
module.exports = { verifyProperNameReferenceFact };
