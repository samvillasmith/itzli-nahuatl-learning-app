import { describe, expect, it } from "vitest";
import { createPageMetadata, homeSearchCopy, isIndexablePath, localizedUrl, serializeStructuredData, siteStructuredData, SITE_URL } from "@/lib/seo";
import { getUnifiedCoursePath, getUnifiedVocabularyCount } from "@/lib/unified-course-path";

describe("Nahuatl search metadata", () => {
  it("describes the live course inventory in both instruction languages", () => {
    const lessonCount = getUnifiedCoursePath().length;
    const wordCount = getUnifiedVocabularyCount();
    for (const locale of ["en", "es"] as const) {
      const copy = homeSearchCopy(locale, lessonCount, wordCount);
      expect(copy.description).toContain(lessonCount.toLocaleString(locale === "es" ? "es-MX" : "en-US"));
      expect(copy.description).toContain(wordCount.toLocaleString(locale === "es" ? "es-MX" : "en-US"));
      expect(copy.description).toContain(locale === "es" ? "palabras y formas" : "words and forms");
      expect(copy.title).toMatch(locale === "es" ? /náhuatl.*gratis/ : /Nahuatl.*Free/);
    }
  });

  it.each(["en", "es"] as const)("keeps %s canonical, alternate, and share URLs consistent without query duplicates", locale => {
    const metadata = createPageMetadata({ locale, pathname: "/en/curriculum/?utm_source=test#lessons", title: "Curriculum", description: "Course lessons" });
    const canonical = `${SITE_URL}${locale === "en" ? "/en" : ""}/curriculum`;
    expect(metadata.alternates?.canonical).toBe(canonical);
    expect(metadata.alternates?.languages).toEqual({ en: `${SITE_URL}/en/curriculum`, es: `${SITE_URL}/curriculum`, "x-default": `${SITE_URL}/curriculum` });
    expect(metadata.openGraph).toMatchObject({ url: canonical, title: "Curriculum | Itzli", description: "Course lessons", images: [{ url: `${SITE_URL}/itzli-learn-nahuatl.png`, width: 1200, height: 630 }] });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image", title: "Curriculum | Itzli", description: "Course lessons" });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("indexes public sources but excludes lesson children, progress, and account URLs", () => {
    for (const pathname of ["/", "/en", "/curriculum", "/source-course", "/en/source-course", "/privacy"]) {
      expect(isIndexablePath(pathname)).toBe(true);
    }
    for (const pathname of ["/source-course/1", "/units/284", "/en/progress", "/sign-up", "/design-preview", "/learn", "/unknown"]) {
      expect(createPageMetadata({ locale: "en", pathname, title: "Page", description: "Page" }).robots).toMatchObject({ index: false });
    }
    expect(localizedUrl("/es/source-course", "en")).toBe(`${SITE_URL}/en/source-course`);
  });

  it("describes one real free course with stable identities, without inventing reviews or certification", () => {
    const en = siteStructuredData({ locale: "en", pathname: "/", lessonCount: 324, wordCount: 1724 });
    const es = siteStructuredData({ locale: "es", pathname: "/curriculum", lessonCount: 324, wordCount: 1724 });
    const course = en["@graph"].find(node => node["@type"] === "Course");
    expect(course).toMatchObject({ "@id": `${SITE_URL}/#nahuatl-course`, url: `${SITE_URL}/en`, isAccessibleForFree: true, about: { identifier: "nhe" }, offers: { price: "0" } });
    expect(es["@graph"].find(node => node["@type"] === "Course")?.["@id"]).toBe(course?.["@id"]);
    expect(JSON.stringify(en)).not.toMatch(/aggregateRating|reviewCount|officially certified/);
    expect(siteStructuredData({ locale: "en", pathname: "/privacy", lessonCount: 324, wordCount: 1724 })["@graph"].some(node => node["@type"] === "Course")).toBe(false);
  });

  it("cannot terminate the structured-data script with embedded source text", () => {
    const original = { description: "</script><script>alert('test')</script>" };
    const serialized = serializeStructuredData(original);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(original);
  });
});
