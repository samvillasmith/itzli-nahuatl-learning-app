import "server-only";

import { auth } from "@clerk/nextjs/server";
import { isLocalReviewMode } from "./local-review";

export async function requireAuth() {
  if (isLocalReviewMode()) return;
  return auth.protect();
}
