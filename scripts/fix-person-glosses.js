#!/usr/bin/env node
/**
 * Replaces confusing linguistic jargon ("first person; we") with plain
 * English glosses in lesson_vocab.
 */

const { resolveDbPath } = require("./_db-path");
const Database = require("better-sqlite3");
const db = new Database(resolveDbPath());

const fixes = [
  { id: 54, newGloss: "we" },
  { id: 55, newGloss: "they" },
  { id: 56, newGloss: "you all (non-standard; see amohuanti)" },
  { id: 57, newGloss: "you all" },
];

const update = db.prepare("UPDATE lesson_vocab SET gloss_en = ? WHERE id = ?");
const txn = db.transaction(() => {
  for (const f of fixes) {
    const info = update.run(f.newGloss, f.id);
    if (info.changes > 0) console.log(`ID ${f.id} → "${f.newGloss}"`);
  }
});
txn();

db.close();
console.log("Done.");
