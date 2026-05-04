"use strict";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");
const Database = require("better-sqlite3");

const DB_FILENAME = "fcn_master_lexicon_phase8_6_primer.sqlite";
const CHUNK_SIZE = 10;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function collectGrammarLabLearnerText(lab) {
  const parts = [
    lab.title,
    lab.shortDesc,
    lab.pattern,
    lab.explanation,
    ...lab.examples.flatMap((example) => [
      example.nahuatl,
      example.breakdown,
      example.translation,
      example.note,
    ]),
  ];

  for (const drill of lab.drills) {
    parts.push(drill.heading, drill.prompt);
    if (drill.kind === "identify") {
      for (const item of drill.items) {
        parts.push(item.prompt, item.answer, item.explanation);
      }
    } else if (drill.kind === "transform") {
      for (const item of drill.items) {
        parts.push(item.input, item.target, item.answer, item.breakdown, item.explanation, ...(item.accepted || []));
      }
    } else if (drill.kind === "produce") {
      for (const item of drill.items) {
        parts.push(item.english, item.answer, item.breakdown, item.explanation, ...(item.accepted || []));
      }
    } else if (drill.kind === "paradigm") {
      for (const row of drill.rows) {
        parts.push(row.cue, row.answer, row.breakdown, row.translation);
      }
    }
  }

  return parts.filter(Boolean).join("\n");
}

function main() {
  const dbPath = path.join(process.cwd(), DB_FILENAME);
  if (!fs.existsSync(dbPath)) {
    console.error(`Missing ${DB_FILENAME}. Run npm run build or node scripts/fetch-db.js first.`);
    process.exitCode = 1;
    return;
  }

  const grammarWarnings = [];
  const grammarFailures = [];
  const grammarLessonsSource = fs.readFileSync(path.join(process.cwd(), "src/data/grammar-lessons.ts"), "utf8");
  if (/\bactually\b/i.test(grammarLessonsSource)) {
    grammarFailures.push('src/data/grammar-lessons.ts contains "actually".');
  }

  const { filterCoreVocab, QUESTIONABLE_GLOSS_MARKERS } = loadTsModule("src/data/excluded-vocab.ts");
  const { collapseVariants } = loadTsModule("src/data/variant-groups.ts");
  const { CURATED_DIALOGUES } = loadTsModule("src/data/dialogue-overrides.ts");
  const { GRAMMAR_LESSONS } = loadTsModule("src/data/grammar-lessons.ts");
  const { GRAMMAR_LABS } = loadTsModule("src/data/grammar-labs.ts");
  const lessonFlowSource = fs.readFileSync(path.join(process.cwd(), "src/app/units/[unitId]/LessonFlow.tsx"), "utf8");
  if (!lessonFlowSource.includes("sentenceProduce")) {
    grammarFailures.push("Unit lesson flow is missing dialogue-based sentence production steps.");
  }
  if (!lessonFlowSource.includes("buildUnitPhraseCards") || !lessonFlowSource.includes('source: "unitPhrase"')) {
    grammarFailures.push("Unit lesson flow is missing generated unit phrase cards.");
  }
  if (!lessonFlowSource.includes("...unitPhraseCards, ...filteredVocab")) {
    grammarFailures.push("Unit phrase cards must be inserted into the main vocab-card stream before regular vocabulary.");
  }
  const questionableGlossPattern = new RegExp(
    QUESTIONABLE_GLOSS_MARKERS.map(escapeRegExp).join("|"),
    "i"
  );

  for (const lesson of GRAMMAR_LESSONS) {
    if (lesson.band === "A1" && !(lesson.relatedGrammarLabIds || []).length) {
      grammarWarnings.push(`A1 grammar lesson has no related lab: ${lesson.id}`);
    }
  }

  for (const lab of GRAMMAR_LABS) {
    if (lab.examples.length < 3) {
      grammarWarnings.push(`GrammarLab ${lab.id} has fewer than 3 examples.`);
    }

    const transformDrills = lab.drills.filter((drill) => drill.kind === "transform");
    const produceDrills = lab.drills.filter((drill) => drill.kind === "produce");
    const productionItemCount =
      transformDrills.reduce((total, drill) => total + drill.items.length, 0) +
      produceDrills.reduce((total, drill) => total + drill.items.length, 0);
    if (transformDrills.length === 0) {
      grammarWarnings.push(`GrammarLab ${lab.id} has no transform drill.`);
    }
    if (produceDrills.length === 0) {
      grammarWarnings.push(`GrammarLab ${lab.id} has no produce drill.`);
    }
    if (productionItemCount < 5) {
      grammarWarnings.push(`GrammarLab ${lab.id} has fewer than 5 learner-production items.`);
    }

    for (const drill of [...transformDrills, ...produceDrills]) {
      drill.items.forEach((item, idx) => {
        if (!item.explanation?.trim()) {
          grammarWarnings.push(`GrammarLab ${lab.id} ${drill.kind} item ${idx + 1} lacks an explanation.`);
        }
      });
    }

    const labText = collectGrammarLabLearnerText(lab);
    if (/\b(copula|predicate|absolutive)\b/i.test(labText)) {
      grammarFailures.push(`GrammarLab ${lab.id} has learner-facing technical jargon that should be plain-English.`);
    }
    if (lab.unit === 3 && /\bcihu[aā]tl\b/i.test(stripDiacritics(labText))) {
      grammarWarnings.push(`GrammarLab ${lab.id} is assigned to Unit 3 but still uses cihuātl; Unit 3 is the names/intro unit.`);
    }
    if (/\b(always|every)\b/i.test(labText) && /\b(noun|nouns|plural|pluralization|possess|possession|absolutive)\b/i.test(labText)) {
      grammarWarnings.push(`GrammarLab ${lab.id} uses "always" or "every" near a variable noun/plural/possession topic.`);
    }
  }

  if (!GRAMMAR_LABS.some((lab) => lab.unit === 3 && lab.id === "name-exchange")) {
    grammarFailures.push("Unit 3 is missing the required name-exchange grammar lab.");
  }

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

    const annotated = cards.filter((card) => questionableGlossPattern.test(card.gloss_en || ""));
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

  console.log("\nGrammar production warnings:");
  console.log(grammarWarnings.length ? grammarWarnings.map((row) => `- ${row}`).join("\n") : "- none");

  console.log("\nGrammar production failures:");
  console.log(grammarFailures.length ? grammarFailures.map((row) => `- ${row}`).join("\n") : "- none");
  if (grammarFailures.length > 0) process.exitCode = 1;

  console.log("\nUnits with source dialogue but no current-word interactive match:");
  console.log(noInteractiveDialogueUnits.length ? noInteractiveDialogueUnits.map((row) => `- ${row}`).join("\n") : "- none");

  db.close();
}

main();
