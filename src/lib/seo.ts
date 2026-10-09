import type { Metadata } from "next";
import { htmlLang, localizedPathname, stripLocalePrefix, type AppLocale } from "@/i18n/config";

export const SITE_URL = "https://www.itzli.app";
export const PUBLIC_INDEXABLE_PATHS = ["/", "/curriculum", "/source-course", "/terms", "/privacy", "/eula"] as const;
export const SOCIAL_IMAGE_PATH = "/itzli-learn-nahuatl.png";

function cleanPathname(pathname: string): string {
  const path = stripLocalePrefix(pathname.split(/[?#]/, 1)[0]);
  return path === "/" ? path : path.replace(/\/+$/, "");
}

export function localizedUrl(pathname: string, locale: AppLocale): string {
  return new URL(localizedPathname(cleanPathname(pathname), locale), SITE_URL).toString();
}

export function isIndexablePath(pathname: string): boolean {
  return (PUBLIC_INDEXABLE_PATHS as readonly string[]).includes(cleanPathname(pathname));
}

export function homeSearchCopy(locale: AppLocale, lessonCount: number, wordCount: number) {
  const lessons = lessonCount.toLocaleString(htmlLang(locale));
  const words = wordCount.toLocaleString(htmlLang(locale));
  return locale === "es" ? {
    title: "Aprende náhuatl en línea gratis",
    description: `Aprende náhuatl gratis con ${lessons} lecciones guiadas y ${words} palabras y formas. Practica pronunciación, gramática y conversación de la Huasteca veracruzana.`,
  } : {
    title: "Learn Nahuatl Online for Free",
    description: `Learn Nahuatl for free with ${lessons} guided lessons and ${words} words and forms. Practice pronunciation, grammar, and conversation in Eastern Huasteca Nahuatl.`,
  };
}

const SECTION_TITLES: Record<string, [string, string]> = {
  "/units": ["Nahuatl Lessons", "Lecciones de náhuatl"],
  "/vocabulary": ["Nahuatl Vocabulary", "Vocabulario de náhuatl"],
  "/grammar": ["Nahuatl Grammar", "Gramática de náhuatl"],
  "/conversations": ["Nahuatl Conversation Practice", "Práctica de conversación en náhuatl"],
  "/listening": ["Nahuatl Listening & Pronunciation", "Escucha y pronunciación de náhuatl"],
  "/sentences": ["Nahuatl Sentence Practice", "Práctica de oraciones en náhuatl"],
  "/practice": ["Nahuatl Flashcard Practice", "Práctica de tarjetas de náhuatl"],
  "/more-words": ["More Nahuatl Words", "Más palabras en náhuatl"],
  "/expansion": ["Nahuatl Course Extensions", "Extensiones del curso de náhuatl"],
  "/review": ["Review Your Nahuatl", "Repasa tu náhuatl"],
  "/progress": ["Your Nahuatl Learning Progress", "Tu progreso de aprendizaje de náhuatl"],
  "/sign-in": ["Sign in", "Inicia sesión"],
  "/sign-up": ["Start Learning Nahuatl for Free", "Empieza a aprender náhuatl gratis"],
};

export function fallbackSearchCopy(locale: AppLocale, pathname: string, lessonCount: number, wordCount: number) {
  const home = homeSearchCopy(locale, lessonCount, wordCount);
  if (cleanPathname(pathname) === "/") return home;
  const section = `/${cleanPathname(pathname).split("/")[1]}`;
  const titles = SECTION_TITLES[section];
  return { ...home, title: titles ? titles[locale === "es" ? 1 : 0] : locale === "es" ? "Aprende náhuatl con Itzli" : "Learn Nahuatl with Itzli" };
}

export function createPageMetadata({ locale, pathname, title, description, indexable = isIndexablePath(pathname) }: {
  locale: AppLocale; pathname: string; title: string; description: string; indexable?: boolean;
}): Metadata {
  const englishUrl = localizedUrl(pathname, "en");
  const spanishUrl = localizedUrl(pathname, "es");
  const canonical = locale === "es" ? spanishUrl : englishUrl;
  const fullTitle = `${title} | Itzli`;
  const image = {
    url: `${SITE_URL}${SOCIAL_IMAGE_PATH}`, width: 1200, height: 630,
    alt: "Itzli — Learn Nahuatl / Aprende náhuatl — Free online course / Curso gratuito",
  };
  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: fullTitle },
    description,
    applicationName: "Itzli",
    category: locale === "es" ? "Educación de idiomas" : "Language education",
    alternates: { canonical, languages: { en: englishUrl, es: spanishUrl, "x-default": spanishUrl } },
    robots: indexable ? {
      index: true, follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    } : { index: false, follow: true },
    openGraph: {
      type: "website", url: canonical, siteName: "Itzli", title: fullTitle, description,
      locale: locale === "es" ? "es_MX" : "en_US", alternateLocale: locale === "es" ? ["en_US"] : ["es_MX"],
      images: [image],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] },
  };
}

/** One real course and its web app, with stable identities shared across languages. */
export function siteStructuredData({ locale, pathname, lessonCount, wordCount }: {
  locale: AppLocale; pathname: string; lessonCount: number; wordCount: number;
}) {
  const home = localizedUrl("/", locale);
  const description = homeSearchCopy(locale, lessonCount, wordCount).description;
  const organization = { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Itzli", url: SITE_URL };
  const graph: Record<string, unknown>[] = [
    organization,
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "Itzli",
      alternateName: ["Itzli Nahuatl", "Itzli — Learn Nahuatl", "Itzli — Aprende náhuatl"],
      inLanguage: ["en", "es"], publisher: { "@id": organization["@id"] } },
  ];
  if (["/", "/curriculum", "/source-course"].includes(cleanPathname(pathname))) {
    const language = { "@type": "Language", name: "Eastern Huasteca Nahuatl", alternateName: ["Náhuatl de la Huasteca veracruzana", "Chicontepec Nahuatl"], identifier: "nhe" };
    graph.push(
      { "@type": "Course", "@id": `${SITE_URL}/#nahuatl-course`, url: home,
        name: locale === "es" ? "Curso gratuito de náhuatl de la Huasteca veracruzana" : "Free Eastern Huasteca Nahuatl Course",
        description, provider: { "@id": organization["@id"] }, about: language,
        inLanguage: ["en", "es"], isAccessibleForFree: true,
        teaches: locale === "es" ? ["Vocabulario de náhuatl", "Pronunciación", "Gramática", "Conversación"] : ["Nahuatl vocabulary", "Pronunciation", "Grammar", "Conversation"],
        educationalLevel: locale === "es" ? "Bases A1–A2 con extensiones seleccionadas orientadas a B1" : "A1–A2 foundations with selected B1-oriented extensions",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD", url: localizedUrl("/sign-up", locale) } },
      { "@type": "WebApplication", "@id": `${SITE_URL}/#app`, name: "Itzli", url: home, description,
        applicationCategory: "EducationalApplication", operatingSystem: "Web", softwareVersion: "3.0",
        inLanguage: ["en", "es"], isAccessibleForFree: true, about: language,
        publisher: { "@id": organization["@id"] }, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
    );
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
