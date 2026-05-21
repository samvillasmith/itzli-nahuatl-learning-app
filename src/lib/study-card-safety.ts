import exclusions from "@/data/study-card-exclusions.json";

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

export function getStudyCardExclusionReason(values: Array<string | null | undefined>): string | null {
  const present = values.filter(Boolean).map((value) => String(value));
  for (const value of present) {
    if (EXCLUDED_HEADWORDS.has(normalize(value))) return "study-headword";
  }

  const haystack = present.join(" ");
  const normalizedHaystack = normalize(haystack);
  for (const pattern of EXCLUSION_PATTERNS) {
    const match = haystack.match(pattern) ?? normalizedHaystack.match(pattern);
    if (match) return `study-pattern:${match[0]}`;
  }

  return null;
}

export function isStudyCardExcluded(...values: Array<string | null | undefined>): boolean {
  return getStudyCardExclusionReason(values) !== null;
}
