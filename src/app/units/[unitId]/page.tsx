import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getUnit,
  getUnitVocab,
  getUnitDialogueContent,
  getUnitConstructions,
  getUnitLessonBlocks,
  getAllUnits,
  getAllPrimerVocab,
} from "@/lib/db";
import LessonFlow from "./LessonFlow";

export async function generateStaticParams() {
  const units = getAllUnits();
  return units.map((u) => ({ unitId: String(u.lesson_number) }));
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const num = parseInt(unitId, 10);
  if (isNaN(num)) notFound();

  const unit = getUnit(num);
  if (!unit) notFound();

  const vocab = getUnitVocab(num);
  const dialogues = getUnitDialogueContent(num);
  const constructions = getUnitConstructions(num);
  const lessonBlocks = getUnitLessonBlocks(num);
  const allVocabPool = getAllPrimerVocab();
  const allUnits = getAllUnits();
  const idx = allUnits.findIndex((u) => u.lesson_number === num);
  const prev = idx > 0 ? allUnits[idx - 1] : null;
  const next = idx < allUnits.length - 1 ? allUnits[idx + 1] : null;

  return (
    <div>
      <div className="mb-8">
        <Link href="/units" className="text-sm text-stone-400 hover:text-stone-600">
          ← All Units
        </Link>
      </div>

      <LessonFlow
        unitNum={num}
        themeEn={unit.theme_en}
        communicativeGoal={unit.communicative_goal}
        targetBand={unit.target_band}
        vocab={vocab.map((v) => ({
          id: v.id,
          headword: v.headword,
          gloss_en: v.gloss_en,
          part_of_speech: v.part_of_speech,
        }))}
        dialogues={dialogues.map((d) => ({
          lesson_dialogue_id: d.lesson_dialogue_id,
          speaker_label: d.speaker_label,
          utterance_normalized: d.utterance_normalized,
          translation_en: d.translation_en,
        }))}
        constructions={constructions.map((c) => ({
          example_original: c.example_original,
        }))}
        lessonBlocks={lessonBlocks.map((b) => ({
          text_normalized: b.text_normalized,
        }))}
        allVocabPool={allVocabPool.map((v) => ({
          id: v.id,
          headword: v.headword,
          gloss_en: v.gloss_en,
          part_of_speech: v.part_of_speech,
        }))}
        prevUnit={prev ? { num: prev.lesson_number, themeEn: prev.theme_en } : null}
        nextUnit={next ? { num: next.lesson_number, themeEn: next.theme_en } : null}
      />
    </div>
  );
}
