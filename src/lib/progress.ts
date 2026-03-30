// Client-side only — never import from Server Components.

export type UnitProgress = {
  status: "in_progress" | "completed";
  completedChunks: number;
  totalChunks: number;
  lastCorrect: number;
  lastTotal: number;
  completedAt: number | null;
};

export type ProgressData = {
  version: 1;
  units: Partial<Record<string, UnitProgress>>;
};

// SRS: per-unit, per-word-index performance.
// key = `${unitNum}:${wordIdx}` → { correct, total }
export type WordPerf = { correct: number; total: number };
export type SrsData = {
  version: 1;
  words: Record<string, WordPerf>;
};

const STORAGE_KEY = "itzli_progress_v1";
const SRS_KEY = "itzli_srs_v1";

function empty(): ProgressData {
  return { version: 1, units: {} };
}

function emptySrs(): SrsData {
  return { version: 1, words: {} };
}

export function loadProgress(): ProgressData {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as ProgressData;
    if (parsed.version !== 1) return empty();
    return parsed;
  } catch {
    return empty();
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
    completedAt: isComplete
      ? (existing?.completedAt ?? Date.now())
      : null,
  };
  persist(data);
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SRS_KEY);
}

// ── SRS helpers ───────────────────────────────────────────────────────────────

export function loadSrs(): SrsData {
  if (typeof window === "undefined") return emptySrs();
  try {
    const raw = localStorage.getItem(SRS_KEY);
    if (!raw) return emptySrs();
    const parsed = JSON.parse(raw) as SrsData;
    if (parsed.version !== 1) return emptySrs();
    return parsed;
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

export function recordWordResult(
  unitNum: number,
  wordIdx: number,
  correct: boolean
): void {
  const data = loadSrs();
  const key = `${unitNum}:${wordIdx}`;
  const existing = data.words[key] ?? { correct: 0, total: 0 };
  data.words[key] = {
    correct: existing.correct + (correct ? 1 : 0),
    total: existing.total + 1,
  };
  persistSrs(data);
}

/**
 * Returns the indices of words in `chunk` sorted worst-first (lowest accuracy).
 * Words never attempted appear first (treated as 0/1 for sorting = 0%).
 */
export function srsOrder(
  unitNum: number,
  chunkStartIdx: number,
  chunkLength: number
): number[] {
  const srs = loadSrs();
  return Array.from({ length: chunkLength }, (_, i) => i).sort((a, b) => {
    const ka = `${unitNum}:${chunkStartIdx + a}`;
    const kb = `${unitNum}:${chunkStartIdx + b}`;
    const pa = srs.words[ka];
    const pb = srs.words[kb];
    const ra = pa ? pa.correct / pa.total : -1; // -1 = never seen → first
    const rb = pb ? pb.correct / pb.total : -1;
    return ra - rb; // ascending: worst first
  });
}
