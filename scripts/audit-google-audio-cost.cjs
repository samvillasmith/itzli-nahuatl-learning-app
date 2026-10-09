"use strict";

// Offline estimate only. No credentials, environment-file reads, remote asset
// downloads, provider execution, production data or playback bindings.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { ROOT, loadTs, loadCurrentAudioManifest, sha256 } = require("./lib/course-audio-inputs");
const { collectAudio } = require("./audit-audio-integrity");
const { buildV3MediaAudit } = require("./audit-v3-media-expansion");
const { buildSsml, googleDefaults, GOOGLE_RECIPE_VERSION } = require("./generate-google-audio");

const RATE = 4;
const CHECKED_ON = "2026-10-06";
const PRICING_URL = "https://cloud.google.com/text-to-speech/pricing";
const dollar = (characters, passes = 1) => Number((characters * RATE * passes / 1_000_000).toFixed(6));
const count = (text) => [...text].length;
const FORM_HEADERS = new Set([
  "Example word", "INALI course spelling", "Noun", "Pronoun", "Form",
  "1sg form", "Future form", "Present form", "Past form", "Imperative sg.",
  "Imperative pl.", "Source-course pronoun", "Full verb", "Singular", "Plural",
  "Source form", "Present state", "Past state", "Question word",
]);

function recipes(rows, availableKeys, key) {
  const jobs = new Map(), holds = [];
  for (const row of rows) {
    let ssml;
    try { ssml = buildSsml(row.input_text || row.text, { inputMode: "phoneme" }); }
    catch (error) { holds.push({ ...row, reason: error.message }); continue; }
    const digest = sha256(ssml);
    const existing = jobs.get(digest);
    const placement = { area: row.area, id: row.id };
    if (existing) { existing.placements.push(placement); continue; }
    jobs.set(digest, {
      text: row.text, input_text: row.input_text || row.text, ssml_sha256: digest,
      billable_characters: count(ssml), utf8_bytes: Buffer.byteLength(ssml, "utf8"),
      placements: [placement], contains_tl: /tl/iu.test(row.input_text || row.text),
      existing_recording_lead: availableKeys.has(key(row.text)),
    });
  }
  const values = [...jobs.values()];
  const chars = values.reduce((sum, job) => sum + job.billable_characters, 0);
  const leads = values.filter(job => job.existing_recording_lead);
  const afterLeadReviewChars = values.filter(job => !job.existing_recording_lead)
    .reduce((sum, job) => sum + job.billable_characters, 0);
  return {
    candidate_placements: rows.length, exact_ssml_jobs: values.length,
    billable_characters: chars, cost_one_pass_usd: dollar(chars),
    cost_with_twenty_percent_retries_usd: dollar(chars, 1.2),
    cost_two_complete_passes_usd: dollar(chars, 2),
    jobs_containing_tl: values.filter(job => job.contains_tl).length,
    jobs_with_recording_leads: leads.length,
    after_every_recording_lead_is_approved: {
      jobs: values.length - leads.length, billable_characters: afterLeadReviewChars,
      cost_one_pass_usd: dollar(afterLeadReviewChars),
      cost_with_twenty_percent_retries_usd: dollar(afterLeadReviewChars, 1.2),
      status: "Conditional saving only; no source recording was assigned by this audit.",
    },
    input_holds: holds, jobs: values,
  };
}

