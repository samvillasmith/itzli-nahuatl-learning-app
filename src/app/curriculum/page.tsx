import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllUnits } from "@/lib/db";
import { getUnifiedCoursePath, getUnifiedVocabularyCount } from "@/lib/unified-course-path";
import { groupCoursePath } from "@/lib/course-path-groups";
import { getRequestLocale } from "@/i18n/server";
import { trChoice } from "@/i18n/translate";
import { CEFR_REFERENCE } from "@/lib/cefr-alignment";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const lessonCount = getUnifiedCoursePath().length;
  const wordCount = getUnifiedVocabularyCount().toLocaleString(locale === "es" ? "es-MX" : "en-US");
  return createPageMetadata({
    locale,
    pathname: "/curriculum",
    title: trChoice(locale, "Free Nahuatl Lessons for Beginners", "Lecciones gratis de náhuatl para principiantes"),
    description: locale === "es"
      ? `Explora ${lessonCount} lecciones gratis de náhuatl y ${wordCount} palabras y formas. Aprende vocabulario, gramática y pronunciación de la Huasteca veracruzana.`
      : `Explore ${lessonCount} free Nahuatl lessons and ${wordCount} words and forms. A beginner course in Eastern Huasteca Nahuatl with vocabulary, grammar, and pronunciation.`,
  });
}

export default async function CurriculumPage() {
  const locale = await getRequestLocale();
  const units = getUnifiedCoursePath(getAllUnits());
  const stages = groupCoursePath(units);

  return (
    <div className="space-y-10">
      <section className="grid gap-8 border-b border-stone-200 pb-9 lg:grid-cols-[1fr_18rem]">
        <div>
          <p className="eyebrow">{trChoice(locale, "Course map", "Mapa del curso")}</p>
          <h1 className="display-title mt-4 text-5xl text-stone-950 sm:text-6xl">{trChoice(locale, "Your path to learning Nahuatl.", "Tu camino para aprender náhuatl.")}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">
            {trChoice(locale, "Start with sounds and greetings. Build sentences, learn how the language works, and grow the words you can use in everyday life. The entire course follows the same learning path.", "Comienza con los sonidos y los saludos. Construye oraciones, aprende cómo funciona el idioma y amplía las palabras que puedes usar en la vida diaria. Todo el curso sigue el mismo camino de aprendizaje.")}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">{trChoice(locale,
            "CEFR-aligned task goals guide the course: supported everyday exchanges at A1, routine descriptions and reports at A2, and selected B1-oriented extensions for linked ideas. Each lesson identifies the task it rehearses. Word-only lessons build vocabulary; guided answers do not establish independent speaking proficiency. Itzli is not officially CEFR certified.",
            "Los objetivos de tareas alineados con el MCER orientan el curso: intercambios cotidianos con apoyo en A1, descripciones e informes habituales en A2 y extensiones seleccionadas orientadas a B1 para conectar ideas. Cada lección identifica la tarea que ensaya. Las lecciones solo de palabras amplían vocabulario; responder con ayuda no demuestra dominio oral independiente. Itzli no tiene certificación oficial del MCER.")}{" "}<a href={CEFR_REFERENCE.url} className="font-semibold text-emerald-700 underline" target="_blank" rel="noopener noreferrer">{trChoice(locale, "Council of Europe (2020)", "Consejo de Europa (2020)")}</a></p>
          <Link href="/units" className="button-primary mt-6 w-fit">{trChoice(locale, "Go to your path", "Ir a tu camino")} <ArrowRight size={16} /></Link>
        </div>
        <div className="surface self-start p-5">
          <p className="text-xs font-bold uppercase text-emerald-700">{trChoice(locale, "Your course", "Tu curso")}</p>
          <p className="display-title mt-3 text-5xl text-emerald-950">{units.length}</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{trChoice(locale, `guided lessons across ${stages.length} stages.`, `lecciones guiadas en ${stages.length} etapas.`)}</p>
          <p className="mt-4 text-xs leading-5 text-stone-500">{trChoice(locale, "Level labels describe the material; they do not certify a proficiency level.", "Las etiquetas de nivel describen el material; no certifican un nivel de dominio.")}</p>
        </div>
      </section>

      <section className="space-y-10">
        {stages.map((stage, stageIndex) => (
          <div key={`${stage.title}-${stageIndex}`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950 text-sm font-black text-white">{stageIndex + 1}</span>
              <div>
                <h2 className="font-bold text-stone-950">{locale === "es" ? stage.units[0].stageTitleEs : stage.units[0].stageTitleEn}</h2>
                <p className="text-xs text-stone-500">{trChoice(locale, `${stage.units.length} lessons`, `${stage.units.length} lecciones`)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stage.units.map((unit) => (
                <Link
                  key={unit.lessonNumber}
                  href={`/units/${unit.lessonNumber}`}
                  className="rounded-2xl border border-stone-200 bg-white/85 p-5 shadow-[0_8px_25px_rgba(39,36,31,.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-stone-950 px-2 py-1 text-xs font-bold text-white">{unit.pathCode}</span>
                    <span className="text-xs font-semibold text-stone-400">{unit.durationMinutes} min</span>
                  </div>
                  <h3 className="font-bold leading-snug text-stone-950">{locale === "es" ? unit.titleEs : unit.titleEn}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{locale === "es" ? unit.goalEs : unit.goalEn}</p>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                    {unit.wordCount > 0 && <span>{trChoice(locale, `${unit.wordCount} words`, `${unit.wordCount} palabras`)}</span>}
                    {unit.dialogueCount > 0 && <span>{trChoice(locale, `${unit.dialogueCount} dialogue lines`, `${unit.dialogueCount} líneas de diálogo`)}</span>}
                    {unit.patternCount > 0 && <span>{trChoice(locale, `${unit.patternCount} patterns`, `${unit.patternCount} patrones`)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
