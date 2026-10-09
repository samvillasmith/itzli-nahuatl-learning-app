"use strict";

// Offline release preparation. Never fetches a database, credentials or media.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const Database = require("better-sqlite3");
const { loadTs } = require("./lib/course-audio-inputs.js");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "fcn_master_lexicon_phase8_6_primer.sqlite");
const RELEASE = path.join(ROOT, "fcn_course_release.sqlite");
const MANIFEST = path.join(ROOT, "course-release-manifest.json");
const TABLES = ["phase82_unit_plan", "lesson_vocab", "lesson_dialogues", "lesson_blocks",
  "primer_dialogues", "primer_constructions", "unit_assessment_manifest"];
const COLUMNS = {
  phase82_unit_plan: ["pedagogical_unit_id", "unit_code", "lesson_number", "english_lesson_unit_id", "target_band", "theme_en",
    "communicative_goal", "grammar_focus", "lexical_focus", "english_vocab_count", "english_dialogue_count", "english_construction_count"],
  lesson_vocab: ["id", "lesson_number", "rank", "entry_id", "display_form", "gloss_en", "part_of_speech", "semantic_domain"],
  lesson_dialogues: ["lesson_dialogue_id", "lesson_unit_id", "speaker_label", "utterance_normalized", "translation_en", "attestation_tier"],
  lesson_blocks: ["lesson_block_id", "lesson_unit_id", "block_order", "text_normalized", "nahuatliness_score"],
  primer_dialogues: ["sample_id", "lesson_number", "dialogue_order", "speaker_label", "utterance_original", "utterance_normalized", "translation_en", "communicative_function"],
  primer_constructions: ["priority_id", "construction_label", "pattern_text", "proficiency_band", "first_lesson_number", "example_original", "translation_en", "avg_confidence"],
  unit_assessment_manifest: ["assessment_id", "lesson_number", "proficiency_band", "item_type", "prompt"],
};
const SELECTION_FILES = ["src/data/excluded-vocab.ts", "src/data/core-vocabulary-facts.json", "src/data/course-vocab-selection.ts",
  "src/data/app-content-reviewed-allowlist.json", "src/lib/app-content-safety.ts",
  "src/lib/study-card-safety.ts", "src/data/study-card-exclusions.json", "src/data/app-content-exclusions.json",
  "src/data/nahuatlahtolli-course.json"];
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fileHash = (filename) => hash(fs.readFileSync(filename));
// Git checkout line endings differ between Windows authoring and Linux deploys.
const textHash = (filename) => hash(fs.readFileSync(filename, "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n"));
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const selectionHashes = () => Object.fromEntries(SELECTION_FILES.map((name) => [name, textHash(path.join(ROOT, name))]));
const pathIdsHash = () => hash(JSON.parse(fs.readFileSync(path.join(ROOT,
  "src/data/course-path-progression.json"), "utf8")).lessons.map((step) => step.lessonNumber).join("\n"));

function snapshot(filename) {
  return execFileSync(process.execPath, [path.join(__dirname, "course-release-snapshot.cjs"), filename],
    { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, encoding: "utf8" });
}

