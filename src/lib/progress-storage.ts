// Browser storage is scoped to one authenticated identity (or a separate guest).
let account: string | null = null;
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
const LEGACY_CLAIM_KEY = "itzli_legacy_progress_claim_v3";
let fallbackDevice = "";
let writerId = "";

export function getProgressAccount(): string | null { return account; }
export function storageKey(base: string): string {
  return `${base}:${account ? `account:${encodeURIComponent(account)}` : "guest"}`;
}
export function readRawStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(key) ?? memory.get(key) ?? null; }
  catch { return memory.get(key) ?? null; }
}
export function writeRawStorage(key: string, value: string): void {
  memory.set(key, value);
  if (typeof window !== "undefined") {
    try { localStorage.setItem(key, value); } catch { /* Preserve session state when storage is unavailable. */ }
  }
}
export function removeRawStorage(key: string): void {
  memory.delete(key);
  if (typeof window !== "undefined") {
    try { localStorage.removeItem(key); } catch { /* Session copy has been removed. */ }
  }
}
export function readScopedStorage(base: string): string | null { return readRawStorage(storageKey(base)); }
export function writeScopedStorage(base: string, value: string): void {
  writeRawStorage(storageKey(base), value);
  notifyProgressChanged();
}
export function removeScopedStorage(base: string): void { removeRawStorage(storageKey(base)); }
export function subscribeProgressChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function notifyProgressChanged(): void { listeners.forEach((listener) => listener()); }
export function setProgressAccount(userId: string | null): void {
  account = userId;
  // Old browser blobs contain no owner. Keep them untouched until the learner
  // explicitly chooses to import them into the currently signed-in account.
}
export function hasUnclaimedLegacyProgress(): boolean {
  return !readRawStorage(LEGACY_CLAIM_KEY) &&
    ["itzli_progress_v2", "itzli_progress_v1", "itzli_srs_v2", "itzli_srs_v1"].some((key) => Boolean(readRawStorage(key)));
}
export function claimLegacyStorage(): boolean {
  if (!account || account === "local-review") return false;
  const claimed = readRawStorage(LEGACY_CLAIM_KEY);
  if (claimed && claimed !== account) return false;
  writeRawStorage(LEGACY_CLAIM_KEY, account);
  return true;
}
export function getProgressDeviceId(): string {
  const key = "itzli_progress_device_v3";
  const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const saved = readRawStorage(key);
  if (!fallbackDevice) fallbackDevice = saved ?? `device-${uuid()}`;
  if (!saved) writeRawStorage(key, fallbackDevice);
  // Independent open tabs must have independent grow-only counters. Reusing
  // one installation ID alone would lose simultaneous attempts from two tabs.
  if (!writerId) writerId = uuid();
  return `${fallbackDevice}:${writerId}`;
}
