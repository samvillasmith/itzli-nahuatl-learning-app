#!/usr/bin/env node
/**
 * Adds a translation_en column to primer_constructions and populates it
 * with English translations for dialogue and sentence-based examples.
 * Also fixes ehn_spoken_form for pronoun IDs 49/50/51.
 */

const path = require("path");
const { resolveDbPath } = require("./_db-path");
const Database = require("better-sqlite3");
const db = new Database(resolveDbPath());

// ── 1. Add translation_en column if missing ──────────────────────────────────
const cols = db.prepare("PRAGMA table_info('primer_constructions')").all();
if (!cols.find((c) => c.name === "translation_en")) {
  db.exec("ALTER TABLE primer_constructions ADD COLUMN translation_en TEXT");
  console.log("Added translation_en column.");
} else {
  console.log("translation_en column already exists.");
}

// ── 2. Translations keyed by construction_label ──────────────────────────────
const translations = {
  // Unit 1
  "Construction 43": "Nahuatl consonant digraphs: ch m n p t y l cu uc qu hu uh h x tl tz z",
  "Construction 42":
    'For example, the word "cōuhqui" (she bought something) is pronounced as "cōhquī," emphasizing the first vowel.',
  "Construction 41":
    'For example, the word "teuctli" (lord/sir) is pronounced as "tēktli," emphasizing the first vowel.',
  "Construction 45": "Examples of vowels",
  "Construction 44": "Examples of consonants",

  // Unit 2
  "Construction 46": "A: Hello, good day teacher.",
  "Construction 47": "Our questions and phrases for class",

  // Unit 3 — dialogues
  "Construction 54":
    "A: Ah, that's good, I'm from Mexico City. And you, what do you do here in Mexico?",
  "Construction 51": "A: My name is Juana. Where are you from?",
  "Construction 58": "A: Oh, that's good, we'll see each other later.",
  "Construction 49": "A: Hello, what is your name?",
  "Construction 55":
    "B: I study and I teach at the school of UNAM.",
  "Construction 57": "B: I teach Nahuatl.",
  "Construction 52": "B: I am from Tecomate, Chicontepec.",
  "Construction 50": "B: Hello, my name is Paty. And you?",
  "Construction 48": "Eating tacos in Chicontepec",

  // Unit 3 — grammar/paradigm
  "Construction 64":
    "All absolute (non-possessed) nouns are marked by their suffixes: -tl, -tli, -li, -n, or zero.",
  "Construction 73": '"They are women"',
  "Construction 70": '"He/she is a woman"',
  "Construction 66": '"pans" (comalli / comalmeh)',
  "Construction 56": "I am a student and I teach at the school of the UNAM.",
  "Construction 53": "I am from Tecomate, Chicontepec.",
  "Construction 72": '"You all are women"',
  "Construction 78": '"You all are indigenous"',
  "Construction 76": '"He/she is indigenous"',
  "Construction 65": '"indigenous person" (mācēhualmeh)',
  "Construction 79": '"They are indigenous"',
  "Construction 60": "ni– (noun base) –tl/tli/li/n/zero  →  'I am a ___'",
  "Construction 74": '"I am indigenous"',
  "Construction 62": "zero– (noun base) –tl/tli/li/n/zero  →  'He/she is a ___'",
  "Construction 67": '"machines, metals" (tepōztli / tepōzmeh)',
  "Construction 61": "ti– (noun base) –tl/tli/li/n/zero  →  'You are a ___'",
  "Construction 71": '"We are women"',
  "Construction 69": '"You are a woman"',
  "Construction 75": '"You are indigenous"',
  "Construction 77": '"We are indigenous"',
  "Construction 63": "Examples of absolute nouns without a possessor",
  "Construction 68":
    "Examples of absolute noun stems",
  "Construction 59": "Absolute nouns (non-possessed forms)",

  // Unit 4 — numbers & colors
  "Construction 100": "There are nine books.",
  "Construction 93": "There are five bananas and they are yellow.",
  "Construction 90": "There are three seashells, one is shiny.",
  "Construction 104": "Big numbers",
  "Construction 102": "I see ten spheres.",
  "Construction 95": "There are six oranges and they are orange-colored.",
  "Construction 98": "There are eight sapotes and they are yellow.",
  "Construction 88": "There are two chayotes and they are green.",
  "Construction 91": "How many toys are there?",
  "Construction 94": "How many oranges are there and what color are they?",
  "Construction 87": "How many chayotes are there and what color are they?",
  "Construction 101": "How many spheres do you see?",
  "Construction 86": "How many tortillas are there on the pan?",
  "Construction 89": "How many seashells are there and what color are they?",
  "Construction 80": "How to say the names of basic colors",
  "Construction 97": "How many sapotes are there and what color are they?",
  "Construction 92": "How many bananas are there and what color are they?",
  "Construction 96": "How many apples are there on the table?",
  "Construction 107":
    "How old are you? / How many pencils/pens do I have?",
  "Construction 99": "How many books are there in the picture?",
  "Construction 81": "Questions with the colors",
  "Construction 85": "Questions with the numbers",
  "Construction 103": "The names of the numbers, 11–20",
  "Construction 84": "The names of the numbers, 0–10",
  "Construction 82": "What color do you like?",
  "Construction 83": "What color are your pants?",
  "Construction 106": "Answer the following questions",
  "Construction 105": '"forty" (2 × 20)',

  // Unit 5 — professions
  "Construction 111": "A: I am also a student. I study mathematics.",
  "Construction 109": "A: Hello Catalina, what do you do for work?",
  "Construction 112": "B: That's good, nice to meet you too.",
  "Construction 113": "B: I teach Nahuatl. And you?",
  "Construction 110": "B: I teach Nahuatl. And you?",
  "Construction 127": "Here we present other titles related to professions:",
  "Construction 119": '"you all are students"',
  "Construction 125": '"you all are street sweepers"',
  "Construction 120": '"they are students"',
  "Construction 117": '"he/she is a student"',
  "Construction 115": '"I am a student"',
  "Construction 121": '"I am a street sweeper"',
  "Construction 118": '"we are students"',
  "Construction 116": '"you are a student"',
  "Construction 124": '"we are street sweepers"',
  "Construction 122": '"you are a street sweeper"',
  "Construction 114":
    "tlachpana (to sweep) → tlachpānquetl (one who sweeps) → tlachpanānih (those who sweep)",
  "Construction 126": '"they are street sweepers"',
  "Construction 123": '"he/she is a street sweeper"',
  "Construction 128":
    "tlamachtihquetl (teacher) → tlamachtia (to teach) → tlamachtianih (teachers)",
  "Construction 108": "Xōchipitzāhuatl performed by El Trío Colatlán del Tío Laco",

  // Unit 6 — daily routine
  "Construction 136": '"to bathe, shower"',
  "Construction 135": "I sleep at twelve o'clock.",
  "Construction 133": '"I study Nahuatl."',
  "Construction 132": '"I work at school."',
  "Construction 134": '"I teach Nahuatl in the morning."',
  "Construction 131": '"I am from Mexico."',
  "Construction 129":
    "Example game with actions and a sentence pattern",
  "Construction 130": '"to be from, come from"',

  // Unit 7 — daily activities / reading comprehension
  "Construction 143": "Answer the following questions:",
  "Construction 148": "Answer the following questions:",
  "Construction 154": "Answer the following questions:",
  "Construction 159": "Choose the correct answer:",
  "Construction 151": "Who is cooking the beans? ___.",
  "Construction 142":
    "In the morning Juana gets up at six o'clock. The first thing she does is wash her face and bathe.",
  "Construction 150": "Maria ___ chili, ___ and ___.",
  "Construction 147":
    "Maria helps cook with her mother; her mother puts on the beans and Maria cuts the chili.",
  "Construction 137": "Chicontepec Market",
  "Construction 140": '"very early"',
  "Construction 158":
    "At night I eat a piece of bread and drink coffee, then I do housework and sometimes I read.",
  "Construction 153":
    "Ramón sometimes spends the whole day in the field and when he wants to go home he just looks at his shadow.",
  "Construction 149": "At midday ___ Maria and ___.",
  "Construction 141": "Example One",
  "Construction 146": "Example Two",
  "Construction 157": "Example Four",
  "Construction 152": "Example Three",
  "Construction 139": '"it is evening"',
  "Construction 138": '"it is almost night"',
  "Construction 144": "What time does Juana get up?",
  "Construction 160":
    "1. What do I eat at night? a) tortilla b) bread and chocolate c) bread and coffee",
  "Construction 145": "What does Juana do first?",
  "Construction 155": "What does Ramón do to know what time it is?",
  "Construction 156": "What does Ramón see when he wants to go home?",

  // Unit 8 — body parts / possessives
  "Construction 176": "Answer the following questions",
  "Construction 174": "Felipe goes to the field with his dog.",
  "Construction 164": "i– (noun base) –zero/uh/hui → his/her ___",
  "Construction 167": "inin– (noun base) –hua → their ___",
  "Construction 166": "inmo– (noun base) –hua → your (plural) ___",
  "Construction 172": "María's foot hurts because she bumped it.",
  "Construction 171": "My children go to school every day.",
  "Construction 163": "mo– (noun base) –zero/uh/hui → your ___",
  "Construction 161": "Possessive pronouns",
  "Construction 162": "no– (noun base) –zero/uh/hui → my ___",
  "Construction 170": "My children go to school every day.",
  "Construction 173": "My pigs eat a lot of corn.",
  "Construction 178": "What is the name of the thing in the middle of your face?",
  "Construction 177": "What do you walk with?",
  "Construction 180": "What is the part of your body you use to grab things?",
  "Construction 169": "Examples with sentences",
  "Construction 168": "Examples with words",
  "Construction 181": "What is the name of what you eat with?",
  "Construction 175": "What are the names of the parts of our body?",
  "Construction 179": "What is on top of your neck?",
  "Construction 165": "to– (noun base) –hua → our ___",

  // Unit 9 — family
  "Construction 201": "Answer the following questions",
  "Construction 208": "Find the following words in this word search.",
  "Construction 188": '"their younger siblings"',
  "Construction 194": '"their siblings"',
  "Construction 199": '"their cousins"',
  "Construction 190": '"their uncles"',
  "Construction 187": '"your (plural) younger siblings"',
  "Construction 193": '"you all\'s siblings"',
  "Construction 198": '"your (plural) cousins"',
  "Construction 189": '"your (plural) uncles"',
  "Construction 184": '"your younger sibling"',
  "Construction 195": '"your cousin"',
  "Construction 183": '"my younger sibling"',
  "Construction 200": '"my younger sibling"',
  "Construction 207": "How many younger siblings do you have?",
  "Construction 206": "How many dead relatives do you have?",
  "Construction 205": "How many children do you have?",
  "Construction 203": "What are your parents' names?",
  "Construction 202": "What are your grandparents' names?",
  "Construction 204":
    "What are your siblings' names and how old are they?",
  "Construction 182":
    "Examples with some possessive pronouns",
  "Construction 186": '"our younger siblings"',
  "Construction 192": '"our siblings"',
  "Construction 197": '"our cousins"',
  "Construction 185": '"his/her younger sibling"',
  "Construction 191": '"his/her sibling"',
  "Construction 196": '"his/her cousin"',
};

// ── 3. Apply translations ────────────────────────────────────────────────────
const update = db.prepare(
  "UPDATE primer_constructions SET translation_en = ? WHERE construction_label = ?"
);

let count = 0;
const txn = db.transaction(() => {
  for (const [label, en] of Object.entries(translations)) {
    const info = update.run(en, label);
    if (info.changes > 0) count++;
  }
});
txn();
console.log(`Updated ${count} construction translations.`);

// ── 4. Fix ehn_spoken_form for pronouns ──────────────────────────────────────
const fixPronoun = db.prepare(
  "UPDATE lesson_vocab SET ehn_spoken_form = ? WHERE id = ?"
);
const pTxn = db.transaction(() => {
  fixPronoun.run("na", 50);
  fixPronoun.run("ta", 49);
  fixPronoun.run("ya", 51);
});
pTxn();
console.log("Fixed ehn_spoken_form for IDs 49/50/51 → ta/na/ya.");

db.close();
console.log("Done.");
