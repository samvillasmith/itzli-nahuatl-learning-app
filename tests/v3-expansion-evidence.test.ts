import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import source from "../src/data/nahuatlahtolli-course.json";
import lexicon from "../src/data/v3-verified-lexicon.json";
import originalCourse from "../src/data/v3-original-course.json";
import { toInaliOrthography } from "../src/lib/orthography";
import { getAllPrimerVocab } from "../src/lib/db";
import { getExpansionEntries } from "../src/data/lexical-expansion";
import { normalizeExpansionResponse } from "../src/lib/expansion-course";
import { asExpansionPracticeEntry, getVerifiedExpansionEntries } from "../src/data/v3-expansion";
import { isAppContentExcluded } from "../src/lib/app-content-safety";

describe("V3 expansion evidence and legacy preservation", () => {
  it("preserves main-course pronoun card55 and its exact canonical recording", () => {
    const entry = getVerifiedExpansionEntries().find(word => word.legacyMainCourseVocabId === 55)!;
    const original = source.lessons.find(lesson => lesson.number === 3)!.vocabulary[5];
    expect(entry.display).toBe("inihwantin");
    expect(entry.newToCourse).toBe(false);
    expect(entry.sourceSpelling).toBe(original.headword);
    expect(entry.audioUrl).toBe(original.audioUrl);
    expect(entry.referenceAliases).toEqual(["yahwantin"]);
    expect(asExpansionPracticeEntry(entry).legacyMainCourseVocabId).toBe(55);
  });
  it("retains the original source identity and recording when reviewing a lexical spelling", () => {
    const entry = getVerifiedExpansionEntries().find(word => word.legacySourceVocabId === 801033)!;
    const original = source.lessons.find(lesson => lesson.number === 1)!.vocabulary[32];
    expect(entry.display).toBe("iwksi");
    expect(entry.sourceSpelling).toBe(original.headword);
    expect(entry.audioUrl).toBe(original.audioUrl);
    const practice = asExpansionPracticeEntry(entry);
    expect(practice.legacySourceVocabId).toBe(801033);
    expect(practice.id).toBe(entry.id);
  });
  it("keeps earlier identities and genuinely separates new forms from their anchors", () => {
    const earlier = [...getAllPrimerVocab().map(entry => entry.headword), ...getExpansionEntries().map(entry => entry.headword)];
    const earlierKeys = new Set(earlier.map(normalizeExpansionResponse));
    expect(getAllPrimerVocab()).toHaveLength(460);
    expect(getExpansionEntries()).toHaveLength(73);
    expect(new Set(lexicon.entries.map(entry => entry.id)).size).toBe(lexicon.entries.length);
    const newEntries = lexicon.entries.filter(entry => entry.newToCourse);
    expect(new Set(newEntries.map(entry => normalizeExpansionResponse(entry.display))).size).toBe(newEntries.length);
    for (const entry of newEntries) expect(earlierKeys.has(normalizeExpansionResponse(entry.display)), entry.display).toBe(false);
    expect(lexicon.counts.newWrittenForms).toBe(newEntries.length);
    expect(getVerifiedExpansionEntries()).toHaveLength(lexicon.entries.filter(entry =>
      !isAppContentExcluded(entry.id, entry.display, entry.sourceSpelling, entry.meaningEn, entry.meaningEs,
        entry.partOfSpeech)).length);
    expect(lexicon.counts.verifiedUniqueLemmaCount).toBeNull();
    expect(lexicon.counts.writtenItemTarget).toBe(1551);
    expect(lexicon.counts.appDistinctWrittenForms).toBe(new Set([...earlierKeys, ...newEntries.map(entry => normalizeExpansionResponse(entry.display))]).size);
    expect(lexicon.counts.remainingToTarget).toBe(lexicon.counts.remainingOriginalTargetItems);
    expect(lexicon.counts.originalTargetCovered + lexicon.counts.remainingOriginalTargetItems).toBe(1551);
    expect(lexicon.counts.originalTargetCovered + lexicon.counts.additionsOutsideOriginalTarget - lexicon.counts.originalTargetReferenceAliases).toBe(lexicon.counts.appDistinctWrittenForms);
    expect(lexicon.counts.originalTargetDistinctWrittenFormsPresent + lexicon.counts.originalTargetReferenceAliases).toBe(lexicon.counts.originalTargetPresent);
    expect(lexicon.counts.originalTargetPresent).toBe(lexicon.counts.originalTargetCovered);
    expect(524 + lexicon.counts.newTargetSenseSupportedForms + lexicon.counts.presentNewTargetFormsWithSenseUnresolved).toBe(lexicon.counts.originalTargetPresent);
  });
  it("retains the exact independent word locator and never guesses audio", () => {
    const hash = createHash("sha256").update(readFileSync("src/data/nahuatlahtolli-course.json")).digest("hex");
    for (const entry of getVerifiedExpansionEntries()) {
      expect(entry.display).toBe(toInaliOrthography(entry.sourceSpelling).toLowerCase().trim());
      expect(entry.verification.status).toBe("source-supported");
      const loc = entry.sourceLocator;
      if (loc.sourceType !== "licensed-course") {
        const url = new URL(entry.sourceUrl);
        if (loc.sourceType === "individual-dictionary-fact") expect(url.hostname).toBe("nahuatl.wired-humanities.org");
        else if (loc.sourceType === "individual-getty-ehn-note-fact") {
          expect(url.hostname).toBe("www.getty.edu");
          expect(entry.display).toBe("keniwkatsa");
          expect(loc.gettyNoteFactProof.generalFinalNRemovalRuleClaimed).toBe(false);
          expect(loc.gettyNoteFactProof.sourceNoteProseReused).toBe(false);
          expect(loc.gettyNoteFactProof.mediaReuseLicenseClaimed).toBe(false);
        } else if (loc.sourceType === "individual-inali-courtesy-fact") {
          expect(url.hostname).toBe("site.inali.gob.mx");
          expect(entry.display).toBe("tlasohkamati");
          expect(loc.providerEvidenceSha256).toMatch(/^[a-f0-9]{64}$/);
          expect(loc.inaliCourtesyFactProof.sourceServerByteIntegrityClaimed).toBe(false);
          expect(loc.inaliCourtesyFactProof.transitiveAppreciateObjectSenseApproved).toBe(false);
        }
        else if (loc.sourceType === "individual-proper-name-reference-fact") {
          if (loc.properNameProof.kind === "one-official-modern-municipality-name") {
            expect(url.hostname).toBe("ecatepec.gob.mx");
            expect(entry.display).toBe("ekatepek");
            expect(loc.properNameProof.commonNounMeaningClaimed).toBe(false);
          } else {
            expect(url.hostname).toBe("septlaxcala.gob.mx");
            expect(entry.display).toBe("tlaxkallan");
          }
          expect(entry.formKind).toBe("attested-proper-name-reference");
          expect(loc.properNameProof.easternDialectClaimed).toBe(false);
          expect(loc.properNameProof.generalProperNameGeneratorApproved).toBe(false);
        } else if (loc.sourceType === "individual-ehn-corpus-fact") {
          expect(url.hostname).toBe("ebible.org");
          expect(["nopona", "ipampa"]).toContain(entry.display);
          expect(loc.corpusFactProof.verseTextReused).toBe(false);
          expect(loc.corpusFactProof.generalMorphologyRuleClaimed).toBe(false);
          expect(loc.corpusFactProof.mediaReuseLicenseClaimed).toBe(false);
        }
        else if (loc.sourceType === "individual-modern-indexed-verb-reference") {
          expect(url.hostname).toBe("gdn.iib.unam.mx");
          expect(entry.display).toBe("sasaka");
          expect(entry.formKind).toBe("source-extracted-reference-form");
          expect(loc.indexedVerbReferenceProof.modernMultipleOriginSenseApproved).toBe(false);
          expect(loc.indexedVerbReferenceProof.EasternCommunityUsageCertified).toBe(false);
          expect(loc.indexedVerbReferenceProof.genericPrefixRemovalGeneratorApproved).toBe(false);
        }
        else if (loc.sourceType === "individual-local-reference-fact") {
          expect(entry.sourceUrl).toBe("https://jaltocan.gob.mx/jaltocan-hidalgo/nomenclatura");
          expect(entry.formKind).toBe("place-name-lexical-reference");
          expect(entry.sourceSpelling).toBe("tosan");
          expect(loc.localReferenceProof.completeStandaloneSpokenWordClaimed).toBe(false);
          expect(loc.localReferenceProof.independentEasternSpeakerCertificationClaimed).toBe(false);
          expect(loc.localReferenceProof.referenceFileSha256).toBe("2d32c9317f59962dabeb2eb3a0d9b4ec918497c993b290c37708a1de12f2c0fd");
        }
        else if (loc.sourceType === "productive-cardinal-form") {
          expect(url.hostname).toBe("tlahtolli.coerll.utexas.edu");
          expect(entry.formKind).toBe("rule-composed-cardinal");
          expect(loc.authoredReferenceForm).toBe("nauhpōhualli huan mahtlactli");
          expect(loc.numberProof.resultValue).toBe(90);
          expect(loc.numberProof.ordinalClaimed).toBe(false);
          expect(loc.numberProof.generalizedNumberGeneratorApproved).toBe(false);
          expect(loc.numberProof.directWholeFormAttestationClaimed).toBe(false);
        } else if (loc.sourceType === "productive-wind-hill-reference") {
          expect(url.hostname).toBe("www.nahuatlhuasteca.com");
          expect(entry.display).toBe("ehekatepetl");
          expect(loc.windHillProof.firstSyllableDeletionRuleClaimed).toBe(false);
          expect(loc.windHillProof.exactNamedGeographicalHillClaimed).toBe(false);
          expect(loc.windHillProof.directWholeFormAttestationClaimed).toBe(false);
        } else if (loc.sourceType === "productive-human-feeding-form") {
          expect(url.hostname).toBe("www.nahuatlhuasteca.com");
          expect(entry.display).toBe("nimitstlakwaltia");
          expect(loc.humanFeedingProof.religiousOfferingSenseTransferredToHumanFeeding).toBe(false);
          expect(loc.humanFeedingProof.unrestrictedCausativeGeneratorApproved).toBe(false);
          expect(loc.humanFeedingProof.directlyAttestedWholeFormClaimed).toBe(false);
        } else if (loc.sourceType === "productive-reviewed-modern-compound") {
          expect(url.hostname).toBe("www.nahuatlhuasteca.com");
          expect(entry.formKind).toBe("rule-composed-reference-form");
          expect(loc.modernCompoundProof.directWholeFormAttestationClaimed).toBe(false);
          expect(loc.modernCompoundProof.unrestrictedGeneratorApproved).toBe(false);
          expect(loc.modernCompoundProof.pronunciationCertificationClaimed).toBe(false);
          expect(loc.modernCompoundProof.sourceProseOrExamplesCopied).toBe(false);
        } else if (loc.sourceType === "productive-abstract-noun-reference") {
          expect(url.hostname).toBe("www.nahuatlhuasteca.com");
          expect(entry.formKind).toBe("rule-composed-reference-form");
          expect(loc.abstractNounProof.genericAbstractNounGeneratorApproved).toBe(false);
          expect(loc.abstractNounProof.lexicalizedHistorySenseApproved).toBe(false);
          expect(loc.abstractNounProof.directWholeFormAttestationClaimed).toBe(false);
        } else if (loc.sourceType === "productive-antipassive-drinking-form") {
          expect(url.hostname).toBe("dgeiib.basica.sep.gob.mx");
          expect(entry.display).toBe("nitlai");
          expect(entry.meaningEn).toBe("I drink alcohol");
          expect(loc.antipassiveDrinkingProof.alcoholOnlyMeaning).toBe(true);
          expect(loc.antipassiveDrinkingProof.broaderPlainDrinkingApproved).toBe(false);
          expect(loc.antipassiveDrinkingProof.generalAntipassiveGeneratorApproved).toBe(false);
        } else if (loc.sourceType === "productive-water-diminutive-reference") {
          expect(url.hostname).toBe("www.nahuatlhuasteca.com");
          expect(entry.display).toBe("atsin");
          expect(loc.waterDiminutiveProof.easternRespectfulWaterUseCertified).toBe(false);
          expect(loc.waterDiminutiveProof.generalOptionalPilRuleClaimed).toBe(false);
          expect(loc.waterDiminutiveProof.quantitativeRequestMeaningClaimed).toBe(false);
          expect(loc.waterDiminutiveProof.directlyAttestedChicontepecBareWaterUseClaimed).toBe(false);
        } else if (loc.sourceType === "productive-food-incorporation-form") {
          expect(url.hostname).toBe("www.nahuatlhuasteca.com");
          expect(entry.display).toBe("ekwa");
          expect(loc.attestedHeadword).toBeNull();
          expect(loc.foodIncorporationProof.directWholeFormAttestationClaimed).toBe(false);
          expect(loc.foodIncorporationProof.genericIncorporationGeneratorApproved).toBe(false);
          expect(loc.foodIncorporationProof.fullConjugationApproved).toBe(false);
          expect(loc.foodIncorporationProof.composition).toMatchObject({ authoredReferenceForm: "ēcuā", foodNounStem: "ē", lexicalVerbStem: "cuā" });
        } else if (loc.sourceType === "productive-sixty-plus-ten-form") {
          expect(url.hostname).toBe("dgeiib.basica.sep.gob.mx");
          expect(entry.formKind).toBe("rule-composed-cardinal");
          expect(loc.authoredReferenceForm).toBe("expowalli huan mahtlactli");
          expect(loc.numberProof.resultValue).toBe(70);
          expect(loc.numberProof.ordinalClaimed).toBe(false);
          expect(loc.numberProof.generalizedNumberGeneratorApproved).toBe(false);
          expect(loc.numberProof.directWholeFormAttestationClaimed).toBe(false);
        } else if (loc.sourceType === "productive-prohibition-form") {
          expect(url.hostname).toBe("tlahtolli.coerll.utexas.edu");
          expect(entry.formKind).toBe("rule-composed-prohibition");
          expect(loc.authoredReferenceForm).toBe("amo xiyāuh");
          expect(loc.referenceHeadword).toBe("YĀ1");
          expect(loc.referencePdfPage).toBe(615);
          expect(loc.prohibitionProof.subject).toEqual({ person: 2, number: "singular" });
          expect(loc.prohibitionProof.honorificClaimed).toBe(false);
          expect(loc.prohibitionProof.generalizedNegativeCommandGeneratorApproved).toBe(false);
          expect(loc.prohibitionProof.directWholeFormAttestationClaimed).toBe(false);
        }
        else if (loc.sourceType === "individual-public-reference-fact") {
          expect(["dgeiib.basica.sep.gob.mx", "www.huastecamexico.com", "ine.mx", "xochitlahtolli.wordpress.com", "www.aveligob.mx"]).toContain(url.hostname);
          expect(url.hash).toBe(`#page=${loc.referencePdfPage}`);
          expect(["c25887473619870cd9dd7e2a2ce1f63ae73e82ef8e554940e02cd4be95511166", "c5f6de7e12a2e3d505f03a66e3db83a26c7c3c8a564eb6dd8e73c2f597e4febf", "0754cb3948eaac35c5d46d9cdc0a141c3a12e413837f4946f67968604dac4e71", "ee7492f033ec5487978e1459b0aad6fa49ab187d060b2d90bcbf3b0f6019312b", "8a18deb6de8e7e0022ee5494bc10aa1f2ab03fe617aa25d16f96a81fc023e665", "a46b8ead3187dfcd893c286ba09d756414903f81656b35dcd814352390bdb100", "5b46e28429f80f890b36e59d119ce7305ab6cdb8d0a28ccfbb9c23457a0ce935"]).toContain(loc.referenceFileSha256);
          expect(loc.referenceTextStart).toBeGreaterThanOrEqual(0);
        } else {
          expect(url.hostname).toBe("www.nahuatlhuasteca.com");
          expect(url.hash).toBe(`#page=${loc.referencePdfPage}`);
          expect(loc.referenceFileSha256).toMatch(/^[a-f0-9]{64}$/);
          expect(loc.referencePdfPage).toBeGreaterThanOrEqual(16);
          if (loc.sourceType === "productive-verb-form") {
            expect(loc.authoredReferenceForm).toBe(entry.sourceSpelling);
            expect(loc.subject.number).toBe("singular");
            expect([1, 3]).toContain(loc.subject.person);
            expect(loc.subjectPrefix).toBe(loc.subject.person === 1 ? "ni" : "");
            expect([null, "mitz", "nech", "mo", "tē"]).toContain(loc.objectPrefix);
            if (["nech", "tē"].includes(loc.objectPrefix ?? "")) expect(loc.subject.person).toBe(3);
            else expect(loc.subject.person).toBe(1);
            expect(["present", "future"]).toContain(loc.tense);
            if (loc.tense === "future") {
              expect(loc.referenceHeadword).toBe("TLAHPALOĀ");
              expect(loc.objectPrefix).toBe("mitz");
              expect(loc.numberSuffix).toBe("z");
              expect(loc.compositionNoStemChanges).toBe(false);
            } else {
              expect(loc.numberSuffix).toBe("");
              expect(loc.compositionNoStemChanges).toBe(true);
            }
            expect(loc.directWholeFormAttestationClaimed).toBe(false);
          } else if (loc.sourceType === "productive-nominal-form") {
            expect(entry.formKind).toBe("rule-composed-relational-form");
            expect(loc.referenceHeadword).toBe("TEPĒTL");
            expect(loc.authoredReferenceForm).toBe(entry.sourceSpelling);
            expect(["icxitlan", "tzintlan"]).toContain(loc.nominalProof.relationalTerm);
            expect(loc.nominalProof.directWholeFormAttestationClaimed).toBe(false);
            expect(loc.nominalProof.predicateAsserted).toBe(false);
            expect(loc.nominalProof.possessorPrefix).toBeNull();
          } else if (loc.sourceType === "productive-agent-noun-form") {
            expect(entry.formKind).toBe("rule-composed-agent-noun");
            expect(loc.authoredReferenceForm).toBe(entry.sourceSpelling);
            expect(["CHŌCA", "MACHTIĀ", "MICTIĀ", "XŌCHINAMACA1"]).toContain(loc.referenceHeadword);
            expect(loc.agentNounProof.directWholeFormAttestationClaimed).toBe(false);
            expect(loc.agentNounProof.finitePredicateAsserted).toBe(false);
            expect(loc.agentNounProof.generalizedAgentNounGeneratorApproved).toBe(false);
            expect(loc.agentNounProof.pluralAgentRuleApproved).toBe(false);
          } else if (loc.sourceType === "productive-possessed-agent-form") {
            expect(entry.formKind).toBe("rule-composed-possessed-agent");
            expect(loc.authoredReferenceForm).toBe(entry.sourceSpelling);
            expect(loc.referenceHeadword).toBe("TLAYECĀNQUĒTL");
            expect(loc.possessedAgentProof.possessorPrefix).toBe("no");
            expect(loc.possessedAgentProof.possessor).toEqual({ person: 1, number: "singular" });
            expect(["singular", "plural"]).toContain(loc.possessedAgentProof.possessedNumber);
            expect(loc.possessedAgentProof.directWholeFormAttestationClaimed).toBe(false);
            expect(loc.possessedAgentProof.generalizedPossessedAgentGeneratorApproved).toBe(false);
          } else if (loc.sourceType === "productive-state-verb-form") {
            expect(entry.formKind).toBe("rule-composed-state-verb");
            expect(loc.referenceHeadword).toBe("YŌLCUECIHUI");
            expect(loc.authoredReferenceForm).toBe("yōlcueciuhtoc");
            expect(loc.stateVerbProof.subject).toEqual({ person: 3, number: "singular", animacy: "human" });
            expect(loc.stateVerbProof.generalizedStateGeneratorApproved).toBe(false);
            expect(loc.stateVerbProof.directWholeFormAttestationClaimed).toBe(false);
          } else if (loc.sourceType === "individual-reference-alias") {
            expect(loc.referenceAliasEvidence.kind).toBe("explicit-headword-redirect");
            expect(loc.referenceAliasEvidence.aliasHeadword).toBe(loc.referenceHeadword);
            expect(loc.referenceAliasEvidence.canonicalHeadword).toBe(loc.referenceCanonicalHeadword);
            expect(loc.referenceAliasEvidence.exactPrintedRedirect).toBe(`${loc.referenceHeadword}. Xiquitta ${loc.referenceCanonicalHeadword}.`);
            expect(["ni", "nimo"]).toContain(loc.referenceAliasEvidence.canonicalFrame);
          } else if (loc.sourceType === "productive-reference-form") {
            expect(loc.componentHeadwordPdfPage).toBe(loc.referencePdfPage);
            expect(loc.authoredReferenceForm).toBe(entry.sourceSpelling);
            expect(["no", "i"]).toContain(loc.possessorPrefix);
            expect(entry.verification.limitationsEn).toContain("composition");
          } else if (loc.sourceType === "individual-reference-stem") {
            expect(loc.referenceStem === `-${entry.sourceSpelling}` || loc.referenceStem === `${entry.sourceSpelling}-`).toBe(true);
            expect(["bound-stem", "possessed-stem", "relational-base"]).toContain(entry.formKind);
          } else if (loc.sourceType === "individual-reference-form") {
            expect(Number.isInteger(loc.referenceHeadwordPdfPage)).toBe(true);
            expect(loc.referenceHeadwordPdfPage).toBeGreaterThanOrEqual(16);
            expect(Number.isInteger(loc.referenceTextStart)).toBe(true);
            expect(loc.referenceTextStart).toBeGreaterThanOrEqual(0);
          } else expect(toInaliOrthography(loc.referenceHeadword.replace(/[1-9]$/, "")).toLowerCase()).toBe(entry.display);
        }
        expect(loc.sourceUrl).toBe(entry.sourceUrl);
        if (loc.sourceType.startsWith("productive-") || ["individual-reference-stem", "individual-modern-indexed-verb-reference"].includes(loc.sourceType)) expect(loc.attestedHeadword).toBeNull();
        else expect(loc.attestedHeadword).toBe(entry.sourceSpelling);
        expect(loc.sourceFactReviewHash).toMatch(/^[a-f0-9]{64}$/);
        expect(loc.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(loc.sourceFieldLocators.length).toBeGreaterThan(0);
        expect(loc.sourceImportSha256).toBeNull();
        expect(loc.lessonNumber).toBeNull();
        expect(entry.audioUrl).toBeNull();
        if (loc.sourceType === "productive-cardinal-form") expect(entry.sourceLicense).toBe("CC BY-SA (publisher listing; version unspecified) for consulted COERLL grammar");
        else if (loc.sourceType === "productive-sixty-plus-ten-form") expect(entry.sourceLicense).toBe("Individual numeral facts consulted; COERLL grammar CC BY-SA (publisher listing; version unspecified); no SEP prose, compilation or media license claimed");
        else if (["productive-antipassive-drinking-form", "productive-water-diminutive-reference"].includes(loc.sourceType)) expect(entry.sourceLicense).toContain("COERLL separately lists CC BY-SA with version unspecified");
        else if (loc.sourceType === "productive-human-feeding-form") expect(entry.sourceLicense).toContain("Licensed COERLL person rules");
        else expect(entry.sourceLicense).not.toMatch(/CC BY-SA/);
        expect(entry.verification.limitationsEn).toBeTruthy();
        expect(entry.verification.limitationsEs).toBeTruthy();
        continue;
      }
      expect(loc.sourceType).toBe("licensed-course");
      expect(entry.sourceLocator.sourceImportSha256).toBe(hash);
      const lesson = source.lessons.find(item => item.number === loc.lessonNumber)!;
      expect(entry.sourceUrl).toBe(lesson.originalUrl);
      if (loc.vocabularyIndex !== null) {
        const word = lesson.vocabulary[loc.vocabularyIndex - 1];
        expect(word.headword).toBe(entry.sourceSpelling);
        expect(entry.audioUrl).toBe(word.audioUrl || null);
      } else {
        expect(lesson.sections[loc.sectionIndex!].body[loc.bodyIndex!]).toContain(entry.sourceSpelling);
        expect(entry.audioUrl).toBeNull();
      }
    }
  });
  it("uses only independently attested phrases, valid task answers and INALI display", () => {
    const phrases = new Map(originalCourse.phrases.map(phrase => [phrase.id, phrase]));
    for (const phrase of originalCourse.phrases) {
      const lesson = source.lessons.find(item => item.number === phrase.sourceLocator.lessonNumber)!;
      const loc = phrase.sourceLocator;
      const exact = loc.vocabularyIndex !== null ? lesson.vocabulary[loc.vocabularyIndex - 1]?.headword : lesson.sections[loc.sectionIndex!]?.body[loc.bodyIndex!];
      expect(exact, phrase.id).toContain(phrase.sourceText);
      expect(phrase.nahuatl).toBe(toInaliOrthography(phrase.sourceText));
      if (phrase.audioUrl) expect(lesson.vocabulary.some(word => word.headword === phrase.sourceText && word.audioUrl === phrase.audioUrl)).toBe(true);
    }
    for (const unit of originalCourse.units) {
      expect(unit.id).toMatch(/^v3-/);
      expect(unit.steps.length).toBeGreaterThan(0);
      for (const step of unit.steps) {
        for (const id of step.answerPhraseIds) expect(phrases.has(id)).toBe(true);
        if (step.kind === "recall") expect(!step.phraseId || !step.answerPhraseIds.includes(step.phraseId)).toBe(true);
        if (step.kind === "choice") {
          expect(step.answerPhraseIds.every(id => step.choices.includes(id))).toBe(true);
          expect(step.choices.some(id => !step.answerPhraseIds.includes(id))).toBe(true);
        }
      }
    }
  });
  it("does not export private book evidence or pretend that a live unspecified license states 4.0", () => {
    const serialized = JSON.stringify({ lexicon, originalCourse });
    expect(serialized).not.toMatch(/IMG_\d+|\.HEIC|private_book|printed_page|research_id|data\/research\//i);
    expect(lexicon.license.independentSourceLicense.publisherListingLabel).toBe("CC-BY-SA");
    expect(lexicon.license.independentSourceLicense.liveListingVersionStatus).toBe("not-specified-on-live-publisher-listing");
    expect(lexicon.entries.every(entry => entry.contentLicense === "CC BY-SA 4.0" && entry.attribution.authors.length > 0)).toBe(true);
    expect(getVerifiedExpansionEntries().filter(entry => entry.sourceLocator.sourceType === "licensed-course").every(entry => entry.attribution.authors.length === 5)).toBe(true);
    expect(lexicon.license.individualDictionaryFacts.sourceLicenseGranted).toBe(false);
    expect(lexicon.license.individualReferenceFacts.sourceLicenseGranted).toBe(false);
  });
});
