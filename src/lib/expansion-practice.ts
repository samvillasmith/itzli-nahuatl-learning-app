import type { AppLocale } from "@/i18n/config";

/** Accepted, independently sourced entries supplied by the expansion catalogue. */
export interface ExpansionPracticeEntry {
  id: string;
  display: string;
  meaningEn: string;
  meaningEs: string;
  partOfSpeech: string;
  sourceUrl: string;
  legacySourceVocabId?: number;
  legacyMainCourseVocabId?: number;
  formKind?: string;
  usageNoteEn?: string;
  usageNoteEs?: string;
  audioUrl?: string;
  audioKind: "source-recording" | "none";
}

export function isExpansionBuildingBlock(entry: { formKind?: string }): boolean {
  return ["dependent-reference-form", "relational-reference-form", "rule-composed-reference-form", "source-extracted-reference-form", "bound-stem", "possessed-stem",
    "relational-base", "possessed-noun-reference"].includes(entry.formKind ?? "");
}

/** Pure progress functions use this base; the browser adapter supplies its owner scope. */
export const EXPANSION_STORAGE_KEY = "itzli_expansion_practice_v1";
export const EXPANSION_NOTE_LIMIT = 1000;
const DAY = 86_400_000;
export type ExpansionSkill = "recall" | "recognition";
export interface ExpansionReviewTrack {
  attempts: number;
  successes: number;
  lastReviewedAt: number;
  dueAt: number;
  intervalDays: number;
  base?: { attempts: number; successes: number };
  devices?: Record<string, { attempts: number; successes: number }>;
}
export interface ExpansionItemProgress {
  recall: ExpansionReviewTrack;
  recognition: ExpansionReviewTrack;
  bookmarked: boolean;
  bookmarkUpdatedAt: number;
  note: string;
  noteUpdatedAt: number;
}
export interface ExpansionProgress {
  version: 1;
  items: Record<string, ExpansionItemProgress>;
}
export interface ExpansionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface ExpansionScopedStorage extends ExpansionStorage {
  readonly key: string;
}

/** Capture a scope resolved by the browser after account selection. Never fall
 * back to unowned or legacy blobs, and reject accidental use for another store. */
export function createExpansionStorageAdapter(storage: ExpansionStorage, scopedKey: string): ExpansionScopedStorage {
  if (!scopedKey.startsWith(`${EXPANSION_STORAGE_KEY}:`) ||
    !/^(guest|account:.+)$/.test(scopedKey.slice(EXPANSION_STORAGE_KEY.length + 1))) {
    throw new Error("Expansion practice requires an account-scoped or guest storage key.");
  }
  function assertBase(key: string) {
    if (key !== EXPANSION_STORAGE_KEY) throw new Error("Unexpected expansion progress storage key.");
  }
  return Object.freeze({
    key: scopedKey,
    getItem(key: string) { assertBase(key); return storage.getItem(scopedKey); },
    setItem(key: string, value: string) { assertBase(key); storage.setItem(scopedKey, value); },
  });
}
export type ExpansionStorageResult = {
  status: "ready" | "unavailable" | "invalid";
  progress: ExpansionProgress;
};

export function emptyExpansionProgress(): ExpansionProgress {
  return { version: 1, items: {} };
}
function emptyTrack(): ExpansionReviewTrack {
  return { attempts: 0, successes: 0, lastReviewedAt: 0, dueAt: 0, intervalDays: 0 };
}
function emptyItem(): ExpansionItemProgress {
  return { recall: emptyTrack(), recognition: emptyTrack(), bookmarked: false,
    bookmarkUpdatedAt: 0, note: "", noteUpdatedAt: 0 };
}
function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function validId(id: string): boolean {
  return /^[a-zA-Z0-9:_-]{1,160}$/.test(id) && !["__proto__", "prototype", "constructor"].includes(id);
}
function validTrack(value: unknown): value is ExpansionReviewTrack {
  if (!(object(value) && integer(value.attempts) && integer(value.successes) &&
    value.successes <= value.attempts && integer(value.lastReviewedAt) && integer(value.dueAt) &&
    integer(value.intervalDays) && value.intervalDays <= 30)) return false;
  const counts = (raw: unknown) => object(raw) && integer(raw.attempts) && integer(raw.successes) && raw.successes <= raw.attempts;
  if (value.base !== undefined && !counts(value.base)) return false;
  if (value.devices !== undefined && (!object(value.devices) || Object.keys(value.devices).length > 2000 ||
    Object.entries(value.devices).some(([id, raw]) => !validId(id) || !counts(raw)))) return false;
  if ((value.base === undefined) !== (value.devices === undefined)) return false;
  if (object(value.devices) && object(value.base)) {
    const sums = Object.values(value.devices).reduce<{ attempts: number; successes: number }>((sum, raw) => {
      const item = raw as { attempts: number; successes: number };
      return { attempts: sum.attempts + item.attempts, successes: sum.successes + item.successes };
    }, { attempts: value.base.attempts as number, successes: value.base.successes as number });
    if (!integer(sums.attempts) || !integer(sums.successes) || sums.attempts !== value.attempts || sums.successes !== value.successes) return false;
  }
  return true;
}

