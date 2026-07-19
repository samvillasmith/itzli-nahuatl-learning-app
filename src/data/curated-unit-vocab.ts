import rawCourse from "./nahuatlahtolli-course.json";
import rawSpecs from "./curated-unit-vocab.json";
import { isAppContentExcluded } from "@/lib/app-content-safety";
import { toInaliOrthography } from "@/lib/orthography";
import { isStudyCardExcluded } from "@/lib/study-card-safety";

type CuratedUnitVocabSpec = {
  unit: number;
  headword: string;
  gloss_en: string;
  part_of_speech: string;
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

function buildCuratedUnitVocab(): CuratedUnitVocab[] {
  const seenByUnit = new Set<string>();

  return (rawSpecs as CuratedUnitVocabSpec[]).map((spec, index) => {
    const headword = toInaliOrthography(spec.headword).trim();
    const key = `${spec.unit}:${headword.toLowerCase()}`;
    if (seenByUnit.has(key)) throw new Error(`Duplicate curated card ${key}`);
    seenByUnit.add(key);

    if (
      isAppContentExcluded(headword, spec.gloss_en, spec.part_of_speech) ||
      isStudyCardExcluded(headword, spec.gloss_en)
    ) {
      throw new Error(`Blocked curated card ${key}`);
    }

    const source = sourceByHeadword.get(headword.toLowerCase());
    const unitIndex = (rawSpecs as CuratedUnitVocabSpec[])
      .slice(0, index + 1)
      .filter((candidate) => candidate.unit === spec.unit).length;
    const id = 900_000 + spec.unit * 100 + unitIndex;

    return {
      id,
      entry_id: `curated-${spec.unit}-${unitIndex}`,
      rank: 20_000 + unitIndex,
      headword,
      gloss_en: spec.gloss_en,
      part_of_speech: spec.part_of_speech,
      first_lesson_number: spec.unit,
      semantic_domain: "curated_unit_vocabulary",
      audioSrc: source?.audioUrl ?? `${CURATED_AUDIO_BASE_URL}/${id}.wav`,
      imageHeadword: source?.headword ?? headword,
      sourceUrl: source?.sourceUrl ?? null,
    };
  });
}

export const CURATED_UNIT_VOCAB = buildCuratedUnitVocab();

export function getCuratedUnitVocab(lessonNumber?: number): CuratedUnitVocab[] {
  return lessonNumber == null
    ? CURATED_UNIT_VOCAB
    : CURATED_UNIT_VOCAB.filter((item) => item.first_lesson_number === lessonNumber);
}
