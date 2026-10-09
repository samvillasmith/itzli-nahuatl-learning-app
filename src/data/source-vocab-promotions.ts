import rawCourse from "./nahuatlahtolli-course.json";
import identities from "./source-vocab-identity.json";
import { isAppContentExcluded } from "@/lib/app-content-safety";
import { toInaliOrthography } from "@/lib/orthography";
import { isStudyCardExcluded } from "@/lib/study-card-safety";

export type SourceVocabPromotion = {
  id: number;
  entry_id: string;
  rank: number;
  headword: string;
  gloss_en: string;
  part_of_speech: string;
  first_lesson_number: number;
  semantic_domain: "source_course_expansion";
  audioSrc: string;
  imageHeadword: string;
  sourceUrl: string;
};

// One-token, source-attested forms selected for usefulness and progression.
// Inflected forms are retained only where they reinforce the unit's grammar.
// Persisted identities preserve existing progress even when source arrays are edited.

const GLOSS_OVERRIDES: Record<string, string> = {
  "source-1-25": "joy; happiness",
  "source-1-28": "elder; older adult",
  "source-2-7": "I will greet you",
  "source-2-18": "stand up, everyone",
  "source-2-20": "sit down, everyone",
  "source-5-8": "painter",
  "source-7-30": "to watch television or an event",
  "source-8-23": "my hand or arm",
  "source-8-43": "my toenails",
  "source-8-50": "the palm of my hand",
  "source-13-9": "he/she/it sees us",
  "source-13-10": "he/she/it sees you all",
  "source-13-11": "he/she/it sees them",
  "source-14-6": "you all cried",
  "source-18-22": "I knead chili peppers",
  "source-19-8": "go out, everyone",
  "source-20-7": "little butterfly",
  "source-20-8": "little butterflies",
  "source-20-9": "little shrimp",
  "source-20-10": "little shrimp (plural)",
  "source-20-12": "little dog",
  "source-20-13": "little dogs",
  "source-20-15": "little domesticated animal",
  "source-20-16": "little domesticated animals",
  "source-20-37": "little candle",
  "source-21-19": "banana leaves",
  "source-21-20": "dried ear of corn wrapped in its husk",
};

const UNIT_OVERRIDES: Record<string, number> = {
  "source-4-11": 34,
  "source-15-6": 16,
  "source-15-7": 16,
  "source-15-9": 16,
};

function partOfSpeech(headword: string, gloss: string): string {
  const lower = gloss.toLowerCase();
  if (lower.startsWith("to ")) return "verb";
  if (
    /^(i |you |we |they |he\/she|she\/he|he |she |it |stand |sit |enter|come in|go out|say it|do it|write it)/i.test(gloss) ||
    /^[A-Z]/.test(headword)
  ) {
    return "verb form";
  }
  if (/\b(brown|blue|grey|green|purple|multicolor|short|straight|smooth|curly|wavy|round|oval-shaped)\b/.test(lower)) {
    return "adjective";
  }
  if (/\b(all day|very early|already night|a little bit|evening|midday|midnight|morning|every day|in the middle|after|until tomorrow)\b/.test(lower)) {
    return "adverb";
  }
  return "noun";
}

export function buildSourceVocabPromotions(specs: readonly (typeof identities)[number][] = identities): SourceVocabPromotion[] {
  const promotions: SourceVocabPromotion[] = [];
  const seen = new Set<string>();

  for (const identity of specs) {
    const lessonNumber = identity.sourceLesson;
    const sourceIndex = identity.sourceIndex;
    const lesson = rawCourse.lessons.find((candidate) => candidate.number === lessonNumber);
    if (!lesson) throw new Error(`Missing source lesson ${lessonNumber}`);

      const item = lesson.vocabulary[sourceIndex - 1];
      if (!item?.headword || !item.audioUrl) {
        throw new Error(`Incomplete source vocabulary item source-${lessonNumber}-${sourceIndex}`);
      }

      if (item.headword !== identity.sourceSpelling) {
        throw new Error(`Source identity changed for ${identity.entry_id}; review the source reference instead of reassigning its ID`);
      }
      const sourceId = identity.entry_id;
      const gloss = GLOSS_OVERRIDES[sourceId] ?? item.gloss;
      if (
        isAppContentExcluded(item.headword, gloss, item.audioUrl) ||
        isStudyCardExcluded(item.headword, gloss)
      ) {
        throw new Error(`Blocked source promotion ${sourceId}`);
      }

      const headword = toInaliOrthography(item.headword).trim();
      const dedupeKey = headword.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(dedupeKey)) throw new Error(`Duplicate source promotion ${headword}`);
      seen.add(dedupeKey);

      promotions.push({
        id: identity.id,
        entry_id: sourceId,
        rank: identity.rank,
        headword,
        gloss_en: gloss,
        part_of_speech: partOfSpeech(headword, gloss),
        first_lesson_number: UNIT_OVERRIDES[sourceId] ?? lessonNumber,
        semantic_domain: "source_course_expansion",
        audioSrc: item.audioUrl,
        imageHeadword: item.headword,
        sourceUrl: lesson.originalUrl,
      });
  }

  return promotions;
}

export const SOURCE_VOCAB_PROMOTIONS = buildSourceVocabPromotions();

export function getSourceVocabPromotions(lessonNumber?: number): SourceVocabPromotion[] {
  return lessonNumber == null
    ? SOURCE_VOCAB_PROMOTIONS
    : SOURCE_VOCAB_PROMOTIONS.filter((item) => item.first_lesson_number === lessonNumber);
}
