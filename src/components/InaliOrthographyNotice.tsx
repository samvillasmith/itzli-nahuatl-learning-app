import type { AppLocale } from "@/i18n/config";
import { trChoice } from "@/i18n/translate";
import { TEACHING_STANDARD } from "@/lib/teaching-standard";

export default function InaliOrthographyNotice({ locale }: { locale: AppLocale }) {
  return <div className="space-y-2 text-sm leading-6 text-stone-600">
    <p><span className="font-semibold">{trChoice(locale, "Teaching orthography", "Ortografía de enseñanza")}: </span>
      <a href={TEACHING_STANDARD.alphabetUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">{TEACHING_STANDARD.alphabetTitle}</a>
      {" · "}{TEACHING_STANDARD.alphabetEdition[locale]}.</p>
    <p>{TEACHING_STANDARD.alphabetPublicationNote[locale]}{" "}
      <a href={TEACHING_STANDARD.alphabetOfficialListingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">{trChoice(locale, "INALI publication listing", "Página de publicaciones de INALI")}</a>.</p>
    <p>{trChoice(locale,
      "Itzli respells vocabulary and practice using this alphabet. Original source transcriptions retain their own spellings in labeled references; the alphabet does not make every regional form or pronunciation identical.",
      "Itzli adapta la escritura del vocabulario y de la práctica a este alfabeto. Las transcripciones originales conservan su propia escritura en referencias identificadas; el alfabeto no hace idénticas todas las formas ni pronunciaciones regionales.")}</p>
  </div>;
}
