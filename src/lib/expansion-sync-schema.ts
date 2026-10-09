import { mergeExpansionCourseProgress, parseExpansionCourseState, type ExpansionCourseProgress } from "./expansion-course";
import { emptyExpansionProgress, mergeExpansionProgress, parseExpansionProgress, type ExpansionProgress } from "./expansion-practice";

/** Optional extension of the existing v2 SRS JSON. Older clients may omit it. */
export type ExpansionSyncState = { version: 1; course: ExpansionCourseProgress; practice: ExpansionProgress };
export function emptyExpansionSyncState(): ExpansionSyncState {
  return { version: 1, course: { schemaVersion: 1, units: {} }, practice: emptyExpansionProgress() };
}
export function parseExpansionSyncState(value: unknown): ExpansionSyncState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const course = parseExpansionCourseState(raw.course), practice = parseExpansionProgress(raw.practice);
  return raw.version === 1 && course && practice ? { version: 1, course, practice } : null;
}
export function mergeExpansionSyncState(a: ExpansionSyncState, b: ExpansionSyncState): ExpansionSyncState {
  return { version: 1, course: mergeExpansionCourseProgress(a.course, b.course), practice: mergeExpansionProgress(a.practice, b.practice) };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
/** Acknowledgements must contain the submitted union before clearing pending. */
export function expansionSyncContains(confirmed: ExpansionSyncState, submitted: ExpansionSyncState): boolean {
  return canonical(mergeExpansionSyncState(confirmed, submitted)) === canonical(mergeExpansionSyncState(confirmed, confirmed));
}
