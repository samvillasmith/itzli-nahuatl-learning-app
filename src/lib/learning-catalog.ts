import "server-only";
import { getAllPrimerVocab } from "./db";
import { vocabCardAudioUrl } from "./audio";
import { getExpansionEntries } from "@/data/lexical-expansion";
import { getVerifiedExpansionEntries } from "@/data/v3-expansion";
import { getConversationScenarios, getSentencePatterns } from "@/data/conversation-scenarios";
import { tr } from "@/i18n/translate";
import { getConversationReplyCards } from "./conversation-recall";
import { isExpansionBuildingBlock } from "./expansion-practice";
import { resolvePracticeRecording } from "./generated-audio";
import { displayNahuatl } from "./orthography";
import { isAppContentExcluded } from "./app-content-safety";
export type LearningCard={id:string;nahuatl:string;learnerDisplay?:string;english:string;spanish:string;audioUrl:string|null;audioKind:"source"|"synthetic";audioReferenceId?:string;sourceUrl:string|null;kind:"word"|"reply"|"sentence"};
export function getLearningCatalog():LearningCard[]{
 const cards:LearningCard[]=getAllPrimerVocab().map(v=>({id:`word:${v.id}`,nahuatl:v.headword,english:v.gloss_en,spanish:tr("es",v.gloss_en),audioUrl:vocabCardAudioUrl(v.id,v.audioSrc,displayNahuatl(v.headword)),audioKind:v.audioSrc?.includes("tlahtolli")?"source":"synthetic",sourceUrl:v.sourceUrl??null,kind:"word"}));
 for(const v of getExpansionEntries())cards.push({id:`word:${v.cardId}`,nahuatl:v.headword,english:v.english,spanish:v.spanish,audioUrl:v.audio.url,audioKind:"source",sourceUrl:v.source.url,kind:"word"});
 for(const v of getVerifiedExpansionEntries(true).filter(v=>!isExpansionBuildingBlock(v)))cards.push({id:`word:${v.id}`,nahuatl:v.display,learnerDisplay:v.display,english:v.meaningEn,spanish:v.meaningEs,audioUrl:v.audioUrl,audioKind:"source",sourceUrl:v.sourceUrl,kind:"word"});
 cards.push(...getConversationReplyCards(getConversationScenarios()));
 for(const p of getSentencePatterns())for(const slot of p.slots)for(const phrase of slot.choices){cards.push({id:`sentence:${p.id}:${phrase.id}`,nahuatl:phrase.nahuatl,english:phrase.english,spanish:phrase.spanish,audioUrl:phrase.audioUrl,audioKind:phrase.audioKind,sourceUrl:phrase.source.url,kind:"sentence"});}
 return cards.filter(card => !isAppContentExcluded(card.id, card.nahuatl, card.english, card.spanish)).map(card => {
   const core = card.id.match(/^word:(\d+)$/);
   const referenceId = core ? `core-vocab:${core[1]}` : card.kind === "word" ? `vocabulary:${card.id.slice(5)}`
     : card.kind === "reply" ? card.id.replace(/^turn:/, "conversation:") : card.id.replace(/^sentence:/, "sentence-choice:");
   const recording = resolvePracticeRecording({ text: card.learnerDisplay ?? displayNahuatl(card.nahuatl), url: card.audioUrl, kind: card.audioKind, referenceId });
   return { ...card, audioUrl: recording.url, audioKind: recording.kind, audioReferenceId: referenceId };
 });
}
