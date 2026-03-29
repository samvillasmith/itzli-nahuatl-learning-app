import Link from "next/link";
import { getAllUnits } from "@/lib/db";
import HomeUnitsGrid from "./HomeUnitsGrid";

export default function Home() {
  const units = getAllUnits();
  const a1Count = units.filter((u) => u.target_band === "A1").length;
  const a2Count = units.filter((u) => u.target_band === "A2").length;
  const b1Count = units.filter((u) => u.target_band === "B1").length;

  return (
    <div>
      {/* Hero */}
      <div className="mb-12">
        <p className="text-xs font-bold text-emerald-600 mb-3 uppercase tracking-widest">
          Itzli · Obsidian Blade
        </p>
        <h1 className="text-4xl font-bold text-stone-900 mb-4 leading-tight">
          Learn Eastern Huasteca Nahuatl
        </h1>
        <p className="text-lg text-stone-500 max-w-xl leading-relaxed">
          A structured A1–B1 curriculum built from the Flor y Canto Nahuatl
          infrastructure — spoken-first, bite-sized lessons.
        </p>
        <div className="flex gap-3 mt-7 flex-wrap">
          <Link
            href="/units/1"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            Start learning →
          </Link>
          <Link
            href="/progress"
            className="inline-flex items-center gap-2 border-2 border-stone-200 hover:border-stone-300 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white transition-colors"
          >
            View progress
          </Link>
          <Link
            href="/vocabulary"
            className="inline-flex items-center gap-2 border-2 border-stone-200 hover:border-stone-300 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white transition-colors"
          >
            Browse vocabulary
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-12">
        {[
          { label: "A1 Beginner", value: String(a1Count), sub: "units", color: "text-emerald-600" },
          { label: "A2 Elementary", value: String(a2Count), sub: "units", color: "text-sky-600" },
          { label: "B1 Intermediate", value: String(b1Count), sub: "units", color: "text-violet-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-stone-200 rounded-2xl p-5 text-center"
          >
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-stone-400 mt-0.5 font-medium">{s.sub}</div>
            <div className="text-xs text-stone-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Units grid — client component for progress badges */}
      <HomeUnitsGrid units={units} />
    </div>
  );
}
