/**
 * generate-dialogues-33-43.js
 *
 * Inserts AI-generated EHN dialogues for units 33–43 (which have no
 * english_lesson_unit_id) into lesson_dialogues, then updates phase82_unit_plan
 * so getUnitDialogueContent() can find them via the standard JOIN.
 *
 * Run once: node scripts/generate-dialogues-33-43.js
 */

const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(
  __dirname,
  "../../molina/curriculum/fcn_master_lexicon_phase8_6_primer.sqlite"
);

const db = new Database(DB_PATH);

// ── Dialogue data ────────────────────────────────────────────────────────────
// Each entry: { lessonNumber, synId, lines: [{speaker, utterance, translation}] }
// synId becomes the lesson_unit_id in lesson_dialogues and the
// english_lesson_unit_id in phase82_unit_plan.

const DIALOGUES = [
  {
    lessonNumber: 33,
    synId: "FCN-SYN-0033",
    lines: [
      {
        speaker: "A",
        utterance: "¿Quēmman tiyāuh Mēxicoh?",
        translation: "When are you going to Mexico City?",
      },
      {
        speaker: "B",
        utterance: "Niyāuh in julio. ¿Huan ta, quēmman tiyāuh?",
        translation: "I'm going in July. And you, when are you going?",
      },
      {
        speaker: "A",
        utterance: "Nēhuātl niyāuh in agosto. Huel cuālli in tōnalli.",
        translation: "I'm going in August. The weather is very good.",
      },
      {
        speaker: "B",
        utterance: "Quēma, in agosto āmo piltzic. ¿Huan in enero, āmo ticpiya tequitl?",
        translation: "Yes, in August it is not cold. And in January, don't you have work?",
      },
    ],
  },
  {
    lessonNumber: 34,
    synId: "FCN-SYN-0034",
    lines: [
      {
        speaker: "A",
        utterance: "¿Quēzqui tōmātl ticnequi?",
        translation: "How many tomatoes do you want?",
      },
      {
        speaker: "B",
        utterance: "Nicnequi matlaktli tōmātl. ¿Quēzqui pesos?",
        translation: "I want ten tomatoes. How many pesos?",
      },
      {
        speaker: "A",
        utterance: "Makuili pesos in matlaktli. ¿Huan chilli, quēzqui?",
        translation: "Five pesos for ten. And chili, how many?",
      },
      {
        speaker: "B",
        utterance: "Nāhui chilli, tlazcāmati. Sempoali para nēhuātl.",
        translation: "Four chilies, thank you. Twenty for me.",
      },
    ],
  },
  {
    lessonNumber: 35,
    synId: "FCN-SYN-0035",
    lines: [
      {
        speaker: "A",
        utterance: "¿Tleh tlapali ticnequi in petlatl?",
        translation: "What color do you want for the mat?",
      },
      {
        speaker: "B",
        utterance: "Nicnequi in tenextik. Cuālli tlapali. ¿Huan ta?",
        translation: "I want the grey one. It is a good color. And you?",
      },
      {
        speaker: "A",
        utterance: "Nēhuātl nicnequi in chokolatik. Huel cuālli ixpan nochi.",
        translation: "I want the brown one. It looks very good.",
      },
      {
        speaker: "B",
        utterance: "¿Huan in malakaxtik tēcomātl, tleh tlapali?",
        translation: "And the round bowl, what color is it?",
      },
    ],
  },
  {
    lessonNumber: 36,
    synId: "FCN-SYN-0036",
    lines: [
      {
        speaker: "A",
        utterance: "¿Tleh ticchihua in ohui tequitl?",
        translation: "What do you do about the difficult work?",
      },
      {
        speaker: "B",
        utterance: "Nicchihua in yancuic āchtopa. Āmo patiyo.",
        translation: "I do the new one first. It is not expensive.",
      },
      {
        speaker: "A",
        utterance: "Quēma. ¿Huan in tlapahuaxtli tlacualli, cuālli?",
        translation: "Yes. And the cooked food, is it good?",
      },
      {
        speaker: "B",
        utterance: "Huel cuālli, āmo ohui quichihua. Tlazcāmati.",
        translation: "Very good, it is not hard to make. Thank you.",
      },
    ],
  },
  {
    lessonNumber: 37,
    synId: "FCN-SYN-0037",
    lines: [
      {
        speaker: "A",
        utterance: "¿Ōtiquitta in oselotl pan kuajtla?",
        translation: "Did you see the jaguar in the jungle?",
      },
      {
        speaker: "B",
        utterance: "Āmo oselotl, ōniquitta in masatl huan cē akoatl.",
        translation: "No jaguar, I saw a deer and a water snake.",
      },
      {
        speaker: "A",
        utterance: "¿Huan in kocho, cāmpa cateh?",
        translation: "And the parrot, where is it?",
      },
      {
        speaker: "B",
        utterance: "In kocho nicān yan. Motlahtoa, āmo tlaōca.",
        translation: "The parrot is right here. It speaks and does not cry.",
      },
    ],
  },
  {
    lessonNumber: 38,
    synId: "FCN-SYN-0038",
    lines: [
      {
        speaker: "A",
        utterance: "¿Ticchihua in eloatoli āxcan?",
        translation: "Are you making sweet corn atole today?",
      },
      {
        speaker: "B",
        utterance: "Quēma, nicchihua eloatoli huan nicmacah chankaka. ¿Ticnequi?",
        translation: "Yes, I'm making atole and adding piloncillo. Do you want some?",
      },
      {
        speaker: "A",
        utterance: "Huel nicnequi. ¿Huan in sintli, cāmpa otimomachtih?",
        translation: "I really want some. And the corn, where did you learn about it?",
      },
      {
        speaker: "B",
        utterance: "Nocnān nēchmachtih. Huel cuālli in sintli tlacualli.",
        translation: "My mother taught me. Corn food is very good.",
      },
    ],
  },
  {
    lessonNumber: 39,
    synId: "FCN-SYN-0039",
    lines: [
      {
        speaker: "A",
        utterance: "¿Cāmpa in amatlahcuilolli?",
        translation: "Where is the letter?",
      },
      {
        speaker: "B",
        utterance: "In amatlahcuilolli nicān pan coxtalli. ¿Tlen ticnequi?",
        translation: "The letter is here in the sack. What do you want?",
      },
      {
        speaker: "A",
        utterance: "Nicnequi nicpōhua in amatlahcuilolli. Huel tlazohtli.",
        translation: "I want to read the letter. It is very beloved.",
      },
      {
        speaker: "B",
        utterance: "Cuālli. ¿Huan in chachapale, cāmpa tiquitztoc?",
        translation: "Good. And the pot, where are you looking?",
      },
    ],
  },
  {
    lessonNumber: 40,
    synId: "FCN-SYN-0040",
    lines: [
      {
        speaker: "A",
        utterance: "¿Ōtiquitta in ateskatl?",
        translation: "Did you see the lake?",
      },
      {
        speaker: "B",
        utterance: "Quēma, huel hueyac. Nicān mani in xali huan in soyatl.",
        translation: "Yes, very large. Here there is sand and a palm tree.",
      },
      {
        speaker: "A",
        utterance: "¿Huan in xochiatl, cāmpa?",
        translation: "And the flower water, where is it?",
      },
      {
        speaker: "B",
        utterance: "In xochiatl pan tlalmayamitl. Huel xōchipalli.",
        translation: "The perfume is in the field. Very fragrant.",
      },
    ],
  },
  {
    lessonNumber: 41,
    synId: "FCN-SYN-0041",
    lines: [
      {
        speaker: "A",
        utterance: "¿Tlen ticchiah pan altepetl?",
        translation: "What do you look for in the city?",
      },
      {
        speaker: "B",
        utterance: "Nicchiah notēch maseuali. ¿Huan ta, cāmpa tiyāuh?",
        translation: "I look for people like me. And you, where are you going?",
      },
      {
        speaker: "A",
        utterance: "Nēhuātl nicnequi niitztoc pan chinanko. Huel pactli.",
        translation: "I want to stay in the village. It is very joyful.",
      },
      {
        speaker: "B",
        utterance: "Quēma, in chinanko cuālli. Āmo hueyac in altepetl.",
        translation: "Yes, the village is good. The city is not great.",
      },
    ],
  },
  {
    lessonNumber: 42,
    synId: "FCN-SYN-0042",
    lines: [
      {
        speaker: "A",
        utterance: "¿Tlen ticchihua āxcan?",
        translation: "What are you doing today?",
      },
      {
        speaker: "B",
        utterance: "Nimaltia huan nechpatlania in pāpalotl. ¿Huan ta?",
        translation: "I'm bathing and the butterfly flies around me. And you?",
      },
      {
        speaker: "A",
        utterance: "Nēhuātl nixaua pan milpa. Nicnequi niccua āchtopa.",
        translation: "I am digging in the cornfield. I want to eat first.",
      },
      {
        speaker: "B",
        utterance: "Cuālli, nēhuātl nimitzneltoka. Tlaxkamati.",
        translation: "Good, I believe you. Thank you.",
      },
    ],
  },
  {
    lessonNumber: 43,
    synId: "FCN-SYN-0043",
    lines: [
      {
        speaker: "A",
        utterance: "¿Titlahtoa nāhuatl?",
        translation: "Do you speak Nahuatl?",
      },
      {
        speaker: "B",
        utterance: "Āmo huel miac, achiyok nimomachtia yolic yolic. ¿Huan ta?",
        translation: "Not a lot, I'm learning a little more little by little. And you?",
      },
      {
        speaker: "A",
        utterance: "Nēhuātl makuilpa nimomachtia in tōnal, nohquiya nicān pan caltlamachticān.",
        translation: "I study five times a day, moreover here at school.",
      },
      {
        speaker: "B",
        utterance: "Huel cuālli. Zampa titlacah huan miac ticmatih.",
        translation: "Very good. We learn again and we know a lot.",
      },
    ],
  },
];

