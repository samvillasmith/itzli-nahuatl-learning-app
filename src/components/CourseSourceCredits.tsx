import { GARCIA_BOOK_REFERENCE, groupCourseSourceCredits } from "@/lib/source-credits";
import type { AppLocale } from "@/i18n/config";
import { trChoice } from "@/i18n/translate";
import InaliOrthographyNotice from "@/components/InaliOrthographyNotice";
import { COERLL_SOURCE_LICENSE_NOTICE, ITZLI_V3_CONTRIBUTION_LICENSE } from "@/lib/source-license-notices";

export default function CourseSourceCredits({ locale }: { locale: AppLocale }) {
  const groups = groupCourseSourceCredits();
  return <section className="space-y-5" aria-labelledby="course-credits-heading">
    <h2 id="course-credits-heading" className="text-xl font-black text-stone-950">{trChoice(locale, "How this course was made", "Cómo se hizo este curso")}</h2>
    <p className="max-w-3xl text-sm leading-7 text-stone-600">{trChoice(locale,
      "Itzli designs its own learning path, bilingual teaching notes, practice scenes, sentence-building tasks and conversation activities. Yan García’s Learn Nahuatl, Second Edition is an inspiration and reference for this course. García has not endorsed Itzli.",
      "Itzli diseña su propio camino de aprendizaje, notas didácticas bilingües, escenas de práctica, tareas de construcción de oraciones y actividades de conversación. Learn Nahuatl, Second Edition, de Yan García es una inspiración y referencia para este curso. García no ha respaldado Itzli.")}</p>
    <div className="max-w-3xl rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm leading-6">
      <a href={GARCIA_BOOK_REFERENCE.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline">{GARCIA_BOOK_REFERENCE.title}</a>
      <p className="mt-1 text-stone-600">{trChoice(locale, "By Yan García · Second Edition", "De Yan García · Segunda edición")}</p>
      <a href={GARCIA_BOOK_REFERENCE.purchaseUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-emerald-800 underline">{trChoice(locale, "Buy Yan García’s book", "Comprar el libro de Yan García")}</a>
    </div>
    <p className="max-w-3xl text-sm leading-7 text-stone-600">{trChoice(locale,
      "Vocabulary senses and grammar are checked at specific regional source locations. Published records preserve source spellings, evidence links and review limits. A reference match supports the particular reviewed fact; it does not establish every possible meaning, pronunciation or community usage. Unresolved claims remain withheld. The modern IDIEZ online dictionary and Chicontepec dictionary share a source family, so they are not counted as independent consensus.",
      "Los significados y la gramática se contrastan en ubicaciones concretas de fuentes regionales. Los registros publicados conservan la escritura de la fuente, enlaces de evidencia y límites de revisión. Una coincidencia respalda el dato revisado, no todos sus significados, pronunciaciones ni usos comunitarios. Las afirmaciones sin resolver quedan excluidas. El diccionario moderno de IDIEZ en línea y el de Chicontepec comparten una familia de fuentes; no se cuentan como consenso independiente.")}</p>
    <p className="max-w-3xl text-sm leading-7 text-stone-600">{trChoice(locale,
      "We also reuse and adapt openly licensed Nāhuatlahtolli material, with its authors credited and changes identified. This includes source expressions, selected lesson text and vocabulary, and links to original recordings. The publisher labels the course CC BY-SA without specifying a version. Itzli’s original V3 contributions are offered under CC BY-SA 4.0; original source and media notices continue to apply. Other references supply individually checked facts and do not grant a license to reproduce their publications or media.",
      "También reutilizamos y adaptamos material de Nāhuatlahtolli con licencia abierta, acreditando a sus autores e identificando los cambios. Esto incluye expresiones de la fuente, texto y vocabulario seleccionados, y enlaces a grabaciones originales. El editor indica CC BY-SA sin especificar versión. Las aportaciones originales de Itzli para V3 se ofrecen bajo CC BY-SA 4.0; siguen vigentes los avisos de las fuentes y sus medios. Las demás referencias aportan datos revisados individualmente y no conceden una licencia para reproducir sus publicaciones ni medios.")}</p>
    <p className="max-w-3xl text-sm leading-7 text-stone-600">
      <a href={COERLL_SOURCE_LICENSE_NOTICE.listingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">{trChoice(locale, "Publisher’s CC BY-SA source listing", "Catálogo de la fuente CC BY-SA del editor")}</a>
      {" · "}<a href={ITZLI_V3_CONTRIBUTION_LICENSE.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">{trChoice(locale, "Itzli’s original V3 contributions: CC BY-SA 4.0", "Aportaciones originales de Itzli para V3: CC BY-SA 4.0")}</a>
    </p>
    <InaliOrthographyNotice locale={locale} />
    <div className="space-y-3">
      {groups.map(group => <details key={group.label} className="rounded-lg border border-stone-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-stone-900">{group.label}</summary>
        <ul className="mt-4 space-y-5 text-sm leading-6 text-stone-600">
          {group.references.map(reference => <li key={reference.url}>
            <a href={reference.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">{reference.title}</a>
            {reference.authors.length > 0 && <p>{reference.authors.join(", ")}</p>}
            {reference.publisher && <p>{reference.publisher}</p>}
            <p className="text-xs text-stone-500">{reference.use === "licensed-course"
              ? trChoice(locale, "Licensed source material and adaptations; source rights notices apply.", "Material de la fuente con licencia y adaptaciones; rigen sus avisos de derechos.")
              : reference.use === "book-reference" ? trChoice(locale, "Book reference and inspiration for our original course; no endorsement implied.", "Referencia e inspiración para nuestro curso original; no implica respaldo del autor.")
              : reference.use === "culture-image" ? `${trChoice(locale, "Artwork credit", "Crédito de la obra")}: ${reference.license}`
              : trChoice(locale, "Factual or framework reference; no publication or media reuse license asserted.", "Referencia de datos o del marco; no se afirma licencia para reutilizar la publicación ni sus medios.")}</p>
            {reference.purchaseUrl && <a href={reference.purchaseUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-700 underline">{trChoice(locale, "Buy the book", "Comprar el libro")}</a>}
          </li>)}
        </ul>
      </details>)}
    </div>
    <p className="max-w-3xl text-xs leading-6 text-stone-500">{trChoice(locale,
      "This register credits the sources identified in the published content. Original recordings keep their source links and notices. Some pre-existing word images and synthetic recordings still have unresolved provenance or validation; this register does not certify all legacy assets or grant additional media rights.",
      "Este registro acredita las fuentes identificadas en el contenido publicado. Las grabaciones originales conservan sus enlaces y avisos. Algunas imágenes de palabras y grabaciones sintéticas preexistentes aún tienen cuestiones pendientes de procedencia o validación; este registro no certifica todos los medios heredados ni concede derechos adicionales sobre ellos.")}</p>
  </section>;
}
