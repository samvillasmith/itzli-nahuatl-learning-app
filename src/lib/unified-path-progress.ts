import type { ProgressData } from "@/lib/progress-schema";
import type { ExpansionCourseProgress } from "@/lib/expansion-course";
import type { UnifiedPathLesson } from "@/lib/unified-course-path";

export function getUnifiedPathProgress(lesson: UnifiedPathLesson, legacy: ProgressData, course?: ExpansionCourseProgress | null) {
  const status = lesson.kind === "legacy" ? legacy.units[String(lesson.lessonNumber)]?.status ?? "not_started"
    : course?.units[lesson.progressId] ? "completed" : "not_started";
  return { status } as { status: "not_started" | "in_progress" | "completed" };
}
/** Existing in-progress units resume; all other work follows this single sequence. */
export function getNextUnifiedPathLesson(path: readonly UnifiedPathLesson[], legacy: ProgressData, course?: ExpansionCourseProgress | null) {
  const ordered = [...path].sort((a, b) => a.pathOrder - b.pathOrder);
  const active = ordered.filter(lesson => getUnifiedPathProgress(lesson, legacy, course).status === "in_progress");
  return active[active.length - 1] ?? ordered.find(lesson => getUnifiedPathProgress(lesson, legacy, course).status !== "completed") ?? ordered[ordered.length - 1] ?? null;
}
