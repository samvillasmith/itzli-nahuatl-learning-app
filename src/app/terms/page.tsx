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
    pathname: "/terms",
    title: trChoice(locale, "Terms of Service", "Términos de servicio"),
    description: trChoice(locale,
      "Read the terms for using Itzli's free Nahuatl learning app, including account responsibilities, course content, source licenses, and support.",
      "Consulta los términos de uso de la app gratuita de náhuatl de Itzli: responsabilidades de la cuenta, contenido, licencias de las fuentes y ayuda."),
  });
}

const EFFECTIVE_DATE = "October 3, 2026";
const CONTACT_EMAIL = "admin@itzli.app";

export default async function TermsPage() {
  const locale = await getRequestLocale();

  return (
    <article className="max-w-2xl mx-auto text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">{tr(locale, "Terms of Service")}</h1>
      <p className="text-sm text-stone-500 mb-10">{tr(locale, "Effective")}: {trChoice(locale, EFFECTIVE_DATE, "3 de octubre de 2026")}</p>

      <p className="mb-4">
        {tr(locale, "These Terms of Service (\"Terms\") govern your access to and use of Itzli (\"Itzli,\" \"the app,\" \"we,\" \"us\"), a free educational web application for learning Eastern Huasteca Nahuatl. By creating an account or using Itzli, you agree to these Terms. If you do not agree, do not use the app.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">1. {tr(locale, "Who may use Itzli")}</h2>
      <p className="mb-4">
        {tr(locale, "Itzli is available to users aged 13 and older. If you are under 18, you represent that you have a parent or legal guardian's permission to use the app. Itzli is not directed at children under 13, and we do not knowingly collect personal information from children under 13.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">2. {tr(locale, "Accounts")}</h2>
      <p className="mb-4">
        {tr(locale, "Authentication is provided by Clerk. You are responsible for maintaining the security of your account credentials and for all activity under your account. Notify us promptly at")} {CONTACT_EMAIL} {tr(locale, "if you suspect unauthorized access.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">3. {tr(locale, "Acceptable use")}</h2>
      <p className="mb-4">{tr(locale, "You agree not to:")}</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>{trChoice(locale, "use Itzli for any unlawful purpose or in violation of any applicable law;", "usar Itzli para cualquier fin ilegal o que infrinja una ley aplicable;")}</li>
        <li>{trChoice(locale, "attempt to probe, scan, or test the vulnerability of the app, circumvent rate limits, or bypass safety guardrails;", "intentar sondear, escanear o probar vulnerabilidades de la aplicación, evadir límites de uso o eludir medidas de seguridad;")}</li>
        <li>{trChoice(locale, "submit content that is sexual (especially involving minors), threatening, harassing, hateful, violent, or that facilitates illegal harm;", "enviar contenido sexual (especialmente si involucra a menores), amenazante, acosador, de odio, violento o que facilite daños ilegales;")}</li>
        <li>{trChoice(locale, "attempt to extract, copy, or redistribute Itzli content in bulk except where permitted by an applicable open license, including CC BY-SA for imported and adapted Nāhuatlahtolli learning content;", "intentar extraer, copiar o redistribuir contenido de Itzli de forma masiva, salvo cuando lo permita una licencia abierta aplicable, incluida CC BY-SA para el contenido educativo importado y adaptado de Nāhuatlahtolli;")}</li>
        <li>{trChoice(locale, "use the AI tutor to generate content that violates OpenAI's usage policies;", "usar el tutor de IA para generar contenido que infrinja las políticas de uso de OpenAI;")}</li>
        <li>{trChoice(locale, "impersonate others, or use automated scripts or crawlers against the app without our written consent.", "suplantar a otras personas o usar scripts automatizados o rastreadores contra la aplicación sin nuestro consentimiento por escrito.")}</li>
      </ul>
      <p className="mb-4">
        {tr(locale, "We may refuse service, block accounts, or remove content that violates these rules.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">4. {tr(locale, "The AI tutor — important disclaimer")}</h2>
      <p className="mb-4">
        {tr(locale, "Itzli's tutor feature (Tlamachtihquetl) uses a third-party large language model (OpenAI) to generate Nahuatl grammar explanations and conversation practice. AI output may be")} <strong>{tr(locale, "inaccurate, incomplete, or fabricated")}</strong>, {tr(locale, "particularly for a minority language with limited training data. Do not rely on the tutor for academic, legal, medical, financial, or safety-critical purposes. The tutor is not a substitute for a native speaker, certified instructor, or professional translator.")}
      </p>
      <p className="mb-4">
        {tr(locale, "Your messages to the tutor are transmitted to OpenAI for processing under their own terms. You agree not to submit personal, confidential, or sensitive information to the tutor.")}
      </p>
      <p className="mb-4">
        {tr(locale, "We do not store raw tutor chat text in our database. We may store privacy-preserving audit metadata, including one-way hashes of chat content and structured safety/control information, to operate guardrails, investigate abuse, and verify that moderation controls ran.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">5. {tr(locale, "Content accuracy and audio")}</h2>
      <p className="mb-4">
        {tr(locale, "Itzli uses INALI's published Nahuatl alphabet for teaching orthography and COERLL's Chicontepec-based course as regional vocabulary and grammar evidence. Some content remains under review. Audio includes source recordings and machine-generated clips; synthesized pronunciations have not all been validated by speakers of the course variety.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">6. {tr(locale, "Intellectual property")}</h2>
      <p className="mb-4">
        {trChoice(locale, "The project license governs distributed copies of Itzli's source code. Nāhuatlahtolli source material is credited to Sabina de la Cruz, Catalina de la Cruz, Josefrayn Sánchez-Perry, Kelly McDonough and Sergio Romero, COERLL / UT Austin. Its publisher labels the source CC BY-SA without specifying a version. Itzli's original V3 contributions and adaptations are offered under", "La licencia del proyecto rige las copias distribuidas del código fuente de Itzli. El material de Nāhuatlahtolli se acredita a Sabina de la Cruz, Catalina de la Cruz, Josefrayn Sánchez-Perry, Kelly McDonough y Sergio Romero, COERLL / UT Austin. El editor indica CC BY-SA sin especificar versión. Las aportaciones originales y adaptaciones de Itzli para V3 se ofrecen bajo")}{" "}
        <a
          className="text-emerald-600 underline"
          href={ITZLI_V3_CONTRIBUTION_LICENSE.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {ITZLI_V3_CONTRIBUTION_LICENSE.name}
        </a>
        . {tr(locale, "The project's NonCommercial condition does not apply to this source-derived content. You may share and adapt it, including commercially, with attribution, a license link, notice of changes, and ShareAlike for adaptations. Hosted-account requirements do not remove those content rights.")}
      </p>
      <p className="mb-4">
        <a className="text-emerald-600 underline" href="https://tlahtolli.coerll.utexas.edu/" target="_blank" rel="noopener noreferrer">
          {tr(locale, "Original Nāhuatlahtolli course")}
        </a>
        {" · "}<a className="text-emerald-600 underline" href={COERLL_SOURCE_LICENSE_NOTICE.listingUrl} target="_blank" rel="noopener noreferrer">{trChoice(locale, "Publisher’s source-license listing", "Catálogo de licencias de la fuente del editor")}</a>
      </p>
      <p className="mb-4">
        {tr(locale, "Reference links support factual checks; they do not grant redistribution rights to linked publications or imply endorsement. Images, recordings, trademarks, and other third-party assets have separate notices and rights; this audit has not fully verified every asset's provenance or reuse permissions.")}
      </p>
      <p className="mb-4">
        {tr(locale, "You retain rights to content you submit, but by submitting content to the tutor you grant us a non-exclusive right to process it (including via OpenAI) for the purpose of delivering your requested response and enforcing safety policies.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">7. {tr(locale, "Third-party services")}</h2>
      <p className="mb-4">{tr(locale, "Itzli relies on the following third-party services:")}</p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li><strong>Clerk</strong> — {tr(locale, "authentication")}</li>
        <li><strong>Neon Postgres</strong> — {tr(locale, "progress sync and safety audit log")}</li>
        <li><strong>OpenAI</strong> — {tr(locale, "AI tutor (gpt-4.1-mini) and content moderation (omni-moderation-latest)")}</li>
        <li><strong>Vercel</strong> — {tr(locale, "hosting")}</li>
        <li><strong>Amazon S3</strong> — {tr(locale, "static asset delivery (images, audio, database)")}</li>
        <li><strong>{trChoice(locale, "Pexels, Wikimedia Commons, Flickr, Rawpixel, and StockSnap", "Pexels, Wikimedia Commons, Flickr, Rawpixel y StockSnap")}</strong> — {tr(locale, "vocabulary images, credited on the card when used")}</li>
        <li><strong>COERLL / UT Austin</strong> — {tr(locale, "public CC BY-SA Nāhuatlahtolli source course material and source media links")}</li>
      </ul>
      <p className="mb-4">
        {tr(locale, "Your use of Itzli is also subject to the terms and privacy practices of these providers.")}
      </p>
      <p className="mb-4">
        <a className="text-emerald-600 underline" href="/third-party-notices.txt" target="_blank" rel="noopener noreferrer">
          {trChoice(locale, "Open-source software licenses and notices", "Licencias y avisos del software de código abierto")}
        </a>
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">8. {tr(locale, "Termination")}</h2>
      <p className="mb-4">
        {tr(locale, "You may stop using Itzli and delete your account at any time. We may suspend or terminate access if you violate these Terms or if we discontinue the service. Upon termination, your right to use the app ceases; the disclaimers and liability provisions below survive.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">9. {tr(locale, "Disclaimer of warranties")}</h2>
      <p className="mb-4 uppercase text-sm">
        {tr(locale, "Itzli is provided \"as is\" and \"as available\" without warranties of any kind, express or implied, including without limitation warranties of merchantability, fitness for a particular purpose, non-infringement, or accuracy of content. We do not warrant that the app will be uninterrupted, error-free, or free from harmful components.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">10. {tr(locale, "Limitation of liability")}</h2>
      <p className="mb-4 uppercase text-sm">
        {tr(locale, "To the maximum extent permitted by law, in no event will Itzli or its author be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, data, use, or goodwill, arising out of or related to your use of the app. Our total aggregate liability under these Terms will not exceed one hundred US dollars (USD 100.00) or the amount you have paid us in the past twelve months, whichever is greater.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">11. {tr(locale, "Indemnification")}</h2>
      <p className="mb-4">
        {tr(locale, "You agree to indemnify and hold harmless Itzli and its author from any claim, loss, or expense (including reasonable attorneys' fees) arising from your breach of these Terms or your misuse of the app.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">12. {tr(locale, "Changes to these Terms")}</h2>
      <p className="mb-4">
        {tr(locale, "We may update these Terms as the app evolves. Material changes will be indicated by bumping the effective date above; continued use after such changes constitutes acceptance. You may be asked to re-accept updated Terms via a modal on first use after an update.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">13. {tr(locale, "Governing law")}</h2>
      <p className="mb-4">
        {tr(locale, "These Terms are governed by the laws of the State of Texas, United States, without regard to conflict-of-law principles. Disputes will be resolved exclusively in the state or federal courts located in Texas, and you consent to the personal jurisdiction of those courts.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">14. {tr(locale, "Contact")}</h2>
      <p className="mb-4">
        {tr(locale, "Questions about these Terms? Email")}{" "}
        <a className="text-emerald-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <div className="mt-12 pt-8 border-t border-stone-200 text-sm text-stone-500">
        <p>
          {tr(locale, "See also our")}{" "}
          <Link href="/privacy" className="text-emerald-600 underline">
            {tr(locale, "Privacy Policy")}
          </Link>{" "}
          {tr(locale, "and")}{" "}
          <Link href="/eula" className="text-emerald-600 underline">
            EULA
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
