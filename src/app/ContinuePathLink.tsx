"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { loadProgress, type ProgressData } from "@/lib/progress";
import { pullAndMerge } from "@/lib/cloudSync";

type ContinueUnit = {
  lessonNumber: number;
  pathOrder: number;
};

type Props = {
  units: ContinueUnit[];
  className: string;
  children: React.ReactNode;
};

const EMPTY_PROGRESS: ProgressData = { version: 1, units: {} };

function sortedUnits(units: ContinueUnit[]): ContinueUnit[] {
  return [...units].sort((a, b) => a.pathOrder - b.pathOrder);
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
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let active = true;
    pullAndMerge().then(({ progress: merged }) => {
      if (active) setProgress(merged);
    });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn]);

  const href = useMemo(() => continueHref(units, progress), [units, progress]);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
