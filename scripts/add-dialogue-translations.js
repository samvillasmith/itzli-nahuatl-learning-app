#!/usr/bin/env node
/**
 * Adds missing English translations to dialogue lines in lesson_dialogues.
 */

const { resolveDbPath } = require("./_db-path");
const Database = require("better-sqlite3");
const db = new Database(resolveDbPath());

const translations = {
  // Unit 3 — "What's your name?"
  "FCN-LDG-000006": "Hello, what is your name?",
  "FCN-LDG-000007": "Hello, my name is Paty.",
  "FCN-LDG-000008": "My name is Juana.",
  "FCN-LDG-000009": "I am from Tecomate, Chicontepec.",
  "FCN-LDG-000010": "Ah, that's great — I'm from Mexico City.",
  "FCN-LDG-000011": "I study and I teach at the UNAM school.",

  // Unit 5 — professions
  "FCN-LDG-000016": "Hello Catalina, what do you do for work?",
  "FCN-LDG-000017": "I teach Nahuatl.",
  "FCN-LDG-000019": "That's great, nice to meet you too.",

  // Unit 11 — making plans
  "FCN-LDG-000028": "Aah (they greet each other), are you visiting?",
  "FCN-LDG-000029": "Yes, I'm going to see my daughter.",
  "FCN-LDG-000030": "What will you do tomorrow?",
  "FCN-LDG-000031": "Tomorrow I'll harvest. Why?",
  "FCN-LDG-000032": "Because I want to see if you can help me.",
  "FCN-LDG-000033": "And what will you do?",
  "FCN-LDG-000034": "I won't be able to tomorrow.",
  "FCN-LDG-000046": "I'm married (a woman with a man).",

  // Unit 19 — ordering food (Rufina, Martha, Angela)
  "FCN-LDG-000055": "What would you all like to eat?",
  "FCN-LDG-000056": "Yes, we want to eat enchiladas and bean soup.",
  "FCN-LDG-000058": "Ah, we also want a snow cone.",
  "FCN-LDG-000060": "Yes, thank you.",
};

const update = db.prepare(
  "UPDATE lesson_dialogues SET translation_en = ? WHERE lesson_dialogue_id = ?"
);

let count = 0;
const txn = db.transaction(() => {
  for (const [id, en] of Object.entries(translations)) {
    const info = update.run(en, id);
    if (info.changes > 0) count++;
    else console.warn(`  WARNING: no row found for ${id}`);
  }
});
txn();

console.log(`Updated ${count}/${Object.keys(translations).length} dialogue translations.`);
db.close();
console.log("Done.");
