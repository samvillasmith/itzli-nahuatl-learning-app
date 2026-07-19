import rawCourse from "./nahuatlahtolli-course.json";
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
const PROMOTED_SOURCE_INDEXES: Record<number, readonly number[]> = {
  1: [4, 9, 15, 19, 23, 24, 25, 28, 32, 33, 34, 35, 38, 46, 48, 50],
  2: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20],
  4: [3, 4, 5, 9, 10, 11],
  5: [1, 3, 6, 7, 8, 10, 12],
  6: [3, 4, 6, 7, 8, 9, 15, 16, 18, 19, 20, 21, 26, 27, 29, 30, 31, 36, 39, 40],
  7: [2, 3, 6, 9, 10, 12, 13, 15, 16, 17, 18, 19, 22, 24, 25, 26, 27, 30, 32, 34, 36, 37, 38],
  8: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 32, 34, 36, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
  9: [9, 10, 11, 12, 13, 14, 17, 19, 21, 27, 28, 29],
  10: [15, 19, 20, 21, 22, 23],
  11: [2, 3, 4, 7, 8, 9, 10],
  12: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  13: [7, 8, 9, 10, 11],
  14: [2, 3, 4, 5, 6, 7],
  15: [2, 6, 7, 9],
  16: [10, 12],
  17: [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 16, 31, 32],
  18: [2, 4, 5, 6, 7, 12, 13, 16, 17, 18, 19, 20, 21, 22],
  19: [7, 8, 14, 16, 17, 19, 20, 21, 22, 23, 24, 25, 26, 27],
  20: [1, 7, 8, 9, 10, 12, 13, 15, 16, 30, 31, 33, 37, 41, 47],
  21: [1, 3, 5, 7, 9, 13, 17, 19, 20, 28, 29, 30],
};

const GLOSS_OVERRIDES: Record<string, string> = {
  "source-1-25": "joy; happiness",
  "source-1-28": "elder; older adult",
  "source-2-7": "I greet you",
  "source-2-18": "stand up, everyone",
  "source-2-20": "sit down, everyone",
  "source-5-8": "painter",
  "source-7-30": "to watch television or an event",
  "source-8-23": "my hand or arm",
  "source-8-43": "my toenails",
  "source-8-50": "the palm of my hand",
  "source-13-9": "he/she/it sees us",
  "source-13-10": "he/she/it sees you all",
  "source-18-22": "I knead chili peppers",
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

function buildPromotions(): SourceVocabPromotion[] {
  const promotions: SourceVocabPromotion[] = [];
  const seen = new Set<string>();

  for (const [lessonKey, indexes] of Object.entries(PROMOTED_SOURCE_INDEXES)) {
    const lessonNumber = Number(lessonKey);
    const lesson = rawCourse.lessons.find((candidate) => candidate.number === lessonNumber);
    if (!lesson) throw new Error(`Missing source lesson ${lessonNumber}`);

    for (const sourceIndex of indexes) {
      const item = lesson.vocabulary[sourceIndex - 1];
      if (!item?.headword || !item.audioUrl) {
        throw new Error(`Incomplete source vocabulary item source-${lessonNumber}-${sourceIndex}`);
      }

      const sourceId = `source-${lessonNumber}-${sourceIndex}`;
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
        id: 800_000 + lessonNumber * 1_000 + sourceIndex,
        entry_id: sourceId,
        rank: 10_000 + sourceIndex,
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
  }

  return promotions;
}

export const SOURCE_VOCAB_PROMOTIONS = buildPromotions();

export function getSourceVocabPromotions(lessonNumber?: number): SourceVocabPromotion[] {
  return lessonNumber == null
    ? SOURCE_VOCAB_PROMOTIONS
    : SOURCE_VOCAB_PROMOTIONS.filter((item) => item.first_lesson_number === lessonNumber);
}
