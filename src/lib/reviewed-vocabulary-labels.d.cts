export type ReviewedVocabularyLabel = {
  id: string; display: string; beforeEn: string; beforeEs: string;
  meaningEn: string; meaningEs: string; usageNoteEn: string; usageNoteEs: string;
  sourceTitle: string; sourceUrl: string; evidence: string;
  sourceFactReviewHash?: string; selectedSenseOnly?: boolean;
};
export function reviewedVocabularyLabel(id: string, meaningEn: string, meaningEs: string, sourceFactReviewHash?: string): ReviewedVocabularyLabel | null;
export function getReviewedVocabularyLabels(): ReviewedVocabularyLabel[];
/** Frozen factual-label audit only; current teaching uses the combined facade. */
export function reviewedHistoricalVocabularyLabel(id: string, meaningEn: string, meaningEs: string): ReviewedVocabularyLabel | null;
