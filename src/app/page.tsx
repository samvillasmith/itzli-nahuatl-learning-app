import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { getVocabCount } from "@/lib/db";

export default function LandingPage() {
  const vocabCount = getVocabCount();
  return (
    <div>
      {/* Hero */}
      <div className="mb-16 max-w-2xl">
        <p className="text-xs font-bold text-emerald-600 mb-4 uppercase tracking-widest">
          Itzli · Obsidian Blade
        </p>
        <h1 className="text-5xl font-bold text-stone-900 mb-5 leading-tight">
          Learn Eastern Huasteca Nahuatl
        </h1>
        <p className="text-xl text-stone-500 leading-relaxed mb-3">
          A structured A1–B1 curriculum for a living language spoken by 200,000
          people in the Huasteca region of Mexico — built with the same rigor
          as courses for Spanish, French, or Mandarin.
        </p>
        <p className="text-base text-stone-400 leading-relaxed mb-8">
          Nahuatl was the <em>lingua franca</em> of Mesoamerica. It gave the
          world <em>chocolate</em>, <em>tomato</em>, <em>avocado</em>, and
          thousands of other words. It still lives — and it deserves to be
          learned.
        </p>

        <div className="flex gap-3 flex-wrap">
          <Show when="signed-out">
            <Link href="/sign-up" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm">
              Start learning — it&apos;s free
            </Link>
            <Link href="/sign-in" className="inline-flex items-center gap-2 border-2 border-stone-200 hover:border-stone-300 text-stone-600 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white transition-colors">
              Sign in
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/units"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm"
            >
              Go to my lessons →
            </Link>
            <Link
              href="/progress"
              className="inline-flex items-center gap-2 border-2 border-stone-200 hover:border-stone-300 text-stone-600 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white transition-colors"
            >
              View progress
            </Link>
          </Show>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-16">
        {[
          { value: "43", label: "Units", sub: "A1 → B1" },
          { value: vocabCount.toLocaleString(), label: "Vocabulary words", sub: "IDIEZ-referenced" },
          { value: "113", label: "Dialogues", sub: "in context" },
          { value: "37k+", label: "Lexicon entries", sub: "searchable" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-stone-200 rounded-2xl p-5 text-center">
            <div className="text-2xl font-bold text-emerald-600">{s.value}</div>
            <div className="text-sm font-semibold text-stone-700 mt-0.5">{s.label}</div>
            <div className="text-xs text-stone-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="grid sm:grid-cols-3 gap-6 mb-16">
        {[
          {
            icon: "◈",
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            title: "Structured curriculum",
            body: "43 units organized by communicative goal — greetings, family, home, nature, and beyond. Each lesson walks you through vocabulary, quizzes, and real dialogue.",
          },
          {
            icon: "◎",
            color: "text-sky-500",
            bg: "bg-sky-50",
            title: "Linguistically accurate",
            body: "Eastern Huasteca Nahuatl, not Classical Nahuatl. Every word audited against IDIEZ and attested EHN texts. Wrong glosses corrected, sources preserved.",
          },
          {
            icon: "◉",
            color: "text-violet-500",
            bg: "bg-violet-50",
            title: "Audio for everything",
            body: `Machine-synthesized pronunciations for all ${vocabCount.toLocaleString()} vocabulary words and 113 dialogue lines, using the only open TTS model trained on EHN native speech.`,
          },
        ].map((f) => (
          <div key={f.title} className="bg-white border border-stone-200 rounded-2xl p-6">
            <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center text-xl ${f.color} mb-4`}>
              {f.icon}
            </div>
            <h3 className="font-bold text-stone-900 mb-2">{f.title}</h3>
            <p className="text-sm text-stone-500 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>

      {/* Why section */}
      <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-16">
        <div className="max-w-2xl">
          <p className="text-xs font-bold text-amber-600 mb-3 uppercase tracking-widest">Why this exists</p>
          <h2 className="text-2xl font-bold text-stone-900 mb-4">A language reclaimed</h2>
          <div className="space-y-3 text-stone-500 leading-relaxed text-sm">
            <p>
              The Spanish conquest didn&apos;t just topple an empire — it systematically dismantled
              the languages, writing systems, and oral traditions that held Nahua civilization
              together. Generations of indigenous Mexicans were made to feel ashamed of their
              mother tongue. Many stopped speaking it. Many more never had the chance to learn it.
            </p>
            <p>
              Itzli was created by <strong className="text-stone-700">Sam Villa-Smith, PhD</strong> — a
              person of indigenous Mexican ancestry — as an act of cultural recovery. The goal is
              to give people like Sam, and the millions of others in the Mexican diaspora who feel
              the pull of something they were never given, a way back in.
            </p>
            <p>
              Language revitalization is one of the most powerful forms of resistance. When a
              language lives, a people&apos;s way of seeing the world lives with it.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-8">
        <p className="text-stone-400 text-sm mb-5">Free to use. No subscription.</p>
        <Show when="signed-out">
          <Link href="/sign-up" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm">
            Create a free account →
          </Link>
        </Show>
        <Show when="signed-in">
          <Link
            href="/units"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            Continue learning →
          </Link>
        </Show>
      </div>
    </div>
  );
}
