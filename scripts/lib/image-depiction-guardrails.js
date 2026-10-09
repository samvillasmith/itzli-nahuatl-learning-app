"use strict";

// Pure metadata/publication guard. No environment files or provider requests.
const config = require("../config/openai-word-image-blocklist.json");
const { createHash } = require("crypto");
const approvedScenes = require("../config/user-approved-image-scenes.json").entries;
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const hardHeadwords = new Set(config.nonOverridableHeadwords.map(normalize));
const hardRules = config.nonOverridableDepictionRules.map(rule => ({ category: rule.category, pattern: new RegExp(rule.pattern, "iu") }));
const bathingConceptPattern = new RegExp(config.bathingConceptPattern, "iu");
const hardCategories = new Set(config.nonOverridableCategories);
const hardCategoryRules = config.rules.filter(rule => hardCategories.has(rule.category))
  .map(rule => ({category: rule.category, pattern: new RegExp(rule.pattern, "iu")}));

function isViolenceOnlyModerationResult(result) {
  const categories = result?.categories;
  if (result?.flagged !== true || !categories || categories.violence !== true) return false;
  const required = ["harassment", "harassment/threatening", "hate", "hate/threatening", "illicit", "illicit/violent",
    "self-harm", "self-harm/intent", "self-harm/instructions", "sexual", "sexual/minors", "violence/graphic"];
  const negative = key => categories[key] === false ||
    // These two provider categories do not support image input. Null is accepted
    // only when the response explicitly confirms no applicable input types.
    (["illicit", "illicit/violent"].includes(key) && categories[key] === null &&
      Array.isArray(result.category_applied_input_types?.[key]) && result.category_applied_input_types[key].length === 0);
  return required.every(negative) && Object.keys(categories).every(key => key === "violence" || negative(key));
}

function exactApprovedSportPublication(entry, verdict) {
  const scene = approvedScenes.find(candidate => candidate.kind === "sports-target-practice" && candidate.entry_id === entry.entry_id);
  const proof = entry.provenance;
  const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  return Boolean(scene && proof && verdict.approved_scene_entry_id === scene.entry_id && entry.headword === scene.headword &&
    entry.meaning_en === scene.meaning_en && entry.meaning_es === scene.meaning_es && proof.entry_id === scene.entry_id &&
    proof.meaning_en === scene.meaning_en && proof.meaning_es === scene.meaning_es &&
    proof.lexical_review_hash === scene.lexical_review_hash && proof.source_fact_review_hash === scene.source_fact_review_hash &&
    proof.source_import_sha256 === scene.source_import_sha256 && proof.source_locator && hash(proof.source_locator) === scene.source_locator_sha256 &&
    proof.composition_sha256 === scene.composition_sha256 && typeof entry.required_composition === "string" &&
    entry.requires_no_people === scene.require_no_people &&
    hash({ instruction: entry.required_composition.trim(), requireNoPeople: entry.requires_no_people }) === scene.composition_sha256);
}

function hardImageDepictionReason(headword, values = []) {
  if (hardHeadwords.has(normalize(headword))) return { category: "prohibited-anatomy-headword", match: headword };
  const raw = [headword, ...values].filter(Boolean).join(" ");
  for (const rule of hardRules) {
    const match = raw.match(rule.pattern) || normalize(raw).match(rule.pattern);
    if (match) return { category: rule.category, match: match[0] };
  }
  return null;
}

function nonOverridableMetadataReason(headword, values = []) {
  const reason = hardImageDepictionReason(headword, values);
  if (reason) return reason;
  const hardText = [headword, ...values].filter(Boolean).join(" ");
  for (const rule of hardCategoryRules) {
    const match = hardText.match(rule.pattern) || normalize(hardText).match(rule.pattern);
    if (match) return {category: rule.category, match: match[0]};
  }
  return null;
}

