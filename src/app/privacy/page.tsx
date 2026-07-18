import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice } from "@/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: tr(locale, "Privacy Policy"),
    description: tr(locale, "Privacy Policy for Itzli — Eastern Huasteca Nahuatl learning app."),
  };
}

const EFFECTIVE_DATE = "July 13, 2026";
const CONTACT_EMAIL = "svillasmith3@gmail.com";

export default async function PrivacyPage() {
  const locale = await getRequestLocale();

  return (
    <article className="max-w-2xl mx-auto text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">{tr(locale, "Privacy Policy")}</h1>
      <p className="text-sm text-stone-500 mb-10">{tr(locale, "Effective")}: {trChoice(locale, EFFECTIVE_DATE, "13 de julio de 2026")}</p>

      <div className="mb-10 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
        <p className="font-semibold text-emerald-900 mb-2">{tr(locale, "Short version")}</p>
        <ul className="list-disc pl-5 space-y-1 text-emerald-900">
          <li>{tr(locale, "We collect only what we need to run the app: your account (via Clerk), your learning progress, and safety-audit metadata.")}</li>
          <li>
            {trChoice(locale, "We", "Nosotros")} {" "}
            <strong>{trChoice(locale, "never store the raw text of your chat messages", "nunca almacenamos el texto sin procesar de tus mensajes de chat")}</strong>{" "}
            {trChoice(locale, "in our database. Chat audit records use one-way hashes and structured safety metadata.", "en nuestra base de datos. Los registros de auditoría del chat usan hashes unidireccionales y metadatos estructurados de seguridad.")}
          </li>
          <li>{tr(locale, "Your messages to the AI tutor are transmitted to OpenAI for processing.")}</li>
          <li>{tr(locale, "You can delete your cloud progress or your entire account at any time.")}</li>
        </ul>
      </div>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">1. {tr(locale, "Who we are")}</h2>
      <p className="mb-4">
        {trChoice(locale, "Itzli is a free educational app for learning Eastern Huasteca Nahuatl, operated by Sam Villa-Smith. For privacy questions, contact", "Itzli es una aplicación educativa gratuita para aprender náhuatl de la Huasteca veracruzana, operada por Sam Villa-Smith. Para preguntas sobre privacidad, escribe a")}{" "}
        <a className="text-emerald-600 underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">2. {tr(locale, "What we collect")}</h2>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">{tr(locale, "Account data (via Clerk)")}</h3>
      <p className="mb-4">
        {tr(locale, "When you sign up, Clerk collects your email address, password (hashed, never visible to us), and any profile information you choose to add. Clerk's")}{" "}
        <a
          className="text-emerald-600 underline"
          href="https://clerk.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr(locale, "Privacy Policy")}
        </a>{" "}
        {tr(locale, "applies to that data.")}
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">{tr(locale, "Learning progress (Neon Postgres)")}</h3>
      <p className="mb-4">
        {tr(locale, "We store your unit completion, quiz accuracy, and spaced-repetition state in our database, keyed to your Clerk user ID. This data lets you resume your learning across devices. It contains no personally identifying information beyond the pseudonymous Clerk ID.")}
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">{tr(locale, "Chat audit log (Neon Postgres)")}</h3>
      <p className="mb-4">
        {trChoice(
          locale,
          "For AI tutor requests and safety guardrail events, we record an audit row containing: the Clerk user ID, the event kind, request metadata, safety categories and scores where applicable, model names, timestamps, and ",
          "Para las solicitudes al tutor de IA y los eventos de protección de seguridad, registramos una fila de auditoría que contiene: el ID de usuario de Clerk, el tipo de evento, metadatos de la solicitud, categorías y puntuaciones de seguridad cuando corresponda, nombres de modelos, marcas de tiempo y ",
        )}
        <strong>{trChoice(locale, "keyed SHA-256 hashes of chat content", "hashes SHA-256 con clave del contenido del chat")}</strong>.{" "}
        {trChoice(
          locale,
          "We do not store the raw text of user messages or AI responses. The secret-keyed hashes support repeated-abuse detection without retaining readable chat content or exposing ordinary low-entropy messages to dictionary lookup.",
          "No almacenamos el texto sin procesar de los mensajes del usuario ni de las respuestas de IA. Los hashes con clave secreta permiten detectar abusos repetidos sin conservar contenido legible ni exponer mensajes comunes de baja entropía a búsquedas en diccionarios.",
        )}
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">{tr(locale, "Chat content (transient, via OpenAI)")}</h3>
      <p className="mb-4">
        {tr(locale, "Your chat messages are sent to OpenAI for completion. OpenAI processes them under its")}{" "}
        <a
          className="text-emerald-600 underline"
          href="https://openai.com/policies/privacy-policy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr(locale, "Privacy Policy")}
        </a>
        . {tr(locale, "Per OpenAI's API policy, API messages are not used to train their models. We do not persist chat messages in our own database.")}
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">{tr(locale, "Local storage")}</h3>
      <p className="mb-4">
        {tr(locale, "Your browser stores a mirror of your learning progress in")}{" "}
        <code>localStorage</code>{" "}
        {tr(locale, "so progress remains visible between visits and can be synchronized after sign-in. The app still requires a network connection to load pages and media. We also set a localStorage entry recording that you agreed to these policies, so we don't re-prompt you every visit. Clearing your browser data will clear these.")}
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">{tr(locale, "Cookies")}</h3>
      <p className="mb-4">
        {tr(locale, "Clerk sets essential authentication cookies required for you to stay signed in. We do not use third-party advertising or analytics cookies.")}
      </p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">{tr(locale, "Server logs")}</h3>
      <p className="mb-4">
        {tr(locale, "Our hosting provider (Vercel) may record standard server logs (IP address, user agent, request path, timestamp) for operational and security purposes. These are retained for a limited period per Vercel's policies.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">3. {tr(locale, "How we use data")}</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>{trChoice(locale, "to provide authentication and run the app;", "proporcionar autenticación y operar la aplicación;")}</li>
        <li>{trChoice(locale, "to sync your learning progress across devices;", "sincronizar tu progreso de aprendizaje entre dispositivos;")}</li>
        <li>{trChoice(locale, "to detect and prevent abuse of the AI tutor (via hashed audit log);", "detectar y prevenir abusos del tutor de IA mediante un registro de auditoría con hash;")}</li>
        <li>{trChoice(locale, "to moderate content using third-party safety APIs;", "moderar contenido mediante API de seguridad de terceros;")}</li>
        <li>{trChoice(locale, "to respond to your support requests.", "responder a tus solicitudes de soporte.")}</li>
      </ul>
      <p className="mb-4">
        {tr(locale, "We do not sell your data. We do not share it with advertisers. We do not use it for behavioral profiling.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">4. {tr(locale, "Third parties")}</h2>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li><strong>Clerk</strong> — {tr(locale, "processes authentication data")}</li>
        <li><strong>Neon (Postgres)</strong> — {tr(locale, "stores progress and hashed audit rows")}</li>
        <li><strong>OpenAI</strong> — {tr(locale, "processes chat content (completion + moderation)")}</li>
        <li><strong>Vercel</strong> — {tr(locale, "hosts the app and serves requests")}</li>
        <li><strong>Amazon S3</strong> — {tr(locale, "serves static assets (images, audio, database bundle)")}</li>
        <li><strong>{trChoice(locale, "Pexels, Wikimedia Commons, Flickr, Rawpixel, and StockSnap", "Pexels, Wikimedia Commons, Flickr, Rawpixel y StockSnap")}</strong> — {tr(locale, "serve some vocabulary images")}</li>
      </ul>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">5. {tr(locale, "Your rights")}</h2>
      <p className="mb-4">
        {tr(locale, "Depending on where you live (including under GDPR in the EU/UK or CCPA in California), you may have the right to:")}
      </p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>{trChoice(locale, "access the personal data we hold about you;", "acceder a los datos personales que conservamos sobre ti;")}</li>
        <li>{trChoice(locale, "correct inaccurate data;", "corregir datos inexactos;")}</li>
        <li>{trChoice(locale, "delete your data (\"right to erasure\");", "eliminar tus datos (\"derecho de supresión\");")}</li>
        <li>{trChoice(locale, "object to or restrict processing;", "oponerte al tratamiento o restringirlo;")}</li>
        <li>{trChoice(locale, "receive a portable copy of your data.", "recibir una copia portátil de tus datos.")}</li>
      </ul>
      <p className="mb-4">
        {tr(locale, "To exercise these rights, contact us at")} {CONTACT_EMAIL}. {tr(locale, "We will respond within 30 days. You may also have the right to lodge a complaint with your local data-protection authority.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">6. {tr(locale, "How to delete your data")}</h2>
      <p className="mb-4">
        {tr(locale, "From inside the app:")}
      </p>
      <ul className="list-disc pl-6 space-y-1 mb-4">
        <li>{tr(locale, "Go to")} <Link href="/progress" className="text-emerald-600 underline">{tr(locale, "Progress")}</Link> {tr(locale, "and use \"Reset progress\" to clear local progress and delete the cloud copy.")}</li>
        <li>{tr(locale, "Delete your account via Clerk to remove authentication data, cloud progress, tutor rate-limit records, and safety-audit hashes tied to your Clerk user ID.")}</li>
      </ul>
      <p className="mb-4">
        {tr(locale, "You can also email")} {CONTACT_EMAIL} {tr(locale, "for an access or deletion request.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">7. {tr(locale, "Retention")}</h2>
      <p className="mb-4">
        {tr(locale, "We retain progress data for as long as your account is active. If you delete your account, its progress and audit rows are removed. Resetting progress removes only local and cloud learning progress. Hashed audit rows are retained for up to 24 months for abuse-pattern detection, then purged. Server logs follow our hosting provider's retention policy.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">8. {tr(locale, "Children")}</h2>
      <p className="mb-4">
        {tr(locale, "Itzli is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, contact us and we will delete it.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">9. {tr(locale, "International transfers")}</h2>
      <p className="mb-4">
        {tr(locale, "Our services run on infrastructure in the United States. If you access Itzli from outside the US, your data will be transferred to and processed in the US. By using the app you consent to this transfer.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">10. {tr(locale, "Security")}</h2>
      <p className="mb-4">
        {trChoice(
          locale,
          "We take reasonable technical measures to protect your data: TLS in transit, authentication via Clerk, password hashing on Clerk's side, and secret-keyed SHA-256 hashing of audit content. No system is perfectly secure; we cannot guarantee absolute security.",
          "Tomamos medidas técnicas razonables para proteger tus datos: TLS en tránsito, autenticación mediante Clerk, hash de contraseñas del lado de Clerk y hash SHA-256 con clave secreta del contenido de auditoría. Ningún sistema es perfectamente seguro; no podemos garantizar una seguridad absoluta.",
        )}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">11. {tr(locale, "Changes to this policy")}</h2>
      <p className="mb-4">
        {tr(locale, "We may update this Privacy Policy. Material changes will be reflected in the effective date above, and you may be asked to re-accept the updated policy on next use.")}
      </p>

      <h2 className="text-xl font-semibold text-stone-900 mt-10 mb-3">12. {tr(locale, "Contact")}</h2>
      <p className="mb-4">
        {tr(locale, "Privacy questions or requests:")}{" "}
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
          <Link href="/eula" className="text-emerald-600 underline">
            EULA
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
