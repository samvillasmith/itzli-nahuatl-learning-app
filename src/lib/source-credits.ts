import lexicon from "@/data/v3-verified-lexicon.json";
import reviewed from "@/data/v3-original-course.json";
import instructional from "@/data/instructional-lesson-blueprints.json";
import importedCourse from "@/data/nahuatlahtolli-course.json";
import { getExpansionEntries } from "@/data/lexical-expansion";
import { CULTURE_MODULES } from "@/data/culture-lessons";
import { TEACHING_STANDARD } from "@/lib/teaching-standard";
import { CEFR_REFERENCE } from "@/lib/cefr-alignment";
import { getReviewedVocabularyLabels } from "@/lib/reviewed-vocabulary-labels.cjs";
import coreVocabularyFacts from "@/data/core-vocabulary-facts.json";
import { COERLL_SOURCE_LICENSE_NOTICE } from "@/lib/source-license-notices";

export type CourseSourceCredit = {
  url: string; title: string; authors: string[]; publisher: string | null;
  use: "licensed-course" | "book-reference" | "fact-reference" | "culture-reference" | "culture-image" | "framework";
  license: string | null;
  purchaseUrl?: string;
};
type Candidate = { url: string; title: string; authors?: readonly string[]; publisher?: string; license?: string | null; use: CourseSourceCredit["use"]; purchaseUrl?: string };

export const GARCIA_BOOK_REFERENCE = {
  title: "Learn Nahuatl, Language of the Aztecs and Modern Nahuas: Second Edition",
  url: "https://tlahtoltapazolli.com/books/",
  authors: ["Yan García"],
  publisher: "Independently Published (2021)",
  use: "book-reference",
  license: null,
  purchaseUrl: "https://www.amazon.com/Nahuatl-Language-Aztecs-Modern-Nahuas/dp/B08XXC4CBY",
} satisfies CourseSourceCredit;

