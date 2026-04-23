#!/usr/bin/env node
/**
 * Deduplicate expanded lesson_vocab entries:
 * Remove entries that are spelling variants of existing entries
 * (same unit, same gloss, AND similar Nahuatl form).
 *
 * "Similar" means the Nahuatl forms share at least 60% of characters
 * (handles h/j, k/c, s/z, tl/tli variants while keeping genuinely
 * different words like amigo vs yoloihni).
 */

const { resolveDbPath } = require("./_db-path");
const Database = require("better-sqlite3");
const db = new Database(resolveDbPath());

const before = db.prepare("SELECT COUNT(*) as n FROM lesson_vocab").get().n;

function similarity(a, b) {
  a = a.toLowerCase().replace(/[·\-]/g, "");
  b = b.toLowerCase().replace(/[·\-]/g, "");
  if (a === b) return 1.0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;

  // Simple LCS-based similarity
  const m = shorter.length;
  const n = longer.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = shorter[i - 1] === longer[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return (2 * dp[m][n]) / (m + n);
}

// Get expansion entries
const expansionRows = db.prepare(`
  SELECT id, lesson_number, LOWER(gloss_en) as g, display_form
  FROM lesson_vocab
  WHERE semantic_domain LIKE 'lexicon_%' OR semantic_domain = 'curated_expansion'
  ORDER BY lesson_number, LOWER(gloss_en), id
`).all();

// Get original entries for matching
const origRows = db.prepare(`
  SELECT id, lesson_number, LOWER(gloss_en) as g, display_form
  FROM lesson_vocab
  WHERE semantic_domain NOT LIKE 'lexicon_%' AND semantic_domain != 'curated_expansion'
`).all();

// Build lookup: unit|gloss → [{id, form}]
const origMap = new Map();
for (const r of origRows) {
  const key = r.lesson_number + "|" + r.g;
  if (!origMap.has(key)) origMap.set(key, []);
  origMap.get(key).push({ id: r.id, form: r.display_form });
}

// Group expansion entries by unit|gloss
const groups = new Map();
for (const r of expansionRows) {
  const key = r.lesson_number + "|" + r.g;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const idsToDelete = new Set();

for (const [key, members] of groups) {
  const origEntries = origMap.get(key) || [];

  // Check each expansion member against originals — if similar form, delete
  for (const m of members) {
    for (const o of origEntries) {
      if (similarity(m.display_form, o.form) > 0.55) {
        idsToDelete.add(m.id);
        break;
      }
    }
  }

  // Among expansion entries with same gloss+unit, keep only the first,
  // delete others that are similar spelling variants
  const surviving = members.filter((m) => !idsToDelete.has(m.id));
  if (surviving.length > 1) {
    for (let i = 1; i < surviving.length; i++) {
      for (let j = 0; j < i; j++) {
        if (similarity(surviving[i].display_form, surviving[j].display_form) > 0.55) {
          idsToDelete.add(surviving[i].id);
          break;
        }
      }
    }
  }
}

console.log(`Found ${idsToDelete.size} spelling-variant duplicates to remove.`);

const del = db.prepare("DELETE FROM lesson_vocab WHERE id = ?");
const txn = db.transaction(() => {
  for (const id of idsToDelete) {
    del.run(id);
  }
});
txn();

const after = db.prepare("SELECT COUNT(*) as n FROM lesson_vocab").get().n;
console.log(`lesson_vocab: ${before} → ${after} (removed ${before - after})`);

db.close();
