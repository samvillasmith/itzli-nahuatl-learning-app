import type { AppLocale } from "@/i18n/config";
import type { LexicalEntry } from "@/data/lexical-registry";
import type { ConversationScenario, SentencePattern } from "@/data/conversation-scenarios";
import type { PersonalExpression } from "@/lib/expression-notebook";
import { displayLearnerExpression } from "@/lib/learner-expression";
import { displayNahuatl } from "@/lib/orthography";
import { TEACHING_STANDARD } from "@/lib/teaching-standard";
import { COERLL_SOURCE_LICENSE_NOTICE, ITZLI_V3_CONTRIBUTION_LICENSE, displayedSourceLicense } from "@/lib/source-license-notices";

const sourceLicense = { ...COERLL_SOURCE_LICENSE_NOTICE, versionConfirmed: false };
const contributionLicense = { ...ITZLI_V3_CONTRIBUTION_LICENSE,
  appliesTo: "Itzli's original text, translations and adaptation work; original source and media notices remain applicable." };
const changes = "INALI teaching orthography and Itzli translations and arrangement. Original source spellings are retained as references. Proper names and places may be adapted. The publisher's CC BY-SA source-license version is unspecified; Itzli's original contributions use CC BY-SA 4.0. No source recording or other media is relicensed by this notice.";

/** Build a new download without rewriting saved IDs, source text or learner history. */
export function buildNotebookExport(expressions: readonly PersonalExpression[], patterns: readonly SentencePattern[]) {
  const sourceUrls = new Set(expressions.map(expression => expression.sourceUrl));
  const sources = [...new Map(patterns.flatMap(pattern => pattern.sources).filter(source => sourceUrls.has(source.url))
    .map(source => [source.url, { url: source.url, authors: source.authors,
      license: displayedSourceLicense(source.url, source.license) }])).values()];
  return { version: 1, orthography: TEACHING_STANDARD.id,
    attribution: { title: "Nāhuatlahtolli — COERLL, The University of Texas at Austin", sources,
      sourceLicense, contributionLicense, changes },
    expressions: expressions.map(expression => ({ ...expression, sourceText: expression.nahuatl,
      nahuatl: displayLearnerExpression(expression) })) };
}

/** Existing pack version/storage/event identities remain compatible. Media URLs are unchanged. */
export function buildOfflineCoursePack(words: readonly LexicalEntry[], scenarios: readonly ConversationScenario[],
  options: { scope: string; locale: AppLocale; savedAt: string }) {
  return { version: 3, orthography: TEACHING_STANDARD.id, ...options,
    attribution: { title: "Nāhuatlahtolli — COERLL, The University of Texas at Austin",
      sourceLicense, contributionLicense, changes },
    words: words.map(word => ({ id: `word:${word.cardId}`, nahuatl: displayNahuatl(word.headword),
      sourceSpelling: word.sourceSpelling, english: word.english, spanish: word.spanish,
      audioUrl: word.audio.url, sourceUrl: word.source.url,
      audioReferenceId: `vocabulary:${word.id}`,
      license: displayedSourceLicense(word.source.url, word.source.license), authors: word.source.authors })),
    scenarios };
}
