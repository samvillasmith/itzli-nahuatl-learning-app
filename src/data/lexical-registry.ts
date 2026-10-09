import "server-only";
import course from "./nahuatlahtolli-course.json";
import sourceIdentities from "./source-vocab-identity.json";
import curatedIdentities from "./curated-unit-vocab.json";
import { COERLL_SOURCE_LICENSE_NOTICE } from "@/lib/source-license-notices";

export type LocalizedText = { en: string; es: string };
export type ContentSource = {
  id: string;
  lessonNumber: number;
  vocabularyIndex?: number;
  section?: string;
  excerpt: string;
  url: string;
  license: typeof COERLL_SOURCE_LICENSE_NOTICE.name;
  authors: readonly string[];
};
export type ContentReview = {
  status: "source-supported" | "source-adaptation" | "pending-review";
  scope: LocalizedText;
  limitations: LocalizedText;
};
export type LexicalEntry = {
  id: string;
  cardId: number;
  lexemeId: string;
  senseId: string;
  formId: string;
  packId: string;
  sourceSpelling: string;
  practicalSpelling: string;
  headword: string;
  english: string;
  spanish: string;
  partOfSpeech: string;
  formKind: "source-headword";
  source: ContentSource;
  audio: { url: string; scope: "isolated-word"; status: "source-linked" };
  review: ContentReview;
};

export type Lexeme = {
  id: string;
  lemma: string;
  sourceLemma: string;
  partOfSpeech: string;
  variety: "Eastern Huasteca Nahuatl — Chicontepec source";
  // A source lexical entry is not automatically a standardized dictionary lemma.
  citationStatus: "source-headword";
  senseIds: string[];
  formIds: string[];
};
export type LexicalSense = {
  id: string;
  lexemeId: string;
  english: string;
  spanish: string;
  source: ContentSource;
  review: ContentReview;
};
export type LexicalForm = {
  id: string;
  lexemeId: string;
  senseIds: string[];
  cardId: number;
  sourceSpelling: string;
  practicalSpelling: string;
  kind: "source-headword";
  audio: LexicalEntry["audio"];
  source: ContentSource;
};
export type LexicalRegistry = { lexemes: Lexeme[]; senses: LexicalSense[]; forms: LexicalForm[] };

export function buildLexicalRegistry(entries: readonly LexicalEntry[]): LexicalRegistry {
  const lexemes = new Map<string, Lexeme>();
  const senses = new Map<string, LexicalSense>();
  const forms = new Map<string, LexicalForm>();
  const cardIds = new Set<number>();
  for (const entry of entries) {
    if (forms.has(entry.formId) || cardIds.has(entry.cardId)) throw new Error(`Duplicate lexical identity ${entry.formId}`);
    cardIds.add(entry.cardId);
    const lexeme = lexemes.get(entry.lexemeId) ?? {
      id: entry.lexemeId, lemma: entry.headword, sourceLemma: entry.sourceSpelling, partOfSpeech: entry.partOfSpeech,
      variety: "Eastern Huasteca Nahuatl — Chicontepec source", citationStatus: "source-headword", senseIds: [], formIds: [],
    };
    if (!lexeme.senseIds.includes(entry.senseId)) lexeme.senseIds.push(entry.senseId);
    lexeme.formIds.push(entry.formId);
    lexemes.set(lexeme.id, lexeme);
    const sense = senses.get(entry.senseId);
    if (sense && (sense.lexemeId !== entry.lexemeId || sense.english !== entry.english || sense.spanish !== entry.spanish)) throw new Error(`Conflicting lexical sense ${entry.senseId}`);
    senses.set(entry.senseId, { id: entry.senseId, lexemeId: entry.lexemeId, english: entry.english, spanish: entry.spanish, source: entry.source, review: entry.review });
    forms.set(entry.formId, { id: entry.formId, lexemeId: entry.lexemeId, senseIds: [entry.senseId], cardId: entry.cardId,
      sourceSpelling: entry.sourceSpelling, practicalSpelling: entry.practicalSpelling, kind: entry.formKind, audio: entry.audio, source: entry.source });
  }
  return { lexemes: [...lexemes.values()], senses: [...senses.values()], forms: [...forms.values()] };
}

