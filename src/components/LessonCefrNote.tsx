import { CEFR_SCALES, getLessonCefrAlignment } from "@/lib/cefr-alignment";
import type { UnifiedPathLesson } from "@/lib/unified-course-path";
import type { AppLocale } from "@/i18n/config";
import { trChoice } from "@/i18n/translate";

export default function LessonCefrNote({ lesson, locale }: { lesson: UnifiedPathLesson; locale: AppLocale }) {
  const alignment = getLessonCefrAlignment(lesson);
  return <details className="mb-6 rounded-lg border border-stone-200 bg-white/70 px-4 py-3 text-xs leading-6 text-stone-600">
    <summary className="cursor-pointer font-semibold text-emerald-800">{alignment.label[locale]} · {trChoice(locale, "Learning goal", "Objetivo de aprendizaje")}</summary>
    <p className="mt-2">{alignment.canDo[locale]}</p>
    <p className="mt-2">{alignment.scaleIds.map(id => CEFR_SCALES[id].name[locale]).join(" · ")}</p>
    <p className="mt-2">{alignment.assessmentLimit[locale]}</p>
    <a href={alignment.framework.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-emerald-700 underline">{trChoice(locale, "CEFR reference: Council of Europe (2020)", "Referencia del MCER: Consejo de Europa (2020)")}</a>
  </details>;
}
