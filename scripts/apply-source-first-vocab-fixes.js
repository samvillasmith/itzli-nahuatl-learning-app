/**
 * Applies learner glosses verified against the native Chicontepec course.
 *
 * Secondary dictionary rows remain available for reference, but only exact
 * native-course matches are eligible for core lesson cards. This script fixes
 * conflicts where a secondary/Classical sense had overridden the local EHN
 * sense used by the course.
 *
 *   node scripts/apply-source-first-vocab-fixes.js          # dry run
 *   node scripts/apply-source-first-vocab-fixes.js --apply  # update DB
 */

const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");

const APPLY = process.argv.includes("--apply");
const db = new Database(resolveDbPath());

const FIXES = new Map([
  [123, "to come from; to leave or set out; to rise or get up"],
  [164, "broader Huasteca morning greeting (not core Chicontepec course vocabulary)"],
  [308, "to grind corn"],
  [332, "to boil"],
  [336, "to swim"],
  [399, "grass"],
  [409, "cherry tomato"],
  [6110, "egg"],
  [6160, "much; a lot"],
  [6164, "again"],
  [6165, "a little"],
  [6199, "corn"],
  [6219, "thorn"],
  [6227, "to be located or present; to be here"],
  [6292, "work"],
  [6295, "hair stylist; barber"],
  [6304, "to eat"],
  [6833, "straight; smooth"],
  [6936, "hour"],
  [6938, "carpenter"],
  [6958, "where"],
  [6963, "grinding-stone pot"],
  [6967, "cold"],
  [6989, "red"],
  [7034, "yellow"],
  [7037, "wood; tree"],
  [7133, "Indigenous person"],
  [7418, "twenty"],
  [7451, "to escape; to flee"],
  [7496, "wind"],
  [7527, "to wake up"],
  [7611, "to harvest"],
  [7638, "to dream"],
  [7663, "unverified Classical import; excluded from core EHN lessons"],
  [7697, "broader Huasteca dawn/light expression; not attested as a core greeting in the Chicontepec course"],
]);

const select = db.prepare("SELECT id, display_form, gloss_en FROM lesson_vocab WHERE id = ?");
const update = db.prepare("UPDATE lesson_vocab SET gloss_en = ? WHERE id = ?");
const pending = [];

for (const [id, gloss] of FIXES) {
  const row = select.get(id);
  if (!row) throw new Error(`Missing lesson_vocab id=${id}`);
  if (row.gloss_en !== gloss) pending.push({ ...row, newGloss: gloss });
}

console.log(`Source-first gloss updates: ${pending.length}`);
for (const row of pending) {
  console.log(`  ${row.id} ${row.display_form}: ${row.gloss_en} -> ${row.newGloss}`);
}

if (APPLY) {
  db.transaction(() => {
    for (const row of pending) update.run(row.newGloss, row.id);
  })();
  console.log(`Applied ${pending.length} updates.`);
} else {
  console.log("Dry run only; pass --apply to update the database.");
}
