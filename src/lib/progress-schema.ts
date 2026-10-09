import { parseAttemptCounts, parseLearningState, type AttemptCounts, type LearningState } from "./learning-schema";
import { parseExpansionSyncState, type ExpansionSyncState } from "./expansion-sync-schema";

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
  updatedAt?: number;
  completionHistory?: CompletionRecord[];
};
export type CompletionRecord = { curriculumRevision: string; completedChunks: number; totalChunks: number; completedAt: number | null };

export type ProgressData = {
  version: typeof PROGRESS_VERSION;
  units: Partial<Record<string, UnitProgress>>;
};

export type WordPerf = AttemptCounts & { base?: AttemptCounts; devices?: Record<string, AttemptCounts> };
export type SrsData = {
  version: typeof PROGRESS_VERSION;
  words: Record<string, WordPerf>;
  legacyWords?: Record<string, WordPerf>;
  learning?: LearningState;
  expansion?: ExpansionSyncState;
};

const MAX_UNITS = 100;
const MAX_SRS_WORDS = 10_000;
const MAX_COUNT = Number.MAX_SAFE_INTEGER;

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
    // Historical writers could retain an old chunk count after a unit shrank.
    // Repair the cursor without rejecting every other unit in the document.
    if (!integerInRange(raw.lastCorrect, 0, MAX_COUNT)) return null;
    if (!integerInRange(raw.lastTotal, 0, MAX_COUNT)) return null;
    if (raw.lastCorrect > raw.lastTotal) return null;
    if (raw.completedAt !== null && !integerInRange(raw.completedAt, 0, Number.MAX_SAFE_INTEGER)) {
      return null;
    }

    const sameRevision =
      value.version === PROGRESS_VERSION && raw.curriculumRevision === CURRICULUM_REVISION;
    const completed = raw.status === "completed";
    const history: CompletionRecord[] = [];
    if (raw.completionHistory !== undefined) {
      if (!Array.isArray(raw.completionHistory) || raw.completionHistory.length > 100) return null;
      for (const item of raw.completionHistory) {
        if (!isRecord(item) || typeof item.curriculumRevision !== "string" || item.curriculumRevision.length > 200 ||
            !integerInRange(item.completedChunks, 0, 1_000) || !integerInRange(item.totalChunks, 1, 1_000) ||
            (item.completedAt !== null && !integerInRange(item.completedAt, 0, Number.MAX_SAFE_INTEGER))) return null;
        history.push({ curriculumRevision: item.curriculumRevision, completedChunks: item.completedChunks, totalChunks: item.totalChunks, completedAt: item.completedAt });
      }
    }
    if (completed) {
      const snapshot = { curriculumRevision: typeof raw.curriculumRevision === "string" ? raw.curriculumRevision : "legacy-v1", completedChunks: raw.completedChunks, totalChunks: raw.totalChunks, completedAt: raw.completedAt };
      if (!history.some((item) => JSON.stringify(item) === JSON.stringify(snapshot))) history.push(snapshot);
    }
    if (raw.updatedAt !== undefined && !integerInRange(raw.updatedAt, 0, Number.MAX_SAFE_INTEGER)) return null;
    migrated.units[unitKey] = {
      status: raw.status,
      // Finished units remain finished. In-progress units restart when the
      // curriculum order changes so a saved chunk never points at new content.
      completedChunks: completed || sameRevision ? Math.min(raw.completedChunks, raw.totalChunks) : 0,
      totalChunks: raw.totalChunks,
      lastCorrect: raw.lastCorrect,
      lastTotal: raw.lastTotal,
      completedAt: raw.completedAt,
      curriculumRevision: CURRICULUM_REVISION,
      ...(raw.updatedAt !== undefined ? { updatedAt: raw.updatedAt as number } : {}),
      ...(history.length ? { completionHistory: history } : {}),
    };
  }

  return migrated;
}

export function parseSrsData(value: unknown): SrsData | null {
  if (!isRecord(value) || (value.version !== 1 && value.version !== PROGRESS_VERSION) || !isRecord(value.words)) {
    return null;
  }

  const entries = Object.entries(value.words);
  if (entries.length > MAX_SRS_WORDS) return null;

  const parsed = emptySrs();
  for (const [key, raw] of entries) {
    if (key.length < 3 || key.length > 300 || ["__proto__", "constructor", "prototype"].includes(key) || !isRecord(raw)) return null;
    if (!integerInRange(raw.correct, 0, MAX_COUNT)) return null;
    if (!integerInRange(raw.total, 0, MAX_COUNT)) return null;
    if (raw.correct > raw.total) return null;
    const item: WordPerf = { correct: raw.correct, total: raw.total };
    if (raw.base !== undefined) {
      const base = parseAttemptCounts(raw.base);
      if (!base) return null;
      item.base = base;
    }
    if (raw.devices !== undefined) {
      if (!isRecord(raw.devices) || Object.keys(raw.devices).length > 2_000) return null;
      item.devices = {};
      for (const [id, counts] of Object.entries(raw.devices)) {
        const result = parseAttemptCounts(counts);
        if (!id || id.length > 200 || ["__proto__", "constructor", "prototype"].includes(id) || !result) return null;
        item.devices[id] = result;
      }
    }
    if (value.version === 1) (parsed.legacyWords ??= {})[key] = item;
    else parsed.words[key] = item;
  }

  if (value.legacyWords !== undefined) {
    if (!isRecord(value.legacyWords) || Object.keys(value.legacyWords).length > MAX_SRS_WORDS) return null;
    for (const [key, raw] of Object.entries(value.legacyWords)) {
      const counts = parseAttemptCounts(raw);
      if (key.length < 3 || key.length > 300 || ["__proto__", "constructor", "prototype"].includes(key) || !counts) return null;
      (parsed.legacyWords ??= {})[key] = counts;
    }
  }
  if (value.learning !== undefined) {
    const learning = parseLearningState(value.learning);
    if (!learning) return null;
    parsed.learning = learning;
  }
  if (value.expansion !== undefined) {
    const expansion = parseExpansionSyncState(value.expansion);
    if (!expansion) return null;
    parsed.expansion = expansion;
  }

  return parsed;
}
