import { importAttempt } from "./learning-state";
import { parseLearningAttempt, type LearningAttempt } from "./learning-schema";
import { getProgressAccount } from "./progress-storage";

type OfflineAttempt = LearningAttempt & { stream: string; sequence: number };
export type OfflineImportSummary = { imported: number; duplicates: number; remaining: number; storageError: boolean };
const queueKey = () => `itzli_offline_attempts_v3:${encodeURIComponent(getProgressAccount() ?? "guest")}`;
const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
function pendingKeys(base: string): string[] {
  const keys = new Set<string>();
  if (localStorage.getItem(base) !== null) keys.add(base);
  for (let n = 0; n < localStorage.length; n++) {
    const candidate = localStorage.key(n);
    if (candidate?.startsWith(`${base}:`)) keys.add(candidate);
  }
  return [...keys];
}
export function hasPendingOfflineAttempts(): boolean {
  if (typeof window === "undefined") return false;
  try { return pendingKeys(queueKey()).length > 0; } catch { return false; }
}
/** Explicit reset only. Snapshot keys before removing them and verify removal;
 * preserve other accounts, saved course packs, and unrelated browser data. */
export function clearOfflineAttempts(): boolean {
  if (typeof window === "undefined") return false;
  const base = queueKey();
  try {
    for (const key of pendingKeys(base)) {
      localStorage.removeItem(key);
      if (localStorage.getItem(key) !== null) return false;
    }
    return pendingKeys(base).length === 0;
  } catch { return false; }
}
function parse(value: unknown): OfflineAttempt | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>, attempt = parseLearningAttempt(raw);
  if (!attempt || typeof raw.stream !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(raw.stream) ||
      !Number.isSafeInteger(raw.sequence) || Number(raw.sequence) < 1 || attempt.id !== `offline:${raw.stream}:${raw.sequence}`) return null;
  return { ...attempt, stream: raw.stream, sequence: Number(raw.sequence) };
}
/** No fetch: import only the active account's queue. Unknown records are kept. */
export function importOfflineAttempts(allowed: ReadonlySet<string>): OfflineImportSummary {
  const result: OfflineImportSummary = { imported: 0, duplicates: 0, remaining: 0, storageError: false };
  if (typeof window === "undefined") return result;
  const key = queueKey();
  try {
    const keys = new Set([key]);
    // New pages store immutable events separately. They can append practice
    // while imports remove earlier event keys without a whole-queue overwrite.
    for (let n = 0; n < localStorage.length; n++) {
      const candidate = localStorage.key(n);
      if (candidate?.startsWith(`${key}:`)) keys.add(candidate);
    }
    const queues = new Map<string, unknown[]>();
    for (const queue of keys) {
      const raw = localStorage.getItem(queue);
      if (!raw) continue;
      let pending: unknown;
      try { pending = JSON.parse(raw); } catch { result.storageError = true; continue; }
      if (!Array.isArray(pending)) { result.storageError = true; continue; }
      result.remaining += pending.length;
      // Give pre-ID queues stable identities before importing. If that write
      // is blocked, leave originals untouched instead of risking double counts.
      const stream = uuid();
      let upgraded = false;
      const events = pending.map((item, index) => {
        if (parse(item) || typeof item !== "object" || item === null) return item;
        const old = item as Record<string, unknown>;
        if (old.id !== undefined || typeof old.activityId !== "string" || typeof old.correct !== "boolean" || !Number.isSafeInteger(old.at) || Number(old.at) < 0) return item;
        upgraded = true;
        const sequence = index + 1;
        return { ...old, id: `offline:${stream}:${sequence}`, skill: old.skill ?? "recognition", stream, sequence };
      });
      if (upgraded) {
        try {
          const encoded = JSON.stringify(events);
          localStorage.setItem(queue, encoded);
          if (localStorage.getItem(queue) !== encoded) { result.storageError = true; continue; }
        } catch { result.storageError = true; continue; }
      }
      queues.set(queue, events);
    }
    const events = [...queues.values()].flat();
    const acknowledged = new Set<string>(), blocked = new Set<string>();
    for (const rawEvent of events) if (!parse(rawEvent) && typeof rawEvent === "object" && rawEvent !== null && typeof (rawEvent as Record<string, unknown>).stream === "string") blocked.add((rawEvent as Record<string, string>).stream);
    const ordered = events.flatMap((rawEvent) => { const attempt = parse(rawEvent); return attempt ? [attempt] : []; })
      .sort((a, b) => a.stream.localeCompare(b.stream) || a.sequence - b.sequence);
    for (const attempt of ordered) {
      if (blocked.has(attempt.stream)) continue;
      if (!allowed.has(attempt.activityId)) { blocked.add(attempt.stream); continue; }
      const imported = importAttempt(attempt, attempt);
      if (imported === "invalid" || imported === "unavailable") { blocked.add(attempt.stream); result.storageError ||= imported === "unavailable"; continue; }
      acknowledged.add(attempt.id);
      if (imported === "imported") result.imported++; else result.duplicates++;
    }
    for (const [queue, original] of queues) {
      if (!original.some((item) => acknowledged.has(parse(item)?.id ?? ""))) continue;
      try {
        // Re-read legacy arrays so newly appended old-format events survive.
        const latest: unknown = JSON.parse(localStorage.getItem(queue) ?? "[]");
        if (!Array.isArray(latest)) { result.storageError = true; continue; }
        const remaining = latest.filter((item) => !acknowledged.has(parse(item)?.id ?? ""));
        if (remaining.length) localStorage.setItem(queue, JSON.stringify(remaining)); else localStorage.removeItem(queue);
        result.remaining += remaining.length - original.length;
      } catch { result.storageError = true; }
    }
    return result;
  } catch { return { ...result, storageError: true }; }
}
