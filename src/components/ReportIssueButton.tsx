"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Flag, X } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";
import { localizedPathname } from "@/i18n/config";
import {
  parseContentReport, REPORT_CATEGORIES, REPORT_RECIPIENT,
  type ContentReport, type ReportCategory, type ReportContext,
} from "@/lib/content-report";

type Props = { context?: ReportContext; category?: ReportCategory; label?: string; className?: string };
type Status = "idle" | "submitting" | "sent" | "error";

/** Reporting is separate from lesson answers, scoring, and learner progress. */
export default function ReportIssueButton({ context, category = "lesson", label, className }: Props) {
  const { locale } = useLocale();
  const es = locale === "es";
  const pathname = usePathname();
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const detailsField = useRef<HTMLTextAreaElement>(null);
  const submission = useRef<{ fingerprint: string; id: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>(category);
  const [form, setForm] = useState(context?.form ?? "");
  const [details, setDetails] = useState("");
  const [correction, setCorrection] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [speaker, setSpeaker] = useState(false);
  const [community, setCommunity] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const categoryLabels: Record<ReportCategory, string> = es
    ? { word: "Palabra o significado", grammar: "Gramática o uso", audio: "Audio o pronunciación", image: "Imagen", lesson: "Lección", technical: "Problema técnico", community: "Corrección o contacto de la comunidad" }
    : { word: "Word or meaning", grammar: "Grammar or usage", audio: "Audio or pronunciation", image: "Image", lesson: "Lesson", technical: "Technical problem", community: "Community correction or connection" };

  useEffect(() => {
    if (!open || !dialog.current) return;
    dialog.current.showModal();
    detailsField.current?.focus();
  }, [open]);

  function edited() {
    setStatus("idle"); setMessage("");
  }

  function report(): ContentReport | null {
    const payload = { locale, category: selectedCategory,
      context: { ...(context ?? {}), pagePath: context?.pagePath ?? localizedPathname(pathname || "/", locale), form: (context?.form ?? form).trim() || undefined },
      details, correction, reporterName, replyEmail, speaker, community, contactConsent, website };
    const fingerprint = JSON.stringify(payload);
    if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, id: crypto.randomUUID() };
    return parseContentReport({ ...payload, submissionId: submission.current.id });
  }

  function deliveryFailed() {
    setStatus("error"); setMessage(es
      ? "No se pudo confirmar el envío. Tus datos siguen aquí. Intenta enviar el informe de nuevo."
      : "Submission could not be confirmed. Your entries are still here. Please try submitting the report again.");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    const reportValue = report();
    if (!reportValue) {
      setStatus("error"); setMessage(es
        ? "Describe el problema con al menos 8 caracteres. Revisa el correo opcional y añade uno si autorizas que te contactemos."
        : "Describe the problem in at least 8 characters. Check the optional email, and add one if you allow us to contact you.");
      return;
    }
    setStatus("submitting"); setMessage("");
    try {
      const response = await fetch("/api/content-reports", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportValue), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (response.ok && result.delivery === "server" && result.submitted === true && result.reportId === reportValue.submissionId) {
        setStatus("sent"); setMessage(es ? "Tu informe se presentó para que Sam lo revise. Gracias por ayudar a mejorar el curso."
          : "Your report was submitted for Sam to review. Thank you for helping improve the course.");
      } else if (response.status === 429) {
        setStatus("error"); setMessage(es ? "Has enviado varios informes recientemente. Intenta de nuevo más tarde. Tus datos siguen aquí."
          : "You have submitted several reports recently. Please try again later. Your entries are still here.");
      } else if (response.status === 401) {
        setStatus("error"); setMessage(es ? "Inicia sesión para enviar tu informe. Tus datos siguen aquí; vuelve a intentarlo después de iniciar sesión."
          : "Sign in to submit your report. Your entries are still here; please try again after signing in.");
      } else if (response.status === 400) {
        setStatus("error"); setMessage(es ? "No se pudo validar el informe. Revisa los campos; tus datos siguen aquí."
          : "The report could not be validated. Check the fields; your entries are still here.");
      } else {
        deliveryFailed();
      }
    } catch {
      deliveryFailed();
    }
  }

  const fieldClass = "mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600";
  const disabled = status === "submitting";
  return <>
    <button ref={trigger} type="button" onClick={() => setOpen(true)} className={className ?? "inline-flex items-center gap-1.5 rounded-md px-1 py-2 text-xs font-semibold text-stone-500 transition hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"}>
      <Flag size={13} aria-hidden="true" />{label ?? (es ? "Reportar un error o problema" : "Report an error or problem")}
    </button>
    {open && createPortal(<dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`}
      onClose={() => { setOpen(false); trigger.current?.focus(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-stone-200 bg-[#fffdf7] p-5 text-stone-900 shadow-2xl backdrop:bg-black/50 sm:p-7">
      <div className="flex items-start justify-between gap-4"><h2 id={`${id}-title`} className="font-serif text-2xl font-bold">{es ? "Ayúdanos a mejorar Itzli" : "Help improve Itzli"}</h2>
        <button type="button" onClick={() => dialog.current?.close()} aria-label={es ? "Cerrar informe" : "Close report"} className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100"><X size={20} /></button></div>
      <p id={`${id}-intro`} className="mt-3 text-sm leading-6 text-stone-600">{es
        ? "Sam agradece las correcciones, especialmente de hablantes de náhuatl de la Huasteca oriental. Cada informe se revisa antes de cambiar el curso."
        : "Sam welcomes corrections, especially from Eastern Huasteca Nahuatl speakers. Every report is reviewed before the course changes."}</p>
      {context?.lessonTitle && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{context.lessonTitle}</p>}
      <form onSubmit={submit} className="mt-5 space-y-5">
        <fieldset disabled={disabled} className="space-y-5 disabled:opacity-70">
          <label className="block text-sm font-semibold">{es ? "¿Qué necesita revisión?" : "What needs review?"}<select value={selectedCategory} onChange={event => { setSelectedCategory(event.target.value as ReportCategory); edited(); }} className={fieldClass}>{REPORT_CATEGORIES.map(value => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label>
          <label className="block text-sm font-semibold">{es ? "Palabra o frase (opcional)" : "Word or phrase (optional)"}<input value={context?.form ?? form} readOnly={Boolean(context?.form)} maxLength={600} onChange={event => { setForm(event.target.value); edited(); }} className={fieldClass} autoComplete="off" /></label>
          {context?.meaning && <p className="text-xs leading-5 text-stone-500">{es ? "Significado mostrado:" : "Meaning shown:"} {context.meaning}</p>}
          <label className="block text-sm font-semibold">{es ? "Describe el error o problema" : "Describe the error or problem"}<textarea ref={detailsField} required minLength={8} maxLength={3000} rows={4} value={details} onChange={event => { setDetails(event.target.value); edited(); }} className={fieldClass} /></label>
          <label className="block text-sm font-semibold">{es ? "Corrección sugerida y cómo se usa (opcional)" : "Suggested correction and how it is used (optional)"}<textarea maxLength={1200} rows={2} value={correction} onChange={event => { setCorrection(event.target.value); edited(); }} className={fieldClass} /></label>
          <details open={selectedCategory === "community"} className="rounded-xl border border-stone-200 bg-white/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-stone-600">{es ? "Datos de hablante y contacto (opcionales)" : "Speaker and contact details (optional)"}</summary>
            <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={speaker} onChange={event => { setSpeaker(event.target.checked); edited(); }} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" /><span>{es ? "Hablo náhuatl de la Huasteca oriental." : "I speak Eastern Huasteca Nahuatl."}</span></label>
            <label className="mt-4 block text-sm font-semibold">{es ? "Comunidad o variante regional (opcional)" : "Community or regional variety (optional)"}<input maxLength={180} value={community} onChange={event => { setCommunity(event.target.value); edited(); }} className={fieldClass} /></label>
            <p className="mt-3 text-xs leading-5 text-stone-600">{es ? "Las formas pueden variar entre comunidades. Cuéntanos cómo se dice donde tú vives; Sam está abierto a aprender y a conectar con la comunidad."
              : "Forms can vary between communities. Tell us how people say it where you live; Sam is open to learning and connecting with the community."}</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">{es ? "Tu nombre (opcional)" : "Your name (optional)"}<input maxLength={100} value={reporterName} onChange={event => { setReporterName(event.target.value); edited(); }} className={fieldClass} autoComplete="name" /></label>
            <label className="block text-sm font-semibold">{es ? "Tu correo (opcional)" : "Your email (optional)"}<input type="email" required={contactConsent} maxLength={254} value={replyEmail} onChange={event => { setReplyEmail(event.target.value); edited(); }} className={fieldClass} autoComplete="email" /></label></div>
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={contactConsent} onChange={event => { setContactConsent(event.target.checked); edited(); }} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" /><span>{es ? "Sam puede contactarme por correo sobre este informe o para conectar con la comunidad." : "Sam may email me about this report or to connect with the community."}</span></label>
            </div>
          </details>
          <div hidden aria-hidden="true"><label>{es ? "Sitio web" : "Website"}<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
        </fieldset>
        <p className="text-xs leading-5 text-stone-500">{es ? "El informe, la página y los datos opcionales que incluyas se enviarán al correo de administración de Itzli para que Sam los revise. No incluyas contraseñas ni información privada de otras personas." : "The report, page, and optional details you provide will go to Itzli’s admin email for Sam to review. Do not include passwords or other people’s private information."} <span className="break-all">{REPORT_RECIPIENT}</span></p>
        {message && <p role={status === "error" ? "alert" : "status"} className={`rounded-lg p-3 text-sm leading-6 ${status === "sent" ? "bg-emerald-100 text-emerald-950" : "bg-amber-50 text-amber-900"}`}>{message}</p>}
        <div className="flex flex-wrap gap-3"><button type="submit" disabled={disabled || status === "sent"} className="button-primary disabled:opacity-50">{disabled ? (es ? "Enviando informe…" : "Submitting report…") : (es ? "Enviar para revisión" : "Submit for review")}</button><button type="button" onClick={() => dialog.current?.close()} className="button-secondary">{es ? "Cerrar" : "Close"}</button></div>
      </form>
    </dialog>, document.body)}
  </>;
}
