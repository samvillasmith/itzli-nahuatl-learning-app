"use strict";

// Fresh process for each database: the runtime caches its SQLite connection.
const path = require("node:path");
const { loadTs } = require("./lib/course-audio-inputs.js");
const filename = path.resolve(process.argv[2]);
process.env.DATABASE_PATH = filename;
process.env.ITZLI_LOCAL_REVIEW = "1";
process.env.VERCEL = "0";
const db = loadTs("src/lib/db.ts");
const units = db.getAllUnits();
const snapshot = {
  units,
  vocabulary: db.getAllPrimerVocab(),
  vocabularyCount: db.getVocabCount(),
  historicalVocabularyCount: db.getPrimerVocabEntryCount(),
  lessons: units.map(({ lesson_number: id }) => ({
    id,
    unit: db.getUnit(id),
    vocabulary: db.getUnitVocab(id),
    dialogues: db.getUnitDialogues(id),
    selectedDialogues: db.getUnitDialogueContent(id),
    blocks: db.getUnitLessonBlocks(id),
    constructions: db.getUnitConstructions(id),
    assessments: db.getUnitAssessments(id),
    grammarDialogues: db.getGrammarDialogues([id]),
  })),
};
db.getDb().close();
process.stdout.write(JSON.stringify(snapshot));
