import exclusions from "@/data/app-content-exclusions.json";
import reviewedAllowlist from "@/data/app-content-reviewed-allowlist.json";

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
const REVIEWED_SAFE_MATCHES = new Map(
  reviewedAllowlist.entries.map((entry) => [normalize(entry.headword), entry.safeMatches]),
);

function isUrlLike(value: string): boolean {
  return /(?:https?:\/\/|\/|\.[a-z0-9]{2,5}\b)/i.test(value);
}

function hasExcludedHeadwordToken(value: string, safeMatches: string[] = []): boolean {
  if (!isUrlLike(value)) return false;
  const safe = new Set(safeMatches.map(normalize));
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .some((token) => EXCLUDED_HEADWORDS.has(token) && !safe.has(token));
}

export function getAppContentExclusionReason(values: Array<string | null | undefined>): string | null {
  const normalizedValues = values.filter(Boolean).map((value) => String(value));
  const reviewedMatches = normalizedValues
    .map((value) => REVIEWED_SAFE_MATCHES.get(normalize(value)))
    .find(Boolean);
  for (const value of normalizedValues) {
    const normalized = normalize(value);
    if (reviewedMatches && REVIEWED_SAFE_MATCHES.has(normalized)) continue;
    if (EXCLUDED_HEADWORDS.has(normalized) || hasExcludedHeadwordToken(value, reviewedMatches)) {
      return "excluded-headword";
    }
  }

  let haystack = normalizedValues.join(" ");
  for (const safeMatch of reviewedMatches ?? []) {
    const escaped = safeMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    haystack = haystack.replace(new RegExp(`\\b${escaped}\\b`, "giu"), " ");
  }
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
