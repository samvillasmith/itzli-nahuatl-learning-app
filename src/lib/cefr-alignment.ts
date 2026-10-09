import { CURRICULUM_PATH, type CefrBand } from "@/lib/curriculum";
import { getInstructionalLessonSummary } from "@/lib/instructional-lessons";
import type { UnifiedPathLesson } from "@/lib/unified-course-path";

export const CEFR_REFERENCE = {
  title: "Common European Framework of Reference for Languages: Learning, teaching, assessment — Companion volume",
  author: "Council of Europe",
  year: 2020,
  url: "https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4",
  contextUrl: "https://www.coe.int/en/web/common-european-framework-reference-languages/uses-and-objectives",
} as const;

type Text = { en: string; es: string };
type ScaleId = "orthography" | "information" | "conversation" | "clarification" | "description" | "transaction" | "cooperation" | "narrative" | "discussion" | "cohesion" | "vocabulary" | "grammar" | "sociolinguistic";

/** Original Itzli learning outcomes; scale names and printed pages identify the framework, not quoted descriptors. */
export const CEFR_SCALES: Record<ScaleId, { name: Text; pages: string }> = {
  orthography: { name: { en: "Orthographic control", es: "Control ortográfico" }, pages: "136" },
  information: { name: { en: "Information exchange", es: "Intercambio de información" }, pages: "78–80" },
  conversation: { name: { en: "Conversation", es: "Conversación" }, pages: "73–74" },
  clarification: { name: { en: "Asking for clarification", es: "Pedir aclaraciones" }, pages: "89" },
  description: { name: { en: "Describing experience", es: "Describir experiencias" }, pages: "62–63" },
  transaction: { name: { en: "Obtaining goods and services", es: "Obtener bienes y servicios" }, pages: "77–78" },
  cooperation: { name: { en: "Goal-oriented co-operation", es: "Cooperación para lograr una tarea" }, pages: "76–77" },
  narrative: { name: { en: "Thematic development", es: "Desarrollo temático" }, pages: "139–140" },
  discussion: { name: { en: "Informal discussion", es: "Discusión informal" }, pages: "74–75" },
  cohesion: { name: { en: "Coherence and cohesion", es: "Coherencia y cohesión" }, pages: "140–141" },
  vocabulary: { name: { en: "Vocabulary range", es: "Amplitud de vocabulario" }, pages: "131" },
  grammar: { name: { en: "Grammatical accuracy", es: "Corrección gramatical" }, pages: "132" },
  sociolinguistic: { name: { en: "Sociolinguistic appropriateness", es: "Adecuación sociolingüística" }, pages: "136–137" },
};

