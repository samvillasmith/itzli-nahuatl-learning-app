import type { AppLocale } from "@/i18n/config";
import { trChoice } from "@/i18n/translate";
import { getUnifiedCoursePath, getUnifiedVocabularyCount } from "@/lib/unified-course-path";
import { GENERATED_AUDIO_ASSETS } from "@/lib/generated-audio";

export default function CourseSizeSummary({ locale }: { locale: AppLocale }) {
  const metrics = [
    { value: getUnifiedCoursePath().length, en: "free guided lessons", es: "lecciones guiadas gratuitas" },
    { value: getUnifiedVocabularyCount(), en: "words and written forms", es: "palabras y formas escritas" },
    { value: GENERATED_AUDIO_ASSETS.length, en: "practice audio clips", es: "audios de práctica" },
  ];
  return <section id="course-size" aria-labelledby="course-size-heading" className="scroll-mt-28 space-y-5 border-t border-stone-200 pt-10 sm:pt-14">
    <div className="max-w-3xl space-y-4">
      <h2 id="course-size-heading" className="display-title text-3xl text-stone-950 sm:text-4xl">{trChoice(locale, "What Itzli V3 includes", "Qué incluye Itzli V3")}</h2>
      <p className="text-sm leading-7 text-stone-600">{trChoice(locale,
        "One free, guided course in Eastern Huasteca Nahuatl, with vocabulary, grammar, sentence building, and conversation practice. Refreshed pronunciation audio accompanies original speaker recordings where available.",
        "Un curso guiado y gratuito de náhuatl de la Huasteca veracruzana, con vocabulario, gramática, construcción de oraciones y práctica de conversación. El audio de pronunciación renovado acompaña las grabaciones originales de hablantes donde están disponibles.")}</p>
    </div>
    <dl className="grid gap-4 sm:grid-cols-3">
      {metrics.map(metric => <div key={metric.en} className="rounded-xl border border-stone-200 bg-white/80 p-5">
        <dt className="text-sm font-semibold text-stone-600">{trChoice(locale, metric.en, metric.es)}</dt>
        <dd className="mt-2 text-4xl font-black tabular-nums tracking-tight text-emerald-800">{metric.value.toLocaleString(locale === "es" ? "es-MX" : "en-US")}</dd>
      </div>)}
    </dl>
    <p className="max-w-3xl text-xs leading-6 text-stone-500">{trChoice(locale,
      "The vocabulary total counts distinct written words and forms in the current learner course. Sources, credits, and pronunciation notes remain available below.",
      "El total de vocabulario cuenta palabras y formas escritas distintas del curso actual. Las fuentes, los créditos y las notas de pronunciación están disponibles más abajo.")}</p>
  </section>;
}
