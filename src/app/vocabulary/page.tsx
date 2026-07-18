import { getAllPrimerVocab, getAllUnits, searchVocab } from "@/lib/db";
import { displayNahuatl } from "@/lib/orthography";
import { requireAuth } from "@/lib/require-auth";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice, translateDeep } from "@/i18n/translate";
import type { AppLocale } from "@/i18n/config";

const POS_COLOR: Record<string, string> = {
  noun: "bg-amber-50 text-amber-700",
  verb: "bg-blue-50 text-blue-700",
  adjective: "bg-rose-50 text-rose-700",
  adverb: "bg-teal-50 text-teal-700",
  pronoun: "bg-purple-50 text-purple-700",
  particle: "bg-stone-100 text-stone-500",
};

function posColor(pos: string) {
  const key = pos?.toLowerCase().split(/[\s,_]/)[0] ?? "";
  return POS_COLOR[key] ?? "bg-stone-100 text-stone-500";
}

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAuth();
  const locale = await getRequestLocale();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (query.length > 0) {
    const results = locale === "es"
      ? getAllPrimerVocab()
          .map((entry) => ({
            entry_id: entry.id,
            ehn_spoken_form: entry.headword,
            msn_headword: entry.headword,
            part_of_speech: entry.part_of_speech,
            gloss_en: tr(locale, entry.gloss_en),
          }))
          .filter((entry) => {
            const needle = query.toLocaleLowerCase("es-MX");
            return entry.ehn_spoken_form.toLocaleLowerCase("es-MX").includes(needle)
              || entry.gloss_en.toLocaleLowerCase("es-MX").includes(needle);
          })
          .slice(0, 100)
      : searchVocab(query, 100);
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">{tr(locale, "Vocabulary")}</h1>
          <SearchForm defaultValue={query} locale={locale} />
        </div>

        <p className="text-sm text-stone-400 mb-4">
          {trChoice(locale, `${results.length} verified course result${results.length !== 1 ? "s" : ""} for “${query}”`, `${results.length} resultado${results.length !== 1 ? "s" : ""} verificado${results.length !== 1 ? "s" : ""} del curso para “${query}”`)}
        </p>

        {results.length === 0 ? (
          <p className="text-stone-500 py-8 text-center">{tr(locale, "No entries found.")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {results.map((e) => (
              <div
                key={e.entry_id}
                className="bg-white border border-stone-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-stone-900">
                    {displayNahuatl(e.ehn_spoken_form || e.msn_headword)}
                  </span>
                  {e.part_of_speech && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${posColor(
                        e.part_of_speech
                      )}`}
                    >
                      {tr(locale, e.part_of_speech)}
                    </span>
                  )}
                </div>
                <p className="text-stone-600 text-sm">{tr(locale, e.gloss_en)}</p>
                {e.msn_headword && e.msn_headword !== e.ehn_spoken_form && (
                  <p className="text-stone-400 text-xs mt-1 font-mono">
                    MSN: {displayNahuatl(e.msn_headword)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default: core primer vocabulary items in the curated unit order.
  const vocab = getAllPrimerVocab().map((item) => ({ ...item, gloss_en: tr(locale, item.gloss_en) }));
  const units = translateDeep(locale, getAllUnits());
  const unitsByLesson = new Map(units.map((unit) => [unit.lesson_number, unit]));

  // Group by lesson
  const byLesson = new Map<number, typeof vocab>();
  for (const v of vocab) {
    const arr = byLesson.get(v.first_lesson_number) ?? [];
    arr.push(v);
    byLesson.set(v.first_lesson_number, arr);
  }
  const lessons = units
    .map((unit) => unit.lesson_number)
    .filter((lesson) => byLesson.has(lesson));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">{tr(locale, "Vocabulary")}</h1>
        <p className="text-stone-500 mb-4">
          {trChoice(locale, `${vocab.length} reviewed course items · search within the current Eastern Huasteca curriculum.`, `${vocab.length} elementos revisados del curso · busca dentro del plan actual de náhuatl de la Huasteca veracruzana.`)}
        </p>
        <SearchForm defaultValue="" locale={locale} />
      </div>

      <div className="space-y-8">
        {lessons.map((lesson) => {
          const items = byLesson.get(lesson)!;
          const unit = unitsByLesson.get(lesson);
          return (
            <section key={lesson}>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-md bg-stone-950 px-2 py-1 text-xs font-bold text-white">
                  {unit?.path_code ?? trChoice(locale, `Unit ${lesson}`, `Unidad ${lesson}`)}
                </span>
                <h2 className="text-sm font-semibold text-stone-700">
                  {unit?.theme_en ?? trChoice(locale, `Unit ${lesson}`, `Unidad ${lesson}`)}
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white border border-stone-200 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-stone-900 text-sm">
                        {displayNahuatl(v.headword)}
                      </span>
                      {v.part_of_speech && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${posColor(
                            v.part_of_speech
                          )}`}
                        >
                          {tr(locale, v.part_of_speech)}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-500 text-xs mt-0.5">{v.gloss_en}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SearchForm({ defaultValue, locale }: { defaultValue: string; locale: AppLocale }) {
  return (
    <form method="GET" className="flex gap-2 max-w-md">
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={trChoice(locale, "Search Nahuatl or English…", "Buscar en náhuatl o español…")}
        className="flex-1 border border-stone-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-stone-500 bg-white"
      />
      <button
        type="submit"
        className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-stone-700 transition-colors"
      >
        {tr(locale, "Search")}
      </button>
    </form>
  );
}
