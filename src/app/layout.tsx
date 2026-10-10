import type { Metadata } from "next";
import { headers } from "next/headers";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";
import Link from "next/link";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import LegalModal from "./LegalModal";
import { TUTOR_FEATURE_ENABLED } from "@/lib/features";
import { ArrowUpRight, BookOpen, ChevronDown, LibraryBig, RotateCcw, Sparkles } from "lucide-react";
import { isLocalReviewMode } from "@/lib/local-review";
import LearningAccountProvider, { AccountShow as Show } from "@/components/LearningAccount";
import MobileLearningNav from "./MobileLearningNav";
import LocaleProvider from "@/i18n/LocaleProvider";
import LocaleToggle from "@/i18n/LocaleToggle";
import { htmlLang, localizedPathname, type AppLocale } from "@/i18n/config";
import { getRequestLocale, getRequestPathname } from "@/i18n/server";
import { tr, trChoice } from "@/i18n/translate";
import { WordImageOriginHints } from "@/components/WordImageResourceHints";
import ReportIssueButton from "@/components/ReportIssueButton";
import CourseAudioCache from "@/components/CourseAudioCache";
import VersionAnnouncement from "@/components/VersionAnnouncement";
import { getUnifiedCoursePath, getUnifiedVocabularyCount } from "@/lib/unified-course-path";
import { GENERATED_AUDIO_ASSETS } from "@/lib/generated-audio";
import { createPageMetadata, fallbackSearchCopy, isIndexablePath, serializeStructuredData, siteStructuredData } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, pathname] = await Promise.all([getRequestLocale(), getRequestPathname()]);
  const copy = fallbackSearchCopy(locale, pathname, getUnifiedCoursePath().length, getUnifiedVocabularyCount());
  return {
    ...createPageMetadata({ locale, pathname, ...copy }),
    authors: [{ name: "Sam Villa-Smith", url: "https://amoxcalli.org" }],
    creator: "Sam Villa-Smith",
    publisher: "Itzli",
  };
}

