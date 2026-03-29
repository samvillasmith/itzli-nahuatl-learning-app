// Strips audit-annotation suffixes from gloss_en before display.
// The DB stores correction notes like "[❌ CORRECTED: ...]" or "[⚠️ NOTE: ...]"
// appended to glosses; these must never appear in UI elements.
export function displayGloss(gloss: string): string {
  const cleaned = gloss.replace(/\s*\[(?:❌|⚠️)[^\]]*\].*$/, "").trim();
  return cleaned.length > 0 ? cleaned : "—";
}
