"use strict";

// Offline inventory only. Read the shipped course; never read credentials,
// authenticate, synthesize, upload, inspect learner data or change bindings.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { ROOT, loadTs, loadCurrentAudioManifest, sha256 } = require("./course-audio-inputs");
const { resolveReadonlyCourseDbPath } = require("./readonly-course-db.cjs");
const google = require("../generate-google-audio");

const SETTINGS = Object.freeze({ languageCode: "es-US", voiceName: "es-US-Standard-A", speakingRate: 0.82,
  pitch: 0, audioEncoding: "LINEAR16", sampleRateHertz: 24000, inputMode: "phoneme" });
const EXPECTED_RECIPE = "spanish-air-b-2026-10-07";
const EXPLICIT_CORE_CONTENT_HOLDS = new Set();
const FRESH_CORE_SUPPORT = {
  "core-vocab:35": { scope: "source-supported adaptation of the Chicontepec state question; old mismatching recording remains held",
    refs: [{ source_url: "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-24-lesson-24-niihhuia-pan-altepetl-part-1-i-had-gone-to-the-city-part-1/",
      excerpt: "¿Quīniuhqui tiitztoc?", scope: "printed question with state replies; current learner wording is an adaptation" },
    { source_url: "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-2-lesson-2-nicpiya-tlahtlaniliztli-i-have-a-question/",
      scope: "independent question-word reading and second-person state form" }] },
  "core-vocab:661": { scope: "bounded tlan if/whether lexical component in the documented embedded question; not an unrestricted conditional paradigm",
    refs: [{ source_url: "https://tlahtolli.coerll.utexas.edu/tlamachtiliztli-11-lesson-11-quemman-motlahpaloa-huan-monahuatihtehua-when-you-greet-and-say-farewell/",
      excerpt: "tlan hueliz tinēchpalehuia", scope: "embedded if/whether example with explicit paired translation" }] },
  "core-vocab:680": { scope: "individual modern Eastern Huasteca huicatl song fact, owner-approved wikatl display; stale recording remains withheld; no verse or media reuse", refs: [] },
};
const FORM_HEADERS = new Set(["Example word", "INALI course spelling", "IDIEZ source reference", "Other source-reference spelling",
  "Noun", "Pronoun", "Form", "1sg form", "Stem", "Future form", "Present form", "Past form", "Infinitive / stem",
  "Imperative sg.", "Imperative pl.", "Source-course pronoun", "Full verb", "Singular", "Plural", "Source form",
  "Present state", "Past state", "Question word", "Prefix", "Object prefix", "Combined marking", "Relational noun"]);
