#!/usr/bin/env node
/**
 * Phase 3: Add hand-picked high-frequency EHN words that the lexicon mining
 * missed — common everyday vocabulary every beginner needs.
 *
 * These fill gaps in units 11-32 (which didn't benefit from the
 * thematic expansion targeting units 33-43) and add universally
 * important words (clothing, weather, emotions, daily routines).
 */

const { resolveDbPath } = require("./_db-path");
const Database = require("better-sqlite3");
const db = new Database(resolveDbPath());

const WORDS = [
  // ── Greetings & social (Unit 11) ─────────────────────────────
  { form: "tlazohcamati", gloss: "thank you", pos: "intj", unit: 11 },
  { form: "nimitztlazohcamati", gloss: "I thank you (formal)", pos: "intj", unit: 11 },
  { form: "ximopanolti", gloss: "welcome, come in", pos: "verb", unit: 11 },
  { form: "tlanextia", gloss: "good morning (lit. it dawns)", pos: "verb", unit: 11 },
  { form: "pannotoc", gloss: "good afternoon (lit. midday passes)", pos: "verb", unit: 11 },

  // ── Daily life verbs (Unit 7 — dividing up the day) ──────────
  { form: "tequiti", gloss: "to work", pos: "verb", unit: 7 },
  { form: "ahci", gloss: "to arrive", pos: "verb", unit: 7 },
  { form: "pehua", gloss: "to begin, to start", pos: "verb", unit: 7 },
  { form: "tlami", gloss: "to end, to finish", pos: "verb", unit: 7 },
  { form: "macehua", gloss: "to rest, to deserve", pos: "verb", unit: 7 },

  // ── Commands / imperatives (Unit 19 — Stand Up!) ─────────────
  { form: "ximoquetza", gloss: "stand up!", pos: "verb", unit: 19 },
  { form: "xitlahcuilo", gloss: "write!", pos: "verb", unit: 19 },
  { form: "xitlapohua", gloss: "read! / count!", pos: "verb", unit: 19 },
  { form: "ximocuepa", gloss: "turn around!", pos: "verb", unit: 19 },
  { form: "xitlacua", gloss: "eat!", pos: "verb", unit: 19 },
  { form: "xitlahto", gloss: "speak!", pos: "verb", unit: 19 },

  // ── Possessives (Unit 8) ─────────────────────────────────────
  { form: "notlacal", gloss: "my property", pos: "noun", unit: 8 },
  { form: "tochan", gloss: "our home", pos: "noun", unit: 8 },
  { form: "motata", gloss: "your father", pos: "noun", unit: 8 },
  { form: "inana", gloss: "his/her mother", pos: "noun", unit: 8 },

  // ── Likes / emotions (Unit 18 — What I Like) ────────────────
  { form: "cualantli", gloss: "anger", pos: "noun", unit: 18 },
  { form: "papaquiliz", gloss: "happiness, joy", pos: "noun", unit: 18 },
  { form: "tlazohtlaliztli", gloss: "love", pos: "noun", unit: 18 },
  { form: "nemouhtiliztli", gloss: "fear, fright", pos: "noun", unit: 18 },
  { form: "tlaocoyaliztli", gloss: "sadness", pos: "noun", unit: 18 },

  // ── Past tense verbs extras (Units 14-16) ────────────────────
  { form: "otlacuac", gloss: "he/she ate (past)", pos: "verb", unit: 14 },
  { form: "oquicac", gloss: "he/she heard (past)", pos: "verb", unit: 14 },
  { form: "oahcic", gloss: "he/she arrived (past)", pos: "verb", unit: 15 },
  { form: "oquichihuac", gloss: "he/she made it (past)", pos: "verb", unit: 15 },
  { form: "otequitic", gloss: "he/she worked (past)", pos: "verb", unit: 16 },
  { form: "otlahtoc", gloss: "he/she spoke (past)", pos: "verb", unit: 16 },

  // ── Conditionals (Unit 30) ──────────────────────────────────
  { form: "intla", gloss: "if", pos: "conj", unit: 30 },
  { form: "nozo", gloss: "or", pos: "conj", unit: 30 },
  { form: "pampa", gloss: "because", pos: "conj", unit: 30 },
  { form: "huan", gloss: "and", pos: "conj", unit: 30 },
  { form: "pero", gloss: "but", pos: "conj", unit: 30 },

  // ── Object markers (Unit 32) ─────────────────────────────────
  { form: "tlatequi", gloss: "to cut (something)", pos: "verb", unit: 32 },
  { form: "tlacua", gloss: "to eat (something)", pos: "verb", unit: 32 },
  { form: "tlapohua", gloss: "to count/read (something)", pos: "verb", unit: 32 },
  { form: "tlachia", gloss: "to watch, to look at things", pos: "verb", unit: 32 },

  // ── Clothing (Unit 36 — Describing Things) ──────────────────
  { form: "tilmahtli", gloss: "cloak, blanket garment", pos: "noun", unit: 36 },
  { form: "huipilli", gloss: "blouse (women's garment)", pos: "noun", unit: 36 },
  { form: "cactli", gloss: "sandal, shoe", pos: "noun", unit: 36 },

  // ── Weather (Unit 40 — Nature) ──────────────────────────────
  { form: "cehuetzi", gloss: "it hails", pos: "verb", unit: 40 },
  { form: "ehecatl", gloss: "wind", pos: "noun", unit: 40 },
  { form: "tlahuilli", gloss: "light, illumination", pos: "noun", unit: 40 },
  { form: "tlayohua", gloss: "it gets dark", pos: "verb", unit: 40 },

  // ── More numbers (Unit 34) ──────────────────────────────────
  { form: "matlactli", gloss: "ten", pos: "num", unit: 34 },
  { form: "cempohualli", gloss: "twenty", pos: "num", unit: 34 },
  { form: "macuilli", gloss: "five", pos: "num", unit: 34 },
  { form: "nahui", gloss: "four", pos: "num", unit: 34 },
  { form: "chicome", gloss: "seven", pos: "num", unit: 34 },
  { form: "chicuace", gloss: "six", pos: "num", unit: 34 },
  { form: "chicuei", gloss: "eight", pos: "num", unit: 34 },
  { form: "chicnahui", gloss: "nine", pos: "num", unit: 34 },

  // ── Kitchen & food prep (Unit 23 — Inside the House) ────────
  { form: "comalli", gloss: "griddle (for tortillas)", pos: "noun", unit: 23 },
  { form: "metlatl", gloss: "grinding stone (metate)", pos: "noun", unit: 23 },
  { form: "molcaxitl", gloss: "mortar, molcajete", pos: "noun", unit: 23 },
  { form: "tecolli", gloss: "charcoal", pos: "noun", unit: 23 },
  { form: "tenamaztli", gloss: "hearthstone (three stones for fire)", pos: "noun", unit: 23 },

  // ── Marketplace extras (Unit 27) ─────────────────────────────
  { form: "tlanamacac", gloss: "seller, merchant", pos: "noun", unit: 27 },
  { form: "tlacohuani", gloss: "buyer", pos: "noun", unit: 27 },
  { form: "patiyo", gloss: "price, worth", pos: "noun", unit: 27 },

  // ── Adverbs & connectors (Unit 43) ──────────────────────────
  { form: "zannoihqui", gloss: "likewise, the same way", pos: "adv", unit: 43 },
  { form: "achtopa", gloss: "first, beforehand", pos: "adv", unit: 43 },
  { form: "zatepan", gloss: "later, afterwards", pos: "adv", unit: 43 },
  { form: "nochipa", gloss: "always", pos: "adv", unit: 43 },
  { form: "aicmo", gloss: "never again", pos: "adv", unit: 43 },
  { form: "quemah", gloss: "yes (emphatic)", pos: "adv", unit: 43 },
  { form: "ayamo", gloss: "not yet", pos: "adv", unit: 43 },
  { form: "ocachi", gloss: "more", pos: "adv", unit: 43 },
  { form: "zan", gloss: "only, just", pos: "adv", unit: 43 },
  { form: "niman", gloss: "immediately, right away", pos: "adv", unit: 43 },
];

