import { describe, expect, it } from "vitest";
import { mergeExpansionCourseProgress, parseExpansionCourseState } from "../src/lib/expansion-course";
import { emptyExpansionProgress, mergeExpansionProgress, parseExpansionProgress, recordExpansionReview, updateExpansionNotebook } from "../src/lib/expansion-practice";
import { emptyExpansionSyncState, expansionSyncContains, mergeExpansionSyncState, parseExpansionSyncState } from "../src/lib/expansion-sync-schema";
import { emptySrs, parseSrsData } from "../src/lib/progress-schema";
import { mergeSrsData } from "../src/lib/progress-merge";

const course = (id: string, at = 100, revision = "reference-v1") => ({ schemaVersion: 1 as const, units: { [id]: { completedAt: at, firstAttemptCorrect: 2, total: 3, lessonRevision: revision } } });
describe("V3 cloud extension of existing v2 SRS records", () => {
  it("round-trips completions, both practice skills and vocabulary notebook without changing v2", () => {
    let practice = recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", true, 100, "device-a");
    practice = recordExpansionReview(practice, "word-1", "recognition", false, 200, "device-a");
    practice = updateExpansionNotebook(practice, "word-1", { bookmarked: true, note: "Remember this meaning" }, 300);
    const srs = { ...emptySrs(), words: { "1:v:35": { correct: 4, total: 5 } }, expansion: { ...emptyExpansionSyncState(), course: course("v3-first"), practice } };
    expect(parseSrsData(JSON.parse(JSON.stringify(srs)))).toEqual(srs);
    expect(srs.version).toBe(2);
  });

  it("preserves every earned lesson from two devices and both revision results", () => {
    const a = course("v3-first", 100), b = course("v3-second", 200);
    const merged = mergeExpansionCourseProgress(a, b);
    expect(Object.keys(merged.units).sort()).toEqual(["v3-first", "v3-second"]);
    expect(mergeExpansionCourseProgress(merged, a)).toEqual(merged);
    const revised = mergeExpansionCourseProgress(merged, course("v3-first", 300, "v3-scene-1"));
    expect(revised.units["v3-first"]).toMatchObject({ lessonRevision: "v3-scene-1", priorResults: [a.units["v3-first"]] });
    expect(parseExpansionCourseState(revised)).toEqual(revised);
  });

  it("does not erase V3 state when an old v2 client omits the new field", () => {
    const expansion = { ...emptyExpansionSyncState(), course: course("v3-first") };
    expect(mergeSrsData({ ...emptySrs(), expansion }, emptySrs()).expansion).toEqual(expansion);
    expect(mergeSrsData(emptySrs(), { ...emptySrs(), expansion }).expansion).toEqual(expansion);
  });

  it("adds concurrent same-skill attempts once, including an inherited pre-sync baseline", () => {
    const inherited = recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", true, 50);
    const a = recordExpansionReview(inherited, "word-1", "recall", true, 100, "device-a");
    const b = recordExpansionReview(inherited, "word-1", "recall", false, 100, "device-b");
    const merged = mergeExpansionProgress(a, b);
    expect(merged.items["word-1"].recall).toMatchObject({ attempts: 3, successes: 2, base: { attempts: 1, successes: 1 } });
    expect(mergeExpansionProgress(merged, a)).toEqual(merged);
    expect(mergeExpansionProgress(a, b)).toEqual(mergeExpansionProgress(b, a));
    expect(parseExpansionProgress(merged)).toEqual(merged);
  });

  it("merges independently edited review skills, bookmarks and notes", () => {
    const a = recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", true, 100, "device-a");
    let b = recordExpansionReview(emptyExpansionProgress(), "word-1", "recognition", false, 200, "device-b");
    b = updateExpansionNotebook(b, "word-1", { bookmarked: true, note: "From device B" }, 300);
    const merged = mergeExpansionProgress(a, b).items["word-1"];
    expect(merged.recall.attempts).toBe(1); expect(merged.recognition.attempts).toBe(1);
    expect(merged.bookmarked).toBe(true); expect(merged.note).toBe("From device B");
  });

  it("preserves explicit notebook clearing and unbookmarking even in the same millisecond", () => {
    const first = updateExpansionNotebook(emptyExpansionProgress(), "word-1", { bookmarked: true, note: "Keep" }, 100);
    const cleared = updateExpansionNotebook(first, "word-1", { bookmarked: false, note: "" }, 100);
    const merged = mergeExpansionProgress(first, cleared);
    expect(merged.items["word-1"]).toMatchObject({ bookmarked: false, note: "", bookmarkUpdatedAt: 101, noteUpdatedAt: 101 });
  });

  it("acknowledges only a server union that includes submitted earned work", () => {
    const submitted = { ...emptyExpansionSyncState(), course: course("v3-first") };
    expect(expansionSyncContains(emptyExpansionSyncState(), submitted)).toBe(false);
    const remote = { ...emptyExpansionSyncState(), course: course("v3-second") };
    expect(expansionSyncContains(mergeExpansionSyncState(remote, submitted), submitted)).toBe(true);
    expect(expansionSyncContains(submitted, submitted)).toBe(true);
  });

  it("bounds IDs, completions, timestamps, histories and unknown future schemas", () => {
    expect(parseExpansionSyncState({ ...emptyExpansionSyncState(), version: 2 })).toBeNull();
    expect(parseExpansionCourseState(course(`v3-${"x".repeat(158)}`))).toBeNull();
    expect(parseExpansionCourseState(course("v3-first", Number.MAX_SAFE_INTEGER + 1))).toBeNull();
    expect(parseExpansionCourseState({ schemaVersion: 1, units: Object.fromEntries(Array.from({ length: 1001 }, (_, n) => [`v3-${n}`, course("v3-first").units["v3-first"]])) })).toBeNull();
    const malformed = { ...course("v3-first"), units: { "v3-first": { ...course("v3-first").units["v3-first"], priorResults: Array(11).fill(course("v3-first").units["v3-first"]) } } };
    expect(parseExpansionCourseState(malformed)).toBeNull();
  });

  it("rejects malformed optional state and inconsistent device counters as a whole", () => {
    expect(parseSrsData({ ...emptySrs(), expansion: { version: 1, course: null, practice: emptyExpansionProgress() } })).toBeNull();
    const practice = recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", true, 100, "device-a");
    practice.items["word-1"].recall.attempts = 5;
    expect(parseExpansionProgress(practice)).toBeNull();
    const malicious = JSON.parse('{"version":1,"items":{"__proto__":{}}}');
    expect(parseExpansionProgress(malicious)).toBeNull();
  });
});
