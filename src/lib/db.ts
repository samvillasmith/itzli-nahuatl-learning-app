import Database from "better-sqlite3";
import path from "path";

const DB_PATH =
  process.env.DATABASE_PATH ||
  path.join(
    process.cwd(),
    "../molina/curriculum/fcn_master_lexicon_phase8_6_primer.sqlite"
  );

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: true });
    _db.pragma("journal_mode = WAL");
  }
  return _db;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type Unit = {
  lesson_number: number;
  unit_code: string;
  target_band: string;
  theme_en: string;
  communicative_goal: string;
  grammar_focus: string;
  lexical_focus: string;
  english_vocab_count: number;
  english_dialogue_count: number;
  english_construction_count: number;
};

export type VocabItem = {
  id: number;
  headword: string;
  gloss_en: string;
  part_of_speech: string;
  first_lesson_number: number;
  semantic_domain: string;
};

export type DialogueLine = {
  sample_id: string;
  lesson_number: number;
  speaker_label: string;
  utterance_original: string;
  utterance_normalized: string;
  translation_en: string | null;
  communicative_function: string | null;
};

export type Construction = {
  priority_id: number;
  construction_label: string;
  pattern_text: string;
  proficiency_band: string;
  first_lesson_number: number;
  example_original: string;
  avg_confidence: number;
};

export type Assessment = {
  assessment_id: number;
  lesson_number: number;
  proficiency_band: string;
  item_type: string;
  prompt: string;
};

export type LexiconEntry = {
  entry_id: number;
  ehn_spoken_form: string;
  msn_headword: string;
  gloss_en: string;
  gloss_es: string;
  part_of_speech: string;
  register: string;
  variety: string;
  notes_public: string;
};

// ── Queries ──────────────────────────────────────────────────────────────────

export function getAllUnits(): Unit[] {
  return getDb()
    .prepare(
      `SELECT lesson_number, unit_code, target_band, theme_en,
              communicative_goal, grammar_focus, lexical_focus,
              english_vocab_count, english_dialogue_count, english_construction_count
       FROM phase82_unit_plan
       ORDER BY lesson_number`
    )
    .all() as Unit[];
}

export function getUnit(lessonNumber: number): Unit | null {
  return (
    (getDb()
      .prepare(
        `SELECT lesson_number, unit_code, target_band, theme_en,
                communicative_goal, grammar_focus, lexical_focus,
                english_vocab_count, english_dialogue_count, english_construction_count
         FROM phase82_unit_plan
         WHERE lesson_number = ?`
      )
      .get(lessonNumber) as Unit) || null
  );
}

export function getUnitVocab(lessonNumber: number): VocabItem[] {
  return getDb()
    .prepare(
      `SELECT id, display_form AS headword, gloss_en, part_of_speech,
              lesson_number AS first_lesson_number, semantic_domain
       FROM lesson_vocab
       WHERE lesson_number = ?
       ORDER BY rank`
    )
    .all(lessonNumber) as VocabItem[];
}

export function getAllPrimerVocab(): VocabItem[] {
  return getDb()
    .prepare(
      `SELECT id, display_form AS headword, gloss_en, part_of_speech,
              lesson_number AS first_lesson_number, semantic_domain
       FROM lesson_vocab
       ORDER BY lesson_number, rank`
    )
    .all() as VocabItem[];
}

export function getUnitDialogues(lessonNumber: number): DialogueLine[] {
  return getDb()
    .prepare(
      `SELECT sample_id, lesson_number, speaker_label,
              utterance_original, utterance_normalized,
              translation_en, communicative_function
       FROM primer_dialogues
       WHERE lesson_number = ?
       ORDER BY dialogue_order`
    )
    .all(lessonNumber) as DialogueLine[];
}

export function getUnitConstructions(lessonNumber: number): Construction[] {
  return getDb()
    .prepare(
      `SELECT priority_id, construction_label, pattern_text,
              proficiency_band, first_lesson_number, example_original, avg_confidence
       FROM primer_constructions
       WHERE first_lesson_number = ?
       ORDER BY avg_confidence DESC`
    )
    .all(lessonNumber) as Construction[];
}

export function getUnitAssessments(lessonNumber: number): Assessment[] {
  return getDb()
    .prepare(
      `SELECT assessment_id, lesson_number, proficiency_band, item_type, prompt
       FROM unit_assessment_manifest
       WHERE lesson_number = ?
       ORDER BY assessment_id`
    )
    .all(lessonNumber) as Assessment[];
}

export function searchVocab(query: string, limit = 40): LexiconEntry[] {
  const q = `%${query}%`;
  return getDb()
    .prepare(
      `SELECT entry_id, ehn_spoken_form, msn_headword, gloss_en, gloss_es,
              part_of_speech, register, variety, notes_public
       FROM lexicon_entries
       WHERE (ehn_spoken_form LIKE ? OR msn_headword LIKE ? OR gloss_en LIKE ?)
         AND is_active = 1
         AND gloss_en != ''
       ORDER BY ehn_spoken_form
       LIMIT ?`
    )
    .all(q, q, q, limit) as LexiconEntry[];
}
