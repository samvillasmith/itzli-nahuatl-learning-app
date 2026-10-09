import learnerExclusions from "@/data/learner-safety-policy.json";
import selectedSenses from "@/data/learner-image-senses.json";
import { toInaliOrthography } from "./orthography";

export type ImageSenseContext = {
  entryId?: string | null;
  meaningEn?: string | null;
  meaningEs?: string | null;
  sourceFactReviewHash?: string | null;
};
export type SenseBoundImage = {
  url: string;
  image_sha256?: string;
  review_status?: string;
  review_scope?: string;
  reviewed_url?: string;
  provenance?: {
    entry_id?: string;
    headword?: string;
    meaning_en?: string;
    meaning_es?: string;
    // Ordinary source-bound entries can record no additional selected-sense hash.
    source_fact_review_hash?: string | null;
    selected_sense?: { meaning_en?: string; meaning_es?: string; source_fact_review_hash?: string };
  };
};
const form = (value: string) => toInaliOrthography(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().trim();
const excludedHeadwords = new Set(learnerExclusions.learnerSenseExclusions.map(row => form(row.headword)));

/** Source-bound V3 assets belong to an exact entry and meaning, even when two
 * entries share a spelling. Historical unbound assets keep their prior guards. */
export function isSourceBoundImageEligible(headword: string, context: ImageSenseContext & { imageEntryId?: string | null }, image: SenseBoundImage): boolean {
  const proof = image.provenance;
  if (!proof?.entry_id) return true;
  return proof.entry_id === (context.imageEntryId ?? context.entryId) &&
    form(proof.headword ?? "") === form(headword) && context.meaningEn === proof.meaning_en &&
    (!context.meaningEs || context.meaningEs === proof.meaning_es);
}

/** A spelling shared with an excluded record cannot identify a safe sense by
 * itself. An independently selected identity still passes the ordinary guards. */
export function isUnidentifiedExcludedImageHeadword(headword: string, context: ImageSenseContext): boolean {
  return excludedHeadwords.has(form(headword)) && !context.entryId;
}

/** Old mixed-sense artwork is never evidence for either new selected meaning.
 * Release requires an approved exact asset with the same source-qualified sense. */
export function isSelectedSenseImageEligible(headword: string, context: ImageSenseContext, image: SenseBoundImage): boolean {
  const selected = selectedSenses.find(row => row.id === context.entryId || form(row.display) === form(headword));
  if (!selected) return true;
  return image.review_status === "approved" && image.review_scope === "exact-published-image" &&
    image.reviewed_url === image.url && isSelectedSenseImageProofCurrent(headword, context, image);
}

/** Meaning/source proof is shared with the private local review. This does not
 * grant publication approval or make a preview eligible for the public site. */
export function isSelectedSenseImageProofCurrent(headword: string, context: ImageSenseContext, image: SenseBoundImage): boolean {
  const selected = selectedSenses.find(row => row.id === context.entryId || form(row.display) === form(headword));
  if (!selected) return true;
  if (!/^[a-f0-9]{64}$/.test(selected.sourceFactReviewHash ?? "") || context.entryId !== selected.id ||
      context.meaningEn !== selected.meaningEn || context.meaningEs !== selected.meaningEs ||
      context.sourceFactReviewHash !== selected.sourceFactReviewHash) return false;
  const proof = image.provenance;
  return /^[a-f0-9]{64}$/.test(image.image_sha256 ?? "") &&
    proof?.entry_id === selected.id && form(proof.headword ?? "") === form(selected.display) &&
    proof.meaning_en === selected.meaningEn && proof.meaning_es === selected.meaningEs &&
    proof.source_fact_review_hash === selected.sourceFactReviewHash &&
    proof.selected_sense?.meaning_en === selected.meaningEn &&
    proof.selected_sense.meaning_es === selected.meaningEs &&
    proof.selected_sense.source_fact_review_hash === selected.sourceFactReviewHash;
}
