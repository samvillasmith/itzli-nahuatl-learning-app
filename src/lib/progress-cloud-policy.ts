import { isLocalReviewMode } from "./local-review";

/** Local/preview builds never contact a production progress store by default. */
export function cloudProgressEnabled(): boolean {
  if (isLocalReviewMode()) return false;
  if (process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "production") return false;
  if (process.env.ITZLI_CLOUD_PROGRESS_ENABLED === "1") return true;
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}
