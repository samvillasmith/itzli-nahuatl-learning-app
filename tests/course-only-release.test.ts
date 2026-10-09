import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const root = process.cwd();
const { checkRelease, RELEASE, TABLES } = require("../scripts/prepare-course-release.cjs") as {
  checkRelease: () => { historicalVocabularyCount: number; activeDisplayedVocabulary: number; verifiedLegacyUnits: number };
  RELEASE: string; TABLES: string[];
};
const master = path.join(root, "fcn_master_lexicon_phase8_6_primer.sqlite");
const snapshot = (filename: string) => execFileSync(process.execPath,
  [path.join(root, "scripts/course-release-snapshot.cjs"), filename],
  { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

describe("course-only release and progress compatibility", () => {
  it("ships a hash-checked scope, without raw corpora or retired definitions", () => {
    const manifest = checkRelease();
    expect(manifest.verifiedLegacyUnits).toBe(43);
    const db = new Database(RELEASE, { readonly: true, fileMustExist: true });
    try {
      const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map((row) => row.name).sort();
      expect(tables).toEqual([...TABLES, "retired_vocab_ids", "release_metadata"].sort());
      const columns = (db.prepare("PRAGMA table_info(retired_vocab_ids)").all() as { name: string }[]).map((row) => row.name);
      expect(columns).toEqual(["id", "lesson_number", "rank"]);
      expect(db.pragma("quick_check", { simple: true })).toBe("ok");
      const ids = db.prepare("SELECT id FROM lesson_vocab UNION ALL SELECT id FROM retired_vocab_ids").all() as { id: number }[];
      expect(ids).toHaveLength(2043);
      expect(new Set(ids.map((row) => row.id)).size).toBe(2043);
    } finally { db.close(); }
  });

  it.skipIf(!fs.existsSync(master))("matches all actual legacy runtime getters and leaves the master bytes unchanged", () => {
    const hash = () => crypto.createHash("sha256").update(fs.readFileSync(master)).digest("hex");
    const before = hash();
    expect(snapshot(RELEASE)).toBe(snapshot(master));
    expect(hash()).toBe(before);
  }, 30_000);

  it("rejects a research database renamed as the release in deployment", () => {
    const parent = path.join(root, "data/course-release");
    fs.mkdirSync(parent, { recursive: true });
    const dir = fs.mkdtempSync(path.join(parent, "scope-test-"));
    const file = path.join(dir, "fcn_course_release.sqlite");
    const fixture = new Database(file);
    fixture.exec("CREATE TABLE lexicon_entries (id INTEGER)");
    fixture.close();
    try {
      const code = 'const {loadTs}=require("./scripts/lib/course-audio-inputs.js");loadTs("src/lib/db.ts").getDb();';
      expect(() => execFileSync(process.execPath, ["-e", code], {
        cwd: root, env: { ...process.env, VERCEL: "1", DATABASE_PATH: file }, stdio: "pipe",
      })).toThrow(/Deployment database does not have the reviewed course-only scope/);
    } finally {
      fs.unlinkSync(file);
      fs.rmdirSync(dir);
    }
  });
});
