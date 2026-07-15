"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadProgress, type ProgressData } from "@/lib/progress";
import { emptyProgress } from "@/lib/progress-schema";
import { pullAndMerge } from "@/lib/cloudSync";
import { useUser } from "@clerk/nextjs";
import type { Unit } from "@/lib/db";
import { ArrowRight, Check, Play } from "lucide-react";

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
  const [progress, setProgress] = useState<ProgressData>(emptyProgress());
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      void pullAndMerge().then(({ progress: merged }) => setProgress(merged));
    } else {
      setProgress(loadProgress());
    }
  }, [isLoaded, isSignedIn]);

  const grouped = BAND_ORDER.map((band) => ({
    band,
    units: units.filter((u) => u.target_band === band),
  })).filter((g) => g.units.length > 0);

  return (
    <div className="space-y-12">
      {grouped.map(({ band, units: bandUnits }) => (
        <div key={band}>
          <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${BAND_SECTION[band]}`}>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${BAND_COLOR[band]}`}>
              {band}
            </span>
            <span className="text-sm font-semibold">{BAND_LABEL[band]}</span>
            <span className="text-xs ml-auto opacity-60">{bandUnits.length} units</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {bandUnits.map((unit) => {
              const p = progress.units[unit.lesson_number];
              const status = p?.status ?? "not_started";
              return (
                <Link
                  key={unit.lesson_number}
                  href={`/units/${unit.lesson_number}`}
                  className="group grid min-h-44 grid-cols-[auto_1fr] gap-4 rounded-2xl border border-stone-200/90 bg-white/85 p-5 shadow-[0_8px_25px_rgba(39,36,31,.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-lg"
                >
                  <div>
                    <span className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-stone-950 px-2 text-xs font-black text-white">
                      {unit.path_code}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="font-black leading-snug text-stone-900 group-hover:text-emerald-800">
                        {unit.theme_en}
                      </p>
                      <span className="hidden text-xs text-stone-400 sm:inline">
                        {unit.stage_title}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
                      {unit.cefr_descriptor}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-stone-400">
                      {unit.english_vocab_count} words · {unit.english_dialogue_count} dialogue lines
                    </p>
                  </div>

                  <div className="col-span-2 mt-auto flex items-center justify-between border-t border-stone-100 pt-4">
                    <span className="text-xs font-bold text-stone-500">{status === "completed" ? "Completed" : status === "in_progress" ? "Continue unit" : "Start unit"}</span>
                    {status === "completed" && (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={15} strokeWidth={3} />
                      </span>
                    )}
                    {status === "in_progress" && (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <Play size={14} fill="currentColor" />
                      </span>
                    )}
                    {status === "not_started" && (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-700"><ArrowRight size={15} /></span>
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
