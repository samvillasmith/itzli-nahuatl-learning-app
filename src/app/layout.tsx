import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import DisclaimerBanner from "./DisclaimerBanner";

export const metadata: Metadata = {
  title: "Itzli — Learn Eastern Huasteca Nahuatl",
  description: "A structured A1–B1 curriculum for Eastern Huasteca Nahuatl.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
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
            <div className="flex gap-1 text-sm">
              <Link
                href="/units"
                className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium"
              >
                Units
              </Link>
              <Link
                href="/vocabulary"
                className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium"
              >
                Vocabulary
              </Link>
              <Link
                href="/grammar"
                className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium"
              >
                Grammar
              </Link>
              <Link
                href="/progress"
                className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors font-medium"
              >
                Progress
              </Link>
            </div>
          </div>
        </nav>
        <DisclaimerBanner />
        <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
        <footer className="border-t border-stone-200 mt-16 py-6 text-center text-xs text-stone-400">
          <a
            href="https://www.pexels.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-stone-600 transition-colors"
          >
            Photos provided by Pexels
          </a>
        </footer>
      </body>
    </html>
  );
}
