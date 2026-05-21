import exclusions from "@/data/app-content-exclusions.json";
import reviewedAllowlist from "../../scripts/config/openai-reviewed-image-allowlist.json";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const EXCLUDED_HEADWORDS = new Set(exclusions.headwords.map(normalize));
const EXCLUSION_PATTERNS = exclusions.patterns.map((pattern) => new RegExp(pattern, "iu"));
const REVIEWED_HEADWORDS = new Set(reviewedAllowlist.entries.map((entry) => normalize(entry.headword)));

function isUrlLike(value: string): boolean {
  return /(?:https?:\/\/|\/|\.[a-z0-9]{2,5}\b)/i.test(value);
}

function hasExcludedHeadwordToken(value: string): boolean {
  if (!isUrlLike(value)) return false;
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .some((token) => EXCLUDED_HEADWORDS.has(token));
}

export function getAppContentExclusionReason(values: Array<string | null | undefined>): string | null {
  const normalizedValues = values.filter(Boolean).map((value) => String(value));
  for (const value of normalizedValues) {
    const normalized = normalize(value);
    if (REVIEWED_HEADWORDS.has(normalized)) return null;
    if (EXCLUDED_HEADWORDS.has(normalized) || hasExcludedHeadwordToken(value)) {
      return "excluded-headword";
    }
  }

  const haystack = normalizedValues.join(" ");
  const normalizedHaystack = normalize(haystack);
  for (const pattern of EXCLUSION_PATTERNS) {
    const match = haystack.match(pattern) ?? normalizedHaystack.match(pattern);
    if (match) return `excluded-pattern:${match[0]}`;
  }

  return null;
}

export function isAppContentExcluded(...values: Array<string | null | undefined>): boolean {
  return getAppContentExclusionReason(values) !== null;
}

export function filterAppSafeText<T>(
  items: T[],
  textForItem: (item: T) => Array<string | null | undefined>,
): T[] {
  return items.filter((item) => !isAppContentExcluded(...textForItem(item)));
}
