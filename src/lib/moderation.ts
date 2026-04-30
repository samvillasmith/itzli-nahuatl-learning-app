import OpenAI from "openai";

let client: OpenAI | null = null;
export const MODERATION_MODEL = "omni-moderation-latest";

export type ModerationVerdict = {
  flagged: boolean;
  categories: string[];
  topScore: number;
};

function getOpenAIClient(): OpenAI {
  client ??= new OpenAI();
  return client;
}

// OpenAI's omni-moderation-latest is free and covers:
//   sexual, sexual/minors, harassment, harassment/threatening,
//   hate, hate/threatening, self-harm, self-harm/intent, self-harm/instructions,
//   violence, violence/graphic, illicit, illicit/violent
//
// If the call itself fails (network, key) we fail closed — flag it as a
// soft error. The chat route treats soft errors as a refusal rather than
// letting unmoderated content through.
export async function moderate(text: string): Promise<ModerationVerdict> {
  try {
    const res = await getOpenAIClient().moderations.create({
      model: MODERATION_MODEL,
      input: text,
    });

    const r = res.results[0];
    if (!r) return { flagged: true, categories: ["moderation_empty"], topScore: 1 };

    const categories = Object.entries(r.categories)
      .filter(([, v]) => v === true)
      .map(([k]) => k);

    const scores = Object.values(r.category_scores ?? {}).filter(
      (v): v is number => typeof v === "number",
    );
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;

    return {
      flagged: r.flagged,
      categories,
      topScore,
    };
  } catch (err) {
    console.error("[moderation] call failed, failing closed:", err);
    return { flagged: true, categories: ["moderation_error"], topScore: 1 };
  }
}
