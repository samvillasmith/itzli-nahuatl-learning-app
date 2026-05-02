"use strict";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");
const Database = require("better-sqlite3");

const DB_FILENAME = "fcn_master_lexicon_phase8_6_primer.sqlite";
const CHUNK_SIZE = 10;

function loadTsModule(relativePath) {
  const filename = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;

  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(output, filename);
  return mod.exports;
}

function stripStageDirections(value) {
  if (!value) return { text: "", changed: false };
  let cleaned = String(value);
  let previous = "";

  while (previous !== cleaned) {
    previous = cleaned;
    cleaned = cleaned.replace(/\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\}/g, " ");
  }

  cleaned = cleaned
    .replace(/[\(\[\{][^()\[\]{}]*$/g, " ")
    .replace(/\s+([,.;:?!])/g, "$1")
    .replace(/([¿¡])\s+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return { text: cleaned, changed: cleaned !== String(value).trim() };
}

function stripDiacritics(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeToken(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/^[¿¡.,;:?!"'()[\]]+|[¿¡.,;:?!"'()[\]]+$/g, "");
}

function tokenSpans(text) {
  const spans = [];
  const re = /\S+/g;
  let match;

  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const leading = raw.match(/^[¿¡.,;:?!"'()[\]]*/)?.[0].length || 0;
    const trailing = raw.match(/[¿¡.,;:?!"'()[\]]*$/)?.[0].length || 0;
    const start = match.index + leading;
    const end = match.index + raw.length - trailing;
    if (end <= start) continue;
    const normalized = normalizeToken(text.slice(start, end));
    if (normalized) spans.push({ normalized, start, end });
  }

  return spans;
}

function phraseTokens(text) {
  return String(text || "").split(/\s+/).map(normalizeToken).filter(Boolean);
}

function hasExactPhrase(text, phrase) {
  const needle = phraseTokens(phrase);
  if (needle.length === 0) return false;

  const haystack = tokenSpans(text);
  for (let i = 0; i <= haystack.length - needle.length; i += 1) {
    if (needle.every((token, offset) => haystack[i + offset]?.normalized === token)) {
      return true;
    }
  }
  return false;
}

function normalizeGloss(gloss) {
  return String(gloss || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(a|an|the|to)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values)];
}

function main() {
  const dbPath = path.join(process.cwd(), DB_FILENAME);
  if (!fs.existsSync(dbPath)) {
    console.error(`Missing ${DB_FILENAME}. Run npm run build or node scripts/fetch-db.js first.`);
    process.exitCode = 1;
    return;
  }

  const { filterCoreVocab } = loadTsModule("src/data/excluded-vocab.ts");
  const { collapseVariants } = loadTsModule("src/data/variant-groups.ts");
  const { CURATED_DIALOGUES } = loadTsModule("src/data/dialogue-overrides.ts");
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });

  const units = db.prepare(
    `SELECT lesson_number, theme_en
     FROM phase82_unit_plan
     ORDER BY lesson_number`
  ).all();

  const vocabRows = db.prepare(
    `SELECT id, rank, display_form AS headword, gloss_en, part_of_speech,
            lesson_number AS first_lesson_number, lesson_number, semantic_domain
     FROM lesson_vocab
     WHERE lesson_number = ?
     ORDER BY rank, id`
  );

  const dialogueRows = db.prepare(
    `SELECT ld.lesson_dialogue_id, ld.speaker_label, ld.utterance_normalized, ld.translation_en
     FROM lesson_dialogues ld
     JOIN phase82_unit_plan u ON u.english_lesson_unit_id = ld.lesson_unit_id
     WHERE u.lesson_number = ?
       AND (ld.speaker_label GLOB '[A-Z]'
            OR ld.speaker_label IN ('Rufina', 'Martha', 'Angela'))
       AND (ld.utterance_normalized LIKE '%ā%'
            OR ld.utterance_normalized LIKE '%ē%'
            OR ld.utterance_normalized LIKE '%ō%'
            OR ld.utterance_normalized LIKE '%ī%'
            OR ld.utterance_normalized LIKE '%ū%'
            OR ld.utterance_normalized LIKE '%¿%')
     ORDER BY ld.lesson_dialogue_id`
  );

  let visibleCards = 0;
  let lessonChunks = 0;
  let sourceDialogueLines = 0;
  let stageDirectionLines = 0;
  let curatedUnits = 0;
  const multiLessonUnits = [];
  const duplicateGlossUnits = [];
  const noInteractiveDialogueUnits = [];
  const annotatedGlossUnits = [];

  for (const unit of units) {
    const filtered = filterCoreVocab(vocabRows.all(unit.lesson_number), unit.lesson_number);
    const { cards } = collapseVariants(filtered, unit.lesson_number);
    visibleCards += cards.length;
    const chunks = [];
    for (let i = 0; i < cards.length; i += CHUNK_SIZE) {
      chunks.push(cards.slice(i, i + CHUNK_SIZE));
    }
    lessonChunks += Math.max(1, chunks.length);

    if (cards.length > CHUNK_SIZE) {
      multiLessonUnits.push(`${unit.lesson_number} (${Math.ceil(cards.length / CHUNK_SIZE)} lessons)`);
    }

    const glossBuckets = new Map();
    for (const card of cards) {
      const key = normalizeGloss(card.gloss_en);
      if (!key) continue;
      glossBuckets.set(key, [...(glossBuckets.get(key) || []), card.headword]);
    }
    const dupes = [...glossBuckets.entries()]
      .filter(([, forms]) => forms.length > 1)
      .map(([gloss, forms]) => `${gloss}: ${unique(forms).join(", ")}`);
    if (dupes.length > 0) {
      duplicateGlossUnits.push(`${unit.lesson_number}: ${dupes.slice(0, 3).join("; ")}`);
    }

    const annotated = cards.filter((card) =>
      /not attested|non-standard|misplaced|off-theme|likely corruption|⚠|❌/i.test(card.gloss_en || "")
    );
    if (annotated.length > 0) {
      annotatedGlossUnits.push(`${unit.lesson_number}: ${annotated.map((card) => `${card.headword}=${card.gloss_en}`).join("; ")}`);
    }

    const rawDialogues = CURATED_DIALOGUES[unit.lesson_number] || dialogueRows.all(unit.lesson_number);
    if (CURATED_DIALOGUES[unit.lesson_number]) curatedUnits += 1;
    sourceDialogueLines += rawDialogues.length;

    const cleanedDialogues = rawDialogues.map((line) => {
      const utterance = stripStageDirections(line.utterance_normalized);
      const translation = stripStageDirections(line.translation_en);
      if (utterance.changed || translation.changed) stageDirectionLines += 1;
      return { ...line, utterance_normalized: utterance.text };
    }).filter((line) => line.utterance_normalized);

    const interactiveCount = chunks.reduce((count, chunk) => {
      return count + cleanedDialogues.filter((line) =>
        chunk.some((card) => hasExactPhrase(line.utterance_normalized, card.headword))
      ).length;
    }, 0);
    if (cleanedDialogues.length > 0 && interactiveCount === 0) {
      noInteractiveDialogueUnits.push(`${unit.lesson_number}: ${unit.theme_en}`);
    }
  }

  console.log("Course quality audit");
  console.log(`- Units: ${units.length}`);
  console.log(`- Visible cards after filters/variant collapse: ${visibleCards}`);
  console.log(`- Lesson chunks at <= ${CHUNK_SIZE} words: ${lessonChunks}`);
  console.log(`- Dialogue lines reviewed by gate: ${sourceDialogueLines}`);
  console.log(`- Dialogue lines with stage directions stripped/hidden from audio: ${stageDirectionLines}`);
  console.log(`- Units with curated replacement dialogues: ${curatedUnits}`);

  console.log("\nUnits split into multiple max-10 lessons:");
  console.log(multiLessonUnits.length ? `- ${multiLessonUnits.join(", ")}` : "- none");

  console.log("\nDuplicate English glosses still visible:");
  console.log(duplicateGlossUnits.length ? duplicateGlossUnits.map((row) => `- ${row}`).join("\n") : "- none");

  console.log("\nAnnotated/questionable glosses still visible:");
  console.log(annotatedGlossUnits.length ? annotatedGlossUnits.map((row) => `- ${row}`).join("\n") : "- none");

  console.log("\nUnits with source dialogue but no current-word interactive match:");
  console.log(noInteractiveDialogueUnits.length ? noInteractiveDialogueUnits.map((row) => `- ${row}`).join("\n") : "- none");

  db.close();
}

main();