function assertImagePublicationGuard(headword, entry) {
  const reason = nonOverridableMetadataReason(headword, [entry.alt, entry.title, entry.license, entry.author]);
  if (reason) throw new Error(`Publication violates a non-overridable image rule: ${reason.category}`);
  if (entry.source === "itzli" && entry.automated_safety_review === "deterministic-typography") return;
  const verdict = entry.automated_safety_review;
  if (!verdict || verdict.pass !== true) throw new Error("Publication requires a current passing visual review.");
  const hardFields = ["contains_minor_or_childlike_person", "contains_nudity_or_ambiguous_covered_body_exposure",
    "contains_exposed_genitals_breasts_or_buttocks", "bathing_scene_contains_people", "contains_bathing_showering_or_changing",
    "contains_toilet_urination_defecation_or_body_waste", "contains_sexual_or_suggestive_content",
    "contains_injury_blood_or_gore",
    "contains_unapproved_text_letters_numbers_logo_or_watermark"];
  if (hardFields.some(field => verdict[field] !== false)) {
    throw new Error("Publication requires explicit false verdicts for all hard age, exposure and bathing fields.");
  }
  // Fresh versioned reviews distinguish benign clothed rest from compromise;
  // historical review/publication behavior stays unchanged.
  if (verdict.review_contract_version >= 2) {
    const neutralFirearm = verdict.review_contract_version >= 3 && verdict.neutral_firearm_composition === true &&
      verdict.contains_people === false && /\b(?:firearm|gun|rifle|pistol|cannon|shoot|shoots|shooting)\b/iu.test(entry.meaning_en || entry.provenance?.meaning_en || "");
    const approvedSport = approvedScenes.find(scene => scene.kind === "sports-target-practice" &&
      scene.entry_id === entry.entry_id && scene.entry_id === verdict.approved_scene_entry_id &&
      entry.provenance?.lexical_review_hash === scene.lexical_review_hash &&
      entry.provenance?.composition_sha256 === scene.composition_sha256 && entry.meaning_en === scene.meaning_en && entry.meaning_es === scene.meaning_es);
    const adultSports = verdict.review_contract_version >= 4 && verdict.adult_target_practice_composition === true &&
      Boolean(approvedSport) && verdict.contains_people === true && verdict.all_people_clearly_adult_25_plus_and_fully_clothed === true;
    for (const field of ["contains_compromising_medical_or_care_context", ...(neutralFirearm || adultSports ? [] : ["contains_weapons_or_violence"]),
      "contains_dead_or_dying_people", "contains_humiliation_coercion_or_compromising_situation"]) {
      if (verdict[field] !== false) throw new Error(`Publication requires a negative current hard visual verdict: ${field}`);
    }
    if (verdict.review_contract_version >= 3 && (typeof verdict.contains_weapons_or_violence !== "boolean" ||
        verdict.contains_violence_or_targeted_or_harmed_people !== false)) throw new Error("Publication requires an explicit negative current violence/target/harm verdict.");
    if (verdict.review_contract_version >= 4 && verdict.contains_people_in_sports_target_area_or_weapon_aimed_at_people !== false) {
      throw new Error("Publication requires an explicit negative current downrange/weapon-target verdict.");
    }
    if (verdict.review_contract_version >= 5) {
      const moderation = verdict.local_visual_moderation;
      if (!moderation || moderation.model !== "omni-moderation-latest" || typeof moderation.result?.flagged !== "boolean") {
        throw new Error("Publication requires the original current local moderation result.");
      }
      if (moderation.result.flagged && (!isViolenceOnlyModerationResult(moderation.result) ||
          verdict.local_moderation_triage !== "exact-source-adult-sports-violence-only" || !adultSports ||
          !exactApprovedSportPublication(entry, verdict))) {
        throw new Error("Publication refuses unqualified or non-violence-only moderation triage.");
      }
      if (!moderation.result.flagged && verdict.local_moderation_triage !== null) {
        throw new Error("Publication refuses inconsistent local moderation triage.");
      }
    }
  } else if (verdict.contains_person_in_bed_or_vulnerable_care_scene !== false) {
    throw new Error("Publication requires an explicit historical care verdict or a fresh versioned review.");
  }
  if (typeof verdict.contains_people !== "boolean" || typeof verdict.all_people_clearly_adult_25_plus_and_fully_clothed !== "boolean" ||
    verdict.matches_requested_concept_and_composition !== true ||
    (verdict.contains_people && !verdict.all_people_clearly_adult_25_plus_and_fully_clothed)) {
    throw new Error("Publication requires explicit people/clothing verdicts and a matching composition.");
  }
  if (bathingConceptPattern.test(normalize([headword, entry.alt, entry.title].filter(Boolean).join(" "))) && verdict.contains_people !== false) {
    throw new Error("A bathing image must have an explicit no-people verdict regardless of exceptions.");
  }
}

module.exports = { hardImageDepictionReason, nonOverridableMetadataReason, assertImagePublicationGuard, isViolenceOnlyModerationResult };
