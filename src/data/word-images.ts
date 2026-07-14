import raw from "./word-images.json";
import s3Raw from "./s3-word-images.json";
import openaiRaw from "./openai-word-images.json";
import { isAppContentExcluded } from "@/lib/app-content-safety";
import {
  isApprovedPublishedImageCardExcluded,
  isImageCardExcluded,
} from "@/lib/image-card-safety";
import { orthographySearchVariants } from "@/lib/orthography";

export type WordImage = {
  url: string;
  license: string;
  author: string;
  author_url?: string;
  pexels_id?: number;
  pexels_url?: string;
  alt?: string;
  // legacy fields
  source?: string;
  title?: string;
  review_status?: string;
  review_scope?: string;
  reviewed_url?: string;
  review_source?: string;
  reviewed_at?: string;
  reviewed_safe_matches?: string[];
};

type S3WordImage =
  | string
  | {
      key?: string;
      url?: string;
      license?: string;
      author?: string;
      alt?: string;
    };

const S3_WORD_IMAGE_BASE =
  "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";

const data = raw as Record<string, WordImage | null>;
const s3Data = s3Raw as Record<string, S3WordImage | null>;
const openaiData = openaiRaw as Record<string, WordImage | null>;

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

function isUnavailableLegacyS3Entry(entry: S3WordImage): boolean {
  const value = typeof entry === "string" ? entry : entry.url ?? entry.key ?? "";
  return /\.webp(?:$|\?)/i.test(value);
}

function s3Image(headword: string): WordImage | null {
  const entry = entryFor(s3Data, headword);
  if (!entry) return null;
  if (isUnavailableLegacyS3Entry(entry)) return null;
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
    source: "s3",
  };
}

function openaiImage(headword: string): WordImage | null {
  const entry = entryFor(openaiData, headword);
  if (!entry) return null;
  return {
    ...entry,
    license: "OpenAI-generated illustration",
    source: entry.source ?? "openai",
  };
}

function isExactPublishedReview(entry: WordImage): boolean {
  return (
    entry.review_status === "approved" &&
    entry.review_scope === "exact-published-image" &&
    entry.reviewed_url === entry.url &&
    /^openai-(?:word|reviewed)-image-audit\/contact-sheet-\d{2}$/.test(
      entry.review_source ?? "",
    )
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
  } = {},
): WordImage | null {
  if (isAppContentExcluded(headword, ...(options.safetyText ?? []))) return null;
  const openai = openaiImage(headword);
  const exactReview = openai && isExactPublishedReview(openai);
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
    !openaiExcluded
  ) return openai;
  if (isImageCardExcluded(headword, ...(options.safetyText ?? []))) return null;
  const s3 = s3Image(headword);
  if (
    s3 &&
    !isImageCardExcluded(headword, ...(options.safetyText ?? []), s3.alt, s3.title)
  ) return s3;
  if (!options.allowLegacyFallback) return null;
  const legacy = entryFor(data, headword);
  if (!legacy) return null;
  return isImageCardExcluded(
    headword,
    ...(options.safetyText ?? []),
    legacy.alt,
    legacy.title,
  ) ? null : legacy;
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