type Profile = { band: CefrBand; scales: ScaleId[] };
const vocabularyTopicBands: Record<string, CefrBand> = {
  conversation: "A1", people: "A1", food: "A1", home: "A1", body: "A1", description: "A1",
  time: "A1", place: "A1", nature: "A1", animals: "A1", plants: "A1", work: "A2", thought: "A2",
  numbers: "A1", actions: "A2", community: "A2", everyday: "A1", reference: "A2",
};
const profiles = new Map<string, Profile>();
function assign(band: CefrBand, scales: ScaleId[], ids: string[]) {
  for (const id of ids) {
    if (profiles.has(id)) throw new Error(`Duplicate CEFR task profile: ${id}`);
    profiles.set(id, { band, scales: [...scales, "grammar"] });
  }
}
assign("A1", ["conversation", "information"], [
  "v3-meet-and-connect", "v3-recall-new-meeting", "v3-bones-community-exchange",
  "v3-work-study", "v3-recall-learning-conversation", "v3-bones-person", "v3-practical-identity", "v3-learning-together",
]);
assign("A1", ["clarification", "conversation"], ["v3-keep-speaking", "v3-recall-clarify-and-visit"]);
assign("A1", ["description", "information"], [
  "v3-family-possession", "v3-place-and-visit", "v3-amounts-colors", "v3-who-sees-whom", "v3-self-actions",
  "v3-group-activities", "v3-shared-household", "v3-younger-relatives", "v3-family-network", "v3-morning-routine",
  "v3-shared-observation", "v3-recall-family-and-place", "v3-recall-small-amounts", "v3-recall-who-sees",
  "v3-practical-sibling-identification", "v3-practical-household-identification", "v3-practical-arrival-and-posture",
  "v3-bones-degree", "v3-bones-time", "v3-bones-human-objects", "v3-bones-self-or-each-other",
  "v3-mechanic-unspecified-objects", "v3-mechanic-relational-space", "v3-mechanic-demonstrative-phrases",
  "v3-mechanic-quantified-groups", "v3-mechanic-weather-and-feeling", "v3-mechanic-occupation-nouns",
  "v3-mechanic-mo-participants", "v3-mechanic-body-experiencer", "v3-mechanic-learned-feelings",
  "v3-mechanic-learned-mo-forms", "v3-mechanic-six-possessors", "v3-mechanic-possessed-wi",
  "v3-mechanic-possessed-roles", "v3-mechanic-learned-place-endings", "v3-mechanic-learned-tik-colors",
  "v3-mechanic-checked-color-shades", "v3-mechanic-observer-groups", "v3-mechanic-present-go-come",
  "v3-mechanic-negative-references", "v3-mechanic-dressing-and-fit", "v3-mechanic-inherent-body-nouns",
  "v3-mechanic-possessed-n-endings", "v3-mechanic-place-quality-yoh", "v3-mechanic-activity-nouns",
  "v3-mechanic-learned-compound-heads", "v3-mechanic-possessed-ending-contrasts", "v3-mechanic-learned-water-words",
  "v3-mechanic-measured-quality-nouns", "v3-mechanic-calendar-order", "v3-mechanic-deictic-reference-points",
  "v3-mechanic-emotional-states", "v3-mechanic-counted-routine-times",
]);
assign("A1", ["transaction", "conversation"], ["v3-food-preferences", "v3-recall-coffee-conversation"]);
assign("A1", ["sociolinguistic", "conversation"], ["v3-bones-respect"]);
assign("A2", ["description", "information"], [
  "v3-personal-plans", "v3-past-experience", "v3-postures-past-states", "v3-shopping-report", "v3-stored-supplies",
  "v3-completed-activities", "v3-retell-movement", "v3-meal-and-ability", "v3-recall-report-and-plan",
  "v3-practical-corn-work", "v3-bones-past-process", "v3-mechanic-identity-time", "v3-mechanic-posture-time",
  "v3-mechanic-motion-purpose", "v3-mechanic-finite-preference", "v3-mechanic-embedded-questions",
  "v3-mechanic-ongoing-motion", "v3-mechanic-knowledge-and-recipient", "v3-mechanic-learned-incorporation",
  "v3-mechanic-completed-drink-purchase", "v3-mechanic-past-ia-oa", "v3-mechanic-ate-carried",
  "v3-mechanic-directional-visits", "v3-mechanic-distributed-routines", "v3-mechanic-learned-wia-verbs",
  "v3-mechanic-learned-particle-pairs", "v3-mechanic-checked-change-verbs",
  "v3-mechanic-checked-wi-wiya-changes", "v3-mechanic-checked-iwi-changes", "v3-mechanic-learned-call-pair",
  "v3-mechanic-time-sensitive-negation", "v3-mechanic-whole-day-context", "v3-mechanic-purpose-ending-slots",
  "v3-mechanic-counted-workplaces",
]);
assign("A2", ["cooperation", "information"], [
  "v3-mechanic-motion-commands", "v3-mechanic-hearing-and-following", "v3-mechanic-demonstrated-manner",
  "v3-mechanic-purpose-para",
  "v3-mechanic-command-stem-contrast", "v3-mechanic-ma-participants",
]);
assign("A2", ["cohesion", "information"], ["v3-mechanic-next-action"]);
assign("A2", ["discussion", "conversation"], ["v3-mechanic-opinion-participants"]);
assign("B1", ["discussion", "cohesion"], [
  "v3-bones-imagine-an-action", "v3-mechanic-imagined-past", "v3-mechanic-reason-and-contrast",
]);