/** Never silently replace malformed data or an unknown future schema. */
export function parseExpansionProgress(value: unknown): ExpansionProgress | null {
  if (!object(value) || value.version !== 1 || !object(value.items)) return null;
  const entries = Object.entries(value.items);
  if (entries.length > 20_000) return null;
  const items: ExpansionProgress["items"] = {};
  for (const [id, item] of entries) {
    if (!validId(id) || !object(item) || !validTrack(item.recall) || !validTrack(item.recognition) ||
      typeof item.bookmarked !== "boolean" || !integer(item.bookmarkUpdatedAt) ||
      typeof item.note !== "string" || item.note.length > EXPANSION_NOTE_LIMIT || !integer(item.noteUpdatedAt)) return null;
    items[id] = { recall: { ...item.recall }, recognition: { ...item.recognition },
      bookmarked: item.bookmarked, bookmarkUpdatedAt: item.bookmarkUpdatedAt,
      note: item.note, noteUpdatedAt: item.noteUpdatedAt };
  }
  return { version: 1, items };
}

export function loadExpansionProgress(storage: ExpansionStorage): ExpansionStorageResult {
  try {
    const raw = storage.getItem(EXPANSION_STORAGE_KEY);
    if (!raw) return { status: "ready", progress: emptyExpansionProgress() };
    const parsed = parseExpansionProgress(JSON.parse(raw));
    return { status: parsed ? "ready" : "invalid", progress: parsed ?? emptyExpansionProgress() };
  } catch (error) {
    return { status: error instanceof SyntaxError ? "invalid" : "unavailable", progress: emptyExpansionProgress() };
  }
}

/** Merge each skill and notebook field independently so a bookmark cannot erase a review. */
export function mergeExpansionProgress(a: ExpansionProgress, b: ExpansionProgress): ExpansionProgress {
  const items: ExpansionProgress["items"] = { ...a.items };
  for (const [id, next] of Object.entries(b.items)) {
    const previous = items[id];
    if (!previous) { items[id] = next; continue; }
    const track = (skill: ExpansionSkill) => mergeExpansionTrack(previous[skill], next[skill]);
    const bookmark = next.bookmarkUpdatedAt > previous.bookmarkUpdatedAt ||
      next.bookmarkUpdatedAt === previous.bookmarkUpdatedAt && Number(next.bookmarked) > Number(previous.bookmarked) ? next : previous;
    const note = next.noteUpdatedAt > previous.noteUpdatedAt ||
      next.noteUpdatedAt === previous.noteUpdatedAt && next.note > previous.note ? next : previous;
    items[id] = { recall: track("recall"), recognition: track("recognition"), bookmarked: bookmark.bookmarked,
      bookmarkUpdatedAt: bookmark.bookmarkUpdatedAt, note: note.note, noteUpdatedAt: note.noteUpdatedAt };
  }
  return { version: 1, items };
}

