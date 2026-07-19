export const PROGRESS_VERSION = 2 as const;
export const CURRICULUM_REVISION = "2026-07-balanced-vocab-2";

export type UnitProgress = {
  status: "in_progress" | "completed";
  completedChunks: number;
  totalChunks: number;
  lastCorrect: number;
  lastTotal: number;
  completedAt: number | null;
  curriculumRevision: string;
};

export type ProgressData = {
  version: typeof PROGRESS_VERSION;
  units: Partial<Record<string, UnitProgress>>;
};

export type WordPerf = { correct: number; total: number };
export type SrsData = {
  version: typeof PROGRESS_VERSION;
  words: Record<string, WordPerf>;
};

const MAX_UNITS = 100;
const MAX_SRS_WORDS = 10_000;
const MAX_COUNT = 1_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function integerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

export function emptyProgress(): ProgressData {
  return { version: PROGRESS_VERSION, units: {} };
}

export function emptySrs(): SrsData {
  return { version: PROGRESS_VERSION, words: {} };
}

export function parseProgressData(value: unknown): ProgressData | null {
  if (!isRecord(value) || !isRecord(value.units)) return null;
  if (value.version !== 1 && value.version !== PROGRESS_VERSION) return null;

  const entries = Object.entries(value.units);
  if (entries.length > MAX_UNITS) return null;

  const migrated = emptyProgress();
  for (const [unitKey, raw] of entries) {
    if (!/^\d{1,3}$/.test(unitKey) || !isRecord(raw)) return null;
    if (raw.status !== "in_progress" && raw.status !== "completed") return null;
    if (!integerInRange(raw.completedChunks, 0, 1_000)) return null;
    if (!integerInRange(raw.totalChunks, 1, 1_000)) return null;
    if (raw.completedChunks > raw.totalChunks) return null;
    if (!integerInRange(raw.lastCorrect, 0, MAX_COUNT)) return null;
    if (!integerInRange(raw.lastTotal, 0, MAX_COUNT)) return null;
    if (raw.lastCorrect > raw.lastTotal) return null;
    if (raw.completedAt !== null && !integerInRange(raw.completedAt, 0, Number.MAX_SAFE_INTEGER)) {
      return null;
    }

    const sameRevision =
      value.version === PROGRESS_VERSION && raw.curriculumRevision === CURRICULUM_REVISION;
    const completed = raw.status === "completed";
    migrated.units[unitKey] = {
      status: raw.status,
      // Finished units remain finished. In-progress units restart when the
      // curriculum order changes so a saved chunk never points at new content.
      completedChunks: completed || sameRevision ? raw.completedChunks : 0,
      totalChunks: raw.totalChunks,
      lastCorrect: raw.lastCorrect,
      lastTotal: raw.lastTotal,
      completedAt: raw.completedAt,
      curriculumRevision: CURRICULUM_REVISION,
    };
  }

  return migrated;
}

export function parseSrsData(value: unknown): SrsData | null {
  if (!isRecord(value) || value.version !== PROGRESS_VERSION || !isRecord(value.words)) {
    return null;
  }

  const entries = Object.entries(value.words);
  if (entries.length > MAX_SRS_WORDS) return null;

  const parsed = emptySrs();
  for (const [key, raw] of entries) {
    if (key.length < 3 || key.length > 300 || !isRecord(raw)) return null;
    if (!integerInRange(raw.correct, 0, MAX_COUNT)) return null;
    if (!integerInRange(raw.total, 0, MAX_COUNT)) return null;
    if (raw.correct > raw.total) return null;
    parsed.words[key] = { correct: raw.correct, total: raw.total };
  }

  return parsed;
}
