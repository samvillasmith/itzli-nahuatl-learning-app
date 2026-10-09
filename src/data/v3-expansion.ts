import "server-only";
import lexicon from "./v3-verified-lexicon.json";
import type { ExpansionPracticeEntry } from "@/lib/expansion-practice";
import { filterAppSafeText } from "@/lib/app-content-safety";
import { reviewedVocabularyLabel } from "@/lib/reviewed-vocabulary-labels.cjs";
import { projectLearnerVocabularyNotes } from "@/lib/learner-vocabulary-notes";

export type ExpansionSourceLocator = {
  sourceType: "licensed-course";
  lessonNumber: number; vocabularyIndex: number | null; sectionIndex: number | null; bodyIndex: number | null;
  sourceImportSha256: string;
  sourceFactReviewHash?: string;
} | {
  sourceType: "individual-dictionary-fact";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: string; sourceFactReviewHash: string;
} | {
  sourceType: "individual-reference-fact" | "individual-reference-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: string; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  referenceHeadwordPdfPage?: number; referenceTextStart?: number;
} | {
  sourceType: "individual-public-reference-fact";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: string; sourceFactReviewHash: string;
  referencePdfPage: number; referenceTextStart: number; referenceFileSha256: string;
} | {
  sourceType: "individual-proper-name-reference-fact";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: string; sourceFactReviewHash: string;
  referencePdfPage: number; referenceTextStart: number; referenceFileSha256: string; properNameProof: Record<string, unknown>;
} | {
  sourceType: "individual-ehn-corpus-fact";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: string; sourceFactReviewHash: string;
  referenceFileSha256: string; corpusFactProof: Record<string, unknown>;
} | {
  sourceType: "individual-getty-ehn-note-fact";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: string; sourceFactReviewHash: string;
  referenceFileSha256: string; gettyNoteFactProof: Record<string, unknown>;
} | {
  sourceType: "individual-inali-courtesy-fact";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: string; sourceFactReviewHash: string;
  providerEvidenceSha256: string; inaliCourtesyFactProof: Record<string, unknown>;
} | {
  sourceType: "individual-local-reference-fact";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: string; sourceFactReviewHash: string;
  localReferenceProof: Record<string, unknown>;
} | {
  sourceType: "individual-reference-alias";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: string; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  referenceCanonicalHeadword: string; referenceCanonicalHeadwordPdfPage: number;
  referenceAliasEvidence: { kind: "explicit-headword-redirect"; exactPrintedRedirect: string; aliasHeadword: string;
    aliasPdfPage: number; canonicalHeadword: string; canonicalPdfPage: number; canonicalSelectedSense: string; canonicalFrame: string };
} | {
  sourceType: "individual-reference-stem";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  referenceStem: string; referenceStemEvidence: Record<string, unknown>;
} | {
  sourceType: "productive-verb-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  authoredReferenceForm: string; modernStemEvidence: Record<string, unknown>; grammarRuleLocators: Record<string, unknown>[];
  subjectPrefix: string; objectPrefix: string | null; subject: { person: number; number: string }; tense: string;
  object?: Record<string, unknown> | null; stemAllomorph?: Record<string, unknown> | null;
  numberSuffix: string; compositionNoStemChanges: boolean; directWholeFormAttestationClaimed: boolean;
} | {
  sourceType: "productive-nominal-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  authoredReferenceForm: string; nominalProof: Record<string, unknown>;
} | {
  sourceType: "productive-agent-noun-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  authoredReferenceForm: string; agentNounProof: Record<string, unknown>;
} | {
  sourceType: "productive-possessed-agent-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  authoredReferenceForm: string; possessedAgentProof: Record<string, unknown>;
} | {
  sourceType: "productive-state-verb-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  authoredReferenceForm: string; stateVerbProof: Record<string, unknown>;
} | {
  sourceType: "individual-modern-indexed-verb-reference";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referenceHeadword: string; referenceFileSha256: string; indexedVerbReferenceProof: Record<string, unknown>;
} | {
  sourceType: "productive-human-feeding-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string; humanFeedingProof: Record<string, unknown>;
} | {
  sourceType: "productive-wind-hill-reference";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string; windHillProof: Record<string, unknown>;
} | {
  sourceType: "productive-reviewed-modern-compound";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string; modernCompoundProof: Record<string, unknown>;
} | {
  sourceType: "productive-abstract-noun-reference";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string; abstractNounProof: Record<string, unknown>;
} | {
  sourceType: "productive-antipassive-drinking-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceFileSha256: string; antipassiveDrinkingProof: Record<string, unknown>;
} | {
  sourceType: "productive-water-diminutive-reference";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string; waterDiminutiveProof: Record<string, unknown>;
} | {
  sourceType: "productive-food-incorporation-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  foodIncorporationProof: Record<string, unknown>;
} | {
  sourceType: "productive-cardinal-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  authoredReferenceForm: string; numberProof: Record<string, unknown>;
} | {
  sourceType: "productive-sixty-plus-ten-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  authoredReferenceForm: string; numberProof: Record<string, unknown>;
} | {
  sourceType: "productive-prohibition-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null; sourceFactReviewHash: string;
  referencePdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  authoredReferenceForm: string; prohibitionProof: Record<string, unknown>;
} | {
  sourceType: "productive-reference-form";
  lessonNumber: null; vocabularyIndex: null; sectionIndex: null; bodyIndex: null; sourceImportSha256: null;
  sourceUrl: string; reviewedOn: string; sourceFieldLocators: string[]; attestedHeadword: null;
  authoredReferenceForm: string; sourceFactReviewHash: string;
  referencePdfPage: number; componentHeadwordPdfPage: number; referenceHeadword: string; referenceFileSha256: string;
  referencePossessedStem: string; possessorPrefix: string;
  referenceStemEvidence: Record<string, unknown>; grammarRuleLocator: Record<string, unknown>;
};
type ExpansionAttribution = {
  authors: string[]; publisher: string; title: string; url: string;
  licenseUrl: string | null; sourceLicenseListingUrl: string | null; changes: string;
  supplementalSources?: { title: string; url: string }[];
};
export type VerifiedExpansionEntry = Omit<(typeof lexicon.entries)[number], "sourceLocator" | "attribution"> & { sourceLocator: ExpansionSourceLocator; attribution: ExpansionAttribution; referenceAliases?: string[]; legacySourceVocabId?: number; legacyMainCourseVocabId?: number };
export const V3_EXPANSION_COUNTS = lexicon.counts;
export const V3_EXPANSION_LICENSE = lexicon.license;
const labeledEntries = (lexicon.entries as VerifiedExpansionEntry[]).map(entry => {
  const correction = reviewedVocabularyLabel(entry.id, entry.meaningEn, entry.meaningEs, entry.sourceLocator.sourceFactReviewHash);
  if (!correction) return entry;
  if (entry.display !== correction.display) throw new Error("A reviewed label cannot change the written form");
  return { ...entry, meaningEn: correction.meaningEn, meaningEs: correction.meaningEs,
    usageNoteEn: correction.usageNoteEn, usageNoteEs: correction.usageNoteEs,
    attribution: { ...entry.attribution, supplementalSources: [...(entry.attribution.supplementalSources ?? []),
      { title: correction.sourceTitle, url: correction.sourceUrl }] } };
});
const verifiedEntries = filterAppSafeText(labeledEntries.map(projectLearnerVocabularyNotes),
  entry => [entry.id, entry.display, entry.sourceSpelling, entry.meaningEn, entry.meaningEs, entry.partOfSpeech]);
