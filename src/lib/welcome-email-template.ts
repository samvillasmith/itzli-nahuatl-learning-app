import { localizedPathname } from "../i18n/config";

export type WelcomeEmailContent = { subject: string; text: string; html: string };

function safeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

/** Only the greeting is personalized; every link and email header is fixed. */
export function welcomeEmailContent(firstName: unknown, locale: "en" | "es"): WelcomeEmailContent {
  const name = safeName(firstName);
  const spanish = locale === "es";
  const greeting = spanish ? (name ? `¡Hola, ${name}!` : "¡Hola!") : (name ? `Hi ${name},` : "Hi there,");
  const title = spanish ? "Bienvenido a Itzli" : "Welcome to Itzli";
  const subject = spanish ? "¡Gracias por unirte a Itzli! Tu viaje con el náhuatl empieza aquí" : "Thank you for joining Itzli! Your Nahuatl journey starts here";
  const paragraphs = spanish ? [
    "¡Gracias por registrarte! Nos alegra acompañarte en el aprendizaje del náhuatl de la Huasteca oriental.",
    "Itzli es gratis y reúne 324 lecciones y 1,724 palabras y formas. Aprende paso a paso con vocabulario, gramática, ejercicios de escucha, conversaciones, tarjetas de repaso y práctica espaciada que te ayuda a recordar lo aprendido.",
    "La versión 3.0 amplía el curso con significados revisados, fuentes y procedencia más claras, e imágenes para aprender. Escucha las grabaciones originales cuando están disponibles; el audio sintético complementario está identificado y utiliza una pronunciación revisada para la práctica.",
    "Ya sea que busques reconectar con tu herencia indígena y con las culturas nahua y mexica, o que estés descubriendo el idioma por primera vez, eres bienvenido. Este proyecto es un regalo para las comunidades nahuas y para todas las personas que quieren aprender y honrar las lenguas indígenas.",
    "Empieza con una lección, escucha cada palabra y avanza a tu ritmo. Tu cuenta te permite guardar tu progreso y continuar aprendiendo.",
  ] : [
    "Thank you for signing up! We're excited to join you as you learn Eastern Huasteca Nahuatl.",
    "Itzli is free, with 324 lessons and 1,724 words and forms. Build your skills step by step through vocabulary, grammar, listening exercises, conversations, flashcards, and spaced practice that helps you remember what you learn.",
    "Version 3.0 expands the course with reviewed meanings, clearer sources and provenance, and learning images. Listen to original source recordings wherever available; supplementary synthetic audio is labeled and uses reviewed pronunciation for practice.",
    "Whether you're reconnecting with Indigenous heritage and Nahua and Mexica culture or discovering the language for the first time, you belong here. This project is a gift to Nahua communities and everyone who wants to learn and honor Indigenous languages.",
    "Start with a lesson, listen to each word, and move at your own pace. Your account lets you save your progress and keep learning.",
  ];
  const lessonsUrl = `https://www.itzli.app${localizedPathname("/units", locale)}`;
  const sourcesUrl = `https://www.itzli.app${localizedPathname("/source-course", locale)}`;
  const button = spanish ? "Empieza a aprender" : "Start learning";
  const sourcesLabel = spanish ? "Explora el curso y sus fuentes" : "Explore the course and its sources";
  const closing = spanish ? "Gracias por formar parte de Itzli.\nEl equipo de Itzli" : "Thank you for being part of Itzli.\nThe Itzli team";
  const footer = spanish ? "Recibes este único correo de bienvenida porque creaste una cuenta de Itzli." : "You're receiving this one-time welcome because you created an Itzli account.";
  const text = [greeting, ...paragraphs, `${button}: ${lessonsUrl}`, `${sourcesLabel}: ${sourcesUrl}`, closing, "admin@itzli.app", footer].join("\n\n");
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f4f7f5;color:#18382a;font-family:Arial,Helvetica,sans-serif;line-height:1.6"><main style="max-width:600px;margin:24px auto;background:#fff;border-radius:16px;padding:32px"><p style="font-weight:bold;color:#047857;letter-spacing:2px">ITZLI · VERSION 3.0</p><h1 style="font-size:28px;line-height:1.2">${title}</h1><p>${escapeHtml(greeting)}</p>${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}<p style="margin:28px 0"><a href="${lessonsUrl}" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;border-radius:8px;padding:12px 22px;font-weight:bold">${button}</a></p><p><a href="${sourcesUrl}" style="color:#047857">${sourcesLabel}</a></p><p>${closing.replace("\n", "<br>")}<br><a href="mailto:admin@itzli.app" style="color:#047857">admin@itzli.app</a></p><hr style="border:0;border-top:1px solid #dce7e0"><p style="font-size:12px;color:#557064">${footer}</p></main></body></html>`;
  return { subject, text, html };
}
