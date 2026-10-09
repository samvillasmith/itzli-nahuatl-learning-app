import { createRequire } from "node:module";
import { beforeEach, describe, expect, it, vi } from "vitest";
import catalog from "../src/data/reviewed-tutor-context.json";
import { createReviewedTutorGate } from "../src/lib/reviewed-tutor-gate.cjs";

const mocks = vi.hoisted(() => ({ rows: [] as Array<Record<string, unknown>>, sql: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/neon", () => ({ getSql: () => mocks.sql }));
vi.mock("openai", () => ({ default: class {
  embeddings = { create: vi.fn(async () => ({ data: [{ embedding: [0.1, 0.2] }] })) };
} }));

import { formatRetrieved, retrieve } from "../src/lib/rag";

const require = createRequire(import.meta.url);
const { prepareReviewedTutorContext } = require("../scripts/prepare-reviewed-tutor-context.cjs") as {
  prepareReviewedTutorContext: (options: { check: boolean }) => typeof catalog;
};
const seed = catalog.seeds.find(chunk => chunk.kind === "phrase")!;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

beforeEach(() => {
  mocks.rows = [];
  mocks.sql.mockReset().mockImplementation(async () => mocks.rows);
});

describe("reviewed local tutor context release gate", () => {
  it("checks current course-only seeds offline and preserves source notices", () => {
    const current = prepareReviewedTutorContext({ check: true });
    expect(current.seeds.length).toBeGreaterThan(100);
    expect(current.notice.authors).toHaveLength(5);
    expect(current.notice.sourceLicense).toContain("version unspecified");
    expect(current.notice.contributionLicense).toBe("CC BY-SA 4.0");
    expect(current.seeds.some(chunk => chunk.kind === "morphology")).toBe(false);
  });

  it("accepts exact content and provenance independent of JSON object key order", () => {
    const select = createReviewedTutorGate(catalog.seeds);
    const reversedMetadata = Object.fromEntries(Object.entries(seed.metadata).reverse());
    expect(select({ ...seed, metadata: reversedMetadata })).toEqual({
      kind: seed.kind, content: seed.content, metadata: seed.metadata,
    });
  });

  it("withholds stale edits, spoofed identities, missing notices and added prose", () => {
    const select = createReviewedTutorGate(catalog.seeds);
    const changedIdentity = { ...seed, metadata: { ...seed.metadata, phrase: "unreviewed" } };
    const missingSource = clone(seed);
    delete (missingSource.metadata as Record<string, unknown>).source_urls;
    for (const candidate of [
      { ...seed, content: `${seed.content} Added unreviewed dictionary explanation.` },
      { ...seed, content: seed.content.replace(" — ", " = ") },
      { ...seed, kind: "morphology" },
      changedIdentity,
      missingSource,
      { ...seed, metadata: { ...seed.metadata, source_license: "CC BY-SA 4.0" } },
      { ...seed, metadata: { ...seed.metadata, review_status: "approved", sha256: seed.sha256 } },
      { kind: "phrase", content: "Unreviewed remote book paragraph", metadata: { id: seed.sha256 } },
      null,
    ]) expect(select(candidate)).toBeNull();
  });

  it("filters both remote retrieval paths and returns only locally reviewed fields", async () => {
    mocks.rows = [
      { kind: "phrase", content: "Old remote dictionary prose", metadata: seed.metadata, distance: 0 },
      { ...seed, distance: 0.4, remote_payload: "Do not pass this through" },
      { ...seed, metadata: { ...seed.metadata, source_urls: ["https://example.org/unreviewed"] }, distance: 0 },
    ];
    const chunks = await retrieve("hello");
    expect(mocks.sql).toHaveBeenCalledTimes(2);
    expect(chunks).toEqual([{ kind: seed.kind, content: seed.content, metadata: seed.metadata, distance: 0 }]);
    expect(chunks[0]).not.toHaveProperty("remote_payload");
    expect(formatRetrieved(chunks)).not.toContain("Old remote dictionary prose");
  });

  it("uses the empty-context fallback when all remote results are unreviewed", async () => {
    mocks.rows = [{ kind: "grammar", content: "Old unreviewed source explanation", metadata: {}, distance: 0 }];
    expect(await retrieve("hello")).toEqual([]);
    expect(formatRetrieved([{ kind: "grammar", content: "Old unreviewed source explanation", metadata: {}, distance: 0 }])).toBe("");
  });

  it("does not expose mutable reviewed catalog objects to callers", () => {
    const select = createReviewedTutorGate(catalog.seeds);
    const first = select(seed)!;
    first.metadata.source_license = "changed";
    expect(select(seed)!.metadata).toEqual(seed.metadata);
  });
});