function mergeExpansionTrack(a: ExpansionReviewTrack, b: ExpansionReviewTrack): ExpansionReviewTrack {
  const latest = b.lastReviewedAt > a.lastReviewedAt || b.lastReviewedAt === a.lastReviewedAt &&
    (b.dueAt < a.dueAt || b.dueAt === a.dueAt && b.intervalDays < a.intervalDays) ? b : a;
  if (!a.devices && !b.devices) return { ...latest, attempts: Math.max(a.attempts, b.attempts), successes: Math.max(a.successes, b.successes) };
  const devices: NonNullable<ExpansionReviewTrack["devices"]> = {};
  for (const id of new Set([...Object.keys(a.devices ?? {}), ...Object.keys(b.devices ?? {})])) {
    const x = a.devices?.[id], y = b.devices?.[id];
    devices[id] = { attempts: Math.max(x?.attempts ?? 0, y?.attempts ?? 0), successes: Math.max(x?.successes ?? 0, y?.successes ?? 0) };
  }
  const sums = Object.values(devices).reduce((sum, counts) => ({ attempts: sum.attempts + counts.attempts, successes: sum.successes + counts.successes }), { attempts: 0, successes: 0 });
  const successes = Math.max(a.base?.successes ?? (a.devices ? 0 : Math.max(0, a.successes - sums.successes)), b.base?.successes ?? (b.devices ? 0 : Math.max(0, b.successes - sums.successes)));
  const attempts = Math.max(successes, a.base?.attempts ?? (a.devices ? 0 : Math.max(0, a.attempts - sums.attempts)), b.base?.attempts ?? (b.devices ? 0 : Math.max(0, b.attempts - sums.attempts)));
  return { ...latest, attempts: attempts + sums.attempts, successes: successes + sums.successes, base: { attempts, successes }, devices };
}

export function saveExpansionProgress(storage: ExpansionStorage, progress: ExpansionProgress): ExpansionStorageResult {
  const current = loadExpansionProgress(storage);
  if (current.status !== "ready") return { status: current.status, progress };
  if (!parseExpansionProgress(progress)) return { status: "invalid", progress };
  const merged = mergeExpansionProgress(current.progress, progress);
  try {
    storage.setItem(EXPANSION_STORAGE_KEY, JSON.stringify(merged));
    return { status: "ready", progress: merged };
  } catch { return { status: "unavailable", progress }; }
}

export function recordExpansionReview(progress: ExpansionProgress, id: string, skill: ExpansionSkill,
  success: boolean, at: number, writerId?: string): ExpansionProgress {
  if (!validId(id) || !integer(at) || writerId !== undefined && !validId(writerId)) return progress;
  const item = progress.items[id] ?? emptyItem();
  const previous = item[skill];
  // Quick repetition does not earn a longer interval or imply lasting mastery.
  const advance = !previous.lastReviewedAt || at - previous.lastReviewedAt >= DAY;
  const intervalDays = success ? advance ? Math.min(30, previous.intervalDays ? previous.intervalDays * 2 + 1 : 1)
    : Math.max(1, previous.intervalDays) : 0;
  let review: ExpansionReviewTrack = { attempts: previous.attempts + 1, successes: previous.successes + Number(success),
    lastReviewedAt: at, dueAt: at + (success ? intervalDays * DAY : 60_000), intervalDays };
  if (writerId) {
    const base = previous.base ?? { attempts: previous.attempts, successes: previous.successes };
    const devices = { ...previous.devices }, counts = devices[writerId] ?? { attempts: 0, successes: 0 };
    devices[writerId] = { attempts: counts.attempts + 1, successes: counts.successes + Number(success) };
    const totals = Object.values(devices).reduce((sum, item) => ({ attempts: sum.attempts + item.attempts, successes: sum.successes + item.successes }), { ...base });
    review = { ...review, ...totals, base, devices };
  }
  return { version: 1, items: { ...progress.items, [id]: { ...item, [skill]: review } } };
}

export function updateExpansionNotebook(progress: ExpansionProgress, id: string,
  update: { bookmarked?: boolean; note?: string }, at: number): ExpansionProgress {
  if (!validId(id) || !integer(at)) return progress;
  const item = progress.items[id] ?? emptyItem();
  const bookmarkAt = Math.max(at, item.bookmarkUpdatedAt + 1), noteAt = Math.max(at, item.noteUpdatedAt + 1);
  if (update.bookmarked !== undefined && !integer(bookmarkAt) || update.note !== undefined && !integer(noteAt)) return progress;
  return { version: 1, items: { ...progress.items, [id]: { ...item,
    ...(update.bookmarked === undefined ? {} : { bookmarked: update.bookmarked, bookmarkUpdatedAt: bookmarkAt }),
    ...(update.note === undefined ? {} : { note: update.note.slice(0, EXPANSION_NOTE_LIMIT), noteUpdatedAt: noteAt }),
  } } };
}