// ── Insert ────────────────────────────────────────────────────────────────────

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Find the current max dialogue ID number
const maxRow = db
  .prepare("SELECT MAX(lesson_dialogue_id) as mx FROM lesson_dialogues")
  .get();
const maxNumMatch = (maxRow.mx || "FCN-LDG-000000").match(/(\d+)$/);
let nextNum = maxNumMatch ? parseInt(maxNumMatch[1], 10) + 1 : 329;

// Themes for lesson_units titles
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

const insertLessonUnit = db.prepare(`
  INSERT OR IGNORE INTO lesson_units
    (lesson_unit_id, source_id, lesson_slug, lesson_title,
     proficiency_band, editorial_status)
  VALUES (?, 'FCN-SRC-NHTL-001', ?, ?, 'A1', 'AI_generated')
`);

const insertDialogue = db.prepare(`
  INSERT OR IGNORE INTO lesson_dialogues
    (lesson_dialogue_id, lesson_unit_id, dialogue_order,
     speaker_label, utterance_original, utterance_normalized,
     translation_en, attestation_tier)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'AI_generated')
`);

const updateUnit = db.prepare(`
  UPDATE phase82_unit_plan
  SET english_lesson_unit_id = ?
  WHERE lesson_number = ?
`);

const runAll = db.transaction(() => {
  for (const unit of DIALOGUES) {
    // Skip if already done (idempotent)
    const existing = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM phase82_unit_plan WHERE lesson_number = ? AND english_lesson_unit_id IS NOT NULL"
      )
      .get(unit.lessonNumber);
    if (existing.cnt > 0) {
      console.log(`Unit ${unit.lessonNumber}: already has english_lesson_unit_id, skipping.`);
      continue;
    }

    // Insert the synthetic lesson_unit row first (satisfies FK constraint)
    const title = UNIT_THEMES[unit.lessonNumber] || `Unit ${unit.lessonNumber}`;
    const slug = `syn-unit-${unit.lessonNumber}-${title.toLowerCase().replace(/\s+/g, "-")}`;
    insertLessonUnit.run(unit.synId, slug, title);

    // Insert dialogue lines
    unit.lines.forEach((line, i) => {
      const id = `FCN-LDG-${String(nextNum).padStart(6, "0")}`;
      nextNum++;
      insertDialogue.run(
        id,
        unit.synId,
        i + 1,
        line.speaker,
        line.utterance,
        line.utterance,
        line.translation
      );
    });

    // Update unit plan
    updateUnit.run(unit.synId, unit.lessonNumber);

    console.log(
      `Unit ${unit.lessonNumber}: inserted lesson_unit + ${unit.lines.length} dialogue lines (id ${unit.synId})`
    );
  }
});

runAll();
console.log("Done. Dialogue generation for units 33–43 complete.");
