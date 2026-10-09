import courseData from "@/data/v3-original-course.json";
import extension from "@/data/course-path-extension.json";
import progression from "@/data/course-path-progression.json";
import { CURRICULUM_PATH } from "@/lib/curriculum";
import { getVerifiedExpansionEntries, V3_EXPANSION_COUNTS, V3_LEARNER_EXCLUDED_WRITTEN_FORM_COUNT } from "@/data/v3-expansion";
import { getExpansionEntries } from "@/data/lexical-expansion";
import type { Unit } from "@/lib/db";
import type { ExpansionCourse, ExpansionUnit, ExpansionText } from "@/lib/expansion-course";
import type { ExpansionPracticeEntry } from "@/lib/expansion-practice";
import { isExpansionBuildingBlock } from "@/lib/expansion-practice";
import { tr } from "@/i18n/translate";
import { getInstructionalLessonSummary, getSupplementalInstructionalUnits } from "@/lib/instructional-lessons";
import { reviewedVocabularyLabel, getReviewedVocabularyLabels } from "@/lib/reviewed-vocabulary-labels.cjs";
import { isLearnerEntryExcluded } from "@/lib/app-content-safety";

export type UnifiedVocabularyEntry = Omit<ExpansionPracticeEntry, "audioUrl"> & {
  sourceSpelling: string; audioUrl: string | null; referenceAliases?: string[];
  variety: string; sourceTitle: string; sourceAuthors: string[];
  sourceLicense: string; contentLicense: string;
  supplementalSources?: { title: string; url: string }[];
  reviewActivityId?: string;
};
export type UnifiedPathLesson = {
  lessonNumber: number; number: number; pathOrder: number; pathCode: string;
  kind: "legacy" | "grammar" | "vocabulary"; progressId: string;
  title: ExpansionText; goal: ExpansionText;
  titleEn: string; titleEs: string; goalEn: string; goalEs: string;
  stageTitleEn: string; stageTitleEs: string; band: "A1" | "A2" | "B1";
  durationMinutes: number; wordCount: number; dialogueCount: number; patternCount: number;
  sourceLessonId?: string;
};
export type UnifiedPathLessonDetail = UnifiedPathLesson & {
  sourceUnit?: ExpansionUnit; entries?: UnifiedVocabularyEntry[];
};
const reviewedCourse = courseData as ExpansionCourse;
const verifiedEntries = getVerifiedExpansionEntries();
const entries = new Map<string, UnifiedVocabularyEntry>(verifiedEntries.map(entry => [entry.id, {
  id: entry.id, display: entry.display, sourceSpelling: entry.sourceSpelling,
  meaningEn: entry.meaningEn, meaningEs: entry.meaningEs, partOfSpeech: entry.partOfSpeech,
  formKind: entry.formKind, sourceUrl: entry.sourceUrl,
  audioUrl: entry.audioUrl, audioKind: entry.audioUrl ? "source-recording" : "none",
  usageNoteEn: entry.usageNoteEn, usageNoteEs: entry.usageNoteEs,
  referenceAliases: entry.referenceAliases, variety: entry.verification.variety,
  sourceTitle: entry.attribution.title, sourceAuthors: entry.attribution.authors,
  sourceLicense: entry.sourceLicense, contentLicense: entry.contentLicense,
  supplementalSources: entry.attribution.supplementalSources,
  reviewActivityId: entry.newToCourse && !isExpansionBuildingBlock(entry) ? `word:${entry.id}` : undefined,
  legacyMainCourseVocabId: entry.legacyMainCourseVocabId,
  legacySourceVocabId: entry.legacySourceVocabId,
}]));
for (const entry of getExpansionEntries()) {
  const originalLabel = getReviewedVocabularyLabels().find(item => item.id === entry.id);
  const correction = originalLabel ? reviewedVocabularyLabel(entry.id, originalLabel.beforeEn, originalLabel.beforeEs) : null;
  entries.set(entry.id, {
    id: entry.id, display: entry.headword, sourceSpelling: entry.sourceSpelling,
    meaningEn: entry.english, meaningEs: entry.spanish, partOfSpeech: entry.partOfSpeech,
    formKind: entry.formKind, sourceUrl: entry.source.url,
    audioUrl: entry.audio.url ?? null, audioKind: entry.audio.url ? "source-recording" : "none",
    usageNoteEn: entry.review.limitations.en,
    usageNoteEs: entry.review.limitations.es,
    variety: "Chicontepec, Veracruz", sourceTitle: "Nāhuatlahtolli · COERLL / University of Texas at Austin",
    sourceAuthors: [...entry.source.authors], sourceLicense: entry.source.license,
    ...(correction ? { supplementalSources: [{ title: correction.sourceTitle, url: correction.sourceUrl }] } : {}),
    contentLicense: "CC BY-SA 4.0",
    reviewActivityId: `word:${entry.cardId}`,
  });
}
const stages = [
  { en: "Everyday conversation", es: "Conversación cotidiana" },
  { en: "People, actions and shared life", es: "Personas, acciones y vida compartida" },
  { en: "Use what you know", es: "Usa lo que sabes" },
  { en: "Express yourself more precisely", es: "Exprésate con más precisión" },
];

