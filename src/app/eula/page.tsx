import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice } from "@/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: tr(locale, "End User License Agreement"),
    description: tr(locale, "EULA for Itzli — Eastern Huasteca Nahuatl learning app."),
  };
}

const EFFECTIVE_DATE = "May 20, 2026";
const CONTACT_EMAIL = "svillasmith3@gmail.com";

export default async function EulaPage() {
  const locale = await getRequestLocale();

  return (
    <article className="max-w-2xl mx-auto text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">{tr(locale, "End User License Agreement")}</h1>
      <p className="text-sm text-stone-500 mb-10">{tr(locale, "Effective")}: {trChoice(locale, EFFECTIVE_DATE, "20 de mayo de 2026")}</p>

      <p className="mb-4">
        {trChoice(
          locale,
          "This End User License Agreement (\"EULA\") is a legal agreement between you and the author of Itzli (\"we,\" \"us\") governing your use of the hosted Itzli application and curriculum content (collectively, the \"Software\"). By accessing or using the Software, you agree to be bound by this EULA, our",
          "Este Acuerdo de Licencia de Usuario Final (\"EULA\") es un acuerdo legal entre tú y el autor de Itzli (\"nosotros\") que regula tu uso de la aplicación alojada de Itzli y del contenido curricular (en conjunto, el \"Software\"). Al acceder al Software o usarlo, aceptas este EULA, nuestros",
        )}{" "}
        <Link href="/terms" className="text-emerald-600 underline">
          {tr(locale, "Terms of Service")}
        </Link>
        {trChoice(locale, ", and our ", " y nuestra ")}
        <Link href="/privacy" className="text-emerald-600 underline">
          {tr(locale, "Privacy Policy")}
        </Link>
        .
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">1. {tr(locale, "License grant")}</h2>
      <p className="mb-4">
        {tr(locale, "Subject to your continued compliance with this EULA, we grant you a personal, worldwide, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the hosted Software solely for your personal, non-commercial educational purposes.")}
      </p>
      <p className="mb-4">
        {trChoice(
          locale,
          "If the source code of the Itzli application is distributed to you, it is separately licensed under the project license kept with that copy. Your rights to the source code are governed by that license; this EULA governs your use of the",
          "Si recibes una copia distribuida del código fuente de la aplicación Itzli, este se licencia por separado bajo la licencia del proyecto incluida con esa copia. Tus derechos sobre el código fuente se rigen por dicha licencia; este EULA regula tu uso del",
        )}{" "}<em>{trChoice(locale, "hosted service", "servicio alojado")}</em>. {tr(locale, "Nothing in this EULA limits rights granted to you by Creative Commons licenses on imported source material. Nāhuatlahtolli-derived lesson content remains available under CC BY-SA 4.0, even when accessed through an authenticated Itzli account.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">2. {tr(locale, "Restrictions")}</h2>
      <p className="mb-4">{tr(locale, "Except as expressly permitted by an applicable open license, you will not:")}</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>{tr(locale, "sell, sublicense, rent, lease, or otherwise commercialize access to the hosted Software;")}</li>
        <li>{tr(locale, "scrape, bulk-download, or systematically extract non-open app content, private user data, the vocabulary database, generated audio files, or protected service endpoints;")}</li>
        <li>{tr(locale, "attempt to reverse-engineer, disable, or bypass safety, moderation, or rate-limit features;")}</li>
        <li>{tr(locale, "remove, alter, or obscure copyright, trademark, or attribution notices, including notices required for COERLL, Nāhuatlahtolli, Pexels photographs, and IDIEZ references;")}</li>
        <li>{tr(locale, "use the Software in violation of applicable law.")}</li>
      </ul>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">3. {tr(locale, "Ownership and intellectual property")}</h2>
      <p className="mb-4">
        {tr(locale, "Title, ownership rights, and intellectual-property rights in the Software and content remain with us or our licensors. This EULA grants you a license, not a sale.")}
      </p>
      <p className="mb-4">
        {tr(locale, "The Eastern Huasteca Nahuatl language itself is the cultural heritage of the Nahua peoples of the Huasteca region. The imported source-course section adapts Nāhuatlahtolli, published by COERLL and The University of Texas at Austin, under")}{" "}
        <a
          className="text-emerald-600 underline"
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY-SA 4.0
        </a>
        . {tr(locale, "Our additional curriculum draws on reference works from the Instituto de Docencia e Investigación Etnológica de Zacatecas (IDIEZ), the Karttunen Analytical Dictionary of Nahuatl, and attested EHN texts — credited in the repository acknowledgments. Machine audio is produced through a language-specific machine-audio pipeline; photographs are licensed from their respective asset sources with attribution where required.")}
      </p>
      <p className="mb-4">
        {tr(locale, "Reuse of imported Nāhuatlahtolli material is governed by CC BY-SA 4.0, including attribution and ShareAlike requirements. Reuse of Itzli-only content, private service data, generated audio, trademarks, or third-party assets may be subject to separate terms.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">4. {tr(locale, "AI tutor content — \"as-is\" disclaimer")}</h2>
      <p className="mb-4">
        {tr(locale, "The AI tutor generates output using a third-party large language model that is not specifically trained on Eastern Huasteca Nahuatl. Output may be")} <strong>{tr(locale, "inaccurate, hallucinated, or linguistically incorrect")}</strong>. {tr(locale, "It is provided for educational exploration only and is not warranted fit for academic citation, translation, or any professional use. You assume all risk from acting on AI output.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">5. {tr(locale, "Disclaimer of warranties")}</h2>
      <p className="mb-4 uppercase text-sm">
        {tr(locale, "The Software is provided \"as is\" and \"as available,\" without warranty of any kind, express, implied, statutory, or otherwise, including without limitation warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy, or quiet enjoyment. We do not warrant that the Software will meet your requirements, be uninterrupted, be free of harmful components, or that defects will be corrected.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">6. {tr(locale, "Limitation of liability")}</h2>
      <p className="mb-4 uppercase text-sm">
        {tr(locale, "To the maximum extent permitted by law, in no event will we or our licensors be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, data, use, or goodwill, arising out of or related to your use of the Software, even if advised of the possibility of such damages. Our aggregate liability under this EULA will not exceed one hundred US dollars (USD 100.00) or the amount you have paid us in the past twelve months, whichever is greater.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">7. {tr(locale, "Termination")}</h2>
      <p className="mb-4">
        {tr(locale, "This EULA is effective until terminated. It will terminate automatically if you breach any provision. Upon termination you must stop using the Software. Sections 2 (Restrictions), 3 (Ownership), 5 (Warranties), 6 (Liability), and 8 (Governing law) survive termination.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">8. {tr(locale, "Governing law")}</h2>
      <p className="mb-4">
        {tr(locale, "This EULA is governed by the laws of the State of Texas, United States, without regard to conflict-of-law principles. Disputes will be resolved in the state or federal courts located in Texas, and you consent to the personal jurisdiction of those courts.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">9. {tr(locale, "Entire agreement")}</h2>
      <p className="mb-4">
        {tr(locale, "This EULA, together with our Terms of Service and Privacy Policy, constitutes the entire agreement between you and us regarding the Software. If any provision is held unenforceable, the remaining provisions remain in full force.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">10. {tr(locale, "Contact")}</h2>
      <p className="mb-4">
        {tr(locale, "Questions about this EULA:")}{" "}
        <a className="text-emerald-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <div className="mt-12 pt-8 border-t border-stone-200 text-sm text-stone-500">
        <p>
          {tr(locale, "See also our")}{" "}
          <Link href="/terms" className="text-emerald-600 underline">
            {tr(locale, "Terms of Service")}
          </Link>{" "}
          {tr(locale, "and")}{" "}
          <Link href="/privacy" className="text-emerald-600 underline">
            {tr(locale, "Privacy Policy")}
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
