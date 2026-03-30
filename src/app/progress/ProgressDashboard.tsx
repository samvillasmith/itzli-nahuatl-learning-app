"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { loadProgress, resetProgress, type ProgressData } from "@/lib/progress";
import { pullAndMerge, deleteCloudProgress } from "@/lib/cloudSync";
import type { Unit } from "@/lib/db";

const BAND_COLOR: Record<string, string> = {
  A1: "text-emerald-700 bg-emerald-100 border-emerald-200",
  A2: "text-sky-700 bg-sky-100 border-sky-200",
  B1: "text-violet-700 bg-violet-100 border-violet-200",
};

const BAND_LABEL: Record<string, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
};

export default function ProgressDashboard({ units }: { units: Unit[] }) {
  const [progress, setProgress] = useState<ProgressData>({ version: 1, units: {} });
  const [confirmReset, setConfirmReset] = useState(false);
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      pullAndMerge().then(({ progress: merged }) => setProgress(merged));
    } else {
      setProgress(loadProgress());
    }
  }, [isLoaded, isSignedIn]);

  function handleReset() {
    resetProgress();
    if (isSignedIn) deleteCloudProgress();
    setProgress({ version: 1, units: {} });
    setConfirmReset(false);
  }

  const unitProgress = progress.units;
  const completedUnits = units.filter(
    (u) => unitProgress[u.lesson_number]?.status === "completed"
  );
  const inProgressUnits = units.filter(
    (u) => unitProgress[u.lesson_number]?.status === "in_progress"
  );
  const wordsEncountered = [...completedUnits, ...inProgressUnits].reduce(
    (sum, u) => sum + u.english_vocab_count,
    0
  );
  const overallPct =
    completedUnits.length > 0
      ? Math.round((completedUnits.length / units.length) * 100)
      : 0;

  const hasAnyProgress = Object.keys(unitProgress).length > 0;
  const bands = ["A1", "A2", "B1"] as const;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Your Progress</h1>
        <p className="text-stone-500">Track your journey through Eastern Huasteca Nahuatl.</p>
      </div>

      {/* Overall progress bar */}
      {hasAnyProgress && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-1">
                Overall
              </p>
              <p className="text-2xl font-bold text-stone-900">
                {completedUnits.length}{" "}
                <span className="text-stone-400 text-base font-medium">
                  / {units.length} units complete
                </span>
              </p>
            </div>
            <p className="text-3xl font-bold text-emerald-500">{overallPct}%</p>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 text-center">
          <div className="text-2xl font-bold text-emerald-600">{completedUnits.length}</div>
          <div className="text-xs text-stone-500 mt-1 font-medium">completed</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 text-center">
          <div className="text-2xl font-bold text-amber-500">{inProgressUnits.length}</div>
          <div className="text-xs text-stone-500 mt-1 font-medium">in progress</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 text-center">
          <div className="text-2xl font-bold text-stone-700">{wordsEncountered}</div>
          <div className="text-xs text-stone-500 mt-1 font-medium">words seen</div>
        </div>
      </div>

      {/* Unit list by band */}
      {bands.map((band) => {
        const bandUnits = units.filter((u) => u.target_band === band);
        if (!bandUnits.length) return null;

        const done = bandUnits.filter(
          (u) => unitProgress[u.lesson_number]?.status === "completed"
        ).length;

        return (
          <section key={band} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${BAND_COLOR[band]}`}
                >
                  {band}
                </span>
                <h2 className="text-base font-semibold text-stone-600">{BAND_LABEL[band]}</h2>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                {done}/{bandUnits.length} done
              </span>
            </div>

            <div className="bg-white border border-stone-100 rounded-2xl shadow-sm divide-y divide-stone-50 overflow-hidden">
              {bandUnits.map((unit) => {
                const p = unitProgress[unit.lesson_number];
                const status = p?.status ?? "not_started";

                return (
                  <div
                    key={unit.lesson_number}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50/50 transition-colors"
                  >
                    {/* Status icon */}
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                      {status === "completed" ? (
                        <span className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 text-xs font-bold">
                          ✓
                        </span>
                      ) : status === "in_progress" ? (
                        <span className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 text-xs font-bold">
                          ◑
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-300 text-xs">
                          ○
                        </span>
                      )}
                    </div>

                    {/* Unit info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-stone-400">
                          {String(unit.lesson_number).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-semibold text-stone-800 truncate">
                          {unit.theme_en}
                        </span>
                      </div>
                      {p && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="w-20 bg-stone-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                status === "completed" ? "bg-emerald-400" : "bg-amber-300"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (p.completedChunks / p.totalChunks) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-stone-400">
                            {p.completedChunks}/{p.totalChunks} lessons
                            {p.lastTotal > 0 && (
                              <> · {Math.round((p.lastCorrect / p.lastTotal) * 100)}%</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 shrink-0">
                      {status !== "not_started" && (
                        <Link
                          href={`/practice/${unit.lesson_number}`}
                          className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
                        >
                          Review
                        </Link>
                      )}
                      <Link
                        href={`/units/${unit.lesson_number}`}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          status === "completed"
                            ? "border border-stone-200 text-stone-500 hover:bg-stone-50"
                            : status === "in_progress"
                            ? "bg-amber-400 hover:bg-amber-500 text-white"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white"
                        }`}
                      >
                        {status === "completed"
                          ? "Redo"
                          : status === "in_progress"
                          ? "Continue"
                          : "Start"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Reset */}
      <div className="mt-6 pt-6 border-t border-stone-100">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            disabled={!hasAnyProgress}
            className="text-sm text-stone-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Reset all progress
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-600">
              This will erase all progress. Are you sure?
            </span>
            <button
              onClick={handleReset}
              className="text-sm font-bold text-red-600 hover:text-red-700"
            >
              Yes, reset
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="text-sm text-stone-400 hover:text-stone-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
