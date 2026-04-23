/**
 * Delete misplaced country-name rows from lesson_vocab.
 *
 * An earlier pass (scripts/fix-vocab-errors.js) re-glossed these rows as
 * "[❌ MISPLACED: ...]" but left them in the vocabulary. They are Spanish
 * proper nouns, not Nahuatl vocabulary, and were inserted into unrelated
 * unit themes (household items, food, domestic life). We now remove them
 * entirely so they stop appearing as flashcards.
 *
 * Idempotent: safe to run multiple times.
 * Run once: node scripts/delete-misplaced-country-names.js
 */

const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");

const DB_PATH = resolveDbPath();
const db = new Database(DB_PATH);

const COUNTRY_IDS = [
  { id: 415, name: "Roma",      unit: 17 },
  { id: 418, name: "Malta",     unit: 17 },
  { id: 419, name: "Rusia",     unit: 17 },
  { id: 420, name: "Japon",     unit: 17 },
  { id: 421, name: "Suiza",     unit: 17 },
  { id: 461, name: "Oman",      unit: 20 },
  { id: 626, name: "Chile",     unit: 27 },
  { id: 630, name: "Palestina", unit: 28 },
];

const select = db.prepare("SELECT id, display_form, gloss_en, lesson_number FROM lesson_vocab WHERE id = ?");
const del = db.prepare("DELETE FROM lesson_vocab WHERE id = ?");

const run = db.transaction(() => {
  let deleted = 0;
  let skipped = 0;
  for (const row of COUNTRY_IDS) {
    const existing = select.get(row.id);
    if (!existing) {
      console.log(`  skip id=${row.id} (${row.name}) — already absent`);
      skipped++;
      continue;
    }
    del.run(row.id);
    console.log(`  deleted id=${row.id} display="${existing.display_form}" unit=${existing.lesson_number}`);
    deleted++;
  }
  console.log(`\nDeleted ${deleted} misplaced country-name rows. Skipped ${skipped} already-absent.`);
});

run();
