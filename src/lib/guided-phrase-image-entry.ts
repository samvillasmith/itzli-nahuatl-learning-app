import type { ExpansionPhrase } from "./expansion-course";
import { normalizeExpansionResponse } from "./expansion-course";
import type { GuidedImageEntry } from "./guided-lesson-images";

/** Only a source-linked whole vocabulary form may share its word illustration.
 * A word occurring somewhere in a sentence is not an image for that sentence. */
export function guidedPhraseImageEntry(phrase: ExpansionPhrase, entries: readonly GuidedImageEntry[]): GuidedImageEntry | null {
  const locator = phrase.sourceLocator as ExpansionPhrase["sourceLocator"] & { approvedLexiconEntryId?: string };
  if (!locator) return null;
  const id = locator.approvedLexiconEntryId ?? locator.lexicalEntryId;
  if (!id || locator.approvedLexiconEntryId && locator.lexicalEntryId && locator.approvedLexiconEntryId !== locator.lexicalEntryId) return null;
  const entry = entries.find(row => row.id === id);
  return entry && normalizeExpansionResponse(phrase.nahuatl) === normalizeExpansionResponse(entry.display) &&
    phrase.english === entry.meaningEn && phrase.spanish === entry.meaningEs ? entry : null;
}
