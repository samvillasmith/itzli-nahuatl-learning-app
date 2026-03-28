import { getAllPrimerVocab, searchVocab } from "@/lib/db";

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

export default function VocabularyPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q?.trim() ?? "";

  if (query.length > 0) {
    const results = searchVocab(query, 100);
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Vocabulary</h1>
          <SearchForm defaultValue={query} />
        </div>

        <p className="text-sm text-stone-400 mb-4">
          {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>

        {results.length === 0 ? (
          <p className="text-stone-500 py-8 text-center">No entries found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {results.map((e) => (
              <div
                key={e.entry_id}
                className="bg-white border border-stone-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-stone-900">
                    {e.ehn_spoken_form || e.msn_headword}
                  </span>
                  {e.part_of_speech && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${posColor(
                        e.part_of_speech
                      )}`}
                    >
                      {e.part_of_speech}
                    </span>
                  )}
                </div>
                <p className="text-stone-600 text-sm">{e.gloss_en}</p>
                {e.msn_headword && e.msn_headword !== e.ehn_spoken_form && (
                  <p className="text-stone-400 text-xs mt-1 font-mono">
                    MSN: {e.msn_headword}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default: all 1,008 primer vocab items
  const vocab = getAllPrimerVocab();

  // Group by lesson
  const byLesson = new Map<number, typeof vocab>();
  for (const v of vocab) {
    const arr = byLesson.get(v.first_lesson_number) ?? [];
    arr.push(v);
    byLesson.set(v.first_lesson_number, arr);
  }
  const lessons = [...byLesson.keys()].sort((a, b) => a - b);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Vocabulary</h1>
        <p className="text-stone-500 mb-4">
          {vocab.length} primer items · search to explore the full 37,000-entry lexicon.
        </p>
        <SearchForm defaultValue="" />
      </div>

      <div className="space-y-8">
        {lessons.map((lesson) => {
          const items = byLesson.get(lesson)!;
          return (
            <section key={lesson}>
              <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3">
                Unit {String(lesson).padStart(2, "0")}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white border border-stone-200 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-stone-900 text-sm">
                        {v.headword}
                      </span>
                      {v.part_of_speech && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${posColor(
                            v.part_of_speech
                          )}`}
                        >
                          {v.part_of_speech}
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

function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form method="GET" className="flex gap-2 max-w-md">
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search Nahuatl or English…"
        className="flex-1 border border-stone-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-stone-500 bg-white"
      />
      <button
        type="submit"
        className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-stone-700 transition-colors"
      >
        Search
      </button>
    </form>
  );
}
