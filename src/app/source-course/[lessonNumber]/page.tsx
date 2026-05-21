import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  NAHUATLAHTOLLI_COURSE,
  getNahuatlahtolliLesson,
  type SourceMediaLink,
} from "@/lib/nahuatlahtolli";

type Params = {
  params: Promise<{ lessonNumber: string }>;
};

export function generateStaticParams() {
  return NAHUATLAHTOLLI_COURSE.lessons.map((lesson) => ({
    lessonNumber: String(lesson.number),
  }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lessonNumber } = await params;
  const lesson = getNahuatlahtolliLesson(Number(lessonNumber));
  if (!lesson) return {};

  return {
    title: `${lesson.nahuatlTitle} Source Lesson`,
    description: `Imported CC BY-SA source material for Nāhuatlahtolli lesson ${lesson.number}.`,
  };
}

function mediaLabel(link: SourceMediaLink) {
  const filename = decodeURIComponent(link.url.split("/").pop() ?? link.url);
  return `${link.type}: ${filename}`;
}

function renderLine(line: string, key: string) {
  const audio = line.match(/^Audio:\s*(https?:\/\/\S+)/);
  const image = line.match(/^Image:\s*(https?:\/\/\S+)/);
  const url = line.match(/^(https?:\/\/\S+)$/);

  if (audio || image || url) {
    const href = audio?.[1] ?? image?.[1] ?? url?.[1] ?? "";
    const label = audio ? "Source audio" : image ? "Source image" : href;
    return (
      <p key={key}>
        <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">
          {label}
        </a>
      </p>
    );
  }

  if (/^[A-Z][A-Za-z]+:/.test(line) || /^[ABCD]:/.test(line)) {
    return (
      <p key={key} className="font-mono text-sm text-stone-800">
        {line}
      </p>
    );
  }

  return <p key={key}>{line}</p>;
}

export default async function SourceLessonPage({ params }: Params) {
  const { lessonNumber } = await params;
  const number = Number(lessonNumber);
  const lesson = getNahuatlahtolliLesson(number);
  if (!lesson) notFound();

  const prev = getNahuatlahtolliLesson(number - 1);
  const next = getNahuatlahtolliLesson(number + 1);
  const source = NAHUATLAHTOLLI_COURSE.source;
  const mediaPreview = lesson.mediaLinks.slice(0, 24);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/source-course" className="text-sm text-stone-400 hover:text-stone-600">
          ← Source course
        </Link>
        <Link href={`/units/${lesson.number}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
          Open Itzli unit →
        </Link>
      </div>

      <header className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase text-emerald-700">
          Nāhuatlahtolli Lesson {lesson.number}
        </p>
        <h1 className="text-3xl font-black leading-tight text-stone-950">
          {lesson.nahuatlTitle}
        </h1>
        {lesson.englishTitle && (
          <p className="mt-2 text-lg text-stone-600">{lesson.englishTitle}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
          <span className="rounded-full bg-stone-100 px-3 py-1">{lesson.sections.length} sections</span>
          <span className="rounded-full bg-stone-100 px-3 py-1">{lesson.vocabulary.length} audio-backed words</span>
          <span className="rounded-full bg-stone-100 px-3 py-1">{lesson.mediaLinks.length} source media links</span>
        </div>
        <p className="mt-5 text-sm leading-6 text-stone-500">
          Adapted from{" "}
          <a className="font-semibold text-emerald-700 underline" href={lesson.originalUrl} target="_blank" rel="noopener noreferrer">
            the original lesson
          </a>{" "}
          under{" "}
          <a className="font-semibold text-emerald-700 underline" href={source.license.url} target="_blank" rel="noopener noreferrer">
            {source.license.shortName}
          </a>
          . Changes include extraction, formatting, and integration into Itzli.
        </p>
      </header>

      {lesson.vocabulary.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-black text-stone-950">Source Vocabulary</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lesson.vocabulary.map((item) => (
              <div key={`${item.headword}-${item.gloss}`} className="rounded-lg border border-stone-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-stone-950">{item.headword}</p>
                  {item.audioUrl && (
                    <a
                      href={item.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      Audio
                    </a>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-600">{item.gloss}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-black text-stone-950">Lesson Text</h2>
        <div className="space-y-3">
          {lesson.sections.map((section, sectionIdx) => (
            <details
              key={`${section.heading}-${sectionIdx}`}
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
              open={sectionIdx < 2}
            >
              <summary className="cursor-pointer text-base font-bold text-stone-950">
                {section.heading}
              </summary>
              <div className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
                {section.body.map((line, lineIdx) =>
                  renderLine(line, `${sectionIdx}-${lineIdx}`)
                )}
              </div>
            </details>
          ))}
        </div>
      </section>

      {mediaPreview.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-black text-stone-950">Source Media Links</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {mediaPreview.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-emerald-200 hover:text-emerald-800"
              >
                {mediaLabel(link)}
              </a>
            ))}
          </div>
          {lesson.mediaLinks.length > mediaPreview.length && (
            <p className="mt-2 text-xs text-stone-500">
              Showing {mediaPreview.length} of {lesson.mediaLinks.length} links; the full list is in the imported JSON data.
            </p>
          )}
        </section>
      )}

      <nav className="flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-between">
        {prev ? (
          <Link href={`/source-course/${prev.number}`} className="text-sm font-semibold text-stone-600 hover:text-emerald-800">
            ← {prev.nahuatlTitle}
          </Link>
        ) : <span />}
        {next && (
          <Link href={`/source-course/${next.number}`} className="text-sm font-semibold text-stone-600 hover:text-emerald-800 sm:text-right">
            {next.nahuatlTitle} →
          </Link>
        )}
      </nav>
    </div>
  );
}
