import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { resolveReadonlyCourseDbPath, dictionaryAuditScope, RELEASE_FILENAME, MASTER_FILENAME } = require("../scripts/lib/readonly-course-db.cjs");
const { sourceRows } = require("../scripts/lib/course-audio-inputs.js");

function fixture(run: (directory: string) => void) {
  const base = resolve("data");
  mkdirSync(base, { recursive: true });
  const directory = mkdtempSync(join(base, "readonly-course-test-"));
  try { run(directory); }
  finally {
    if (!resolve(directory).startsWith(base + sep)) throw new Error("Unsafe fixture cleanup");
    rmSync(directory, { recursive: true });
  }
}

describe("offline readonly course inputs", () => {
  it("uses the shipped release when the private master is absent, and prefers it when both exist", () => {
    fixture((root) => {
      const release = join(root, RELEASE_FILENAME);
      writeFileSync(release, "fixture");
      expect(resolveReadonlyCourseDbPath({ root, env: {} })).toBe(release);
      writeFileSync(join(root, MASTER_FILENAME), "private fixture");
      expect(resolveReadonlyCourseDbPath({ root, env: {} })).toBe(release);
    });
  });

  it("honors explicit research snapshots but fails a missing explicit file without substituting the release", () => {
    fixture((root) => {
      writeFileSync(join(root, RELEASE_FILENAME), "fixture");
      const master = join(root, MASTER_FILENAME);
      writeFileSync(master, "private fixture");
      expect(resolveReadonlyCourseDbPath({ root, explicitPath: master, env: {} })).toBe(master);
      expect(() => resolveReadonlyCourseDbPath({ root, explicitPath: "missing.sqlite", env: {} })).toThrow("never downloads or substitutes");
      expect(() => resolveReadonlyCourseDbPath({ root, env: { DATABASE_PATH: "missing.sqlite" } })).toThrow("never downloads or substitutes");
    });
  });

  it("allows a local research-only checkout and fails when neither local snapshot exists", () => {
    fixture((root) => {
      expect(() => resolveReadonlyCourseDbPath({ root, env: {} })).toThrow("never downloads");
      const master = join(root, MASTER_FILENAME);
      writeFileSync(master, "private fixture");
      expect(resolveReadonlyCourseDbPath({ root, env: {} })).toBe(master);
    });
  });

  it("accepts absent raw corpus only with explicit course-only scope metadata", () => {
    const db = new Database(":memory:");
    try {
      db.exec("CREATE TABLE lesson_vocab (id INTEGER PRIMARY KEY)");
      expect(() => dictionaryAuditScope(db)).toThrow("without checked course-only");
      db.exec("CREATE TABLE release_metadata (key TEXT PRIMARY KEY, value TEXT)");
      db.prepare("INSERT INTO release_metadata VALUES (?, ?)").run("scope", "unknown");
      expect(() => dictionaryAuditScope(db)).toThrow("without checked course-only");
      db.prepare("UPDATE release_metadata SET value=? WHERE key=?").run("course-only; private dictionary corpora excluded", "scope");
      expect(dictionaryAuditScope(db)).toContain("raw dictionary excluded (scope metadata checked)");
      db.exec("CREATE TABLE lexicon_entries (entry_id TEXT)");
      expect(dictionaryAuditScope(db)).toBe("local research dictionary included");
    } finally { db.close(); }
  });

  it("does not invent a CC license version for source recording references", () => {
    const rows = sourceRows({ source: { oerListingUrl: "https://coerll.utexas.edu/coerll/oer/nahuatlahtolli/" },
      lessons: [{ number: 2, originalUrl: "https://tlahtolli.coerll.utexas.edu/lesson-2/", vocabulary: [{ headword: "Piyali", gloss: "Hello", audioUrl: "https://tlahtolli.coerll.utexas.edu/source.mp3" }] }] });
    expect(rows[0].license).toContain("version unspecified");
    expect(rows[0].license).not.toMatch(/[34]\.0/);
    expect(rows[0].license_version_confirmed).toBe(false);
    expect(rows[0].license_listing_url).toBe("https://coerll.utexas.edu/coerll/oer/nahuatlahtolli/");
  });
});
