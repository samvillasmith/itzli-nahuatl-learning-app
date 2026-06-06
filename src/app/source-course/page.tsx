import type { Metadata } from "next";
import Link from "next/link";
import {
  NAHUATLAHTOLLI_COURSE,
  getNahuatlahtolliStats,
  type SourceSupportPage,
} from "@/lib/nahuatlahtolli";
import { displayNahuatl } from "@/lib/orthography";

export const metadata: Metadata = {
  title: "Nawatlahtolli Source Course",
  description:
    "Imported CC BY-SA Nawatlahtolli source lessons, support pages, vocabulary, and provenance metadata.",
};

function SourceNotice() {
  const source = NAHUATLAHTOLLI_COURSE.source;

  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
      <p className="font-semibold">Source and license</p>
      <p className="mt-2">
        This section adapts content from{" "}
        <a className="font-semibold underline" href={source.originalUrl} target="_blank" rel="noopener noreferrer">
          {displayNahuatl(source.name)}
        </a>
        , published by {source.publisher}, by {source.authors.join(", ")}. Imported
        lesson content is available under{" "}
        <a className="font-semibold underline" href={source.license.url} target="_blank" rel="noopener noreferrer">
          {source.license.shortName}
        </a>
        .
      </p>
      <p className="mt-2">
        Itzli keeps media as source links rather than rehosting course audio,
        images, or institutional marks.
      </p>
    </section>
  );
}

function SupportPagePreview({ page }: { page: SourceSupportPage }) {
  const lines = page.sections.flatMap((section) => [section.heading, ...section.body]).slice(0, 8);

  return (
    <details className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-bold text-stone-900">
        {page.title}
      </summary>
      <div className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
        {lines.map((line, idx) => (
          <p key={`${page.kind}-${idx}`}>{line}</p>
        ))}
        <a
          href={page.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          Open original page →
        </a>
      </div>
    </details>
  );
}

export default function SourceCoursePage() {
  const stats = getNahuatlahtolliStats();
  const source = NAHUATLAHTOLLI_COURSE.source;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-emerald-700">
            CC BY-SA Source Course
          </p>
          <h1 className="text-3xl font-black text-stone-950">{displayNahuatl(source.name)}</h1>
          <p className="mt-2 max-w-3xl text-stone-600">
            {source.subtitle}. This browser keeps the imported source lessons
            visible alongside Itzli&apos;s curated practice path.
          </p>
        </div>
        <a
          href={source.oerListingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-800"
        >
          COERLL listing
        </a>
      </div>

      <SourceNotice />

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { value: stats.lessons, label: "source lessons" },
          { value: stats.vocabulary, label: "audio-backed words" },
          { value: stats.sections, label: "lesson sections" },
          { value: stats.mediaLinks, label: "source media links" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="text-2xl font-black text-stone-950">{stat.value.toLocaleString()}</div>
            <div className="mt-1 text-sm font-semibold text-stone-700">{stat.label}</div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-stone-950">Lessons</h2>
          <Link href="/units" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
            Open Itzli units
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          {NAHUATLAHTOLLI_COURSE.lessons.map((lesson) => (
            <Link
              key={lesson.number}
              href={`/source-course/${lesson.number}`}
              className="grid gap-3 border-b border-stone-100 px-5 py-4 transition-colors last:border-b-0 hover:bg-stone-50 sm:grid-cols-[4rem_1fr_auto]"
            >
              <span className="w-fit rounded-md bg-stone-950 px-2 py-1 text-xs font-bold text-white">
                {lesson.number}
              </span>
              <div>
                <p className="font-semibold leading-tight text-stone-950">{displayNahuatl(lesson.nahuatlTitle)}</p>
                {lesson.englishTitle && (
                  <p className="mt-1 text-sm text-stone-600">{lesson.englishTitle}</p>
                )}
              </div>
              <p className="text-xs text-stone-400 sm:text-right">
                {lesson.vocabulary.length} words · {lesson.sections.length} sections
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black text-stone-950">Course Context</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {NAHUATLAHTOLLI_COURSE.supportPages.map((page) => (
            <SupportPagePreview key={page.kind} page={page} />
          ))}
        </div>
      </section>
    </div>
  );
}
