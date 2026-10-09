import type { AppLocale } from "@/i18n/config";
import { trChoice } from "@/i18n/translate";
import ReportIssueButton from "@/components/ReportIssueButton";

export function WhyNahuatl({ locale }: { locale: AppLocale }) {
  return <section id="why-nahuatl" aria-labelledby="why-nahuatl-heading" className="grid scroll-mt-28 gap-8 border-y border-stone-200 py-10 sm:py-14 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
    <div>
      <p className="eyebrow">{trChoice(locale, "Why Nahuatl?", "¿Por qué náhuatl?")}</p>
      <h2 id="why-nahuatl-heading" className="display-title mt-4 text-3xl text-stone-950 sm:text-4xl">{trChoice(locale, "A shared language. A living future.", "Una lengua compartida. Un futuro vivo.")}</h2>
    </div>
    <div className="space-y-5 text-base leading-7 text-stone-600">
      <p>{trChoice(locale,
        "Nahuatl once served as a lingua franca across much of Mesoamerica: a language that connected different peoples. It is still a living language, carried forward by Nahua communities today.",
        "El náhuatl fue una lengua franca en gran parte de Mesoamérica: una lengua que conectaba a distintos pueblos. Sigue siendo una lengua viva, que las comunidades nahuas mantienen y transmiten hoy.")}</p>
      <p>{trChoice(locale,
        "If you are Indigenous, learning Nahuatl can be part of reconnecting with the identity and history of the Americas. My hope is to help revive its role as a shared language: a way for Indigenous people to understand one another, even if we are not all Nahua, alongside the languages and traditions of our own communities.",
        "Si eres indígena, aprender náhuatl puede ser parte de un reencuentro con la identidad y la historia de las Américas. Mi esperanza es ayudar a recuperar su papel como lengua compartida: una forma de que los pueblos indígenas nos entendamos, aunque no todos seamos nahuas, junto con las lenguas y tradiciones de nuestras propias comunidades.")}</p>
      <p>{trChoice(locale,
        "If you are not Indigenous, you can help preserve a language with deep historical significance and support its survival and growth. Learning it with respect brings greater visibility to the people who call this language theirs.",
        "Si no eres indígena, puedes ayudar a preservar una lengua de profunda importancia histórica y apoyar su continuidad y crecimiento. Aprenderla con respeto da mayor visibilidad a los pueblos a los que pertenece.")}</p>
      <p>{trChoice(locale,
        "Either way, you are helping bring Nahuatl forward. It can become something special in your own life, too: a way to express yourself, connect with people in new ways, and make room for an Indigenous language in our shared future.",
        "En ambos casos, ayudas a llevar el náhuatl hacia el futuro. También puede convertirse en algo especial en tu propia vida: una forma de expresarte, conectar con otras personas de nuevas maneras y dar lugar a una lengua indígena en nuestro futuro compartido.")}</p>
      <p className="text-sm leading-6 text-stone-500">{trChoice(locale,
        "Itzli teaches Eastern Huasteca Nahuatl, drawing on sources for the speech of Chicontepec, Veracruz. Nahua communities have distinct regional varieties, each with its own speakers and traditions.",
        "Itzli enseña náhuatl de la Huasteca veracruzana a partir de fuentes del habla de Chicontepec, Veracruz. Las comunidades nahuas tienen distintas variantes regionales, cada una con sus hablantes y tradiciones.")}{" "}<a href="https://atlas.inali.gob.mx/agrupaciones/info/0211" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-700 underline">{trChoice(locale, "Explore Nahuatl with INALI", "Conoce el náhuatl con el INALI")}</a></p>
    </div>
  </section>;
}

export function CourseDedicationNote({ locale }: { locale: AppLocale }) {
  return <aside id="dedication" role="note" aria-labelledby="dedication-heading" className="scroll-mt-28 border-t border-stone-200 pt-6">
    <div className="max-w-3xl space-y-3 text-sm leading-6 text-stone-500">
      <h2 id="dedication-heading" className="text-sm font-semibold text-stone-700">{trChoice(locale, "A personal dedication", "Una dedicatoria personal")}</h2>
      <p>{trChoice(locale,
        "I dedicate Itzli to my grandmother, Maria Villa (1915–2018), an Indigenous woman who taught me everything.",
        "Dedico Itzli a mi abuela, Maria Villa (1915–2018), una mujer indígena que me enseñó todo.")}</p>
      <p>{trChoice(locale,
        "I made this course so people can express their thoughts, have real conversations, and live in Nahuatl. It is my gift to our Nahua people, and a way to carry what my grandmother gave me into the future.",
        "Creé este curso para que las personas puedan expresar sus pensamientos, tener conversaciones reales y vivir en náhuatl. Es mi regalo para nuestros pueblos nahuas y una forma de llevar al futuro lo que mi abuela me dio.")}</p>
      <p className="font-medium text-stone-600">— Sam Villa-Smith, PhD</p>
    </div>
  </aside>;
}

