/** Explicit development preview only. Production can never bypass Clerk,
 * including self-hosted releases with an inherited review environment flag. */
export function isLocalReviewMode(): boolean {
  return process.env.NODE_ENV === "development" &&
    process.env.ITZLI_LOCAL_REVIEW === "1" && process.env.VERCEL !== "1";
}
