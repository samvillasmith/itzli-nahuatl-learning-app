export type LearningSkill = "recognition" | "listening" | "production" | "speaking";
export type AttemptCounts = { correct: number; total: number };
export type ReviewState = {
  dueAt: number;
  lastReviewedAt: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  successfulStreak: number;
};
export type LearningActivityState = {
  activityId: string;
  skill: LearningSkill;
  devices: Record<string, AttemptCounts>;
  review: ReviewState;
};
export type LearningAttempt = {
  id: string;
  activityId: string;
  skill: LearningSkill;
  correct: boolean;
  at: number;
};
export type LearningState = {
  version: 1;
  activities: Record<string, LearningActivityState>;
  completed: Record<string, number>;
  attempts: Record<string, LearningAttempt>;
  /** Imported offline stream prefixes; retained beyond the recent-event window. */
  imported?: Record<string, number>;
};
export type DueReview = {
  activityId: string;
  skill: LearningSkill;
  dueAt: number;
  lastReviewedAt: number;
  intervalDays: number;
  correct: number;
  total: number;
};
export type ActivityMastery = {
  correct: number;
  total: number;
  accuracy: number;
  level: "new" | "learning" | "practiced";
  completed: boolean;
};

export const MAX_ATTEMPT_EVENTS = 500;
const SKILLS: LearningSkill[] = ["recognition", "listening", "production", "speaking"];
const DAY = 86_400_000;
const INTERVALS = [1, 3, 7, 14, 30, 60];
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const count = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= Number.MAX_SAFE_INTEGER;
export const learningActivityKey = (id: string, skill: LearningSkill) => JSON.stringify([id, skill]);
export const emptyLearningState = (): LearningState => ({ version: 1, activities: {}, completed: {}, attempts: {} });
export const emptyReviewState = (): ReviewState => ({
  dueAt: 0, lastReviewedAt: 0, intervalDays: 0, repetitions: 0, lapses: 0, successfulStreak: 0,
});

function validId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200 &&
    value !== "__proto__" && value !== "constructor" && value !== "prototype";
}
function validSkill(value: unknown): value is LearningSkill {
  return SKILLS.includes(value as LearningSkill);
}
export function parseAttemptCounts(value: unknown): AttemptCounts | null {
  if (!record(value) || !count(value.correct) || !count(value.total) || value.correct > value.total) return null;
  return { correct: value.correct, total: value.total };
}
export function parseLearningAttempt(value: unknown): LearningAttempt | null {
  if (!record(value) || !validId(value.id) || !validId(value.activityId) ||
      !validSkill(value.skill) || typeof value.correct !== "boolean" || !count(value.at)) return null;
  return { id: value.id, activityId: value.activityId, skill: value.skill, correct: value.correct, at: value.at };
}
export function activityCounts(activity: LearningActivityState): AttemptCounts {
  return Object.values(activity.devices).reduce((sum, item) => ({
    correct: sum.correct + item.correct, total: sum.total + item.total,
  }), { correct: 0, total: 0 });
}
export function scheduleReview(previous: ReviewState, correct: boolean, at: number): ReviewState {
  const successfulStreak = correct ? previous.successfulStreak + 1 : 0;
  const intervalDays = correct ? INTERVALS[Math.min(successfulStreak - 1, INTERVALS.length - 1)] : 1;
  return {
    dueAt: at + intervalDays * DAY,
    lastReviewedAt: at,
    intervalDays,
    repetitions: previous.repetitions + 1,
    lapses: previous.lapses + (correct ? 0 : 1),
    successfulStreak,
  };
}
export function parseLearningState(value: unknown): LearningState | null {
  if (!record(value) || value.version !== 1 || !record(value.activities) ||
      !record(value.completed) || !record(value.attempts)) return null;
  if (Object.keys(value.activities).length > 20_000 || Object.keys(value.completed).length > 2_000 ||
      Object.keys(value.attempts).length > MAX_ATTEMPT_EVENTS) return null;
  const parsed = emptyLearningState();
  for (const [key, raw] of Object.entries(value.activities)) {
    if (!record(raw) || !validId(raw.activityId) || !validSkill(raw.skill) ||
        key !== learningActivityKey(raw.activityId, raw.skill) || !record(raw.devices) ||
        Object.keys(raw.devices).length > 2_000 || !record(raw.review)) return null;
    const devices: Record<string, AttemptCounts> = {};
    for (const [id, rawCounts] of Object.entries(raw.devices)) {
      const counts = parseAttemptCounts(rawCounts);
      if (!validId(id) || !counts) return null;
      devices[id] = counts;
    }
    const fields = ["dueAt", "lastReviewedAt", "intervalDays", "repetitions", "lapses", "successfulStreak"] as const;
    const review = raw.review;
    if (fields.some((field) => !count(review[field]))) return null;
    parsed.activities[key] = {
      activityId: raw.activityId, skill: raw.skill, devices,
      review: Object.fromEntries(fields.map((field) => [field, review[field]])) as ReviewState,
    };
  }
  for (const [id, at] of Object.entries(value.completed)) {
    if (!validId(id) || !count(at)) return null;
    parsed.completed[id] = at;
  }
  for (const [id, raw] of Object.entries(value.attempts)) {
    const attempt = parseLearningAttempt(raw);
    if (!attempt || attempt.id !== id) return null;
    parsed.attempts[id] = attempt;
  }
  if (value.imported !== undefined) {
    if (!record(value.imported) || Object.keys(value.imported).length > 2_000) return null;
    parsed.imported = {};
    for (const [stream, sequence] of Object.entries(value.imported)) {
      if (!validId(stream) || !count(sequence) || sequence < 1) return null;
      parsed.imported[stream] = sequence;
    }
  }
  return parsed;
}
export function mergeLearningStates(a: LearningState, b: LearningState): LearningState {
  const merged = emptyLearningState();
  for (const key of new Set([...Object.keys(a.activities), ...Object.keys(b.activities)])) {
    const left = a.activities[key], right = b.activities[key];
    if (!left || !right) {
      merged.activities[key] = structuredClone(left ?? right);
      continue;
    }
    const devices: Record<string, AttemptCounts> = {};
    for (const id of new Set([...Object.keys(left.devices), ...Object.keys(right.devices)])) {
      const x = left.devices[id], y = right.devices[id];
      devices[id] = x && y ? { correct: Math.max(x.correct, y.correct), total: Math.max(x.total, y.total) } : { ...x ?? y };
    }
    // A due date describes the latest actual attempt, never a cloud-upload time.
    const latest = left.review.lastReviewedAt !== right.review.lastReviewedAt
      ? (left.review.lastReviewedAt > right.review.lastReviewedAt ? left : right)
      : JSON.stringify(left.review) > JSON.stringify(right.review) ? left : right;
    merged.activities[key] = { ...latest, devices, review: { ...latest.review } };
  }
  for (const id of new Set([...Object.keys(a.completed), ...Object.keys(b.completed)])) {
    const dates = [a.completed[id], b.completed[id]].filter((at) => at !== undefined);
    merged.completed[id] = Math.min(...dates);
  }
  merged.attempts = Object.fromEntries(Object.entries({ ...a.attempts, ...b.attempts })
    .sort(([idA, x], [idB, y]) => y.at - x.at || idA.localeCompare(idB)).slice(0, MAX_ATTEMPT_EVENTS));
  for (const stream of new Set([...Object.keys(a.imported ?? {}), ...Object.keys(b.imported ?? {})])) {
    (merged.imported ??= {})[stream] = Math.max(a.imported?.[stream] ?? 0, b.imported?.[stream] ?? 0);
  }
  return merged;
}