export function CommunityFeedbackInvitation({ locale }: { locale: AppLocale }) {
  return <section id="community-feedback" aria-labelledby="community-feedback-heading" className="scroll-mt-28 rounded-2xl border border-stone-200 bg-emerald-50/40 p-6 sm:p-8">
    <div className="max-w-3xl space-y-4">
      <h2 id="community-feedback-heading" className="text-xl font-bold text-stone-900">{trChoice(locale, "Help us teach the language faithfully.", "Ayúdanos a enseñar la lengua con fidelidad.")}</h2>
      <p className="text-sm leading-7 text-stone-600">{trChoice(locale,
        "Do you speak Eastern Huasteca Nahuatl? I welcome your corrections to vocabulary, grammar, and pronunciation, and examples of usage from your community. If you would like to connect or help improve the course, I would love to hear from you.",
        "¿Hablas náhuatl de la Huasteca veracruzana? Agradezco tus correcciones de vocabulario, gramática y pronunciación, y los ejemplos de uso de tu comunidad. Si quieres ponerte en contacto o ayudar a mejorar el curso, me dará mucho gusto escucharte.")}</p>
      <p className="text-sm leading-7 text-stone-600">{trChoice(locale,
        "I am happy to be told I am wrong. Suggestions are reviewed before they change the course. Anyone can report a problem; sharing your name, contact details, and community is optional.",
        "Estoy dispuesto a reconocer cuando me equivoco. Revisamos las sugerencias antes de cambiar el curso. Cualquier persona puede reportar un problema; compartir tu nombre, datos de contacto y comunidad es opcional.")}{" "}<span className="whitespace-nowrap">— Sam Villa-Smith</span></p>
      <ReportIssueButton category="community" label={trChoice(locale, "Share a correction or connect", "Comparte una corrección o ponte en contacto")} className="button-secondary !px-4 !py-2.5 text-sm" />
    </div>
  </section>;
}

export function CommunitySupport({ locale }: { locale: AppLocale }) {
  const organizations = [
    {
      name: "Fondo para la Paz, I.A.P.",
      url: "https://fondoparalapaz.org/haz-una-donacion/",
      evidence: "https://fondoparalapaz.org/quienes-somos/",
      region: trChoice(locale, "Veracruz · Huasteca Potosina", "Veracruz · Huasteca potosina"),
      description: trChoice(locale,
        "Works with Indigenous communities on safe water, education, food security, and livelihoods. Its work includes communities in Veracruz and the Huasteca Potosina.",
        "Trabaja con comunidades indígenas en agua segura, educación, seguridad alimentaria y medios de vida. Su labor incluye comunidades de Veracruz y la Huasteca potosina."),
    },
    {
      name: "Fundación Corazón Raíz, A.C.",
      url: "https://corazonraiz.org/donar/",
      evidence: "https://corazonraiz.org/conocenos/",
      region: trChoice(locale, "Nahua communities · Veracruz", "Comunidades nahuas · Veracruz"),
      description: trChoice(locale,
        "Supports education in Indigenous and rural communities, including Nahua communities in Zongolica, Veracruz. Its Mujeres Semilla project offers job training for Nahua women.",
        "Apoya la educación en comunidades indígenas y rurales, incluidas comunidades nahuas de Zongolica, Veracruz. Su proyecto Mujeres Semilla ofrece formación para el empleo a mujeres nahuas."),
    },
  ];
  return <section id="support-communities" aria-labelledby="community-support-heading" className="scroll-mt-28 space-y-6">
    <div className="max-w-3xl">
      <p className="eyebrow">{trChoice(locale, "Carry it forward", "Dale continuidad")}</p>
      <h2 id="community-support-heading" className="display-title mt-4 text-3xl text-stone-950 sm:text-4xl">{trChoice(locale, "Support the people behind the language.", "Apoya a los pueblos que mantienen viva la lengua.")}</h2>
      <p className="mt-5 leading-7 text-stone-600">{trChoice(locale,
        "Learning is one way to help. If you can, support organizations working with Indigenous communities in Mexico. Explore their work and donate directly through their own websites.",
        "Aprender es una forma de ayudar. Si puedes, apoya a organizaciones que trabajan con comunidades indígenas en México. Conoce su trabajo y dona directamente en sus propios sitios web.")}</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {organizations.map(organization => <article key={organization.name} className="flex flex-col rounded-2xl border border-stone-200 bg-white/80 p-6 sm:p-8">
        <p className="mb-3 text-xs font-bold text-emerald-800">{organization.region}</p>
        <h3 className="text-xl font-black text-stone-950">{organization.name}</h3>
        <p className="mt-3 flex-1 text-sm leading-7 text-stone-600">{organization.description}</p>
        {organization.evidence && <a href={organization.evidence} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm font-semibold text-emerald-700 underline">{trChoice(locale, "Read about their work", "Conoce su trabajo")}</a>}
        <a href={organization.url} target="_blank" rel="noopener noreferrer" className="button-primary mt-6 w-fit !px-5 !py-3">{trChoice(locale, "Donate on their website", "Donar en su sitio web")} →</a>
      </article>)}
    </div>
  </section>;
}
