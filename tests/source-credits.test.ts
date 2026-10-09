import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import lexicon from "@/data/v3-verified-lexicon.json";
import instructional from "@/data/instructional-lesson-blueprints.json";
import reviewed from "@/data/v3-original-course.json";
import importedCourse from "@/data/nahuatlahtolli-course.json";
import coreVocabularyFacts from "@/data/core-vocabulary-facts.json";
import { getExpansionEntries } from "@/data/lexical-expansion";
import { CULTURE_MODULES } from "@/data/culture-lessons";
import { GARCIA_BOOK_REFERENCE, getCourseSourceCredits, groupCourseSourceCredits } from "@/lib/source-credits";
import { TEACHING_STANDARD } from "@/lib/teaching-standard";
import { COERLL_SOURCE_LICENSE_NOTICE, ITZLI_V3_CONTRIBUTION_LICENSE } from "@/lib/source-license-notices";
import { getConversationScenarios, getSentencePatterns } from "@/data/conversation-scenarios";
import CourseSourceCredits from "@/components/CourseSourceCredits";

describe("course source register", () => {
  const credits = getCourseSourceCredits();
  const urls = new Set(credits.map(item => item.url));
  const canonical = (url: string) => { const parsed = new URL(url); parsed.hash = ""; return parsed.href; };
  it("credits every published lexical source, supplemental evidence link and grammar source", () => {
    for (const entry of lexicon.entries) {
      expect(urls.has(canonical(entry.attribution.url))).toBe(true);
      if ("supplementalSources" in entry.attribution) {
        for (const source of entry.attribution.supplementalSources ?? []) expect(urls.has(canonical(source.url))).toBe(true);
      }
    }
    for (const source of [...reviewed.sources, ...instructional.supplementSources]) expect(urls.has(canonical(source.url))).toBe(true);
    for (const phrase of instructional.supplementPhrases) if ("supplementalSources" in phrase) {
      for (const source of phrase.supplementalSources ?? []) expect(urls.has(canonical(source.url))).toBe(true);
    }
    for (const page of [...importedCourse.lessons, ...importedCourse.supportPages]) expect(urls.has(canonical(page.originalUrl))).toBe(true);
    for (const entry of getExpansionEntries()) expect(urls.has(canonical(entry.source.url))).toBe(true);
    for (const fact of coreVocabularyFacts.facts) for (const url of [fact.sourceUrl, ...fact.supplementalSourceUrls, fact.copyrightUrl]) {
      const credit = credits.find(item => item.url === canonical(url))!;
      expect(credit.use).toBe("fact-reference");
      expect(credit.authors).toContain("Wycliffe Bible Translators, Inc.");
      expect(credit.license).toContain("No verse");
    }
  });
  it("preserves cultural source and artwork creator rights notices", () => {
    for (const cultureModule of CULTURE_MODULES) {
      for (const source of cultureModule.sources) expect(urls.has(canonical(source.url))).toBe(true);
      if (cultureModule.image) {
        const credit = credits.find(item => item.url === canonical(cultureModule.image!.objectUrl))!;
        expect(credit.authors).toContain(cultureModule.image.creator);
        expect(credit.license).toBe(cultureModule.image.license);
        expect(credit.use).toBe("culture-image");
      }
    }
  });
  it("credits García as inspiration without exposing research handling or claiming a blanket verification", () => {
    const copy = readFileSync("src/components/CourseSourceCredits.tsx", "utf8");
    expect(copy).toContain("Yan García’s Learn Nahuatl, Second Edition");
    expect(copy).toContain("Unresolved claims remain withheld");
    expect(copy).toContain("reuse and adapt openly licensed");
    expect(copy).not.toMatch(/photograph|fotograf[ií]a|scans|private book|supplied pages/i);
    for (const credit of credits) expect(credit.url).not.toMatch(/drive\.google\.com|data\/research|IMG_\d/i);
  });
  it("makes the verified second-edition book and purchase link discoverable", () => {
    const credit = credits.find(item => item.url === GARCIA_BOOK_REFERENCE.url)!;
    expect(credit.use).toBe("book-reference");
    expect(credit.authors).toContain("Yan García");
    expect(credit.title).toBe("Learn Nahuatl, Language of the Aztecs and Modern Nahuas: Second Edition");
    expect(credit.purchaseUrl).toBe("https://www.amazon.com/Nahuatl-Language-Aztecs-Modern-Nahuas/dp/B08XXC4CBY");
    expect(credit.license).toBeNull();
    expect(groupCourseSourceCredits().find(group => group.label === "Learn Nahuatl · Yan García")?.references).toContainEqual(credit);
    const copy = readFileSync("src/components/CourseSourceCredits.tsx", "utf8");
    expect(copy).toContain("Buy Yan García’s book");
    expect(copy).toContain("Comprar el libro de Yan García");
  });
  it("credits the INALI historical reference used by Why Nahuatl", () => {
    const credit = credits.find(item => item.url === "https://atlas.inali.gob.mx/agrupaciones/info/0211")!;
    expect(credit.use).toBe("culture-reference");
    expect(credit.authors).toContain("Instituto Nacional de Lenguas Indígenas");
    expect(credit.license).toBeNull();
  });
  it("identifies the exact published INALI poster and separates file dates from a full norm", () => {
    const poster = credits.find(item => item.url === TEACHING_STANDARD.alphabetUrl)!;
    expect(poster.title).toBe("INALI — Alfabeto del idioma Nawatlahtolli (náhuatl) (versión en español)");
    expect(poster.authors).toContain("Instituto Nacional de Lenguas Indígenas");
    expect(urls.has(TEACHING_STANDARD.alphabetOfficialListingUrl)).toBe(true);
    expect(TEACHING_STANDARD.alphabetPrintedPublicationDate).toBeNull();
    expect(TEACHING_STANDARD.alphabetPdfModifiedOn).toBe("2025-01-31");
    expect(TEACHING_STANDARD.alphabetOfficialListingOn).toBe("2025-05-28");
    for (const locale of ["en", "es"] as const) {
      const markup = renderToStaticMarkup(createElement(CourseSourceCredits, { locale }));
      expect(markup).toContain(TEACHING_STANDARD.alphabetTitle);
      expect(markup).toContain(TEACHING_STANDARD.alphabetOfficialListingUrl);
      expect(markup).toContain(locale === "en" ? "January 31, 2025" : "31 de enero de 2025");
      expect(markup).toContain(locale === "en" ? "May 28, 2025" : "28 de mayo de 2025");
      expect(markup).toContain(locale === "en" ? "It does not establish the final status" : "No establece el carácter definitivo");
      expect(markup).toContain(locale === "en" ? "not marked draft" : "sin marca de borrador");
    }
  });
  it("keeps an unversioned publisher notice on runtime sources without changing frozen import evidence", () => {
    const sourceReferences = [
      ...getExpansionEntries().map(entry => entry.source),
      ...getConversationScenarios().flatMap(scenario => scenario.sources),
      ...getSentencePatterns().flatMap(pattern => pattern.sources),
    ];
    expect(sourceReferences.length).toBeGreaterThan(73);
    for (const source of sourceReferences) expect(source.license).toBe(COERLL_SOURCE_LICENSE_NOTICE.name);
    expect(importedCourse.source.license.shortName).toBe("CC BY-SA 4.0");
    expect(ITZLI_V3_CONTRIBUTION_LICENSE.name).toBe("CC BY-SA 4.0");
    for (const locale of ["en", "es"] as const) {
      const markup = renderToStaticMarkup(createElement(CourseSourceCredits, { locale }));
      expect(markup).toContain(COERLL_SOURCE_LICENSE_NOTICE.listingUrl);
      expect(markup).toContain(ITZLI_V3_CONTRIBUTION_LICENSE.url);
      expect(markup).toContain(locale === "en" ? "without specifying a version" : "sin especificar versión");
    }
  });
});
