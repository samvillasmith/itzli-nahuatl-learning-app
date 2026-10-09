import { emptyProgress, emptySrs, type CompletionRecord, type ProgressData, type SrsData, type UnitProgress, type WordPerf } from "./progress-schema";
import { mergeLearningStates, type AttemptCounts } from "./learning-schema";
import { mergeExpansionSyncState } from "./expansion-sync-schema";

function earliest(...values: (number | null | undefined)[]): number | null {
  const dates = values.filter((value): value is number => typeof value === "number");
  return dates.length ? Math.min(...dates) : null;
}
function completionHistory(a: UnitProgress, b: UnitProgress): CompletionRecord[] {
  const entries = [...a.completionHistory ?? [], ...b.completionHistory ?? []];
  for (const item of [a, b]) if (item.status === "completed") entries.push({
    curriculumRevision: item.curriculumRevision, completedChunks: item.completedChunks,
    totalChunks: item.totalChunks, completedAt: item.completedAt,
  });
  return [...new Map(entries.map((item) => [JSON.stringify(item), item])).values()];
}
export function mergeProgressData(a: ProgressData, b: ProgressData): ProgressData {
  const result = emptyProgress();
  for (const key of new Set([...Object.keys(a.units), ...Object.keys(b.units)])) {
    const x = a.units[key], y = b.units[key];
    if (!x || !y) { result.units[key] = structuredClone(x ?? y); continue; }
    const latest = (x.updatedAt ?? 0) > (y.updatedAt ?? 0) ? x : y;
    const completed = x.status === "completed" || y.status === "completed";
    const compatible = x.curriculumRevision === y.curriculumRevision && x.totalChunks === y.totalChunks;
    result.units[key] = {
      ...latest,
      status: completed ? "completed" : "in_progress",
      completedChunks: Math.min(latest.totalChunks, compatible ? Math.max(x.completedChunks, y.completedChunks) : latest.completedChunks),
      completedAt: completed ? earliest(x.completedAt, y.completedAt) : null,
      ...(completionHistory(x, y).length ? { completionHistory: completionHistory(x, y) } : {}),
    };
  }
  return result;
}
export function mergeWordPerformance(a: WordPerf, b: WordPerf): WordPerf {
  if (!a.devices && !b.devices) return { correct: Math.max(a.correct, b.correct), total: Math.max(a.total, b.total) };
  const devices: Record<string, AttemptCounts> = {};
  for (const id of new Set([...Object.keys(a.devices ?? {}), ...Object.keys(b.devices ?? {})])) {
    const x = a.devices?.[id], y = b.devices?.[id];
    devices[id] = x && y ? { correct: Math.max(x.correct, y.correct), total: Math.max(x.total, y.total) } : { ...(x ?? y)! };
  }
  const sums = Object.values(devices).reduce((sum, item) => ({ correct: sum.correct + item.correct, total: sum.total + item.total }), { correct: 0, total: 0 });
  // Uninstrumented old-client snapshots supply a lower bound. Instrumented
  // devices supply cumulative per-device counters, so repeated sync is idempotent.
  const baseCorrect = Math.max(a.base?.correct ?? (a.devices ? 0 : Math.max(0, a.correct - sums.correct)), b.base?.correct ?? (b.devices ? 0 : Math.max(0, b.correct - sums.correct)));
  const baseTotal = Math.max(baseCorrect, a.base?.total ?? (a.devices ? 0 : Math.max(0, a.total - sums.total)), b.base?.total ?? (b.devices ? 0 : Math.max(0, b.total - sums.total)));
  return { correct: baseCorrect + sums.correct, total: baseTotal + sums.total, base: { correct: baseCorrect, total: baseTotal }, devices };
}
export function mergeSrsData(a: SrsData, b: SrsData): SrsData {
  const result = emptySrs();
  for (const key of new Set([...Object.keys(a.words), ...Object.keys(b.words)])) {
    const x = a.words[key], y = b.words[key];
    result.words[key] = x && y ? mergeWordPerformance(x, y) : structuredClone((x ?? y)!);
  }
  for (const key of new Set([...Object.keys(a.legacyWords ?? {}), ...Object.keys(b.legacyWords ?? {})])) {
    const x = a.legacyWords?.[key], y = b.legacyWords?.[key];
    (result.legacyWords ??= {})[key] = x && y ? mergeWordPerformance(x, y) : structuredClone((x ?? y)!);
  }
  if (a.learning || b.learning) result.learning = a.learning && b.learning ? mergeLearningStates(a.learning, b.learning) : structuredClone(a.learning ?? b.learning);
  if (a.expansion || b.expansion) result.expansion = a.expansion && b.expansion ? mergeExpansionSyncState(a.expansion, b.expansion) : structuredClone(a.expansion ?? b.expansion);
  return result;
}
