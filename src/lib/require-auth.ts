import "server-only";

import { auth } from "@clerk/nextjs/server";

export async function requireAuth() {
  return auth.protect();
}
