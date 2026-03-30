import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import DisclaimerBanner from "./DisclaimerBanner";

export const metadata: Metadata = {
  title: "Itzli — Learn Eastern Huasteca Nahuatl",
  description: "A structured A1–B1 curriculum for Eastern Huasteca Nahuatl.",
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
                <div className="flex items-center gap-1 text-sm">
                  <Link href="/units" className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium">
                    Units
                  </Link>
                  <Link href="/vocabulary" className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium">
                    Vocabulary
                  </Link>
                  <Link href="/grammar" className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium">
                    Grammar
                  </Link>
                  <Link href="/progress" className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium">
                    Progress
                  </Link>
                  <div className="ml-2">
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
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/samvillasmith/itzli-nahuatl-learning-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-600 transition-colors"
                >
                  GitHub
                </a>
                <span className="text-stone-300">·</span>
                <a
                  href="https://amoxcalli.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-600 transition-colors"
                >
                  Amoxcalli
                </a>
                <span className="text-stone-300">·</span>
                <a
                  href="https://www.linkedin.com/in/dr-sam-villa-smith-phd-mba-ccsk-cczt-a803a0109/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-stone-600 transition-colors"
                >
                  LinkedIn
                </a>
                <span className="text-stone-300">·</span>
                <a
                  href="mailto:svillasmith3@gmail.com"
                  className="hover:text-stone-600 transition-colors select-all"
                >
                  svillasmith3@gmail.com
                </a>
                <span className="text-stone-300">·</span>
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
