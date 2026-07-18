import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  ExternalLink,
  LibraryBig,
} from "lucide-react";
import CultureModuleIcon from "./CultureModuleIcon";
import {
  CULTURE_MODULES,
  type CultureImage,
  type CultureModule,
} from "@/data/culture-lessons";
import { getRequestLocale } from "@/i18n/server";
import type { AppLocale } from "@/i18n/config";
import { tr, translateDeep } from "@/i18n/translate";

function CultureImagePanel({ image }: { image: CultureImage }) {
  return (
    <figure>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-700 shadow-[0_18px_45px_rgba(39,36,31,0.12)]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 420px"
          className="object-contain"
        />
      </div>
      <figcaption className="mt-3 text-xs leading-5 text-stone-500">
        <a
          href={image.objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-stone-700 underline decoration-stone-300 underline-offset-2 hover:text-emerald-700"
        >
          {image.title}
        </a>
        {" · "}{image.creator}{" · "}{image.date}{" · "}{image.institution}{" · "}{image.license}
      </figcaption>
    </figure>
  );
}

function ContextPanel({
  icon,
  number,
  locale,
}: {
  icon: CultureModule["icon"];
  number: number;
  locale: AppLocale;
}) {
  const labels =
    number === 3
      ? ["Pictorial writing", "Colonial archives", "Living varieties"]
      : number === 4
        ? ["Northern Veracruz", "Chicontepec", "Living communities"]
        : ["Maker", "Purpose", "Evidence"];

  return (
    <div className="flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-lg border border-stone-200 bg-[#f4ead2] p-6 shadow-[0_18px_45px_rgba(39,36,31,0.08)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-stone-950 text-white">
        <CultureModuleIcon icon={icon} size={27} />
      </div>
      <div className="space-y-2">
        {labels.map((label, index) => (
          <div
            key={label}
            className="flex items-center gap-3 border-b border-stone-300/80 pb-2 text-sm font-bold text-stone-800"
          >
            <span className="text-xs text-emerald-800">0{index + 1}</span>
            <span>{tr(locale, label)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function CultureModuleContent({
  cultureModule,
}: {
  cultureModule: CultureModule;
}) {
  const locale = await getRequestLocale();
  const index = CULTURE_MODULES.findIndex((item) => item.slug === cultureModule.slug);
  const previous = index > 0 ? translateDeep(locale, CULTURE_MODULES[index - 1]) : null;
  const next = index < CULTURE_MODULES.length - 1 ? translateDeep(locale, CULTURE_MODULES[index + 1]) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/culture"
        className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-emerald-700"
      >
        <ArrowLeft size={16} /> {tr(locale, "Culture & History")}
      </Link>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-stone-200" aria-label={`${tr(locale, "Module")} ${cultureModule.number} ${tr(locale, "of")} ${CULTURE_MODULES.length}`}>
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${(cultureModule.number / CULTURE_MODULES.length) * 100}%` }}
        />
      </div>

      <header className="mt-8 grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-stone-950 text-white">
              <CultureModuleIcon icon={cultureModule.icon} />
            </span>
            <p className="text-xs font-black uppercase text-emerald-700">
              {tr(locale, "Module")} {String(cultureModule.number).padStart(2, "0")} {tr(locale, "of")} {CULTURE_MODULES.length}
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-400">
              <Clock3 size={14} /> {cultureModule.duration}
            </span>
          </div>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] text-stone-950 sm:text-5xl">
            {cultureModule.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">{cultureModule.summary}</p>
        </div>

        {cultureModule.image ? (
          <CultureImagePanel image={cultureModule.image} />
        ) : (
          <ContextPanel icon={cultureModule.icon} number={cultureModule.number} locale={locale} />
        )}
      </header>

      <section className="my-8 grid gap-4 border-y border-amber-200 bg-amber-50 px-5 py-5 sm:grid-cols-[auto_1fr] sm:items-start">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-sm font-black text-white">
          !
        </span>
        <div>
          <p className="text-xs font-black uppercase text-amber-700">{tr(locale, "Keep this distinction")}</p>
          <p className="mt-2 leading-7 text-stone-800">{cultureModule.distinction}</p>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <article className="min-w-0">
          {cultureModule.sections.map((section, sectionIndex) => (
            <section
              key={section.title}
              className={`${sectionIndex > 0 ? "border-t border-stone-200 pt-9" : ""} pb-9`}
            >
              <p className="text-xs font-black text-emerald-700">
                {String(sectionIndex + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-2 text-2xl font-black text-stone-950">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-8 text-stone-700">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.points && (
                <ul className="mt-5 grid gap-2">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-6 text-stone-700">
                      <Check className="mt-1 shrink-0 text-emerald-700" size={16} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>

        <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <p className="text-xs font-black uppercase text-stone-500">{tr(locale, "After this module")}</p>
          <ul className="mt-4 space-y-4">
            {cultureModule.takeaways.map((takeaway) => (
              <li key={takeaway} className="flex gap-3 text-sm leading-6 text-stone-700">
                <Check className="mt-1 shrink-0 text-emerald-700" size={16} />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section aria-labelledby="sources-title" className="border-t border-stone-300 pt-9">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-950 text-white">
            <LibraryBig size={19} />
          </span>
          <div>
            <p className="eyebrow">{tr(locale, "Evidence")}</p>
            <h2 id="sources-title" className="mt-1 text-2xl font-black text-stone-950">
              {tr(locale, "Sources and further reading")}
            </h2>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
          {tr(locale, "The module text is an original synthesis. These institutional and academic sources provide the factual foundation and a path for deeper study.")}
        </p>
        <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
          {cultureModule.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid gap-2 py-4 sm:grid-cols-[1fr_1.35fr_auto] sm:items-center sm:gap-5"
            >
              <div>
                <p className="font-bold text-stone-950 group-hover:text-emerald-700">
                  {source.title}
                </p>
                <p className="mt-1 text-xs font-semibold text-stone-400">{source.institution}</p>
              </div>
              <p className="text-sm leading-6 text-stone-600">{source.note}</p>
              <ExternalLink size={16} className="text-stone-400 group-hover:text-emerald-700" />
            </a>
          ))}
        </div>
      </section>

      <nav aria-label={tr(locale, "Culture module navigation")} className="mt-10 grid gap-3 border-t border-stone-200 pt-6 sm:grid-cols-2">
        {previous ? (
          <Link
            href={`/culture/${previous.slug}`}
            className="rounded-lg border border-stone-200 bg-white p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-400">
              <ArrowLeft size={14} /> {tr(locale, "Previous")}
            </span>
            <p className="mt-2 font-black text-stone-950">{previous.shortTitle}</p>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/culture/${next.slug}`}
            className="rounded-lg border border-stone-200 bg-white p-4 text-right transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <span className="inline-flex items-center justify-end gap-1 text-xs font-bold text-stone-400">
              {tr(locale, "Next")} <ArrowRight size={14} />
            </span>
            <p className="mt-2 font-black text-stone-950">{next.shortTitle}</p>
          </Link>
        ) : (
          <Link href="/units" className="button-primary justify-self-end">
            {tr(locale, "Return to lessons")} <ArrowRight size={15} />
          </Link>
        )}
      </nav>
    </div>
  );
}
