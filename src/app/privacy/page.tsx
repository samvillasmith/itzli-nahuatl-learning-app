import type { Metadata } from "next";
import Link from "next/link";
import { getRequestLocale } from "@/i18n/server";
import { tr, trChoice } from "@/i18n/translate";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return createPageMetadata({
    locale,
    pathname: "/privacy",
    title: trChoice(locale, "Privacy Policy", "Política de privacidad"),
    description: trChoice(locale,
      "Read how Itzli's free Nahuatl learning app handles account information, learning progress, feedback, and your privacy choices.",
      "Conoce cómo la app gratuita de náhuatl de Itzli trata los datos de tu cuenta, tu progreso, tus comentarios y tus opciones de privacidad."),
  });
}

const EFFECTIVE_DATE = "October 9, 2026";
const CONTACT_EMAIL = "admin@itzli.app";

export default async function PrivacyPage() {
  const locale = await getRequestLocale();

  return (
    <article className="max-w-2xl mx-auto text-stone-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">{tr(locale, "Privacy Policy")}</h1>
      <p className="text-sm text-stone-500 mb-10">{tr(locale, "Effective")}: {trChoice(locale, EFFECTIVE_DATE, "9 de octubre de 2026")}</p>

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
          <li>{trChoice(locale, "Voluntary course reports and community feedback are sent to Sam by email; they are not published automatically.", "Los reportes voluntarios del curso y los aportes de la comunidad se envían a Sam por correo; no se publican automáticamente.")}</li>
          <li>{trChoice(locale, "When welcome emails are enabled, we send one account welcome email through Resend. Signing up does not subscribe you to recurring marketing emails.", "Cuando los correos de bienvenida están habilitados, enviamos un correo de bienvenida a tu cuenta mediante Resend. Registrarte no te suscribe a correos de marketing periódicos.")}</li>
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
      <p className="mb-4">{trChoice(locale,
        "When welcome emails are enabled, we share your verified primary email address and optional first name with Resend to send one welcome email explaining how to use Itzli. We temporarily store the pending email for delivery retries and clear its address, greeting, and body once Resend accepts it or your account is deleted. Stale pending emails are cleared on the next retry. We retain a hashed account identifier and delivery receipt to prevent duplicate welcomes; deleting your account clears the receipt and leaves only a hashed deletion marker to prevent late account events from sending another welcome. This is an account welcome, not a recurring marketing subscription. Local review and preview environments do not send it.",
        "Cuando los correos de bienvenida están habilitados, compartimos tu dirección de correo principal verificada y tu nombre opcional con Resend para enviar un correo de bienvenida que explica cómo usar Itzli. Guardamos temporalmente el correo pendiente para reintentar el envío y borramos su dirección, saludo y contenido cuando Resend lo acepta o se elimina tu cuenta. Los correos pendientes antiguos se borran en el siguiente reintento. Conservamos un identificador de cuenta con hash y el comprobante del envío para evitar bienvenidas duplicadas; al eliminar tu cuenta, borramos el comprobante y dejamos solo un marcador de eliminación con hash para impedir que eventos tardíos de la cuenta envíen otra bienvenida. Es una bienvenida a tu cuenta, no una suscripción a marketing periódico. Los entornos de revisión local y vista previa no la envían.")}</p>

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">{tr(locale, "Learning progress (Neon Postgres)")}</h3>
      <p className="mb-4">
        {trChoice(locale,
          "When you sign in, we store your lesson completions, quiz accuracy, spaced-repetition state, vocabulary practice, vocabulary bookmarks and vocabulary notes in our database, keyed to your Clerk user ID, so they can sync across devices. Vocabulary notes contain the text you choose to save. Your personal expression notebook and unfinished conversation checkpoints remain on your device. Guest progress also stays on the device.",
          "Cuando inicias sesión, guardamos tus lecciones completadas, precisión en cuestionarios, estado de repetición espaciada, práctica de vocabulario, palabras marcadas y notas de vocabulario en nuestra base de datos, vinculados a tu ID de usuario de Clerk, para sincronizarlos entre dispositivos. Las notas de vocabulario contienen el texto que decides guardar. Tu cuaderno personal de expresiones y los puntos de reanudación de conversaciones sin terminar permanecen en tu dispositivo. El progreso de invitados también permanece en el dispositivo.")}
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

      <h3 className="text-base font-semibold text-stone-900 mt-6 mb-2">{trChoice(locale, "Course reports and community feedback", "Reportes del curso y aportes de la comunidad")}</h3>
      <p className="mb-4">{trChoice(locale,
        "If you choose to submit a report, it includes your written explanation, any suggested correction, your interface language, and the page or lesson context shown in the form. Your name, reply email, community or regional variety, and whether you speak Eastern Huasteca Nahuatl are optional. We do not require ancestry information or photographs. Speaker information is self-reported and does not establish verified authority.",
        "Si decides enviar un reporte, este incluye tu explicación, la corrección que sugieras, el idioma de la interfaz y el contexto de la página o lección que muestra el formulario. Tu nombre, correo para recibir respuesta, comunidad o variante regional y si hablas náhuatl de la Huasteca veracruzana son opcionales. No pedimos información sobre ascendencia ni fotografías. La información como hablante es declarada por ti y no constituye una autoridad verificada.")}</p>
      <p className="mb-4">{trChoice(locale,
        "When email delivery in the app is enabled, reports from signed-in learners are sent through Resend to admin@itzli.app for Sam to review. Your account ID is used for report-rate counters, and a hash derived from it is included in the provider's duplicate-prevention key. The raw account ID is not included in the report email, and the report text is not stored in our database. Local review can send reports only when the owner explicitly enables delivery; it uses temporary local counters without account authentication or database writes. Deployment previews do not send reports. If submission fails, the form keeps your entries so you can retry.",
        "Cuando está habilitado el envío de correo en la aplicación, los reportes de estudiantes con sesión iniciada se envían mediante Resend a admin@itzli.app para que Sam los revise. Tu ID de cuenta se usa en los contadores de frecuencia de reportes, y un hash derivado de ese ID se incluye en la clave del proveedor para evitar envíos duplicados. El ID de cuenta sin procesar no se incluye en el correo del reporte y el texto del reporte no se guarda en nuestra base de datos. La revisión local puede enviar reportes solo cuando el propietario habilita el envío explícitamente; usa contadores locales temporales sin autenticación de cuenta ni escrituras en la base de datos. Las versiones preliminares del despliegue no envían reportes. Si el envío falla, el formulario conserva tus datos para que puedas reintentarlo.")}</p>
      <p className="mb-4">{trChoice(locale,
        "Reports are reviewed before any course change and are not published automatically. Contact details are used to reply about your report or community connection only when you choose to allow contact. Send only information you want Sam to review. You can request access to or deletion of your report by emailing the contact address below; reports received by email are retained there until no longer needed for review or follow-up, or until a deletion request is fulfilled.",
        "Revisamos los reportes antes de cambiar el curso y no los publicamos automáticamente. Usamos los datos de contacto para responder sobre tu reporte o conexión con la comunidad solo si permites que te contactemos. Envía únicamente información que quieras que Sam revise. Puedes solicitar acceso a tu reporte o su eliminación escribiendo al correo de contacto de abajo; los reportes recibidos por correo se conservan allí hasta que ya no sean necesarios para la revisión o el seguimiento, o hasta que se atienda una solicitud de eliminación.")}</p>

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
        <li><strong>Resend</strong> — {trChoice(locale, "delivers account welcome emails and course reports when their respective features are enabled", "entrega correos de bienvenida a la cuenta y reportes del curso cuando sus respectivas funciones están habilitadas")}{" "}<a href="https://resend.com/legal/privacy-policy" className="text-emerald-600 underline" target="_blank" rel="noopener noreferrer">{tr(locale, "Privacy Policy")}</a></li>
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
