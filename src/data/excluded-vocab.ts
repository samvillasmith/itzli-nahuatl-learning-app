/**
 * Vocab IDs excluded from lesson quizzes and learn cards.
 *
 * These words remain in the database (for lexicon search) but are suppressed
 * from the structured lesson flow. Two categories:
 *
 * 1. Off-topic — clearly misplaced relative to their unit's theme.
 * 2. Inappropriate — content not suitable for a general-audience learning app.
 *    (Note: vulgar glosses on remaining words have been corrected in the DB.)
 */

export const EXCLUDED_VOCAB_IDS: Set<number> = new Set([
  // ── Unit 23: What is Inside the House ──────────────────────────────────
  525,  // zacacalli — hay storehouse (outbuilding, not inside a house)
  531,  // acalli — canoe/boat (not inside a house)
  539,  // pachtli — hay (not inside a house)

  // ── Unit 25: I Had Gone to the City Part 2 ─────────────────────────────
  573,  // chikome — seven (stray number word, off-topic)
  581,  // olin — 17th Aztec day sign (calendar concept, off-topic)
  583,  // mazatl — 7th Aztec day sign (calendar concept, off-topic)
  584,  // iyelli — flatulence (variant of 588; also off-topic)
  588,  // ihyelli — flatulence (off-topic in city travel unit)

  // ── Unit 30: The conditional, Part 1 ───────────────────────────────────
  669,  // tsimpa — buttock (off-topic in grammar unit; canonical of variant group)
  671,  // tzintamalli — buttock (variant of tsimpa)
  678,  // tzintli — buttocks/rump (off-topic in grammar unit)
]);
