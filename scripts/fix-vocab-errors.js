// Applies corrections from EHN_Vocabulary_Exhaustive_Revisions.md to lesson_vocab.
// Targets: ❌ (wrong definition), major ⚠️ (significantly wrong gloss), misplaced entries.
// Each fix records the original gloss in a NOTE so nothing is silently lost.
// Run once: node scripts/fix-vocab-errors.js

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../molina/curriculum/fcn_master_lexicon_phase8_6_primer.sqlite");
const db = new Database(DB_PATH);

const update = db.prepare("UPDATE lesson_vocab SET gloss_en = ? WHERE id = ?");

const fixes = [
  // ── ❌ WRONG DEFINITIONS ───────────────────────────────────────────────────

  // Unit 2: quema means "yes", NOT "when?"
  {
    id: 21,
    gloss: "yes [❌ CORRECTED: was 'when?'; 'when' = queman/quemman]",
  },

  // Unit 6: xolotl is a deity/noun, NOT a verb meaning "to be afraid"
  {
    id: 130,
    gloss: "Xolotl — deity name; mythological dog-like creature [❌ CORRECTED: was 'to be afraid'; 'to be afraid' = momauhtia; xolotl is a noun, not a verb]",
  },

  // Unit 6: aqui means "to enter", NOT "to be (negative)"
  {
    id: 125,
    gloss: "to enter [❌ CORRECTED: was 'to be (negative)'; 'aqui' = to enter]",
  },

  // Unit 6: xawa/xahua means "to paint the face / to excavate", NOT "to be fashion"
  {
    id: 141,
    gloss: "to paint the face; to apply makeup; to excavate [❌ CORRECTED: was 'to be fashion' — nonsensical gloss]",
  },

  // Unit 7: citlal cetl is NOT "snow" — citlalli=star, cetl=ice/frost
  {
    id: 169,
    gloss: "star-ice (compound of citlalli + cetl) [❌ CORRECTED: was 'snow'; 'snow' = cepayahuitl; cetl = ice/frost, not snow]",
  },

  // Unit 9: huehue means "old man / elder", NOT "husband"
  {
    id: 209,
    gloss: "old man, elder [❌ CORRECTED: was 'husband'; 'husband' = namictli or oquichtli; huehue = elder]",
  },

  // Unit 10: yankuic/yankuik means "NEW", NOT "bad"
  {
    id: 259,
    gloss: "new [❌ CORRECTED: was 'bad' — MAJOR ERROR; 'bad' = ax cualli; yankuic = new (confirmed by Karttunen, Molina, IDIEZ)]",
  },

  // Unit 23: acalli means "canoe / boat", NOT "stilt house"
  {
    id: 531,
    gloss: "canoe, boat [❌ CORRECTED: was 'stilt house'; atl (water) + calli (house) = canoe]",
  },

  // Unit 30: tlachiacayotl is NOT attested as "butter"
  {
    id: 665,
    gloss: "[❌ CORRECTED: was 'butter' — not attested; 'butter' = chichihualaoyotl / chichihualayotl]",
  },

  // Unit 31: tecotli is NOT a standard word for "god"
  {
    id: 682,
    gloss: "[❌ CORRECTED: was 'god' — not standard; 'god' = teotl]",
  },

  // Unit 32: yacametl is NOT attested as "insect"
  {
    id: 700,
    gloss: "[❌ CORRECTED: was 'insect' — not attested; 'insect' = yolcatl]",
  },

  // Unit 32: iyaquemetl is NOT attested as "insect"
  {
    id: 702,
    gloss: "[❌ CORRECTED: was 'insect' — not attested]",
  },

  // Unit 36: tlatzehtzeloltic is NOT attested as "holy"
  {
    id: 6068,
    gloss: "[❌ CORRECTED: was 'holy' — not attested; 'holy' = tlateochihualli or teoyo]",
  },

  // Unit 37: koajtli — eagle is likely a corruption
  {
    id: 6081,
    gloss: "[❌ CORRECTED: was 'Eagle' — likely corruption of cuauhtli (eagle); see cuauhtli/kuajtli]",
  },

  // Unit 37: kuatochin is NOT standard for "rabbit"
  {
    id: 6083,
    gloss: "wood-rabbit compound [❌ CORRECTED: was 'rabbit'; 'rabbit' = tochtli; kuatochin = tree/wood + rabbit, non-standard]",
  },

  // Unit 38: tecciztli means "conch shell" in Classical Nahuatl, NOT "egg"
  {
    id: 6110,
    gloss: "conch shell [❌ CORRECTED: was 'egg'; tecciztli = conch shell in Classical; 'egg' = totoltetl]",
  },

  // ── ⚠️ SIGNIFICANT WRONG GLOSSES ──────────────────────────────────────────

  // Unit 15: huica means "to carry / bring along", NOT "to sing" (cuica = to sing)
  {
    id: 357,
    gloss: "to carry, to bring along [⚠️ CORRECTED: was 'to sing'; 'to sing' = cuica (also in this unit)]",
  },

  // Unit 17: tlitl is non-standard; standard form is tletl
  {
    id: 396,
    gloss: "fire [⚠️ NOTE: non-standard spelling; standard EHN form is 'tletl']",
  },

  // Unit 5: tlaxkalpayo — dubious entry, etymology unclear
  {
    id: 112,
    gloss: "handkerchief [⚠️ NOTE: etymology uncertain; 'tlaxcalli' = tortilla + 'payo' is not a standard suffix for handkerchief; possible data error]",
  },

  // Unit 30: ax quema — the component 'quema' means yes, queman = when
  {
    id: 664,
    gloss: "never [⚠️ NOTE: 'quema' = yes (not when); 'ax queman' is more standard form for 'never']",
  },

  // ── ❌ MISPLACED ENTRIES (country/place names in wrong units) ──────────────

  {
    id: 415,
    gloss: "Rome (ancient city/empire) [❌ MISPLACED: country/city names do not belong in a household items unit]",
  },
  {
    id: 418,
    gloss: "Malta (country in the Mediterranean) [❌ MISPLACED: not a household item]",
  },
  {
    id: 419,
    gloss: "Russia (country in Eastern Europe/North Asia) [❌ MISPLACED: not a household item]",
  },
  {
    id: 420,
    gloss: "Japan (country in East Asia) [❌ MISPLACED: not a household item]",
  },
  {
    id: 421,
    gloss: "Switzerland (country in Western Europe) [❌ MISPLACED: not a household item]",
  },
  {
    id: 461,
    gloss: "Oman (country in West Asia) [❌ MISPLACED: not a people/person vocabulary item]",
  },
  {
    id: 626,
    gloss: "Chile (country in South America) [❌ MISPLACED: not a drinks/food vocabulary item]",
  },
  {
    id: 630,
    gloss: "Palestine (country in Western Asia) [❌ MISPLACED: not a home/domestic vocabulary item]",
  },
];

const run = db.transaction(() => {
  for (const fix of fixes) {
    const info = update.run(fix.gloss, fix.id);
    if (info.changes === 0) console.warn(`WARNING: no row updated for id=${fix.id}`);
  }
});

run();
console.log(`Applied ${fixes.length} corrections to lesson_vocab.`);
