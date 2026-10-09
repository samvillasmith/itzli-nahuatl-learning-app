import { describe, expect, it } from "vitest";
import {
  EXPANSION_STORAGE_KEY, createExpansionStorageAdapter, emptyExpansionProgress, expansionRecognitionChoices, loadExpansionProgress,
  isExpansionBuildingBlock, mergeExpansionProgress, parseExpansionProgress, recordExpansionReview, saveExpansionProgress,
  selectExpansionReview, updateExpansionNotebook, type ExpansionPracticeEntry,
} from "../src/lib/expansion-practice";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;
function entry(id: string, display: string, meaningEn: string, meaningEs = meaningEn): ExpansionPracticeEntry {
  return { id, display, meaningEn, meaningEs, partOfSpeech: "noun", sourceUrl: "https://example.org/evidence", audioKind: "none" };
}
const entries = [entry("exp:a", "a", "water", "agua"), entry("exp:b", "b", "house", "casa"),
  entry("exp:c", "c", "flower", "flor"), entry("exp:d", "d", "cloud", "nube")];

it("keeps dependent reference forms in building blocks and complete possessed words in expression practice", () => {
  for (const formKind of ["dependent-reference-form", "relational-reference-form", "bound-stem", "possessed-stem", "relational-base", "possessed-noun-reference"]) {
    expect(isExpansionBuildingBlock({ formKind })).toBe(true);
  }
  for (const formKind of ["lexical-headword", "possessed-form", "rule-composed-possessed-form", "multiword-expression", undefined]) {
    expect(isExpansionBuildingBlock({ formKind })).toBe(false);
  }
});
function storage(initial?: string) {
  const values = new Map<string, string>(initial ? [[EXPANSION_STORAGE_KEY, initial]] : []);
  const touched: string[] = [];
  return { values, touched, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { touched.push(key); values.set(key, value); } };
}