export function selectExpansionReview(entries: readonly ExpansionPracticeEntry[], progress: ExpansionProgress,
  skill: ExpansionSkill, now: number, limit = 8): ExpansionPracticeEntry[] {
  return entries.filter((entry) => (progress.items[entry.id]?.[skill].dueAt ?? 0) <= now)
    .sort((a, b) => {
      const x = progress.items[a.id]?.[skill], y = progress.items[b.id]?.[skill];
      // Revisit known due entries before introducing more entries.
      if (Boolean(x?.attempts) !== Boolean(y?.attempts)) return x?.attempts ? -1 : 1;
      // Source recordings support a stronger first encounter; due reviews keep
      // their original date priority regardless of whether audio is available.
      if (!x?.attempts && !y?.attempts) {
        const audioA = a.audioKind === "source-recording" && Boolean(a.audioUrl);
        const audioB = b.audioKind === "source-recording" && Boolean(b.audioUrl);
        if (audioA !== audioB) return audioA ? -1 : 1;
      }
      return (x?.dueAt ?? 0) - (y?.dueAt ?? 0) || a.id.localeCompare(b.id);
    }).slice(0, Math.max(0, limit));
}

export function expansionMeaning(entry: ExpansionPracticeEntry, locale: AppLocale): string {
  return locale === "es" ? entry.meaningEs : entry.meaningEn;
}
function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
const GLOSS_STOP_WORDS = new Set(["a", "an", "the", "to", "of", "for", "one", "s", "el", "la", "los", "las", "un", "una", "de", "del", "para", "se"]);
function glossTokens(value: string): Set<string> {
  return new Set(normalized(value).split(" ").filter((token) => token && !GLOSS_STOP_WORDS.has(token)));
}
function hash(value: string): number {
  let result = 2166136261;
  for (const letter of value) result = Math.imul(result ^ letter.charCodeAt(0), 16777619);
  return result >>> 0;
}
export interface ExpansionRecognitionChoice { id: string; meaning: string; correct: boolean }

/** Only distinct source glosses of the same part of speech; homographs and
 * overlapping glosses fall back to recall rather than teaching a false contrast. */
export function expansionRecognitionChoices(entry: ExpansionPracticeEntry,
  entries: readonly ExpansionPracticeEntry[], locale: AppLocale): ExpansionRecognitionChoice[] {
  if (entries.some((other) => other.id !== entry.id && normalized(other.display) === normalized(entry.display) &&
    normalized(expansionMeaning(other, locale)) !== normalized(expansionMeaning(entry, locale)))) return [];
  const meaning = expansionMeaning(entry, locale);
  const tokens = glossTokens(meaning);
  if (!tokens.size) return [];
  const seen = new Set([normalized(meaning)]);
  const candidates = entries.filter((other) => other.id !== entry.id &&
    normalized(other.display) !== normalized(entry.display) && other.partOfSpeech === entry.partOfSpeech)
    .sort((a, b) => hash(`${entry.id}:${a.id}`) - hash(`${entry.id}:${b.id}`));
  const choices: ExpansionRecognitionChoice[] = [{ id: entry.id, meaning, correct: true }];
  for (const candidate of candidates) {
    const label = expansionMeaning(candidate, locale), key = normalized(label);
    const candidateTokens = glossTokens(label);
    if (!candidateTokens.size || seen.has(key) || [...candidateTokens].some((token) => tokens.has(token))) continue;
    seen.add(key);
    choices.push({ id: candidate.id, meaning: label, correct: false });
    if (choices.length === 4) break;
  }
  if (choices.length < 3) return [];
  return choices.sort((a, b) => hash(`${entry.id}:answer:${a.id}`) - hash(`${entry.id}:answer:${b.id}`));
}
