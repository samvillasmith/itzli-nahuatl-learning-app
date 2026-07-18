import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice } from "@/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: tr(locale, "Terms of Service"),
    description: tr(locale, "Terms of Service for Itzli — Eastern Huasteca Nahuatl learning app."),
  };
}

const EFFECTIVE_DATE = "May 20, 2026";
const CONTACT_EMAIL = "svillasmith3@gmail.com";

export default async function TermsPage() {
  const locale = await getRequestLocale();

  return (
    <article className="max-w-2xl mx-auto text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">{tr(locale, "Terms of Service")}</h1>
      <p className="text-sm text-stone-500 mb-10">{tr(locale, "Effective")}: {trChoice(locale, EFFECTIVE_DATE, "20 de mayo de 2026")}</p>

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
        <li>{trChoice(locale, "attempt to extract, copy, or redistribute Itzli content in bulk except where permitted by an applicable open license, including the CC BY-SA license for imported Nāhuatlahtolli materials;", "intentar extraer, copiar o redistribuir contenido de Itzli de forma masiva, salvo cuando lo permita una licencia abierta aplicable, incluida la licencia CC BY-SA del material importado de Nāhuatlahtolli;")}</li>
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
        {tr(locale, "Vocabulary and grammar content uses an INALI-style learner display and has been checked against scholarly references, but some entries contain known limitations noted in the curriculum. Audio pronunciations are")} {" "}
        <strong>{trChoice(locale, "machine-synthesized", "sintetizadas automáticamente")}</strong>{" "}
        {tr(locale, "using language-specific machine synthesis where available. Treat generated audio as educational support rather than a substitute for a trained instructor or community speaker.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">6. {tr(locale, "Intellectual property")}</h2>
      <p className="mb-4">
        {tr(locale, "Any distributed copy of the Itzli source code is governed by the project license included with that copy. Imported Nāhuatlahtolli lesson content is adapted from the COERLL course by Sabina de la Cruz, Catalina de la Cruz, Josefrayn Sánchez-Perry, Kelly McDonough, and Sergio Romero and remains available under")}{" "}
        <a
          className="text-emerald-600 underline"
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC BY-SA 4.0
        </a>
        . {tr(locale, "Itzli additions, machine-generated audio, photographs, and other third-party assets are licensed from their respective owners or under the notices shown in the app and repository. Account sign-in for the hosted app does not remove the Creative Commons rights attached to the imported Nāhuatlahtolli material.")}
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
