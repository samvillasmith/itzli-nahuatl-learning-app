import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getAllPrimerVocab } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { getRequestLocale } from "@/i18n/server";
import { localizedPathname } from "@/i18n/config";
import { countVocabularyWrittenForms, getUnifiedVocabulary, searchUnifiedVocabulary } from "@/lib/unified-vocabulary";
import { trChoice } from "@/i18n/translate";
import ReportIssueButton from "@/components/ReportIssueButton";
import AudioButton from "@/components/PronunciationAudio";

const PAGE_SIZE = 48;
export default async function VocabularyPage({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAuth();
  const locale = await getRequestLocale(); const es = locale === "es";
  const params = await searchParams; const query = params.q?.trim() ?? "";
  const words = getUnifiedVocabulary(getAllPrimerVocab());
  const writtenForms = countVocabularyWrittenForms(words);
  const matches = searchUnifiedVocabulary(words, query);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requestedPage = Number(params.page ?? 1);
  const page = Number.isInteger(requestedPage) ? Math.max(1, Math.min(pages, requestedPage)) : 1;
  const visible = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  function pageHref(number: number) {
    const search = new URLSearchParams({ page: String(number) }); if (query) search.set("q", query);
    return `${localizedPathname("/vocabulary", locale)}?${search}`;
  }
  return <div className="space-y-8">
    <header>
      <p className="eyebrow">{es ? "Palabras de tu curso" : "Words from your course"}</p>
      <h1 className="display-title mt-4 text-5xl text-stone-950">{es ? "Vocabulario" : "Vocabulary"}</h1>
      <p className="mt-4 max-w-2xl leading-7 text-stone-600">{trChoice(locale,
        "Find a word you learned, check its meaning, or return to its lesson. Search Nahuatl, English or Spanish, including documented reference spellings.",
        "Encuentra una palabra aprendida, comprueba su significado o vuelve a su lección. Busca en náhuatl, inglés o español, incluidas las grafías de referencia documentadas.")}</p>
      <form method="GET" action={localizedPathname("/vocabulary", locale)} className="mt-6 flex max-w-xl gap-3">
        <label className="sr-only" htmlFor="vocab-search">{es ? "Buscar palabras" : "Search words"}</label>
        <input id="vocab-search" type="search" name="q" defaultValue={query} placeholder={es ? "Palabra o significado…" : "Word or meaning…"} className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3" />
        <button type="submit" className="button-primary">{es ? "Buscar" : "Search"}</button>
      </form>
    </header>
    <p className="text-sm font-semibold text-stone-500">{query
      ? trChoice(locale, `${matches.length.toLocaleString("en-US")} ${matches.length === 1 ? "result" : "results"} for “${query}”`, `${matches.length.toLocaleString("es-MX")} ${matches.length === 1 ? "resultado" : "resultados"} para «${query}»`)
      : trChoice(locale, `${writtenForms.toLocaleString("en-US")} written forms · ${words.length.toLocaleString("en-US")} meaning entries`, `${writtenForms.toLocaleString("es-MX")} formas escritas · ${words.length.toLocaleString("es-MX")} entradas de significado`)}</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(word => <article key={word.id} className="surface p-5">
      <h2 lang="nhe" className="text-2xl font-black text-emerald-800">{word.display}</h2>
      <div className="mt-3"><AudioButton src={word.audioUrl ?? null} text={word.display} referenceId={word.audioReferenceId} /></div>
      <p className="mt-3 font-semibold text-stone-800">{es ? word.meaningEs : word.meaningEn}</p>
      {word.variety && <p className="mt-3 text-xs leading-5 text-stone-500">{word.variety}</p>}
      {word.referenceAliases.length > 0 && <p className="mt-2 text-xs text-stone-500">{es ? "Grafías de referencia:" : "Reference spellings:"} {word.referenceAliases.join(", ")}</p>}
      {(es ? word.usageNoteEs : word.usageNoteEn) && <p className="mt-3 text-xs leading-6 text-stone-500">{es ? word.usageNoteEs : word.usageNoteEn}</p>}
      {word.lessonNumber && <Link href={localizedPathname(`/units/${word.lessonNumber}`, locale)} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-700">{es ? "Volver a la lección" : "Go to the lesson"}<ArrowRight size={14} /></Link>}
      {word.sourceUrl && <details className="mt-3 text-xs leading-5 text-stone-500"><summary className="cursor-pointer">{es ? "Fuente" : "Source"}</summary><a href={word.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block underline">{word.sourceTitle}</a>{word.supplementalSources?.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mt-2 block underline">{source.title}</a>)}</details>}
      <div className="mt-3"><ReportIssueButton category="word" label={es ? "Reportar esta palabra" : "Report this word"}
        context={{ pagePath: localizedPathname("/vocabulary", locale), lessonNumber: word.lessonNumber ?? undefined,
          itemId: word.id, form: word.display, meaning: es ? word.meaningEs : word.meaningEn, sourceUrl: word.sourceUrl ?? undefined }} /></div>
    </article>)}</div>
    {!visible.length && <p className="surface p-8 text-center text-stone-500">{es ? "No se encontraron palabras con esa búsqueda." : "No words match that search."}</p>}
    {pages > 1 && <nav aria-label={es ? "Páginas de vocabulario" : "Vocabulary pages"} className="flex items-center justify-between gap-4">
      {page > 1 ? <Link href={pageHref(page - 1)} className="button-secondary"><ArrowLeft size={16} />{es ? "Anterior" : "Previous"}</Link> : <span />}
      <p className="text-sm text-stone-500">{page} / {pages}</p>
      {page < pages ? <Link href={pageHref(page + 1)} className="button-secondary">{es ? "Siguiente" : "Next"}<ArrowRight size={16} /></Link> : <span />}
    </nav>}
  </div>;
}
