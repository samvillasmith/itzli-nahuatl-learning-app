// Client-side only - never import this module from Server Components.
import { CURRICULUM_REVISION, PROGRESS_VERSION, emptyProgress, emptySrs, parseProgressData, parseSrsData, type ProgressData, type SrsData } from "@/lib/progress-schema";
import { mergeProgressData, mergeSrsData } from "@/lib/progress-merge";
import { claimLegacyStorage, getProgressDeviceId, readRawStorage, readScopedStorage, writeScopedStorage, writeRawStorage, storageKey, removeScopedStorage } from "@/lib/progress-storage";
import { recordAttempt } from "@/lib/learning-state";
export type { ProgressData, SrsData, UnitProgress, WordPerf } from "@/lib/progress-schema";
export { getProgressAccount, setProgressAccount, hasUnclaimedLegacyProgress, subscribeProgressChanges } from "@/lib/progress-storage";
const STORAGE_KEY = "itzli_progress_v2", LEGACY_STORAGE_KEY = "itzli_progress_v1";
const SRS_KEY = "itzli_srs_v2", LEGACY_SRS_KEY = "itzli_srs_v1";
function readJson(raw: string | null): unknown { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
export function loadProgress(): ProgressData {
  if (typeof window === "undefined") return emptyProgress();
  const current = readScopedStorage(STORAGE_KEY), legacy = current ? null : readScopedStorage(LEGACY_STORAGE_KEY);
  const parsed = parseProgressData(readJson(current ?? legacy));
  if (!parsed) {
    if (current ?? legacy) writeRawStorage(storageKey("itzli_progress_recovery_v3"), current ?? legacy!);
    return emptyProgress();
  }
  return parsed;
}
export function saveProgress(data: ProgressData): void {
  const parsed = parseProgressData(data);
  if (parsed) writeScopedStorage(STORAGE_KEY, JSON.stringify(parsed));
}
export function markChunkDone(unitNum: number, chunkIdx: number, totalChunks: number, correct: number, total: number): void {
  if (!Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > 1_000 || !Number.isInteger(chunkIdx) || chunkIdx < 0 || chunkIdx >= totalChunks) return;
  const data = loadProgress(), key = String(unitNum), existing = data.units[key];
  const isComplete = chunkIdx + 1 >= totalChunks, earnedComplete = existing?.status === "completed" || isComplete;
  data.units[key] = {
    status: earnedComplete ? "completed" : "in_progress",
    completedChunks: Math.min(totalChunks, Math.max(existing?.completedChunks ?? 0, chunkIdx + 1)),
    totalChunks, lastCorrect: correct, lastTotal: total,
    completedAt: earnedComplete ? existing?.completedAt ?? Date.now() : null,
    curriculumRevision: CURRICULUM_REVISION, updatedAt: Date.now(),
    ...(existing?.completionHistory ? { completionHistory: existing.completionHistory } : {}),
  };
  saveProgress(data);
}
export function resetProgress(): void {
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY, SRS_KEY, LEGACY_SRS_KEY, "itzli_learning_v1", "itzli_progress_pending_v3", "itzli_expansion_course_v1", "itzli_expansion_practice_v1"]) removeScopedStorage(key);
}
export function loadSrs(): SrsData {
  if (typeof window === "undefined") return emptySrs();
  const raw = readScopedStorage(SRS_KEY) ?? readScopedStorage(LEGACY_SRS_KEY), parsed = parseSrsData(readJson(raw));
  if (!parsed && raw) writeRawStorage(storageKey("itzli_srs_recovery_v3"), raw);
  return parsed ?? emptySrs();
}
export function saveSrs(data: SrsData): void {
  const parsed = parseSrsData(data);
  if (parsed) writeScopedStorage(SRS_KEY, JSON.stringify(parsed));
}
/** Explicit import: historical browser blobs contain no account identity. */
export function claimLegacyProgress(): boolean {
  if (!claimLegacyStorage()) return false;
  const legacyProgress = parseProgressData(readJson(readRawStorage(STORAGE_KEY) ?? readRawStorage(LEGACY_STORAGE_KEY)));
  const legacySrs = parseSrsData(readJson(readRawStorage(SRS_KEY) ?? readRawStorage(LEGACY_SRS_KEY)));
  if (legacyProgress) saveProgress(mergeProgressData(loadProgress(), legacyProgress));
  if (legacySrs) saveSrs(mergeSrsData(loadSrs(), legacySrs));
  return Boolean(legacyProgress || legacySrs);
}
export function recordWordResult(unitNum: number, cardKey: string, correct: boolean): void {
  const data = loadSrs(), key = `${unitNum}:${cardKey}`, device = getProgressDeviceId();
  const existing = data.words[key] ?? { correct: 0, total: 0 }, base = existing.base ?? { correct: existing.correct, total: existing.total };
  const devices = { ...existing.devices }, counter = devices[device] ?? { correct: 0, total: 0 };
  devices[device] = { correct: counter.correct + Number(correct), total: counter.total + 1 };
  const totals = Object.values(devices).reduce((sum, item) => ({ correct: sum.correct + item.correct, total: sum.total + item.total }), { ...base });
  data.words[key] = { ...totals, base, devices };
  saveSrs(data);
  const id = /^v:(-?\d+)$/.exec(cardKey)?.[1];
  if (id) recordAttempt(`word:${id}`, "recognition", correct);
}
/** Positions sorted weakest-first; scheduled due reviews are exposed separately. */
export function srsOrder(unitNum: number, cardKeys: string[]): number[] {
  const srs = loadSrs();
  return cardKeys.map((_, i) => i).sort((a, b) => {
    const pa = srs.words[`${unitNum}:${cardKeys[a]}`], pb = srs.words[`${unitNum}:${cardKeys[b]}`];
    return (pa ? pa.correct / Math.max(1, pa.total) : -1) - (pb ? pb.correct / Math.max(1, pb.total) : -1);
  });
}
export { PROGRESS_VERSION };
