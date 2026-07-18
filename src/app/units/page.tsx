import { getAllUnits } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import Link from "next/link";
import UnitsListWithProgress from "./UnitsListWithProgress";
import { ArrowRight, Landmark, Map } from "lucide-react";

export default async function UnitsPage() {
  await requireAuth();
  const units = getAllUnits();

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-stone-200 pb-9 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Eastern Huasteca Nahuatl · A1–A2 + B1-oriented extensions</p>
          <h1 className="display-title mt-4 text-5xl text-stone-950 sm:text-6xl">Choose your next step.</h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">
            {units.length} carefully sequenced Eastern Huasteca Nahuatl units. Build vocabulary, hear every word, practice recall, and finish with language in context.
          </p>
        </div>
        <Link
          href="/curriculum"
          className="button-secondary w-fit"
        >
          <Map size={16} /> View course map <ArrowRight size={15} />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["A1", "A2", "B1"] as const).map((band) => {
          const bandUnits = units.filter((unit) => unit.target_band === band);
          const words = bandUnits.reduce((sum, unit) => sum + unit.english_vocab_count, 0);
          return (
            <div key={band} className="surface flex items-center gap-4 p-4">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black ${band === "A1" ? "bg-emerald-100 text-emerald-800" : band === "A2" ? "bg-sky-100 text-sky-800" : "bg-violet-100 text-violet-800"}`}>{band === "B1" ? "B1*" : band}</span>
              <div><p className="font-black text-stone-950">{band === "B1" ? `${bandUnits.length} B1-oriented units` : `${bandUnits.length} units`}</p><p className="text-xs text-stone-500">{words.toLocaleString()} learning words</p></div>
            </div>
          );
        })}
      </div>
      <p className="-mt-7 text-xs leading-5 text-stone-500">
        * B1 identifies extension material and advanced structures; it is not a CEFR certification or guaranteed exit level.
      </p>
      <section className="grid gap-4 border-y border-stone-200 py-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-950 text-white">
          <Landmark size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase text-emerald-700">Companion track</p>
          <h2 className="mt-1 font-black text-stone-950">Nahua Culture &amp; History</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
            Study Mexica history, the wider Nahua world, and living Huasteca Nahua communities without collapsing them into one story.
          </p>
        </div>
        <Link href="/culture" className="button-secondary w-fit">
          Explore history <ArrowRight size={15} />
        </Link>
      </section>
      <UnitsListWithProgress units={units} />
    </div>
  );
}
