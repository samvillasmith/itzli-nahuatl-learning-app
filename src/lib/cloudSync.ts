// Client-side only — import from client components only.

import {
  loadProgress,
  loadSrs,
  saveProgress,
  saveSrs,
  type ProgressData,
  type SrsData,
} from "@/lib/progress";

// Merge two ProgressData objects — take furthest-along state per unit.
function mergeProgress(local: ProgressData, cloud: ProgressData): ProgressData {
  const merged: ProgressData = { version: 1, units: { ...cloud.units } };
  for (const [key, localUnit] of Object.entries(local.units)) {
    if (!localUnit) continue;
    const cloudUnit = cloud.units[key];
    if (!cloudUnit) {
      merged.units[key] = localUnit;
    } else if (
      localUnit.completedChunks > cloudUnit.completedChunks ||
      (localUnit.completedChunks === cloudUnit.completedChunks &&
        localUnit.status === "completed" &&
        cloudUnit.status !== "completed")
    ) {
      merged.units[key] = localUnit;
    }
  }
  return merged;
}

// Merge SRS data — take the higher of the two counts per word.
function mergeSrs(local: SrsData, cloud: SrsData): SrsData {
  const merged: SrsData = { version: 1, words: { ...cloud.words } };
  for (const [key, localPerf] of Object.entries(local.words)) {
    const cloudPerf = cloud.words[key];
    if (!cloudPerf) {
      merged.words[key] = localPerf;
    } else {
      merged.words[key] = {
        correct: Math.max(localPerf.correct, cloudPerf.correct),
        total: Math.max(localPerf.total, cloudPerf.total),
      };
    }
  }
  return merged;
}

/**
 * Fetches cloud progress, merges with localStorage, and writes the result back
 * to localStorage. Returns the merged data (or local-only if cloud is unavailable).
 */
export async function pullAndMerge(): Promise<{ progress: ProgressData; srs: SrsData }> {
  const local = loadProgress();
  const localSrs = loadSrs();

  try {
    const res = await fetch("/api/progress");
    if (!res.ok) return { progress: local, srs: localSrs };
    const { progress: cloud, srs: cloudSrs } = await res.json();
    if (!cloud) return { progress: local, srs: localSrs };

    const merged = mergeProgress(local, cloud);
    const mergedSrs = mergeSrs(localSrs, cloudSrs ?? { version: 1, words: {} });
    saveProgress(merged);
    saveSrs(mergedSrs);
    return { progress: merged, srs: mergedSrs };
  } catch {
    return { progress: local, srs: localSrs };
  }
}

/**
 * Pushes current localStorage state to the cloud.
 * Fire-and-forget — errors are silently swallowed.
 */
export function pushToCloud(): void {
  const progress = loadProgress();
  const srs = loadSrs();
  fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress, srs }),
  }).catch(() => {});
}

/**
 * Deletes cloud progress (GDPR right to erasure).
 */
export async function deleteCloudProgress(): Promise<void> {
  await fetch("/api/progress", { method: "DELETE" }).catch(() => {});
}
