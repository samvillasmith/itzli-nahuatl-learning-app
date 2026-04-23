import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import DisclaimerBanner from "./DisclaimerBanner";

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
          <div className="h-1 sticky top-0 z-20 bg-gradient-to-r from-[#1a7a62] via-[#1295a8] via-50% via-[#b88420] to-[#c4622d]" />
          <nav className="border-b border-stone-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-lg text-stone-900 tracking-tight"
              >
                <span className="w-7 h-7 rounded-sm bg-emerald-500 flex items-center justify-center text-white text-xs font-black">
                  ✦
                </span>
                Itzli
              </Link>

              {/* Signed-in nav */}
              <Show when="signed-in">
                <div className="flex items-center gap-0.5 sm:gap-1 text-sm">
                  <Link href="/units" className="px-2 sm:px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium">
                    Units
                  </Link>
                  <Link href="/vocabulary" className="px-2 sm:px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium">
                    <span className="hidden sm:inline">Vocabulary</span>
                    <span className="sm:hidden">Vocab</span>
                  </Link>
                  <Link href="/grammar" className="px-2 sm:px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium">
                    Grammar
                  </Link>
                  <Link href="/tutor" className="px-2 sm:px-3 py-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors font-medium">
                    Tutor
                  </Link>
                  <Link href="/progress" className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium">
                    Progress
                  </Link>
                  <div className="ml-1 sm:ml-2">
                    <UserButton />
                  </div>
                </div>
              </Show>

              {/* Signed-out nav */}
              <Show when="signed-out">
                <div className="flex items-center gap-2 text-sm">
                  <Link href="/sign-in" className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium">
                    Sign in
                  </Link>
                  <Link href="/sign-up" className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors">
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
          <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
          <footer className="border-t border-stone-200 mt-16 py-8 text-xs text-stone-400">
            <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1">
                <span className="w-5 h-5 rounded-sm bg-emerald-500 flex items-center justify-center text-white text-xs font-black">✦</span>
                <span className="font-semibold text-stone-500">Itzli</span>
                <span className="mx-2 text-stone-300">·</span>
                <span>Eastern Huasteca Nahuatl · A1–B1 curriculum</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
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
