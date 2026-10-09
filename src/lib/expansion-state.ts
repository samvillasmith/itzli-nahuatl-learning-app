// Browser persistence for the original V3 stores. Capture the owner when mounting
// a lesson; a late callback from another account must never write or upload it.
import { EXPANSION_COURSE_STORAGE_KEY, parseExpansionCourseProgress, type ExpansionCourseProgress } from "./expansion-course";
import { EXPANSION_STORAGE_KEY, createExpansionStorageAdapter, loadExpansionProgress, type ExpansionScopedStorage, type ExpansionStorageResult } from "./expansion-practice";
import { mergeExpansionSyncState, parseExpansionSyncState, type ExpansionSyncState } from "./expansion-sync-schema";
import { getProgressAccount, notifyProgressChanged, readScopedStorage, storageKey, writeRawStorage } from "./progress-storage";

export type ExpansionCourseStorageResult = { status: ExpansionStorageResult["status"]; progress: ExpansionCourseProgress };
export function loadExpansionCourseState(): ExpansionCourseStorageResult {
  try {
    const raw = readScopedStorage(EXPANSION_COURSE_STORAGE_KEY), progress = parseExpansionCourseProgress(raw);
    if (raw && !progress) writeRawStorage(storageKey("itzli_expansion_course_recovery_v3"), raw);
    return { status: progress ? "ready" : "invalid", progress: progress ?? { schemaVersion: 1, units: {} } };
  } catch { return { status: "unavailable", progress: { schemaVersion: 1, units: {} } }; }
}
function capturedStore(base: string) {
  const owner = getProgressAccount(), key = storageKey(base);
  function assertOwner() {
    if (getProgressAccount() !== owner || storageKey(base) !== key) throw new Error("The learning account changed. Reopen the lesson before saving.");
  }
  return Object.freeze({ key,
    getItem(requested: string) { assertOwner(); if (requested !== base) throw new Error("Unexpected progress store."); return localStorage.getItem(key); },
    setItem(requested: string, value: string) {
      assertOwner(); if (requested !== base) throw new Error("Unexpected progress store.");
      localStorage.setItem(key, value);
      notifyProgressChanged();
    },
  });
}
export function createExpansionCourseBrowserStorage() { return capturedStore(EXPANSION_COURSE_STORAGE_KEY); }
export function createExpansionPracticeBrowserStorage(): ExpansionScopedStorage {
  const captured = capturedStore(EXPANSION_STORAGE_KEY);
  return createExpansionStorageAdapter({
    getItem(key) { if (key !== captured.key) throw new Error("Unexpected scoped progress store."); return captured.getItem(EXPANSION_STORAGE_KEY); },
    setItem(key, value) { if (key !== captured.key) throw new Error("Unexpected scoped progress store."); captured.setItem(EXPANSION_STORAGE_KEY, value); },
  }, captured.key);
}
export function loadExpansionPracticeState(): ExpansionStorageResult {
  const raw = readScopedStorage(EXPANSION_STORAGE_KEY);
  const result = loadExpansionProgress({ getItem: () => raw, setItem: () => { throw new Error("Read-only progress"); } });
  if (raw && result.status === "invalid") writeRawStorage(storageKey("itzli_expansion_practice_recovery_v3"), raw);
  return result;
}
/** Invalid originals remain untouched and block cloud writes until recovered. */
export function loadExpansionSyncState(): ExpansionSyncState | null {
  const course = loadExpansionCourseState(), practice = loadExpansionPracticeState();
  return course.status === "ready" && practice.status === "ready" ? { version: 1, course: course.progress, practice: practice.progress } : null;
}
export function acceptExpansionSyncState(remote: ExpansionSyncState): ExpansionSyncState {
  const current = loadExpansionSyncState();
  if (!current) throw new Error("V3 browser progress needs recovery; neither copy was overwritten.");
  const merged = parseExpansionSyncState(mergeExpansionSyncState(current, remote));
  if (!merged) throw new Error("Merged V3 progress needs recovery; storage limits reached.");
  if (!Object.keys(merged.course.units).length && !Object.keys(merged.practice.items).length) return merged;
  // A quota failure must leave sync pending, rather than claiming durable sync.
  localStorage.setItem(storageKey(EXPANSION_COURSE_STORAGE_KEY), JSON.stringify(merged.course));
  localStorage.setItem(storageKey(EXPANSION_STORAGE_KEY), JSON.stringify(merged.practice));
  writeRawStorage(storageKey(EXPANSION_COURSE_STORAGE_KEY), JSON.stringify(merged.course));
  writeRawStorage(storageKey(EXPANSION_STORAGE_KEY), JSON.stringify(merged.practice));
  notifyProgressChanged();
  return merged;
}
