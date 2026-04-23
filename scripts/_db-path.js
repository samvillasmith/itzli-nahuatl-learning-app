// Shared DB path resolver for all scripts/*.js.
//
// Priority:
//   1. DATABASE_PATH env var (if set and file exists)
//   2. Project-local DB (./fcn_master_lexicon_phase8_6_primer.sqlite, populated by fetch-db.js)
//   3. Historical path in ../molina/curriculum/ (original authoring location)
//
// Exits with a helpful message if none resolve.

const fs = require("fs");
const path = require("path");

function resolveDbPath() {
  const candidates = [
    process.env.DATABASE_PATH,
    path.resolve(__dirname, "..", "fcn_master_lexicon_phase8_6_primer.sqlite"),
    path.resolve(__dirname, "..", "..", "molina", "curriculum", "fcn_master_lexicon_phase8_6_primer.sqlite"),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  console.error("Could not locate the SQLite database. Tried:");
  for (const p of candidates) console.error("  -", p);
  console.error("\nRun `node scripts/fetch-db.js` first, or set DATABASE_PATH.");
  process.exit(1);
}

module.exports = { resolveDbPath };
