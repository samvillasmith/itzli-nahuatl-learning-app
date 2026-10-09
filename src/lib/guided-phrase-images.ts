import "server-only";
import type { ExpansionCourse } from "./expansion-course";
import type { WordImage } from "@/data/word-images";
import { getUnifiedVocabularyEntries } from "./unified-course-path";
import { getReviewedVocabularyLabels } from "./reviewed-vocabulary-labels.cjs";
import { getLocalReviewWordImages } from "./local-review-word-images";
import { guidedLessonImage } from "./guided-lesson-images";
import { guidedPhraseImageEntry } from "./guided-phrase-image-entry";

export function getGuidedPhraseImages(course: ExpansionCourse, selectedIds: readonly string[]): Record<string, WordImage> {
  const selected = new Set(selectedIds);
  const entries = getUnifiedVocabularyEntries();
  const bound = course.phrases.filter(phrase => selected.has(phrase.id)).flatMap(phrase => {
    const entry = guidedPhraseImageEntry(phrase, entries);
    return entry ? [{ phraseId: phrase.id, entry }] : [];
  });
  const labels = getReviewedVocabularyLabels();
  const previews = getLocalReviewWordImages(bound.map(({ entry }) => ({ entryId: entry.id, headword: entry.display,
    meaningEn: entry.meaningEn, meaningEs: entry.meaningEs,
    sourceFactReviewHash: labels.find(row => row.id === entry.id)?.sourceFactReviewHash })));
  return Object.fromEntries(bound.flatMap(({ phraseId, entry }) => {
    const image = previews[entry.id] ?? guidedLessonImage(entry);
    return image ? [[phraseId, image]] : [];
  }));
}
