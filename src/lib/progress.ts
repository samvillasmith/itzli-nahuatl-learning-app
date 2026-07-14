// Client-side only - never import this module from Server Components.

import {
  CURRICULUM_REVISION,
  PROGRESS_VERSION,
  emptyProgress,
  emptySrs,
  parseProgressData,
  parseSrsData,
  type ProgressData,
  type SrsData,
} from "@/lib/progress-schema";

export type { ProgressData, SrsData, UnitProgress, WordPerf } from "@/lib/progress-schema";

const STORAGE_KEY = "itzli_progress_v2";
const LEGACY_STORAGE_KEY = "itzli_progress_v1";
const SRS_KEY = "itzli_srs_v2";
const LEGACY_SRS_KEY = "itzli_srs_v1";

export function loadProgress(): ProgressData {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = current ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = parseProgressData(JSON.parse(current ?? legacy ?? "null"));
    if (!parsed) return emptyProgress();
    if (!current) persist(parsed);
    return parsed;
  } catch {
    return emptyProgress();
  }
}

function persist(data: ProgressData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveProgress(data: ProgressData): void {
  persist(data);
}

export function markChunkDone(
  unitNum: number,
  chunkIdx: number,
  totalChunks: number,
  correct: number,
  total: number
): void {
  const data = loadProgress();
  const key = String(unitNum);
  const existing = data.units[key];
  const isComplete = chunkIdx + 1 >= totalChunks;
  data.units[key] = {
    status: isComplete ? "completed" : "in_progress",
    completedChunks: Math.max(existing?.completedChunks ?? 0, chunkIdx + 1),
    totalChunks,
    lastCorrect: correct,
    lastTotal: total,
    completedAt: isComplete ? (existing?.completedAt ?? Date.now()) : null,
    curriculumRevision: CURRICULUM_REVISION,
  };
  persist(data);
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(SRS_KEY);
  localStorage.removeItem(LEGACY_SRS_KEY);
}

export function loadSrs(): SrsData {
  if (typeof window === "undefined") return emptySrs();
  try {
    const raw = localStorage.getItem(SRS_KEY);
    const parsed = raw ? parseSrsData(JSON.parse(raw)) : null;
    // Version 1 used mutable card indexes and cannot be migrated without
    // assigning results to potentially different words.
    return parsed ?? emptySrs();
  } catch {
    return emptySrs();
  }
}

function persistSrs(data: SrsData): void {
  localStorage.setItem(SRS_KEY, JSON.stringify(data));
}

export function saveSrs(data: SrsData): void {
  persistSrs(data);
}

export function recordWordResult(unitNum: number, cardKey: string, correct: boolean): void {
  const data = loadSrs();
  const key = `${unitNum}:${cardKey}`;
  const existing = data.words[key] ?? { correct: 0, total: 0 };
  data.words[key] = {
    correct: existing.correct + (correct ? 1 : 0),
    total: existing.total + 1,
  };
  persistSrs(data);
}

/** Returns card positions sorted worst-first, using stable card identities. */
export function srsOrder(unitNum: number, cardKeys: string[]): number[] {
  const srs = loadSrs();
  return cardKeys.map((_, i) => i).sort((a, b) => {
    const pa = srs.words[`${unitNum}:${cardKeys[a]}`];
    const pb = srs.words[`${unitNum}:${cardKeys[b]}`];
    const ra = pa ? pa.correct / Math.max(1, pa.total) : -1;
    const rb = pb ? pb.correct / Math.max(1, pb.total) : -1;
    return ra - rb;
  });
}

export { PROGRESS_VERSION };
