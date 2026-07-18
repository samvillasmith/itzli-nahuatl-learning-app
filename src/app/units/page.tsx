import { getAllUnits } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import Link from "next/link";
import UnitsListWithProgress from "./UnitsListWithProgress";
import { ArrowRight, Landmark, Map } from "lucide-react";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice, translateDeep } from "@/i18n/translate";

export default async function UnitsPage() {
  await requireAuth();
  const locale = await getRequestLocale();
  const units = translateDeep(locale, getAllUnits());

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-stone-200 pb-9 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{tr(locale, "Eastern Huasteca Nahuatl · A1–A2 + B1-oriented extensions")}</p>
          <h1 className="display-title mt-4 text-5xl text-stone-950 sm:text-6xl">{tr(locale, "Choose your next step.")}</h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">
            {trChoice(locale, `${units.length} carefully sequenced Eastern Huasteca Nahuatl units. Build vocabulary, hear every word, practice recall, and finish with language in context.`, `${units.length} unidades de náhuatl de la Huasteca veracruzana cuidadosamente secuenciadas. Desarrolla tu vocabulario, escucha cada palabra, practica la memoria y termina usando el idioma en contexto.`)}
          </p>
        </div>
        <Link
          href="/curriculum"
          className="button-secondary w-fit"
        >
          <Map size={16} /> {tr(locale, "View course map")} <ArrowRight size={15} />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["A1", "A2", "B1"] as const).map((band) => {
          const bandUnits = units.filter((unit) => unit.target_band === band);
          const words = bandUnits.reduce((sum, unit) => sum + unit.english_vocab_count, 0);
          return (
            <div key={band} className="surface flex items-center gap-4 p-4">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black ${band === "A1" ? "bg-emerald-100 text-emerald-800" : band === "A2" ? "bg-sky-100 text-sky-800" : "bg-violet-100 text-violet-800"}`}>{band === "B1" ? "B1*" : band}</span>
              <div><p className="font-black text-stone-950">{band === "B1" ? trChoice(locale, `${bandUnits.length} B1-oriented units`, `${bandUnits.length} unidades orientadas a B1`) : trChoice(locale, `${bandUnits.length} units`, `${bandUnits.length} unidades`)}</p><p className="text-xs text-stone-500">{trChoice(locale, `${words.toLocaleString()} learning words`, `${words.toLocaleString("es-MX")} palabras de aprendizaje`)}</p></div>
            </div>
          );
        })}
      </div>
      <p className="-mt-7 text-xs leading-5 text-stone-500">
        {tr(locale, "* B1 identifies extension material and advanced structures; it is not a CEFR certification or guaranteed exit level.")}
      </p>
      <section className="grid gap-4 border-y border-stone-200 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-950 text-white">
          <Landmark size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase text-emerald-700">{tr(locale, "Companion track")}</p>
          <h2 className="mt-1 font-black text-stone-950">{tr(locale, "Nahua Culture & History")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
            {tr(locale, "Study Mexica history, the wider Nahua world, and living Huasteca Nahua communities without collapsing them into one story.")}
          </p>
        </div>
        <Link href="/culture" className="button-secondary w-fit">
          {tr(locale, "Explore history")} <ArrowRight size={15} />
        </Link>
      </section>
      <UnitsListWithProgress units={units} />
    </div>
  );
}
