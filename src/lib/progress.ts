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

const STORAGE_KEY = "itzli_progress_v1";

function empty(): ProgressData {
  return { version: 1, units: {} };
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
}
