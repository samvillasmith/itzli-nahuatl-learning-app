"use strict";

// Local census and planning only. No environment credentials, HTTP requests,
// provider execution, image/audio generation or production learner access.
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, loadTs, loadCurrentAudioManifest, sha256 } = require("./lib/course-audio-inputs");
const { collectAudio, collectPublishedAudio } = require("./audit-audio-integrity");
const { buildAudit: buildImageAudit } = require("./audit-image-integrity");
const { buildSsml, GOOGLE_RECIPE_VERSION } = require("./generate-google-audio");
const { reviewedVocabularyLabel } = require("../src/lib/reviewed-vocabulary-labels.cjs");

const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[¿¡?!.,:;“”"']/g, "").replace(/\s+/g, " ").trim();
const conceptKey = (headword, meaning) => `${normalize(headword)}|${normalize(meaning).replace(/^to /, "")}`;
const unique = (values) => [...new Set(values)];
const imageBlocklist = require("./config/openai-word-image-blocklist.json");
const reviewedImageModes = require("./config/openai-reviewed-image-allowlist.json");
const blockedImageHeadwords = new Set(imageBlocklist.blockedHeadwords.map(normalize));
const reviewedImageHeadwords = new Set(reviewedImageModes.entries.map(entry => normalize(entry.headword)));
const imageGenerationRules = imageBlocklist.rules.map(rule => new RegExp(rule.pattern, "iu"));

function generationImageExcluded(headword, meanings, runtimePolicy) {
  // A reviewed source-spelling alias must not silently approve an INALI target.
  // Use the generator's headword/pattern rules as well as non-overridable runtime rules.
  if (runtimePolicy(headword, ...meanings)) return true;
  if (reviewedImageHeadwords.has(normalize(headword))) return false;
  return blockedImageHeadwords.has(normalize(headword)) ||
    imageGenerationRules.some(rule => rule.test([headword, ...meanings].filter(Boolean).join(" ")));
}

function buildV3MediaAudit() {
  const catalogPath = "src/data/v3-verified-lexicon.json";
  const coursePath = "src/data/v3-original-course.json";
  const instructionalPath = "src/data/instructional-lesson-blueprints.json";
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, catalogPath), "utf8"));
  catalog.entries = catalog.entries.map(entry => {
    const correction = reviewedVocabularyLabel(entry.id, entry.meaningEn, entry.meaningEs, entry.sourceLocator?.sourceFactReviewHash);
    return correction ? { ...entry, meaningEn: correction.meaningEn, meaningEs: correction.meaningEs } : entry;
  });
  const course = JSON.parse(fs.readFileSync(path.join(ROOT, coursePath), "utf8"));
  const instructional = JSON.parse(fs.readFileSync(path.join(ROOT, instructionalPath), "utf8"));
  const baseline = collectAudio();
  const { isExpansionBuildingBlock } = loadTs("src/lib/expansion-practice.ts");
  const imageAudit = buildImageAudit();
  const manifest = loadCurrentAudioManifest();
  const coreInputs = new Map(manifest.records.map(row => [`core-${row.kind}:${row.id}`, row.synthesis_text]));
  const catalogRows = catalog.entries.map(entry => ({ area: "verified-vocabulary", id: entry.id,
    text: entry.display, input_text: entry.sourceSpelling || entry.display,
    url: entry.audioUrl, source_url: entry.sourceUrl, new_written_form: entry.newToCourse,
    form_kind: entry.formKind, building_block: isExpansionBuildingBlock(entry),
    eligible_candidate: !isExpansionBuildingBlock(entry) }));
  const phraseRows = course.phrases.map(phrase => ({ area: "original-course-expression", id: phrase.id,
    text: phrase.nahuatl, input_text: phrase.sourceText || phrase.nahuatl,
    url: phrase.audioUrl, source_id: phrase.sourceId, eligible_candidate: true }));
  const instructionalRows = instructional.supplementPhrases.map(phrase => ({ area: "instructional-expression", id: phrase.id,
    text: phrase.nahuatl, input_text: phrase.sourceText || phrase.nahuatl,
    url: phrase.audioUrl, source_id: phrase.sourceId, eligible_candidate: true }));
  const baselineMissing = baseline.rows.filter(row => !row.url &&
    (row.area.startsWith("core-") || /^(conversation-|sentence-choice)/.test(row.area)));
  const baselineCandidates = baselineMissing.filter(row => row.area.startsWith("core-")
    ? row.generation_allowed : !row.generation_hold).map(row => ({ ...row,
      input_text: coreInputs.get(`${row.area}:${row.id}`) || row.text, eligible_candidate: true }));
  const missingRows = [...baselineMissing, ...catalogRows.filter(row => !row.url), ...phraseRows.filter(row => !row.url), ...instructionalRows.filter(row => !row.url)];
  const candidateRows = [...baselineCandidates, ...catalogRows.filter(row => !row.url && row.eligible_candidate), ...phraseRows.filter(row => !row.url), ...instructionalRows.filter(row => !row.url && row.eligible_candidate)];
  const availableKeys = new Set([...baseline.rows, ...catalogRows, ...phraseRows, ...instructionalRows]
    .filter(row => row.url && row.text).map(row => baseline.key(row.text)));
  const jobs = new Map();
  for (const row of candidateRows) {
    const key = baseline.key(row.text);
    const existing = jobs.get(key);
    const placement = { area: row.area, id: row.id };
    if (existing) { existing.placements.push(placement); continue; }
    let ssml = null, recipeHold = null;
    try { ssml = buildSsml(row.input_text, { inputMode: "phoneme" }); }
    catch (error) { recipeHold = error.message; }
    jobs.set(key, { text: row.text, input_text: row.input_text, placements: [placement],
      input_recipe_status: recipeHold ? "held" : "candidate", input_recipe_hold: recipeHold,
      ssml_characters: ssml ? [...ssml].length : null,
      contains_tl: normalize(row.input_text).includes("tl"),
      existing_exact_text_recording_lead: availableKeys.has(key),
      status: "not-generated-not-approved" });
  }
  const audioJobs = [...jobs.values()];
  const supportedJobs = audioJobs.filter(row => row.input_recipe_status === "candidate");
  const ssmlCharacters = supportedJobs.reduce((total, row) => total + row.ssml_characters, 0);

  const { getWordImage, isExactPublishedImageReview } = loadTs("src/data/word-images.ts");
  const { isImageCardExcluded } = loadTs("src/lib/image-card-safety.ts");
  const { isAppContentExcluded } = loadTs("src/lib/app-content-safety.ts");
  const images = catalog.entries.map(entry => {
    const buildingBlock = isExpansionBuildingBlock(entry);
    const cueReviewPreferred = /(?:pronoun|conjunction|interrogative|quantifier|particle|number|ordinal|adverb|relational|possessed-stem|bound-stem)/iu
      .test(entry.partOfSpeech || "");
    const safety = [entry.display, entry.sourceSpelling, entry.meaningEn, entry.meaningEs, entry.partOfSpeech];
    const appExcluded = isAppContentExcluded(...safety);
    const imageExcluded = generationImageExcluded(entry.display,
      [entry.meaningEn, entry.meaningEs, entry.partOfSpeech], isImageCardExcluded);
    const candidate = getWordImage(entry.display, { allowLegacyFallback: true,
      safetyText: [entry.meaningEn, entry.meaningEs, entry.partOfSpeech, entry.sourceSpelling] });
    return { id: entry.id, headword: entry.display, gloss: entry.meaningEn, new_written_form: entry.newToCourse,
      bound_on_expansion_surface: false, app_excluded: appExcluded, image_policy_excluded: imageExcluded,
      building_block: buildingBlock, cue_review_preferred: cueReviewPreferred,
      reuse_candidate_url: candidate?.url || null,
      reuse_has_prior_exact_image_review: Boolean(candidate && isExactPublishedImageReview(candidate)),
      generation_candidate: !buildingBlock && !appExcluded && !imageExcluded && !candidate,
      proposal_route: buildingBlock ? "complete-form-pedagogy-required" : appExcluded || imageExcluded
        ? "policy-excluded" : cueReviewPreferred ? "precise-interface-cue-review" : "meaning-and-asset-review",
      status: "no-new-image-generated; reuse-and-meaning-review-pending" };
  });
  const coreImageGaps = imageAudit.cards.filter(card => !card.selected && card.state !== "structured-cue")
    .map(card => ({ pool: "core", headword: card.headword, gloss: card.gloss_en,
      excluded: isAppContentExcluded(card.headword, card.gloss_en) || generationImageExcluded(card.headword, [card.gloss_en], isImageCardExcluded) }));
  const oldPackGaps = imageAudit.expansion.filter(entry => !entry.candidate).map(entry => ({
    pool: "previous-vocabulary-packs", headword: entry.headword, gloss: entry.gloss_en,
    excluded: isAppContentExcluded(entry.headword, entry.gloss_en) || generationImageExcluded(entry.headword, [entry.gloss_en], isImageCardExcluded) }));
  const verifiedGaps = images.filter(entry => !entry.reuse_candidate_url).map(entry => ({
    pool: "verified-vocabulary", headword: entry.headword, gloss: entry.gloss,
    excluded: entry.building_block || entry.app_excluded || entry.image_policy_excluded,
    policy_excluded: entry.app_excluded || entry.image_policy_excluded,
    building_block: entry.building_block, cue_review_preferred: entry.cue_review_preferred }));
  const concepts = new Map();
  for (const entry of [...coreImageGaps, ...oldPackGaps, ...verifiedGaps]) {
    const key = conceptKey(entry.headword, entry.gloss);
    const existing = concepts.get(key);
    if (existing) {
      existing.pools = unique([...existing.pools, entry.pool]); existing.excluded ||= entry.excluded;
      existing.policy_excluded ||= entry.policy_excluded ?? entry.excluded;
      existing.building_block ||= Boolean(entry.building_block);
      existing.cue_review_preferred ||= Boolean(entry.cue_review_preferred);
    } else concepts.set(key, { headword: entry.headword, gloss: entry.gloss, pools: [entry.pool], excluded: entry.excluded,
      policy_excluded: entry.policy_excluded ?? entry.excluded, building_block: Boolean(entry.building_block),
      cue_review_preferred: Boolean(entry.cue_review_preferred) });
  }
  const imageConcepts = [...concepts.values()];
  const originalCourseAudio = {
    phrase_records: phraseRows.length, source_linked_audio: phraseRows.filter(row => row.url).length,
    missing_audio: phraseRows.filter(row => !row.url).length,
    distinct_missing_texts: new Set(phraseRows.filter(row => !row.url).map(row => baseline.key(row.text))).size,
    unit_phrase_references: course.units.reduce((total, unit) => total + unit.phraseIds.length, 0),
    unit_phrase_references_without_audio: course.units.reduce((total, unit) => total + unit.phraseIds.filter(id =>
      !course.phrases.find(phrase => phrase.id === id)?.audioUrl).length, 0),
  };
  const summary = {
    baseline_audio: baseline.summary.total,
    verified_vocabulary: {
      records: catalogRows.length, new_written_forms: catalogRows.filter(row => row.new_written_form).length,
      source_linked_audio: catalogRows.filter(row => row.url).length, missing_audio: catalogRows.filter(row => !row.url).length,
      new_written_forms_source_audio: catalogRows.filter(row => row.new_written_form && row.url).length,
      new_written_forms_missing_audio: catalogRows.filter(row => row.new_written_form && !row.url).length,
      building_block_records: catalogRows.filter(row => row.building_block).length,
      building_blocks_missing_audio: catalogRows.filter(row => row.building_block && !row.url).length,
      standalone_missing_audio_candidates: catalogRows.filter(row => !row.building_block && !row.url).length,
      unillustrated_on_expansion_surfaces: images.length,
      reuse_candidates: images.filter(row => row.reuse_candidate_url).length,
      reuse_candidates_with_prior_exact_image_review: images.filter(row => row.reuse_has_prior_exact_image_review).length,
      without_reuse_candidate: images.filter(row => !row.reuse_candidate_url).length,
      image_policy_excluded: images.filter(row => row.image_policy_excluded).length,
      image_generation_candidates: images.filter(row => row.generation_candidate).length,
      building_block_image_jobs_deferred: images.filter(row => row.building_block && !row.reuse_candidate_url).length,
      precise_interface_cue_review_candidates: images.filter(row => !row.building_block && row.cue_review_preferred && !row.image_policy_excluded && !row.app_excluded).length,
    },
    original_course: originalCourseAudio,
    instructional_course: {
      contextual_units: instructional.lessons.length,
      additional_phrase_records: instructionalRows.length,
      source_linked_audio: instructionalRows.filter(row=>row.url).length,
      missing_audio: instructionalRows.filter(row=>!row.url).length,
      builders: instructional.lessons.reduce((total,lesson)=>total+lesson.blueprint.builders.length,0),
      conversations: instructional.lessons.reduce((total,lesson)=>total+lesson.blueprint.dialogues.length,0),
    },
    combined_audio: {
      missing_record_references_before_dedupe: missingRows.length,
      distinct_missing_texts: new Set(missingRows.map(row => baseline.key(row.text))).size,
      bare_building_block_references_deferred: catalogRows.filter(row => row.building_block && !row.url).length,
      candidate_jobs_before_recipe_validation: audioJobs.length,
      candidate_jobs_after_recipe_validation: supportedJobs.length,
      recipe_holds: audioJobs.length - supportedJobs.length,
      candidate_jobs_containing_tl: supportedJobs.filter(row => row.contains_tl).length,
      jobs_with_existing_exact_text_recording_leads: supportedJobs.filter(row => row.existing_exact_text_recording_lead).length,
      ssml_characters: ssmlCharacters,
      estimated_google_standard_one_pass_usd: Number((ssmlCharacters * 4 / 1_000_000).toFixed(6)),
    },
    baseline_images: imageAudit.summary,
    combined_images: {
      core_missing_concepts: new Set(coreImageGaps.map(entry => conceptKey(entry.headword, entry.gloss))).size,
      previous_pack_missing_concepts: new Set(oldPackGaps.map(entry => conceptKey(entry.headword, entry.gloss))).size,
      verified_vocabulary_missing_concepts: new Set(verifiedGaps.map(entry => conceptKey(entry.headword, entry.gloss))).size,
      distinct_missing_concepts: imageConcepts.length,
      current_policy_candidate_ceiling: imageConcepts.filter(entry => !entry.excluded).length,
      current_policy_excluded_concepts: imageConcepts.filter(entry => entry.policy_excluded).length,
      bare_building_block_concepts_deferred: imageConcepts.filter(entry => entry.building_block).length,
      policy_or_component_excluded_concepts: imageConcepts.filter(entry => entry.excluded).length,
      precise_interface_cue_review_candidates: imageConcepts.filter(entry => !entry.excluded && entry.cue_review_preferred).length,
      count_basis: "Exact normalized headword plus English sense; different glosses are retained until semantic deduplication. Bare dependent components are deferred to complete-form pedagogy. Abstract/function concepts need cue review. This is a ceiling, not a required or approved job count.",
    },
  };
  // Preserve the old raw-field census/cost calculations as historical planning,
  // without presenting null pre-release fields as current playback gaps.
  const historicalAudio = { scope: "Historical raw-field planning before the current published synthetic bindings; these missing counts are not current remaining audio",
    baseline_audio: summary.baseline_audio, original_course: summary.original_course,
    combined_audio: summary.combined_audio, verified_vocabulary: {}, instructional_course: {} };
  for (const field of ["source_linked_audio", "missing_audio", "new_written_forms_source_audio", "new_written_forms_missing_audio",
    "building_blocks_missing_audio", "standalone_missing_audio_candidates"]) {
    historicalAudio.verified_vocabulary[field] = summary.verified_vocabulary[field];
    delete summary.verified_vocabulary[field];
  }
  for (const field of ["source_linked_audio", "missing_audio"]) {
    historicalAudio.instructional_course[field] = summary.instructional_course[field];
    delete summary.instructional_course[field];
  }
  summary.original_course = { phrase_records: originalCourseAudio.phrase_records,
    unit_phrase_references: originalCourseAudio.unit_phrase_references };
  delete summary.baseline_audio;
  delete summary.combined_audio;
  summary.published_audio = collectPublishedAudio().summary;
  summary.historical_audio_planning = historicalAudio;
  return {
    schema_version: 2, audited_at: new Date().toISOString(), scope: "Offline current published audio coverage, historical raw audio planning and unchanged image candidate census",
    source_files: Object.fromEntries([catalogPath, coursePath, instructionalPath, "src/data/generated-course-audio.json", "src/data/reviewed-vocabulary-labels.json", "src/data/learner-vocabulary-senses.json", "scripts/lib/nahuatl-pronunciation.js", "scripts/generate-google-audio.js",
      "src/data/word-images.ts", "src/data/openai-word-images.json", "src/data/s3-word-images.json", "src/data/word-images.json",
      "src/lib/image-card-safety.ts", "src/data/image-content-review.json",
      "scripts/config/openai-word-image-blocklist.json", "scripts/config/openai-reviewed-image-allowlist.json",
      "src/lib/expansion-practice.ts"]
      .map(file => [file, sha256(fs.readFileSync(path.join(ROOT, file)))])),
    pricing: { provider: "Google Cloud Text-to-Speech", voice_class: "Standard", rate_per_million_characters_usd: 4,
      checked_on: "2026-10-04", source_url: "https://cloud.google.com/text-to-speech/pricing",
      input_mode: "phoneme", recipe: GOOGLE_RECIPE_VERSION,
      excludes: "Free allowance, retries, additional voices/rates, storage, delivery and linguistic review. No paid requests were made." },
    limitations: [
      "Assigned source URLs are not current HTTP or heard-pronunciation verification.",
      "Published_audio reports exact current fixed reference/text bindings. Historical_audio_planning uses old raw fields and is not a current missing-audio or remaining-cost estimate.",
      "A historical recording lead is a review candidate, not an approved binding or automatic release of a hold.",
      "Source recordings remain original. Spanish synthetic tl remains an approximation requiring review.",
      "Policy eligibility does not prove an abstract concept benefits from a picture or certify an existing candidate's current meaning and rights.",
      "Historical raw audio planning deferred bare building blocks. The current published inventory separately includes reviewed component cues; those cues do not certify free-standing words or productive contexts. Image component planning remains deferred.",
      "Standalone expansion surfaces have no images. No existing image is newly assigned by this audit.",
      "Exact-word/sense grouping is conservative; additional semantic deduplication and interface cues can reduce the image ceiling.",
      "Historical raw audio costs exclude many fixed surfaces now included in the all-course inventory. Use the published coverage summary for current audio availability.",
      "This audit generates no recordings/images and changes no existing learner progress.",
    ], summary, historical_audio_jobs: audioJobs, verified_vocabulary_image_candidates: images, image_concepts: imageConcepts,
  };
}

if (require.main === module) {
  const audit = buildV3MediaAudit();
  if (process.argv.includes("--write")) {
    const directory = path.join(ROOT, "data/media-audit");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "v3-expansion-media.json"), JSON.stringify(audit, null, 2) + "\n");
  }
  console.log(JSON.stringify(audit.summary, null, 2));
}
module.exports = { buildV3MediaAudit };
