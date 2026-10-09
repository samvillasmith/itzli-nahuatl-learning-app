import raw from "./learner-word-images.json";
import s3Raw from "./learner-s3-word-images.json";
import openaiRaw from "./learner-openai-word-images.json";
import heldCandidateReasons from "./learner-image-hold-reasons.json";
import { isAppContentExcluded } from "@/lib/app-content-safety";
import {
  isApprovedPublishedImageCardExcluded,
  isImageCardExcluded,
} from "@/lib/image-card-safety";
import { orthographySearchVariants, toInaliOrthography } from "@/lib/orthography";
import imageCorrections from "./image-content-review.json";
import { isSelectedSenseImageEligible, isSourceBoundImageEligible, isUnidentifiedExcludedImageHeadword, type ImageSenseContext, type SenseBoundImage } from "@/lib/word-image-sense-eligibility";
import { isPublishedImageReviewSource } from "@/lib/image-review-source.cjs";

export type WordImage = SenseBoundImage & {
  url: string;
  license: string;
  author: string;
  author_url?: string;
  pexels_id?: number;
  pexels_url?: string;
  alt?: string;
  owner_confirmed_at?: string;
  owner_confirmation?: string;
  // legacy fields
  source?: string;
  title?: string;
  review_status?: string;
  review_scope?: string;
  reviewed_url?: string;
  review_source?: string;
  reviewed_at?: string;
  reviewed_safe_matches?: string[];
  current_card_review?: {
    scope: string;
    asset_url: string;
    reviewed_by: string;
    reviewed_at: string;
    finding: string;
    source_refs: string[];
  };
};

type S3WordImage =
  | string
  | {
      key?: string;
      url?: string;
      license?: string;
      author?: string;
      alt?: string;
      source?: string;
      owner_confirmed_at?: string;
      owner_confirmation?: string;
    };

const S3_WORD_IMAGE_BASE =
  "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";

const data = raw as Record<string, WordImage | null>;
const s3Data = s3Raw as Record<string, S3WordImage | null>;
const openaiData = openaiRaw as Record<string, WordImage | null>;
type ImageCorrection = {
  id: number; status: string; reason: string; image_headword?: string;
  expected_headword?: string; expected_gloss?: string;
  pixel_review?: NonNullable<WordImage["current_card_review"]>;
};
const contentReview = imageCorrections as {
  cards: ImageCorrection[];
  assets: Array<{ url: string; status: string; reason: string }>;
  contexts?: Array<{ entry_id: string; headword: string; meaning_en: string; url: string; status: string; reason: string }>;
};

function imageAssetHold(url: string) {
  return contentReview.assets.find((review) => review.url === url && review.status === "held");
}

/** A wrong picture for one selected sense need not retire the word or every
 * other meaning. New exact imagery remains eligible under its own URL. */
function imageContextHold(url: string, headword: string, context: ImageSenseContext) {
  return contentReview.contexts?.find(review => review.status === "held" && review.url === url &&
    (review.entry_id === context.entryId ||
      normalizeHeadword(toInaliOrthography(review.headword)) === normalizeHeadword(toInaliOrthography(headword)) &&
      (!context.meaningEn || review.meaning_en === context.meaningEn)));
}

