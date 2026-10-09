import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  NAHUATLAHTOLLI_COURSE,
  getNahuatlahtolliLesson,
  type SourceMediaLink,
} from "@/lib/nahuatlahtolli";
import { displayNahuatl } from "@/lib/orthography";
import { requireAuth } from "@/lib/require-auth";
import { getRequestLocale } from "@/i18n/server";
import { localizedPathname, type AppLocale } from "@/i18n/config";
import { tr, trChoice, translateDeep } from "@/i18n/translate";
import ReportIssueButton from "@/components/ReportIssueButton";
import InaliOrthographyNotice from "@/components/InaliOrthographyNotice";
import { COERLL_SOURCE_LICENSE_NOTICE, ITZLI_V3_CONTRIBUTION_LICENSE } from "@/lib/source-license-notices";
import AudioButton from "@/components/PronunciationAudio";
import { sourceBrowserLineAudio } from "@/lib/course-audio-surfaces";
import { createPageMetadata } from "@/lib/seo";

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
  const locale = await getRequestLocale();

  return createPageMetadata({
    locale,
    pathname: `/source-course/${lesson.number}`,
    title: `${displayNahuatl(lesson.nahuatlTitle)} — ${trChoice(locale, "Nahuatl Source Lesson", "Lección fuente de náhuatl")}`,
    description: locale === "es"
      ? `Consulta la lección ${lesson.number} de Nāhuatlahtolli, adaptada bajo CC BY-SA, con transcripciones de referencia, enlaces al audio original y créditos.`
      : `Explore Nāhuatlahtolli source lesson ${lesson.number}, adapted under CC BY-SA, with reference transcriptions, original audio links, and author credits.`,
  });
}

function mediaLabel(link: SourceMediaLink, locale: AppLocale) {
  const filename = decodeURIComponent(link.url.split("/").pop() ?? link.url);
  return `${tr(locale, link.type)}: ${filename}`;
}

function renderLine(line: string, key: string, locale: AppLocale, referenceId: string) {
  const audio = line.match(/^Audio:\s*(https?:\/\/\S+)/);
  const image = line.match(/^(?:Image|Imagen):\s*(https?:\/\/\S+)/);
  const url = line.match(/^(https?:\/\/\S+)$/);

  if (audio || image || url) {
    const href = audio?.[1] ?? image?.[1] ?? url?.[1] ?? "";
    const label = audio ? tr(locale, "Source audio") : image ? tr(locale, "Source image") : href;
    return (
      <p key={key}>
        <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">
          {label}
        </a>
      </p>
    );
  }

  const recording = sourceBrowserLineAudio(line, referenceId);
  if (/^[A-Z][A-Za-z]+:/.test(line) || /^[ABCD]:/.test(line)) {
    const [speaker, ...rest] = line.split(":");
    return (
      <div key={key} className="flex items-start gap-3">
        <p className="font-mono text-sm text-stone-800">{speaker}: {rest.join(":").trim()}</p>
        {recording && <AudioButton src={recording.url} text={recording.text} referenceId={recording.referenceId} size="sm" />}
      </div>
    );
  }

  return <div key={key} className="flex items-start gap-3"><p>{line}</p>
    {recording && <AudioButton src={recording.url} text={recording.text} referenceId={recording.referenceId} size="sm" />}
  </div>;
}

