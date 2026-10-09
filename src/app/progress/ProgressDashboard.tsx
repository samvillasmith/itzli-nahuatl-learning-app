"use client";
import { groupCoursePath } from "@/lib/course-path-groups";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLearningAccount as useUser } from "@/components/LearningAccount";
import { loadProgress, resetProgress, type ProgressData } from "@/lib/progress";
import { emptyProgress } from "@/lib/progress-schema";
import { pullAndMerge, deleteCloudProgress } from "@/lib/cloudSync";
import type { UnifiedPathLesson } from "@/lib/unified-course-path";
import { getUnifiedPathProgress } from "@/lib/unified-path-progress";
import type { ExpansionCourseProgress } from "@/lib/expansion-course";
import { loadExpansionCourseState, loadExpansionPracticeState } from "@/lib/expansion-state";
import { getProgressAccount, subscribeProgressChanges } from "@/lib/progress-storage";
import { useLocale } from "@/i18n/LocaleProvider";
import { loadLearningState } from "@/lib/learning-state";
import { clearOfflineAttempts, hasPendingOfflineAttempts } from "@/lib/offline-attempts";
import LearningSummary from "@/components/LearningSummary";
import LegacyProgressImport from "@/components/LegacyProgressImport";

export default function ProgressDashboard({ units, reviewableIds }: { units: UnifiedPathLesson[]; reviewableIds: string[] }) {
  const { translate, locale } = useLocale();
  const [learningRevision,setLearningRevision]=useState(0);
  const [progress, setProgress] = useState<ProgressData>(emptyProgress());
  const [courseProgress, setCourseProgress] = useState<ExpansionCourseProgress | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetError, setResetError] = useState("");
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    const refresh = () => {
      if (!active) return;
      setProgress(loadProgress());
      const course = loadExpansionCourseState();
      setCourseProgress(course.status === "ready" ? course.progress : null);
      setLearningRevision(revision => revision + 1);
    };
    refresh();
    const unsubscribe = subscribeProgressChanges(refresh);
    if (isSignedIn) void pullAndMerge().then(refresh);
    return () => { active = false; unsubscribe(); };
  }, [isLoaded, isSignedIn]);

  async function handleReset() {
    const resettingAccount = getProgressAccount();
    setResetError("");
    if (isSignedIn && !(await deleteCloudProgress())) {
      setResetError(translate("Cloud progress could not be deleted. Please try again."));
      return;
    }
    if (resettingAccount !== getProgressAccount()) return;
    if (!clearOfflineAttempts()) {
      setResetError(locale === "es"
        ? "No se pudieron borrar los intentos pendientes sin conexión. El reinicio no terminó. Inténtalo de nuevo."
        : "Pending offline attempts could not be cleared. The reset did not finish. Please try again.");
      return;
    }
    resetProgress();
    setLearningRevision(v=>v+1);
    setProgress(emptyProgress());
    setCourseProgress({ schemaVersion: 1, units: {} });
    setConfirmReset(false);
  }

  const unitProgress = progress.units;
  const completedUnits = units.filter(
    (u) => getUnifiedPathProgress(u, progress, courseProgress).status === "completed"
  );
  const inProgressUnits = units.filter(
    (u) => getUnifiedPathProgress(u, progress, courseProgress).status === "in_progress"
  );
  const wordsEncountered = new Set(Object.values(loadLearningState().activities).filter(a => a.activityId.startsWith("word:")).map(a=>a.activityId)).size;
  const overallPct =
    completedUnits.length > 0
      ? Math.round((completedUnits.length / units.length) * 100)
      : 0;

  const hasResettableProgress = Object.keys(unitProgress).length > 0 || Object.keys(courseProgress?.units ?? {}).length > 0 ||
    Object.keys(loadExpansionPracticeState().progress.items).length > 0 ||
    Object.keys(loadLearningState().activities).length > 0 || hasPendingOfflineAttempts();
  const hasAnyProgress = hasResettableProgress;
  const stages = groupCoursePath(units);

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">{translate("Your Progress")}</h1>
        <p className="text-stone-500">{translate("Track your journey through Eastern Huasteca Nahuatl.")}</p>
      </div>

      {/* Overall progress bar */}
      <LegacyProgressImport />
      <LearningSummary key={learningRevision} reviewableIds={reviewableIds} />
      {hasAnyProgress && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-8">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase mb-1">
                {translate("Overall")}
              </p>
              <p className="text-2xl font-bold text-stone-900">
                {completedUnits.length}{" "}
                <span className="text-stone-400 text-base font-medium">
                  / {units.length} {locale === "es" ? "lecciones completadas" : "lessons complete"}
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
          <div className="text-xs text-stone-500 mt-1 font-medium">{translate("completed")}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 text-center">
          <div className="text-2xl font-bold text-amber-500">{inProgressUnits.length}</div>
          <div className="text-xs text-stone-500 mt-1 font-medium">{translate("in progress")}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 text-center">
          <div className="text-2xl font-bold text-stone-700">{wordsEncountered}</div>
          <div className="text-xs text-stone-500 mt-1 font-medium">{translate("words seen")}</div>
        </div>
      </div>

      {/* The same stages and lesson order as the learning path. */}
      {stages.map((stage, stageIndex) => {
        const stageUnits = stage.units;

        const done = stageUnits.filter(
          (u) => getUnifiedPathProgress(u, progress, courseProgress).status === "completed"
        ).length;

        return (
          <section key={`${stage.title}-${stageIndex}`} className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-950 text-xs font-black text-white"
                >
                  {stageIndex + 1}
                </span>
                <h2 className="text-base font-semibold text-stone-600">{locale === "es" ? stageUnits[0].stageTitleEs : stageUnits[0].stageTitleEn}</h2>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                {done}/{stageUnits.length} {translate("done")}
              </span>
            </div>

            <div className="bg-white border border-stone-100 rounded-2xl shadow-sm divide-y divide-stone-50 overflow-hidden">
              {stageUnits.map((unit) => {
                const p = unit.kind === "legacy" ? unitProgress[unit.lessonNumber] : null;
                const courseResult = courseProgress?.units[unit.progressId];
                const status = getUnifiedPathProgress(unit, progress, courseProgress).status;

                return (
                  <div
                    key={unit.lessonNumber}
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
                        <span className="text-xs font-bold text-stone-400">
                          {unit.pathCode}
                        </span>
                        <span className="text-sm font-semibold text-stone-800 truncate">
                          {locale === "es" ? unit.titleEs : unit.titleEn}
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
                            {p.completedChunks}/{p.totalChunks} {translate("lessons")}
                            {p.lastTotal > 0 && (
                              <> · {Math.round((p.lastCorrect / p.lastTotal) * 100)}%</>
                            )}
                          </span>
                        </div>
                      )}
                      {!p && courseResult && <p className="mt-1.5 text-xs text-stone-400">{courseResult.firstAttemptCorrect}/{courseResult.total} {locale === "es" ? "respuestas correctas al primer intento" : "first-attempt answers correct"}</p>}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 shrink-0">
                      {status !== "not_started" && (
                        <Link
                          href={unit.kind === "legacy" ? `/practice/${unit.lessonNumber}` : `/units/${unit.lessonNumber}`}
                          className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
                        >
                          {translate("Review")}
                        </Link>
                      )}
                      <Link
                        href={`/units/${unit.lessonNumber}`}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                          status === "completed"
                            ? "border border-stone-200 text-stone-500 hover:bg-stone-50"
                            : status === "in_progress"
                            ? "bg-amber-400 hover:bg-amber-500 text-white"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white"
                        }`}
                      >
                        {status === "completed"
                          ? translate("Redo")
                          : status === "in_progress"
                          ? translate("Continue")
                          : translate("Start")}
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
        {resetError && <p className="mb-3 text-sm font-medium text-red-600">{resetError}</p>}
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            disabled={!hasResettableProgress}
            className="text-sm text-stone-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {locale === "es" ? "Reiniciar el progreso de las lecciones y la práctica" : "Reset lesson and practice progress"}
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-600">
              {locale === "es" ? "Se borrará el progreso de todas las lecciones, el historial de práctica y tu cuaderno de vocabulario de esta cuenta. ¿Quieres continuar?" : "This clears all lesson progress, practice history and your vocabulary notebook for this account. Continue?"}
            </span>
            <button
              onClick={handleReset}
              className="text-sm font-bold text-red-600 hover:text-red-700"
            >
              {translate("Yes, reset")}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="text-sm text-stone-400 hover:text-stone-600"
            >
              {translate("Cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
