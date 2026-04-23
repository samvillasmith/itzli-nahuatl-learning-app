/**
 * Apply the remaining ⚠️ gloss corrections from
 * EHN_Vocabulary_Exhaustive_Revisions.md that were not covered by
 * scripts/fix-vocab-errors.js or scripts/audit-fix-all.js.
 *
 * Each fix is keyed by (lesson_number, display_form) rather than hard ID
 * so the script survives ID renumbering and is safe to re-run. If a row
 * has ALREADY been annotated (gloss contains "[⚠️" or "[❌"), we skip it.
 *
 * Idempotent. Run once after fix-vocab-errors.js + audit-fix-all.js:
 *
 *   node scripts/apply-remaining-gloss-fixes.js          (dry run)
 *   node scripts/apply-remaining-gloss-fixes.js --apply
 */

const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");

const APPLY = process.argv.includes("--apply");

const DB_PATH = resolveDbPath();
const db = new Database(DB_PATH);

// Each entry:
//   { unit, form, newGloss }
// The matcher looks up rows WHERE lesson_number = ? AND display_form = ?,
// skips rows whose gloss already contains "[⚠️" or "[❌" (meaning a prior
// fix script annotated them), and applies newGloss. Multiple matching rows
// are all updated (rare — only happens when duplicates exist).

const FIXES = [
  // ── Unit 4 ────────────────────────────────────────────────────────────────
  {
    unit: 4,
    form: "ciento",
    newGloss: "hundred [⚠️ NOTE: Spanish loanword; native EHN for 100 is 'macuilpoalli' (5×20)]",
  },
  {
    unit: 4,
    form: "siltik",
    newGloss: "small; fine-grained [⚠️ NOTE: not widely attested for 'small'; standard EHN: tepitzin (small) or tzitziquitzin (tiny)]",
  },

  // ── Unit 7 ────────────────────────────────────────────────────────────────
  {
    unit: 7,
    form: "tonaya",
    newGloss: "day; daytime [⚠️ NOTE: 'tonalli' (day/sun/soul) and 'tonayan' are the standard IDIEZ forms]",
  },
  {
    unit: 7,
    form: "chocolatl",
    newGloss: "chocolate [⚠️ OFF-THEME: unit covers time/daypart vocabulary; add this ID to EXCLUDED_VOCAB_IDS in src/data/excluded-vocab.ts once IDs are known]",
  },

  // ── Unit 11 ───────────────────────────────────────────────────────────────
  {
    unit: 11,
    form: "tlalalacatl",
    newGloss: "greater white-fronted goose [⚠️ OFF-THEME: unit covers greetings/farewells; too specialized for this level]",
  },
  {
    unit: 11,
    form: "teoxihuitl",
    newGloss: "fine turquoise [⚠️ OFF-THEME: unit covers greetings/farewells]",
  },

  // ── Unit 10 ───────────────────────────────────────────────────────────────
  {
    unit: 10,
    form: "huihuiciquitic",
    newGloss: "thin; slender [⚠️ NOTE: unusual form; standard EHN: pitzahuac (thin)]",
  },
  {
    unit: 10,
    form: "ahcoqui",
    newGloss: "light (in weight); easy to lift [⚠️ NOTE: ahco = 'upward', so ahcoqui ≈ 'can be raised'; 'light in weight' also: 'ahmo etic' (not heavy)]",
  },
  // hueyic (typo of hueyac) is already in the variant group for Unit 10
  // (canonical 249 = huehcapantic). No gloss fix needed.

  // ── Unit 22 ───────────────────────────────────────────────────────────────
  {
    unit: 22,
    form: "waleyah",
    newGloss: "watermelon [⚠️ NOTE: post-contact borrowing; not traditional EHN vocabulary]",
  },

  // ── Unit 29 ───────────────────────────────────────────────────────────────
  {
    unit: 29,
    form: "payo",
    newGloss: "head (informal/regional) [⚠️ NOTE: not standard; standard EHN for 'head' = cuaitl or tzontecomatl]",
  },
  {
    unit: 29,
    form: "yacatzompilli",
    newGloss: "a cold; respiratory congestion [⚠️ NOTE: not widely attested; more common: 'tzompilihui' (to have a cold) or 'cocoliztli' (sickness)]",
  },

  // ── Unit 35 ───────────────────────────────────────────────────────────────
  {
    unit: 35,
    form: "ixmatzahtic",
    newGloss: "pink [⚠️ NOTE: not widely attested; 'pink' often rendered with a descriptive phrase, e.g. 'tlapaltontli tlen xochitic']",
  },

  // ── Unit 36 ───────────────────────────────────────────────────────────────
  {
    unit: 36,
    form: "huihuitic",
    newGloss: "silly; foolish [⚠️ NOTE: not widely attested in this sense in IDIEZ]",
  },
  {
    unit: 36,
    form: "tlapahuaxtli",
    newGloss: "cooked; boiled [⚠️ NOTE: non-standard for 'cooked'; standard EHN: iuccic (ripe/cooked) or tlaicxitilli]",
  },

  // ── Unit 37 ───────────────────────────────────────────────────────────────
  {
    unit: 37,
    form: "patex",
    newGloss: "duck [⚠️ NOTE: regional/colloquial; standard EHN: canauhtli]",
  },
  {
    unit: 37,
    form: "kocho",
    newGloss: "parrot [⚠️ NOTE: regional; standard EHN: toznene, cococho]",
  },
  {
    unit: 37,
    form: "tamasole",
    newGloss: "toad [⚠️ NOTE: regional variant; standard: tamazolin]",
  },
  {
    unit: 37,
    form: "tokomahtli",
    newGloss: "squirrel [⚠️ NOTE: regional variant; standard EHN: techallotl or motohtli]",
  },

  // ── Unit 38 ───────────────────────────────────────────────────────────────
  {
    unit: 38,
    form: "tlayoli",
    newGloss: "maize; dried-kernel corn [⚠️ NOTE: standard IDIEZ form is 'tlaolli']",
  },

  // ── Unit 41 ───────────────────────────────────────────────────────────────
  {
    unit: 41,
    form: "nane",
    newGloss: "Miss; young woman (term of address) [⚠️ NOTE: etymology unclear; possibly from 'nantzin' (respected mother) or Sp. 'nena'; not a core EHN form]",
  },

  // ── Unit 42 ───────────────────────────────────────────────────────────────
  {
    unit: 42,
    form: "makili",
    newGloss: "to hit; to strike [⚠️ NOTE: variant form; more standard EHN: 'huitequi' (to strike/beat) or 'maca' (to give a blow)]",
  },
];