const unique = values => [...new Set(values)];
const stripTokenPunctuation = value => value.replace(/^[¿¡.,;:?!"'“”‘’]+|[¿¡.,;:?!"'“”‘’]+$/gu, "");
const componentSpeech = value => value.trim().split(/\s*[+/]\s*/u)
  .map(piece => piece.replace(/^[–—-]+|[–—-]+$/gu, "").trim()).filter(Boolean).join(", ");
const isOwnSyntheticUrl = url => Boolean(url && (url.startsWith("/") || /^https:\/\/nahuatl-language\.s3[.-]/u.test(url)));
const isExternalRecordingUrl = url => Boolean(url && /^https?:\/\//u.test(url) && !isOwnSyntheticUrl(url));

function canonicalJobId(recipeId, settings, ssml) {
  return sha256(JSON.stringify({ recipe_id: recipeId, settings, ssml }));
}

/** Compile fixed approved content without changing a source recording or hold. */
function compileAudioInventory(inputRecords, { recipeId = google.GOOGLE_RECIPE_VERSION, settings = SETTINGS,
  buildSsml = google.buildSsml, lessonIds = [] } = {}) {
  const records = [], jobs = new Map(), groups = new Map(lessonIds.map(id => [id, new Set()]));
  const originalRecordings = new Map();
  for (const input of inputRecords) if (isExternalRecordingUrl(input.existing_audio_url) && !input.content_accuracy_hold) {
    for (const alias of [input.runtime_text, ...(input.runtime_aliases || [])]) if (alias)
      originalRecordings.set(alias.normalize("NFC").trim().toLowerCase(), input.existing_audio_url);
  }
  const ids = new Set();
  for (const input of inputRecords) {
    assert(!ids.has(input.id), `Duplicate spoken reference ${input.id}`); ids.add(input.id);
    const row = { ...input, runtime_aliases: unique([input.runtime_text, ...(input.runtime_aliases || [])].filter(Boolean)),
      units: unique(input.units || []), contexts: unique(input.contexts || []),
      text_sha256: sha256(input.runtime_text), synthesis_text_sha256: sha256(input.synthesis_text),
      hold_reasons: [...(input.hold_reasons || [])], generation_allowed: false, job_id: null };
    // Inventory-time matching preserves the exact documented spelling and
    // punctuation, with case-only differences. Runtime receives explicit
    // aliases; it never performs this search or a punctuation-blind fallback.
    if (!row.content_accuracy_hold && row.kind !== "component" && !isExternalRecordingUrl(row.existing_audio_url)) {
      const original = row.runtime_aliases.map(alias => originalRecordings.get(alias.normalize("NFC").trim().toLowerCase())).find(Boolean);
      if (original) { row.original_project_audio_url = row.existing_audio_url; row.existing_audio_url = original; row.audio_kind = "source"; }
    }
    row.native_source_audio_url = isExternalRecordingUrl(row.existing_audio_url) ? row.existing_audio_url : null;
    if (row.content_accuracy_hold) row.status = "content-accuracy-hold";
    else if (isExternalRecordingUrl(row.existing_audio_url)) row.status = "preserve-external-recording";
    else if (row.hold_reasons.length) row.status = "recipe-or-structure-hold";
    else {
      try {
        const ssml = buildSsml(row.synthesis_text, settings);
        const bytes = Buffer.byteLength(ssml, "utf8");
        if (bytes > 5000) throw new Error(`Complete utterance requires reviewed segmentation: SSML is ${bytes} bytes (5000-byte request limit).`);
        const jobId = canonicalJobId(recipeId, settings, ssml);
        const old = jobs.get(jobId);
        const groupIds = unique([...row.units.map(unit => `unit:${unit}`), ...row.contexts]);
        if (old) {
          old.reference_ids.push(row.id); old.runtime_texts = unique([...old.runtime_texts, ...row.runtime_aliases]);
          old.lesson_ids = unique([...old.lesson_ids, ...groupIds]);
        } else jobs.set(jobId, { job_id: jobId, id: jobId, kind: row.kind || "expression", text: row.synthesis_text,
          synthesis_text: row.synthesis_text, ssml, ssml_sha256: sha256(ssml), billable_characters: [...ssml].length,
          ssml_bytes: bytes, reference_ids: [row.id], runtime_texts: [...row.runtime_aliases], lesson_ids: groupIds });
        for (const id of groupIds) { if (!groups.has(id)) groups.set(id, new Set()); groups.get(id).add(jobId); }
        row.generation_allowed = true; row.job_id = jobId;
        row.status = row.existing_audio_url ? "replace-project-synthetic" : "generate-missing-fixed-content";
      } catch (error) { row.hold_reasons.push(error.message); row.status = "recipe-or-structure-hold"; }
    }
    records.push(row);
  }
  const allJobs = [...jobs.values()];
  const chars = allJobs.reduce((sum, job) => sum + job.billable_characters, 0);
  return { schema_version: 2, recipe_id: recipeId, settings, generated_at: new Date().toISOString(),
    records, jobs: allJobs, held_reference_ids: records.filter(row => row.content_accuracy_hold).map(row => row.id),
    source_bindings: records.filter(row => row.status === "preserve-external-recording").flatMap(row => row.runtime_aliases.map(text =>
      ({ reference_id: row.id, runtime_text: text, url: row.existing_audio_url }))),
    lesson_assets: [...groups].map(([id, assetIds]) => ({ id, asset_ids: [...assetIds] })),
    summary: { reference_records: records.length, candidate_reference_records: records.filter(row => row.generation_allowed).length,
      unique_synthesis_jobs: allJobs.length, external_recording_references_preserved: records.filter(row => row.status === "preserve-external-recording").length,
      existing_project_synthetic_references_replaced: records.filter(row => row.status === "replace-project-synthetic").length,
      content_accuracy_holds: records.filter(row => row.content_accuracy_hold).length,
      recipe_or_structure_holds: records.filter(row => row.status === "recipe-or-structure-hold").length,
      component_cue_references: records.filter(row => row.kind === "component").length,
      billable_characters: chars, google_standard_one_pass_usd: Number((chars * 4 / 1_000_000).toFixed(6)),
      google_standard_with_20_percent_retries_usd: Number((chars * 4 * 1.2 / 1_000_000).toFixed(6)),
      groups: groups.size },
    limitations: ["Synthesis plan only; no generation, upload, learner-state change or recording assignment.",
      "Published core content is included under the user's full replacement authorization. Missing old source metadata is not a new accuracy hold.",
      "Component cues pronounce the taught piece and are not claims that the piece is a standalone word.",
      "Exact SSML and settings determine the job identity. Punctuation, written source references and explicit display aliases remain distinct.",
      "The approved tx Air B treatment is a synthetic frication approximation, not certification of the native lateral affricate.",
      "Cost excludes free allowance, storage, delivery, review and retries beyond the specified scenario."] };
}

function buildAllCourseAudioInventory({ coreOnly = false } = {}) {
  assert.equal(google.GOOGLE_RECIPE_VERSION, EXPECTED_RECIPE, "Use the approved Air B recipe before exporting this batch.");
  const dbPath = resolveReadonlyCourseDbPath({ env: {} });
  const core = loadCurrentAudioManifest(dbPath);
  const db = loadTs("src/lib/db.ts");
  const { displayNahuatl } = loadTs("src/lib/orthography.ts");
  const { getUnifiedCoursePath, getUnifiedVocabularyEntries } = loadTs("src/lib/unified-course-path.ts");
  const { isExpansionBuildingBlock } = loadTs("src/lib/expansion-practice.ts");
  const pathLessons = getUnifiedCoursePath(db.getAllUnits());
  const rows = new Map(), exclusions = [], externalMediaLinks = [], dynamicTemplates = [], productiveContextHolds = [];
  const add = (id, text, { sourceText = text, synthesisText = sourceText, existingAudioUrl = null, kind = "expression",
    units = [], contexts = [], refs = [], scope = "published fixed learner form", holdReasons = [], contentAccuracyHold = false,
    runtimeText = displayNahuatl(text), aliases = [text], locator = null } = {}) => {
    if (!text?.trim()) return;
    const previous = rows.get(id);
    if (previous) {
      assert.equal(previous.runtime_text, runtimeText, `Changed fixed reference ${id}`);
      previous.units = unique([...previous.units, ...units]); previous.contexts = unique([...previous.contexts, ...contexts]); return;
    }
    rows.set(id, { id, kind, runtime_text: runtimeText, display_text: runtimeText, source_text: sourceText,
      synthesis_text: synthesisText, runtime_aliases: unique([runtimeText, text, ...aliases].filter(Boolean)),
      existing_audio_url: existingAudioUrl, audio_kind: isExternalRecordingUrl(existingAudioUrl) ? "source" : existingAudioUrl ? "synthetic" : "none",
      units, contexts, source_refs: refs, scope, locator, hold_reasons: holdReasons, content_accuracy_hold: contentAccuracyHold });
  };
  const coreById = new Map(core.records.map(record => [`core-${record.kind}:${record.id}`, record]));
  for (const row of core.records) {
    const id = `core-${row.kind}:${row.id}`;
    const component = id === "core-vocab:661" || /^(?:-|[a-z]$)|\//iu.test(row.runtime_text) || (row.kind === "vocab" && Number(row.id) <= 14);
    const sourceUrl = row.native_source_audio_url || row.existing_audio_url || (row.recording_available ? `/audio-google/${row.kind}/${row.id}.wav` : null);
    const approvedAcuteAlias = ["core-vocab:313", "core-vocab:360", "core-vocab:570", "core-vocab:662"].includes(id);
    add(id, row.runtime_text, { sourceText: row.synthesis_text, synthesisText: approvedAcuteAlias ? displayNahuatl(row.runtime_text)
      : component ? componentSpeech(row.synthesis_text) : row.synthesis_text,
      existingAudioUrl: sourceUrl, kind: component ? "component" : row.kind, units: row.units,
      refs: FRESH_CORE_SUPPORT[id] ? [...row.source_refs, ...FRESH_CORE_SUPPORT[id].refs] : row.source_refs,
      contentAccuracyHold: EXPLICIT_CORE_CONTENT_HOLDS.has(id),
      holdReasons: EXPLICIT_CORE_CONTENT_HOLDS.has(id) ? ["Current original-course form/meaning remains explicitly withheld; generation cannot release this context."] : [],
      scope: FRESH_CORE_SUPPORT[id]?.scope || (component ? "published pronunciation/grammar component cue, not a standalone word" : "existing selected course content; replacement authorized") });
    rows.get(id).legacy_recording_hold = row.legacy_hold;
  }
  if (!coreOnly) {
    const { collapseVariants } = loadTs("src/data/variant-groups.ts");
    for (const unit of db.getAllUnits()) {
      const vocabulary = db.getUnitVocab(unit.lesson_number);
      const collapsed = collapseVariants(vocabulary, unit.lesson_number);
      for (const card of vocabulary) if (!coreById.has(`core-vocab:${card.id}`)) add(`core-vocab-variant:${card.id}`, card.headword,
        { sourceText: card.headword, existingAudioUrl: card.audioSrc || null, kind: "vocab", units: [unit.lesson_number],
          scope: "published also-written/reference alternative; canonical teaching identity is unchanged" });
      for (const [canonicalId, notes] of Object.entries(collapsed.notes)) notes.forEach((value, index) =>
        add(`variant-note:${unit.lesson_number}:${canonicalId}:${index}`, value, { kind: "vocab", units: [unit.lesson_number],
          scope: "published reference alternative; no new synonym or dialect equivalence is asserted" }));
      for (const construction of db.getUnitConstructions(unit.lesson_number)) add(`construction:${unit.lesson_number}:${construction.priority_id}`,
        construction.example_original, { sourceText: construction.example_original, units: [unit.lesson_number],
          refs: construction.source_url ? [{ source_url: construction.source_url }] : [], scope: "selected source-reviewed construction example" });
    }
    const sourceCourse = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/nahuatlahtolli-course.json"), "utf8"));
    const original = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/v3-original-course.json"), "utf8"));
    const instructional = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/instructional-lesson-blueprints.json"), "utf8"));
    const phrases = [...original.phrases, ...instructional.supplementPhrases];
    const phraseById = new Map(phrases.map(phrase => [phrase.id, phrase]));
    const vocabulary = getUnifiedVocabularyEntries();
    const entryById = new Map(vocabulary.map(entry => [entry.id, entry]));
    const unitById = new Map(pathLessons.map(lesson => [lesson.progressId, lesson.lessonNumber]));
    const phraseUnits = new Map(), entryUnits = new Map();
    const associate = (map, id, unit) => { if (unit) map.set(id, unique([...(map.get(id) || []), unit])); };
    for (const lesson of pathLessons) {
      const detail = loadTs("src/lib/unified-course-path.ts").getUnifiedPathLesson(lesson.lessonNumber);
      for (const entry of detail?.entries || []) associate(entryUnits, entry.id, lesson.lessonNumber);
    }
    for (const lesson of instructional.lessons) {
      const unit = unitById.get(lesson.unitId);
      const b = lesson.blueprint;
      for (const entryId of b.contextCoverage?.pendingEntryIds || []) productiveContextHolds.push({
        entry_id: entryId, display: entryById.get(entryId)?.display || null, lesson_number: unit,
        scope: "The independently supported lexical fact/component can be pronounced; the omitted productive grammar/context remains withheld." });
      for (const id of [...b.vocabularyIds, ...b.contextPhraseIds, ...b.builders.flatMap(item => [item.phraseId, ...(item.acceptedPhraseIds || [])]),
        ...b.dialogues.flatMap(item => item.turns.flatMap(turn => [turn.phraseId, ...turn.gaps.flatMap(gap => gap.answerPhraseIds || [])]))]) {
        if (phraseById.has(id)) associate(phraseUnits, id, unit); if (entryById.has(id)) associate(entryUnits, id, unit);
      }
    }
    for (const unit of [...original.units, ...instructional.supplementUnits]) for (const id of unit.phraseIds)
      associate(phraseUnits, id, unitById.get(unit.id));
    for (const entry of vocabulary) add(`vocabulary:${entry.id}`, entry.display,
      { sourceText: entry.sourceSpelling, synthesisText: isExpansionBuildingBlock(entry) ? componentSpeech(entry.sourceSpelling) : entry.sourceSpelling,
        existingAudioUrl: entry.audioUrl, kind: isExpansionBuildingBlock(entry) ? "component" : "vocab", units: entryUnits.get(entry.id) || [],
        refs: [{ source_url: entry.sourceUrl, title: entry.sourceTitle, license: entry.sourceLicense }],
        scope: isExpansionBuildingBlock(entry) ? "documented reference component pronunciation cue; no standalone-word or productive-context claim" : "independently verified published lexical fact" });
    for (const phrase of phrases) add(`phrase:${phrase.id}`, phrase.nahuatl,
      { sourceText: phrase.sourceText || phrase.nahuatl, existingAudioUrl: phrase.audioUrl, units: phraseUnits.get(phrase.id) || [],
        refs: [{ source_id: phrase.sourceId }], scope: "reviewed fixed word/sentence/model in the authored course" });

    const tokenRecord = (id, token, unit, component = false, parentId = null) => add(id, token,
      { synthesisText: component ? componentSpeech(token) : stripTokenPunctuation(token), units: unit ? [unit] : [], kind: component ? "component" : "word-token",
        scope: component ? "documented sentence-builder component cue; not a standalone word" : "complete token selected from the fixed reviewed parent model",
        locator: { parent_reference_id: parentId } });
    for (const lesson of instructional.lessons) {
      const unit = unitById.get(lesson.unitId), b = lesson.blueprint;
      const firstMapped = new Set();
      for (const mapped of b.reviewedEntryForms || []) {
        const baseId = `entry-form:${lesson.unitId}:${mapped.entryId}`;
        const id = firstMapped.has(mapped.entryId) ? `${baseId}:form:${sha256(mapped.display).slice(0, 12)}` : baseId;
        firstMapped.add(mapped.entryId);
        add(id, mapped.display, { units: unit ? [unit] : [], kind: "vocab", scope: "individually reviewed complete form for this lesson entry",
          locator: { entry_id: mapped.entryId, phrase_ids: mapped.phraseIds } });
      }
      for (const builder of b.builders) {
        [builder.phraseId, ...(builder.acceptedPhraseIds || [])].forEach((phraseId, variant) => {
          const phrase = phraseById.get(phraseId); assert(phrase, `Missing builder phrase ${phraseId}`);
          const tokens = variant === 0 && builder.chunks ? builder.chunks : phrase.nahuatl.trim().split(/\s+/u);
          tokens.forEach((token, index) => tokenRecord(`builder-tile:${lesson.unitId}:${builder.id}:${variant}:${index}`, token,
            unit, Boolean(variant === 0 && builder.chunks), `phrase:${phraseId}`));
        });
      }
      for (const dialogue of b.dialogues) for (const turn of dialogue.turns) {
        const phrase = phraseById.get(turn.phraseId); assert(phrase, `Missing conversation phrase ${turn.phraseId}`);
        const tokens = phrase.nahuatl.trim().split(/\s+/u);
        for (const gap of turn.gaps) {
          const answer = gap.tokenIndexes.map(index => { assert(tokens[index] !== undefined, `Invalid gap ${gap.id}`); return tokens[index]; }).join(" ");
          tokenRecord(`dialogue-gap:${lesson.unitId}:${dialogue.id}:${turn.id}:${gap.id}`, answer, unit, false, `phrase:${turn.phraseId}`);
        }
      }
    }
    appendGrammar(rows, add, exclusions, db, displayNahuatl);
    appendConversation(add, dynamicTemplates, displayNahuatl);
    appendSourceCourse(add, sourceCourse, rows, exclusions, externalMediaLinks, displayNahuatl);
  }
  const learnerPolicy = require("./learner-audio-eligibility.cjs").buildLearnerAudioEligibility([...rows.values()]);
  const learnerExcluded = new Set(learnerPolicy.excluded_reference_ids);
  for (const row of rows.values()) if (learnerExcluded.has(row.id)) {
    row.content_accuracy_hold = true;
    row.hold_reasons.push("Excluded from current learner content; original source and historical audio are preserved privately.");
  }
  const plan = compileAudioInventory([...rows.values()], { lessonIds: pathLessons.map(lesson => `unit:${lesson.lessonNumber}`) });
  plan.learner_audio_eligibility = learnerPolicy;
  plan.scope = coreOnly ? "Original selected core audio replacements and preserved source originals" : "All fixed learner pronunciation surfaces; preserve exact external originals and explicit accuracy holds";
  plan.database = { filename: path.basename(dbPath), sha256: sha256(fs.readFileSync(dbPath)) };
  plan.source_files = Object.fromEntries(["src/data/instructional-lesson-blueprints.json", "src/data/v3-original-course.json", "src/data/v3-verified-lexicon.json",
    "src/data/nahuatlahtolli-course.json", "src/data/grammar-labs.ts", "src/data/grammar-lessons.ts", "src/data/dialogue-overrides.ts",
    "src/data/conversation-scenarios.ts", "src/data/excluded-vocab.ts", "src/data/core-vocabulary-facts.json", "scripts/generate-google-audio.js", "scripts/lib/nahuatl-pronunciation.js"].map(file => [file, sha256(fs.readFileSync(path.join(ROOT, file)))]));
  plan.excluded_instructional_text = exclusions; plan.external_media_links = externalMediaLinks; plan.dynamic_templates = dynamicTemplates;
  plan.productive_context_holds = productiveContextHolds;
  plan.summary.partial_context_lexical_items = new Set(productiveContextHolds.map(item => item.entry_id)).size;
  plan.summary.surface_counts = Object.fromEntries(unique(plan.records.map(row => row.id.split(":")[0])).map(surface =>
    [surface, plan.records.filter(row => row.id.startsWith(surface + ":")).length]));
  return plan;
}

function appendGrammar(rows, add, exclusions, db, displayNahuatl) {
  const { GRAMMAR_LABS } = loadTs("src/data/grammar-labs.ts");
  const { GRAMMAR_LESSONS, GRAMMAR_REVIEW_HOLDS } = loadTs("src/data/grammar-lessons.ts");
  const { displayGrammarText, displayGrammarComparisonCell } = loadTs("src/lib/grammar-display.ts");
  const documentedForms = new Set([...rows.values()].flatMap(row => [row.runtime_text, row.source_text])
    .filter(Boolean).map(value => displayNahuatl(value).trim().toLowerCase()));
  const isDocumentedIdentifyForm = value => /^-|-$|·/u.test(value) || documentedForms.has(displayNahuatl(value).trim().toLowerCase());
  const append = (id, value, options = {}) => {
    if (!value?.trim()) return;
    if (/\d|[<>{}]|\.{3}|…/u.test(value)) { exclusions.push({ id, text: value, reason: "metalinguistic label, variable or incomplete form; not a fixed utterance" }); return; }
    const parts = value.split(/\s*[+/]\s*/u).filter(Boolean);
    if (parts.length > 1) {
      add(id, value, { ...options, kind: "component", sourceText: value, synthesisText: componentSpeech(value.replace(/·/gu, "")),
        scope: "ordered cue for the explicitly displayed alternatives/components; no combined sentence or new word is asserted" });
      parts.forEach((piece, i) => append(id + `:piece:${i}`, piece, { ...options, runtimeText: undefined, kind: value.includes("+") ? "component" : options.kind })); return;
    }
    const trailingLabel = value.match(/^([\p{L}\p{M}\s·-]+)\s+\([^)]*\)$/u);
    const raw = trailingLabel ? trailingLabel[1].trim() : value;
    if (!/^[a-zāēīōūáéíóúüñ\s·'¿¡?!.,;:-]+$/iu.test(raw)) {
      exclusions.push({ id, text: value, reason: "mixed explanatory/phonetic text; individual actual form required" }); return;
    }
    const component = options.kind === "component" || /^-|-$|\s-/u.test(raw);
    add(id, raw, { ...options, kind: component ? "component" : options.kind || "grammar", sourceText: raw,
      synthesisText: componentSpeech(raw.replace(/·/gu, "")), aliases: [raw, displayNahuatl(raw)],
      scope: component ? "explicitly taught grammatical component cue, not a standalone word" : "published fixed grammar example/form; no new conjugation generated" });
  };
  for (const lab of GRAMMAR_LABS) {
    const options = { units: [lab.unit], contexts: [`grammar-lab:${lab.id}`] };
    lab.examples.forEach((example, i) => append(`grammar-example:${lab.id}:${i}`, example.nahuatl, options));
    lab.drills.forEach((drill, i) => (drill.items || drill.rows || []).forEach((item, j) => {
      const scope = { ...options, kind: drill.kind === "identify" || (lab.id === "noun-endings" && drill.kind === "produce") ? "component" : "grammar" };
      if (drill.kind !== "identify" || isDocumentedIdentifyForm(item.answer)) {
        append(`grammar-answer:${lab.id}:${i}:${j}`, item.answer, scope);
        (item.accepted || []).forEach((value, k) => append(`grammar-answer:${lab.id}:${i}:${j}:alt:${k}`, value, scope));
      } else exclusions.push({ id: `grammar-answer:${lab.id}:${i}:${j}`, text: item.answer, reason: "English semantic answer label, not a Nahuatl pronunciation target" });
      if (item.input) append(`grammar-input:${lab.id}:${i}:${j}`, item.input, options);
      if (drill.kind === "identify" && item.prompt) {
        if (isDocumentedIdentifyForm(item.prompt)) append(`grammar-input:${lab.id}:${i}:${j}`, item.prompt, options);
        else exclusions.push({ id: `grammar-input:${lab.id}:${i}:${j}`, text: item.prompt, reason: "English task prompt, not a Nahuatl pronunciation target" });
      }
    }));
  }
  for (const lesson of GRAMMAR_LESSONS) {
    const options = { units: lesson.relatedUnits, contexts: [`grammar:${lesson.id}`] };
    add(`grammar-title:${lesson.id}`, lesson.nahuatlTitle, { ...options, kind: "grammar-title",
      synthesisText: lesson.nahuatlTitle.replace(/\s*[—–]\s*/gu, ", "),
      scope: "existing structured Nahuatl heading read as written; no new glossary entry, derivation or independent lexical certification is asserted" });
    lesson.sections.forEach((section, i) => {
      if (section.kind === "examples") section.items.forEach((item, j) => append(`grammar-reference-example:${lesson.id}:${i}:${j}`, item.nahuatl, options));
      if (section.kind === "paradigm") section.rows.forEach((row, j) => ["person", "form", "gloss"].forEach((field, column) => {
        if (!FORM_HEADERS.has(section.headers[column])) return;
        if (lesson.id === "orthographic-systems" && section.heading === "Quick conversion cheatsheet" &&
          /plain vowels in practice/u.test(row[field])) {
          exclusions.push({ id: `grammar-table:${lesson.id}:${i}:${j}:${column}`, text: row[field], reason: "English spelling-policy description, not a spoken form" }); return;
        }
        const runtime = lesson.id === "orthographic-systems" ? displayGrammarComparisonCell(row[field], section.headers[column]) : displayGrammarText(row[field]);
        append(`grammar-table:${lesson.id}:${i}:${j}:${column}`, row[field], { ...options, runtimeText: runtime,
          kind: /Prefix|marking|Object prefix|Relational noun/u.test(section.headers[column]) ? "component" : "grammar" });
      }));
    });
    for (const dialogue of db.getGrammarDialogues(lesson.relatedUnits)) {
      const ref = rows.get(`core-dialogue:${dialogue.lesson_dialogue_id}`);
      if (ref) ref.contexts = unique([...ref.contexts, `grammar:${lesson.id}`]);
    }
  }
  for (const [topic, reason] of Object.entries(GRAMMAR_REVIEW_HOLDS)) exclusions.push({ id: `grammar:${topic}`, reason: `Unpublished specialist-review hold retained: ${reason}` });
}

function appendConversation(add, dynamicTemplates) {
  const { getConversationScenarios, getSentencePatterns, renderSentenceTemplate } = loadTs("src/data/conversation-scenarios.ts");
  for (const scenario of getConversationScenarios()) for (const turn of scenario.turns) {
    for (const [i, value] of [turn, ...turn.options].entries()) {
      const id = `conversation:${scenario.id}:${turn.id}:${i === 0 ? "model" : value.id}`;
      const numericMarket = id === "conversation:food-market:order:model";
      if (numericMarket) {
        assert.equal(value.nahuatl, "Aa arroz īcā 15 cē kiloh huan aceyiteh 30, huan iztātl 10.", "Changed exact market utterance; review its spoken numeral override.");
        const verified = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/v3-verified-lexicon.json"), "utf8"));
        for (const [entryId, spelling, meaning] of [["word-v3i-53dbadc0e8948500", "caxtōlli", "fifteen"],
          ["word-v3i-855395749ccedd1a", "mahtlactli", "ten"], ["word-v3b-676eb1ab37153e34", "cēmpōhualli huan mahtlactli", "thirty"]]) {
          const fact = verified.entries.find(entry => entry.id === entryId);
          assert.equal(fact?.sourceSpelling, spelling, "Changed verified numeral pronunciation fact");
          assert.equal(fact?.meaningEn, meaning, "Changed verified numeral sense");
        }
      }
      add(id, value.nahuatl, { existingAudioUrl: value.audioUrl, units: scenario.unitNumbers || [], contexts: [`conversation:${scenario.id}`],
        synthesisText: numericMarket ? value.nahuatl.replace("15", "caxtōlli").replace("30", "cēmpōhualli huan mahtlactli").replace("10", "mahtlactli") : value.nahuatl,
        refs: numericMarket ? [...(value.sources || []), { scope: "Exact spoken numeral facts only; written digits remain unchanged",
          entry_ids: ["word-v3i-53dbadc0e8948500", "word-v3i-855395749ccedd1a", "word-v3b-676eb1ab37153e34"],
          source_url: "https://tlahtolli.coerll.utexas.edu/tlamactiliztli-24-lesson-24-namantzin-eltoc-tianquiz-there-is-a-market-right-now/" }] : value.sources || [],
        scope: numericMarket ? "published exact market utterance with independently verified 15/30/10 pronunciation-only substitutions; no generic number reader" : "published fixed conversation model/reply/distractor" });
    }
  }
  for (const pattern of getSentencePatterns()) {
    for (const slot of pattern.slots) for (const choice of slot.choices) add(`sentence-choice:${pattern.id}:${choice.id}`, choice.nahuatl,
      { existingAudioUrl: choice.audioUrl, units: pattern.unitNumbers || [], contexts: ["sentences"], refs: [choice.source], scope: "published fixed sentence selection" });
    if (pattern.template) {
      const values = Object.fromEntries(pattern.template.freeSlots.map(slot => [slot.id, slot.example]));
      const rendered = renderSentenceTemplate(pattern.id, values);
      if (rendered) add(`sentence-template:${pattern.id}:example`, rendered.nahuatl,
        { units: pattern.unitNumbers || [], contexts: ["sentences"], scope: "documented template with its existing fixed example name; no learner data used" });
      dynamicTemplates.push({ pattern_id: pattern.id, fixed_example_values: values, free_slots: pattern.template.freeSlots.map(slot => slot.id),
        scope: "Arbitrary user names are not a finite bulk inventory. Existing fixed example is included; request-time audio needs separate text/recipe validation." });
    }
  }
}

function appendSourceCourse(add, course, rows, exclusions, externalMediaLinks, displayNahuatl) {
  const known = new Set([...rows.values()].flatMap(row => [row.runtime_text, row.source_text]).filter(Boolean)
    .flatMap(text => text.toLowerCase().match(/[\p{L}\p{M}]+/gu) || []));
  const native = value => /^[acehiklmnpqstuwxyzāēīōūáéíóúüñ\s¿¡?!.,;:'-]+$/iu.test(value)
    && (/[āēīōū]/iu.test(value) || (value.toLowerCase().match(/[\p{L}\p{M}]+/gu) || []).some(word => known.has(word) && word.length >= 3));
  for (const lesson of course.lessons) {
    const options = { units: [lesson.number], contexts: [`source-course:${lesson.number}`], refs: [{ source_url: lesson.originalUrl }], scope: "fixed licensed source-course form; preserve external recordings" };
    lesson.vocabulary.forEach((word, i) => add(`source-vocabulary:${lesson.number}:${i + 1}`, word.headword,
      { ...options, existingAudioUrl: word.audioUrl, kind: "vocab" }));
    lesson.mediaLinks.filter(link => link.type === "audio").forEach((link, i) => externalMediaLinks.push({ reference_id: `source-media:${lesson.number}:${i}`,
      url: link.url, lesson_id: `source-course:${lesson.number}`, scope: "external passage/asset retained; never replace or impersonate an isolated word" }));
    lesson.sections.forEach((section, i) => section.body.forEach((line, j) => {
      if (/^(?:Audio|Image|Imagen):|https?:\/\//iu.test(line)) return;
      const speaker = line.match(/^(?:[ABCD]|[A-Z][a-z]+):\s*(.+)$/u);
      const quote = line.match(/^([^“”"]+)\s*[“"]([^“”"]+)[”"]\s*$/u);
      const value = (speaker?.[1] || quote?.[1] || line).trim();
      const glyphs = { ch: "ch", m: "m", n: "n", p: "p", t: "t", y: "y", l: "l", cu: "kw", uc: "kw", qu: "k", hu: "w", uh: "w", h: "h", x: "x", tl: "tl", tz: "ts", a: "a", e: "e", i: "i", o: "o" };
      const glyphKey = value.replace(/^\/|\/$/gu, "").toLowerCase();
      const glyph = lesson.number === 1 && Object.hasOwn(glyphs, glyphKey) ? glyphs[glyphKey] : null;
      const quotedShortForm = quote && known.has(value.toLowerCase()) && /^[\p{L}\p{M}]{1,2}-?$/u.test(value);
      if (native(value) || glyph || quotedShortForm) add(`source-body:${lesson.number}:${i}:${j}`, value,
        { ...options, kind: glyph || quotedShortForm || /^-|-$|\//u.test(value) ? "component" : "expression",
          synthesisText: glyph || componentSpeech(value), locator: { lesson_number: lesson.number, section_index: i, body_index: j },
          ...(glyph ? { scope: "exact sound/spelling comparison explicitly taught in source lesson 1; cue is a consonant/vowel, not a new word" } : {}),
          aliases: [value, displayNahuatl(value)] });
      else if (speaker || quote) exclusions.push({ id: `source-body:${lesson.number}:${i}:${j}`, text: line,
        reason: "Mixed source explanation/translation or uncertain speech segmentation; no automatic language or utterance inference" });
    }));
  }
}

module.exports = { SETTINGS, EXPECTED_RECIPE, canonicalJobId, compileAudioInventory, buildAllCourseAudioInventory };
