// Client-side only - import from client components only.

import {
  loadProgress,
  loadSrs,
  saveProgress,
  saveSrs,
  type ProgressData,
  type SrsData,
} from "@/lib/progress";
import { emptySrs, parseProgressData, parseSrsData } from "@/lib/progress-schema";

function mergeProgress(local: ProgressData, cloud: ProgressData): ProgressData {
  const merged: ProgressData = { version: 2, units: { ...cloud.units } };
  for (const [key, localUnit] of Object.entries(local.units)) {
    if (!localUnit) continue;
    const cloudUnit = cloud.units[key];
    if (
      !cloudUnit ||
      localUnit.completedChunks > cloudUnit.completedChunks ||
      (localUnit.completedChunks === cloudUnit.completedChunks &&
        localUnit.status === "completed" && cloudUnit.status !== "completed")
    ) {
      merged.units[key] = localUnit;
    }
  }
  return merged;
}

function mergeSrs(local: SrsData, cloud: SrsData): SrsData {
  const merged: SrsData = { version: 2, words: { ...cloud.words } };
  for (const [key, localPerf] of Object.entries(local.words)) {
    const cloudPerf = cloud.words[key];
    merged.words[key] = cloudPerf
      ? {
          correct: Math.max(localPerf.correct, cloudPerf.correct),
          total: Math.max(localPerf.total, cloudPerf.total),
        }
      : localPerf;
  }
  return merged;
}

export async function pullAndMerge(): Promise<{ progress: ProgressData; srs: SrsData }> {
  const local = loadProgress();
  const localSrs = loadSrs();

  try {
    const res = await fetch("/api/progress", { cache: "no-store" });
    if (!res.ok) return { progress: local, srs: localSrs };
    const body: unknown = await res.json();
    if (typeof body !== "object" || body === null) return { progress: local, srs: localSrs };
    const record = body as Record<string, unknown>;
    if (record.progress === null) return { progress: local, srs: localSrs };

    const cloud = parseProgressData(record.progress);
    const cloudSrs = record.srs === null ? emptySrs() : parseSrsData(record.srs);
    if (!cloud || !cloudSrs) return { progress: local, srs: localSrs };

    const merged = mergeProgress(local, cloud);
    const mergedSrs = mergeSrs(localSrs, cloudSrs);
    saveProgress(merged);
    saveSrs(mergedSrs);
    return { progress: merged, srs: mergedSrs };
  } catch {
    return { progress: local, srs: localSrs };
  }
}

export async function pushToCloud(): Promise<boolean> {
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: loadProgress(), srs: loadSrs() }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteCloudProgress(): Promise<boolean> {
  try {
    const res = await fetch("/api/progress", { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
