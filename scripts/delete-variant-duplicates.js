/**
 * Delete pure-duplicate vocabulary rows from lesson_vocab.
 *
 * "Pure duplicates" here means rows whose ID appears in the `variantIds` list
 * of any VariantGroup in src/data/variant-groups.ts. These rows represent the
 * same word in a different orthographic system (INALI vs IDIEZ), a dialect
 * variant, or a straight duplicate with a macron/saltillo difference.
 *
 * Since the app already suppresses these from lesson flow and flashcards,
 * the DB rows are dead weight — they waste chunk slots, clutter the distractor
 * pool when not perfectly filtered, and risk being shown if the filter logic
 * ever regresses.
 *
 * The canonical row for each concept is kept; the variants are deleted.
 * The app's "Also written: …" note on the learn card is pre-computed at build
 * time, so deleting DB rows does NOT lose the alternate-spelling information
 * that the grouping metadata encodes. If you want to preserve all spellings,
 * do not run this.
 *
 * Idempotent: safe to run multiple times.
 *
 *   node scripts/delete-variant-duplicates.js          (dry run — default)
 *   node scripts/delete-variant-duplicates.js --apply  (actually delete)
 */

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");

const APPLY = process.argv.includes("--apply");

// ── Parse variant IDs from src/data/variant-groups.ts ───────────────────────

function loadVariantIds() {
  const tsPath = path.resolve(__dirname, "..", "src", "data", "variant-groups.ts");
  const src = fs.readFileSync(tsPath, "utf-8");

  // Grab the VARIANT_GROUPS object body.
  const start = src.indexOf("export const VARIANT_GROUPS");
  if (start < 0) throw new Error("Could not find VARIANT_GROUPS in variant-groups.ts");

  // Walk from there, strip /* ... */ comments, and extract every
  //   variantIds: [ n, n, n ]
  // occurrence. This is brittle-by-design: if someone changes the property
  // name or uses non-numeric IDs, the regex stops matching and we error.
  const noBlockComments = src.slice(start).replace(/\/\*[\s\S]*?\*\//g, "");
  const variantIds = new Set();
  const re = /variantIds:\s*\[\s*([\d,\s]+)\]/g;
  let m;
  while ((m = re.exec(noBlockComments)) !== null) {
    for (const tok of m[1].split(",")) {
      const n = parseInt(tok.trim(), 10);
      if (Number.isFinite(n)) variantIds.add(n);
    }
  }
  if (variantIds.size === 0) throw new Error("Parsed 0 variantIds — regex likely broken");
  return variantIds;
}

// ── Main ────────────────────────────────────────────────────────────────────

const DB_PATH = resolveDbPath();
const db = new Database(DB_PATH);

const variantIds = loadVariantIds();
console.log(`Loaded ${variantIds.size} variant IDs from src/data/variant-groups.ts`);

const selectById = db.prepare(
  "SELECT id, display_form, gloss_en, lesson_number FROM lesson_vocab WHERE id = ?"
);
const del = db.prepare("DELETE FROM lesson_vocab WHERE id = ?");

const presentRows = [];
const missingIds = [];
for (const id of variantIds) {
  const row = selectById.get(id);
  if (row) presentRows.push(row);
  else missingIds.push(id);
}

console.log(`\n  ${presentRows.length} matching rows in lesson_vocab`);
console.log(`  ${missingIds.length} variant IDs already absent\n`);

if (!APPLY) {
  console.log("── DRY RUN (pass --apply to actually delete) ──");
  for (const row of presentRows.slice(0, 20)) {
    console.log(`  would delete id=${row.id} unit=${row.lesson_number} "${row.display_form}"`);
  }
  if (presentRows.length > 20) console.log(`  … and ${presentRows.length - 20} more`);
  console.log(`\nRun again with --apply to delete ${presentRows.length} rows.`);
  process.exit(0);
}

const run = db.transaction(() => {
  let n = 0;
  for (const row of presentRows) {
    del.run(row.id);
    n++;
  }
  console.log(`Deleted ${n} variant rows from lesson_vocab.`);
});
run();
