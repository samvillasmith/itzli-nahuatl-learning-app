import { toInaliOrthography } from "./orthography";
import type { AppLocale } from "@/i18n/config";
import { reviewedContextPhrase } from "@/lib/reviewed-context-labels";

export type ExpansionText = { en: string; es: string };
export type ExpansionPhrase = {
  id: string; sourceId: string; sourceText: string | null; nahuatl: string;
  english: string; spanish: string; audioUrl: string | null;
  audioKind: "source-recording" | "none";
  usageNote?: ExpansionText;
  supplementalSources?: { title: string; url: string }[];
  sourceLocator: { lessonNumber: number | null; sectionIndex: number | null; bodyIndex: number | null; vocabularyIndex: number | null;
    operation?: string; lexicalEntryId?: string; lexicalSourceUrl?: string };
  adaptationNote: string;
};
export type ExpansionRule = {
  id: string; title: ExpansionText; explanation: ExpansionText;
  phraseIds: string[]; sourceIds: string[]; scope: ExpansionText;
};
export type ExpansionStep = {
  id: string; kind: "choice" | "recall"; prompt: ExpansionText;
  phraseId: string | null; choices: string[]; answerPhraseIds: string[]; feedback: ExpansionText;
};
export type ExpansionUnit = {
  id: string; title: ExpansionText; goal: ExpansionText; durationMinutes: number;
  ruleIds: string[]; phraseIds: string[]; steps: ExpansionStep[]; mastery: ExpansionText;
};
export type ExpansionSource = {
  id: string; title: string; url: string; license: string; authors: string[]; variety: string;
};
export type ExpansionCourse = {
  schemaVersion: number; license: Record<string, unknown>;
  sources: ExpansionSource[]; phrases: ExpansionPhrase[]; rules: ExpansionRule[]; units: ExpansionUnit[];
  coverage: { topicId: string; status: string; ruleIds: string[]; sourceIds: string[]; remainingScope: ExpansionText }[];
};

/** Compare only documented answers. Orthographic normalization never generates a sentence. */
export function normalizeExpansionResponse(value: string): string {
  return toInaliOrthography(value).toLocaleLowerCase().replace(/[¿¡?!.,:;“”"']/g, "").replace(/\s+/g, " ").trim();
}

export function checkExpansionResponse(value: string, answers: readonly ExpansionPhrase[]): boolean {
  const normalized = normalizeExpansionResponse(value);
  return Boolean(normalized) && answers.some(answer => normalizeExpansionResponse(answer.nahuatl) === normalized);
}

export function expansionMeaning(phrase: ExpansionPhrase, locale: AppLocale): string {
  const learner = reviewedContextPhrase(phrase);
  return locale === "es" ? learner.spanish : learner.english;
}

export const EXPANSION_COURSE_STORAGE_KEY = "itzli_expansion_course_v1";
export type ExpansionPriorLessonResult = { completedAt: number; firstAttemptCorrect: number; total: number; lessonRevision?: string };
export type ExpansionLessonResult = ExpansionPriorLessonResult & { priorResults?: ExpansionPriorLessonResult[] };
export type ExpansionCourseProgress = { schemaVersion: 1; units: Record<string, ExpansionLessonResult> };
const MAX_PRIOR_LESSON_RESULTS = 10;
function validLessonRevision(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9:_-]{0,159}$/.test(value);
}
function parseLessonResult(value: unknown): ExpansionPriorLessonResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as ExpansionPriorLessonResult;
  if (!Number.isSafeInteger(r.completedAt) || r.completedAt < 0 || !Number.isInteger(r.total) || r.total < 1 || r.total > 1000 || !Number.isInteger(r.firstAttemptCorrect) || r.firstAttemptCorrect < 0 || r.firstAttemptCorrect > r.total || (r.lessonRevision !== undefined && !validLessonRevision(r.lessonRevision))) return null;
  return { completedAt: r.completedAt, firstAttemptCorrect: r.firstAttemptCorrect, total: r.total,
    ...(r.lessonRevision !== undefined ? { lessonRevision: r.lessonRevision } : {}) };
}

