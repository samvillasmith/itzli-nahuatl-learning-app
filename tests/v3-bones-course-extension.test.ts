import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import publishedCourseData from "../src/data/v3-original-course.json";

const require = createRequire(import.meta.url);
const fs = require("node:fs") as typeof import("node:fs");
type IdentifiedRecord = { id: string; [field: string]: unknown };
type Course = {
  units: Array<IdentifiedRecord & { steps: IdentifiedRecord[] }>;
  rules: IdentifiedRecord[];
  phrases: IdentifiedRecord[];
  sources: IdentifiedRecord[];
};
const { applyReviewedBonesExtension, EXPECTED } = require("../scripts/lib/v3-bones-course-extension.js") as {
  applyReviewedBonesExtension: (course: Course, paths: { root: string; research: string }) => {
    course: Course;
    evidence: Record<string, string | number>;
  };
  EXPECTED: Record<string, string>;
};
const root = fileURLToPath(new URL("../", import.meta.url));
const research = resolve(root, "data/research/yan-garcia-nhe-20261004/verification");
const baseFile = resolve(research, "curriculum-proposed-course.private.json");
const reviewedFiles = [
  ["main appendix", "curriculum-bones-extension.private.json"],
  ["main proposed course", "curriculum-bones-proposed.private.json"],
  ["main factual review", "curriculum-bones-source-facts.private.json"],
  ["main independent review", "curriculum-bones-main7-adversarial-review.private.json"],
  ["supplement appendix", "curriculum-bones-supplement.private.json"],
  ["supplement factual review", "curriculum-bones-supplement-facts.private.json"],
  ["supplement independent review", "curriculum-bones-supplement-adversarial-review.private.json"],
  ["combined proposed course", "curriculum-bones-combined-proposed.private.json"],
];
const hasPrivateFixtures = [baseFile, ...reviewedFiles.map(([, file]) => resolve(research, "grammar", file))]
  .every((file) => fs.existsSync(file));
const publishedCourse = publishedCourseData as Course;
let reviewedBase: Course;
const apply = (course = structuredClone(reviewedBase)) => applyReviewedBonesExtension(course, { root, research });

// Only overlay bytes in memory. The actual reviewed fixtures are never edited.
function overlayChangedBytes(file: string) {
  const readActual = fs.readFileSync;
  const changed = Buffer.concat([readActual(file), Buffer.from("\n")]);
  vi.spyOn(fs, "readFileSync").mockImplementation((requested) => {
    if (typeof requested === "string" && resolve(requested) === resolve(file)) return changed;
    return readActual(requested);
  });
}

afterEach(() => vi.restoreAllMocks());

describe("published V3 course invariants available in every checkout", () => {
  it("contains the reviewed 46 units, 37 cards, 219 phrase records and 379 tasks", () => {
    expect([publishedCourse.units.length, publishedCourse.rules.length, publishedCourse.phrases.length,
      publishedCourse.units.reduce((total, unit) => total + unit.steps.length, 0)])
      .toEqual([46, 37, 219, 379]);
  });

  it("retains known existing unit and task identities used by learner progress", () => {
    const stableTasks = [
      ["v3-meet-and-connect", ["name", "return", "origin", "answer-origin", "second-name", "name-not-location"]],
      ["v3-work-study", ["speaker", "listener", "third", "role", "nahuatl", "teach"]],
      ["v3-who-sees-whom", ["speaker-sees", "someone-sees-me", "listener-sees", "someone-sees-listener", "reverse", "role-transfer"]],
      ["v3-practical-arrival-and-posture", ["use-1", "use-2", "keep-roles", "use-3", "use-4", "use-5"]],
    ] as const;
    for (const [id, taskIds] of stableTasks) {
      const unit = publishedCourse.units.find((row) => row.id === id);
      expect(unit, id).toBeDefined();
      expect(unit?.steps.map((step) => step.id), `${id} progress tasks`).toEqual(taskIds);
    }
  });

  it("has no duplicate unit, rule, phrase, source or composite task identity", () => {
    for (const field of ["units", "rules", "phrases", "sources"] as const) {
      const ids = publishedCourse[field].map((row) => row.id);
      expect(new Set(ids).size, field).toBe(ids.length);
    }
    const taskIds = publishedCourse.units.flatMap((unit) => unit.steps.map((step) => `${unit.id}:${step.id}`));
    expect(new Set(taskIds).size).toBe(taskIds.length);
  });

  it("rejects a synthetic incorrect base before source or review data is loaded", () => {
    const read = vi.spyOn(fs, "readFileSync");
    expect(() => applyReviewedBonesExtension({ units: [], rules: [], phrases: [], sources: [] }, { root, research }))
      .toThrow();
    // Node may read the helper's JS while formatting an assertion stack trace.
    const dataReads = read.mock.calls.filter(([file]) => typeof file === "string" && file.endsWith(".json"));
    expect(dataReads).toEqual([]);
  });
});

