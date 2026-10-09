import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice } from "@/i18n/translate";
import { COERLL_SOURCE_LICENSE_NOTICE, ITZLI_V3_CONTRIBUTION_LICENSE } from "@/lib/source-license-notices";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return createPageMetadata({
    locale,
    pathname: "/eula",
    title: trChoice(locale, "End User License Agreement", "Acuerdo de licencia de usuario final"),
    description: trChoice(locale,
      "Review Itzli's app license, permitted use, and source-content licensing for the free Eastern Huasteca Nahuatl course.",
      "Consulta la licencia de la app de Itzli, los usos permitidos y las licencias del contenido del curso gratis de náhuatl de la Huasteca veracruzana."),
  });
}

const EFFECTIVE_DATE = "October 3, 2026";
const CONTACT_EMAIL = "admin@itzli.app";

export default async function EulaPage() {
  const locale = await getRequestLocale();

  return (
    <article className="max-w-2xl mx-auto text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">{tr(locale, "End User License Agreement")}</h1>
      <p className="text-sm text-stone-500 mb-10">{tr(locale, "Effective")}: {trChoice(locale, EFFECTIVE_DATE, "3 de octubre de 2026")}</p>

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
        )}{" "}<em>{trChoice(locale, "hosted service", "servicio alojado")}</em>. {trChoice(locale,
          "Nothing in this EULA limits rights granted by applicable open-content licenses, including access through an authenticated Itzli account. Nāhuatlahtolli source material retains its publisher’s CC BY-SA notice; the publisher’s listing does not specify a version. Itzli’s original V3 contributions and adaptation work use CC BY-SA 4.0. Original source and media notices remain applicable.",
          "Nada en este EULA limita los derechos concedidos por las licencias de contenido abierto aplicables, incluso cuando se accede mediante una cuenta autenticada de Itzli. El material de Nāhuatlahtolli conserva el aviso CC BY-SA de su editor; el catálogo del editor no especifica una versión. Las aportaciones originales de Itzli para V3 y su trabajo de adaptación usan CC BY-SA 4.0. Siguen vigentes los avisos originales de las fuentes y sus medios.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">2. {tr(locale, "Restrictions")}</h2>
      <p className="mb-4">{tr(locale, "Except as expressly permitted by an applicable open license, you will not:")}</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>{tr(locale, "sell, sublicense, rent, lease, or otherwise commercialize access to the hosted Software;")}</li>
        <li>{tr(locale, "scrape, bulk-download, or systematically extract private user data, protected service endpoints, or app content and generated files that are not covered by an open license;")}</li>
        <li>{tr(locale, "attempt to reverse-engineer, disable, or bypass safety, moderation, or rate-limit features;")}</li>
        <li>{tr(locale, "remove attribution or rights notices required by an applicable license;")}</li>
        <li>{tr(locale, "use the Software in violation of applicable law.")}</li>
      </ul>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">3. {tr(locale, "Ownership and intellectual property")}</h2>
      <p className="mb-4">
        {tr(locale, "Intellectual-property rights remain with the applicable rightsholders. This EULA governs access to the hosted service and does not transfer ownership.")}
      </p>
      <p className="mb-4">
        {trChoice(locale, "Eastern Huasteca Nahuatl is cultural heritage of Nahua communities of the Huasteca. Itzli imports and adapts Nāhuatlahtolli material from COERLL / The University of Texas at Austin. The publisher labels its license CC BY-SA without specifying a version. Itzli’s original V3 contributions and adaptations are offered under", "El náhuatl de la Huasteca veracruzana es patrimonio cultural de las comunidades nahuas de la Huasteca. Itzli importa y adapta material de Nāhuatlahtolli de COERLL / Universidad de Texas en Austin. El editor indica CC BY-SA sin especificar versión. Las aportaciones originales y adaptaciones de Itzli para V3 se ofrecen bajo")}{" "}
        <a
          className="text-emerald-600 underline"
          href={ITZLI_V3_CONTRIBUTION_LICENSE.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {ITZLI_V3_CONTRIBUTION_LICENSE.name}
        </a>
        . {tr(locale, "These source-derived adaptations include lesson text, vocabulary selections, grammar examples, dialogues, and construction exercises. The project's NonCommercial condition does not apply to them.")}
      </p>
      <p className="mb-4">
        <a className="text-emerald-600 underline" href="https://tlahtolli.coerll.utexas.edu/" target="_blank" rel="noopener noreferrer">
          {tr(locale, "Original Nāhuatlahtolli course")}
        </a>
        {" · "}<a className="text-emerald-600 underline" href={COERLL_SOURCE_LICENSE_NOTICE.listingUrl} target="_blank" rel="noopener noreferrer">{trChoice(locale, "Publisher’s source-license listing", "Catálogo de licencias de la fuente del editor")}</a>
      </p>
      <p className="mb-4">
        {tr(locale, "Reference books and linked scholarly, dictionary, museum, or institutional pages support factual checks. Their inclusion does not grant permission to copy or redistribute them or imply endorsement of Itzli.")}
      </p>
      <p className="mb-4">
        {trChoice(locale, "Reuse must retain attribution, notice of changes and applicable ShareAlike terms. Original source notices remain in force; this app does not confirm a source-license version or relicense linked media. Other app content, images, recordings and trademarks have separate rights. Existing asset provenance and reuse permissions are not all certified.", "La reutilización debe conservar la atribución, el aviso de cambios y los términos de CompartirIgual aplicables. Siguen vigentes los avisos originales; esta aplicación no confirma una versión de la licencia de la fuente ni relicencia los medios enlazados. Otros contenidos, imágenes, grabaciones y marcas tienen derechos separados. No se certifica toda la procedencia ni los permisos de los medios existentes.")}
        {" "}<Link href="/source-course" className="text-emerald-600 underline">{trChoice(locale, "Sources and credits", "Fuentes y créditos")}</Link>
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
