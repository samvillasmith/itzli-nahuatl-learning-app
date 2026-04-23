// Heuristic detection of prompt-injection / jailbreak attempts.
//
// This is a cheap first layer. The strongest defense against injection in
// a narrow-topic tutor is the system prompt itself, which refuses anything
// non-Nahuatl. These heuristics catch the obvious stuff early, save an
// OpenAI call, and feed the audit log so repeat abusers surface.
//
// Rules of thumb:
//   - A single HARD pattern (fake system tokens, explicit instruction
//     override) blocks on its own.
//   - SOFT patterns accumulate; two or more = block.
//   - Diacritics (ā ē ī ō etc.) and Spanish loanwords are fine; don't flag
//     them as non-Latin noise.

export type InjectionVerdict = {
  blocked: boolean;
  score: number;
  matches: string[];
};

// Patterns that almost always indicate an injection attempt.
// Matching one = block.
const HARD_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "fake_system_tag", re: /<\|(?:im_start|im_end|system|user|assistant)\|>/i },
  { name: "fake_system_bracket", re: /\[\s*(?:SYSTEM|INST|\/INST|END\s+SYSTEM)\s*\]/i },
  { name: "fake_system_template", re: /\{\{\s*system\s*\}\}|\{\{\s*prompt\s*\}\}/i },
  { name: "ignore_instructions", re: /ignore\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|preceding|earlier)\s+(?:instructions?|prompts?|rules?|messages?|directives?)/i },
  { name: "disregard_instructions", re: /disregard\s+(?:all\s+)?(?:the\s+)?(?:previous|prior|above|preceding|earlier)\s+(?:instructions?|prompts?|rules?)/i },
  { name: "forget_everything", re: /forget\s+(?:everything|all\s+(?:your\s+)?(?:previous|prior)\s+(?:instructions?|training))/i },
  { name: "new_instructions", re: /(?:here\s+are\s+)?(?:your\s+)?new\s+(?:instructions|rules|system\s+prompt)/i },
  { name: "jailbreak_persona", re: /\b(?:DAN|STAN|DUDE|AIM|EvilBOT|DevMode|developer\s+mode|jailbreak|jailbroken)\b/i },
  { name: "reveal_system_prompt", re: /(?:show|reveal|print|repeat|output|display|tell\s+me)\s+(?:your|the)\s+(?:system\s+)?(?:prompt|instructions|rules|initial\s+message)/i },
  { name: "repeat_above_verbatim", re: /repeat\s+(?:the\s+)?(?:text\s+)?(?:above|before\s+this|preceding)\s+(?:verbatim|exactly|word[-\s]for[-\s]word)/i },
];

// Additional hard patterns loaded from env at import time. Kept out of the
// repo so publishing the source doesn't give attackers the full list of
// tripwires. JSON shape: [{"name":"my_rule","re":"pattern source"}, ...]
// Patterns compile with the `i` flag; malformed entries are skipped.
function loadExtraPatterns(): Array<{ name: string; re: RegExp }> {
  const raw = process.env.GUARDRAIL_EXTRA_PATTERNS;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: Array<{ name: string; re: RegExp }> = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const name = (entry as { name?: unknown }).name;
      const src = (entry as { re?: unknown }).re;
      if (typeof name !== "string" || typeof src !== "string") continue;
      try {
        out.push({ name, re: new RegExp(src, "i") });
      } catch {
        console.warn(`[guardrails] skipping invalid regex for pattern "${name}"`);
      }
    }
    return out;
  } catch (err) {
    console.warn("[guardrails] GUARDRAIL_EXTRA_PATTERNS parse failed:", err);
    return [];
  }
}

const EXTRA_HARD_PATTERNS = loadExtraPatterns();

// Patterns that are suspicious on their own but legitimate in some contexts.
// Need two+ to block.
const SOFT_PATTERNS: Array<{ name: string; re: RegExp; weight: number }> = [
  { name: "you_are_now", re: /\byou\s+are\s+now\s+(?:a|an|the)\b/i, weight: 1 },
  { name: "pretend_to_be", re: /\b(?:pretend|imagine)\s+(?:you(?:'re|\s+are)|to\s+be)\s+(?:a|an|the)\b/i, weight: 1 },
  { name: "act_as", re: /\bact\s+as\s+(?:a|an|the|if)\b/i, weight: 1 },
  { name: "roleplay", re: /\broleplay(?:ing)?\s+as\b/i, weight: 1 },
  { name: "no_restrictions", re: /\b(?:no|without)\s+(?:restrictions|limits?|rules|filters?|censorship|ethical\s+guidelines)\b/i, weight: 2 },
  { name: "bypass_safety", re: /\bbypass\s+(?:your|the)\s+(?:safety|guardrails|filters|restrictions)\b/i, weight: 2 },
  { name: "unrestricted_ai", re: /\bunrestricted\s+(?:ai|model|assistant|chatbot)\b/i, weight: 2 },
  { name: "opposite_day", re: /\bopposite\s+day\b/i, weight: 1 },
  { name: "hypothetically_harmful", re: /\bhypothetical(?:ly)?\b.*\b(?:harm|kill|weapon|bomb|drug|exploit)\b/i, weight: 1 },
  { name: "base64_blob", re: /[A-Za-z0-9+/]{120,}={0,2}/, weight: 1 },
  { name: "excessive_delimiters", re: /(?:`{3,}[\s\S]{0,80}`{3,}[\s\S]{0,80}){2,}/, weight: 1 },
];

export function detectInjection(text: string): InjectionVerdict {
  const matches: string[] = [];
  let score = 0;
  let hardHit = false;

  for (const { name, re } of HARD_PATTERNS) {
    if (re.test(text)) {
      matches.push(name);
      score += 10;
      hardHit = true;
    }
  }

  for (const { name, re } of EXTRA_HARD_PATTERNS) {
    if (re.test(text)) {
      matches.push(name);
      score += 10;
      hardHit = true;
    }
  }

  for (const { name, re, weight } of SOFT_PATTERNS) {
    if (re.test(text)) {
      matches.push(name);
      score += weight;
    }
  }

  const blocked = hardHit || score >= 2;
  return { blocked, score, matches };
}
