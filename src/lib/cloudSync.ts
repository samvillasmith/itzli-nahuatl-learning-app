// Client-side only. No request is sent for guest or local-review identities.
import { loadProgress, loadSrs, saveProgress, saveSrs, type ProgressData, type SrsData } from "./progress";
import { emptyProgress, emptySrs, parseProgressData, parseSrsData } from "./progress-schema";
import { emptyLearningState, mergeLearningStates, parseLearningState } from "./learning-schema";
import { loadLearningState, saveLearningState } from "./learning-state";
import { mergeProgressData, mergeSrsData } from "./progress-merge";
import { acceptExpansionSyncState, loadExpansionSyncState } from "./expansion-state";
import { emptyExpansionSyncState, expansionSyncContains, mergeExpansionSyncState } from "./expansion-sync-schema";
import { getProgressAccount, setProgressAccount, readScopedStorage, writeRawStorage, storageKey, subscribeProgressChanges, removeScopedStorage } from "./progress-storage";

export type SyncStatus = { status: "local" | "hydrating" | "synced" | "pending" | "error"; pending: boolean; lastSyncedAt: number | null; error: string | null };
type Snapshot = { progress: ProgressData; srs: SrsData };
let status: SyncStatus = { status: "local", pending: false, lastSyncedAt: null, error: null };
const listeners = new Set<(status: SyncStatus) => void>();
let initialized = false, hydrated = false, cloudDisabled = false, suppressChanges = false, dirty = false, deleting = false;
let generation = 0, changeSequence = 0, retries = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let pushFlight: Promise<boolean> | null = null;
let pullFlight: Promise<Snapshot> | null = null;
const snapshot = (): Snapshot => {
  const srs = loadSrs(), expansion = loadExpansionSyncState();
  if (expansion && (srs.expansion || Object.keys(expansion.course.units).length || Object.keys(expansion.practice.items).length)) {
    srs.expansion = srs.expansion ? mergeExpansionSyncState(srs.expansion, expansion) : expansion;
  }
  return { progress: loadProgress(), srs };
};
const localOnly = () => !getProgressAccount() || getProgressAccount() === "local-review" || cloudDisabled;
export function getSyncStatus(): SyncStatus { return { ...status }; }
export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
function setStatus(next: SyncStatus["status"], error: string | null = null) {
  status = { status: next, pending: dirty && !localOnly(), lastSyncedAt: next === "synced" ? Date.now() : status.lastSyncedAt, error };
  listeners.forEach((listener) => listener(getSyncStatus()));
}
function persistPending() { writeRawStorage(storageKey("itzli_progress_pending_v3"), dirty ? "1" : "0"); }
function queueSync(delay = 500) {
  if (localOnly() || deleting) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = undefined; void pushToCloud(); }, delay);
}
function failed(message: string) {
  setStatus("error", message);
  if (dirty && retries++ < 4) queueSync(Math.min(30_000, 1_000 * 2 ** retries));
}
subscribeProgressChanges(() => {
  if (suppressChanges) return;
  changeSequence++;
  dirty = true;
  persistPending();
  setStatus(localOnly() ? "local" : "pending");
  queueSync();
});
function acceptSnapshot(progress: ProgressData, srs: SrsData, learning: unknown) {
  suppressChanges = true;
  try {
    const mergedProgress = parseProgressData(mergeProgressData(loadProgress(), progress));
    const mergedSrs = parseSrsData(mergeSrsData(snapshot().srs, srs));
    if (!mergedProgress || !mergedSrs) throw new Error("Merged browser progress needs recovery; storage limits reached.");
    acceptExpansionSyncState(mergedSrs.expansion ?? emptyExpansionSyncState());
    saveProgress(mergedProgress);
    saveSrs(mergedSrs);
    const remote = parseLearningState(learning) ?? srs.learning ?? emptyLearningState();
    saveLearningState(mergeLearningStates(loadLearningState(), remote));
  } finally { suppressChanges = false; }
}
export async function initializeProgressSync(userId: string | null): Promise<Snapshot> {
  if (!initialized || getProgressAccount() !== userId) {
    generation++;
    initialized = true;
    setProgressAccount(userId);
    hydrated = false;
    cloudDisabled = false;
    deleting = false;
    retries = 0;
    dirty = readScopedStorage("itzli_progress_pending_v3") === "1";
    changeSequence = 0;
    pullFlight = null;
    pushFlight = null;
    if (timer) clearTimeout(timer);
  }
  if (localOnly()) { hydrated = true; setStatus("local"); return snapshot(); }
  const result = await pullAndMerge();
  if (dirty && hydrated) queueSync();
  return result;
}
export function pullAndMerge(): Promise<Snapshot> {
  if (localOnly()) { setStatus("local"); return Promise.resolve(snapshot()); }
  if (pullFlight) return pullFlight;
  const epoch = generation;
  setStatus("hydrating");
  // Assigned after construction so finally can recognize its own request.
  let flight!: Promise<Snapshot>;
  // eslint-disable-next-line prefer-const
  flight = (async () => {
    try {
      const res = await fetch("/api/progress", { cache: "no-store" });
      if (epoch !== generation) return snapshot();
      if (!res.ok) throw new Error(res.status === 409 ? "Saved progress needs recovery; no cloud data was overwritten." : "Progress could not be loaded. Your browser changes remain saved.");
      const body = await res.json() as Record<string, unknown>;
      if (epoch !== generation) return snapshot();
      if (body.mode === "local") { cloudDisabled = true; hydrated = true; setStatus("local"); return snapshot(); }
      const progress = body.progress === null ? emptyProgress() : parseProgressData(body.progress);
      const srs = body.srs === null ? emptySrs() : parseSrsData(body.srs);
      if (!progress || !srs) throw new Error("Saved progress could not be read; no cloud data was overwritten.");
      acceptSnapshot(progress, srs, body.learning);
      // Pre-sync V3 writers saved scoped stores without a pending flag. Compare
      // the union with the server so those earned results upload automatically.
      const localExpansion = snapshot().srs.expansion;
      if (localExpansion && !expansionSyncContains(srs.expansion ?? emptyExpansionSyncState(), localExpansion)) {
        dirty = true;
        persistPending();
      }
      hydrated = true;
      retries = 0;
      setStatus(dirty ? "pending" : "synced");
      return snapshot();
    } catch (error) {
      if (epoch === generation) failed(error instanceof Error ? error.message : "Progress sync is unavailable.");
      return snapshot();
    } finally { if (pullFlight === flight) pullFlight = null; }
  })();
  pullFlight = flight;
  return flight;
}
export function pushToCloud(): Promise<boolean> {
  if (localOnly()) { setStatus("local"); return Promise.resolve(false); }
  if (deleting) return Promise.resolve(false);
  if (pushFlight) return pushFlight;
  const epoch = generation;
  // Assigned after construction so finally can recognize its own request.
  let flight!: Promise<boolean>;
  // eslint-disable-next-line prefer-const
  flight = (async () => {
    try {
      if (!hydrated) await pullAndMerge();
      if (epoch !== generation || !hydrated || localOnly()) return false;
      const sequence = changeSequence;
      setStatus("pending");
      if (!loadExpansionSyncState()) throw new Error("V3 browser progress needs recovery; no cloud data was overwritten.");
      const current = snapshot();
      if (!parseSrsData(current.srs)) throw new Error("Merged browser progress needs recovery; storage limits reached.");
      const res = await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...current, learning: loadLearningState() }) });
      if (epoch !== generation) return false;
      if (!res.ok) throw new Error(res.status === 409 ? "Progress changed during sync. Retry to preserve both copies." : res.status === 413 ? "Progress exceeds the cloud storage limit. Your browser changes remain saved; shorten vocabulary notes before retrying." : "Progress could not be uploaded. Your browser changes remain saved.");
      const body = await res.json() as Record<string, unknown>;
      if (epoch !== generation) return false;
      const progress = parseProgressData(body.progress), srs = parseSrsData(body.srs);
      if (!progress || !srs) throw new Error("The save response could not be read. Your browser changes remain saved.");
      if (current.srs.expansion && (!srs.expansion || !expansionSyncContains(srs.expansion, current.srs.expansion))) {
        throw new Error("V3 progress was not confirmed by the server. Your browser changes remain saved.");
      }
      acceptSnapshot(progress, srs, body.learning);
      dirty = changeSequence !== sequence;
      persistPending();
      retries = 0;
      setStatus(dirty ? "pending" : "synced");
      if (dirty) queueSync();
      return true;
    } catch (error) {
      if (epoch === generation) { dirty = true; persistPending(); failed(error instanceof Error ? error.message : "Progress sync is unavailable."); }
      return false;
    } finally { if (pushFlight === flight) pushFlight = null; }
  })();
  pushFlight = flight;
  return flight;
}
export async function retryProgressSync(): Promise<boolean> {
  retries = 0;
  if (localOnly()) { setStatus("local"); return false; }
  if (dirty) return pushToCloud();
  await pullAndMerge();
  return hydrated;
}
export async function deleteCloudProgress(): Promise<boolean> {
  if (localOnly()) return true;
  if (deleting) return false;
  const epoch = generation;
  deleting = true;
  if (timer) clearTimeout(timer);
  if (pushFlight) await pushFlight;
  if (epoch !== generation) return false;
  try {
    const res = await fetch("/api/progress", { method: "DELETE" });
    if (!res.ok || epoch !== generation) return false;
    // Late reads from before this explicit reset must never restore the deleted
    // snapshot. The caller clears scoped browser data after a successful return.
    generation++;
    pullFlight = null;
    dirty = false;
    removeScopedStorage("itzli_progress_pending_v3");
    setStatus("synced");
    return true;
  } catch { failed("Cloud progress could not be deleted."); return false; }
  finally { if (epoch === generation || epoch + 1 === generation) deleting = false; }
}