function normalizeHeadword(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[¿¡?!.,"'“”‘’()[\]{}]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function entryFor<T>(records: Record<string, T | null>, headword: string): T | null {
  for (const variant of orthographySearchVariants(headword)) {
    const direct = records[variant];
    if (direct) return direct;
  }

  const normalized = normalizeHeadword(headword);
  if (normalized.length <= 1) return null;

  const normalizedVariants = new Set(
    orthographySearchVariants(headword)
      .map(normalizeHeadword)
      .filter((variant) => variant.length > 1),
  );
  normalizedVariants.add(normalized);

  const matchedKey = Object.keys(records).find((key) => {
    const normalizedKey = normalizeHeadword(key);
    return normalizedVariants.has(normalizedKey) && records[key];
  });
  return matchedKey ? records[matchedKey] : null;
}

function s3UrlFromEntry(entry: S3WordImage): string {
  if (typeof entry === "string") {
    return entry.startsWith("http") ? entry : S3_WORD_IMAGE_BASE + entry.replace(/^\/+/, "");
  }
  const value = entry.url ?? entry.key ?? "";
  return value.startsWith("http") ? value : S3_WORD_IMAGE_BASE + value.replace(/^\/+/, "");
}

function s3Image(headword: string): WordImage | null {
  const entry = entryFor(s3Data, headword);
  if (!entry) return null;
  if (typeof entry === "string") {
    return {
      url: s3UrlFromEntry(entry),
      license: "S3 word-image asset",
      author: "Itzli",
      alt: headword,
      source: "s3",
    };
  }
  return {
    url: s3UrlFromEntry(entry),
    license: entry.license ?? "S3 word-image asset",
    author: entry.author ?? "Itzli",
    alt: entry.alt ?? headword,
    source: entry.source ?? "s3",
    owner_confirmed_at: entry.owner_confirmed_at,
    owner_confirmation: entry.owner_confirmation,
  };
}

function openaiImage(headword: string, imageEntryId?: string | null): WordImage | null {
  const entry = (imageEntryId && openaiData[imageEntryId]) || entryFor(openaiData, headword);
  if (!entry) return null;
  return {
    ...entry,
    license: entry.license || "OpenAI-generated illustration",
    source: entry.source ?? "openai",
  };
}

export function isExactPublishedImageReview(entry: WordImage): boolean {
  return (
    entry.review_status === "approved" &&
    entry.review_scope === "exact-published-image" &&
    entry.reviewed_url === entry.url &&
    isPublishedImageReviewSource(entry.review_source)
  );
}

/**
 * Returns an image for a vocab headword if one was found.
 * OpenAI-generated word images are preferred for consistent app styling.
 * S3 word images and the legacy catalog remain as fallbacks.
 */
export function getWordImage(
  headword: string,
  options: {
    allowLegacyFallback?: boolean;
    safetyText?: Array<string | null | undefined>;
    imageEntryId?: string | null;
  } & ImageSenseContext = {},
): WordImage | null {
  if (isAppContentExcluded(headword, options.entryId, options.meaningEn, options.meaningEs, ...(options.safetyText ?? [])) ||
      isUnidentifiedExcludedImageHeadword(headword, options)) return null;
  const openai = openaiImage(headword, options.imageEntryId ?? options.entryId);
  if (openai && (imageAssetHold(openai.url) || imageContextHold(openai.url, headword, options))) return null;
  const exactReview = openai && isExactPublishedImageReview(openai);
  const openaiExcluded = exactReview
    ? isApprovedPublishedImageCardExcluded(
        openai.reviewed_safe_matches ?? [],
        headword,
        ...(options.safetyText ?? []),
        openai.alt,
        openai.title,
      )
    : isImageCardExcluded(
        headword,
        ...(options.safetyText ?? []),
        openai?.alt,
        openai?.title,
      );
  if (
    openai &&
    !openaiExcluded && isSourceBoundImageEligible(headword, options, openai) && isSelectedSenseImageEligible(headword, options, openai)
  ) return openai;
  if (isImageCardExcluded(headword, ...(options.safetyText ?? []))) return null;
  const s3 = s3Image(headword);
  if (s3 && (imageAssetHold(s3.url) || imageContextHold(s3.url, headword, options))) return null;
  if (
    s3 &&
    !isImageCardExcluded(headword, ...(options.safetyText ?? []), s3.alt, s3.title) &&
    isSelectedSenseImageEligible(headword, options, s3)
  ) return s3;
  if (!options.allowLegacyFallback) return null;
  const legacy = entryFor(data, headword);
  if (!legacy) return null;
  if (imageAssetHold(legacy.url) || imageContextHold(legacy.url, headword, options)) return null;
  // Search-result photos are candidates, not evidence that a picture teaches
  // this word. A legacy fallback must have an exact published-image review.
  if (!isExactPublishedImageReview(legacy)) return null;
  if (!isSelectedSenseImageEligible(headword, options, legacy)) return null;
  return isImageCardExcluded(
    headword,
    ...(options.safetyText ?? []),
    legacy.alt,
    legacy.title,
  ) ? null : legacy;
}

export type VocabImageCard = {
  id?: number;
  headword: string;
  imageHeadword?: string | null;
  gloss_en: string;
  // The UI may localize gloss_en; meaning bindings use the original course gloss.
  safety_gloss_en?: string | null;
  part_of_speech?: string | null;
  entry_id?: string | null;
  gloss_es?: string | null;
  source_fact_review_hash?: string | null;
};

/** Resolve against the current card meaning, including corrections to old media bindings. */
export function getVocabCardImage(card: VocabImageCard): WordImage | null {
  if (isUnidentifiedExcludedImageHeadword(card.headword, { entryId: card.entry_id })) return null;
  const canonicalGloss = card.safety_gloss_en ?? card.gloss_en;
  const imageEntryId = card.id == null ? card.entry_id : `core-${card.id}`;
  const replacement = openaiImage(card.headword, imageEntryId);
  // Old holds describe the old assigned asset. A newly reviewed, immutable V3
  // replacement must match this exact card and meaning before superseding it.
  if (replacement && imageEntryId && replacement.provenance?.entry_id === imageEntryId &&
      /^v3-image-publication\/[a-f0-9]{64}$/.test(replacement.review_source ?? "") &&
      /^[a-f0-9]{64}$/.test(replacement.image_sha256 ?? "") && isExactPublishedImageReview(replacement)) {
    const reviewed = getWordImage(card.headword, { entryId: card.entry_id, imageEntryId,
      meaningEn: canonicalGloss, meaningEs: card.gloss_es, sourceFactReviewHash: card.source_fact_review_hash,
      safetyText: [card.headword, canonicalGloss, card.gloss_en, card.part_of_speech] });
    if (reviewed === replacement || reviewed?.url === replacement.url) return reviewed;
  }
  const correction = contentReview.cards.find((row) => row.id === card.id);
  if (correction?.status === "held" || correction?.status === "structured-cue") return null;
  if (correction && ((correction.expected_headword && normalizeHeadword(toInaliOrthography(correction.expected_headword)) !== normalizeHeadword(toInaliOrthography(card.headword))) || (correction.expected_gloss && correction.expected_gloss !== canonicalGloss))) return null;
  const image = getWordImage(correction?.image_headword ?? card.imageHeadword ?? card.headword, {
    allowLegacyFallback: true,
    safetyText: [card.headword, canonicalGloss, card.gloss_en, card.part_of_speech],
    entryId: card.entry_id,
    imageEntryId,
    meaningEn: canonicalGloss,
    meaningEs: card.gloss_es,
    sourceFactReviewHash: card.source_fact_review_hash,
  });
  if (image && !isSelectedSenseImageEligible(card.headword, { entryId: card.entry_id,
    meaningEn: canonicalGloss, meaningEs: card.gloss_es, sourceFactReviewHash: card.source_fact_review_hash }, image)) return null;
  if (correction?.pixel_review) {
    if (image?.url !== correction.pixel_review.asset_url) return null;
    return { ...image, current_card_review: correction.pixel_review };
  }
  return image;
}

export function getVocabCardImageHold(card: VocabImageCard): string | null {
  if (getVocabCardImage(card)) return null;
  const correction = contentReview.cards.find((row) => row.id === card.id);
  if (correction?.status === "held" || correction?.status === "structured-cue") return correction.reason;
  const headword = correction?.image_headword ?? card.imageHeadword ?? card.headword;
  const candidate = openaiImage(headword) ?? s3Image(headword) ?? entryFor(data, headword);
  const hold = candidate && (imageAssetHold(candidate.url) || imageContextHold(candidate.url, card.headword, {
    entryId: card.entry_id, meaningEn: card.safety_gloss_en ?? card.gloss_en, meaningEs: card.gloss_es,
  }));
  if (hold) return hold.reason;
  // The unsafe or incompatible candidate itself stays outside the browser
  // catalogs. Its minimal recorded reason survives for the current card.
  const formerHold = entryFor(heldCandidateReasons["openai-word-images"], headword) ??
    entryFor(heldCandidateReasons["s3-word-images"], headword) ??
    entryFor(heldCandidateReasons["word-images"], headword);
  if (formerHold) return formerHold.reason;
  return getVocabCardImage(card) ? null : "No matching eligible reviewed image is assigned.";
}

export function getWordImageAudit() {
  const openaiCount = Object.values(openaiData).filter(Boolean).length;
  const s3Count = Object.values(s3Data).filter(Boolean).length;
  const legacyCount = Object.values(data).filter(Boolean).length;
  const missingCount = Object.values(data).filter((value) => value === null).length;

  return {
    openaiCount,
    s3Count,
    legacyCount,
    missingCount,
    s3BaseUrl: S3_WORD_IMAGE_BASE,
  };
}
