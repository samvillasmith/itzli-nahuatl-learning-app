/**
 * regenerate-dialogues-33-43.js
 *
 * Canonical reviewed dialogue rebuild for Units 33–43. These dialogues retain
 * source-style spelling in storage and are rendered in the app's practical
 * INALI spelling. They are maintained to:
 *
 *   1. Use IDIEZ spellings throughout (c/qu for /k/, hu/uh for /w/, x for /ʃ/,
 *      tl as digraph, z/c for /s/, saltillo "h", macron vowels ā ē ī ō).
 *   2. Use only vocabulary the student has already encountered (Units 1–32)
 *      or that the unit's theme explicitly introduces.
 *   3. Avoid grammatically shaky constructions (e.g. unneeded causatives,
 *      non-existent loanword verbs).
 *
 * Idempotent. If synthetic lesson_unit rows or dialogue rows already exist
 * for lessons 33–43, this script deletes them and re-inserts fresh versions.
 *
 *   node scripts/regenerate-dialogues-33-43.js          (dry run)
 *   node scripts/regenerate-dialogues-33-43.js --apply
 */

const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path");
const { validateEhnLine } = require("./generate-dialogues");

const APPLY = process.argv.includes("--apply");
const FIRST_DIALOGUE_NUMBER = 329;

const DB_PATH = resolveDbPath();
const db = new Database(DB_PATH);

// ── Unit themes ─────────────────────────────────────────────────────────────
const UNIT_THEMES = {
  33: "The Months of the Year",
  34: "Numbers and Counting",
  35: "Colors, Sizes and Shapes",
  36: "Describing Things",
  37: "Animals",
  38: "More Food and Ingredients",
  39: "Around the House",
  40: "Nature and the World",
  41: "People and Roles",
  42: "More Action Words",
  43: "Adverbs and Modifiers",
};

