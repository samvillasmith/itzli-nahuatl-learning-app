import { getWordImage, type WordImage } from "@/data/word-images";
import selectedSenses from "@/data/learner-image-senses.json";
import { vocabularyImageEntryId } from "./vocabulary-image-identity";

export type GuidedImageEntry = { id: string; display: string; meaningEn: string; meaningEs: string };
type Lookup = typeof getWordImage;

/** The lesson identity and both current meanings travel with each image lookup.
 * Source-bound V3 artwork cannot be borrowed for another sense of a spelling. */
export function guidedLessonImage(entry: GuidedImageEntry, lookup: Lookup = getWordImage): WordImage | null {
  const reviewed = selectedSenses.find(row => row.id === entry.id);
  const imageEntryId = vocabularyImageEntryId(entry);
  const image = lookup(entry.display, { entryId: entry.id, imageEntryId, meaningEn: entry.meaningEn, meaningEs: entry.meaningEs,
    sourceFactReviewHash: reviewed?.sourceFactReviewHash,
    safetyText: [entry.meaningEn, entry.meaningEs], allowLegacyFallback: true });
  if (image?.provenance && (image.provenance.entry_id !== imageEntryId ||
    image.provenance.meaning_en !== entry.meaningEn || image.provenance.meaning_es !== entry.meaningEs)) return null;
  return image;
}
