import { getAllUnits } from "@/lib/db";
import Link from "next/link";
import UnitsListWithProgress from "./UnitsListWithProgress";

export default function UnitsPage() {
  const units = getAllUnits();

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-emerald-700">
            A1 to B1 Path
          </p>
          <h1 className="text-3xl font-black text-stone-950">Learning Units</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            {units.length} curated units ordered by learner readiness. Each unit opens into
            short lesson chunks with vocabulary, pronunciation, recall, grammar, and dialogue practice.
          </p>
        </div>
        <Link
          href="/curriculum"
          className="inline-flex w-fit rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-800"
        >
          Curriculum map
        </Link>
      </div>
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {(["A1", "A2", "B1"] as const).map((band) => {
          const bandUnits = units.filter((unit) => unit.target_band === band);
          const words = bandUnits.reduce((sum, unit) => sum + unit.english_vocab_count, 0);
          return (
            <div key={band} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-stone-500">{band}</p>
              <p className="mt-1 text-2xl font-black text-stone-950">{bandUnits.length}</p>
              <p className="text-xs text-stone-500">{words.toLocaleString()} words</p>
            </div>
          );
        })}
      </div>
      <UnitsListWithProgress units={units} />
    </div>
  );
}