export function getCourseSource(lessonNumber: number, excerpt: string, vocabularyIndex?: number): ContentSource {
  const lesson = course.lessons.find((item) => item.number === lessonNumber);
  if (!lesson) throw new Error(`Missing source lesson ${lessonNumber}`);
  return {
    id: vocabularyIndex == null ? `coerll-lesson-${lessonNumber}` : `coerll-vocab-${lessonNumber}-${vocabularyIndex}`,
    lessonNumber, vocabularyIndex, excerpt, url: lesson.originalUrl,
    license: COERLL_SOURCE_LICENSE_NOTICE.name, authors: course.source.authors,
  };
}

// Legacy forms are identities, not assertions that each card is a distinct lemma.
// Base SQLite IDs already persist in the database and pass through unchanged.
export function getLegacyCardIdentity(cardId: number) {
  const source = sourceIdentities.find((item) => item.id === cardId);
  if (source) return { cardId, entryId: source.entry_id, sourceSpelling: source.sourceSpelling,
    source: getCourseSource(source.sourceLesson, source.sourceSpelling, source.sourceIndex),
    lemmaStatus: "unmapped" as const };
  const curated = curatedIdentities.find((item) => item.id === cardId);
  if (curated) return { cardId, entryId: curated.entry_id, sourceSpelling: curated.headword,
    source: curated.source_lesson_number ? getCourseSource(curated.source_lesson_number, curated.headword) : null,
    lemmaStatus: "unmapped" as const };
  return { cardId, entryId: null, sourceSpelling: null, source: null, lemmaStatus: "unmapped" as const };
}

export type LexicalReviewItem = {
  id: string;
  kind: "form-linkage" | "source-gloss" | "source-transcription" | "recording";
  title: LocalizedText;
  reason: LocalizedText;
  source: ContentSource | null;
  learnerRecallEnabled: false;
};

export function getLexicalReviewQueue(): LexicalReviewItem[] {
  return [
    { id: "review-plural-future", kind: "source-transcription", title: { en: "Plural future spelling", es: "Escritura del futuro plural" },
      reason: { en: "Resolve the source -zceh and other transcriptions with a Chicontepec speaker before enabling recall.", es: "Revisar -zceh y otras transcripciones con una persona hablante de Chicontepec antes de activar la práctica." },
      source: getCourseSource(12, "Nitequitiz / Titequitizceh"), learnerRecallEnabled: false },
    { id: "review-source-nextli", kind: "source-gloss", title: { en: "Ambiguous source gloss", es: "Traducción ambigua en la fuente" },
      reason: { en: "The imported nextli gloss needs an independent source check; it is excluded from the expansion.", es: "La traducción importada de nextli requiere otra comprobación; se excluyó de la ampliación." },
      source: getCourseSource(1, "nextli", 8), learnerRecallEnabled: false },
    { id: "review-legacy-lemmas", kind: "form-linkage", title: { en: "Link existing forms to lemmas", es: "Relacionar las formas existentes con sus lemas" },
      reason: { en: "Existing cards include inflections, phrases, and spelling variants. Their IDs are preserved; lemma and sense links require individual review.", es: "Las tarjetas existentes incluyen flexiones, frases y variantes de escritura. Conservan sus identificadores; cada relación con un lema y una acepción requiere revisión." },
      source: null, learnerRecallEnabled: false },
    { id: "review-market-total", kind: "source-transcription", title: { en: "Original market total", es: "Total del mercado en la fuente" },
      reason: { en: "The original basket includes sugar and quotes a final total of 120; the price units and arithmetic are not sufficiently clear. The adapted practice excludes that total rather than inventing one.", es: "La compra original incluye piloncillo y termina con un total de 120; las unidades de precio y el cálculo no están suficientemente claros. La práctica adaptada excluye ese total en lugar de inventar otro." },
      source: getCourseSource(27, "Quēna, īcā nochi 120."), learnerRecallEnabled: false },
  ];
}
