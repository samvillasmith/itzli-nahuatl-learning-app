import "server-only";
import course from "./nahuatlahtolli-course.json";
import specs from "./lexical-expansion.json";
import { toInaliOrthography } from "@/lib/orthography";
import { buildLexicalRegistry, getCourseSource, type LexicalEntry, type LocalizedText } from "./lexical-registry";
import { reviewedVocabularyLabel } from "@/lib/reviewed-vocabulary-labels.cjs";
import { isAppContentExcluded } from "@/lib/app-content-safety";

export type ExpansionPack = {
  id: string;
  titleEn: string;
  titleEs: string;
  descriptionEn: string;
  descriptionEs: string;
  entryIds: string[];
};

const packLabels: Record<string, { title: LocalizedText; description: LocalizedText }> = {
  "world-people": { title: { en: "People and the world", es: "Personas y entorno" }, description: { en: "Source words for people, landscape, and weather.", es: "Palabras de la fuente sobre personas, paisaje y clima." } },
  "learning-time": { title: { en: "Learning and questions", es: "Aprendizaje y preguntas" }, description: { en: "Questions and words used in learning.", es: "Preguntas y palabras para aprender." } },
  "daily-actions": { title: { en: "Everyday activities", es: "Actividades cotidianas" }, description: { en: "Attested verb headwords; these cards do not generate new conjugations.", es: "Formas verbales documentadas; estas tarjetas no generan nuevas conjugaciones." } },
  "shapes-objects": { title: { en: "Shapes and objects", es: "Formas y objetos" }, description: { en: "Source words for shapes, objects, and plants.", es: "Palabras de la fuente sobre formas, objetos y plantas." } },
  "food-drink": { title: { en: "Food and drinks", es: "Comida y bebidas" }, description: { en: "Food, juice, and atole from the course vocabulary.", es: "Comida, jugos y atoles del vocabulario del curso." } },
  "milpa-work": { title: { en: "Milpa and seasonal work", es: "Milpa y trabajo de temporada" }, description: { en: "Words explained in the Chicontepec course context.", es: "Palabras explicadas en el contexto del curso de Chicontepec." } },
};

export const LEXICAL_EXPANSION: LexicalEntry[] = specs.map((spec): LexicalEntry => {
  const lesson = course.lessons.find((item) => item.number === spec.lessonNumber);
  const item = lesson?.vocabulary[spec.vocabularyIndex - 1];
  if (!item?.audioUrl || item.headword !== spec.sourceSpelling) throw new Error(`Source changed for ${spec.id}; review its provenance`);
  const headword = toInaliOrthography(spec.sourceSpelling.replace(/\(ø\)/g, "").replace(/[/?¿]/g, "")).trim();
  const correction = reviewedVocabularyLabel(spec.id, spec.english, spec.spanish);
  if (correction && correction.display !== headword) throw new Error("A reviewed label cannot change the written form");
  return {
    ...spec, english: correction?.meaningEn ?? spec.english, spanish: correction?.meaningEs ?? spec.spanish,
    practicalSpelling: headword, headword, formKind: "source-headword",
    source: getCourseSource(spec.lessonNumber, spec.sourceSpelling, spec.vocabularyIndex),
    audio: { url: item.audioUrl, scope: "isolated-word", status: "source-linked" },
    review: {
      status: "source-supported",
      scope: correction ? { en: "Source spelling and recording retained; the action label is clarified by the separately cited modern Chicontepec dictionary. Spanish is an Itzli translation.", es: "Se conservan la escritura de la fuente y la grabación; la descripción de la acción se precisa con el diccionario moderno de Chicontepec citado por separado. El español es una traducción de Itzli." } : { en: "Spelling and this sense checked against the COERLL source. Spanish is an Itzli translation.", es: "Escritura y acepción cotejadas con la fuente de COERLL. El español es una traducción de Itzli." },
      limitations: { en: correction?.usageNoteEn ?? (spec.noteEn || "Source headword, not a generated paradigm or a claim of agreement across varieties. Recording retained as a source link; pronunciation has not been independently certified."), es: correction?.usageNoteEs ?? (spec.noteEs || "Forma de la fuente, no un paradigma generado ni una afirmación de consenso entre variantes. Se conserva el enlace a la grabación; su pronunciación no se ha certificado de manera independiente.") },
    },
  };
}).filter(entry => !isAppContentExcluded(entry.id, entry.headword, entry.english, entry.spanish));

export function getExpansionPacks(): ExpansionPack[] {
  return Object.entries(packLabels).map(([id, labels]) => ({ id,
    titleEn: labels.title.en, titleEs: labels.title.es,
    descriptionEn: labels.description.en, descriptionEs: labels.description.es,
    entryIds: LEXICAL_EXPANSION.filter((item) => item.packId === id).map((item) => item.id),
  }));
}
export function getExpansionPack(id: string) { return getExpansionPacks().find((item) => item.id === id); }
export function getExpansionEntries(packId?: string): LexicalEntry[] { return packId ? LEXICAL_EXPANSION.filter((item) => item.packId === packId) : LEXICAL_EXPANSION; }
export function getLexicalEntry(id: string): LexicalEntry | undefined { return LEXICAL_EXPANSION.find((item) => item.id === id || item.lexemeId === id || item.formId === id); }
export function getLexicalRegistry() { return buildLexicalRegistry(LEXICAL_EXPANSION); }
