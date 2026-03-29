"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadProgress } from "@/lib/progress";
import type { Unit } from "@/lib/db";

const BAND_COLOR: Record<string, string> = {
  A1: "text-emerald-700 bg-emerald-100 border-emerald-200",
  A2: "text-sky-700 bg-sky-100 border-sky-200",
  B1: "text-violet-700 bg-violet-100 border-violet-200",
};

const BAND_HOVER: Record<string, string> = {
  A1: "hover:border-emerald-400 hover:shadow-emerald-100",
  A2: "hover:border-sky-400 hover:shadow-sky-100",
  B1: "hover:border-violet-400 hover:shadow-violet-100",
};

export default function HomeUnitsGrid({ units }: { units: Unit[] }) {
  const [statuses, setStatuses] = useState<Record<string, "completed" | "in_progress">>({});

  useEffect(() => {
    const p = loadProgress();
    const result: Record<string, "completed" | "in_progress"> = {};
    for (const [k, v] of Object.entries(p.units)) {
      if (v?.status) result[k] = v.status;
    }
    setStatuses(result);
  }, []);

  const bands = ["A1", "A2", "B1"] as const;

  return (
    <>
      {bands.map((band) => {
        const bandUnits = units.filter((u) => u.target_band === band);
        if (!bandUnits.length) return null;
        const bandLabel = band === "A1" ? "Beginner" : band === "A2" ? "Elementary" : "Intermediate";

        return (
          <section key={band} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${BAND_COLOR[band]}`}>
                {band}
              </span>
              <h2 className="text-base font-semibold text-stone-600">{bandLabel}</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bandUnits.map((unit) => {
                const status = statuses[String(unit.lesson_number)];

                return (
                  <Link
                    key={unit.lesson_number}
                    href={`/units/${unit.lesson_number}`}
                    className={`relative bg-white border-2 rounded-2xl p-4 transition-all hover:shadow-md ${
                      status === "completed"
                        ? "border-emerald-300 hover:border-emerald-400"
                        : status === "in_progress"
                        ? "border-amber-300 hover:border-amber-400"
                        : `border-stone-200 ${BAND_HOVER[band]}`
                    }`}
                  >
                    {/* Progress badge */}
                    {status === "completed" && (
                      <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="text-white text-[9px] font-black leading-none">✓</span>
                      </span>
                    )}
                    {status === "in_progress" && (
                      <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                        <span className="text-white text-[9px] font-black leading-none">◑</span>
                      </span>
                    )}

                    <div className="mb-2">
                      <span className="text-xs font-mono text-stone-400">{unit.unit_code}</span>
                    </div>
                    <h3 className="text-sm font-bold text-stone-800 leading-snug mb-1.5">
                      {unit.theme_en}
                    </h3>
                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                      {unit.communicative_goal}
                    </p>

                    {/* Completion indicator */}
                    {status === "completed" && (
                      <p className="text-xs text-emerald-600 font-semibold mt-2">Complete ✓</p>
                    )}
                    {status === "in_progress" && (
                      <p className="text-xs text-amber-500 font-semibold mt-2">In progress…</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