// Private provenance fixtures stay local; CI still runs the public checks above.
describe.skipIf(!hasPrivateFixtures)("reviewed V3 bones extension preserves existing learner identities", () => {
  beforeEach(() => {
    reviewedBase = JSON.parse(fs.readFileSync(baseFile, "utf8")) as Course;
  });

  it("retains the complete earlier 37-unit course, including every task and source record", () => {
    const baseBytes = fs.readFileSync(baseFile);
    expect(createHash("sha256").update(baseBytes).digest("hex")).toBe(EXPECTED.base);
    expect(reviewedBase.units).toHaveLength(37);
    expect(reviewedBase.rules).toHaveLength(28);
    expect(reviewedBase.phrases).toHaveLength(176);
    const { course } = apply();
    for (const field of ["units", "rules", "phrases", "sources"] as const) {
      expect(course[field].slice(0, reviewedBase[field].length), field).toEqual(reviewedBase[field]);
      expect(course[field].slice(0, reviewedBase[field].length).map((row) => row.id), `${field} progress IDs`)
        .toEqual(reviewedBase[field].map((row) => row.id));
      expect(new Set(course[field].map((row) => row.id)).size, `${field} duplicate identities`)
        .toBe(course[field].length);
    }
    expect(course.units.slice(0, 37).flatMap((unit) => unit.steps.map((step) => `${unit.id}:${step.id}`)))
      .toEqual(reviewedBase.units.flatMap((unit) => unit.steps.map((step) => `${unit.id}:${step.id}`)));
  });

  it("adds exactly nine units and 70 tasks to reach the reviewed 46/37/219/379 result", () => {
    const { course, evidence } = apply();
    expect([course.units.length, course.rules.length, course.phrases.length,
      course.units.reduce((total, unit) => total + unit.steps.length, 0)])
      .toEqual([46, 37, 219, 379]);
    expect(course.units.slice(37).map((unit) => unit.id)).toEqual([
      "v3-bones-person", "v3-bones-respect", "v3-bones-degree", "v3-bones-time",
      "v3-bones-past-process", "v3-bones-human-objects", "v3-bones-community-exchange",
      "v3-bones-self-or-each-other", "v3-bones-imagine-an-action",
    ]);
    expect(evidence).toMatchObject({
      baseCourseSha256: EXPECTED.base, authoredMainSha256: EXPECTED.main,
      mainReviewSha256: EXPECTED.mainPeer, authoredSupplementSha256: EXPECTED.supplement,
      supplementReviewSha256: EXPECTED.supplementPeer, reviewedCombinedSha256: EXPECTED.combined,
      existingUnitsPreserved: 37, newUnits: 9, newTasks: 70, newPhraseRecords: 43,
    });
  });

  it("leaves the supplied base untouched and returns an independently editable result", () => {
    const input = structuredClone(reviewedBase);
    const before = structuredClone(input);
    const { course } = apply(input);
    expect(input).toEqual(before);
    course.units[0].steps[0].id = "changed-after-merge";
    course.rules[0].id = "changed-after-merge";
    course.phrases[0].id = "changed-after-merge";
    expect(input).toEqual(before);
    expect(apply().course.units[0]).toEqual(reviewedBase.units[0]);
  });

  it.each(["task progress ID", "rule content", "phrase content"] as const)(
    "rejects an altered base %s rather than silently replacing an earlier record", (change) => {
      const input = structuredClone(reviewedBase);
      if (change === "task progress ID") input.units[0].steps[0].id = "different-progress-id";
      if (change === "rule content") input.rules[0].title = { en: "Unreviewed explanation", es: "Sin revisión" };
      if (change === "phrase content") input.phrases[0].nahuatl = "Unreviewed written form";
      expect(() => apply(input)).toThrow();
    },
  );

  it.each(reviewedFiles)("rejects a changed %s hash even when the file remains valid JSON", (_kind, file) => {
    overlayChangedBytes(resolve(research, "grammar", file));
    expect(() => apply()).toThrow(`Changed bones source requires fresh review: ${file}`);
  });

  it("rejects changed licensed-source bytes before applying an otherwise reviewed extension", () => {
    overlayChangedBytes(resolve(root, "src/data/nahuatlahtolli-course.json"));
    expect(() => apply()).toThrow();
  });
});