const selectByUnitForm = db.prepare(
  "SELECT id, display_form, gloss_en FROM lesson_vocab WHERE lesson_number = ? AND display_form = ?"
);
const update = db.prepare("UPDATE lesson_vocab SET gloss_en = ? WHERE id = ?");

const pendingUpdates = [];
const alreadyAnnotated = [];
const notFound = [];

for (const fix of FIXES) {
  const rows = selectByUnitForm.all(fix.unit, fix.form);
  if (rows.length === 0) {
    notFound.push(fix);
    continue;
  }
  for (const row of rows) {
    if (/\[[⚠️❌]/.test(row.gloss_en)) {
      alreadyAnnotated.push({ ...fix, id: row.id, existing: row.gloss_en });
    } else {
      pendingUpdates.push({ ...fix, id: row.id, existing: row.gloss_en });
    }
  }
}

console.log(`Planned updates:  ${pendingUpdates.length}`);
console.log(`Already annotated: ${alreadyAnnotated.length} (skipped)`);
console.log(`Not found:         ${notFound.length}`);

if (notFound.length) {
  console.log("\n  Rows not found (may have been deleted or renamed):");
  for (const f of notFound) console.log(`    unit ${f.unit}  display_form='${f.form}'`);
}

if (!APPLY) {
  console.log("\n── DRY RUN (pass --apply to actually update) ──");
  for (const u of pendingUpdates.slice(0, 30)) {
    console.log(`  id=${u.id} unit=${u.unit} "${u.form}"`);
    console.log(`    old: ${u.existing}`);
    console.log(`    new: ${u.newGloss}`);
  }
  if (pendingUpdates.length > 30) console.log(`  … and ${pendingUpdates.length - 30} more`);
  process.exit(0);
}

const run = db.transaction(() => {
  let n = 0;
  for (const u of pendingUpdates) {
    update.run(u.newGloss, u.id);
    n++;
  }
  console.log(`\nApplied ${n} gloss updates.`);
});
run();