/** One published course sequence. Existing numeric lesson identities stay intact. */
export function getUnifiedCoursePath(legacyUnits?: readonly Unit[]): UnifiedPathLesson[] {
  const legacyById = new Map(legacyUnits?.map(unit => [unit.lesson_number, unit]));
  const legacy: UnifiedPathLesson[] = CURRICULUM_PATH.map((meta, index) => {
    const unit = legacyById.get(meta.lesson);
    const title = { en: unit?.theme_en ?? meta.title, es: tr("es", unit?.theme_en ?? meta.title) };
    const goal = { en: unit?.communicative_goal ?? meta.goal, es: tr("es", unit?.communicative_goal ?? meta.goal) };
    return { lessonNumber: meta.lesson, number: meta.lesson, pathOrder: index + 1,
      pathCode: meta.pathCode, kind: "legacy", progressId: String(meta.lesson), title, goal,
      titleEn: title.en, titleEs: title.es, goalEn: goal.en, goalEs: goal.es,
      stageTitleEn: meta.stageTitle, stageTitleEs: tr("es", meta.stageTitle), band: meta.band,
      durationMinutes: 12, wordCount: unit?.english_vocab_count ?? 0,
      dialogueCount: unit?.english_dialogue_count ?? 0, patternCount: unit?.english_construction_count ?? 0 };
  });
  const grammar: UnifiedPathLesson[] = extension.grammarLessons.map((mapping, index) => {
    const unit = reviewedCourse.units.find(unit => unit.id === mapping.sourceUnitId);
    if (!unit) throw new Error("A reviewed grammar lesson changed; preserve its published path identity.");
    const lessonNumber = mapping.lessonNumber;
    const stage = stages[index < 12 ? 0 : index < 24 ? 1 : index < 37 ? 2 : 3];
    return { lessonNumber, number: lessonNumber, pathOrder: legacy.length + index + 1,
      pathCode: String(lessonNumber).padStart(3, "0"), kind: "grammar", progressId: unit.id,
      sourceLessonId: unit.id, title: unit.title, goal: unit.goal,
      titleEn: unit.title.en, titleEs: unit.title.es, goalEn: unit.goal.en, goalEs: unit.goal.es,
      stageTitleEn: stage.en, stageTitleEs: stage.es, band: "A2",
      durationMinutes: unit.durationMinutes, wordCount: unit.phraseIds.length,
      dialogueCount: getInstructionalLessonSummary(unit.id)?.dialogueTurnCount ?? 0, patternCount: unit.ruleIds.length };
  });
  const vocabulary: UnifiedPathLesson[] = extension.lessons.map(lesson => {
    const visibleEntryIds = lesson.entryIds.filter(id => !isLearnerEntryExcluded(id));
    const instructional = getInstructionalLessonSummary(lesson.progressId);
    const title = { en: `${lesson.titleEn} · ${lesson.ordinal}`, es: `${lesson.titleEs} · ${lesson.ordinal}` };
    const goal = { en: lesson.goalEn, es: lesson.goalEs };
    return { lessonNumber: lesson.lessonNumber, number: lesson.lessonNumber,
      pathOrder: lesson.lessonNumber, pathCode: String(lesson.lessonNumber).padStart(3, "0"),
      kind: "vocabulary", progressId: lesson.progressId, title, goal,
      titleEn: title.en, titleEs: title.es, goalEn: goal.en, goalEs: goal.es,
      stageTitleEn: lesson.titleEn, stageTitleEs: lesson.titleEs, band: "A2",
      durationMinutes: visibleEntryIds.length + 2, wordCount: visibleEntryIds.length,
      dialogueCount: instructional?.dialogueTurnCount ?? 0, patternCount: instructional?.ruleCount ?? 0 };
  });
  const mechanics: UnifiedPathLesson[] = getSupplementalInstructionalUnits().map((unit,index)=>({
    lessonNumber:260+index,number:260+index,pathOrder:260+index,pathCode:String(260+index),
    kind:"grammar",progressId:unit.id,sourceLessonId:unit.id,title:unit.title,goal:unit.goal,
    titleEn:unit.title.en,titleEs:unit.title.es,goalEn:unit.goal.en,goalEs:unit.goal.es,
    stageTitleEn:"",stageTitleEs:"",band:"A2",durationMinutes:unit.durationMinutes,
    wordCount:unit.phraseIds.length,dialogueCount:getInstructionalLessonSummary(unit.id)?.dialogueTurnCount??0,
    patternCount:unit.ruleIds.length,
  }));
  const byIdentity = new Map([...legacy, ...grammar, ...vocabulary,...mechanics].map(lesson => [lesson.lessonNumber, lesson]));
  return progression.lessons.map((placement, index) => {
    const lesson = byIdentity.get(placement.lessonNumber);
    const anchor = byIdentity.get(placement.anchorLesson);
    if (!lesson || !anchor) throw new Error("A stable lesson is missing from the topic sequence.");
    return { ...lesson, pathOrder: index + 1, pathCode: String(index + 1).padStart(3, "0"),
      stageTitleEn: anchor.stageTitleEn, stageTitleEs: anchor.stageTitleEs, band: anchor.band };
  });
}
export const getUnifiedPathLessons = getUnifiedCoursePath;
export function getUnifiedPathLesson(lessonNumber: number): UnifiedPathLessonDetail | null {
  const summary = getUnifiedCoursePath().find(lesson => lesson.lessonNumber === lessonNumber);
  if (!summary) return null;
  if (summary.kind === "grammar") return { ...summary, sourceUnit: [...reviewedCourse.units,...getSupplementalInstructionalUnits()].find(unit => unit.id === summary.progressId)! };
  if (summary.kind === "vocabulary") {
    const spec = extension.lessons.find(lesson => lesson.lessonNumber === lessonNumber)!;
    const selected = spec.entryIds.filter(id => !isLearnerEntryExcluded(id)).map(id => entries.get(id));
    if (selected.some(entry => !entry)) throw new Error("A course word changed; review its lesson assignment.");
    return { ...summary, entries: selected as UnifiedVocabularyEntry[] };
  }
  return summary;
}
export function getAdjacentUnifiedPathLessons(lessonNumber: number) {
  const path = getUnifiedCoursePath(); const index = path.findIndex(lesson => lesson.lessonNumber === lessonNumber);
  return { previous: index > 0 ? path[index - 1] : null, next: index >= 0 ? path[index + 1] ?? null : null };
}
export function getUnifiedVocabularyCount() {
  // The lexical archive count retains excluded records; the learner count does not.
  return V3_EXPANSION_COUNTS.appDistinctWrittenForms - V3_LEARNER_EXCLUDED_WRITTEN_FORM_COUNT;
}
export function getUnifiedGrammarCourse() { return reviewedCourse; }
export function getUnifiedLessonForEntry(entryId: string) {
  if (isLearnerEntryExcluded(entryId)) return null;
  return extension.lessons.find(lesson => lesson.entryIds.includes(entryId))?.lessonNumber ?? null;
}
export function getUnifiedVocabularyEntries() { return [...entries.values()]; }
