import { requireAuth } from "@/lib/require-auth";
import SentenceWorkbench from "./SentenceWorkbench";
export default async function Page(){await requireAuth();return <SentenceWorkbench/>;}