describe("expansion progress isolation and recovery", () => {
  it("isolates account A, account B, local review and guest without adopting an unowned blob", () => {
    const unowned = recordExpansionReview(emptyExpansionProgress(), "exp:unowned", "recall", true, NOW);
    const store = storage(JSON.stringify(unowned));
    store.values.set("itzli_progress_v2", "existing-course-history");
    store.values.set("itzli_srs_v2", "existing-review-history");
    const accounts = ["account:A", "account:B", "account:local-review", "guest"];
    const adapters = accounts.map(scope => createExpansionStorageAdapter(store, `${EXPANSION_STORAGE_KEY}:${scope}`));
    for (const adapter of adapters) expect(loadExpansionProgress(adapter).progress).toEqual(emptyExpansionProgress());
    adapters.forEach((adapter, index) => {
      const progress = updateExpansionNotebook(recordExpansionReview(emptyExpansionProgress(), `exp:learner-${index}`,
        "recall", true, NOW), `exp:learner-${index}`, { bookmarked: true, note: `Only learner ${index}` }, NOW + 1);
      expect(saveExpansionProgress(adapter, progress).status).toBe("ready");
    });
    adapters.forEach((adapter, index) => {
      const saved = loadExpansionProgress(adapter).progress;
      expect(Object.keys(saved.items)).toEqual([`exp:learner-${index}`]);
      expect(saved.items[`exp:learner-${index}`].note).toBe(`Only learner ${index}`);
      expect(adapter.key).toBe(`${EXPANSION_STORAGE_KEY}:${accounts[index]}`);
    });
    expect(store.touched).toEqual(adapters.map(adapter => adapter.key));
    expect(store.values.get(EXPANSION_STORAGE_KEY)).toBe(JSON.stringify(unowned));
    expect(store.values.get("itzli_progress_v2")).toBe("existing-course-history");
    expect(store.values.get("itzli_srs_v2")).toBe("existing-review-history");
  });

  it("holds invalid data only for its owner and leaves another account available", () => {
    const store = storage();
    const a = createExpansionStorageAdapter(store, `${EXPANSION_STORAGE_KEY}:account:A`);
    const b = createExpansionStorageAdapter(store, `${EXPANSION_STORAGE_KEY}:account:B`);
    store.values.set(a.key, "{broken");
    expect(saveExpansionProgress(a, emptyExpansionProgress()).status).toBe("invalid");
    expect(store.values.get(a.key)).toBe("{broken");
    expect(saveExpansionProgress(b, recordExpansionReview(emptyExpansionProgress(), entries[0].id, "recall", true, NOW)).status).toBe("ready");
    expect(loadExpansionProgress(b).progress.items[entries[0].id].recall.successes).toBe(1);
    expect(store.touched).toEqual([b.key]);
  });

  it("refuses an unscoped or unrelated key and cannot operate on legacy stores", () => {
    const store = storage();
    for (const key of [EXPANSION_STORAGE_KEY, `${EXPANSION_STORAGE_KEY}:account:`, "itzli_progress_v2:account:A"])
      expect(() => createExpansionStorageAdapter(store, key)).toThrow();
    const scoped = createExpansionStorageAdapter(store, `${EXPANSION_STORAGE_KEY}:account:A`);
    expect(() => scoped.getItem("itzli_srs_v2")).toThrow();
    expect(() => scoped.setItem("itzli_progress_v2", "overwrite")).toThrow();
    expect(store.values.size).toBe(0);
    expect(store.touched).toEqual([]);
  });

  it("writes only its versioned key and leaves legacy learner progress untouched", () => {
    const store = storage();
    store.values.set("itzli_learning_v1", "existing-user-learning");
    store.values.set("itzli_srs_v2", "existing-user-reviews");
    const reviewed = recordExpansionReview(emptyExpansionProgress(), entries[0].id, "recall", true, NOW);
    expect(saveExpansionProgress(store, reviewed).status).toBe("ready");
    expect(store.touched).toEqual([EXPANSION_STORAGE_KEY]);
    expect(store.values.get("itzli_learning_v1")).toBe("existing-user-learning");
    expect(store.values.get("itzli_srs_v2")).toBe("existing-user-reviews");
    expect(loadExpansionProgress(store).progress.items[entries[0].id].recall.successes).toBe(1);
  });

  it.each(["{broken", JSON.stringify({ version: 2, items: {} })])("keeps invalid or future-version data intact: %s", (raw) => {
    const store = storage(raw);
    expect(loadExpansionProgress(store).status).toBe("invalid");
    expect(saveExpansionProgress(store, emptyExpansionProgress()).status).toBe("invalid");
    expect(store.values.get(EXPANSION_STORAGE_KEY)).toBe(raw);
    expect(store.touched).toEqual([]);
  });

  it("retains unsaved reviews after a quota failure and supports a successful retry", () => {
    const store = storage();
    let blocked = true;
    const limited = { getItem: store.getItem, setItem: (key: string, value: string) => {
      if (blocked) throw new Error("quota");
      store.setItem(key, value);
    } };
    const reviewed = recordExpansionReview(emptyExpansionProgress(), entries[0].id, "recall", false, NOW);
    const failed = saveExpansionProgress(limited, reviewed);
    expect(failed.status).toBe("unavailable");
    expect(failed.progress).toEqual(reviewed);
    blocked = false;
    expect(saveExpansionProgress(limited, failed.progress).status).toBe("ready");
    expect(loadExpansionProgress(store).progress.items[entries[0].id].recall.attempts).toBe(1);
  });

  it("refuses unsafe identifiers and inconsistent counts without discarding known records", () => {
    const progress = recordExpansionReview(emptyExpansionProgress(), "__proto__", "recall", true, NOW);
    expect(progress).toEqual(emptyExpansionProgress());
    const reviewed = recordExpansionReview(progress, entries[0].id, "recall", true, NOW);
    reviewed.items[entries[0].id].recall.successes = 2;
    expect(parseExpansionProgress(reviewed)).toBeNull();
  });

  it("merges bookmark and notebook changes independently from recall and recognition", () => {
    const recalled = recordExpansionReview(emptyExpansionProgress(), entries[0].id, "recall", true, NOW);
    let notebook = updateExpansionNotebook(emptyExpansionProgress(), entries[0].id, { bookmarked: true, note: "Use tomorrow" }, NOW + 1);
    notebook = recordExpansionReview(notebook, entries[0].id, "recognition", true, NOW + 2);
    const merged = mergeExpansionProgress(recalled, notebook).items[entries[0].id];
    expect(merged.recall.attempts).toBe(1);
    expect(merged.recognition.attempts).toBe(1);
    expect(merged.bookmarked).toBe(true);
    expect(merged.note).toBe("Use tomorrow");
    const removed = updateExpansionNotebook(notebook, entries[0].id, { bookmarked: false, note: "" }, NOW + 3);
    const latest = mergeExpansionProgress(mergeExpansionProgress(recalled, notebook), removed).items[entries[0].id];
    expect(latest.bookmarked).toBe(false);
    expect(latest.note).toBe("");
    expect(latest.recall.attempts).toBe(1);
  });
});

