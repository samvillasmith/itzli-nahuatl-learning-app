import lessons from "./learner-grammar.json";
import type { GrammarLesson } from "./grammar-lessons";

/** Only published reference lessons are browser-readable; held drafts stay private. */
export const GRAMMAR_LESSONS = lessons as GrammarLesson[];
