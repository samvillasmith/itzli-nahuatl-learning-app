import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Itzli — Learn Eastern Huasteca Nahuatl",
  description:
    "A structured A1–B1 curriculum for Eastern Huasteca Nahuatl.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="font-semibold text-lg tracking-tight text-stone-800"
            >
              Itzli
            </Link>
            <div className="flex gap-6 text-sm text-stone-500">
              <Link href="/units" className="hover:text-stone-800 transition-colors">
                Units
              </Link>
              <Link href="/vocabulary" className="hover:text-stone-800 transition-colors">
                Vocabulary
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