function checkRelease() {
  if (!fs.existsSync(RELEASE) || !fs.existsSync(MANIFEST)) {
    throw new Error("Course release database/manifest missing. Prepare it from the local research database; no automatic download is permitted.");
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  if (manifest.builderSha256 !== textHash(__filename)) throw new Error("Release preparation changed. Regenerate the reviewed subset locally.");
  if (manifest.releaseSha256 !== fileHash(RELEASE)) throw new Error("Course release database hash differs from its reviewed manifest.");
  if (JSON.stringify(manifest.selectionFiles) !== JSON.stringify(selectionHashes())) {
    throw new Error("Course selection changed. Regenerate the course-only database locally before release.");
  }
  if (manifest.pathIdsSha256 !== pathIdsHash()) throw new Error("Stable course path identities changed.");
  const db = new Database(RELEASE, { readonly: true, fileMustExist: true });
  try {
    if (db.pragma("quick_check", { simple: true }) !== "ok") throw new Error("Course release SQLite integrity failed.");
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row) => row.name);
    const allowed = [...TABLES, "retired_vocab_ids", "release_metadata"].sort();
    if (JSON.stringify(names) !== JSON.stringify(allowed)) throw new Error("Release contains unexpected or missing tables; research corpora must stay private.");
    for (const [name, expected] of Object.entries(manifest.tableCounts)) {
      const actual = db.prepare(`SELECT COUNT(*) AS count FROM ${quote(name)}`).get().count;
      if (actual !== expected) throw new Error(`Release row count changed: ${name}`);
    }
    const retiredColumns = db.prepare("PRAGMA table_info(retired_vocab_ids)").all().map(row => row.name);
    if (JSON.stringify(retiredColumns) !== JSON.stringify(["id", "lesson_number", "rank"])) {
      throw new Error("Retired vocabulary ledger must contain numeric identity metadata only, without source headwords.");
    }
    const ids = db.prepare("SELECT id FROM lesson_vocab UNION ALL SELECT id FROM retired_vocab_ids ORDER BY id").all().map((row) => row.id);
    if (new Set(ids).size !== ids.length || hash(JSON.stringify(ids)) !== manifest.historicalVocabularyIdsSha256) {
      throw new Error("Historical vocabulary identity ledger differs; progress compatibility is not verified.");
    }
  } finally { db.close(); }
  return manifest;
}

