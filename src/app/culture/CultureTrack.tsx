import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import CultureModuleIcon from "./CultureModuleIcon";
import { CULTURE_MODULES, CULTURE_TIMELINE } from "@/data/culture-lessons";
import { getRequestLocale } from "@/i18n/server";
import { tr, translateDeep } from "@/i18n/translate";

export default async function CultureTrack() {
  const locale = await getRequestLocale();
  const modules = translateDeep(locale, CULTURE_MODULES);
  const timeline = translateDeep(locale, CULTURE_TIMELINE);

  return (
    <div className="space-y-12">
      <header className="grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
        <div>
          <p className="eyebrow">{tr(locale, "Culture & History")} · {tr(locale, "Companion Track")}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.05] text-stone-950 sm:text-5xl">
            {tr(locale, "History with the boundaries intact.")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            {tr(locale, "Understand the Mexica, the wider Nahua world, and living Huasteca Nahua communities without treating them as interchangeable. This track adds historical depth while the language course remains firmly centered on Eastern Huasteca Nahuatl.")}
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-stone-600">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={17} className="text-emerald-700" /> {tr(locale, "Sourced and clearly scoped")}
            </span>
            <span>{modules.length} {tr(locale, "focused modules")}</span>
            <span>{tr(locale, "About 45 minutes total")}</span>
          </div>
        </div>

        <figure className="grid aspect-[4/3] grid-cols-[1.05fr_.95fr] gap-2 overflow-hidden rounded-lg bg-stone-200 p-2 shadow-[0_18px_45px_rgba(39,36,31,0.12)]">
          <div className="relative overflow-hidden rounded-md bg-stone-800">
            <Image
              src="/culture/mexica-coiled-serpent.jpg"
              alt={tr(locale, "Mexica stone sculpture of a coiled serpent.")}
              fill
              priority
              sizes="(max-width: 1024px) 48vw, 200px"
              className="object-cover"
            />
          </div>
          <div className="grid min-h-0 grid-rows-[1fr_auto] gap-2">
            <div className="relative overflow-hidden rounded-md bg-stone-700">
              <Image
                src="/culture/nahua-sun-warrior-altar.jpg"
                alt={tr(locale, "Nahua stone altar carved with solar and bird imagery.")}
                fill
                priority
                sizes="(max-width: 1024px) 42vw, 180px"
                className="object-cover"
              />
            </div>
            <figcaption className="rounded-md bg-stone-950 p-3 text-[11px] leading-4 text-stone-200">
              {tr(locale, "Public-domain Mexica and Nahua works from The Metropolitan Museum of Art.")}
            </figcaption>
          </div>
        </figure>
      </header>

      <section aria-labelledby="three-lenses-title">
        <div className="mb-5 max-w-2xl">
          <p className="eyebrow">{tr(locale, "Three lenses")}</p>
          <h2 id="three-lenses-title" className="mt-3 text-2xl font-black text-stone-950">
            {tr(locale, "Related histories, never collapsed into one.")}
          </h2>
        </div>
        <div className="grid border-y border-stone-200 sm:grid-cols-3">
          {[
            ["Mexica", tr(locale, "A specific Nahua people and imperial center associated with Tenochtitlan and Tlatelolco.")],
            ["Nahua", tr(locale, "A wider field of peoples, communities, histories, and related language varieties.")],
            ["Huasteca Nahua", tr(locale, "Living regional communities, including the Eastern Huasteca focus of this course.")],
          ].map(([title, body], index) => (
            <div
              key={title}
              className={`py-5 sm:px-5 ${index > 0 ? "border-t border-stone-200 sm:border-l sm:border-t-0" : ""}`}
            >
              <p className="text-sm font-black text-stone-950">{title}</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="modules-title">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{tr(locale, "The track")}</p>
            <h2 id="modules-title" className="mt-3 text-3xl font-black text-stone-950">
              {tr(locale, "Five connected modules")}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-stone-500">
            {tr(locale, "Read in order or open the question that matters most to you. Every module ends with its institutional and academic sources.")}
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {modules.map((module, index) => (
            <Link
              key={module.slug}
              href={`/culture/${module.slug}`}
              className={`group rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 ${index === modules.length - 1 ? "lg:col-span-2" : ""}`}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-stone-950 text-white transition-colors group-hover:bg-emerald-700">
                  <CultureModuleIcon icon={module.icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[11px] font-black uppercase text-emerald-700">
                      {tr(locale, "Module")} {String(module.number).padStart(2, "0")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                      <Clock3 size={13} /> {module.duration}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-black text-stone-950 group-hover:text-emerald-800">
                    {module.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                    {module.summary}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                    {tr(locale, "Read module")} <ArrowRight size={15} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="timeline-title" className="border-t border-stone-200 pt-10">
        <div className="mb-6">
          <p className="eyebrow">{tr(locale, "Orientation")}</p>
          <h2 id="timeline-title" className="mt-3 text-2xl font-black text-stone-950">
            {tr(locale, "A short timeline, not a story of disappearance")}
          </h2>
        </div>
        <ol className="grid gap-0 overflow-hidden rounded-lg border border-stone-200 bg-white md:grid-cols-5">
          {timeline.map((event, index) => (
            <li
              key={event.date}
              className={`relative p-4 ${index > 0 ? "border-t border-stone-200 md:border-l md:border-t-0" : ""}`}
            >
              <p className="text-xs font-black text-emerald-700">{event.date}</p>
              <h3 className="mt-2 text-sm font-black text-stone-950">{event.title}</h3>
              <p className="mt-2 text-xs leading-5 text-stone-500">{event.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          {tr(locale, "Dates are orientation points. Nahua histories begin before this timeline and continue through the present.")}
        </p>
      </section>
    </div>
  );
}
