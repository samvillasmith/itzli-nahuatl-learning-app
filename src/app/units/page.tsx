import { getUnifiedCoursePath } from "@/lib/unified-course-path";
import { getAllUnits } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import Link from "next/link";
import UnitsListWithProgress from "./UnitsListWithProgress";
import ContinuePathLink from "../ContinuePathLink";
import { ArrowRight, Map } from "lucide-react";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice } from "@/i18n/translate";

export default async function UnitsPage() {
  await requireAuth();
  const locale = await getRequestLocale();
  const units = getUnifiedCoursePath(getAllUnits());
  const stages = new Set(units.map((unit) => unit.stageTitleEn));

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-stone-200 pb-9 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{tr(locale, "Eastern Huasteca Nahuatl")}</p>
          <h1 className="display-title mt-4 text-5xl text-stone-950 sm:text-6xl">{trChoice(locale, "Your learning path.", "Tu camino de aprendizaje.")}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">
            {trChoice(locale, "Build your Nahuatl one lesson at a time. Learn words, understand the patterns, and practice using them together. Continue where you left off, or revisit a familiar lesson.", "Construye tu náhuatl una lección a la vez. Aprende palabras, comprende los patrones y practica cómo usarlos juntos. Continúa donde te quedaste o repasa una lección conocida.")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <ContinuePathLink units={units} className="button-primary w-fit">{trChoice(locale, "Continue your path", "Continuar tu camino")} <ArrowRight size={15} /></ContinuePathLink>
          <Link href="/curriculum" className="button-secondary w-fit"><Map size={16} /> {tr(locale, "View course map")}</Link>
        </div>
      </div>
      <p className="text-sm font-semibold text-stone-500">{trChoice(locale, `${units.length} guided lessons · ${stages.size} stages · One path`, `${units.length} lecciones guiadas · ${stages.size} etapas · Un solo camino`)}</p>
      <UnitsListWithProgress units={units} />
    </div>
  );
}
