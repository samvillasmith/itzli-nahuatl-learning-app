import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";
import { execFileSync } from "child_process";

const DB_FILENAME = "fcn_master_lexicon_phase8_6_primer.sqlite";
const DB_URL =
  "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/database/" +
  DB_FILENAME;

// Resolve the DB path with three fallbacks so we stay up even if the build
// bundler (Webpack or Turbopack) fails to copy the file into the serverless
// output. On Vercel, /tmp is writable (up to 512 MB) and persists for the
// lifetime of the warm Lambda, so the cold-start download cost is amortized.
function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;

  const localPath = path.join(process.cwd(), DB_FILENAME);
  if (fs.existsSync(localPath)) return localPath;

  const tmpPath = path.join(os.tmpdir(), DB_FILENAME);
  if (!fs.existsSync(tmpPath)) {
    // Synchronous curl fetch — Vercel Lambda base image ships with curl.
    // Blocking here is fine: this only fires on a cold start where the
    // bundler dropped the file, and better-sqlite3 is sync throughout.
    console.log(`[db] DB not bundled at ${localPath}; downloading to ${tmpPath}`);
    execFileSync("curl", ["-fsSL", "-o", tmpPath, DB_URL], {
      stdio: "inherit",
    });
  }
  return tmpPath;
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(resolveDbPath(), { readonly: true, fileMustExist: true });
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
  translation_en: string | null;
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

export function getVocabCount(): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) as n FROM lesson_vocab WHERE gloss_en NOT LIKE '%MISPLACED%'")
      .get() as { n: number }
  ).n;
}

export function getAllPrimerVocab(): VocabItem[] {
  return getDb()
    .prepare(
      `SELECT id, display_form AS headword, gloss_en, part_of_speech,
              lesson_number AS first_lesson_number, semantic_domain
       FROM lesson_vocab
       WHERE gloss_en NOT LIKE '%MISPLACED%'
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

export type DialogueLineContent = {
  lesson_dialogue_id: string;
  speaker_label: string;
  utterance_normalized: string;
  translation_en: string | null;
};

// Returns real A/B dialogue and named-character conversation lines from
// lesson_dialogues, filtered to actual EHN text (lines with macron vowels
// or ¿).  English translations that were stored as sibling rows are excluded
// by the diacritic/¿ requirement.  Named speakers Rufina, Martha, and Angela
// appear in lesson 19 and produce a genuine three-way conversation there.
export function getUnitDialogueContent(lessonNumber: number): DialogueLineContent[] {
  return getDb()
    .prepare(
      `SELECT ld.lesson_dialogue_id, ld.speaker_label, ld.utterance_normalized, ld.translation_en
       FROM lesson_dialogues ld
       JOIN phase82_unit_plan u ON u.english_lesson_unit_id = ld.lesson_unit_id
       WHERE u.lesson_number = ?
         AND (ld.speaker_label GLOB '[A-Z]'
              OR ld.speaker_label IN ('Rufina', 'Martha', 'Angela'))
         AND (ld.utterance_normalized LIKE '%ā%'
              OR ld.utterance_normalized LIKE '%ē%'
              OR ld.utterance_normalized LIKE '%ō%'
              OR ld.utterance_normalized LIKE '%ī%'
              OR ld.utterance_normalized LIKE '%ū%'
              OR ld.utterance_normalized LIKE '%¿%')
       ORDER BY ld.lesson_dialogue_id`
    )
    .all(lessonNumber) as DialogueLineContent[];
}

export type LessonBlock = {
  text_normalized: string;
};

// Returns short, high-nahuatliness lesson blocks for a unit — used as
// conversation-exercise fallback when no real dialogue lines are available.
export function getUnitLessonBlocks(lessonNumber: number): LessonBlock[] {
  return getDb()
    .prepare(
      `SELECT lb.text_normalized
       FROM lesson_blocks lb
       JOIN phase82_unit_plan u ON u.english_lesson_unit_id = lb.lesson_unit_id
       WHERE u.lesson_number = ?
         AND lb.nahuatliness_score > 0.5
         AND lb.text_normalized IS NOT NULL
         AND length(lb.text_normalized) > 8
         AND length(lb.text_normalized) < 120
       ORDER BY lb.block_order`
    )
    .all(lessonNumber) as LessonBlock[];
}

export function getUnitConstructions(lessonNumber: number): Construction[] {
  const db = getDb();
  const cols = (db.prepare("PRAGMA table_info('primer_constructions')").all() as { name: string }[])
    .map((c) => c.name);
  const hasTranslation = cols.includes("translation_en");

  return db
    .prepare(
      `SELECT priority_id, construction_label, pattern_text,
              proficiency_band, first_lesson_number, example_original,
              ${hasTranslation ? "translation_en," : ""} avg_confidence
       FROM primer_constructions
       WHERE first_lesson_number <= ?
       ORDER BY avg_confidence DESC`
    )
    .all(lessonNumber)
    .map((row) => ({
      ...(row as Construction),
      translation_en: (row as Record<string, unknown>).translation_en as string | null ?? null,
    }));
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

export type GrammarDialogue = {
  lesson_dialogue_id: string;
  speaker_label: string;
  utterance_normalized: string;
  translation_en: string | null;
};

export function getGrammarDialogues(lessonNumbers: number[]): GrammarDialogue[] {
  if (lessonNumbers.length === 0) return [];
  const placeholders = lessonNumbers.map(() => '?').join(',');
  return getDb()
    .prepare(
      `SELECT ld.lesson_dialogue_id, ld.speaker_label, ld.utterance_normalized, ld.translation_en
       FROM lesson_dialogues ld
       JOIN phase82_unit_plan u ON u.english_lesson_unit_id = ld.lesson_unit_id
       WHERE u.lesson_number IN (${placeholders})
         AND ld.translation_en IS NOT NULL
         AND (ld.utterance_normalized LIKE '%ā%'
              OR ld.utterance_normalized LIKE '%ē%'
              OR ld.utterance_normalized LIKE '%ī%'
              OR ld.utterance_normalized LIKE '%ō%'
              OR ld.utterance_normalized LIKE '%¿%')
         AND length(ld.utterance_normalized) > 8
         AND length(ld.utterance_normalized) < 150
       ORDER BY ld.lesson_dialogue_id
       LIMIT 12`
    )
    .all(...lessonNumbers) as GrammarDialogue[];
}
