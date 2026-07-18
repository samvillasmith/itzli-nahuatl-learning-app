import type { Metadata } from "next";
import Link from "next/link";
import { getAllUnits } from "@/lib/db";
import { getCurriculumAudit } from "@/lib/curriculum";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice, translateDeep } from "@/i18n/translate";

const BAND_STYLE: Record<string, string> = {
  A1: "border-emerald-200 bg-emerald-50 text-emerald-800",
  A2: "border-sky-200 bg-sky-50 text-sky-800",
  B1: "border-violet-200 bg-violet-50 text-violet-800",
};

const BAND_LABEL: Record<string, string> = {
  A1: "A1",
  A2: "A2",
  B1: "B1-oriented",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === "es" ? "Programa del curso de náhuatl" : "Nahuatl Course Curriculum",
    description: locale === "es"
      ? "Explora 43 unidades estructuradas para aprender vocabulario, pronunciación, gramática y conversación en náhuatl."
      : "Explore 43 structured units for learning Nahuatl vocabulary, pronunciation, grammar, and conversation.",
  };
}

export default async function CurriculumPage() {
  const locale = await getRequestLocale();
  const units = translateDeep(locale, getAllUnits());
  const audit = getCurriculumAudit();
  const stages = [...new Set(units.map((unit) => unit.stage_title))].map((stage) => ({
    title: stage,
    units: units.filter((unit) => unit.stage_title === stage),
  }));
  const bandLabel = (band: string) =>
    band === "B1"
      ? trChoice(locale, "B1-oriented", "Orientado a B1")
      : BAND_LABEL[band] ?? band;
  const countLabel = (
    count: number,
    singularEnglish: string,
    pluralEnglish: string,
    singularSpanish: string,
    pluralSpanish: string,
  ) =>
    trChoice(
      locale,
      `${count} ${count === 1 ? singularEnglish : pluralEnglish}`,
      `${count} ${count === 1 ? singularSpanish : pluralSpanish}`,
    );

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div>
          <p className="mb-3 text-xs font-bold uppercase text-emerald-700">
            {tr(locale, "Curriculum Map")}
          </p>
          <h1 className="text-4xl font-black text-stone-950">
            {tr(locale, "A1 foundations through A2, with B1-oriented extensions.")}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">
            {tr(locale, "This map is the audited presentation order for the source lessons. It prioritizes communicative readiness first, then expands grammar, vocabulary, dialogue, narration, and B1-oriented control. Level labels describe the material, not a certification or guaranteed exit level.")}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-stone-500">{tr(locale, "Coverage")}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["A1", "A2", "B1"] as const).map((band) => (
              <div key={band} className={`rounded-lg border p-3 text-center ${BAND_STYLE[band]}`}>
                <div className="text-[10px] font-bold">{bandLabel(band)}</div>
                <div className="text-2xl font-black">{audit.byBand[band]}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            {trChoice(locale, `${audit.totalUnits} units across ${audit.stages} stages.`, `${audit.totalUnits} unidades en ${audit.stages} etapas.`)}
          </p>
        </div>
      </section>

      <section className="space-y-8">
        {stages.map((stage, stageIndex) => (
          <div key={stage.title}>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-950 text-sm font-black text-white">
                {stageIndex + 1}
              </span>
              <div>
                <h2 className="font-bold text-stone-950">{stage.title}</h2>
                <p className="text-xs text-stone-500">{trChoice(locale, `${stage.units.length} units`, `${stage.units.length} unidades`)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stage.units.map((unit) => (
                <Link
                  key={unit.lesson_number}
                  href={`/units/${unit.lesson_number}`}
                  className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="rounded-md bg-stone-950 px-2 py-1 text-xs font-bold text-white">
                      {unit.path_code}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${BAND_STYLE[unit.target_band]}`}>
                      {bandLabel(unit.target_band)}
                    </span>
                  </div>
                  <h3 className="font-bold leading-snug text-stone-950">{unit.theme_en}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{unit.communicative_goal}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-stone-500">
                    <span>{countLabel(unit.english_vocab_count, "word", "words", "palabra", "palabras")}</span>
                    <span>{countLabel(unit.english_dialogue_count, "line", "lines", "línea", "líneas")}</span>
                    <span>{countLabel(unit.english_construction_count, "pattern", "patterns", "patrón", "patrones")}</span>
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
