import rawCourse from "./nahuatlahtolli-course.json";
import rawSpecs from "./curated-unit-vocab.json";
import { isAppContentExcluded } from "@/lib/app-content-safety";
import { toInaliOrthography } from "@/lib/orthography";
import { isStudyCardExcluded } from "@/lib/study-card-safety";

export type CuratedUnitVocabSpec = {
  id: number;
  entry_id: string;
  rank: number;
  unit: number;
  headword: string;
  gloss_en: string;
  part_of_speech: string;
  audio_available?: false;
  imageHeadword?: string;
  source_lesson_number?: number;
};

const CURATED_AUDIO_BASE_URL =
  "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/vocab-reviewed-v2";

export type CuratedUnitVocab = {
  id: number;
  entry_id: string;
  rank: number;
  headword: string;
  gloss_en: string;
  part_of_speech: string;
  first_lesson_number: number;
  semantic_domain: "curated_unit_vocabulary";
  audioSrc: string | null;
  imageHeadword: string;
  sourceUrl: string | null;
};

const sourceByHeadword = new Map<string, { headword: string; audioUrl: string; sourceUrl: string }>();

for (const lesson of rawCourse.lessons) {
  for (const item of lesson.vocabulary) {
    const key = toInaliOrthography(item.headword).trim().toLowerCase();
    if (!key || key.includes(" ") || sourceByHeadword.has(key) || !item.audioUrl) continue;
    sourceByHeadword.set(key, {
      headword: item.headword,
      audioUrl: item.audioUrl,
      sourceUrl: lesson.originalUrl,
    });
  }
}

export function buildCuratedUnitVocab(specs: readonly CuratedUnitVocabSpec[] = rawSpecs as CuratedUnitVocabSpec[]): CuratedUnitVocab[] {
  const seenByUnit = new Set<string>();
  const seenIds = new Set<number>();

  return specs.map((spec) => {
    const headword = toInaliOrthography(spec.headword).trim();
    const key = `${spec.unit}:${headword.toLowerCase()}`;
    if (seenByUnit.has(key)) throw new Error(`Duplicate curated card ${key}`);
    seenByUnit.add(key);
    if (!Number.isSafeInteger(spec.id) || seenIds.has(spec.id) || !spec.entry_id) throw new Error(`Invalid curated identity ${spec.id}`);
    seenIds.add(spec.id);

    if (
      isAppContentExcluded(headword, spec.gloss_en, spec.part_of_speech) ||
      isStudyCardExcluded(headword, spec.gloss_en)
    ) {
      throw new Error(`Blocked curated card ${key}`);
    }

    const source = sourceByHeadword.get(headword.toLowerCase());
    const id = spec.id;

    return {
      id,
      entry_id: spec.entry_id,
      rank: spec.rank,
      headword,
      gloss_en: spec.gloss_en,
      part_of_speech: spec.part_of_speech,
      first_lesson_number: spec.unit,
      semantic_domain: "curated_unit_vocabulary",
      audioSrc: spec.audio_available === false
        ? null
        : source?.audioUrl ?? `${CURATED_AUDIO_BASE_URL}/${id}.wav`,
      imageHeadword: spec.imageHeadword ?? source?.headword ?? headword,
      sourceUrl: spec.source_lesson_number
        ? rawCourse.lessons.find((lesson) => lesson.number === spec.source_lesson_number)?.originalUrl ?? null
        : source?.sourceUrl ?? null,
    };
  });
}

export const CURATED_UNIT_VOCAB = buildCuratedUnitVocab();

export function getCuratedUnitVocab(lessonNumber?: number): CuratedUnitVocab[] {
  return lessonNumber == null
    ? CURATED_UNIT_VOCAB
    : CURATED_UNIT_VOCAB.filter((item) => item.first_lesson_number === lessonNumber);
}
