import { getDueReviews } from "./learning-state";
import { loadExpressions,personalExpressionReviewCards } from "./expression-notebook";
import type { LearningSkill } from "./learning-schema";

/** Missing recordings defer listening only; this does not edit stored attempts or due dates. */
export function selectDueReviewCards<T extends { id: string; audioUrl: string | null }>(
  cards: readonly T[], due: readonly { activityId: string; skill: LearningSkill }[],
) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const available: { card: T; skill: LearningSkill }[] = [];
  let waitingForAudio = 0;
  for (const review of due) {
    const card = byId.get(review.activityId);
    if (!card) continue;
    if (review.skill === "listening" && !card.audioUrl) {
      waitingForAudio += 1;
      continue;
    }
    available.push({ card, skill: review.skill });
  }
  return { available, waitingForAudio };
}
/** Retain unmapped historical records without inventing a new prompt for them. */
export function getReviewableDueReviews(ids:readonly string[]){const allowed=new Set([...ids,...personalExpressionReviewCards(loadExpressions()).map(c=>c.id)]);return getDueReviews().filter(item=>allowed.has(item.activityId));}