function additionalWrittenForms() {
  const rows = [], components = [];
  const add = (area, id, text) => {
    if (!text) return;
    // A suffix, segmentation, pronunciation symbol or alternatives table is
    // not a complete utterance to synthesize as a word.
    if (/^[+-]|[+-]$|[·+Øø/()<>…—]|\d/u.test(text)) {
      components.push({ area, id, text }); return;
    }
    rows.push({ area, id, text, input_text: text });
  };
  const { GRAMMAR_LABS } = loadTs("src/data/grammar-labs.ts");
  for (const lab of GRAMMAR_LABS) {
    lab.examples.forEach((example, i) => add("legacy-grammar-example", `${lab.id}:${i}`, example.nahuatl));
    lab.drills.forEach((drill, i) => {
      if (drill.kind === "identify") return;
      (drill.items || drill.rows || []).forEach((item, j) => {
        // Transform inputs can be dependent stems, and this noun-ending produce
        // drill asks for extracted stems. Do not manufacture isolated stem audio.
        if (drill.kind === "transform" && item.input)
          components.push({ area: "legacy-grammar-input", id: `${lab.id}:${i}:${j}`, text: item.input });
        if (lab.id === "noun-endings" && drill.kind === "produce") {
          components.push({ area: "legacy-grammar-answer", id: `${lab.id}:${i}:${j}`, text: item.answer });
          return;
        }
        add("legacy-grammar-answer", `${lab.id}:${i}:${j}`, item.answer);
        (item.accepted || []).forEach((value, k) => add("legacy-grammar-alternative", `${lab.id}:${i}:${j}:${k}`, value));
      });
    });
  }
  const { GRAMMAR_LESSONS } = loadTs("src/data/grammar-lessons.ts");
  for (const lesson of GRAMMAR_LESSONS) lesson.sections.forEach((section, i) => {
    if (section.kind === "examples") section.items.forEach((item, j) =>
      add("grammar-reference-example", `${lesson.id}:${i}:${j}`, item.nahuatl));
    if (section.kind === "paradigm" && !(lesson.id === "orthographic-systems" && section.heading === "Quick conversion cheatsheet")) section.rows.forEach((row, j) => {
      // Header semantics select actual form columns; an alphabet check alone
      // would wrongly accept English cells such as "snake", "me" or "them".
      ["person", "form", "gloss"].forEach((field, column) => {
        const value = row[field];
        if (!FORM_HEADERS.has(section.headers[column])) return;
        const joined = value.replace(/·/gu, "");
        if (/^[acehiklmnpqstuwxyzāēīōū\s.,!?¿¡-]+$/iu.test(joined))
          add("grammar-reference-table", `${lesson.id}:${i}:${j}:${column}`, joined);
        else components.push({ area: "grammar-reference-table", id: `${lesson.id}:${i}:${j}:${column}`, text: value });
      });
    });
  });
  const { getUnitConstructions } = loadTs("src/lib/db.ts");
  for (let unit = 1; unit <= 43; unit++) getUnitConstructions(unit).forEach((row, index) =>
    add("legacy-construction", `${unit}:${index}`, row.example_original));
  return { rows, components };
}