/** Each published source remains discoverable, including supplementary evidence and artwork credits. No private research files enter this register. */
export function getCourseSourceCredits(): CourseSourceCredit[] {
  const candidates: Candidate[] = [GARCIA_BOOK_REFERENCE];
  const courseAuthors = importedCourse.source.authors;
  candidates.push({ title: importedCourse.source.name, url: importedCourse.source.originalUrl,
    authors: courseAuthors, publisher: importedCourse.source.publisher, license: COERLL_SOURCE_LICENSE_NOTICE.name, use: "licensed-course" });
  for (const page of [...importedCourse.lessons, ...importedCourse.supportPages]) candidates.push({ title: page.title,
    url: page.originalUrl, authors: courseAuthors, publisher: importedCourse.source.publisher,
    license: COERLL_SOURCE_LICENSE_NOTICE.name, use: "licensed-course" });
  for (const entry of getExpansionEntries()) candidates.push({ title: "Nāhuatlahtolli — earlier individually selected vocabulary",
    url: entry.source.url, authors: entry.source.authors, publisher: importedCourse.source.publisher,
    license: COERLL_SOURCE_LICENSE_NOTICE.name, use: "licensed-course" });
  for (const source of [...reviewed.sources, ...instructional.supplementSources]) {
    candidates.push({ ...source, use: source.id.startsWith("coerll-") ? "licensed-course" : "fact-reference" });
  }
  for (const entry of lexicon.entries) {
    const credit = entry.attribution;
    candidates.push({ ...credit, license: entry.sourceLicense, use: entry.sourceUrl.includes("tlahtolli.coerll.utexas.edu") ? "licensed-course" : "fact-reference" });
    if ("supplementalSources" in credit) {
      for (const source of credit.supplementalSources ?? []) candidates.push({ ...source, use: "fact-reference" });
    }
  }
  for (const phrase of instructional.supplementPhrases) {
    if ("supplementalSources" in phrase) {
      for (const source of phrase.supplementalSources ?? []) candidates.push({ ...source,
        use: source.url.includes("tlahtolli.coerll.utexas.edu") ? "licensed-course" : "fact-reference" });
    }
  }
  for (const correction of getReviewedVocabularyLabels()) candidates.push({ title: correction.sourceTitle,
    url: correction.sourceUrl, use: "fact-reference" });
  for (const fact of coreVocabularyFacts.facts) {
    for (const url of [fact.sourceUrl, ...fact.supplementalSourceUrls, fact.copyrightUrl]) candidates.push({
      title: fact.sourceTitle, url, authors: fact.authors, publisher: fact.publisher,
      license: fact.sourceRights, use: "fact-reference",
    });
  }
  for (const cultureModule of CULTURE_MODULES) {
    for (const source of cultureModule.sources) candidates.push({ title: source.title, url: source.url, publisher: source.institution, use: "culture-reference" });
    if (cultureModule.image) candidates.push({ title: cultureModule.image.title, url: cultureModule.image.objectUrl, authors: [cultureModule.image.creator], publisher: cultureModule.image.institution, license: cultureModule.image.license, use: "culture-image" });
  }
  candidates.push(
    { title: `INALI — ${TEACHING_STANDARD.alphabetTitle} (versión en español)`, url: TEACHING_STANDARD.alphabetUrl, authors: ["Instituto Nacional de Lenguas Indígenas"], use: "framework" },
    { title: "INALI — Lengua Nawatlahtolli (náhuatl), 28 de mayo de 2025", url: TEACHING_STANDARD.alphabetOfficialListingUrl, authors: ["Instituto Nacional de Lenguas Indígenas"], use: "framework" },
    { title: "INALI — Catálogo de las Lenguas Indígenas Nacionales: náhuatl", url: TEACHING_STANDARD.variantUrl, authors: ["Instituto Nacional de Lenguas Indígenas"], use: "framework" },
    { title: "INALI — Atlas de las Lenguas Indígenas de México: náhuatl", url: "https://atlas.inali.gob.mx/agrupaciones/info/0211", authors: ["Instituto Nacional de Lenguas Indígenas"], use: "culture-reference" },
    { title: CEFR_REFERENCE.title, url: CEFR_REFERENCE.url, authors: [CEFR_REFERENCE.author], publisher: "Council of Europe Publishing, Strasbourg (2020)", use: "framework" },
    { title: "Council of Europe — Purposes of the CEFR", url: CEFR_REFERENCE.contextUrl, authors: [CEFR_REFERENCE.author], use: "framework" },
  );
  const credits = new Map<string, CourseSourceCredit>();
  for (const candidate of candidates) {
    const parsed = new URL(candidate.url);
    if (!/^https?:$/.test(parsed.protocol) || /(^|\.)drive\.google\.com$/.test(parsed.hostname)) throw new Error("Only public, non-account source URLs belong in the credit register.");
    parsed.hash = "";
    const key = parsed.href;
    const purchaseUrl = candidate.purchaseUrl ? new URL(candidate.purchaseUrl) : null;
    if (purchaseUrl && (!/^https?:$/.test(purchaseUrl.protocol) || /(^|\.)drive\.google\.com$/.test(purchaseUrl.hostname))) throw new Error("Only public purchase URLs belong in the credit register.");
    const prior = credits.get(key);
    const host = parsed.hostname;
    const knownAuthors = host === "nahuatl.wired-humanities.org" ? ["Stephanie Wood (editor)", "IDIEZ contributors"]
      : host === "tlahtolli.coerll.utexas.edu" ? courseAuthors
      : host === "scholars.sil.org" && parsed.pathname.includes("david_h_tuggy") ? ["David H. Tuggy"] : [];
    const authors = [...new Set([...(prior?.authors ?? []), ...(candidate.authors ?? []), ...knownAuthors])];
    // Prefer the full bibliographic record to a short supplemental-link label.
    credits.set(key, {
      url: key, title: key === TEACHING_STANDARD.alphabetUrl ? `INALI — ${TEACHING_STANDARD.alphabetTitle} (versión en español)` : prior?.title ?? candidate.title, authors,
      publisher: prior?.publisher ?? candidate.publisher ?? null,
      use: prior?.use === "culture-image" ? "culture-image" : candidate.use === "culture-image" ? "culture-image" : prior?.use ?? candidate.use,
      license: prior?.license ?? candidate.license ?? null,
      ...((prior?.purchaseUrl ?? purchaseUrl?.href) ? { purchaseUrl: prior?.purchaseUrl ?? purchaseUrl!.href } : {}),
    });
  }
  return [...credits.values()].sort((a, b) => a.title.localeCompare(b.title) || a.url.localeCompare(b.url));
}

export function groupCourseSourceCredits(credits = getCourseSourceCredits()) {
  const groups = new Map<string, CourseSourceCredit[]>();
  for (const credit of credits) {
    const host = new URL(credit.url).hostname.replace(/^www\./, "");
    const label = host === "tlahtolli.coerll.utexas.edu" ? "Nāhuatlahtolli · COERLL / UT Austin"
      : credit.use === "book-reference" ? "Learn Nahuatl · Yan García"
      : host === "nahuatl.wired-humanities.org" ? "Online Nahuatl Dictionary · University of Oregon"
      : host === "nahuatlhuasteca.com" ? "Tlahtolxitlauhcayotl · IDIEZ / University of Warsaw"
      : host.endsWith("inali.gob.mx") ? "INALI" : host.endsWith("coe.int") ? "Council of Europe · CEFR"
      : credit.publisher ?? host;
    groups.set(label, [...(groups.get(label) ?? []), credit]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, references]) => ({ label, references }));
}