const legacyScales: Record<number, ScaleId[]> = {
  1: ["orthography"], 2: ["information"], 3: ["conversation", "information"], 4: ["description"],
  5: ["information"], 6: ["description"], 7: ["information", "description"], 8: ["description"],
  9: ["information", "description"], 10: ["description"], 11: ["conversation", "sociolinguistic"],
  12: ["information"], 13: ["description"], 14: ["information", "transaction"], 15: ["information", "transaction"],
  16: ["description", "narrative"], 17: ["description"], 18: ["discussion"], 19: ["cooperation"],
  20: ["sociolinguistic", "description"], 21: ["description"], 22: ["cooperation"], 23: ["information", "description"],
  24: ["description"], 25: ["information"], 26: ["description"], 27: ["information"], 28: ["description", "narrative"],
  29: ["description"], 30: ["discussion"], 31: ["discussion"], 32: ["information"], 33: ["information"],
  34: ["transaction"], 35: ["description"], 36: ["transaction"], 37: ["transaction"], 38: ["information"],
  39: ["discussion"], 40: ["description"], 41: ["information"], 42: ["narrative", "cohesion"], 43: ["narrative", "cohesion"],
};

export type LessonCefrAlignment = {
  lessonNumber: number; progressId: string; targetBand: CefrBand; label: Text; canDo: Text;
  scaleIds: ScaleId[]; framework: typeof CEFR_REFERENCE;
  practice: "foundation" | "partial-context" | "guided-context" | "legacy-guided";
  evidence: { contextSentences: number; sentenceBuilders: number; conversationTurns: number };
  assessmentLimit: Text;
};

/** A grammar form never establishes a CEFR level by itself; these profiles identify the communicative task being rehearsed. */
export function getLessonCefrAlignment(lesson: UnifiedPathLesson): LessonCefrAlignment {
  const legacy = CURRICULUM_PATH.find(item => item.lesson === lesson.lessonNumber);
  const summary = lesson.kind === "legacy" ? null : getInstructionalLessonSummary(lesson.progressId);
  const explicit = profiles.get(lesson.progressId);
  if (lesson.kind === "grammar" && !explicit) throw new Error(`Review the new lesson's CEFR task profile: ${lesson.progressId}`);
  const vocabularyTopic = lesson.progressId.match(/^v3-vocab-([a-z]+)-\d+$/)?.[1];
  if (lesson.kind === "vocabulary" && (!vocabularyTopic || !vocabularyTopicBands[vocabularyTopic])) throw new Error(`Review the new vocabulary topic's CEFR foundation: ${lesson.progressId}`);
  const band = lesson.kind === "legacy" ? legacy!.band : explicit?.band ?? vocabularyTopicBands[vocabularyTopic!];
  const scales: ScaleId[] = lesson.kind === "legacy" ? [...legacyScales[lesson.lessonNumber], "grammar"]
    : explicit?.scales ?? ["vocabulary"];
  const practice = lesson.kind === "legacy" ? "legacy-guided" : !summary ? "foundation"
    : (summary.coverage?.pendingEntryIds.length ?? 0) > 0 ? "partial-context" : "guided-context";
  return {
    lessonNumber: lesson.lessonNumber, progressId: lesson.progressId, targetBand: band,
    label: { en: band === "B1" ? "B1-oriented extension" : `${band} task practice`, es: band === "B1" ? "Extensión orientada a B1" : `Práctica de tareas ${band}` },
    canDo: { en: `With the lesson's support: ${lesson.goalEn}`, es: `Con el apoyo de la lección: ${lesson.goalEs}` },
    scaleIds: [...new Set(scales)], framework: CEFR_REFERENCE, practice,
    evidence: { contextSentences: summary?.contextCount ?? 0, sentenceBuilders: summary?.builderCount ?? 0, conversationTurns: summary?.dialogueTurnCount ?? 0 },
    assessmentLimit: {
      en: practice === "foundation" ? "Word recognition builds the vocabulary needed for these tasks. This lesson does not yet assess conversation."
        : "Guided reading, sentence construction and dialogue choices rehearse this task. Independent speaking, listening comprehension and pronunciation are not certified by this score.",
      es: practice === "foundation" ? "Reconocer palabras amplía el vocabulario necesario para estas tareas. Esta lección aún no evalúa conversación."
        : "La lectura guiada, la construcción de oraciones y las opciones de diálogo ensayan esta tarea. La puntuación no certifica expresión oral independiente, comprensión auditiva ni pronunciación.",
    },
  };
}

export function getCourseCefrAlignment(lessons: readonly UnifiedPathLesson[]) {
  return lessons.map(getLessonCefrAlignment);
}