function buildGoogleAudioCostAudit() {
  const media = buildV3MediaAudit();
  const baseline = collectAudio();
  const manifest = loadCurrentAudioManifest();
  const coreInput = new Map(manifest.records.map(row => [`core-${row.kind}:${row.id}`, row.synthesis_text]));
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/v3-verified-lexicon.json"), "utf8"));
  const course = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/v3-original-course.json"), "utf8"));
  const instructional = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/instructional-lesson-blueprints.json"), "utf8"));
  const { isExpansionBuildingBlock } = loadTs("src/lib/expansion-practice.ts");
  const baseRows = baseline.rows.filter(row => row.area.startsWith("core-") || /^(conversation-|sentence-choice)/u.test(row.area))
    .map(row => ({ ...row, input_text: coreInput.get(`${row.area}:${row.id}`) || row.text,
      exclusion: row.area.startsWith("core-") ? (!row.generation_allowed ? "Core content review hold" : null) : row.generation_hold }));
  const wordRows = catalog.entries.map(entry => ({ area: "verified-vocabulary", id: entry.id,
    text: entry.display, input_text: entry.sourceSpelling || entry.display, url: entry.audioUrl,
    exclusion: isExpansionBuildingBlock(entry) ? "Bare dependent building block; complete-form teaching required" : null }));
  const phraseRows = [
    ...course.phrases.map(phrase => ({ ...phrase, area: "original-course-expression" })),
    ...instructional.supplementPhrases.map(phrase => ({ ...phrase, area: "instructional-expression" })),
  ].map(phrase => ({ area: phrase.area, id: phrase.id, text: phrase.nahuatl,
    input_text: phrase.sourceText || phrase.nahuatl, url: phrase.audioUrl, exclusion: null }));
  const allRows = [...baseRows, ...wordRows, ...phraseRows];
  const availableKeys = new Set([...baseline.rows, ...allRows].filter(row => row.url && row.text).map(row => baseline.key(row.text)));
  const missing = allRows.filter(row => !row.url);
  const eligible = missing.filter(row => !row.exclusion);
  assert.equal(missing.length, media.summary.combined_audio.missing_record_references_before_dedupe,
    "Independent fixed-record inventory must reconcile with the expansion census.");
  assert.equal(new Set(missing.map(row => baseline.key(row.text))).size, media.summary.combined_audio.distinct_missing_texts,
    "Independent normalized missing-text inventory must reconcile with the expansion census.");
  const fullRecipe = recipes(eligible, availableKeys, baseline.key);
  const availableOrKnownKeys = new Set([...baseline.rows, ...allRows].filter(row => row.text).map(row => baseline.key(row.text)));
  const extra = additionalWrittenForms();
  const extraMissing = extra.rows.filter(row => !availableOrKnownKeys.has(baseline.key(row.text)));
  const extraRecipe = recipes(extraMissing, availableKeys, baseline.key);
  const exactCombined = recipes([...eligible, ...extraMissing], availableKeys, baseline.key);
  const defaultSettings = googleDefaults({}); // Deliberately do not inspect local environment settings.
  return {
    schema_version: 1, checked_on: CHECKED_ON, generated_at: new Date().toISOString(),
    scope: "All currently unassigned fixed audio records; supplementary unbound grammar text is a separate scope sensitivity.",
    provider: { name: "Google Cloud Text-to-Speech", pricing_url: PRICING_URL,
      usd_per_million_characters: RATE, monthly_free_standard_characters: 4_000_000,
      free_allowance_remaining: "Unknown; no account or billing access", defaults: {
        voice: defaultSettings.voiceName, language: defaultSettings.languageCode,
        speaking_rate: defaultSettings.speakingRate, pitch: defaultSettings.pitch,
        encoding: defaultSettings.audioEncoding, input_mode: defaultSettings.inputMode,
      }, recipe: GOOGLE_RECIPE_VERSION,
      pricing_basis: "Unicode input characters, including spaces/punctuation/SSML tags except mark; no mark tags occur in this recipe.",
    },
    source_files: Object.fromEntries([
      "src/data/v3-verified-lexicon.json", "src/data/v3-original-course.json",
      "src/data/instructional-lesson-blueprints.json", "src/data/grammar-labs.ts",
      "src/data/grammar-lessons.ts", "src/data/construction-review.ts",
      "scripts/generate-google-audio.js", "scripts/lib/nahuatl-pronunciation.js",
    ].map(file => [file, sha256(fs.readFileSync(path.join(ROOT, file)))])),
    media_census: media.summary,
    all_missing_records: { references: missing.length, normalized_texts: new Set(missing.map(row => baseline.key(row.text))).size,
      candidate_references_before_recipe_check: eligible.length,
      excluded_references: missing.filter(row => row.exclusion).length,
      exclusions: missing.filter(row => row.exclusion).map(({ area, id, text, exclusion }) => ({ area, id, text, exclusion })) },
    normalized_census_estimate: media.summary.combined_audio,
    exact_ssml_estimate: fullRecipe,
    additional_unbound_grammar_text: {
      selected_written_references: extra.rows.length, new_references_outside_fixed_audio_scope: extraMissing.length,
      skipped_components_and_metalinguistic_cells: extra.components.length,
      ...extraRecipe,
      status: "Optional inventory sensitivity only. These texts have no fixed audio binding; recipe acceptance is not a grammar/content approval. Do not batch until individually reviewed and bound.",
    },
    fixed_plus_optional_text_ceiling: { exact_ssml_jobs: exactCombined.exact_ssml_jobs,
      billable_characters: exactCombined.billable_characters, cost_one_pass_usd: exactCombined.cost_one_pass_usd,
      cost_with_twenty_percent_retries_usd: exactCombined.cost_with_twenty_percent_retries_usd,
      status: "Arithmetic scope sensitivity, not an approved generation batch." },
    no_generation_performed: true,
  };
}

if (require.main === module) {
  const audit = buildGoogleAudioCostAudit();
  if (process.argv.includes("--write")) {
    fs.mkdirSync(path.join(ROOT, "data/media-audit"), { recursive: true });
    fs.writeFileSync(path.join(ROOT, "data/media-audit/google-audio-cost-audit.json"), JSON.stringify(audit, null, 2) + "\n");
  }
  console.log(JSON.stringify({ all_missing_records: { ...audit.all_missing_records, exclusions: undefined },
    normalized_census_estimate: audit.normalized_census_estimate,
    exact_ssml_estimate: { ...audit.exact_ssml_estimate, jobs: undefined },
    additional_unbound_grammar_text: { ...audit.additional_unbound_grammar_text, jobs: undefined },
    fixed_plus_optional_text_ceiling: audit.fixed_plus_optional_text_ceiling }, null, 2));
}
module.exports = { buildGoogleAudioCostAudit };
