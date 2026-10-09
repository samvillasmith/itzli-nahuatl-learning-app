import { requireAuth } from "@/lib/require-auth";
import ConversationStudio from "./ConversationStudio";
export default async function Page(){await requireAuth();return <ConversationStudio/>;}
