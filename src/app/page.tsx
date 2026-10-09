import Link from "next/link";
import { AccountShow as Show } from "@/components/LearningAccount";
import { ArrowRight, BookOpenCheck, CirclePlay, Headphones, MessageCircleMore, Sparkles } from "lucide-react";
import { getAllUnits } from "@/lib/db";
import { getUnifiedCoursePath, getUnifiedVocabularyCount } from "@/lib/unified-course-path";
import { getWordImage } from "@/data/word-images";
import ContinuePathLink from "./ContinuePathLink";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice, translateDeep } from "@/i18n/translate";
import type { AppLocale } from "@/i18n/config";
import { displayNahuatl } from "@/lib/orthography";
import { CommunityFeedbackInvitation, CommunitySupport, WhyNahuatl } from "@/components/CoursePurpose";
import { GENERATED_AUDIO_ASSETS } from "@/lib/generated-audio";

const SHOWCASE_WORDS = [
  { word: "xochitl", gloss: "flower", pos: "noun" },
  { word: "atl", gloss: "water", pos: "noun" },
  { word: "cintli", gloss: "corn", pos: "noun" },
  { word: "papalotl", gloss: "butterfly", pos: "noun" },
];

function WordGallery({ locale }: { locale: AppLocale }) {
  const items = SHOWCASE_WORDS.map((item) => ({ ...item, image: getWordImage(item.word, { allowLegacyFallback: true }) })).filter((item) => item.image);
  return (
    <div className="grid grid-cols-2 gap-3" aria-label={tr(locale, "A sample of lesson vocabulary")}>
      {items.map((item, index) => (
        <div key={item.word} className={`group relative overflow-hidden rounded-2xl bg-stone-200 ${index === 0 ? "col-span-2 aspect-[2.1/1]" : "aspect-square"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image!.url}
            alt={trChoice(
              locale,
              `Illustration for ${displayNahuatl(item.word)}: ${item.gloss}`,
              `Ilustración de ${displayNahuatl(item.word)}: ${tr(locale, item.gloss)}`,
            )}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/90 via-stone-950/48 to-transparent p-4 pt-10 text-white">
            <p className="text-lg font-black tracking-[-.02em]">{displayNahuatl(item.word)}</p>
            <p className="text-xs text-white/75">{tr(locale, item.gloss)}</p>
          </div>
        </div>
      ))}
      <div className="flex aspect-square flex-col justify-between rounded-2xl bg-amber-100 p-4 text-amber-900">
        <Headphones size={24} />
        <div><p className="font-black">{trChoice(locale, "Listen and learn", "Escucha y aprende")}</p><p className="mt-1 text-xs leading-5 text-amber-800/75">{trChoice(locale, "Hear available recordings as you learn.", "Escucha las grabaciones disponibles mientras aprendes.")}</p></div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const locale = await getRequestLocale();
  const units = getUnifiedCoursePath(translateDeep(locale, getAllUnits()));
  const vocabCount = getUnifiedVocabularyCount();
  const dialogueCount = units.reduce((sum, unit) => sum + unit.dialogueCount, 0);
  const nextMilestones = units.slice(0, 4);

  return (
    <div className="space-y-24 pb-6 sm:space-y-32">
      <section className="relative grid items-center gap-12 overflow-hidden rounded-[1.75rem] border border-stone-200/75 bg-[#fffdf8] px-6 py-10 shadow-[0_30px_80px_rgba(40,49,41,.09)] sm:px-10 sm:py-14 lg:grid-cols-[1.08fr_.92fr] lg:px-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-emerald-100/55 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-emerald-800">
              <Sparkles size={13} /> {tr(locale, "Eastern Huasteca Nahuatl")}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-amber-900">{trChoice(locale, "Free to learn", "Aprende gratis")}</span>
          </div>
          <h1 className="display-title max-w-3xl text-[3.4rem] text-stone-950 sm:text-7xl lg:text-[5.15rem]">
            {tr(locale, "Learn")} <span className="text-emerald-700">{tr(locale, "Nahuatl.")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-bold leading-7 text-emerald-800 sm:text-xl sm:leading-8">
            {trChoice(locale,
              `${units.length.toLocaleString("en-US")} free guided Nahuatl lessons. ${vocabCount.toLocaleString("en-US")} words and forms.`,
              `${units.length.toLocaleString("es-MX")} lecciones guiadas gratuitas de náhuatl. ${vocabCount.toLocaleString("es-MX")} palabras y formas.`)}
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 sm:text-lg sm:leading-8">
            {trChoice(locale,
              "A free gift to Nahua peoples and Indigenous communities everywhere—a place to reconnect with Indigenous heritage and explore Mexica and Nahua culture. Everyone is welcome.",
              "Un regalo gratuito para los pueblos nahuas y las comunidades indígenas de todo el mundo: un espacio para reconectar con la herencia indígena y explorar las culturas mexica y nahua. Todas las personas son bienvenidas.")}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-stone-200/80 py-5 sm:grid-cols-3" aria-label={trChoice(locale, "What the course includes", "Qué incluye el curso")}>
            {[
              { value: units.length, en: "guided lessons", es: "lecciones guiadas" },
              { value: vocabCount, en: "words and forms", es: "palabras y formas" },
              { value: GENERATED_AUDIO_ASSETS.length, en: "practice audio clips", es: "audios de práctica" },
            ].map(stat => <div key={stat.en} className="flex flex-col gap-1">
              <dt className="text-xs font-semibold text-stone-600">{trChoice(locale, stat.en, stat.es)}</dt>
              <dd className="text-3xl font-black tabular-nums tracking-tight text-emerald-800">{stat.value.toLocaleString(locale === "es" ? "es-MX" : "en-US")}</dd>
            </div>)}
          </dl>
          <p className="mt-5 max-w-xl text-sm leading-6 text-stone-600">{trChoice(locale,
            "Build sentences and practice conversations with teaching grounded in documented sources, refreshed pronunciation audio, refined Nahuatl sound rules, and original speaker recordings.",
            "Construye oraciones y practica conversaciones con enseñanza basada en fuentes documentadas, audio de pronunciación renovado, reglas adaptadas al náhuatl y grabaciones originales de hablantes.")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Show when="signed-out">
              <Link href="/sign-up" className="button-primary !px-5 !py-3.5">{tr(locale, "Begin your path")} <ArrowRight size={17} /></Link>
              <Link href="/units" className="button-secondary !px-5 !py-3.5"><CirclePlay size={17} /> {tr(locale, "Explore the course")}</Link>
            </Show>
            <Show when="signed-in">
              <ContinuePathLink units={units} className="button-primary !px-5 !py-3.5">{tr(locale, "Continue learning")} <ArrowRight size={17} /></ContinuePathLink>
              <Link href="/units" className="button-secondary !px-5 !py-3.5"><CirclePlay size={17} /> {tr(locale, "Explore the course")}</Link>
            </Show>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-stone-500">
            <span>{tr(locale, "A1–A2 + B1-oriented extensions")}</span>
            <span aria-hidden="true" className="text-stone-300">•</span>
            <Link href="/source-course" className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900">{trChoice(locale, "See our sources", "Consulta nuestras fuentes")}</Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-lg lg:justify-self-end">
          <WordGallery locale={locale} />
        </div>
      </section>

      <WhyNahuatl locale={locale} />

      <section>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{tr(locale, "Designed for momentum")}</p>
          <h2 className="display-title mt-4 text-4xl text-stone-950 sm:text-5xl">{tr(locale, "Everything you need. Nothing in the way.")}</h2>
          <p className="mt-5 leading-7 text-stone-600">{tr(locale, "Each session moves naturally from recognition to recall, then into real language you can use.")}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: BookOpenCheck, tone: "bg-emerald-100 text-emerald-800", title: tr(locale, "A path that makes sense"), body: trChoice(locale, `${units.length} guided lessons build one skill at a time—from sound and identity to narration and nuanced conversation.`, `${units.length} lecciones guiadas desarrollan una habilidad a la vez: desde los sonidos y la identidad hasta la narración y una conversación más matizada.`) },
            { icon: Headphones, tone: "bg-amber-100 text-amber-800", title: trChoice(locale, "Improved pronunciation practice", "Práctica de pronunciación mejorada"), body: trChoice(locale, "Refreshed practice audio uses custom Nahuatl sound rules alongside original speaker recordings. Replay words and complete sentences as you learn.", "El audio de práctica renovado usa reglas de pronunciación adaptadas al náhuatl junto con grabaciones originales de hablantes. Vuelve a escuchar palabras y oraciones completas mientras aprendes.") },
            { icon: MessageCircleMore, tone: "bg-sky-100 text-sky-800", title: tr(locale, "Language in context"), body: trChoice(locale, `${dialogueCount.toLocaleString()} dialogue lines turn grammar and vocabulary into exchanges that feel useful and human.`, `${dialogueCount.toLocaleString("es-MX")} líneas de diálogo convierten la gramática y el vocabulario en intercambios útiles y naturales.`) },
          ].map(({ icon: Icon, tone, title, body }) => (
            <article key={title} className="surface p-6 sm:p-8">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={21} /></span>
              <h3 className="mt-8 text-xl font-black tracking-[-.025em] text-stone-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <p className="eyebrow">{tr(locale, "Your first steps")}</p>
          <h2 className="display-title mt-4 text-4xl text-stone-950 sm:text-5xl">{tr(locale, "From sounds to conversation.")}</h2>
          <p className="mt-5 max-w-md leading-7 text-stone-600">{tr(locale, "Start small. Every milestone adds language you can recognize, remember, and use.")}</p>
          <div className="mt-7 flex gap-6 border-t border-stone-200 pt-6">
            <div><p className="text-2xl font-black text-stone-950">{vocabCount.toLocaleString(locale === "es" ? "es-MX" : "en-US")}</p><p className="text-xs text-stone-500">{tr(locale, "words and forms taught")}</p></div>
            <div><p className="text-2xl font-black text-stone-950">{dialogueCount.toLocaleString(locale === "es" ? "es-MX" : "en-US")}</p><p className="text-xs text-stone-500">{tr(locale, "dialogue lines")}</p></div>
          </div>
        </div>
        <div className="space-y-3">
          {nextMilestones.map((unit, index) => (
            <Link key={unit.lessonNumber} href={`/units/${unit.lessonNumber}`} className="group grid grid-cols-[3rem_1fr_auto] items-center gap-4 rounded-2xl border border-stone-200/90 bg-white/80 p-4 shadow-[0_8px_25px_rgba(39,36,31,.035)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-lg sm:p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-950 text-sm font-black text-white">{String(index + 1).padStart(2, "0")}</span>
              <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-700">{unit.pathCode} · {unit.band}</p><h3 className="mt-1 font-black text-stone-950">{locale === "es" ? unit.titleEs : unit.titleEn}</h3><p className="mt-1 line-clamp-1 text-sm text-stone-500">{locale === "es" ? unit.goalEs : unit.goalEn}</p></div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-400 transition group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-700"><ArrowRight size={16} /></span>
            </Link>
          ))}
          <Link href="/units" className="mt-4 inline-flex items-center gap-2 px-2 text-sm font-bold text-emerald-700 hover:text-emerald-900">{tr(locale, "See the complete path")} <ArrowRight size={15} /></Link>
        </div>
      </section>

      <CommunitySupport locale={locale} />
      <CommunityFeedbackInvitation locale={locale} />

      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#14221e] px-6 py-12 text-white sm:px-12 sm:py-14">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_20%,rgba(41,169,138,.23),transparent_45%)]" />
        <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-300">{tr(locale, "A living language belongs in the future")}</p><h2 className="display-title mt-4 max-w-2xl text-4xl text-white sm:text-5xl">{tr(locale, "Make Eastern Huasteca Nahuatl part of your everyday life.")}</h2></div>
          <Show when="signed-out"><Link href="/sign-up" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-black text-stone-950 transition hover:-translate-y-0.5 hover:bg-emerald-50">{tr(locale, "Start learning free")} <ArrowRight size={17} /></Link></Show>
          <Show when="signed-in"><ContinuePathLink units={units} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-black text-stone-950 transition hover:-translate-y-0.5 hover:bg-emerald-50">{tr(locale, "Continue your path")} <ArrowRight size={17} /></ContinuePathLink></Show>
        </div>
      </section>
    </div>
  );
}
