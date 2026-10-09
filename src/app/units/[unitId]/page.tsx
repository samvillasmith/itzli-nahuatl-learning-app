import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getUnit,
  getUnitVocab,
  getUnitDialogueContent,
  getUnitConstructions,
  getUnitLessonBlocks,
  getAllPrimerVocab,
} from "@/lib/db";
import { getGrammarLabsForUnit } from "@/data/grammar-labs";
import { getNahuatlahtolliLesson } from "@/lib/nahuatlahtolli";
import { displayNahuatl } from "@/lib/orthography";
import { requireAuth } from "@/lib/require-auth";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice, translateDeep } from "@/i18n/translate";
import LessonFlow from "./LessonFlow";
import GuidedPathLesson from "@/components/GuidedPathLesson";
import type { ExpansionCourse } from "@/lib/expansion-course";
import { getUnifiedPathLessons, getUnifiedPathLesson, getAdjacentUnifiedPathLessons, getUnifiedGrammarCourse, getUnifiedVocabularyEntries } from "@/lib/unified-course-path";
import { getInstructionalLessonPayload } from "@/lib/instructional-lessons";
import LessonCefrNote from "@/components/LessonCefrNote";
import ReportIssueButton from "@/components/ReportIssueButton";
import { localizedPathname } from "@/i18n/config";
import { getLocalReviewWordImages } from "@/lib/local-review-word-images";
import { getGuidedPhraseImages } from "@/lib/guided-phrase-images";
import { getReviewedVocabularyLabels } from "@/lib/reviewed-vocabulary-labels.cjs";

const vocabularyCourse: ExpansionCourse = { schemaVersion: 1, license: {}, sources: [], phrases: [], rules: [], units: [], coverage: [] };

