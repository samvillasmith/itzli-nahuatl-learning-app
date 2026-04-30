import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { getAllUnits, getPrimerVocabEntryCount, getVocabCount } from "@/lib/db";
import { getCurriculumAudit } from "@/lib/curriculum";
import { getWordImage } from "@/data/word-images";

const SHOWCASE_WORDS = [
  { word: "xochitl", gloss: "flower" },
  { word: "atl", gloss: "water" },
  { word: "cintli", gloss: "corn" },
  { word: "tomatl", gloss: "tomato" },
  { word: "papalotl", gloss: "butterfly" },
  { word: "amoxtli", gloss: "book" },
  { word: "taza", gloss: "cup" },
  { word: "piyo", gloss: "chicken" },
];

function ImageMosaic() {
  const items = SHOWCASE_WORDS.map((item) => ({
    ...item,
    image: getWordImage(item.word, { allowLegacyFallback: true }),
  })).filter((item) => item.image);

  return (
    <div className="absolute inset-0 grid grid-cols-4 opacity-40 sm:opacity-55">
      {items.map((item) => (
        <div key={item.word} className="relative min-h-32 overflow-hidden bg-stone-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image!.url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 bg-stone-950/65 px-2 py-1">
            <p className="truncate text-[10px] font-semibold text-white">
              {item.word} · {item.gloss}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const units = getAllUnits();
  const vocabCount = getVocabCount();
  const primerEntryCount = getPrimerVocabEntryCount();
  const audit = getCurriculumAudit();
  const dialogueCount = units.reduce((sum, unit) => sum + unit.english_dialogue_count, 0);
  const constructions = units.reduce((sum, unit) => sum + unit.english_construction_count, 0);
  const firstUnit = units[0];
  const nextMilestones = units.filter((unit) => unit.path_order <= 6);

  return (
    <div className="space-y-14">
      <section className="relative -mx-4 overflow-hidden bg-stone-950 px-4 py-14 text-white sm:mx-0 sm:rounded-lg sm:px-10 sm:py-16">
        <ImageMosaic />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,12,11,.94),rgba(8,12,11,.82)_45%,rgba(8,12,11,.38))]" />
        <div className="relative max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase text-emerald-200">
            Itzli · Eastern Huasteca Nahuatl
          </p>
          <h1 className="max-w-2xl text-4xl font-black leading-[1.02] text-white sm:text-6xl">
            A polished A1 to B1 path for a living Nahua language.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-100 sm:text-lg">
            Itzli now presents a curated CEFR-style progression across {audit.totalUnits} units,
            {vocabCount.toLocaleString()} core lesson cards, {primerEntryCount.toLocaleString()} primer
            vocabulary entries, language-specific machine audio, dialogues, grammar, practice, and a
            searchable lexicon built around Eastern Huasteca Nahuatl.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-400"
              >
                Start learning free
              </Link>
              <Link
                href="/curriculum"
                className="inline-flex items-center rounded-lg border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                View curriculum
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href={firstUnit ? `/units/${firstUnit.lesson_number}` : "/units"}
                className="inline-flex items-center rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-400"
              >
                Continue the path
              </Link>
              <Link
                href="/progress"
                className="inline-flex items-center rounded-lg border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                View progress
              </Link>
            </Show>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { value: audit.totalUnits, label: "curated units", sub: `${audit.stages} learning stages` },
          { value: vocabCount.toLocaleString(), label: "core lesson cards", sub: `${primerEntryCount.toLocaleString()} primer entries` },
          { value: dialogueCount.toLocaleString(), label: "dialogue lines", sub: "in lesson flow" },
          { value: constructions.toLocaleString(), label: "grammar patterns", sub: "A1 to B1 support" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="text-2xl font-black text-stone-950">{stat.value}</div>
            <div className="mt-1 text-sm font-semibold text-stone-700">{stat.label}</div>
            <div className="mt-1 text-xs text-stone-500">{stat.sub}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="mb-3 text-xs font-bold uppercase text-sky-700">
            Course Architecture
          </p>
          <h2 className="text-3xl font-black text-stone-950">
            Reordered around what learners can actually do.
          </h2>
          <p className="mt-4 leading-7 text-stone-600">
            The original source lessons are preserved, but the learner-facing path now starts with
            sound, greetings, identity, questions, numbers, and first present-tense verbs before
            moving into possession, family, food, past narration, market interaction, health,
            conditionals, and B1 discourse control.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {(["A1", "A2", "B1"] as const).map((band) => (
              <div key={band} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="text-xs font-bold text-stone-500">{band}</div>
                <div className="mt-1 text-2xl font-black text-stone-950">
                  {audit.byBand[band]}
                </div>
                <div className="text-xs text-stone-500">units</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="font-bold text-stone-900">First six milestones</h3>
            <Link href="/units" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
              Open units
            </Link>
          </div>
          <div className="space-y-3">
            {nextMilestones.map((unit) => (
              <Link
                key={unit.lesson_number}
                href={`/units/${unit.lesson_number}`}
                className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-lg border border-stone-100 bg-stone-50/70 p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/60"
              >
                <div>
                  <span className="rounded-md bg-stone-950 px-2 py-1 text-xs font-bold text-white">
                    {unit.path_code}
                  </span>
                </div>
                <div>
                  <p className="font-semibold leading-tight text-stone-950">{unit.theme_en}</p>
                  <p className="mt-1 text-sm leading-snug text-stone-600">{unit.cefr_descriptor}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Learner-ready lessons",
            body: "Each unit opens into chunked vocabulary learning, pronunciation, recall, sentence completion, and dialogue practice.",
          },
          {
            title: "Serious language support",
            body: "Grammar lessons explain person marking, possession, object prefixes, tense, conditionals, directionals, and B1 modifiers.",
          },
          {
            title: "Images and pronunciation",
            body: "Lesson and practice cards prefer the S3 word-image manifest, while audio is generated from a Nahuatl-specific machine model.",
          },
        ].map((feature) => (
          <div key={feature.title} className="rounded-lg border border-stone-200 bg-white p-6">
            <h3 className="font-bold text-stone-950">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{feature.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
