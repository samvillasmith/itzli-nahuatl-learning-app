"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadProgress, type ProgressData } from "@/lib/progress";
import type { Unit } from "@/lib/db";

const BAND_COLOR: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-800",
  A2: "bg-sky-100 text-sky-800",
  B1: "bg-violet-100 text-violet-800",
};

export default function UnitsListWithProgress({ units }: { units: Unit[] }) {
  const [progress, setProgress] = useState<ProgressData>({ version: 1, units: {} });

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  return (
    <div className="divide-y divide-stone-100">
      {units.map((unit) => {
        const p = progress.units[unit.lesson_number];
        const status = p?.status ?? "not_started";
        return (
          <Link
            key={unit.lesson_number}
            href={`/units/${unit.lesson_number}`}
            className="flex items-start gap-4 py-4 hover:bg-stone-50 -mx-4 px-4 rounded-xl transition-colors group"
          >
            <span className="text-sm font-mono text-stone-300 w-8 shrink-0 pt-0.5">
              {String(unit.lesson_number).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BAND_COLOR[unit.target_band]}`}>
                  {unit.target_band}
                </span>
                <span className="font-semibold text-stone-800 group-hover:text-stone-900">
                  {unit.theme_en}
                </span>
              </div>
              <p className="text-sm text-stone-500 truncate">{unit.communicative_goal}</p>
            </div>
            {/* Right side: word count + status */}
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <span className="text-xs text-stone-300 font-mono">{unit.english_vocab_count}w</span>
              {status === "completed" && (
                <span className="text-xs font-bold text-emerald-500">✓</span>
              )}
              {status === "in_progress" && (
                <span className="text-xs font-bold text-amber-400">◑</span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
