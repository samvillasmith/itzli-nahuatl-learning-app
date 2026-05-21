import raw from "./word-images.json";
import s3Raw from "./s3-word-images.json";
import openaiRaw from "./openai-word-images.json";
import { isImageCardExcluded } from "@/lib/image-card-safety";

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

function s3UrlFromEntry(entry: S3WordImage): string {
  if (typeof entry === "string") {
    return entry.startsWith("http") ? entry : S3_WORD_IMAGE_BASE + entry.replace(/^\/+/, "");
  }
  const value = entry.url ?? entry.key ?? "";
  return value.startsWith("http") ? value : S3_WORD_IMAGE_BASE + value.replace(/^\/+/, "");
}

function s3Image(headword: string): WordImage | null {
  const entry = s3Data[headword];
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
    source: "s3",
  };
}

function openaiImage(headword: string): WordImage | null {
  const entry = openaiData[headword];
  if (!entry) return null;
  return {
    ...entry,
    source: entry.source ?? "openai",
  };
}

/**
 * Returns an image for a vocab headword if one was found.
 * OpenAI-generated word images are preferred for consistent app styling.
 * S3 word images and the legacy catalog remain as fallbacks.
 */
export function getWordImage(
  headword: string,
  options: { allowLegacyFallback?: boolean } = {},
): WordImage | null {
  if (isImageCardExcluded(headword)) return null;
  const openai = openaiImage(headword);
  if (openai) return openai;
  const s3 = s3Image(headword);
  if (s3) return s3;
  return options.allowLegacyFallback ? data[headword] ?? null : null;
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
