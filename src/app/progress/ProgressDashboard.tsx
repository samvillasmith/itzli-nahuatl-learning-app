"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadProgress, resetProgress, type ProgressData } from "@/lib/progress";
import type { Unit } from "@/lib/db";

const BAND_COLOR: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-700",
  A2: "bg-sky-100 text-sky-700",
  B1: "bg-violet-100 text-violet-700",
};

const BAND_LABEL: Record<string, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
};

export default function ProgressDashboard({ units }: { units: Unit[] }) {
  const [progress, setProgress] = useState<ProgressData>({ version: 1, units: {} });
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  function handleReset() {
    resetProgress();
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

  const hasAnyProgress = Object.keys(unitProgress).length > 0;
  const bands = ["A1", "A2", "B1"] as const;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Your Progress</h1>
        <p className="text-stone-500">
          Track your journey through Eastern Huasteca Nahuatl.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="text-2xl font-bold text-stone-900">{completedUnits.length}</div>
          <div className="text-sm text-stone-500 mt-1">
            of {units.length} units complete
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="text-2xl font-bold text-stone-900">{inProgressUnits.length}</div>
          <div className="text-sm text-stone-500 mt-1">units in progress</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="text-2xl font-bold text-stone-900">{wordsEncountered}</div>
          <div className="text-sm text-stone-500 mt-1">words encountered</div>
        </div>
      </div>

      {/* Unit list by band */}
      {bands.map((band) => {
        const bandUnits = units.filter((u) => u.target_band === band);
        if (!bandUnits.length) return null;
        return (
          <section key={band} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${BAND_COLOR[band]}`}>
                {band}
              </span>
              <h2 className="text-base font-semibold text-stone-600">
                {BAND_LABEL[band]}
              </h2>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 overflow-hidden">
              {bandUnits.map((unit) => {
                const p = unitProgress[unit.lesson_number];
                const status = p?.status ?? "not_started";
                return (
                  <div
                    key={unit.lesson_number}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    {/* Status icon */}
                    <div className="w-6 shrink-0 text-center">
                      {status === "completed" ? (
                        <span className="text-emerald-500 font-bold text-base">✓</span>
                      ) : status === "in_progress" ? (
                        <span className="text-amber-400 font-bold text-base">◑</span>
                      ) : (
                        <span className="text-stone-200 font-bold text-base">○</span>
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
                        <div className="flex items-center gap-3 mt-1">
                          {/* Chunk progress bar */}
                          <div className="w-20 bg-stone-100 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${
                                status === "completed" ? "bg-emerald-400" : "bg-amber-300"
                              }`}
                              style={{
                                width: `${Math.min(100, (p.completedChunks / p.totalChunks) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-stone-400">
                            {p.completedChunks}/{p.totalChunks} lessons
                            {p.lastTotal > 0 && (
                              <> · {Math.round((p.lastCorrect / p.lastTotal) * 100)}% last score</>
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
                          className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                        >
                          Review vocab
                        </Link>
                      )}
                      <Link
                        href={`/units/${unit.lesson_number}`}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          status === "completed"
                            ? "border border-stone-200 text-stone-500 hover:bg-stone-50"
                            : status === "in_progress"
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "bg-stone-900 text-white hover:bg-stone-700"
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
              className="text-sm font-medium text-red-600 hover:text-red-700"
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
