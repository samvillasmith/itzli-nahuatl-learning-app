import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import DisclaimerBanner from "./DisclaimerBanner";
import LegalModal from "./LegalModal";

const SITE_URL = "https://itzli.app";
const DESCRIPTION =
  "Learn Eastern Huasteca Nahuatl with Itzli — a free, structured A1–B1 curriculum covering 2,000+ vocabulary words, 43 units, and real dialogues. Built for heritage speakers, language learners, and anyone who wants to connect with one of Mexico's living indigenous languages.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Itzli — Learn Eastern Huasteca Nahuatl",
    template: "%s | Itzli",
  },
  description: DESCRIPTION,
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
  ],
  authors: [{ name: "Sam Villa-Smith", url: "https://amoxcalli.org" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Itzli",
    title: "Itzli — Learn Eastern Huasteca Nahuatl",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Itzli — Learn Eastern Huasteca Nahuatl",
    description: DESCRIPTION,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen">
          <div className="sticky top-0 z-20 h-1 bg-[linear-gradient(90deg,#116a55,#0f87a0_38%,#d09b2c_70%,#c85f38)]" />
          <nav className="sticky top-1 z-10 border-b border-stone-200/80 bg-white/88 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-black text-stone-950"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-950 text-xs font-black text-white shadow-sm">
                  ✦
                </span>
                Itzli
              </Link>

              {/* Signed-in nav */}
              <Show when="signed-in">
                <div className="flex items-center gap-0.5 text-sm sm:gap-1">
                  <Link href="/units" className="rounded-lg px-2 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 sm:px-3">
                    Units
                  </Link>
                  <Link href="/curriculum" className="hidden rounded-lg px-2 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 sm:inline-flex sm:px-3">
                    Path
                  </Link>
                  <Link href="/vocabulary" className="rounded-lg px-2 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 sm:px-3">
                    <span className="hidden sm:inline">Vocabulary</span>
                    <span className="sm:hidden">Vocab</span>
                  </Link>
                  <Link href="/grammar" className="rounded-lg px-2 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 sm:px-3">
                    Grammar
                  </Link>
                  <Link href="/tutor" className="rounded-lg px-2 py-1.5 font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 sm:px-3">
                    Tutor
                  </Link>
                  <Link href="/progress" className="inline-flex rounded-lg px-2 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 sm:px-3">
                    <span className="hidden sm:inline">Progress</span>
                    <span className="sm:hidden">Stats</span>
                  </Link>
                  <div className="ml-1 sm:ml-2">
                    <UserButton />
                  </div>
                </div>
              </Show>

              {/* Signed-out nav */}
              <Show when="signed-out">
                <div className="flex items-center gap-2 text-sm">
                  <Link href="/curriculum" className="hidden rounded-lg px-3 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 sm:inline-flex">
                    Curriculum
                  </Link>
                  <Link href="/sign-in" className="rounded-lg px-3 py-1.5 font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950">
                    Sign in
                  </Link>
                  <Link href="/sign-up" className="rounded-lg bg-stone-950 px-4 py-1.5 font-semibold text-white transition-colors hover:bg-emerald-700">
                    Get started
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
                description: DESCRIPTION,
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
                educationalLevel: "Beginner to Intermediate (A1–B1)",
                inLanguage: "nhe",
                isAccessibleForFree: true,
                license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
              }),
            }}
          />
          <DisclaimerBanner />
          <LegalModal />
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
          <footer className="mt-16 border-t border-stone-200 py-8 text-xs text-stone-500">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
              <div className="flex items-center gap-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-stone-950 text-xs font-black text-white">✦</span>
                <span className="font-semibold text-stone-700">Itzli</span>
                <span className="mx-2 text-stone-300">·</span>
                <span>Eastern Huasteca Nahuatl · A1–B1 curriculum</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <Link href="/terms" className="hover:text-stone-600 transition-colors">
                  Terms
                </Link>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <Link href="/privacy" className="hover:text-stone-600 transition-colors">
                  Privacy
                </Link>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <Link href="/eula" className="hover:text-stone-600 transition-colors">
                  EULA
                </Link>
                <span className="text-stone-300 hidden sm:inline">·</span>
                <a
                  href="https://github.com/samvillasmith/itzli-nahuatl-learning-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-600 transition-colors"
                >
                  GitHub
                </a>
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
                <a
                  href="https://www.pexels.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-600 transition-colors"
                >
                  Photos: Pexels
                </a>
              </div>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
