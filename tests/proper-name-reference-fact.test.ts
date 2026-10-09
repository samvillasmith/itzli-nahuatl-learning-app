import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const { verifyProperNameReferenceFact } = createRequire(import.meta.url)("../scripts/lib/proper-name-reference-fact.js");
const hash = "62e0275b6ca19b25c2d77d1c78702827469b701a9dd0c152577b9a38140792ae";
const url = "https://septlaxcala.gob.mx/web/wp-content/uploads/2025/10/Libro-de-Texto-Gratuito-de-Educacion-Indigena-Tlaxcala-Flor-y-Canto.pdf";
function fixture() {
  const pages = { source_sha256: hash, reference_url: url, pages: [
    { pdf_page: 2, text: "Primera edición, 2024\nISBN: 978-607-26828-0-1\nDR. Secretaría de Educación Pública\nTlaxcala flor y canto: Tlaxkallan xochitl wan kwikatl" },
    { pdf_page: 4, text: "Tlaxkallan xochitl wan kwikatl: Tlaxcala flor y canto,\nnuestro Estado.\nSecretario de Educación Pública del Estado de Tlaxcala" },
  ] };
  const entry = { sourceSpelling: "Tlaxkallan", display: "tlaxkallan", sourceUrl: url + "#page=4", formKind: "attested-proper-name-reference", partOfSpeech: "proper-name",
    meaningEn: "Tlaxcala (state)", meaningEs: "Tlaxcala (estado)", audioUrl: null as string | null,
    sourceLocator: { sourceType: "individual-proper-name-reference-fact", sourceUrl: url + "#page=4", attestedHeadword: "Tlaxkallan", referencePdfPage: 4, referenceTextStart: 0, referenceFileSha256: hash,
      properNameProof: { kind: "one-official-modern-state-name", exactSourceForm: "Tlaxkallan", canonicalDisplay: "tlaxkallan", referent: { type: "mexican-federal-state", spanishName: "Tlaxcala" }, sourceRegion: "Tlaxcala", publicationYear: 2024, edition: "first", isbn: "978-607-26828-0-1",
        semanticEvidence: { bilingualTitlePdfPage: 4, copyrightPdfPage: 2, coverPdfPage: 1, pairedTitle: true, stateContextPresent: true }, easternDialectClaimed: false, pronunciationIdentityClaimed: false, grammaticalDerivationClaimed: false, generalProperNameGeneratorApproved: false, accessProvenance: "anonymous-official-state-publisher" } } };
  return { entry, pages };
}
const verify = (x: ReturnType<typeof fixture>) => verifyProperNameReferenceFact(x.entry, x.pages, hash);
describe("one official modern Tlaxcala name", () => {
  it("accepts the exact modern state name with qualified regional scope", () => expect(() => verify(fixture())).not.toThrow());
  it.each(["historical-spelling", "different-place", "city-only", "translation", "display", "media", "offset", "page", "source-url", "source-hash"])("rejects changed %s", change => {
    const x = fixture();
    if (change === "historical-spelling") x.entry.sourceSpelling = "Tlaxcallān";
    if (change === "different-place") x.entry.sourceLocator.properNameProof.referent.spanishName = "Hidalgo";
    if (change === "city-only") x.entry.sourceLocator.properNameProof.referent.type = "city";
    if (change === "translation") x.entry.meaningEs = "lugar de tortillas";
    if (change === "display") x.entry.display = "tlaxkala";
    if (change === "media") x.entry.audioUrl = "https://example.org/audio.mp3";
    if (change === "offset") x.entry.sourceLocator.referenceTextStart = 1;
    if (change === "page") x.entry.sourceLocator.referencePdfPage = 2;
    if (change === "source-url") x.entry.sourceUrl = "https://example.org/unauthorized";
    if (change === "source-hash") x.entry.sourceLocator.referenceFileSha256 = "a".repeat(64);
    expect(() => verify(x)).toThrow();
  });
  it.each(["Eastern", "pronunciation", "derivation", "generator", "account-access", "date", "ISBN"])("rejects unsupported %s proof", change => {
    const x = fixture(), p = x.entry.sourceLocator.properNameProof;
    if (change === "Eastern") p.easternDialectClaimed = true;
    if (change === "pronunciation") p.pronunciationIdentityClaimed = true;
    if (change === "derivation") p.grammaticalDerivationClaimed = true;
    if (change === "generator") p.generalProperNameGeneratorApproved = true;
    if (change === "account-access") p.accessProvenance = "Drive-account";
    if (change === "date") p.publicationYear = 1555;
    if (change === "ISBN") p.isbn = "unknown";
    expect(() => verify(x)).toThrow();
  });
  it.each(["name", "Spanish-pair", "state-context", "publisher", "copyright", "edition", "ISBN"])("rejects missing %s source fact", change => {
    const x = fixture(), page = x.pages.pages[1], copyright = x.pages.pages[0];
    if (change === "name") page.text = page.text.replace("Tlaxkallan", "Tlaxkala");
    if (change === "Spanish-pair") page.text = page.text.replace("Tlaxcala flor", "Puebla flor");
    if (change === "state-context") page.text = page.text.replace("nuestro Estado.", "old town.");
    if (change === "publisher") page.text = page.text.replace("Secretario de Educación Pública del Estado de Tlaxcala", "Anonymous speaker");
    if (change === "copyright") copyright.text = copyright.text.replace("DR. Secretaría de Educación Pública", "Unknown rights");
    if (change === "edition") copyright.text = copyright.text.replace("Primera edición, 2024", "Historical manuscript");
    if (change === "ISBN") copyright.text = copyright.text.replace("ISBN: 978-607-26828-0-1", "ISBN: unavailable");
    expect(() => verify(x)).toThrow();
  });
  it("rejects changed anonymous primary source identity", () => {
    const x = fixture(); expect(() => verifyProperNameReferenceFact(x.entry, x.pages, "a".repeat(64))).toThrow();
    x.pages.reference_url = "https://example.org/copy.pdf"; expect(() => verify(x)).toThrow();
  });
});