describe("expansion scheduled recall", () => {
  it("prefers source audio only for new words while keeping known due reviews first and in date order", () => {
    const recorded: ExpansionPracticeEntry = { ...entry("exp:z-recorded", "z", "tree", "árbol"),
      audioUrl: "https://example.org/source-tree.mp3", audioKind: "source-recording" };
    const catalogue = [...entries, recorded];
    expect(selectExpansionReview(catalogue, emptyExpansionProgress(), "recall", NOW)[0].id).toBe(recorded.id);
    let progress = recordExpansionReview(emptyExpansionProgress(), entries[0].id, "recall", false, NOW - DAY);
    expect(selectExpansionReview(catalogue, progress, "recall", NOW).slice(0, 2).map(item => item.id))
      .toEqual([entries[0].id, recorded.id]);
    progress = recordExpansionReview(progress, recorded.id, "recall", false, NOW - DAY + 1000);
    expect(selectExpansionReview(catalogue, progress, "recall", NOW).slice(0, 2).map(item => item.id))
      .toEqual([entries[0].id, recorded.id]);
  });

  it("separates recognition from recalled production and schedules failed recall shortly", () => {
    let progress = recordExpansionReview(emptyExpansionProgress(), entries[0].id, "recognition", true, NOW);
    expect(progress.items[entries[0].id].recall.attempts).toBe(0);
    progress = recordExpansionReview(progress, entries[0].id, "recall", false, NOW);
    expect(progress.items[entries[0].id].recall.dueAt).toBe(NOW + 60_000);
    expect(selectExpansionReview(entries, progress, "recall", NOW).map((item) => item.id)).not.toContain(entries[0].id);
    expect(selectExpansionReview(entries, progress, "recall", NOW + 60_000)[0].id).toBe(entries[0].id);
  });

  it("requires spaced practice before extending the review interval", () => {
    let progress = recordExpansionReview(emptyExpansionProgress(), entries[0].id, "recall", true, NOW);
    expect(progress.items[entries[0].id].recall.intervalDays).toBe(1);
    progress = recordExpansionReview(progress, entries[0].id, "recall", true, NOW + 1000);
    expect(progress.items[entries[0].id].recall.intervalDays).toBe(1);
    progress = recordExpansionReview(progress, entries[0].id, "recall", true, NOW + DAY + 1000);
    expect(progress.items[entries[0].id].recall.intervalDays).toBe(3);
    progress = recordExpansionReview(progress, entries[0].id, "recall", false, NOW + 4 * DAY);
    expect(progress.items[entries[0].id].recall.intervalDays).toBe(0);
  });

  it("handles an empty accepted catalogue and bounds sessions", () => {
    expect(selectExpansionReview([], emptyExpansionProgress(), "recall", NOW)).toEqual([]);
    expect(selectExpansionReview(entries, emptyExpansionProgress(), "recall", NOW, 2)).toHaveLength(2);
    expect(selectExpansionReview(entries, emptyExpansionProgress(), "recall", NOW, -1)).toEqual([]);
  });
});

describe("meaning-specific recognition", () => {
  it("uses learner locale and exactly one source-gloss answer", () => {
    const options = expansionRecognitionChoices(entries[0], entries, "es");
    expect(options).toHaveLength(4);
    expect(options.filter((option) => option.correct)).toEqual([{ id: "exp:a", meaning: "agua", correct: true }]);
    expect(options.some((option) => option.meaning === "water")).toBe(false);
    expect(expansionRecognitionChoices(entries[0], entries, "es")).toEqual(options);
  });

  it("declines a homograph with competing meanings rather than marking a valid sense wrong", () => {
    const ambiguous = [...entries, entry("exp:other-sense", entries[0].display, "river", "río")];
    expect(expansionRecognitionChoices(entries[0], ambiguous, "en")).toEqual([]);
  });

  it("excludes overlapping glosses, duplicates and different parts of speech", () => {
    const extra = [entry("exp:water2", "e", "drinking water", "agua potable"),
      entry("exp:water3", "f", "Water!", "Agua"),
      { ...entry("exp:verb", "g", "to swim", "nadar"), partOfSpeech: "verb" }];
    const options = expansionRecognitionChoices(entries[0], [...entries, ...extra], "en");
    expect(options.map((option) => option.id)).not.toContain("exp:water2");
    expect(options.map((option) => option.id)).not.toContain("exp:water3");
    expect(options.map((option) => option.id)).not.toContain("exp:verb");
    expect(expansionRecognitionChoices(entries[0], entries.slice(0, 2), "en")).toEqual([]);
  });
});