function buildRelease() {
  if (!fs.existsSync(MASTER)) return checkRelease();
  const sourceHash = fileHash(MASTER);
  const originalSnapshot = snapshot(MASTER);
  const stable = JSON.parse(originalSnapshot);
  const dialogueIds = new Set(stable.lessons.flatMap((lesson) => lesson.selectedDialogues.map((row) => row.lesson_dialogue_id)));
  const constructionIds = new Set(stable.lessons.flatMap((lesson) => lesson.constructions.map((row) => row.priority_id)));
  const source = new Database(MASTER, { readonly: true, fileMustExist: true });
  const englishUnits = new Map(source.prepare("SELECT english_lesson_unit_id, lesson_number FROM phase82_unit_plan").all()
    .map((row) => [row.english_lesson_unit_id, row.lesson_number]));
  const { filterCoreVocab } = loadTs("src/data/excluded-vocab.ts");
  const grouped = new Map();
  const rows = source.prepare("SELECT id, entry_id, rank, display_form AS headword, gloss_en, part_of_speech, lesson_number AS first_lesson_number, semantic_domain FROM lesson_vocab ORDER BY lesson_number, rank, id").all();
  for (const row of rows) {
    const group = grouped.get(row.first_lesson_number) || [];
    group.push(row);
    grouped.set(row.first_lesson_number, group);
  }
  const selectedIds = new Set([...grouped].flatMap(([unit, group]) => filterCoreVocab(group, unit).map((row) => row.id)));
  const privateDir = path.join(ROOT, "data", "course-release");
  fs.mkdirSync(privateDir, { recursive: true });
  const candidate = path.join(privateDir, `candidate-${process.pid}-${crypto.randomUUID()}.sqlite`);
  const output = new Database(candidate);
  const counts = {};
  try {
    output.pragma("journal_mode = DELETE");
    output.transaction(() => {
      for (const name of TABLES) {
        // Copy only course tables. PRAGMA-derived schema intentionally omits foreign
        // keys into private research tables and retains columns/primary identities.
        const columns = source.prepare(`PRAGMA table_info(${quote(name)})`).all()
          .filter((column) => COLUMNS[name].includes(column.name));
        const definitions = columns.map((column) => `${quote(column.name)} ${column.type || "TEXT"}${column.pk ? " PRIMARY KEY" : ""}`);
        output.exec(`CREATE TABLE ${quote(name)} (${definitions.join(", ")})`);
        const columnNames = columns.map((column) => quote(column.name)).join(", ");
        const insert = output.prepare(`INSERT INTO ${quote(name)} (${columnNames}) VALUES (${columns.map(() => "?").join(", ")})`);
        const records = source.prepare(`SELECT ${columnNames} FROM ${quote(name)}`).all();
        const selected = records.filter((record) => {
          if (name === "lesson_vocab") return selectedIds.has(record.id);
          if (name === "lesson_dialogues") return dialogueIds.has(record.lesson_dialogue_id);
          if (name === "primer_constructions") return constructionIds.has(record.priority_id);
          if (name === "lesson_blocks") {
            const unit = stable.lessons.find((lesson) => lesson.id === englishUnits.get(record.lesson_unit_id));
            return record.nahuatliness_score > 0.5 && record.text_normalized?.length > 8
              && record.text_normalized.length < 120 && unit?.blocks.some((block) => block.text_normalized === record.text_normalized);
          }
          return true;
        });
        for (const record of selected) insert.run(...columns.map((column) => record[column.name]));
        counts[name] = selected.length;
      }
      // Existing progress may still refer to retired cards. Keep only identity
      // metadata, never dictionary definitions or examples, for those cards.
      output.exec("CREATE TABLE retired_vocab_ids (id INTEGER PRIMARY KEY, lesson_number INTEGER, rank INTEGER)");
      const retired = output.prepare("INSERT INTO retired_vocab_ids VALUES (?, ?, ?)");
      for (const row of rows.filter((row) => !selectedIds.has(row.id))) {
        retired.run(row.id, row.first_lesson_number, row.rank);
      }
      counts.retired_vocab_ids = rows.length - selectedIds.size;
      output.exec("CREATE TABLE release_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
      output.prepare("INSERT INTO release_metadata VALUES (?, ?)").run("scope", "course-only; private dictionary corpora excluded");
      counts.release_metadata = 1;
    })();
    if (output.pragma("quick_check", { simple: true }) !== "ok") throw new Error("Generated database integrity failed.");
  } finally { output.close(); source.close(); }
  const releaseSnapshot = snapshot(candidate);
  if (releaseSnapshot !== originalSnapshot) {
    fs.writeFileSync(path.join(privateDir, "original-runtime.json"), originalSnapshot);
    fs.writeFileSync(path.join(privateDir, "release-runtime.json"), releaseSnapshot);
    throw new Error("Course-only runtime differs from the original. Candidate retained privately for diagnosis; release not replaced.");
  }
  if (fileHash(MASTER) !== sourceHash) throw new Error("Read-only research database unexpectedly changed.");
  const manifest = {
    schemaVersion: 1, scope: "course-only", sourceDatabaseSha256: sourceHash, builderSha256: textHash(__filename),
    sourceTextHashFormat: "UTF-8; CRLF/CR normalized to LF; optional BOM removed",
    releaseSha256: fileHash(candidate), bytes: fs.statSync(candidate).size,
    selectionFiles: selectionHashes(), pathIdsSha256: pathIdsHash(),
    historicalVocabularyCount: rows.length,
    historicalVocabularyIdsSha256: hash(JSON.stringify(rows.map((row) => row.id).sort((a, b) => a - b))),
    tableCounts: counts, runtimeParitySha256: hash(originalSnapshot),
    verifiedLegacyUnits: stable.units.length, activeDisplayedVocabulary: stable.vocabulary.length,
    exclusions: ["lexicon_entries", "Kaikki/Wiktionary corpus", "Siméon corpus", "non-runtime columns and held source rows", "private source photographs", "learner account/progress data"],
    notice: "Individual checked course facts retain existing identities. This is not the research database. See NOTICE.md and docs/course-only-release.md for rights scope.",
  };
  const identical = fs.existsSync(RELEASE) && fileHash(RELEASE) === manifest.releaseSha256;
  if (fs.existsSync(RELEASE) && !identical) {
    const previous = path.join(privateDir, `previous-${fileHash(RELEASE)}.sqlite`);
    if (!fs.existsSync(previous)) fs.copyFileSync(RELEASE, previous);
  }
  if (identical) {
    // Avoid replacing a byte-identical database held open by the local server.
    if (path.dirname(candidate) !== privateDir) throw new Error("Unexpected generated candidate path.");
    fs.unlinkSync(candidate);
  } else fs.renameSync(candidate, RELEASE);
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  return checkRelease();
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => !["--check", "--prepare"].includes(arg))) throw new Error("Use --prepare or --check only.");
    const manifest = args.includes("--check") ? checkRelease() : buildRelease();
    console.log(`Course-only release verified: ${manifest.verifiedLegacyUnits} legacy units, ${manifest.activeDisplayedVocabulary} displayed core cards, ${manifest.historicalVocabularyCount} preserved historical identities; ${manifest.bytes} bytes.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { buildRelease, checkRelease, RELEASE, MANIFEST, TABLES };