// ── Corrected dialogues (IDIEZ orthography) ─────────────────────────────────
const DIALOGUES = [
  {
    lessonNumber: 33,
    synId: "FCN-SYN-0033",
    lines: [
      { speaker: "A", utterance: "¿Quēmman tiyāuh Mēxihcoh?",                                     translation: "When are you going to Mexico City?" },
      { speaker: "B", utterance: "Niyāuh ipan julio. ¿Huan ta, quēmman tiyāuh?",                  translation: "I'm going in July. And you, when are you going?" },
      { speaker: "A", utterance: "Na niyāuh ipan agosto. Huel cuālli in tōnalli.",                translation: "I'm going in August. The weather is very nice." },
      { speaker: "B", utterance: "Quēna, ipan agosto axcecec. Huan ipan enero, ¿ticpiya tequitl?", translation: "Yes, in August it isn't cold. And in January, do you have work?" },
    ],
  },
  {
    lessonNumber: 34,
    synId: "FCN-SYN-0034",
    lines: [
      { speaker: "A", utterance: "¿Quēzqui tomātl ticnequi?",                                     translation: "How many tomatoes do you want?" },
      { speaker: "B", utterance: "Nicnequi mahtlactli tomātl. ¿Quēzqui pesos quipatiyo?",        translation: "I want ten tomatoes. How much do they cost?" },
      { speaker: "A", utterance: "Macuilli pesos in mahtlactli. ¿Huan chīlli, quēzqui ticnequi?",  translation: "Five pesos for ten. And chili, how many do you want?" },
      { speaker: "B", utterance: "Nāhui chīlli, tlazohcāmati.",                                  translation: "Four chilies, thank you." },
    ],
  },
  {
    lessonNumber: 35,
    synId: "FCN-SYN-0035",
    lines: [
      { speaker: "A", utterance: "¿Tlen tlapalli ticnequi ipan petlatl?",                         translation: "What color do you want for the mat?" },
      { speaker: "B", utterance: "Nicnequi in tenextic. Cuālli tlapalli. ¿Huan ta?",              translation: "I want the grey one. It's a nice color. And you?" },
      { speaker: "A", utterance: "Na nicnequi in chocolatic. Huel cuālli tlapalli.",             translation: "I want the brown one. It's a very nice color." },
      { speaker: "B", utterance: "¿Huan in malacachtic tecomātl, tlen tlapalli?",                 translation: "And the round bowl, what color is it?" },
    ],
  },
  {
    lessonNumber: 36,
    synId: "FCN-SYN-0036",
    lines: [
      { speaker: "A", utterance: "¿Totōnic in tlacualli?",                                      translation: "Is the food hot?" },
      { speaker: "B", utterance: "Axcanah. Cecec in tlacualli.",                                translation: "No. The food is cold." },
      { speaker: "A", utterance: "¿Patiyoh in tlacualli?",                                      translation: "Is the food expensive?" },
      { speaker: "B", utterance: "Axcanah patiyoh. Huel cuālli.",                               translation: "It isn't expensive. It's very good." },
    ],
  },
  {
    lessonNumber: 37,
    synId: "FCN-SYN-0037",
    lines: [
      { speaker: "A", utterance: "¿Tiquittac in ocēlōtl ipan cuauhtlah?",                        translation: "Did you see the jaguar in the forest?" },
      { speaker: "B", utterance: "Axcanah. Niquittac in mazatl huan cē cōātl.",                  translation: "No. I saw a deer and a snake." },
      { speaker: "A", utterance: "¿Huan in toznēnē, cāmpa itztoc?",                              translation: "And the parrot, where is it?" },
      { speaker: "B", utterance: "In toznēnē nicān itztoc. Tlahtoa.",                            translation: "The parrot is right here. It speaks." },
    ],
  },
  {
    lessonNumber: 38,
    synId: "FCN-SYN-0038",
    lines: [
      { speaker: "A", utterance: "¿Ticchīhua eloatolli āxcan?",                                   translation: "Are you making sweet-corn atole today?" },
      { speaker: "B", utterance: "Quēna, nicchīhua eloatolli huan nicmaca chancaca. ¿Ticnequi?",  translation: "Yes, I'm making atole and adding piloncillo. Do you want some?" },
      { speaker: "A", utterance: "Quēna. ¿Huan in chīlli, cāmpa onca?",                           translation: "Yes. And the chili, where is it?" },
      { speaker: "B", utterance: "In chīlli onca nicān. Huel cuālli tlacualli.",                 translation: "The chili is here. It's very good food." },
    ],
  },
  {
    lessonNumber: 39,
    synId: "FCN-SYN-0039",
    lines: [
      { speaker: "A", utterance: "¿Cāmpa itztoc in āmatlahcuilōlli?",                            translation: "Where is the letter?" },
      { speaker: "B", utterance: "In āmatlahcuilōlli nicān itztoc ipan folsah. ¿Tlen ticnequi?", translation: "The letter is here in the bag. What do you want?" },
      { speaker: "A", utterance: "Nicnequi nicpōhua in āmatlahcuilōlli. Huel tlazohtli.",         translation: "I want to read the letter. It's very dear." },
      { speaker: "B", utterance: "Cuālli. ¿Huan in chachapalli, cānin ticpiya?",                  translation: "Good. And the clay pot, where do you have it?" },
    ],
  },
  {
    lessonNumber: 40,
    synId: "FCN-SYN-0040",
    lines: [
      { speaker: "A", utterance: "¿Tiquitta in hueyātl?",                                       translation: "Do you see the sea?" },
      { speaker: "B", utterance: "Quēna. In hueyātl nel huēyi.",                                translation: "Yes. The sea is very large." },
      { speaker: "A", utterance: "¿Huan in xālli, cāmpa onca?",                                 translation: "And the sand, where is it?" },
      { speaker: "B", utterance: "Nicān onca xālli huan zoyatl.",                               translation: "Here there is sand and a palm tree." },
    ],
  },
  {
    lessonNumber: 41,
    synId: "FCN-SYN-0041",
    lines: [
      { speaker: "A", utterance: "¿Tlen tictemoa ipan āltepētl?",                               translation: "What are you looking for in the town?" },
      { speaker: "B", utterance: "Nictemoa nocnīuh. ¿Huan ta, cāmpa tiyāuh?",                   translation: "I'm looking for my friend. And you, where are you going?" },
      { speaker: "A", utterance: "Na niyāuh ipan chinanco.",                                   translation: "I'm going to the village." },
      { speaker: "B", utterance: "Quēna, in chinanco cuālli.",                                 translation: "Yes, the village is good." },
    ],
  },
  {
    lessonNumber: 42,
    synId: "FCN-SYN-0042",
    lines: [
      { speaker: "A", utterance: "¿Tlen ticchīhua āxcan?",                                        translation: "What are you doing today?" },
      { speaker: "B", utterance: "Nipixca pan mīllah huan nitlahcuiloa. ¿Huan ta?",             translation: "I'm harvesting in the field and writing. And you?" },
      { speaker: "A", utterance: "Na nitlaxahua ipan mīllah. Nicnequi nitlacuāz āchtopa.",        translation: "I'm digging in the cornfield. I want to eat first." },
      { speaker: "B", utterance: "Cuālli, nimitzneltoca. Tlazohcāmati.",                          translation: "Good, I believe you. Thank you." },
    ],
  },
  {
    lessonNumber: 43,
    synId: "FCN-SYN-0043",
    lines: [
      { speaker: "A", utterance: "¿Titlahtoa nāhuatl?",                                           translation: "Do you speak Nahuatl?" },
      { speaker: "B", utterance: "Axcanah nel miac. Yōlic yōlic nimomachtia. ¿Huan ta?",         translation: "Not very much. Little by little I'm learning. And you?" },
      { speaker: "A", utterance: "Na nochipa nimomachtia nicān caltlamachticān.",                translation: "I always study here at school." },
      { speaker: "B", utterance: "Huel cuālli. Ocsepa titlahtōzqueh.",                          translation: "Very good. We'll talk again." },
    ],
  },
];

