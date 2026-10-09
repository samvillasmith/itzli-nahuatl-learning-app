import { getProgressAccount } from "./progress";
import type { LearningCard } from "./learning-catalog";
import { displayLearnerExpression } from "./learner-expression";
export type PersonalExpression={id:string;nahuatl:string;english:string;spanish:string;sourceUrl:string;createdAt:number};
const key=()=>`itzli_expressions_v3:${encodeURIComponent(getProgressAccount()??"guest")}`;
export function loadExpressions():PersonalExpression[]{if(typeof window==="undefined")return[];try{const value=JSON.parse(localStorage.getItem(key())??"[]");return Array.isArray(value)?value.filter(v=>v&&typeof v.id==="string"&&typeof v.nahuatl==="string"&&typeof v.english==="string"&&typeof v.spanish==="string"&&typeof v.sourceUrl==="string"&&Number.isFinite(v.createdAt)):[];}catch{return[];}}
export function saveExpression(expression:Omit<PersonalExpression,"createdAt">){const items=loadExpressions().filter(i=>i.id!==expression.id);items.push({...expression,createdAt:Date.now()});localStorage.setItem(key(),JSON.stringify(items));return items;}
export function removeExpression(id:string){const items=loadExpressions().filter(i=>i.id!==id);localStorage.setItem(key(),JSON.stringify(items));return items;}

export async function personalExpressionActivityId(patternId: string, nahuatl: string): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify([patternId, nahuatl.normalize("NFC").trim()]));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `sentence:${patternId}:personal:${hash}`;
}

export function personalExpressionReviewCards(expressions: readonly PersonalExpression[]): LearningCard[] {
  return expressions.filter((expression) => /^sentence:[^:]+:personal:[a-f0-9]{64}$/.test(expression.id))
    .map((expression) => ({ id: expression.id, nahuatl: expression.nahuatl, learnerDisplay: displayLearnerExpression(expression), english: expression.english,
      spanish: expression.spanish, audioUrl: null, audioKind: "source", sourceUrl: expression.sourceUrl, kind: "sentence" }));
}
