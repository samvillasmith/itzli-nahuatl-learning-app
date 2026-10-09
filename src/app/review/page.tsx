import { requireAuth } from "@/lib/require-auth";
import { getLearningCatalog } from "@/lib/learning-catalog";
import ReviewSession from "./ReviewSession";
export default async function Page(){await requireAuth();return <ReviewSession cards={getLearningCatalog()}/>;}