const visibleEntryIds = new Set(verifiedEntries.map(entry => entry.id));
export const V3_LEARNER_EXCLUDED_WRITTEN_FORM_COUNT = new Set(
  labeledEntries.filter(entry => !visibleEntryIds.has(entry.id))
    .map(entry => entry.display.normalize("NFC").toLowerCase()),
).size;
export function getVerifiedExpansionEntries(newOnly = false): VerifiedExpansionEntry[] {
  return newOnly ? verifiedEntries.filter(entry => entry.newToCourse) : verifiedEntries.slice();
}
export function asExpansionPracticeEntry(entry: VerifiedExpansionEntry): ExpansionPracticeEntry {
  return {
    id: entry.id, display: entry.display, meaningEn: entry.meaningEn, meaningEs: entry.meaningEs,
    partOfSpeech: entry.partOfSpeech, sourceUrl: entry.sourceUrl,
    legacySourceVocabId: entry.legacySourceVocabId,
    legacyMainCourseVocabId: entry.legacyMainCourseVocabId,
    formKind: entry.formKind, usageNoteEn: entry.usageNoteEn, usageNoteEs: entry.usageNoteEs,
    audioUrl: entry.audioUrl ?? undefined, audioKind: entry.audioUrl ? "source-recording" : "none",
  };
}