// ── Dedup against existing ────────────────────────────────────────────────────
const existingForms = new Set(
  db.prepare("SELECT LOWER(display_form) as f FROM lesson_vocab").all().map((r) => r.f)
);

let maxId = db.prepare("SELECT MAX(id) as m FROM lesson_vocab").get().m || 0;
const unitRanks = {};
db.prepare("SELECT lesson_number, MAX(rank) as mr FROM lesson_vocab GROUP BY lesson_number").all()
  .forEach((r) => { unitRanks[r.lesson_number] = r.mr || 0; });

const insert = db.prepare(`
  INSERT INTO lesson_vocab (id, lesson_number, rank, entry_id, display_form, ehn_spoken_form, gloss_en, part_of_speech, semantic_domain, pedagogical_score)
  VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'curated_expansion', 0)
`);

let added = 0;
let skipped = 0;

const txn = db.transaction(() => {
  for (const w of WORDS) {
    if (existingForms.has(w.form.toLowerCase())) {
      skipped++;
      continue;
    }
    maxId++;
    unitRanks[w.unit] = (unitRanks[w.unit] || 0) + 1;
    insert.run(maxId, w.unit, unitRanks[w.unit], w.form, w.form, w.gloss, w.pos);
    existingForms.add(w.form.toLowerCase());
    added++;
  }
});
txn();

const total = db.prepare("SELECT COUNT(*) as n FROM lesson_vocab").get().n;
console.log(`Added ${added} curated words (${skipped} skipped as duplicates).`);
console.log(`Total lesson_vocab: ${total}`);

db.close();
