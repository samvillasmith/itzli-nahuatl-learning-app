import { displayNahuatl } from "@/lib/orthography";
import { getUnifiedLessonForEntry, getUnifiedVocabularyEntries } from "@/lib/unified-course-path";
import type { VocabItem } from "@/lib/db";
import { tr } from "@/i18n/translate";
import { resolvePracticeRecording } from "./generated-audio";
import { vocabCardAudioUrl } from "./audio";
import { isAppContentExcluded } from "./app-content-safety";

export type CourseWord = {
  id: string; display: string; meaningEn: string; meaningEs: string; partOfSpeech: string;
  sourceSpelling: string; referenceAliases: string[]; sourceUrl: string | null;
  sourceTitle: string; variety: string; usageNoteEn: string; usageNoteEs: string;
  lessonNumber: number | null;
  supplementalSources?: { title: string; url: string }[];
  audioUrl?: string | null; audioReferenceId?: string;
};
const key = (value: string) => value.normalize("NFC").toLowerCase().replace(/[¿¡?!.,:;“”"'/]/g, "").replace(/\s+/g, " ").trim();
const senseKey = (display: string, meaningEn: string, meaningEs: string, partOfSpeech: string) =>
  JSON.stringify([key(display), key(meaningEn), key(meaningEs), key(partOfSpeech)]);
export function countVocabularyWrittenForms(words: readonly CourseWord[]) {
  return new Set(words.map(word => key(word.display))).size;
}
export function getUnifiedVocabulary(primer: readonly VocabItem[]): CourseWord[] {
  const words = new Map<string, CourseWord>();
  for (const item of primer) {
    const display = displayNahuatl(item.headword);
    const meaningEs = tr("es", item.gloss_en);
    words.set(senseKey(display, item.gloss_en, meaningEs, item.part_of_speech), { id: `core-word-${item.id}`, display, meaningEn: item.gloss_en,
      meaningEs, partOfSpeech: item.part_of_speech,
      sourceSpelling: item.headword, referenceAliases: [], sourceUrl: item.sourceUrl ?? null,
      sourceTitle: "Source", variety: "", usageNoteEn: "", usageNoteEs: "",
      audioUrl: vocabCardAudioUrl(item.id, item.audioSrc, display), audioReferenceId: `core-vocab:${item.id}`,
      lessonNumber: item.first_lesson_number });
  }
  for (const entry of getUnifiedVocabularyEntries()) {
    const entryKey = senseKey(entry.display, entry.meaningEn, entry.meaningEs, entry.partOfSpeech);
    const prior = words.get(entryKey);
    const sourceLinks = [...(prior?.supplementalSources ?? []), ...(entry.supplementalSources ?? []),
      ...(prior?.sourceUrl && prior.sourceUrl !== entry.sourceUrl ? [{ title: prior.sourceTitle, url: prior.sourceUrl }] : [])];
    words.set(entryKey, {
      id: entry.id, display: entry.display, meaningEn: entry.meaningEn, meaningEs: entry.meaningEs,
      partOfSpeech: entry.partOfSpeech, sourceSpelling: entry.sourceSpelling,
      referenceAliases: [...new Set([...(prior?.referenceAliases ?? []), ...(entry.referenceAliases ?? [])])],
      sourceUrl: entry.sourceUrl, sourceTitle: entry.sourceTitle, variety: entry.variety,
      supplementalSources: [...new Map(sourceLinks.filter(source => source.url !== entry.sourceUrl).map(source => [source.url, source])).values()],
      usageNoteEn: entry.usageNoteEn ?? "", usageNoteEs: entry.usageNoteEs ?? "",
      lessonNumber: getUnifiedLessonForEntry(entry.id) ?? prior?.lessonNumber ?? null,
      audioUrl: resolvePracticeRecording({ text: entry.display, url: entry.audioUrl, kind: entry.audioKind, referenceId: `vocabulary:${entry.id}` }).url,
      audioReferenceId: `vocabulary:${entry.id}`,
    });
  }
  return [...words.values()].filter(word => !isAppContentExcluded(word.id, word.display, word.meaningEn, word.meaningEs))
    .sort((a, b) => a.display.localeCompare(b.display, "es"));
}
export function searchUnifiedVocabulary(words: readonly CourseWord[], query: string) {
  const needle = key(query);
  return needle ? words.filter(word => [word.display, word.sourceSpelling, word.meaningEn, word.meaningEs,
    ...word.referenceAliases].some(value => key(value).includes(needle))) : [...words];
}
