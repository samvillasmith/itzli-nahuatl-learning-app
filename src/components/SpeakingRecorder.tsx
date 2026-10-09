"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Download } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";
import { activateCourseAudio, releaseCourseAudio } from "@/lib/audio";

/** Personal recordings stay in memory until downloaded; never sent to a server. */
export default function SpeakingRecorder({ onRecorded }: { onRecorded?: () => void }) {
  const {locale} = useLocale();
  const [recording,setRecording] = useState(false);
  const [url,setUrl] = useState<string|null>(null);
  const [error,setError] = useState("");
  const recorder = useRef<MediaRecorder|null>(null);
  const stream = useRef<MediaStream|null>(null);
  const objectUrl = useRef<string|null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const alive = useRef(true);
  const [extension, setExtension] = useState("webm");
  useEffect(() => { alive.current=true; return () => { alive.current=false; if(timer.current)clearTimeout(timer.current); if(recorder.current?.state==="recording")recorder.current.stop(); stream.current?.getTracks().forEach(t=>t.stop()); if(objectUrl.current)URL.revokeObjectURL(objectUrl.current); }; }, []);
  function stop() { if(recorder.current?.state==="recording")recorder.current.stop(); stream.current?.getTracks().forEach(t=>t.stop()); if(timer.current)clearTimeout(timer.current); }
  async function start() {
    setError("");
    try {
      if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==="undefined")throw new Error("unsupported");
      const input=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!alive.current){input.getTracks().forEach(t=>t.stop());return;}
      stream.current=input;
      const mime=["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"].find(type=>MediaRecorder.isTypeSupported(type));
      const capture=new MediaRecorder(input,mime?{mimeType:mime}:undefined);
      recorder.current=capture;
      const chunks:BlobPart[]=[];
      capture.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      capture.onstop=()=>{
        input.getTracks().forEach(t=>t.stop());
        if(!alive.current)return;
        if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);
        const blob=new Blob(chunks,{type:capture.mimeType});
        setExtension(capture.mimeType.includes("mp4")?"m4a":capture.mimeType.includes("ogg")?"ogg":"webm");
        objectUrl.current=URL.createObjectURL(blob);setUrl(objectUrl.current);setRecording(false);onRecorded?.();
      };
      capture.start();setRecording(true);timer.current=setTimeout(stop,90000);
    } catch { setError(locale==="es"?"No se pudo abrir el micrófono. Revisa el permiso del navegador; también puedes practicar en voz alta sin grabarte.":"Could not open your microphone. Check browser permission; you can also practice aloud without recording.");stop();setRecording(false); }
  }
  return <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">{locale==="es"?"Tu voz, tus palabras":"Your voice, your words"}</p><p className="mt-1 text-xs text-stone-500">{locale==="es"?"Máximo 90 segundos. Tu grabación se queda en este dispositivo.":"Up to 90 seconds. Your recording stays on this device."}</p></div><button type="button" onClick={recording?stop:()=>void start()} className={`button-secondary ${recording?"!border-red-300 !text-red-700":""}`}>{recording?<Square size={16}/>:<Mic size={16}/>} {locale==="es"?(recording?"Terminar":"Grabar mi voz"):(recording?"Stop recording":"Record my voice")}</button></div>
    {recording&&<p role="status" className="mt-3 text-sm text-red-700">{locale==="es"?"Grabando…":"Recording…"}</p>}
    {error&&<p role="alert" className="mt-3 text-sm text-amber-800">{error}</p>}
    {url&&<div className="mt-4 space-y-3"><audio controls src={url} className="w-full" onPlay={event=>activateCourseAudio(event.currentTarget)} onPause={event=>releaseCourseAudio(event.currentTarget)} onEnded={event=>releaseCourseAudio(event.currentTarget)}/><a href={url} download={`itzli-my-voice.${extension}`} className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700"><Download size={14}/>{locale==="es"?"Guardar mi grabación":"Save my recording"}</a><p className="text-xs leading-5 text-stone-500">{locale==="es"?"Escucha el modelo y luego tu voz. Compara el ritmo y los sonidos. La app no califica automáticamente tu pronunciación.":"Listen to the model and then your voice. Compare rhythm and sounds. The app does not automatically grade pronunciation."}</p></div>}
  </div>;
}
