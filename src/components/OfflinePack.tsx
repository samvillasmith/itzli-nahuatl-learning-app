"use client";
import { useEffect,useState } from "react";
import { Download, WifiOff, Check } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";
import offlineWords from "@/data/learner-offline-words.json";
import type { LexicalEntry } from "@/data/lexical-registry";
import { getConversationScenarios } from "@/data/learner-conversations";
import { getProgressAccount } from "@/lib/progress";
import { importOfflineAttempts } from "@/lib/offline-attempts";
import { pushToCloud } from "@/lib/cloudSync";
import { buildOfflineCoursePack } from "@/lib/course-export-notices";
import { GENERATED_AUDIO_ASSETS } from "@/lib/generated-audio";
import { preloadSourceAudio } from "@/lib/source-audio-preload";
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
const getExpansionEntries = () => offlineWords as LexicalEntry[];
const practiceAudioMegabytes = Math.round(GENERATED_AUDIO_ASSETS.reduce((total, asset) => total + (asset.byte_length ?? 0), 0) / 1_000_000);
export default function OfflinePack(){
 const{locale}=useLocale();const es=locale==="es";const[message,setMessage]=useState("");const[saving,setSaving]=useState(false);const[practiceAudio,setPracticeAudio]=useState(false);const[audio,setAudio]=useState(false);const[install,setInstall]=useState<InstallEvent|null>(null);
 const words=getExpansionEntries();const scenarios=getConversationScenarios();const urls=[...new Set(words.map(w=>w.audio.url))];
 useEffect(()=>{
  if('serviceWorker'in navigator)void navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
  const handler=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent);};
  window.addEventListener('beforeinstallprompt',handler);
  const summary=importOfflineAttempts(new Set(getExpansionEntries().map(w=>`word:${w.cardId}`)));
  if(summary.imported)void pushToCloud();
  if(summary.storageError)setMessage(es?"Tus intentos sin conexión siguen guardados para reintentar la importación. Comprueba el espacio del navegador.":"Your offline attempts remain saved for another import attempt. Check browser storage space.");
  return()=>window.removeEventListener('beforeinstallprompt',handler);
 },[es]);
 async function save() {
  setSaving(true);
  try {
   const scope=encodeURIComponent(getProgressAccount()??"guest");
   const payload=buildOfflineCoursePack(words,scenarios,{savedAt:new Date().toISOString(),scope,locale});
   localStorage.setItem('itzli_offline_course_v3',JSON.stringify(payload));
   localStorage.setItem('itzli_offline_scope_v3',scope);
   if ('caches' in window) {
    const cache=await caches.open('itzli-public-v3-1');
    await cache.addAll(['/offline.html','/nahuatl-orthography.js','/offline-audio.js','/generated-course-audio.json']);
    if (practiceAudio && GENERATED_AUDIO_ASSETS.length) window.dispatchEvent(new Event("itzli-course-audio-download"));
    const originals=audio?await preloadSourceAudio(urls,{priority:2}):null;
    setMessage(es
     ? `Texto guardado.${practiceAudio&&GENERATED_AUDIO_ASSETS.length?" La descarga opcional del audio de práctica comenzó; puedes ver el progreso y pausarla al pie de la página.":""}${originals?` ${originals.prepared} de ${originals.total} grabaciones originales preparadas para escuchar en línea; el navegador controla cuánto tiempo las conserva.`:""}`
     : `Text saved.${practiceAudio&&GENERATED_AUDIO_ASSETS.length?" The optional practice audio download has started; see its progress and pause it at the bottom of the page.":""}${originals?` ${originals.prepared} of ${originals.total} original recordings prepared for online playback; your browser controls how long it keeps them.`:""}`);
   } else setMessage(practiceAudio ? (es?"Texto guardado. Este navegador no permite guardar audio sin conexión.":"Text saved. This browser cannot store offline audio.") : (es?"Texto guardado.":"Text saved."));
  } catch {
   setMessage(es?"No se pudo completar la descarga. Comprueba el espacio del navegador y tu conexión.":"Could not complete the download. Check browser storage space and your connection.");
  } finally { setSaving(false); }
 }
 return <section className="surface p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-6"><div className="max-w-2xl"><WifiOff size={25} className="text-emerald-700"/><h2 className="mt-4 text-2xl font-black">{es?"Lleva tu aprendizaje contigo":"Take your learning with you"}</h2><p className="mt-3 text-sm leading-6 text-stone-500">{es?`Guarda ${words.length} palabras y ${scenarios.length} situaciones para practicar sin conexión. El paquete conserva el crédito y los derechos de la fuente. Los intentos se incorporan a tu repaso cuando vuelves a esta página.`:`Save ${words.length} words and ${scenarios.length} situations for offline practice. The pack retains source attribution and rights. Attempts enter your review when you return to this page.`}</p>
 {GENERATED_AUDIO_ASSETS.length > 0 && <label className="mt-4 flex items-center gap-2 text-xs text-stone-600"><input type="checkbox" checked={practiceAudio} onChange={e=>setPracticeAudio(e.target.checked)}/>{es?`Incluir audio de práctica para escuchar sin conexión (aprox. ${practiceAudioMegabytes} MB)`:`Include practice audio for offline listening (about ${practiceAudioMegabytes} MB)`}</label>}
 <label className="mt-3 flex items-center gap-2 text-xs text-stone-600"><input type="checkbox" checked={audio} onChange={e=>setAudio(e.target.checked)}/>{es?`Preparar ${urls.length} grabaciones originales para escuchar en línea (usa más datos)`:`Prepare ${urls.length} original recordings for online playback (uses more data)`}</label></div><div className="flex flex-wrap gap-3"><button onClick={()=>void save()} disabled={saving} className="button-primary disabled:opacity-50"><Download size={16}/>{saving?(es?"Guardando…":"Saving…"):(es?"Guardar paquete":"Save offline pack")}</button><a href="/offline.html" className="button-secondary">{es?"Abrir práctica sin conexión":"Open offline practice"}</a>{install&&<button onClick={()=>void install.prompt().then(()=>install.userChoice).then(()=>setInstall(null))} className="button-secondary">{es?"Instalar Itzli":"Install Itzli"}</button>}</div></div>{message&&<p role="status" className="mt-4 flex items-center gap-2 text-xs text-emerald-700"><Check size={14}/>{message}</p>}</section>;
}
