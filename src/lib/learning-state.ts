// Client-only persistence; learning-schema.ts contains the server-safe logic.
import { activityCounts, emptyLearningState, emptyReviewState, learningActivityKey, MAX_ATTEMPT_EVENTS, mergeLearningStates, parseLearningAttempt, parseLearningState, scheduleReview, type ActivityMastery, type DueReview, type LearningAttempt, type LearningSkill, type LearningState } from "./learning-schema";
import { parseSrsData } from "./progress-schema";
import { getProgressDeviceId, readScopedStorage, writeScopedStorage, writeRawStorage, storageKey } from "./progress-storage";
export type { ActivityMastery, DueReview, LearningAttempt, LearningSkill, LearningState } from "./learning-schema";
const KEY = "itzli_learning_v1";
function json(raw: string | null): unknown { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
export function loadLearningState(): LearningState {
  const raw = readScopedStorage(KEY), valid = parseLearningState(json(raw));
  if (raw && !valid) writeRawStorage(storageKey("itzli_learning_recovery_v3"), raw);
  const parsed = valid ?? emptyLearningState();
  const srs = parseSrsData(json(readScopedStorage("itzli_srs_v2")));
  if (!srs) return parsed;
  const inherited = emptyLearningState();
  for (const [wordKey, perf] of Object.entries(srs.words)) {
    const id = /^\d+:v:(-?\d+)$/.exec(wordKey)?.[1];
    if (!id) continue;
    const activityId = `word:${id}`, key = learningActivityKey(activityId, "recognition");
    const counts = perf.base ?? (perf.devices ? { correct: 0, total: 0 } : { correct: perf.correct, total: perf.total });
    const previous = inherited.activities[key]?.devices.legacy;
    inherited.activities[key] = { activityId, skill: "recognition", review: emptyReviewState(), devices: { legacy: { correct: Math.max(previous?.correct ?? 0, counts.correct), total: Math.max(previous?.total ?? 0, counts.total) } } };
  }
  return mergeLearningStates(inherited, srs.learning ? mergeLearningStates(parsed, srs.learning) : parsed);
}
export function saveLearningState(data: LearningState): void {
  const parsed = parseLearningState(data);
  if (parsed) writeScopedStorage(KEY, JSON.stringify(parsed));
}
export function recordAttempt(activityId: string, skill: LearningSkill, correct: boolean): LearningAttempt {
  const state = loadLearningState(), at = Date.now(), key = learningActivityKey(activityId, skill), device = getProgressDeviceId();
  const existing = state.activities[key] ?? { activityId, skill, devices: {}, review: emptyReviewState() };
  const previous = existing.devices[device] ?? { correct: 0, total: 0 };
  state.activities[key] = { activityId, skill, devices: { ...existing.devices, [device]: { correct: previous.correct + Number(correct), total: previous.total + 1 } }, review: scheduleReview(existing.review, correct, at) };
  const id = globalThis.crypto?.randomUUID?.() ?? `${device}-${at}-${Math.random().toString(36).slice(2)}`;
  const attempt = { id, activityId, skill, correct, at };
  state.attempts[id] = attempt;
  state.attempts = Object.fromEntries(Object.entries(state.attempts).sort(([x, a], [y, b]) => b.at - a.at || x.localeCompare(y)).slice(0, MAX_ATTEMPT_EVENTS));
  saveLearningState(state);
  return attempt;
}
export type AttemptImportResult = "imported" | "duplicate" | "invalid" | "unavailable";
/** Import ordered offline stream prefixes. Deterministic stream counters and
 * durable watermarks make cleanup retries idempotent across tabs and reloads. */
export function importAttempt(raw: LearningAttempt, origin: { stream: string; sequence: number }): AttemptImportResult {
  const attempt = parseLearningAttempt(raw), { stream, sequence } = origin;
  if (!attempt || !/^[a-zA-Z0-9_-]{1,100}$/.test(stream) || !Number.isSafeInteger(sequence) || sequence < 1 ||
      attempt.id !== `offline:${stream}:${sequence}`) return "invalid";
  const state = loadLearningState(), duplicate = (state.imported?.[stream] ?? 0) >= sequence;
  if (!duplicate) {
    const key = learningActivityKey(attempt.activityId, attempt.skill), device = `offline:${stream}`;
    const existing = state.activities[key] ?? { activityId: attempt.activityId, skill: attempt.skill, devices: {}, review: emptyReviewState() };
    const previous = existing.devices[device] ?? { correct: 0, total: 0 };
    state.activities[key] = { ...existing, devices: { ...existing.devices, [device]: { correct: previous.correct + Number(attempt.correct), total: previous.total + 1 } },
      // A delayed import must not rewind a more recent online review.
      review: attempt.at >= existing.review.lastReviewedAt ? scheduleReview(existing.review, attempt.correct, attempt.at) : existing.review };
    state.attempts[attempt.id] = attempt;
    state.attempts = Object.fromEntries(Object.entries(state.attempts).sort(([x, a], [y, b]) => b.at - a.at || x.localeCompare(y)).slice(0, MAX_ATTEMPT_EVENTS));
    (state.imported ??= {})[stream] = sequence;
  }
  if (!parseLearningState(state)) return "invalid";
  saveLearningState(state);
  // The generic store supports an in-memory fallback. Offline queue cleanup
  // needs a durable acknowledgement so a quota error cannot erase practice.
  try {
    const durable = parseLearningState(json(localStorage.getItem(storageKey(KEY))));
    return (durable?.imported?.[stream] ?? 0) >= sequence ? duplicate ? "duplicate" : "imported" : "unavailable";
  } catch { return "unavailable"; }
}
export function getDueReviews(now = Date.now()): DueReview[] {
  return Object.values(loadLearningState().activities).filter((activity) => activity.review.dueAt <= now)
    .map((activity) => ({ activityId: activity.activityId, skill: activity.skill, ...activityCounts(activity), dueAt: activity.review.dueAt, lastReviewedAt: activity.review.lastReviewedAt, intervalDays: activity.review.intervalDays }))
    .sort((a, b) => a.dueAt - b.dueAt || a.activityId.localeCompare(b.activityId));
}
export function getActivityMastery(activityId: string, skill?: LearningSkill): ActivityMastery {
  const state = loadLearningState();
  const totals = Object.values(state.activities).filter((activity) => activity.activityId === activityId && (!skill || skill === activity.skill))
    .reduce((sum, item) => { const counts = activityCounts(item); return { correct: sum.correct + counts.correct, total: sum.total + counts.total }; }, { correct: 0, total: 0 });
  const accuracy = totals.total ? totals.correct / totals.total : 0;
  return { ...totals, accuracy, level: totals.total === 0 ? "new" : totals.correct >= 3 && accuracy >= 0.8 ? "practiced" : "learning", completed: state.completed[activityId] !== undefined };
}
export function markActivityCompleted(activityId: string): void {
  const state = loadLearningState();
  state.completed[activityId] ??= Date.now();
  saveLearningState(state);
}
