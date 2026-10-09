import exclusions from "@/data/learner-safety-policy.json";
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
const EXCLUDED_LEARNER_ENTRY_IDS = new Map(
  exclusions.learnerSenseExclusions.map((entry) => [entry.entryId, entry.category]),
);
const LEARNER_SENSE_RULES = exclusions.learnerSenseRules.map((rule) => ({
  category: rule.category,
  pattern: new RegExp(rule.pattern, "iu"),
}));
const LEARNER_EXCLUDED_HEADWORDS = new Set(exclusions.learnerExcludedHeadwords.map(normalize));
const LEARNER_EXCLUDED_EXACT_TEXT = new Set(exclusions.learnerExcludedExactText.map(normalize));
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

/** Selected meanings are checked before historical educational-text exceptions. */
export function getLearnerSenseExclusionReason(values: Array<string | null | undefined>): string | null {
  const present = values.filter(Boolean).map((value) => String(value));
  for (const value of present) {
    if (LEARNER_EXCLUDED_EXACT_TEXT.has(normalize(value))) return "excluded-learner-exact-text";
    if (LEARNER_EXCLUDED_HEADWORDS.has(normalize(value))) return "excluded-learner-headword";
    const category = EXCLUDED_LEARNER_ENTRY_IDS.get(value);
    if (category) return `excluded-learner-sense:${category}:${value}`;
    // Retrieval metadata and fallback catalogs may pass serialized objects.
    // An exact excluded record identity remains excluded inside that object.
    for (const [entryId, entryCategory] of EXCLUDED_LEARNER_ENTRY_IDS) {
      if (value.includes(`"${entryId}"`)) return `excluded-learner-sense:${entryCategory}:${entryId}`;
    }
  }
  const text = normalize(present.join(" ")).replace(
    /\b(?:same[- ]sex (?:relationship|couple|couples|orientation|marriage)|sexual orientation|gender identity)\b/gu,
    "neutral identity",
  );
  for (const rule of LEARNER_SENSE_RULES) {
    const match = text.match(rule.pattern);
    if (match) return `excluded-learner-sense:${rule.category}:${match[0]}`;
  }
  return null;
}

export function isLearnerEntryExcluded(entryId: string): boolean {
  return EXCLUDED_LEARNER_ENTRY_IDS.has(entryId);
}

export function getAppContentExclusionReason(values: Array<string | null | undefined>): string | null {
  const selectedSense = getLearnerSenseExclusionReason(values);
  if (selectedSense) return selectedSense;
  const normalizedValues = values.filter(Boolean).map((value) => String(value));
  const reviewedMatches = normalizedValues
    .map((value) => REVIEWED_SAFE_MATCHES.get(normalize(value)))
    .find(Boolean);
  const safeTokens = new Set((reviewedMatches ?? []).map(normalize));
  for (const value of normalizedValues) {
    const normalized = normalize(value);
    if (safeTokens.has(normalized)) continue;
    if (EXCLUDED_HEADWORDS.has(normalized) || hasExcludedHeadwordToken(value, reviewedMatches)) {
      return "excluded-headword";
    }
  }

  let normalizedHaystack = normalize(normalizedValues.join(" "));
  for (const safeMatch of reviewedMatches ?? []) {
    const escaped = normalize(safeMatch).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalizedHaystack = normalizedHaystack.replace(
      new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])${escaped}(?![\\p{L}\\p{M}\\p{N}_])`, "gu"),
      " ",
    );
  }
  for (const pattern of EXCLUSION_PATTERNS) {
    // JavaScript's ASCII word boundaries split Nahuatl words at macrons:
    // titēmachtia previously matched the English token "tit". Normalize first.
    const match = normalizedHaystack.match(pattern);
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