export function parseExpansionCourseProgress(raw: string | null): ExpansionCourseProgress | null {
  if (raw === null) return { schemaVersion: 1, units: {} };
  try {
    return parseExpansionCourseState(JSON.parse(raw));
  } catch { return null; }
}
export function parseExpansionCourseState(value: unknown): ExpansionCourseProgress | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (record.schemaVersion !== 1 || !record.units || typeof record.units !== "object" || Array.isArray(record.units) || Object.keys(record.units).length > 1000) return null;
    const units: ExpansionCourseProgress["units"] = {};
    for (const [id, result] of Object.entries(record.units)) {
      if (!/^v3-[a-z0-9-]{1,157}$/.test(id) || !result || typeof result !== "object") return null;
      const r = parseLessonResult(result);
      if (!r) return null;
      const history = (result as ExpansionLessonResult).priorResults;
      if (history !== undefined && (!Array.isArray(history) || history.length > MAX_PRIOR_LESSON_RESULTS || history.some(prior => !parseLessonResult(prior) || Object.hasOwn(prior, "priorResults")))) return null;
      units[id] = { ...r, ...(history !== undefined ? { priorResults: history.map(prior => parseLessonResult(prior)!) } : {}) };
    }
    return { schemaVersion: 1, units };
}

/** Union earned lessons and retain revision history. Repeated sync is idempotent. */
export function mergeExpansionCourseProgress(a: ExpansionCourseProgress, b: ExpansionCourseProgress): ExpansionCourseProgress {
  const units: ExpansionCourseProgress["units"] = {};
  for (const id of new Set([...Object.keys(a.units), ...Object.keys(b.units)])) {
    const x = a.units[id], y = b.units[id];
    if (!x || !y) { units[id] = structuredClone(x ?? y); continue; }
    const records = [...[x, y].map(result => parseLessonResult(result)!), ...x.priorResults ?? [], ...y.priorResults ?? []];
    const unique = [...new Map(records.map(result => [JSON.stringify(result), result])).values()]
      .sort((p, q) => p.completedAt - q.completedAt || JSON.stringify(p).localeCompare(JSON.stringify(q)));
    const latest = unique.pop()!;
    const prior = unique.length <= MAX_PRIOR_LESSON_RESULTS ? unique : [unique[0], ...unique.slice(-(MAX_PRIOR_LESSON_RESULTS - 1))];
    units[id] = { ...latest, ...(prior.length ? { priorResults: prior } : {}) };
  }
  return { schemaVersion: 1, units };
}

export function withExpansionLessonResult(progress: ExpansionCourseProgress, unit: ExpansionUnit, correct: number, now = Date.now(), lessonRevision?: string): ExpansionCourseProgress {
  if (!/^v3-[a-z0-9-]{1,157}$/.test(unit.id) || !unit.steps.length || unit.steps.length > 1000 || !Number.isInteger(correct) || correct < 0 || correct > unit.steps.length) throw new Error("Invalid expansion lesson result");
  if (!Number.isSafeInteger(now) || now < 0 || (lessonRevision !== undefined && !validLessonRevision(lessonRevision))) throw new Error("Invalid expansion lesson revision");
  const previous = progress.units[unit.id];
  const history = [...(previous?.priorResults ?? [])];
  if (previous && lessonRevision !== undefined && previous.lessonRevision !== lessonRevision) {
    const prior = parseLessonResult(previous);
    if (!prior) throw new Error("Invalid prior lesson result");
    history.push(prior);
  }
  const result: ExpansionLessonResult = { completedAt: now, firstAttemptCorrect: correct, total: unit.steps.length,
    ...(lessonRevision !== undefined ? { lessonRevision } : previous?.lessonRevision !== undefined ? { lessonRevision: previous.lessonRevision } : {}),
    ...(history.length ? { priorResults: history.length <= MAX_PRIOR_LESSON_RESULTS ? history
      : [history[0], ...history.slice(-(MAX_PRIOR_LESSON_RESULTS - 1))] } : {}) };
  return { schemaVersion: 1, units: { ...progress.units, [unit.id]: result } };
}