export async function generateStaticParams() {
  return getUnifiedPathLessons().map(unit => ({ unitId: String(unit.lessonNumber) }));
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  await requireAuth();
  const locale = await getRequestLocale();
  const { unitId } = await params;
  if (!/^[1-9][0-9]*$/.test(unitId)) notFound();
  const num = Number(unitId);
  if (!Number.isSafeInteger(num)) notFound();
  const pathLesson = getUnifiedPathLesson(num);
  if (!pathLesson) notFound();
  const adjacent = getAdjacentUnifiedPathLessons(num);
  const reportContext = { pagePath: localizedPathname(`/units/${num}`, locale), lessonNumber: num,
    lessonId: pathLesson.progressId, lessonTitle: pathLesson.title[locale] };

  if (pathLesson.kind !== "legacy") {
    const instructional = getInstructionalLessonPayload(pathLesson.progressId);
    const lessonCourse = instructional?.course ?? (pathLesson.kind === "grammar" ? getUnifiedGrammarCourse() : vocabularyCourse);
    const lessonUnit = instructional?.unit ?? pathLesson.sourceUnit;
    const phraseIds = [...(lessonUnit?.phraseIds ?? []), ...(instructional?.blueprint.contextPhraseIds ?? []),
      ...(instructional?.blueprint.builders.flatMap(builder => [builder.phraseId, ...(builder.acceptedPhraseIds ?? [])]) ?? []),
      ...(instructional?.blueprint.dialogues.flatMap(dialogue => dialogue.turns.map(turn => turn.phraseId)) ?? [])];
    const formImages = getGuidedPhraseImages(lessonCourse, phraseIds);
    const lessonEntries = pathLesson.entries ?? (instructional
      ? getUnifiedVocabularyEntries().filter(entry => instructional.blueprint.vocabularyIds.includes(entry.id)) : []);
    const reviewedLabels = getReviewedVocabularyLabels();
    const previewImages = getLocalReviewWordImages(lessonEntries.map(entry => ({
      entryId: entry.id, headword: entry.display, meaningEn: entry.meaningEn, meaningEs: entry.meaningEs,
      sourceFactReviewHash: reviewedLabels.find(row => row.id === entry.id)?.sourceFactReviewHash,
    })));
    return <div>
      <div className="mb-8"><Link href="/units" className="text-sm text-stone-400 hover:text-stone-600">← {locale === "es" ? "Tu camino" : "Your path"}</Link></div>
      <div className="mb-5 flex justify-end"><ReportIssueButton context={reportContext} /></div>
      <LessonCefrNote lesson={pathLesson} locale={locale} />
      <GuidedPathLesson key={pathLesson.progressId} unitNum={pathLesson.pathOrder} lessonNumber={num}
        title={pathLesson.title} goal={pathLesson.goal} durationMinutes={pathLesson.durationMinutes}
        progressId={pathLesson.progressId} course={lessonCourse}
        unit={lessonUnit} entries={lessonEntries}
        previewImages={previewImages} formImages={formImages}
        interactiveBlueprint={instructional?.blueprint}
        prevUnit={adjacent.previous ? { num: adjacent.previous.lessonNumber, title: adjacent.previous.title } : null}
        nextUnit={adjacent.next ? { num: adjacent.next.lessonNumber, title: adjacent.next.title } : null} />
    </div>;
  }

  const sourceUnit = getUnit(num);
  if (!sourceUnit) notFound();
  const unit = translateDeep(locale, sourceUnit);

  const vocab = getUnitVocab(num).map((entry) => ({
    ...entry,
    safety_gloss_en: entry.gloss_en,
    gloss_en: tr(locale, entry.gloss_en),
  }));
  const previewImages = getLocalReviewWordImages(vocab.map(entry => ({
    entryId: `core-${entry.id}`, headword: entry.headword, meaningEn: entry.safety_gloss_en,
  })));
  const dialogues = getUnitDialogueContent(num).map((dialogue) => ({
    ...dialogue,
    translation_en: dialogue.translation_en ? tr(locale, dialogue.translation_en) : dialogue.translation_en,
  }));
  const constructions = translateDeep(locale, getUnitConstructions(num));
  const lessonBlocks = translateDeep(locale, getUnitLessonBlocks(num));
  const grammarLabs = translateDeep(locale, getGrammarLabsForUnit(num));
  const sourceLesson = translateDeep(locale, getNahuatlahtolliLesson(num));
  const allVocabPool = getAllPrimerVocab().map((entry) => ({
    ...entry,
    safety_gloss_en: entry.gloss_en,
    gloss_en: tr(locale, entry.gloss_en),
  }));
  const prev = adjacent.previous;
  const next = adjacent.next;

  return (
    <div>
      <div className="mb-8">
        <Link href="/units" className="text-sm text-stone-400 hover:text-stone-600">
          ← {tr(locale, "All Units")}
        </Link>
      </div>

      <div className="mb-5 flex justify-end"><ReportIssueButton context={reportContext} /></div>
      <LessonCefrNote lesson={pathLesson} locale={locale} />

      {num === 1 && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-amber-800 uppercase mb-1.5">
            {tr(locale, "New to Nahuatl spelling?")}
          </p>
          <p className="text-sm text-stone-600 leading-relaxed mb-3">
            {locale === "es" ? (
              <>La <strong>ortografía de enseñanza sigue el alfabeto del INALI</strong>, incluidos k, w, kw, ts y h. Las lecciones y la práctica usan la misma escritura. Empieza con la guía de pronunciación; la pregunta del nombre se practica como <strong>kenihki motokah</strong>.</>
            ) : (
              <>The <strong>teaching orthography follows INALI&apos;s alphabet</strong>, including k, w, kw, ts, and h. Lessons and practice use the same spelling. Start with the pronunciation guide; the name question is practiced as <strong>kenihki motokah</strong>.</>
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/grammar/alphabet"
              className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-900"
            >
              {tr(locale, "Read: Pronunciation Guide")} →
            </Link>
            <Link
              href="/grammar/orthographic-systems"
              className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-900"
            >
              {tr(locale, "Orthographic Systems")} →
            </Link>
          </div>
        </div>
      )}

      {sourceLesson && (
        <section className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-emerald-700">
                {tr(locale, "Nawatlahtolli source lesson")}
              </p>
              <h2 className="text-lg font-black text-stone-950">
                {displayNahuatl(sourceLesson.nahuatlTitle)}
              </h2>
              {sourceLesson.englishTitle && (
                <p className="mt-1 text-sm text-stone-600">{sourceLesson.englishTitle}</p>
              )}
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                {trChoice(
                  locale,
                  `This unit now includes the original COERLL lesson material: ${sourceLesson.sections.length} sections, ${sourceLesson.vocabulary.length} audio-backed source vocabulary entries, and provenance links under CC BY-SA.`,
                  `Esta unidad ahora incluye el material original de la lección de COERLL: ${sourceLesson.sections.length} secciones, ${sourceLesson.vocabulary.length} entradas de vocabulario de la fuente con audio y enlaces de procedencia bajo CC BY-SA.`,
                )}
              </p>
            </div>
            <Link
              href={`/source-course/${sourceLesson.number}`}
              className="inline-flex w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              {tr(locale, "Open source lesson")}
            </Link>
          </div>
        </section>
      )}

      <LessonFlow
        unitNum={num}
        pathCode={pathLesson.pathCode}
        themeEn={unit.theme_en}
        communicativeGoal={unit.communicative_goal}
        cefrDescriptor={unit.cefr_descriptor}
        capstoneTask={unit.capstone_task}
        targetBand={unit.target_band}
        vocab={vocab.map((v) => ({
          id: v.id,
          headword: v.headword,
          gloss_en: v.gloss_en,
          safety_gloss_en: v.safety_gloss_en,
          part_of_speech: v.part_of_speech,
          audioSrc: v.audioSrc,
          imageHeadword: v.imageHeadword,
          sourceUrl: v.sourceUrl,
          previewImage: previewImages[`core-${v.id}`],
        }))}
        dialogues={dialogues.map((d) => ({
          lesson_dialogue_id: d.lesson_dialogue_id,
          speaker_label: d.speaker_label,
          utterance_normalized: d.utterance_normalized,
          translation_en: d.translation_en,
          audio_available: d.audio_available,
        }))}
        constructions={constructions.map((c) => ({
          audioReferenceId: `construction:${num}:${c.priority_id}`,
          example_original: c.example_original,
          construction_label: c.construction_label,
          translation_en: c.translation_en,
        }))}
        lessonBlocks={lessonBlocks.map((b) => ({
          text_normalized: b.text_normalized,
        }))}
        grammarLabs={grammarLabs}
        allVocabPool={allVocabPool.map((v) => ({
          id: v.id,
          headword: v.headword,
          gloss_en: v.gloss_en,
          safety_gloss_en: v.safety_gloss_en,
          part_of_speech: v.part_of_speech,
          audioSrc: v.audioSrc,
          imageHeadword: v.imageHeadword,
          sourceUrl: v.sourceUrl,
          previewImage: previewImages[`core-${v.id}`],
        }))}
        prevUnit={prev ? { num: prev.lessonNumber, themeEn: prev.title[locale] } : null}
        nextUnit={next ? { num: next.lessonNumber, themeEn: next.title[locale] } : null}
      />
    </div>
  );
}