export default async function SourceLessonPage({ params }: Params) {
  await requireAuth();
  const locale = await getRequestLocale();
  const { lessonNumber } = await params;
  const number = Number(lessonNumber);
  const sourceLesson = getNahuatlahtolliLesson(number);
  if (!sourceLesson) notFound();
  const lesson = translateDeep(locale, sourceLesson);

  const prev = translateDeep(locale, getNahuatlahtolliLesson(number - 1));
  const next = translateDeep(locale, getNahuatlahtolliLesson(number + 1));
  const source = translateDeep(locale, NAHUATLAHTOLLI_COURSE.source);
  const mediaPreview = lesson.mediaLinks.slice(0, 24);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/source-course" className="text-sm text-stone-400 hover:text-stone-600">
          ← {tr(locale, "Source course")}
        </Link>
        <Link href={`/units/${lesson.number}`} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
          {tr(locale, "Open Itzli unit")} →
        </Link>
      </div>

      <header className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <p className="mb-2 text-xs font-bold uppercase text-emerald-700">
          Nawatlahtolli {tr(locale, "Lesson")} {lesson.number}
        </p>
        <h1 className="text-3xl font-black leading-tight text-stone-950">
          {displayNahuatl(lesson.nahuatlTitle)}
        </h1>
        {lesson.englishTitle && (
          <p className="mt-2 text-lg text-stone-600">{lesson.englishTitle}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
          <span className="rounded-full bg-stone-100 px-3 py-1">{lesson.sections.length} {tr(locale, "sections")}</span>
          <span className="rounded-full bg-stone-100 px-3 py-1">{lesson.vocabulary.length} {tr(locale, "audio-backed source entries")}</span>
          <span className="rounded-full bg-stone-100 px-3 py-1">{lesson.mediaLinks.length} {tr(locale, "source media links")}</span>
        </div>
        <p className="mt-5 text-sm leading-6 text-stone-500">
          {tr(locale, "Adapted from")}{" "}
          <a className="font-semibold text-emerald-700 underline" href={lesson.originalUrl} target="_blank" rel="noopener noreferrer">
            {tr(locale, "the original lesson")}
          </a>{" "}
          {tr(locale, "under")}{" "}
          <a className="font-semibold text-emerald-700 underline" href={COERLL_SOURCE_LICENSE_NOTICE.listingUrl} target="_blank" rel="noopener noreferrer">
            {COERLL_SOURCE_LICENSE_NOTICE.shortName}
          </a>
          {" "}{trChoice(locale, "(publisher listing; version unspecified).", "(catálogo del editor; versión no especificada).")}{" "}
          {source.authors.join(", ")}, {source.publisher}.{" "}{tr(locale, "Changes include extraction, formatting, and integration into Itzli.")}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-600">{trChoice(locale, "Itzli’s original V3 contributions and adaptation work use", "Las aportaciones originales de Itzli para V3 y su trabajo de adaptación usan")}{" "}<a href={ITZLI_V3_CONTRIBUTION_LICENSE.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">{ITZLI_V3_CONTRIBUTION_LICENSE.name}</a>.{" "}{trChoice(locale, "Original source and media notices remain applicable.", "Siguen vigentes los avisos originales de las fuentes y sus medios.")}</p>
        <div className="mt-4"><InaliOrthographyNotice locale={locale} /></div>
      </header>

      <div className="flex justify-end"><ReportIssueButton context={{ pagePath: localizedPathname(`/source-course/${number}`, locale),
        lessonNumber: number, lessonId: `source-lesson-${number}`, lessonTitle: displayNahuatl(lesson.nahuatlTitle), sourceUrl: lesson.originalUrl }} /></div>

      {lesson.vocabulary.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-black text-stone-950">{tr(locale, "Source Vocabulary")}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lesson.vocabulary.map((item, vocabularyIdx) => (
              <div key={`${item.headword}-${item.gloss}`} className="rounded-lg border border-stone-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-stone-950">{displayNahuatl(item.headword)}</p>
                  <AudioButton src={item.audioUrl} text={displayNahuatl(item.headword)} referenceId={`source-vocabulary:${number}:${item.sourceVocabularyIndex ?? vocabularyIdx + 1}`} size="sm" />
                  {item.audioUrl && (
                    <a
                      href={item.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      {tr(locale, "Audio")}
                    </a>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-600">{item.gloss}</p>
                <ReportIssueButton category="word" label={locale === "es" ? "Reportar esta palabra" : "Report this word"}
                  context={{ pagePath: localizedPathname(`/source-course/${number}`, locale), lessonNumber: number,
                    lessonId: `source-lesson-${number}`, lessonTitle: displayNahuatl(lesson.nahuatlTitle),
                    itemId: `source-word-${number}-${item.headword}`, form: displayNahuatl(item.headword), meaning: item.gloss, sourceUrl: lesson.originalUrl }} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-black text-stone-950">{locale === "es" ? "Referencia: transcripción original de la fuente" : "Reference: original source transcription"}</h2>
        <p className="mb-3 text-sm text-stone-500">{locale === "es" ? "Estos extractos conservan la escritura del autor original. Para practicar, abre la unidad de Itzli, que usa la ortografía de INALI." : "These excerpts retain the original author's spelling. To practice, open the Itzli unit, which uses INALI orthography."}</p>
        <div className="space-y-3">
          {lesson.sections.map((section, sectionIdx) => (
            <details
              key={`${section.heading}-${sectionIdx}`}
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm"
            >
              <summary className="cursor-pointer text-base font-bold text-stone-950">
                {locale === "es" ? "Extracto original" : "Original excerpt"} {sectionIdx + 1}
              </summary>
              <div className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
                <p className="font-semibold">{section.heading}</p>
                {section.body.map((line, lineIdx) =>
                  renderLine(line, `${sectionIdx}-${lineIdx}`, locale, `source-body:${number}:${section.sourceSectionIndex ?? sectionIdx}:${section.sourceBodyIndices?.[lineIdx] ?? lineIdx}`)
                )}
              </div>
            </details>
          ))}
        </div>
      </section>

      {mediaPreview.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-black text-stone-950">{tr(locale, "Source Media Links")}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {mediaPreview.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-emerald-200 hover:text-emerald-800"
              >
                {mediaLabel(link, locale)}
              </a>
            ))}
          </div>
          {lesson.mediaLinks.length > mediaPreview.length && (
            <p className="mt-2 text-xs text-stone-500">
              {locale === "es"
                ? `Se muestran ${mediaPreview.length} de ${lesson.mediaLinks.length} enlaces; la lista completa está en los datos JSON importados.`
                : `Showing ${mediaPreview.length} of ${lesson.mediaLinks.length} links; the full list is in the imported JSON data.`}
            </p>
          )}
        </section>
      )}

      <nav className="flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-between">
        {prev ? (
          <Link href={`/source-course/${prev.number}`} className="text-sm font-semibold text-stone-600 hover:text-emerald-800">
            ← {displayNahuatl(prev.nahuatlTitle)}
          </Link>
        ) : <span />}
        {next && (
          <Link href={`/source-course/${next.number}`} className="text-sm font-semibold text-stone-600 hover:text-emerald-800 sm:text-right">
            {displayNahuatl(next.nahuatlTitle)} →
          </Link>
        )}
      </nav>
    </div>
  );
}
