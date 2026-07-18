import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import DisclaimerBanner from "./DisclaimerBanner";
import LegalModal from "./LegalModal";
import { TUTOR_FEATURE_ENABLED } from "@/lib/features";
import { ArrowUpRight, BookOpen, Landmark, LibraryBig, Route, Sparkles } from "lucide-react";
import MobileLearningNav from "./MobileLearningNav";
import LocaleProvider from "@/i18n/LocaleProvider";
import LocaleToggle from "@/i18n/LocaleToggle";
import { htmlLang } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import { tr } from "@/i18n/translate";

const SITE_URL = "https://itzli.app";
const DESCRIPTION =
  "Learn Eastern Huasteca Nahuatl with Itzli — a free, structured course from A1 foundations through A2, with B1-oriented grammar and narrative modules, hundreds of reviewed lesson words and phrases, 43 units, and real dialogues.";
const DESCRIPTION_ES =
  "Aprende náhuatl de la Huasteca veracruzana con Itzli: un curso gratuito y estructurado desde las bases A1 hasta A2, con módulos de gramática y narración orientados a B1, cientos de palabras y frases revisadas, 43 unidades y diálogos reales.";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const title = locale === "es"
    ? "Itzli — Aprende náhuatl de la Huasteca veracruzana"
    : "Itzli — Learn Eastern Huasteca Nahuatl";
  const description = locale === "es" ? DESCRIPTION_ES : DESCRIPTION;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s | Itzli" },
    description,
    keywords: [
      "learn nahuatl",
      "nahuatl language learning",
      "nahuatl course",
      "nahuatl lessons",
      "nahuatl for beginners",
      "eastern huasteca nahuatl",
      "nahuatl app",
      "nahuatl vocabulary",
      "nahuatl grammar",
      "indigenous mexican language",
      "aztec language",
      "language revitalization",
      "nahuatl online",
      "nahuatl heritage learner",
      "learn aztec",
      "nhe nahuatl",
      "huasteca nahuatl",
      "aprender náhuatl",
      "curso de náhuatl",
      "náhuatl de la Huasteca veracruzana",
    ],
    authors: [{ name: "Sam Villa-Smith", url: "https://amoxcalli.org" }],
    openGraph: { type: "website", url: SITE_URL, siteName: "Itzli", title, description },
    twitter: { card: "summary", title, description },
    alternates: { canonical: SITE_URL },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();

  return (
    <ClerkProvider localization={locale === "es" ? esMX : undefined}>
      <html lang={htmlLang(locale)}>
        <body className="min-h-screen pb-20 md:pb-0">
          <LocaleProvider initialLocale={locale}>
            <div className="brand-ribbon" />
            <nav className="site-nav">
            <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6">
              <Link
                href="/"
                className="group flex items-center gap-2.5 text-lg font-black tracking-[-0.02em] text-stone-950"
              >
                <span className="brand-mark">
                  <Sparkles size={15} strokeWidth={2.4} />
                </span>
                <span className="flex flex-col leading-none">
                  <span>Itzli</span>
                  <span className="mt-1 hidden text-[8px] font-extrabold uppercase tracking-[.13em] text-emerald-700 sm:block">{tr(locale, "Eastern Huasteca Nahuatl")}</span>
                </span>
                <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700 sm:inline">2.0</span>
              </Link>

              {/* Signed-in nav */}
              <Show when="signed-in">
                <div className="hidden items-center gap-1 text-sm md:flex">
                  <Link href="/units" className="nav-link">
                    <BookOpen size={15} /> {tr(locale, "Learn")}
                  </Link>
                  <Link href="/curriculum" className="nav-link">
                    <Route size={15} /> {tr(locale, "Path")}
                  </Link>
                  <Link href="/vocabulary" className="nav-link">
                    <LibraryBig size={15} /> {tr(locale, "Vocabulary")}
                  </Link>
                  <Link href="/grammar" className="nav-link">
                    {tr(locale, "Grammar")}
                  </Link>
                  <Link href="/culture" className="nav-link">
                    <Landmark size={15} /> {tr(locale, "Culture")}
                  </Link>
                  <Link href="/source-course" className="hidden rounded-lg px-2 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 xl:inline-flex sm:px-3">
                    {tr(locale, "Source")}
                  </Link>
                  {TUTOR_FEATURE_ENABLED && (
                    <Link href="/tutor" className="rounded-lg px-2 py-1.5 font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 sm:px-3">
                      {tr(locale, "Tutor")}
                    </Link>
                  )}
                  <Link href="/progress" className="nav-link">
                    {tr(locale, "Progress")}
                  </Link>
                  <LocaleToggle compact />
                  <div className="ml-1 sm:ml-2">
                    <UserButton />
                  </div>
                </div>
                <div className="flex items-center gap-2 md:hidden">
                  <LocaleToggle compact />
                  <UserButton />
                </div>
              </Show>

              {/* Signed-out nav */}
              <Show when="signed-out">
                <div className="flex items-center gap-1.5 text-sm sm:gap-2">
                  <LocaleToggle compact />
                  <Link href="/curriculum" className="hidden rounded-lg px-3 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 sm:inline-flex">
                    {tr(locale, "Curriculum")}
                  </Link>
                  <Link href="/sign-in" className="nav-link">
                    {tr(locale, "Sign in")}
                  </Link>
                  <Link href="/sign-up" className="button-primary !px-4 !py-2.5">
                    {tr(locale, "Start learning")} <ArrowUpRight size={15} />
                  </Link>
                </div>
              </Show>
            </div>
            </nav>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: "Itzli",
                url: "https://itzli.app",
                description: locale === "es" ? DESCRIPTION_ES : DESCRIPTION,
                applicationCategory: "EducationApplication",
                operatingSystem: "Web",
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                author: {
                  "@type": "Person",
                  name: "Sam Villa-Smith",
                  url: "https://amoxcalli.org",
                },
                about: {
                  "@type": "Language",
                  name: "Eastern Huasteca Nahuatl",
                  alternateName: ["Nahuatl", "Náhuatl", "NHE"],
                },
                educationalLevel: locale === "es" ? "Bases A1 hasta A2, con módulos de extensión orientados a B1" : "A1 foundations through A2, with B1-oriented extension modules",
                inLanguage: "nhe",
                isAccessibleForFree: true,
              }),
            }}
          />
            <DisclaimerBanner />
            <LegalModal />
            <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
            <Show when="signed-in"><MobileLearningNav /></Show>
            <footer className="mt-20 border-t border-stone-200/80 bg-white/45 py-10 text-xs text-stone-500">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 sm:px-6 lg:flex-row">
              <div className="flex items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-stone-950 text-xs font-black text-white">✦</span>
                <span className="font-semibold text-stone-700">Itzli</span>
                <span className="mx-2 text-stone-300">·</span>
                <span>{tr(locale, "Eastern Huasteca Nahuatl · A1–A2 course · B1-oriented extensions")}</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <Link href="/terms" className="hover:text-stone-600 transition-colors">
                  {tr(locale, "Terms")}
                </Link>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <Link href="/privacy" className="hover:text-stone-600 transition-colors">
                  {tr(locale, "Privacy")}
                </Link>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <Link href="/eula" className="hover:text-stone-600 transition-colors">
                  EULA
                </Link>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <a
                  href="https://amoxcalli.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-600 transition-colors"
                >
                  Amoxcalli
                </a>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <a
                  href="https://www.linkedin.com/in/dr-sam-villa-smith-phd-mba-ccsk-cczt-a803a0109/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-600 transition-colors"
                >
                  LinkedIn
                </a>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <a
                  href="mailto:svillasmith3@gmail.com"
                  className="hover:text-stone-600 transition-colors select-all"
                >
                  svillasmith3@gmail.com
                </a>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <span>{tr(locale, "Image credits appear with each card")}</span>
              </div>
            </div>
            </footer>
          </LocaleProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
