"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLearningAccount as useUser } from "@/components/LearningAccount";
import { loadProgress, type ProgressData } from "@/lib/progress";
import { pullAndMerge } from "@/lib/cloudSync";
import { emptyProgress } from "@/lib/progress-schema";
import type { UnifiedPathLesson } from "@/lib/unified-course-path";
import { getNextUnifiedPathLesson } from "@/lib/unified-path-progress";
import type { ExpansionCourseProgress } from "@/lib/expansion-course";
import { loadExpansionCourseState } from "@/lib/expansion-state";
import { subscribeProgressChanges } from "@/lib/progress-storage";

type ContinueUnit = {
  lessonNumber: number;
  pathOrder: number;
};

type Props = {
  units: ContinueUnit[] | UnifiedPathLesson[];
  className: string;
  children: React.ReactNode;
};

const EMPTY_PROGRESS: ProgressData = emptyProgress();

function sortedUnits(units: ContinueUnit[]): ContinueUnit[] {
  return [...units].sort((a, b) => a.pathOrder - b.pathOrder);
}

function isUnifiedPath(units: ContinueUnit[] | UnifiedPathLesson[]): units is UnifiedPathLesson[] {
  return units.every((unit) => "progressId" in unit);
}

function continueHref(units: ContinueUnit[], progress: ProgressData): string {
  const ordered = sortedUnits(units);
  if (ordered.length === 0) return "/units";

  const inProgress = ordered.filter(
    (unit) => progress.units[String(unit.lessonNumber)]?.status === "in_progress"
  );
  if (inProgress.length > 0) {
    return `/units/${inProgress[inProgress.length - 1].lessonNumber}`;
  }

  const completed = ordered.filter(
    (unit) => progress.units[String(unit.lessonNumber)]?.status === "completed"
  );
  if (completed.length === 0) {
    return `/units/${ordered[0].lessonNumber}`;
  }

  const lastCompletedOrder = Math.max(...completed.map((unit) => unit.pathOrder));
  const nextUnit = ordered.find((unit) => unit.pathOrder > lastCompletedOrder);
  return `/units/${(nextUnit ?? ordered[ordered.length - 1]).lessonNumber}`;
}

export default function ContinuePathLink({ units, className, children }: Props) {
  const [progress, setProgress] = useState<ProgressData>(EMPTY_PROGRESS);
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

  const href = useMemo(() => {
    if (isUnifiedPath(units)) {
      const next = getNextUnifiedPathLesson(units, progress, courseProgress);
      return next ? `/units/${next.lessonNumber}` : "/units";
    }
    return continueHref(units, progress);
  }, [units, progress, courseProgress]);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
