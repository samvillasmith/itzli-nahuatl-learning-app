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

export default function UnitsListWithProgress({ units }: { units: Unit[] }) {
  const [progress, setProgress] = useState<ProgressData>({ version: 1, units: {} });

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  return (
    <div className="bg-white border border-stone-100 rounded-2xl shadow-sm divide-y divide-stone-50 overflow-hidden">
      {units.map((unit) => {
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
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    BAND_COLOR[unit.target_band]
                  }`}
                >
                  {unit.target_band}
                </span>
                <span className="font-semibold text-stone-800 group-hover:text-stone-900 truncate">
                  {unit.theme_en}
                </span>
              </div>
              <p className="text-xs text-stone-400 truncate">{unit.communicative_goal}</p>
            </div>

            {/* Right side */}
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
  );
}
