"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadProgress, type ProgressData } from "@/lib/progress";
import type { Unit } from "@/lib/db";

const BAND_COLOR: Record<string, string> = {
  A1: "text-emerald-700 bg-emerald-100 border-emerald-200",
  A2: "text-sky-700 bg-sky-100 border-sky-200",
  B1: "text-violet-700 bg-violet-100 border-violet-200",
};

const BAND_ORDER = ["A1", "A2", "B1"];

const BAND_LABEL: Record<string, string> = {
  A1: "Beginner — A1",
  A2: "Elementary — A2",
  B1: "Intermediate — B1",
};

const BAND_SECTION: Record<string, string> = {
  A1: "text-emerald-700 bg-emerald-50 border-emerald-100",
  A2: "text-sky-700 bg-sky-50 border-sky-100",
  B1: "text-violet-700 bg-violet-50 border-violet-100",
};

export default function UnitsListWithProgress({ units }: { units: Unit[] }) {
  const [progress, setProgress] = useState<ProgressData>({ version: 1, units: {} });

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const grouped = BAND_ORDER.map((band) => ({
    band,
    units: units.filter((u) => u.target_band === band),
  })).filter((g) => g.units.length > 0);

  return (
    <div className="space-y-8">
      {grouped.map(({ band, units: bandUnits }) => (
        <div key={band}>
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border mb-2 ${BAND_SECTION[band]}`}>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${BAND_COLOR[band]}`}>
              {band}
            </span>
            <span className="text-sm font-semibold">{BAND_LABEL[band]}</span>
            <span className="text-xs ml-auto opacity-60">{bandUnits.length} units</span>
          </div>

          <div className="bg-white border border-stone-100 rounded-2xl shadow-sm divide-y divide-stone-50 overflow-hidden">
            {bandUnits.map((unit) => {
              const p = progress.units[unit.lesson_number];
              const status = p?.status ?? "not_started";
              return (
                <Link
                  key={unit.lesson_number}
                  href={`/units/${unit.lesson_number}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50/60 transition-colors group"
                >
                  <span className="text-xs font-mono text-stone-300 w-7 shrink-0">
                    {String(unit.lesson_number).padStart(2, "0")}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 group-hover:text-stone-900 truncate">
                      {unit.theme_en}
                    </p>
                    <p className="text-xs text-stone-400 truncate">{unit.communicative_goal}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-stone-300 font-mono hidden sm:block">
                      {unit.english_vocab_count}w
                    </span>
                    {status === "completed" && (
                      <span className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 text-xs font-bold">
                        ✓
                      </span>
                    )}
                    {status === "in_progress" && (
                      <span className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-500 text-xs font-bold">
                        ◑
                      </span>
                    )}
                    {status === "not_started" && (
                      <span className="text-stone-200 text-sm">→</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
