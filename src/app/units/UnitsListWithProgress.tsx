"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadProgress, type ProgressData } from "@/lib/progress";
import { emptyProgress } from "@/lib/progress-schema";
import { pullAndMerge } from "@/lib/cloudSync";
import { useLearningAccount as useUser } from "@/components/LearningAccount";
import type { UnifiedPathLesson } from "@/lib/unified-course-path";
import { getUnifiedPathProgress } from "@/lib/unified-path-progress";
import { groupCoursePath } from "@/lib/course-path-groups";
import type { ExpansionCourseProgress } from "@/lib/expansion-course";
import { loadExpansionCourseState } from "@/lib/expansion-state";
import { subscribeProgressChanges } from "@/lib/progress-storage";
import { ArrowRight, Check, Play } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";

export default function UnitsListWithProgress({ units }: { units: UnifiedPathLesson[] }) {
  const { locale } = useLocale();
  const [progress, setProgress] = useState<ProgressData>(emptyProgress());
  const [courseProgress, setCourseProgress] = useState<ExpansionCourseProgress | null>(null);
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    const refresh = () => {
      if (!active) return;
      setProgress(loadProgress());
      const course = loadExpansionCourseState();
      setCourseProgress(course.status === "ready" ? course.progress : null);
    };
    refresh();
    const unsubscribe = subscribeProgressChanges(refresh);
    if (isSignedIn) void pullAndMerge().then(refresh);
    return () => { active = false; unsubscribe(); };
  }, [isLoaded, isSignedIn]);

  const grouped = groupCoursePath(units);

  return (
    <div className="space-y-12">
      {grouped.map(({ title, units: stageUnits }, index) => (
        <section key={`${title}-${index}`}>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-800">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-xs font-black text-white">{index + 1}</span>
            <h2 className="text-sm font-semibold">{locale === "es" ? stageUnits[0].stageTitleEs : stageUnits[0].stageTitleEn}</h2>
            <span className="ml-auto text-xs opacity-60">{stageUnits.length} {locale === "es" ? "lecciones" : "lessons"}</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {stageUnits.map((unit) => {
              const status = getUnifiedPathProgress(unit, progress, courseProgress).status;
              return (
                <Link
                  key={unit.lessonNumber}
                  href={`/units/${unit.lessonNumber}`}
                  className="group grid min-h-44 grid-cols-[auto_1fr] gap-4 rounded-2xl border border-stone-200/90 bg-white/85 p-5 shadow-[0_8px_25px_rgba(39,36,31,.04)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-lg"
                >
                  <div>
                    <span className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-stone-950 px-2 text-xs font-black text-white">{unit.pathCode}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-black leading-snug text-stone-900 group-hover:text-emerald-800">{locale === "es" ? unit.titleEs : unit.titleEn}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{locale === "es" ? unit.goalEs : unit.goalEn}</p>
                    <p className="mt-3 text-xs font-semibold text-stone-400">
                      {unit.wordCount > 0 && <>{unit.wordCount} {locale === "es" ? unit.kind === "grammar" ? "expresiones" : "palabras y formas" : unit.kind === "grammar" ? "expressions" : "words and forms"} · </>}
                      {unit.patternCount > 0 && <>{unit.patternCount} {locale === "es" ? "patrones" : "patterns"} · </>}
                      {unit.durationMinutes} min
                    </p>
                  </div>
                  <div className="col-span-2 mt-auto flex items-center justify-between border-t border-stone-100 pt-4">
                    <span className="text-xs font-bold text-stone-500">{locale === "es" ? status === "completed" ? "Completada" : status === "in_progress" ? "Continuar lección" : "Comenzar lección" : status === "completed" ? "Completed" : status === "in_progress" ? "Continue lesson" : "Start lesson"}</span>
                    {status === "completed" ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={15} strokeWidth={3} /></span>
                    ) : status === "in_progress" ? (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Play size={14} fill="currentColor" /></span>
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-700"><ArrowRight size={15} /></span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