const ecatepecHash = "e060b608920c46aabd35747da43c736c5b444a6e02530993e7eb5f06da65aa42";
const ecatepecUrl = "https://ecatepec.gob.mx/wp-content/uploads/2025/06/1.8-Notas-a-los-Estados-Financieros-Notas-Desgloce-Memoria-y-Gestion-Administrativa.pdf";
function ecatepecFixture() {
  const pages = { source_sha256: ecatepecHash, reference_url: ecatepecUrl,
    extractionMethod: "manually-transcribed-selected-regions-from-scanned-primary-pages", fullPdfTextTranscribed: false,
    pages: [
      { pdf_page: 1, text: "Gobierno de Ecatepec de Morelos 2019-2021\n2020, Año de Laura Méndez de la Cuenca\nTESORERÍA MUNICIPAL\nDEL 01 DE ENERO AL 31 DE DICIEMBRE 2019\nEl municipio de Ecatepec de Morelos" },
      { pdf_page: 5, text: "Autorización e Historia (6)\nEl origen lingüístico de Ecatepec, proviene de la lengua náhuatl\nse le reconoció como municipio libre integrante del Estado de México." },
    ] };
  const entry = { sourceSpelling: "Ecatepec", display: "ekatepek", meaningEn: "Ecatepec de Morelos (municipality)", meaningEs: "Ecatepec de Morelos (municipio)",
    sourceUrl: ecatepecUrl + "#page=5", formKind: "attested-proper-name-reference", partOfSpeech: "proper-name", audioUrl: null as string | null,
    sourceLocator: { sourceType: "individual-proper-name-reference-fact", sourceUrl: ecatepecUrl + "#page=5", attestedHeadword: "Ecatepec", referencePdfPage: 5, referenceTextStart: 53, referenceFileSha256: ecatepecHash,
      properNameProof: { kind: "one-official-modern-municipality-name", exactSourceForm: "Ecatepec", canonicalDisplay: "ekatepek",
        referent: { type: "mexican-municipality", spanishName: "Ecatepec de Morelos", federalState: "Estado de México" },
        sourceRegion: "Estado de México", reportingYear: 2019, documentHeaderYear: 2020,
        semanticEvidence: { municipalHeaderPdfPage: 1, nameOriginPdfPage: 5, nameOriginRegion: "Autorización e Historia (6)", textMethod: "manual-selected-region-transcription", municipalityContextPresent: true, explicitNahuatlOriginPresent: true },
        orthographyEvidence: { exactNameOnly: true, sourceCToInaliK: true, windStemContractionRuleClaimed: false },
        easternDialectClaimed: false, pronunciationIdentityClaimed: false, grammaticalDerivationClaimed: false,
        commonNounMeaningClaimed: false, generalProperNameGeneratorApproved: false, accessProvenance: "anonymous-official-municipal-publisher" } } };
  return { entry, pages };
}
const verifyEcatepec = (x: ReturnType<typeof ecatepecFixture>) => verifyProperNameReferenceFact(x.entry, x.pages, ecatepecHash);
describe("one official Ecatepec municipality reference", () => {
  it("accepts only the municipality fact with its documented Nahuatl origin", () => expect(() => verifyEcatepec(ecatepecFixture())).not.toThrow());
  it.each(["name", "display", "English-etymology", "Spanish-common-noun", "wrong-referent", "city-only", "Eastern", "pronunciation", "contraction", "common-noun", "derivation", "generator"])("rejects unsupported %s", change => {
    const x = ecatepecFixture(), p = x.entry.sourceLocator.properNameProof;
    if (change === "name") x.entry.sourceSpelling = "Ehecatepec";
    if (change === "display") x.entry.display = "ekatepetl";
    if (change === "English-etymology") x.entry.meaningEn = "at wind hill";
    if (change === "Spanish-common-noun") x.entry.meaningEs = "cerro del viento";
    if (change === "wrong-referent") p.referent.spanishName = "Chicontepec";
    if (change === "city-only") p.referent.type = "city";
    if (change === "Eastern") p.easternDialectClaimed = true;
    if (change === "pronunciation") p.pronunciationIdentityClaimed = true;
    if (change === "contraction") p.orthographyEvidence.windStemContractionRuleClaimed = true;
    if (change === "common-noun") p.commonNounMeaningClaimed = true;
    if (change === "derivation") p.grammaticalDerivationClaimed = true;
    if (change === "generator") p.generalProperNameGeneratorApproved = true;
    expect(() => verifyEcatepec(x)).toThrow();
  });
  it.each(["name-token", "Nahuatl-origin", "municipality", "state", "publisher", "header-date", "reporting-date", "region-title"])("rejects missing %s primary evidence", change => {
    const x = ecatepecFixture(), header = x.pages.pages[0], page = x.pages.pages[1];
    if (change === "name-token") page.text = page.text.replace("de Ecatepec,", "de Puebla,");
    if (change === "Nahuatl-origin") page.text = page.text.replace("lengua náhuatl", "lengua desconocida");
    if (change === "municipality") header.text = header.text.replace("El municipio", "La ciudad");
    if (change === "state") page.text = page.text.replace("Estado de México.", "Estado de Veracruz.");
    if (change === "publisher") header.text = header.text.replace("TESORERÍA MUNICIPAL", "ANONYMOUS BLOG");
    if (change === "header-date") header.text = header.text.replace("2020, Año", "1900, Año");
    if (change === "reporting-date") header.text = header.text.replace("AL 31 DE DICIEMBRE 2019", "AL 31 DE DICIEMBRE 1919");
    if (change === "region-title") page.text = page.text.replace("Autorización e Historia (6)", "Some unrelated example");
    expect(() => verifyEcatepec(x)).toThrow();
  });
  it.each(["offset", "page", "hash", "source-url", "account-source", "manual-text-method", "whole-PDF-text-claim", "audio", "other-source-type", "free-noun-kind"])("rejects changed %s scope or provenance", change => {
    const x = ecatepecFixture();
    if (change === "offset") x.entry.sourceLocator.referenceTextStart = 52;
    if (change === "page") x.entry.sourceLocator.referencePdfPage = 1;
    if (change === "hash") x.entry.sourceLocator.referenceFileSha256 = hash;
    if (change === "source-url") x.pages.reference_url = url;
    if (change === "account-source") x.entry.sourceLocator.properNameProof.accessProvenance = "Drive-account";
    if (change === "manual-text-method") x.pages.extractionMethod = "automatic-complete-PDF-text";
    if (change === "whole-PDF-text-claim") x.pages.fullPdfTextTranscribed = true;
    if (change === "audio") x.entry.audioUrl = "https://example.org/invented.mp3";
    if (change === "other-source-type") x.entry.sourceLocator.sourceType = "productive-nominal-form";
    if (change === "free-noun-kind") x.entry.formKind = "lexical-headword";
    expect(() => verifyEcatepec(x)).toThrow();
  });
  it("rejects cross-pinned PDF identities", () => {
    const x = ecatepecFixture(); expect(() => verifyProperNameReferenceFact(x.entry, x.pages, hash)).toThrow();
    const other = fixture(); expect(() => verifyProperNameReferenceFact(other.entry, other.pages, ecatepecHash)).toThrow();
  });
});
