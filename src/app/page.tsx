import Link from "next/link";
import { getAllUnits } from "@/lib/db";

const BAND_COLOR: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-800",
  A2: "bg-sky-100 text-sky-800",
  B1: "bg-violet-100 text-violet-800",
};

const BAND_BORDER: Record<string, string> = {
  A1: "border-emerald-200 hover:border-emerald-400",
  A2: "border-sky-200 hover:border-sky-400",
  B1: "border-violet-200 hover:border-violet-400",
};

export default function Home() {
  const units = getAllUnits();
  const bands = ["A1", "A2", "B1"] as const;

  return (
    <div>
      {/* Hero */}
      <div className="mb-12">
        <p className="text-sm font-mono text-stone-400 mb-2 uppercase tracking-widest">
          Itzli · Obsidian Blade
        </p>
        <h1 className="text-4xl font-bold text-stone-900 mb-4">
          Learn Eastern Huasteca Nahuatl
        </h1>
        <p className="text-lg text-stone-500 max-w-2xl">
          A structured A1–B1 curriculum built from the Flor y Canto Nahuatl
          infrastructure — 32 units, 1,008 vocabulary items, spoken-first.
        </p>
        <div className="flex gap-6 mt-6">
          <Link
            href="/units/1"
            className="inline-flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Start from the beginning →
          </Link>
          <Link
            href="/vocabulary"
            className="inline-flex items-center gap-2 border border-stone-300 text-stone-600 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Browse vocabulary
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {[
          { label: "Units", value: "32" },
          { label: "Vocabulary items", value: "37k+" },
          { label: "CEFR bands", value: "A1 – B1" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-stone-200 rounded-xl p-5"
          >
            <div className="text-2xl font-bold text-stone-900">{s.value}</div>
            <div className="text-sm text-stone-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Units by band */}
      {bands.map((band) => {
        const bandUnits = units.filter((u) => u.target_band === band);
        if (!bandUnits.length) return null;
        return (
          <section key={band} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${BAND_COLOR[band]}`}
              >
                {band}
              </span>
              <h2 className="text-base font-semibold text-stone-600">
                {band === "A1"
                  ? "Beginner"
                  : band === "A2"
                  ? "Elementary"
                  : "Intermediate"}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bandUnits.map((unit) => (
                <Link
                  key={unit.lesson_number}
                  href={`/units/${unit.lesson_number}`}
                  className={`bg-white border rounded-xl p-4 transition-all hover:shadow-md ${BAND_BORDER[band]}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono text-stone-400">
                      {unit.unit_code}
                    </span>
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${BAND_COLOR[band]}`}
                    >
                      {band}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-stone-800 leading-snug">
                    {unit.theme_en}
                  </h3>
                  <p className="text-xs text-stone-400 mt-2 line-clamp-2">
                    {unit.communicative_goal}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
