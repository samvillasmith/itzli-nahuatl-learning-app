import blocklist from "../../scripts/config/openai-word-image-blocklist.json";
import reviewedAllowlist from "../../scripts/config/openai-reviewed-image-allowlist.json";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const BLOCKED_HEADWORDS = new Set(blocklist.blockedHeadwords.map(normalize));
const BLOCKED_PATTERNS = blocklist.rules.map((rule) => ({
  category: rule.category,
  pattern: new RegExp(rule.pattern, "iu"),
}));
const REVIEWED_MODES = new Map(
  reviewedAllowlist.entries.map((entry) => [normalize(entry.headword), entry.mode]),
);
const NON_OVERRIDABLE_CATEGORIES = new Set([
  "adult-sexual",
  "covered-body-or-exposure-risk",
  "clothing-change-exposure-risk",
  "body-waste",
  "graphic-injury-or-death",
  "hate-or-extremism",
]);

function isImageCardExcludedInternal(
  approvedMatches: string[],
  values: Array<string | null | undefined>,
): boolean {
  const present = values.filter(Boolean).map((value) => String(value));
  const reviewedMode = present
    .map((value) => REVIEWED_MODES.get(normalize(value)))
    .find(Boolean);
  const allowsSwaddledChild = reviewedMode === "swaddled-child";
  const patternValues: string[] = [];
  for (const value of present) {
    const normalized = normalize(value);
    // A reviewed headword can bypass only its own exact headword match. Other
    // fields (especially the English gloss) must still pass every rule.
    if (REVIEWED_MODES.has(normalized)) continue;
    if (BLOCKED_HEADWORDS.has(normalized)) return true;
    patternValues.push(value);
  }

  let haystack = patternValues.join(" ");
  for (const approvedMatch of approvedMatches) {
    const escaped = approvedMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    haystack = haystack.replace(new RegExp(`\\b${escaped}\\b`, "giu"), " ");
  }
  const normalizedHaystack = normalize(haystack);
  return BLOCKED_PATTERNS.some(({ category, pattern }) => {
    const matches = () => pattern.test(haystack) || pattern.test(normalizedHaystack);
    if (NON_OVERRIDABLE_CATEGORIES.has(category)) return matches();
    if (reviewedMode) {
      if (category === "minors-or-child" || category === "infant-exposure-risk") {
        return allowsSwaddledChild ? false : matches();
      }
      return false;
    }
    return matches();
  });
}

export function isImageCardExcluded(...values: Array<string | null | undefined>): boolean {
  return isImageCardExcludedInternal([], values);
}

/** Removes only explicitly reviewed false-positive terms for one immutable image URL. */
export function isApprovedPublishedImageCardExcluded(
  approvedMatches: string[],
  ...values: Array<string | null | undefined>
): boolean {
  return isImageCardExcludedInternal(approvedMatches, values);
}
