"use client";
import { useEffect,useState } from "react";
import { hasUnclaimedLegacyProgress,claimLegacyProgress } from "@/lib/progress";
import { pushToCloud } from "@/lib/cloudSync";
import { useLearningAccount } from "./LearningAccount";
import { useLocale } from "@/i18n/LocaleProvider";
export default function LegacyProgressImport(){const{isSignedIn}=useLearningAccount();const{locale}=useLocale();const[visible,setVisible]=useState(false);const[message,setMessage]=useState('');useEffect(()=>setVisible(isSignedIn&&hasUnclaimedLegacyProgress()),[isSignedIn]);if(!visible&&!message)return null;return <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-800">{visible?<><p>{locale==='es'?'Hay progreso anterior guardado en este navegador sin un nombre de cuenta. Si es tuyo, puedes incorporarlo a tu cuenta.':'Previous progress is saved in this browser without an account name. If it is yours, you can import it into your account.'}</p><button onClick={()=>{if(claimLegacyProgress()){setVisible(false);setMessage(locale==='es'?'Progreso incorporado. Actualiza la página para ver el resultado.':'Progress imported. Refresh this page to see it.');void pushToCloud();}}} className="button-secondary mt-3">{locale==='es'?'Importar mi progreso anterior':'Import my previous progress'}</button></>:<p role="status">{message}</p>}</div>;}
