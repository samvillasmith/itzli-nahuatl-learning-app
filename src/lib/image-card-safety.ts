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
const BLOCKED_PATTERNS = blocklist.rules.map((rule) => new RegExp(rule.pattern, "iu"));
const REVIEWED_HEADWORDS = new Set(reviewedAllowlist.entries.map((entry) => normalize(entry.headword)));

export function isImageCardExcluded(...values: Array<string | null | undefined>): boolean {
  const present = values.filter(Boolean).map((value) => String(value));
  for (const value of present) {
    const normalized = normalize(value);
    if (REVIEWED_HEADWORDS.has(normalized)) return false;
    if (BLOCKED_HEADWORDS.has(normalized)) return true;
  }

  const haystack = present.join(" ");
  const normalizedHaystack = normalize(haystack);
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(haystack) || pattern.test(normalizedHaystack));
}