// ── Apply ───────────────────────────────────────────────────────────────────

db.pragma("journal_mode = DELETE");
db.pragma("foreign_keys = ON");

const existingUnitIds = DIALOGUES.map((d) => d.synId);
const placeholders = existingUnitIds.map(() => "?").join(",");

// Discover what's currently there so we can report before/after.
const priorUnits = db
  .prepare(`SELECT lesson_unit_id FROM lesson_units WHERE lesson_unit_id IN (${placeholders})`)
  .all(...existingUnitIds)
  .map((r) => r.lesson_unit_id);
const priorDialogues = db
  .prepare(`SELECT COUNT(*) AS n FROM lesson_dialogues WHERE lesson_unit_id IN (${placeholders})`)
  .get(...existingUnitIds).n;

console.log(`Existing synthetic lesson_units for 33–43: ${priorUnits.length}`);
console.log(`Existing synthetic dialogue rows:            ${priorDialogues}\n`);

if (!APPLY) {
  console.log("── DRY RUN ──");
  console.log(`Will DELETE + re-INSERT ${priorUnits.length || DIALOGUES.length} lesson_units`);
  let totalLines = 0;
  for (const d of DIALOGUES) totalLines += d.lines.length;
  console.log(`Will insert ${totalLines} corrected dialogue lines.`);
  console.log("\nRun again with --apply to apply.");
  db.close();
  process.exit(0);
}

const deleteDialogues = db.prepare(
  `DELETE FROM lesson_dialogues WHERE lesson_unit_id IN (${placeholders})`
);
const clearUnitPlan = db.prepare(
  `UPDATE phase82_unit_plan SET english_lesson_unit_id = NULL WHERE lesson_number BETWEEN 33 AND 43`
);
const deleteLessonUnits = db.prepare(
  `DELETE FROM lesson_units WHERE lesson_unit_id IN (${placeholders})`
);

const insertLessonUnit = db.prepare(`
  INSERT INTO lesson_units
    (lesson_unit_id, source_id, lesson_slug, lesson_title, proficiency_band, editorial_status)
  VALUES (?, 'FCN-SRC-NHTL-001', ?, ?, 'A1', 'AI_generated')
`);

const insertDialogue = db.prepare(`
  INSERT INTO lesson_dialogues
    (lesson_dialogue_id, lesson_unit_id, dialogue_order,
     speaker_label, utterance_original, utterance_normalized,
     translation_en, attestation_tier)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'AI_generated')
`);

const updateUnitPlan = db.prepare(
  `UPDATE phase82_unit_plan SET english_lesson_unit_id = ? WHERE lesson_number = ?`
);

const run = db.transaction(() => {
  deleteDialogues.run(...existingUnitIds);
  clearUnitPlan.run();
  deleteLessonUnits.run(...existingUnitIds);

  let nextNum = FIRST_DIALOGUE_NUMBER;
  for (const unit of DIALOGUES) {
    const title = UNIT_THEMES[unit.lessonNumber] || `Unit ${unit.lessonNumber}`;
    const slug = `syn-unit-${unit.lessonNumber}-${title.toLowerCase().replace(/\s+/g, "-")}`;

    insertLessonUnit.run(unit.synId, slug, title);

    unit.lines.forEach((line, i) => {
      if (!validateEhnLine(line.utterance)) {
        console.warn(`Skipped Unit ${unit.lessonNumber} line ${i + 1}: failed EHN content lint: ${line.utterance}`);
        return;
      }
      const id = `FCN-LDG-${String(nextNum).padStart(6, "0")}`;
      nextNum++;
      insertDialogue.run(
        id, unit.synId, i + 1,
        line.speaker, line.utterance, line.utterance, line.translation
      );
    });

    updateUnitPlan.run(unit.synId, unit.lessonNumber);
    console.log(`Unit ${unit.lessonNumber}: ${unit.lines.length} lines (${unit.synId})`);
  }
});
run();

console.log("\nDone. Dialogues for units 33–43 regenerated with IDIEZ orthography.");
db.close();