function ResourcesMenu({ locale }: { locale: AppLocale }) {
  const items = [
    ["/grammar", tr(locale, "Grammar")],
    ["/conversations", trChoice(locale, "Conversation practice", "Práctica de conversación")],
    ["/listening", trChoice(locale, "Listening practice", "Práctica de escucha")],
    ["/sentences", trChoice(locale, "Sentence practice", "Práctica de oraciones")],
    ["/culture", tr(locale, "Culture")],
    ["/source-course", trChoice(locale, "Sources and credits", "Fuentes y créditos")],
    ...(TUTOR_FEATURE_ENABLED ? [["/tutor", tr(locale, "Tutor")]] : []),
  ];
  return <details className="relative">
    <summary className="nav-link cursor-pointer list-none">{trChoice(locale, "Resources", "Recursos")} <ChevronDown size={14} /></summary>
    <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-stone-200 bg-[#fffdf8] p-2 text-sm shadow-xl">
      {items.map(([href, label]) => <Link key={href} href={href} className="block rounded-lg px-3 py-2 font-medium text-stone-600 hover:bg-emerald-50 hover:text-emerald-900">{label}</Link>)}
    </div>
  </details>;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, pathname] = await Promise.all([getRequestLocale(), getRequestPathname()]);

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const localReview = isLocalReviewMode();
  const content = (
      <html lang={htmlLang(locale)} data-scroll-behavior="smooth">
        <body className="min-h-screen pb-20 md:pb-0">
          <WordImageOriginHints />
          <LocaleProvider initialLocale={locale}>
          <LearningAccountProvider localReview={localReview} waitForProgress={!(isIndexablePath(pathname) || ["/sign-in", "/sign-up"].some(publicPath => publicPath === pathname || pathname.startsWith(`${publicPath}/`)))}>
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
              </Link>

              {/* Signed-in nav */}
              <Show when="signed-in">
                <div className="hidden items-center gap-1 text-sm md:flex">
                  <Link href="/units" className="nav-link">
                    <BookOpen size={15} /> {tr(locale, "Learn")}
                  </Link>
                  <Link href="/vocabulary" className="nav-link">
                    <LibraryBig size={15} /> {tr(locale, "Vocabulary")}
                  </Link>
                  <Link href="/review" className="nav-link">
                    <RotateCcw size={15} /> {tr(locale, "Review")}
                  </Link>
                  <Link href="/progress" className="nav-link">
                    {tr(locale, "Progress")}
                  </Link>
                  <ResourcesMenu locale={locale} />
                  <LocaleToggle compact />
                  <div className="ml-1 sm:ml-2">
                    {!localReview && <UserButton />}
                  </div>
                </div>
                <div className="flex items-center gap-2 md:hidden">
                  <ResourcesMenu locale={locale} />
                  <LocaleToggle compact />
                  {!localReview && <UserButton />}
                </div>
              </Show>

              {/* Signed-out nav */}
              <Show when="signed-out">
                <div className="flex items-center gap-1.5 text-sm sm:gap-2">
                  <LocaleToggle compact />
                  <Link href="/units" className="hidden rounded-lg px-3 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 sm:inline-flex">
                    {tr(locale, "Explore the course")}
                  </Link>
                  <Link href="/sign-in" className="nav-link !px-1.5 sm:!px-3">
                    <span className="sm:hidden">{trChoice(locale, "Sign in", "Entrar")}</span>
                    <span className="hidden sm:inline">{tr(locale, "Sign in")}</span>
                  </Link>
                  <Link href="/sign-up" className="button-primary !px-3 !py-2.5 sm:!px-4">
                    <span className="sm:hidden">{trChoice(locale, "Start", "Empezar")}</span>
                    <span className="hidden sm:inline">{tr(locale, "Start learning")}</span>
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </Show>
            </div>
            </nav>
          {isIndexablePath(pathname) && <script
            nonce={nonce}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: serializeStructuredData(siteStructuredData({ locale, pathname,
                lessonCount: getUnifiedCoursePath().length, wordCount: getUnifiedVocabularyCount() })),
            }}
          />}
            {!localReview && <LegalModal />}
            <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
              <VersionAnnouncement
                locale={locale}
                lessonCount={getUnifiedCoursePath().length}
                vocabularyCount={getUnifiedVocabularyCount()}
                audioClipCount={GENERATED_AUDIO_ASSETS.length}
              />
              {children}
            </main>
            <Show when="signed-in"><MobileLearningNav /></Show>
            <footer className="mt-20 border-t border-stone-200/80 bg-white/45 py-10 text-xs text-stone-500">
            <div className="mx-auto mb-6 max-w-7xl px-4 sm:px-6"><CourseAudioCache /></div>
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 sm:px-6 lg:flex-row">
              <div className="flex items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-stone-950 text-xs font-black text-white">✦</span>
                <span className="font-semibold text-stone-700">Itzli</span>
                <span className="mx-2 text-stone-300">·</span>
                <span>{tr(locale, "Eastern Huasteca Nahuatl · A1–A2 course · B1-oriented extensions")}</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <ReportIssueButton label={trChoice(locale, "Report an issue", "Reportar un problema")} />
                <span className="text-stone-300 hidden sm:inline">·</span>
                <Link href={`${localizedPathname("/source-course", locale)}#community-feedback`} className="hover:text-stone-600 transition-colors">
                  {trChoice(locale, "Community feedback", "Aportes de la comunidad")}
                </Link>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <Link href={`${localizedPathname("/source-course", locale)}#dedication`} className="hover:text-stone-600 transition-colors">
                  {trChoice(locale, "Dedication", "Dedicatoria")}
                </Link>
                <span className="text-stone-300 hidden sm:inline">·</span>
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
                  href="mailto:admin@itzli.app"
                  className="hover:text-stone-600 transition-colors select-all"
                >
                  admin@itzli.app
                </a>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <span>{tr(locale, "Image credits appear with each card")}</span>
              </div>
            </div>
            </footer>
          </LearningAccountProvider>
          </LocaleProvider>
          <Analytics />
        </body>
      </html>
  );
  return localReview ? content : <ClerkProvider dynamic localization={locale === "es" ? esMX : undefined}>{content}</ClerkProvider>;
}
