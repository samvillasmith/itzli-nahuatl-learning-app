"use strict";

const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");
const Database = require("better-sqlite3");
const { resolveReadonlyCourseDbPath, dictionaryAuditScope } = require("./lib/readonly-course-db.cjs");
const { validateEhnLine } = require("./generate-dialogues");
const { collectPublishedAudio } = require("./audit-audio-integrity");

const CHUNK_SIZE = 10;
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveProjectAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    const resolved = path.join(process.cwd(), "src", request.slice(2));
    const withTs = fs.existsSync(`${resolved}.ts`) ? `${resolved}.ts` : resolved;
    return originalResolveFilename.call(
      this,
      withTs,
      parent,
      isMain,
      options
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScriptModule(mod, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  }).outputText;

  mod._compile(output, filename);
};

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
  const dbPath = resolveReadonlyCourseDbPath();
  const publishedAudio = collectPublishedAudio();
  const { displayNahuatl } = loadTsModule("src/lib/orthography.ts");

  const grammarWarnings = [];
  const grammarFailures = [];
  const referenceOnlyA1Lessons = new Set([
    "alphabet",
    "orthographic-systems",
    "questions",
    "negation",
    "locatives",
  ]);
  const grammarLessonsSource = fs.readFileSync(path.join(process.cwd(), "src/data/grammar-lessons.ts"), "utf8");
  if (/\bactually\b/i.test(grammarLessonsSource)) {
    grammarFailures.push('src/data/grammar-lessons.ts contains "actually".');
  }

  const { filterCoreVocab, QUESTIONABLE_GLOSS_MARKERS } = loadTsModule("src/data/excluded-vocab.ts");
  const { collapseVariants } = loadTsModule("src/data/variant-groups.ts");
  const { getSourceVocabPromotions } = loadTsModule("src/data/source-vocab-promotions.ts");
  const { getCuratedUnitVocab } = loadTsModule("src/data/curated-unit-vocab.ts");
  const {
    getCoreVocabUnit,
    selectLearnerUnitCards,
    MAX_LEARNER_CARDS_PER_UNIT,
  } = loadTsModule("src/data/course-vocab-selection.ts");
  const { getVocabCardImage, getVocabCardImageHold } = loadTsModule("src/data/word-images.ts");
  const { getDialogueSourceRecording } = loadTsModule("src/data/recording-reuse.ts");
  const legacyDisabledDialogueAudio = [];
  const legacyHeldVocabAudio = [];
  const restoredSourceDialogueAudio = [];
  const restoredGeneratedDialogueAudio = [];
  const imageReviews = JSON.parse(fs.readFileSync(path.join(process.cwd(), "src/data/image-content-review.json"), "utf8"));
  const recordedImageHoldReasons = new Set([...imageReviews.cards, ...imageReviews.assets].filter((row) => row.status === "held" || row.status === "structured-cue").map((row) => row.reason));
  const withheldVocabImages = [];
  const structuredCueImageIds = new Set(imageReviews.cards.filter((row) => row.status === "structured-cue").map((row) => row.id));
  const structuredCueCards = [];
  const { isAppContentExcluded } = loadTsModule("src/lib/app-content-safety.ts");
  const { CURATED_DIALOGUES, DIALOGUE_LINE_CORRECTIONS } = loadTsModule("src/data/dialogue-overrides.ts");
  const { reviewConstruction } = loadTsModule("src/data/construction-review.ts");
  const { GRAMMAR_LESSONS } = loadTsModule("src/data/grammar-lessons.ts");
  const { GRAMMAR_LABS } = loadTsModule("src/data/grammar-labs.ts");
  const { LESSON_FOCUS_CARDS, getLessonFocusCardsForLab } = loadTsModule("src/data/lesson-focus-cards.ts");
  const lessonFlowSource = fs.readFileSync(path.join(process.cwd(), "src/app/units/[unitId]/LessonFlow.tsx"), "utf8");
  const grammarLessonSource = fs.readFileSync(path.join(process.cwd(), "src/app/grammar/[topic]/GrammarLesson.tsx"), "utf8");
  const guidedBuilderSource = fs.readFileSync(path.join(process.cwd(), "src/components/GuidedAnswerBuilder.tsx"), "utf8");
  const reviewedAudio = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "src/data/reviewed-audio.json"), "utf8")
  );
  const spanishCatalog = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "src/i18n/es.generated.json"), "utf8")
  );
  const spanishOverrides = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "src/i18n/es.overrides.json"), "utf8")
  );
  const hasSpanishTranslation = (value) =>
    !value || Object.hasOwn(spanishOverrides, value) || Object.hasOwn(spanishCatalog, value);
  const reviewedDialogueAudioIds = new Set(
    (reviewedAudio.dialogue || []).map((entry) => String(entry.id))
  );
  if (/[\u00c2\u00c3]/.test(lessonFlowSource)) {
    grammarFailures.push("Unit lesson flow contains mojibake characters.");
  }
  if (lessonFlowSource.includes("sentenceProduce") || lessonFlowSource.includes("SentenceProduceStep")) {
    grammarFailures.push("Unit lessons must not require unscaffolded whole-sentence recall.");
  }
  if (lessonFlowSource.includes("buildUnitPhraseCards") || lessonFlowSource.includes('source: "unitPhrase"')) {
    grammarFailures.push("Complete dialogue lines must not be promoted into vocabulary cards.");
  }
  if (lessonFlowSource.includes("buildLessonFocusCards") || lessonFlowSource.includes('source: "lessonFocus"')) {
    grammarFailures.push("Grammar sentences and synthetic forms must not be promoted into vocabulary cards.");
  }
  if (!lessonFlowSource.includes("mergeLearningCards(filteredVocab)")) {
    grammarFailures.push("Lesson flashcards must be built only from the reviewed unit vocabulary.");
  }
  if (!lessonFlowSource.includes("buildContextFillBlanks") || !lessonFlowSource.includes("groupKeys.has(fill.targetKey)")) {
    grammarFailures.push("Unit lessons must place guided context puzzles after the target word is taught.");
  }
  if (!lessonFlowSource.includes("fullSentence") || !lessonFlowSource.includes("audioSrc")) {
    grammarFailures.push("Context puzzles must reveal the complete example and its available audio.");
  }
  if (!lessonFlowSource.includes("dialogueCoverage(line, introducedCards) < 0.6")) {
    grammarFailures.push("Dialogue practice must require at least 60% introduced-vocabulary coverage.");
  }
  if (!lessonFlowSource.includes("const showGrammarLab = isLastChunk")) {
    grammarFailures.push("Grammar production must wait until the final vocabulary chunk.");
  }
  if (!lessonFlowSource.includes("wordCount > maxWords")) {
    grammarFailures.push("Context-puzzle sentences must obey the unit sentence-length cap.");
  }
  if (!lessonFlowSource.includes("const line = lessonDialogues[step.lineIdx]")) {
    grammarFailures.push("Dialogue practice must render from the same filtered dialogue list used to build steps.");
  }
  if (!lessonFlowSource.includes("resetStep();")) {
    grammarFailures.push("Lesson answers must reset before the next step so a prior answer cannot carry forward.");
  }
  if (!lessonFlowSource.includes("<GuidedAnswerBuilder") || !grammarLessonSource.includes("<GuidedAnswerBuilder")) {
    grammarFailures.push("Multiword grammar answers must use guided assembly in unit and reference lessons.");
  }
  if (!lessonFlowSource.includes("splitGuidedAnswer(answer).length > 1") || !grammarLessonSource.includes("splitGuidedAnswer(answer).length > 1")) {
    grammarFailures.push("Guided assembly must activate for every multiword grammar answer.");
  }
  if (!guidedBuilderSource.includes("orderGuidedAnswerTokens") || !guidedBuilderSource.includes("selectedIds")) {
    grammarFailures.push("The guided answer builder must provide stable ordered word-tile interaction.");
  }
  const questionableGlossPattern = new RegExp(
    QUESTIONABLE_GLOSS_MARKERS.map(escapeRegExp).join("|"),
    "i"
  );

  for (const lesson of GRAMMAR_LESSONS) {
    if (
      lesson.band === "A1" &&
      !(lesson.relatedGrammarLabIds || []).length &&
      !referenceOnlyA1Lessons.has(lesson.id)
    ) {
      grammarWarnings.push(`A1 grammar lesson has no related lab: ${lesson.id}`);
    }
  }

  for (const lab of GRAMMAR_LABS) {
    const focusCards = getLessonFocusCardsForLab(lab.id);
    if (focusCards.length < 3) {
      grammarWarnings.push(`GrammarLab ${lab.id} has fewer than 3 lesson focus cards.`);
    }

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
  if (!LESSON_FOCUS_CARDS.some((card) => card.unit === 3 && card.headword === "notokah")) {
    grammarFailures.push("Unit 3 lesson focus cards must include notokah as a first-class card.");
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  const databaseScope = dictionaryAuditScope(db);

  const units = db.prepare(
    `SELECT lesson_number, theme_en
     FROM phase82_unit_plan
     ORDER BY lesson_number`
  ).all();

  const allVocabRows = db.prepare(
    `SELECT id, entry_id, rank, display_form AS headword, gloss_en, part_of_speech,
            lesson_number AS first_lesson_number, lesson_number, semantic_domain
     FROM lesson_vocab
     ORDER BY lesson_number, rank, id`
  ).all();

  const vocabByOriginalUnit = new Map();
  for (const row of allVocabRows) {
    const group = vocabByOriginalUnit.get(row.lesson_number) || [];
    group.push(row);
    vocabByOriginalUnit.set(row.lesson_number, group);
  }

  const coreVocabByCourseUnit = new Map();
  for (const [originalUnit, rows] of vocabByOriginalUnit) {
    for (const row of filterCoreVocab(rows, originalUnit)) {
      const courseUnit = getCoreVocabUnit(row.id, originalUnit);
      const group = coreVocabByCourseUnit.get(courseUnit) || [];
      group.push({ ...row, first_lesson_number: courseUnit, lesson_number: courseUnit });
      coreVocabByCourseUnit.set(courseUnit, group);
    }
  }

  const allSourcePromotions = getSourceVocabPromotions();
  const allCuratedUnitCards = getCuratedUnitVocab();
  const sourcePromotionIds = new Set(allSourcePromotions.map((card) => card.id));
  const curatedUnitCardIds = new Set(allCuratedUnitCards.map((card) => card.id));

  const dialogueRows = db.prepare(
    `SELECT ld.lesson_dialogue_id, ld.speaker_label, ld.utterance_normalized, ld.translation_en
     FROM lesson_dialogues ld
     JOIN phase82_unit_plan u ON u.english_lesson_unit_id = ld.lesson_unit_id
     WHERE u.lesson_number = ?
       AND (ld.speaker_label GLOB '[A-Z]'
            OR ld.speaker_label IN ('Rufina', 'Martha', 'Angela'))
       AND (ld.attestation_tier = 'AI_generated'
            OR ld.utterance_normalized LIKE '%ā%'
            OR ld.utterance_normalized LIKE '%ē%'
            OR ld.utterance_normalized LIKE '%ō%'
            OR ld.utterance_normalized LIKE '%ī%'
            OR ld.utterance_normalized LIKE '%ū%'
            OR ld.utterance_normalized LIKE '%¿%')
     ORDER BY ld.lesson_dialogue_id`
  );

  let visibleCards = 0;
  let focusCardCount = 0;
  let lessonChunks = 0;
  let sourceDialogueLines = 0;
  let reviewedConstructions = 0;
  let withheldConstructions = 0;
  const constructionRows = db.prepare(
    `SELECT priority_id, first_lesson_number, construction_label, pattern_text,
            example_original, translation_en
     FROM primer_constructions
     WHERE first_lesson_number = ? AND translation_en IS NOT NULL
       AND trim(translation_en) != ''`
  );
  let stageDirectionLines = 0;
  let curatedUnits = 0;
  const multiLessonUnits = [];
  const duplicateGlossUnits = [];
  const noInteractiveDialogueUnits = [];
  const annotatedGlossUnits = [];
  const imageUsage = new Map();
  const missingVocabAudio = [];
  const withheldVocabAudio = [];
  const missingDialogueAudio = [];
  const disabledDialogueAudio = [];
  const missingVocabImages = [];
  const oversizedUnits = [];
  const missingRuntimeSpanish = new Set();
  let sourcePromotionCount = 0;
  let curatedUnitCardCount = 0;

  for (const unit of units) {
    for (const rawConstruction of constructionRows.all(unit.lesson_number)) {
      const construction = reviewConstruction(rawConstruction);
      if (!construction) {
        withheldConstructions += 1;
        continue;
      }
      if (isAppContentExcluded(construction.construction_label, construction.pattern_text,
        construction.example_original, construction.translation_en)) continue;
      reviewedConstructions += 1;
      if (!hasSpanishTranslation(construction.translation_en)) {
        missingRuntimeSpanish.add(construction.translation_en);
      }
      if (!construction.source_url || /[“”"_→]|^[AB]:/u.test(construction.example_original)) {
        grammarFailures.push(`Unreviewed or unfinished exercise text: ${construction.priority_id}`);
      }
    }
    const filtered = [...(coreVocabByCourseUnit.get(unit.lesson_number) || [])];
    const seenHeadwords = new Set(filtered.map((card) => card.headword.trim().toLowerCase()));
    const promotions = getSourceVocabPromotions(unit.lesson_number).filter((card) => {
      const key = card.headword.trim().toLowerCase();
      if (seenHeadwords.has(key)) return false;
      seenHeadwords.add(key);
      return true;
    });
    filtered.push(...promotions);
    const curatedCards = getCuratedUnitVocab(unit.lesson_number).filter((card) => {
      const key = card.headword.trim().toLowerCase();
      if (seenHeadwords.has(key)) return false;
      seenHeadwords.add(key);
      return true;
    });
    filtered.push(...curatedCards);
    const selected = selectLearnerUnitCards(filtered, unit.lesson_number);
    sourcePromotionCount += selected.filter((card) => sourcePromotionIds.has(card.id)).length;
    curatedUnitCardCount += selected.filter((card) => curatedUnitCardIds.has(card.id)).length;
    const { cards } = collapseVariants(selected, unit.lesson_number);
    if (cards.length > MAX_LEARNER_CARDS_PER_UNIT) {
      oversizedUnits.push(`${unit.lesson_number}:${cards.length}`);
    }
    if (unit.lesson_number === 1 && cards.some((card) => card.part_of_speech !== "letter")) {
      grammarFailures.push("Sounds and Spelling contains a non-letter vocabulary card.");
    }
    if (unit.lesson_number === 34 && cards.length < 12) {
      grammarFailures.push(`Numbers and Counting must teach at least 12 standalone cards; found ${cards.length}.`);
    }
    const unitLabIds = GRAMMAR_LABS.filter((lab) => lab.unit === unit.lesson_number).map((lab) => lab.id);
    const focusCards = LESSON_FOCUS_CARDS.filter((card) =>
      card.unit === unit.lesson_number && unitLabIds.includes(card.labId)
    );
    focusCardCount += focusCards.length;
    visibleCards += cards.length;
    for (const card of cards) {
      if (!hasSpanishTranslation(card.gloss_en)) missingRuntimeSpanish.add(card.gloss_en);
      const image = getVocabCardImage(card);
      if (!image?.url) {
        const hold = getVocabCardImageHold(card);
        if (structuredCueImageIds.has(card.id)) structuredCueCards.push(`${unit.lesson_number}:${card.id}:${card.headword}`);
        else if (recordedImageHoldReasons.has(hold)) withheldVocabImages.push(`${unit.lesson_number}:${card.id}:${card.headword}`);
        else missingVocabImages.push(`${unit.lesson_number}:${card.id}:${card.headword}`);
      }
      if (image?.url && image.source === "openai") {
        const uses = imageUsage.get(image.url) || [];
        uses.push(`${unit.lesson_number}:${card.id}:${card.headword}`);
        imageUsage.set(image.url, uses);
      }

      if (card.audioSrc === null) legacyHeldVocabAudio.push(`${unit.lesson_number}:${card.id}:${card.headword}`);
      const recording = publishedAudio.resolve(`core-vocab:${card.id}`, displayNahuatl(card.headword));
      if (recording.state === "held") withheldVocabAudio.push(`${unit.lesson_number}:${card.id}:${card.headword}`);
      else if (!recording.url) missingVocabAudio.push(`${unit.lesson_number}:${card.id}:${card.headword}:${recording.reason}`);
    }
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

    const rawDialogues = (CURATED_DIALOGUES[unit.lesson_number] || dialogueRows.all(unit.lesson_number))
      .map((line) => ({ ...line, ...DIALOGUE_LINE_CORRECTIONS[line.lesson_dialogue_id] }))
      .filter((line) => !isAppContentExcluded(line.utterance_normalized, line.translation_en));
    if (CURATED_DIALOGUES[unit.lesson_number]) curatedUnits += 1;
    sourceDialogueLines += rawDialogues.length;
    for (const line of rawDialogues) {
      if (!hasSpanishTranslation(line.translation_en)) {
        missingRuntimeSpanish.add(line.translation_en);
      }
      if (!validateEhnLine(line.utterance_normalized)) {
        grammarFailures.push(
          `Visible dialogue fails the Eastern Huasteca content gate: ${unit.lesson_number}:${line.lesson_dialogue_id}:${line.utterance_normalized}`
        );
      }
      if (/\d/u.test(line.utterance_normalized)) {
        grammarFailures.push(
          `Visible dialogue contains a malformed digit: ${unit.lesson_number}:${line.lesson_dialogue_id}:${line.utterance_normalized}`
        );
      }
    }

    const cleanedDialogues = rawDialogues.map((line) => {
      const utterance = stripStageDirections(line.utterance_normalized);
      const translation = stripStageDirections(line.translation_en);
      if (utterance.changed || translation.changed) stageDirectionLines += 1;
      const reviewedAudioAvailable = reviewedDialogueAudioIds.has(String(line.lesson_dialogue_id));
      const sourceRecording = getDialogueSourceRecording(String(line.lesson_dialogue_id), utterance.text);
      const legacyAudioAvailable = line.audio_available !== false && (reviewedAudioAvailable || !utterance.changed);
      if (!legacyAudioAvailable) legacyDisabledDialogueAudio.push(`${unit.lesson_number}:${line.lesson_dialogue_id}`);
      if (sourceRecording && !legacyAudioAvailable) restoredSourceDialogueAudio.push(`${unit.lesson_number}:${line.lesson_dialogue_id}`);
      const recording = publishedAudio.resolve(`core-dialogue:${line.lesson_dialogue_id}`, displayNahuatl(utterance.text));
      if (recording.state === "generated" && !legacyAudioAvailable) restoredGeneratedDialogueAudio.push(`${unit.lesson_number}:${line.lesson_dialogue_id}`);
      if (recording.state === "held") disabledDialogueAudio.push(`${unit.lesson_number}:${line.lesson_dialogue_id}`);
      else if (!recording.url) missingDialogueAudio.push(`${unit.lesson_number}:${line.lesson_dialogue_id}:${recording.reason}`);
      return { ...line, utterance_normalized: utterance.text };
    }).filter((line) => line.utterance_normalized);

    const lessonCardPool = [
      ...focusCards,
      ...cards,
    ];
    const interactiveCount = cleanedDialogues.filter((line) =>
      lessonCardPool.some((card) => hasExactPhrase(line.utterance_normalized, card.headword))
    ).length;
    if (cleanedDialogues.length > 0 && interactiveCount === 0) {
      noInteractiveDialogueUnits.push(`${unit.lesson_number}: ${unit.theme_en}`);
    }
  }

  const duplicateVisibleImages = [...imageUsage.entries()].flatMap(([url, uses]) => {
    const byUnit = new Map();
    for (const use of uses) {
      const unit = use.split(":", 1)[0];
      byUnit.set(unit, [...(byUnit.get(unit) || []), use]);
    }
    return [...byUnit.values()]
      .filter((unitUses) => new Set(unitUses.map((use) => use.split(":").slice(2).join(":"))).size > 1)
      .map((unitUses) => `${unitUses.join(", ")} => ${url}`);
  });

  if (duplicateVisibleImages.length > 0) {
    grammarFailures.push(
      `Distinct visible vocabulary cards reuse image URLs: ${duplicateVisibleImages.join("; ")}`
    );
  }
  if (visibleCards < 450 || visibleCards > units.length * MAX_LEARNER_CARDS_PER_UNIT) {
    grammarFailures.push(`Reviewed course inventory is outside its balanced range; found ${visibleCards}.`);
  }
  if (allSourcePromotions.length !== 240) {
    grammarFailures.push(`Expected 240 reviewed source-course candidates; found ${allSourcePromotions.length}.`);
  }
  if (allCuratedUnitCards.length !== 75) {
    grammarFailures.push(`Expected 75 curated unit vocabulary candidates; found ${allCuratedUnitCards.length}.`);
  }
  if (oversizedUnits.length > 0) {
    grammarFailures.push(
      `Units exceed the ${MAX_LEARNER_CARDS_PER_UNIT}-card learner limit: ${oversizedUnits.join(", ")}`
    );
  }
  if (missingVocabImages.length > 0) {
    grammarFailures.push(`Visible vocabulary cards missing images: ${missingVocabImages.join(", ")}`);
  }
  if (missingVocabAudio.length > 0) {
    grammarFailures.push(`Visible vocabulary cards missing audio: ${missingVocabAudio.join(", ")}`);
  }
  if (missingDialogueAudio.length > 0) {
    grammarFailures.push(`Visible dialogue lines missing audio: ${missingDialogueAudio.join(", ")}`);
  }
  if (disabledDialogueAudio.length > 0 || withheldVocabAudio.length > 0) {
    grammarWarnings.push(`Explicit current audio holds: ${withheldVocabAudio.length} vocabulary placements, ${disabledDialogueAudio.length} dialogue placements. These are separate from unbound recordings and historical mismatching files. Text checks do not verify pronunciation.`);
  }
  if (withheldVocabImages.length > 0) grammarWarnings.push(`Images withheld for recorded meaning, quantity, spelling, or legacy-review issues: ${withheldVocabImages.length} cards. Text-only coverage does not count as completed image coverage.`);
  if (missingRuntimeSpanish.size > 0) {
    grammarFailures.push(
      `Learner-visible database content is missing Spanish translations: ${[...missingRuntimeSpanish].join(" | ")}`
    );
  }

  console.log("Course quality audit");
  console.log(`- Database scope: ${databaseScope}`);
  console.log(`- Units: ${units.length}`);
  console.log(`- Visible cards after filters/variant collapse: ${visibleCards}`);
  console.log(`- Learner-visible source-course cards: ${sourcePromotionCount} of ${allSourcePromotions.length} reviewed candidates`);
  console.log(`- Learner-visible curated cards: ${curatedUnitCardCount} of ${allCuratedUnitCards.length} reviewed candidates`);
  console.log(`- Units over ${MAX_LEARNER_CARDS_PER_UNIT} cards: ${oversizedUnits.length}`);
  console.log(`- Authored grammar focus forms: ${focusCardCount}`);
  console.log(`- Lesson chunks at <= ${CHUNK_SIZE} words: ${lessonChunks}`);
  console.log(`- Dialogue lines reviewed by gate: ${sourceDialogueLines}`);
  console.log(`- Source-backed construction exercises: ${reviewedConstructions}`);
  console.log(`- Constructions withheld within selected database: ${withheldConstructions}`);
  if (databaseScope.startsWith("course-only")) console.log("- Private research holdings excluded; this audit does not count their held constructions.");
  console.log(`- Dialogue lines with stage directions stripped/hidden from audio: ${stageDirectionLines}`);
  console.log(`- Units with curated replacement dialogues: ${curatedUnits}`);
  console.log(`- Same-unit generated image collisions: ${duplicateVisibleImages.length}`);
  console.log(`- Unexplained vocabulary illustration gaps: ${missingVocabImages.length}`);
  console.log(`- Vocabulary illustration gaps awaiting resolution: ${withheldVocabImages.length + missingVocabImages.length}`);
  console.log(`- Number/month cards covered by deterministic concept cues: ${structuredCueCards.length}`);
  console.log(`- Unexplained vocabulary audio gaps: ${missingVocabAudio.length}`);
  console.log(`- Vocabulary recordings deliberately withheld: ${withheldVocabAudio.length}`);
  console.log(`- Unexplained dialogue audio gaps: ${missingDialogueAudio.length}`);
  console.log(`- Dialogue recordings deliberately withheld: ${disabledDialogueAudio.length}`);
  console.log(`- Historical held-recording placements (old clips remain withheld): ${legacyHeldVocabAudio.length + legacyDisabledDialogueAudio.length}`);
  console.log(`- Held dialogue playback restored with exact source recordings: ${restoredSourceDialogueAudio.length}`);
  console.log(`- Held dialogue playback restored with current synthetic bindings: ${restoredGeneratedDialogueAudio.length}`);
  console.log(`- Current unavailable course playback items: ${withheldVocabAudio.length + disabledDialogueAudio.length + missingVocabAudio.length + missingDialogueAudio.length}`);
  console.log(`- Full fixed-course published audio: ${publishedAudio.summary.available_reference_records}/${publishedAudio.summary.reference_records} references; ${publishedAudio.summary.unbound_reference_records} unbound, ${publishedAudio.summary.held_reference_records} explicitly held`);
  console.log(`- Full fixed-course clips: ${publishedAudio.summary.published_synthetic_assets} synthetic files, ${publishedAudio.summary.linked_original_assets} linked original files; remote transport not checked`);
  console.log(`- Learner-visible runtime strings missing Spanish: ${missingRuntimeSpanish.size}`);

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
