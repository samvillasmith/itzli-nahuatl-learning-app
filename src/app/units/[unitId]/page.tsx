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
  getUnitAssessments,
} from "@/lib/db";
import { getGrammarLabsForUnit } from "@/data/grammar-labs";
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
  const grammarLabs = getGrammarLabsForUnit(num);
  const assessments = getUnitAssessments(num);
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

      {num === 1 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-amber-800 uppercase mb-1.5">
            New to Nahuatl spelling?
          </p>
          <p className="text-sm text-stone-600 leading-relaxed mb-3">
            This course uses the <strong>IDIEZ</strong> orthographic standard. You may encounter Nahuatl spelled differently elsewhere (INALI, SEP, or older conventions). A 2-minute explainer covers the differences and what to expect.
          </p>
          <Link
            href="/grammar/orthographic-systems"
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-900"
          >
            Read: Orthographic Systems →
          </Link>
        </div>
      )}

      <LessonFlow
        unitNum={num}
        pathCode={unit.path_code}
        themeEn={unit.theme_en}
        communicativeGoal={unit.communicative_goal}
        cefrDescriptor={unit.cefr_descriptor}
        capstoneTask={unit.capstone_task}
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
          audio_available: d.audio_available,
        }))}
        constructions={constructions.map((c) => ({
          example_original: c.example_original,
          construction_label: c.construction_label,
          translation_en: c.translation_en,
        }))}
        lessonBlocks={lessonBlocks.map((b) => ({
          text_normalized: b.text_normalized,
        }))}
        grammarLabs={grammarLabs}
        assessments={assessments.map((a) => ({
          assessment_id: a.assessment_id,
          lesson_number: a.lesson_number,
          proficiency_band: a.proficiency_band,
          item_type: a.item_type,
          prompt: a.prompt,
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
