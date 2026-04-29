import raw from "./word-images.json";
import s3Raw from "./s3-word-images.json";

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
  "https://mero-mero-app.s3.us-east-1.amazonaws.com/word-images/";

const data = raw as Record<string, WordImage | null>;
const s3Data = s3Raw as Record<string, S3WordImage | null>;

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

/**
 * Returns an image for a vocab headword if one was found.
 * S3 word images are preferred; the legacy catalog is retained as a fallback
 * until the S3 prefix can be listed or a manifest is exported into
 * src/data/s3-word-images.json.
 */
export function getWordImage(
  headword: string,
  options: { allowLegacyFallback?: boolean } = {},
): WordImage | null {
  const s3 = s3Image(headword);
  if (s3) return s3;
  return options.allowLegacyFallback ? data[headword] ?? null : null;
}

export function getWordImageAudit() {
  const s3Count = Object.values(s3Data).filter(Boolean).length;
  const legacyCount = Object.values(data).filter(Boolean).length;
  const missingCount = Object.values(data).filter((value) => value === null).length;

  return {
    s3Count,
    legacyCount,
    missingCount,
    s3BaseUrl: S3_WORD_IMAGE_BASE,
  };
}
