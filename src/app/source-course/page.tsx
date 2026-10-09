import type { Metadata } from "next";
import Link from "next/link";
import {
  NAHUATLAHTOLLI_COURSE,
  getNahuatlahtolliStats,
  type SourceSupportPage,
} from "@/lib/nahuatlahtolli";
import { displayNahuatl } from "@/lib/orthography";
import { getRequestLocale } from "@/i18n/server";
import type { AppLocale } from "@/i18n/config";
import { tr, trChoice, translateDeep } from "@/i18n/translate";
import CourseSourceCredits from "@/components/CourseSourceCredits";
import { COERLL_SOURCE_LICENSE_NOTICE, ITZLI_V3_CONTRIBUTION_LICENSE } from "@/lib/source-license-notices";
import { CommunityFeedbackInvitation, CommunitySupport, CourseDedicationNote } from "@/components/CoursePurpose";
import CourseSizeSummary from "@/components/CourseSizeSummary";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return createPageMetadata({
    locale,
    pathname: "/source-course",
    title: trChoice(locale, "Nahuatl Course Sources & Credits", "Fuentes y créditos del curso de náhuatl"),
    description: trChoice(locale,
      "Explore the sources behind Itzli's free Nahuatl course: regional vocabulary references, grammar evidence, original audio links, author credits, and licenses.",
      "Consulta las fuentes del curso gratis de náhuatl de Itzli: referencias regionales de vocabulario, gramática, enlaces al audio original, autores y licencias."),
  });
}

function SourceNotice({ source, locale }: { source: typeof NAHUATLAHTOLLI_COURSE.source; locale: AppLocale }) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
      <p className="font-semibold">{tr(locale, "Source and license")}</p>
      <p className="mt-2">
        {tr(locale, "This section adapts content from")}{" "}
        <a className="font-semibold underline" href={source.originalUrl} target="_blank" rel="noopener noreferrer">
          {displayNahuatl(source.name)}
        </a>
        , {tr(locale, "published by")} {source.publisher}, {tr(locale, "by")} {source.authors.join(", ")}.
        {" "}{trChoice(locale, "The publisher’s OER listing labels the source CC BY-SA without specifying a version. Itzli’s original V3 contributions and adaptations use", "El catálogo de recursos abiertos del editor indica CC BY-SA sin especificar versión. Las aportaciones originales y adaptaciones de Itzli para V3 usan")}{" "}
        <a className="font-semibold underline" href={ITZLI_V3_CONTRIBUTION_LICENSE.url} target="_blank" rel="noopener noreferrer">
          {ITZLI_V3_CONTRIBUTION_LICENSE.name}
        </a>
        .{" "}<a className="font-semibold underline" href={COERLL_SOURCE_LICENSE_NOTICE.listingUrl} target="_blank" rel="noopener noreferrer">{trChoice(locale, "Publisher’s source-license listing", "Catálogo de licencias de la fuente del editor")}</a>.
      </p>
      <p className="mt-2">
        {trChoice(locale, "Nāhuatlahtolli source media is retained as links to the original recordings and images. Its institutional logos are not imported as Itzli assets.", "Los medios de Nāhuatlahtolli se conservan como enlaces a las grabaciones e imágenes originales. Sus logotipos institucionales no se importan como recursos de Itzli.")}
      </p>
      <p className="mt-2">{trChoice(locale, "Itzli adapts vocabulary and practice to the INALI alphabet poster identified above. Original source transcriptions are labeled as references and retain their spellings.", "Itzli adapta el vocabulario y la práctica al cartel del alfabeto de INALI identificado arriba. Las transcripciones originales de la fuente se identifican como referencias y conservan su escritura.")}</p>
    </section>
  );
}

function SupportPagePreview({ page, locale }: { page: SourceSupportPage; locale: AppLocale }) {
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
          {tr(locale, "Open original page")} →
        </a>
      </div>
    </details>
  );
}

export default async function SourceCoursePage() {
  const locale = await getRequestLocale();
  const stats = getNahuatlahtolliStats();
  const course = translateDeep(locale, NAHUATLAHTOLLI_COURSE);
  const source = course.source;

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-black text-stone-950">{trChoice(locale, "Sources and credits", "Fuentes y créditos")}</h1>
      <CourseSourceCredits locale={locale} />
      <CourseSizeSummary locale={locale} />
      <CommunitySupport locale={locale} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-emerald-700">
            {tr(locale, "CC BY-SA Source Course")}
          </p>
          <h2 className="text-3xl font-black text-stone-950">{displayNahuatl(source.name)}</h2>
          <p className="mt-2 max-w-3xl text-stone-600">
            {source.subtitle}. {tr(locale, "This browser keeps the imported source lessons visible alongside Itzli's curated practice path.")}
          </p>
        </div>
        <a
          href={source.oerListingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-800"
        >
          {tr(locale, "COERLL listing")}
        </a>
      </div>

      <SourceNotice source={source} locale={locale} />

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { value: stats.lessons, label: "source lessons" },
          { value: stats.vocabulary, label: "audio-backed source entries" },
          { value: stats.sections, label: "lesson sections" },
          { value: stats.mediaLinks, label: "source media links" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="text-2xl font-black text-stone-950">{stat.value.toLocaleString()}</div>
            <div className="mt-1 text-sm font-semibold text-stone-700">{tr(locale, stat.label)}</div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-stone-950">{tr(locale, "Lessons")}</h2>
          <Link href="/units" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
            {tr(locale, "Open Itzli units")}
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          {course.lessons.map((lesson) => (
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
                {lesson.vocabulary.length} {tr(locale, "words")} · {lesson.sections.length} {tr(locale, "sections")}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-black text-stone-950">{tr(locale, "Course Context")}</h2>
        <p className="mb-3 text-sm text-stone-500">{locale === "es" ? "Referencias originales de la fuente: conservan su escritura original." : "Original source references: these retain the source's own spelling."}</p>
        <div className="grid gap-3 lg:grid-cols-2">
          {course.supportPages.map((page) => (
            <SupportPagePreview key={page.kind} page={page} locale={locale} />
          ))}
        </div>
      </section>
      <CommunityFeedbackInvitation locale={locale} />
      <CourseDedicationNote locale={locale} />
    </div>
  );
}
